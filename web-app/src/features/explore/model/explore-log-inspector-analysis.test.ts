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
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import {
  logInspectorAnalysisAction,
  logInspectorAnalysisDisabledReason,
  logInspectorAnalysisTarget
} from './explore-log-inspector-analysis';

const target = { field: { id: 'attribute:duration', source: 'attribute' as const, key: 'duration' }, numeric: true };
const raw = (patch = {}) => JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, ...patch });

describe('inspector analysis target', () => {
  it('retains native scalar type and exact root keys without treating nested paths as roots', () => {
    expect(logInspectorAnalysisTarget('attribute', 'http.status', 4)).toEqual({
      field: { id: 'attribute:http.status', source: 'attribute', key: 'http.status' },
      numeric: true
    });
    expect(logInspectorAnalysisTarget('attribute', 'duration', '4')).toEqual({ ...target, numeric: false });
    expect(logInspectorAnalysisTarget('attribute', 'duration', false)?.numeric).toBe(false);
    expect(logInspectorAnalysisTarget(undefined, 'http.status', 4)).toBeUndefined();
    for (const value of [null, undefined, [], [4], {}, Infinity, -Infinity, NaN]) {
      expect(logInspectorAnalysisTarget('attribute', 'duration', value)).toBeUndefined();
    }
    for (const key of ['log.record.uid', 'hertzbeat.ingest_id', 'hertzbeat.event_id', '', 'bad key']) {
      expect(logInspectorAnalysisTarget('attribute', key, 4)).toBeUndefined();
    }
  });
  it('maps trusted canonical identities but keeps namespace a raw resource field', () => {
    expect(logInspectorAnalysisTarget('resource', 'service.name', 4, 'serviceName')).toEqual({
      field: { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' },
      numeric: false
    });
    expect(logInspectorAnalysisTarget('resource', 'deployment.environment', 'prod', 'environment')?.field.id).toBe(
      'builtin:environment'
    );
    expect(logInspectorAnalysisTarget('resource', 'service.namespace', 'ns', 'serviceNamespace')?.field.id).toBe(
      'resource:service.namespace'
    );
    expect(logInspectorAnalysisTarget('attribute', 'service.name', 4, 'serviceName')?.field.id).toBe(
      'attribute:service.name'
    );
  });
});

describe('inspector analysis admission', () => {
  it('accepts absent and semantic defaults regardless of JSON formatting and count alias', () => {
    const reordered = '{"minCount":1,"order":"count-desc","limit":20,"representation":"logs","version":1}';
    for (const value of [undefined, raw(), reordered, raw({ measure: { function: 'count' } })]) {
      expect(logInspectorAnalysisDisabledReason(value, value)).toBeUndefined();
      expect(logInspectorAnalysisAction(value, value, target, 'group')).toEqual({
        kind: 'ready',
        analysis: { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', field: target.field.id }
      });
    }
    expect(logInspectorAnalysisAction(undefined, undefined, target, 'measure')).toEqual({
      kind: 'ready',
      analysis: {
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        measure: { function: 'avg', field: target.field.id },
        order: 'measure-desc'
      }
    });
    expect(logInspectorAnalysisAction(undefined, undefined, target, 'graph')).toEqual({
      kind: 'ready',
      analysis: {
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        measure: { function: 'avg', field: target.field.id },
        order: 'measure-desc'
      }
    });
    expect(logInspectorAnalysisAction(undefined, undefined, { ...target, numeric: false }, 'graph')).toEqual({
      kind: 'ready',
      analysis: {
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        measure: { function: 'unique', field: target.field.id },
        order: 'measure-desc'
      }
    });
  });
  it('protects both applied and draft configuration including hidden non-default Logs controls', () => {
    for (const value of [
      raw({ representation: 'table' }),
      raw({ limit: 10 }),
      raw({ minCount: 2 }),
      raw({ order: 'count-asc' }),
      raw({ grouping: { version: 1, dimensions: [{ field: 'attribute:x', limit: 20 }] } }),
      raw({ comparison: { version: 1, search: 'error' }, representation: 'table' }),
      raw({ intervalMs: 60000 }),
      raw({ representation: 'timeseries', transform: 'throughput' }),
      raw({ additionalMeasures: [{ function: 'max', field: 'attribute:x' }] }),
      '',
      'null',
      '{',
      raw({ unexpected: true })
    ]) {
      for (const pair of [
        [value, undefined],
        [undefined, value]
      ] as const) {
        expect(logInspectorAnalysisDisabledReason(pair[0], pair[1])).toBe('existing-analysis');
        expect(logInspectorAnalysisAction(pair[0], pair[1], target, 'group')).toEqual({
          kind: 'disabled',
          reason: 'existing-analysis'
        });
      }
    }
  });
  it('replaces a simple prior graph or group after returning to Logs', () => {
    for (const prior of [
      raw({ representation: 'timeseries', field: 'attribute:x' }),
      raw({ representation: 'logs', measure: { function: 'unique', field: 'attribute:x' }, order: 'measure-desc' })
    ]) {
      expect(logInspectorAnalysisDisabledReason(prior, prior)).toBeUndefined();
      expect(logInspectorAnalysisAction(prior, prior, target, 'graph')).toMatchObject({ kind: 'ready' });
    }
  });
  it('rejects forged field targets and nonnumeric or builtin measures without producing a patch', () => {
    for (const invalid of [
      { ...target, numeric: false },
      { field: { id: 'builtin:serviceName', source: 'builtin' as const, key: 'serviceName' }, numeric: true },
      { ...target, field: { ...target.field, id: 'attribute:other' } }
    ]) {
      expect(logInspectorAnalysisAction(undefined, undefined, invalid, 'measure')).toEqual({
        kind: 'disabled',
        reason: 'unavailable'
      });
    }
  });
});
