/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { formatDecimal } from '@perses-dev/components/dist/model/decimal';
it('keeps extreme finite decimal labels bounded without dropping their value', () => {
  for (const value of [Number.MAX_VALUE / 60, -Number.MAX_VALUE / 60, 1e-12]) {
    const label = formatDecimal(value, { shortValues: true });
    expect(label.length).toBeLessThan(24);
    expect(label).toMatch(/[eE]/);
    expect(label).not.toBe('0');
  }
  expect(formatDecimal(1700, { shortValues: true })).toBe('1.7K');
  expect(formatDecimal(0, { shortValues: true })).toBe('0');
});
