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

import { afterEach, expect, it, vi } from 'vitest';
import type { LiveLogRow } from '../model/explore-signal-contract';
import { appendLogEvidence, type EvidenceSetter } from './use-live-log-evidence-state';
import * as fingerprints from './live-log-payload-fingerprint';

const comparisons = vi.hoisted(() => ({ count: 0 }));
vi.mock('lodash/isEqual', async original => {
  const actual = await original<{ default: typeof import('lodash/isEqual') }>();
  return {
    default: (left: unknown, right: unknown) => {
      comparisons.count++;
      return actual.default(left, right);
    }
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  comparisons.count = 0;
});
function row(index = 0): LiveLogRow {
  return {
    timeUnixNano: 1000000,
    observedTimeUnixNano: null,
    severityNumber: 9,
    severityText: 'INFO',
    body: `record-${index}`,
    attributes: { 'log.record.uid': 'shared', 'hertzbeat.ingest_id': 'ingestion' },
    droppedAttributesCount: 0,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: { 'service.name': 'checkout' },
    resourceSchemaUrl: null,
    instrumentationScope: {
      name: 'library',
      version: '1',
      attributes: { flags: [true, false] },
      droppedAttributesCount: 0
    },
    scopeSchemaUrl: null
  };
}
function harness(rows: LiveLogRow[]) {
  let state = {
    scope: 'scope',
    rows,
    integrity: 'complete' as 'complete' | 'degraded',
    gapDroppedCount: undefined as number | undefined,
    gapCountOverflowed: false,
    locallyDroppedCount: 0,
    pauseDisconnectGap: false
  };
  const setter: EvidenceSetter = action => {
    state = typeof action === 'function' ? action(state) : action;
  };
  return {
    append: (incoming: LiveLogRow[]) => {
      appendLogEvidence(setter, 'scope', incoming);
      return state;
    }
  };
}
it('uses equal fingerprints for reordered object keys and suppresses only a complete replay', () => {
  const first = { ...row(), resource: { 'service.name': 'checkout', labels: { zone: 'a', tier: 'web' } } };
  const reordered = {
    ...first,
    resource: { labels: { tier: 'web', zone: 'a' }, 'service.name': 'checkout' },
    attributes: { 'hertzbeat.ingest_id': 'ingestion', 'log.record.uid': 'shared' },
    instrumentationScope: { ...first.instrumentationScope!, attributes: { flags: [true, false] } }
  };
  expect(fingerprints.liveLogPayloadFingerprint(first)).toBe(fingerprints.liveLogPayloadFingerprint(reordered));
  expect(harness([first]).append([reordered]).rows).toEqual([first]);
});
it.each([
  ['array order', { body: [1, 2] }, { body: [2, 1] }],
  ['missing and null', { resource: {} }, { resource: { field: null } }],
  [
    'ingestion metadata',
    { attributes: { 'log.record.uid': 'shared', 'hertzbeat.ingest_id': 'first' } },
    { attributes: { 'log.record.uid': 'shared', 'hertzbeat.ingest_id': 'second' } }
  ],
  ['scope metadata', { scopeSchemaUrl: 'first' }, { scopeSchemaUrl: 'second' }]
] satisfies Array<[string, Partial<LiveLogRow>, Partial<LiveLogRow>]>)(
  'preserves %s differences when selecting payload candidates',
  (_name, left, right) => {
    const first = { ...row(), ...left };
    const second = { ...row(), ...right };
    expect(fingerprints.liveLogPayloadFingerprint(first)).not.toBe(fingerprints.liveLogPayloadFingerprint(second));
    expect(harness([first]).append([second]).rows).toEqual([second, first]);
  }
);
it('keeps divergent payloads under a deliberately colliding fingerprint and still suppresses exact clones', () => {
  const fingerprint = vi.spyOn(fingerprints, 'liveLogPayloadFingerprint').mockReturnValue('forced-collision');
  const first = row(0);
  const variants = Array.from({ length: 40 }, (_, index) => row(index + 1));
  const state = harness([first]);
  expect(state.append([...variants, structuredClone(first), structuredClone(variants[0]!)]).rows).toEqual([
    ...[...variants].reverse(),
    first
  ]);
  expect(state.append([structuredClone(variants.at(-1)!)]).locallyDroppedCount).toBe(0);
  expect(fingerprint).toHaveBeenCalled();
});
it.each(['unique', 'single-variant-replays'] as const)('does not fingerprint %s buckets', mode => {
  const fingerprint = vi.spyOn(fingerprints, 'liveLogPayloadFingerprint');
  const retained = Array.from({ length: 500 }, (_, index) => ({
    ...row(index),
    attributes: { 'log.record.uid': `id-${index}` }
  }));
  const incoming = Array.from({ length: 1000 }, (_, index) =>
    mode === 'unique'
      ? { ...row(500 + index), attributes: { 'log.record.uid': `id-${500 + index}` } }
      : structuredClone(retained[index % 500]!)
  );
  const result = harness(retained).append(incoming);
  expect(result.locallyDroppedCount).toBe(mode === 'unique' ? 1000 : 0);
  expect(result.rows).toHaveLength(500);
  expect(fingerprint).not.toHaveBeenCalled();
});
it('promotes a growing bucket and finds pre-promotion clones while synchronizing new variants', () => {
  const fingerprint = vi.spyOn(fingerprints, 'liveLogPayloadFingerprint');
  const retained = [row(0), row(1)];
  const variants = Array.from({ length: 40 }, (_, index) => row(index + 2));
  const result = harness(retained).append([
    ...variants,
    structuredClone(retained[0]!),
    structuredClone(variants.at(-1)!)
  ]);
  expect(result.rows).toEqual([...variants].reverse().concat(retained));
  expect(result.locallyDroppedCount).toBe(0);
  expect(fingerprint).toHaveBeenCalled();
});
it('indexes only a queried large bucket and handles its divergent and replayed payloads', () => {
  const fingerprint = vi.spyOn(fingerprints, 'liveLogPayloadFingerprint');
  const retained = Array.from({ length: 300 }, (_, index) => row(index));
  const untouched = Array.from({ length: 200 }, (_, index) => ({
    ...row(1000 + index),
    attributes: { 'log.record.uid': 'untouched' }
  }));
  const fresh = row(300);
  const result = harness([...retained, ...untouched]).append([
    fresh,
    structuredClone(retained[0]!),
    structuredClone(fresh)
  ]);
  expect(result.rows).toEqual([fresh, ...retained, ...untouched.slice(0, 199)]);
  expect(result.locallyDroppedCount).toBe(1);
  expect(fingerprint).toHaveBeenCalled();
  expect(fingerprint.mock.calls.every(([record]) => record.attributes?.['log.record.uid'] !== 'untouched')).toBe(true);
});
it('avoids the quadratic deep comparison scan for 500 retained and 1000 incoming payload variants', () => {
  const state = harness(Array.from({ length: 500 }, (_, index) => row(index)));
  const result = state.append(Array.from({ length: 1000 }, (_, index) => row(500 + index)));
  expect(result.rows).toHaveLength(500);
  expect(result.locallyDroppedCount).toBe(1000);
  expect(new Set(result.rows.map(record => record.body)).size).toBe(500);
  // Deterministic work bound rather than a machine-dependent timing assertion.
  expect(comparisons.count).toBeLessThan(1000);
});
