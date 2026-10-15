/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import { buildExplorePath, mergeExploreQuery, parseExploreQuery } from './explore-model';
import { exploreHandoffState } from './explore-query';
import { buildLogStreamPath, buildSignalApiPath } from '../api/explore-signal-paths';
import { buildLogInvestigationApiPath, buildTraceInvestigationApiPath } from '../api/explore-investigation-api';
import { buildTraceLogsPath } from './explore-trace-log-return';
import { buildCalculatedPageRequest } from '../api/explore-log-calculated-v2-api';
import { exploreQueryKeys } from '../controller/explore-query-keys';

describe('telemetry source boundary', () => {
  it('preserves external compatibility and rejects unsupported source text', () => {
    const external = parseExploreQuery(new URLSearchParams('signal=logs'));
    expect(buildExplorePath(external)).not.toContain('source=');
    const invalid = parseExploreQuery(new URLSearchParams('signal=logs&source=all'));
    expect(exploreHandoffState(invalid)).toBe('invalid');
    expect(() => buildSignalApiPath(invalid)).toThrow();
    const ambiguous = parseExploreQuery(new URLSearchParams('signal=logs&source=external&source=self'));
    expect(exploreHandoffState(ambiguous)).toBe('invalid');
  });
  it('propagates self through routes, queries and live paths', () => {
    const self = parseExploreQuery(new URLSearchParams('signal=logs&source=self'));
    expect(buildExplorePath(self)).toContain('source=self');
    expect(buildSignalApiPath(self)).toContain('source=self');
    if (self.signal !== 'logs') throw new Error('Expected logs');
    expect(buildLogStreamPath(self)).toContain('source=self');
    expect(exploreQueryKeys.history(self, undefined, 0)).not.toEqual(
      exploreQueryKeys.history({ ...self, source: undefined }, undefined, 0)
    );
  });
  it('clears selected identities and pagination and disables internal hiding on source switch', () => {
    const query = parseExploreQuery(new URLSearchParams('signal=logs&hideInternal=true&page=4&traceId=old'));
    const next = mergeExploreQuery(query, { source: 'self' });
    expect(next).toMatchObject({ source: 'self', hideInternal: undefined, pageIndex: undefined, traceId: undefined });
  });
  it('rejects a direct self route with conflicting internal hiding', () => {
    expect(
      exploreHandoffState(parseExploreQuery(new URLSearchParams('signal=logs&source=self&hideInternal=true')))
    ).toBe('invalid');
  });
  it('carries source through detail and related links and rejects database/source injection', () => {
    const window = { from: 1000, to: 2000 };
    const id = '0123456789abcdef0123456789abcdef';
    expect(buildTraceInvestigationApiPath(id, undefined, window, 'self')).toContain('source=self');
    expect(buildLogInvestigationApiPath('event-7', window, 'self')).toContain('source=self');
    expect(() => buildLogInvestigationApiPath('event-7', window, 'self;DROP DATABASE public')).toThrow();
    const trace = parseExploreQuery(new URLSearchParams(`signal=traces&source=self&traceId=${id}`));
    if (trace.signal !== 'traces') throw new Error('Expected traces');
    expect(buildTraceLogsPath(trace, id, undefined)).toContain('source=self');
    expect(exploreQueryKeys.traceInvestigation({}, window, id, undefined, 0, 'self')).not.toEqual(
      exploreQueryKeys.traceInvestigation({}, window, id, undefined, 0)
    );
  });
  it('includes trusted source selection in calculated analysis POST parameters', () => {
    const fields = JSON.stringify({
      version: 2,
      nextFieldSeq: 2,
      fields: [{ id: 'c1', kind: 'formula', name: 'latency', expression: '@duration_ms / 1000' }]
    });
    const query = parseExploreQuery(
      new URLSearchParams({ signal: 'logs', source: 'self', searchSyntax: 'structured-v2', logCalculatedV2: fields })
    );
    if (query.signal !== 'logs') throw new Error('Expected logs');
    expect(buildCalculatedPageRequest(query).parameters.source).toBe('self');
  });
});
