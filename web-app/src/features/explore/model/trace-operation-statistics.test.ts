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
import { traceOperationStatistics, formatOperationDuration, type OperationSpan } from './trace-operation-statistics';

function span(
  id: string,
  start: string,
  duration: string,
  parent: string | null = null,
  service: string | null = 'api',
  operation: string | null = 'GET'
): OperationSpan {
  return {
    spanId: id,
    parentSpanId: parent,
    startTimeUnixNano: start,
    durationNanos: duration,
    serviceName: service,
    spanName: operation
  };
}
const stats = (spans: OperationSpan[]) => traceOperationStatistics(spans);
const self = (spans: OperationSpan[]) => stats(spans).groups.find(group => group.spanName === 'parent')?.selfNanos;

describe('TR02 newly defined sample-statistics contract (original attachment unread)', () => {
  it('1: measures a single span and formats an exact fractional average', () => {
    const result = stats([span('a', '100', '93')]);
    expect(result.groups[0]).toMatchObject({ count: 1, sumNanos: 93n, selfNanos: 93n });
    expect(formatOperationDuration(93n, 2)).toBe('46.50 ns');
    const group = stats([span('a', '100', '93'), span('b', '200', '94')]).groups[0]!;
    expect(group).toMatchObject({ count: 2, sumNanos: 187n, selfNanos: 187n });
    expect(formatOperationDuration(group.sumNanos, group.count)).toBe('93.50 ns');
  });
  it('2: subtracts serial direct children', () => {
    expect(
      self([span('p', '100', '100', null, 'api', 'parent'), span('a', '110', '20', 'p'), span('b', '140', '30', 'p')])
    ).toBe(50n);
  });
  it('3: subtracts an overlapping child union once', () => {
    expect(
      self([span('p', '0', '100', null, 'api', 'parent'), span('a', '10', '60', 'p'), span('b', '40', '50', 'p')])
    ).toBe(20n);
  });
  it('4: intersects children with the parent interval, including wholly outside children', () => {
    expect(
      self([
        span('p', '100', '100', null, 'api', 'parent'),
        span('a', '90', '30', 'p'),
        span('b', '180', '60', 'p'),
        span('c', '300', '10', 'p')
      ])
    ).toBe(60n);
  });
  it('5: does not subtract grandchildren again from their ancestor', () => {
    expect(
      self([span('p', '0', '100', null, 'api', 'parent'), span('a', '10', '60', 'p'), span('b', '20', '30', 'a')])
    ).toBe(40n);
  });
  it('6: separates the same operation in different services', () => {
    expect(stats([span('a', '0', '10', null, 'api'), span('b', '0', '10', null, 'db')]).groups).toHaveLength(2);
  });
  it('7: keeps null, empty and whitespace literal identity distinct for each key', () => {
    const spans = [null, '', ' '].flatMap((service, i) =>
      [null, '', ' '].map((op, j) => span(`${i}-${j}`, '0', '1', null, service, op))
    );
    expect(stats(spans).groups).toHaveLength(9);
  });
  it('8: retains nanosecond differences beyond Number safe integers', () => {
    expect(
      self([
        span('p', '18446744073709551000', '100', null, 'api', 'parent'),
        span('a', '18446744073709551007', '83', 'p')
      ])
    ).toBe(17n);
  });
  it('9: marks missing parents and explicit partial samples, including unknown missing children', () => {
    expect(stats([span('a', '0', '10', 'missing')])).toMatchObject({ partial: true, missingParents: 1 });
    expect(traceOperationStatistics([span('a', '0', '10')], { partial: true })).toMatchObject({ partial: true });
  });
  it('10: skips invalid starts, negative intervals and overflow; never invents zero groups', () => {
    expect(stats([span('a', 'bad', '1'), span('b', '1', '-1'), span('c', '18446744073709551615', '1')])).toMatchObject({
      groups: [],
      skipped: 3,
      validCount: 0,
      partial: true
    });
  });
  it('11: includes legitimate zero-duration spans', () => {
    expect(stats([span('a', '0', '0')]).groups[0]).toMatchObject({ count: 1, sumNanos: 0n, selfNanos: 0n });
  });
  it('12: marks a 5000 loaded-span sample as capped even without a backend truncation flag', () => {
    expect(stats(Array.from({ length: 5000 }, (_, i) => span(String(i), '0', '1')))).toMatchObject({
      capped: true,
      partial: true,
      validCount: 5000
    });
  });
  it('rejects all duplicate IDs rather than choosing a hidden winner', () => {
    expect(stats([span('a', '0', '10'), span('a', '0', '20')])).toMatchObject({
      skipped: 2,
      duplicateSpans: 2,
      groups: [],
      partial: true
    });
  });
  it('skips cycles without hanging and flags ambiguous observed self evidence', () => {
    expect(stats([span('a', '0', '10', 'b'), span('b', '0', '10', 'a')])).toMatchObject({
      skipped: 2,
      cyclicSpans: 2,
      groups: [],
      partial: true
    });
  });
  it('does not mutate incoming spans or merge inclusive execution across independent spans', () => {
    const input = Object.freeze([Object.freeze(span('a', '0', '100')), Object.freeze(span('b', '0', '100'))]);
    expect(stats([...input]).groups[0]).toMatchObject({ count: 2, sumNanos: 200n, selfNanos: 200n });
  });
});

it('uses the trace two-decimal duration convention without rounding tiny positive averages to zero', () => {
  expect(formatOperationDuration(290_000_000n, 3)).toBe('96.67 ms');
  expect(formatOperationDuration(1n, 1000)).toBe('<0.01 ns');
  expect(formatOperationDuration(0n)).toBe('0.00 ns');
  expect(formatOperationDuration(1_234_567_890n)).toBe('1.23 s');
});
