/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';
import { buildSignalApiPath, buildTraceStructureAnalysisPath } from '../api/explore-api';
import { parseTraceStructure } from './explore-trace-structure';
import { buildExplorePath, parseExploreQuery } from './explore-url-model';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';
import { exploreHandoffState, validTraceStructureQuery, type TraceExploreQuery } from './explore-query';

const descriptor = JSON.stringify({
  version: 1,
  a: { serviceName: 'checkout', operationName: 'POST /checkout', status: null },
  b: { serviceName: 'cart', operationName: null, status: 'ERROR' },
  relation: 'direct'
});

describe('trace structure route contract', () => {
  it('sends only the two exact clauses, relationship, and time to the structural endpoint', () => {
    const query: TraceExploreQuery = {
      signal: 'traces',
      timeRange: 'last-30m',
      start: 1000,
      end: 2000,
      timeZone: 'UTC',
      traceStructure: descriptor
    };
    const path = buildSignalApiPath(query);
    expect(path).toContain('/api/traces/structure?');
    const params = new URL(path, 'http://local').searchParams;
    expect(params.get('aServiceName')).toBe('checkout');
    expect(params.get('bStatus')).toBe('ERROR');
    expect(params.get('relation')).toBe('direct');
    expect(params.get('start')).toBe('1000');
    expect(params.get('end')).toBe('2000');
    expect(params.has('serviceName')).toBe(false);
  });

  it('rejects malformed descriptors and conflicting outer filters before transport', () => {
    expect(parseTraceStructure(descriptor)?.relation).toBe('direct');
    expect(parseTraceStructure('{')).toBeUndefined();
    expect(parseTraceStructure(JSON.stringify({ version: 1, a: {}, b: {}, relation: 'direct' }))).toBeUndefined();
    const scoped: TraceExploreQuery = {
      signal: 'traces',
      timeRange: 'last-30m',
      start: 1000,
      end: 2000,
      timeZone: 'UTC',
      traceStructure: descriptor,
      serviceName: 'outside'
    };
    expect(validTraceStructureQuery(scoped)).toBe(false);
    expect(() => buildSignalApiPath(scoped)).toThrow();
  });

  it('round-trips the applied structure through URL, draft and saved-query contracts', () => {
    const query: TraceExploreQuery = {
      signal: 'traces',
      timeRange: 'last-30m',
      start: 1000,
      end: 2000,
      timeZone: 'UTC',
      traceStructure: descriptor
    };
    const path = buildExplorePath(query);
    const parsed = parseExploreQuery(new URL(path, 'http://local').searchParams);
    expect(parsed).toMatchObject(query);
    expect(parseSavedExploreQuery(query)).toMatchObject(query);
    const submission = buildSubmissionPatch(draftFromQuery(query));
    expect(submission).toMatchObject({ valid: true, patch: { traceStructure: descriptor } });
    expect(parseSavedExploreQuery({ ...query, serviceName: 'outside' })).toBeUndefined();
  });

  it('round-trips a source-backed pattern or flow view only with a structural query', () => {
    const query: TraceExploreQuery = {
      signal: 'traces',
      timeRange: 'last-30m',
      start: 1000,
      end: 2000,
      timeZone: 'UTC',
      traceStructure: descriptor,
      traceStructureView: 'flow'
    };
    expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams)).toMatchObject(query);
    expect(parseSavedExploreQuery(query)).toMatchObject(query);
    expect(validTraceStructureQuery({ ...query, traceStructure: undefined })).toBe(false);
    const invalid = parseExploreQuery(
      new URL(
        '/explore?' +
          new URLSearchParams({
            signal: 'traces',
            timeRange: 'last-30m',
            traceStructure: descriptor,
            traceStructureView: 'unsupported'
          }).toString(),
        'http://local'
      ).searchParams
    );
    expect(invalid.signal === 'traces' && exploreHandoffState(invalid)).toBe('invalid');
    expect(buildTraceStructureAnalysisPath(query)).toContain('/api/traces/structure/analysis?');
    expect(new URL(buildTraceStructureAnalysisPath(query), 'http://local').searchParams.get('relation')).toBe('direct');
  });
});
