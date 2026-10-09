/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { parseWallTime } from './explore-time-input';
it.each([
  ['.1', 100],
  ['.12', 120],
  ['.100', 100],
  ['.001', 1],
  ['', 0]
] as const)('parses decimal seconds %s in the requested timezone', (fraction, ms) => {
  expect(parseWallTime(`2026-09-07T22:00:00${fraction}`, 'Asia/Shanghai', 1)).toBe(1788789600000 + ms);
});
it.each([
  '2026-09-07T22:00:00Z',
  '2026-09-07T22:00:00+08:00',
  '2026-09-07T22:00:00.123.junk',
  '2026-09-07T22:00:00.123.456',
  'garbage',
  ''
])('rejects non-wall-clock input %s', value => {
  expect(parseWallTime(value, 'Asia/Shanghai', 1)).toBeNaN();
});
it('preserves the exact original instant for an unchanged repeated DST wall time', () => {
  const secondOccurrence = Date.parse('2026-11-01T06:30:00Z');
  expect(parseWallTime('2026-11-01T01:30:00', 'America/New_York', secondOccurrence)).toBe(secondOccurrence);
});
