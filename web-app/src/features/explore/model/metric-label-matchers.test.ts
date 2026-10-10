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
import {
  metricMatcherLocks,
  readMetricMatchers,
  addMetricMatcher,
  updateMetricMatcher,
  removeMetricMatcher
} from './metric-label-matchers';

describe('metric literal matcher editing', () => {
  it('adds two distinct labels, edits/removes one and removes the last', () => {
    const first = addMetricMatcher('', { field: 'host', operator: '=', value: 'a,b' });
    const second = addMetricMatcher(first!, { field: 'zone', operator: '!=', value: 'east' });
    expect(readMetricMatchers(second!)).toEqual([
      { field: 'host', operator: '=', value: 'a,b' },
      { field: 'zone', operator: '!=', value: 'east' }
    ]);
    const changed = updateMetricMatcher(second!, 0, { operator: '!=', value: 'new' });
    expect(readMetricMatchers(changed!)?.[1]).toEqual({ field: 'zone', operator: '!=', value: 'east' });
    expect(removeMetricMatcher(removeMetricMatcher(changed!, 0)!, 0)).toBe('');
  });
  it.each(['quote"value', 'back\\slash', 'tail\\', 'comma,and AND', '\u03bb\u00e9', ''])(
    'round trips literal %s',
    value => {
      expect(readMetricMatchers(addMetricMatcher('', { field: 'host', operator: '=', value })!)).toEqual([
        { field: 'host', operator: '=', value }
      ]);
    }
  );
  it.each([
    'host=~"a.*"',
    "host IN ('a','b')",
    'host="a" OR zone="b"',
    'host="a",host="b"',
    'host="unfinished',
    'host=a*'
  ])('leaves advanced/invalid raw text untouched: %s', raw => {
    expect(readMetricMatchers(raw)).toBeUndefined();
    expect(addMetricMatcher(raw, { field: 'zone', operator: '=', value: 'east' })).toBeUndefined();
    expect(updateMetricMatcher(raw, 0, { value: 'new' })).toBeUndefined();
    expect(removeMetricMatcher(raw, 0)).toBeUndefined();
  });
  it('keeps fixed identity labels protected without widening scope', () => {
    expect(
      metricMatcherLocks({
        signal: 'metrics',
        timeRange: 'last-30m',
        entityId: '7',
        serviceName: 'fixed',
        environment: 'prod',
        collectorId: 'collector-a',
        instance: 'i-a',
        endpoint: '/checkout'
      })
    ).toEqual(
      expect.arrayContaining([
        '__name__',
        'hertzbeat_workspace_id',
        'service_name',
        'deployment_environment_name',
        'hertzbeat_entity_id',
        'hertzbeat_entity_type',
        'hertzbeat_collector_id',
        'service_instance_id',
        'http_route'
      ])
    );
  });
  it('keeps the existing matcher capacity boundary', () => {
    expect(addMetricMatcher('', { field: 'host', operator: '=', value: 'x'.repeat(1024) })).toBeUndefined();
  });
  it('blocks duplicates, unsafe fields and locked scope without overwriting', () => {
    const raw = 'host="a"';
    expect(addMetricMatcher(raw, { field: 'host', operator: '!=', value: 'b' })).toBeUndefined();
    expect(addMetricMatcher(raw, { field: 'bad field', operator: '=', value: 'b' })).toBeUndefined();
    expect(
      addMetricMatcher(raw, { field: 'service_name', operator: '=', value: 'other' }, ['service_name'])
    ).toBeUndefined();
    expect(updateMetricMatcher('service_name="fixed"', 0, { value: 'other' }, ['service_name'])).toBeUndefined();
    expect(removeMetricMatcher('service_name="fixed"', 0, ['service_name'])).toBeUndefined();
  });
});
