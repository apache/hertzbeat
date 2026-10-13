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
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
import { parseExploreQuery } from './explore-url-model';
import { createTraceNavigation } from './explore-trace-navigation';

describe('trace row navigation boundaries', () => {
  it('opens a structural match as an ordinary trace detail while retaining the exact structural return query', () => {
    const row = traceEvidenceFixture();
    const window = { from: row.observedStartTime, to: row.observedStartTime + 1000 };
    const traceStructure = JSON.stringify({
      version: 1,
      a: { serviceName: 'checkout', operationName: null, status: null },
      b: { serviceName: 'cart', operationName: null, status: 'ERROR' },
      relation: 'direct'
    });
    const result = createTraceNavigation(
      [row],
      {
        signal: 'traces',
        timeRange: 'last-30m',
        start: window.from,
        end: window.to,
        timeZone: 'UTC',
        traceStructure
      },
      window,
      'UTC',
      'Unavailable'
    );
    const detail = new URL(result.links[row.traceId]!, 'https://hertzbeat.local');
    expect(detail.searchParams.get('traceId')).toBe(row.traceId);
    expect(detail.searchParams.has('traceStructure')).toBe(false);
    const back = new URL(detail.searchParams.get('returnTo')!, 'https://hertzbeat.local');
    expect(back.searchParams.get('traceStructure')).toBe(traceStructure);
  });

  it('keeps a committed absolute investigation window and return filters instead of widening to span bounds', () => {
    const row = traceEvidenceFixture();
    const window = { from: row.observedStartTime, to: row.observedStartTime + 1000 };
    const result = createTraceNavigation(
      [row],
      {
        signal: 'traces',
        timeRange: 'last-30m',
        start: window.from,
        end: window.to,
        timeZone: 'UTC',
        errorOnly: true,
        resourceFilter: 'service.version=2',
        pageIndex: 2
      },
      window,
      'UTC',
      'Unavailable'
    );
    const detail = new URL(result.links[row.traceId]!, 'https://hertzbeat.local');
    expect(parseExploreQuery(detail.searchParams)).toMatchObject({
      start: window.from,
      end: window.to,
      resourceFilter: 'service.version=2'
    });
    const back = new URL(detail.searchParams.get('returnTo')!, 'https://hertzbeat.local');
    expect(parseExploreQuery(back.searchParams)).toMatchObject({
      start: window.from,
      end: window.to,
      errorOnly: true,
      pageIndex: 2,
      resourceFilter: 'service.version=2'
    });
  });

  it('keeps usable rows linked while explaining an oversized trace locally', () => {
    const normal = traceEvidenceFixture();
    const wide = traceEvidenceFixture({
      traceId: '22222222222222222222222222222222',
      observedEndTime: normal.observedStartTime + 86_400_001
    });
    const result = createTraceNavigation(
      [normal, wide],
      { signal: 'traces', timeRange: 'last-30m', pageIndex: 2 },
      { from: normal.observedStartTime, to: normal.observedStartTime + 60000 },
      'UTC',
      'Window too wide'
    );
    expect(result.links[normal.traceId]).toContain('returnTo=');
    expect(result.links[wide.traceId]).toBeUndefined();
    expect(result.unavailableLinks).toEqual({ [wide.traceId]: 'Window too wide' });
  });
});
