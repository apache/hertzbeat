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

import { expect, it } from 'vitest';
import {
  DEFAULT_LOG_ANALYSIS,
  encodeLogAnalysis,
  parseLogAnalysis,
  normalizeLogBucketValue,
  isPartialLogBucket
} from '@/platform/perses';

it('preserves sum and throughput in the existing analysis document without changing old documents', () => {
  const value = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    order: 'measure-desc',
    measure: { function: 'sum', field: 'attribute:bytes' },
    transform: 'throughput'
  } as const;
  expect(parseLogAnalysis(encodeLogAnalysis(value))).toEqual(value);
  expect(JSON.parse(encodeLogAnalysis(DEFAULT_LOG_ANALYSIS))).not.toHaveProperty('transform');
  for (const representation of ['logs', 'table', 'toplist'])
    expect(() => parseLogAnalysis(JSON.stringify({ ...value, representation }))).toThrow();
});
it('uses nominal seconds once, preserves null and zero and recognizes partial closed-end bins', () => {
  expect(normalizeLogBucketValue(120, 60000, 'throughput')).toBe(2);
  expect(normalizeLogBucketValue(120, 60000, undefined)).toBe(120);
  expect(normalizeLogBucketValue(null, 60000, 'throughput')).toBeNull();
  expect(normalizeLogBucketValue(0, 1000, 'throughput')).toBe(0);
  expect([2, 1].map(n => normalizeLogBucketValue(n, 1000, 'throughput'))).toEqual([2, 1]);
  expect(isPartialLogBucket(1000, 1000, { start: 1500, end: 2000 })).toBe(true);
  expect(isPartialLogBucket(2000, 1000, { start: 1500, end: 2000 })).toBe(true);
  expect(isPartialLogBucket(1000, 1000, { start: 1000, end: 1999 })).toBe(true);
  expect(isPartialLogBucket(1000, 1000, { start: 1000, end: 2000 })).toBe(false);
});

it('bounds extreme raw numeric labels while preserving ordinary decimals', async () => {
  const { formatLogNumericValue } = await import('./explore-log-throughput');
  expect(formatLogNumericValue(Number.MAX_VALUE).length).toBeLessThan(24);
  expect(formatLogNumericValue(1e-12)).not.toBe('0');
  expect(formatLogNumericValue(1.25)).toBe('1.25');
});
