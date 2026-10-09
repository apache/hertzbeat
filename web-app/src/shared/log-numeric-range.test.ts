/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { logNumericRangeSchema, readLogNumericRange, validLogNumericRange } from './log-numeric-range';
it('accepts inclusive finite root-field bounds and rejects ambiguous or invalid descriptors', () => {
  const range = { version: 1, field: 'attribute:duration', min: 2, max: 6 };
  expect(readLogNumericRange(JSON.stringify(range))).toEqual(range);
  expect(readLogNumericRange(JSON.stringify({ ...range, min: 6 }))).toMatchObject({ min: 6, max: 6 });
  for (const value of [
    { ...range, min: null },
    { ...range, min: '2' },
    { ...range, min: 7 },
    { ...range, field: 'builtin:severityCategory' },
    { ...range, field: 'resource:workspace.id' },
    { ...range, extra: true }
  ])
    expect(readLogNumericRange(JSON.stringify(value))).toBeUndefined();
  expect(readLogNumericRange('{"version":1,"field":"attribute:a","min":1,"max":2,"min":0}')).toBeUndefined();
  expect(validLogNumericRange(undefined)).toBe(true);
  expect(validLogNumericRange('')).toBe(false);
});

it('keeps finite extreme bounds and limits raw descriptors without dropping invalid input', () => {
  expect(
    logNumericRangeSchema.safeParse({
      version: 1,
      field: 'resource:ratio',
      min: -Number.MAX_VALUE,
      max: Number.MAX_VALUE
    }).success
  ).toBe(true);
  expect(
    logNumericRangeSchema.safeParse({ version: 1, field: 'attribute:value', min: NaN, max: Infinity }).success
  ).toBe(false);
  expect(readLogNumericRange(' '.repeat(2049))).toBeUndefined();
  for (const version of ['1.0', '1e0'])
    expect(readLogNumericRange(`{"version":${version},"field":"attribute:value","min":0,"max":1}`)).toBeDefined();
});
