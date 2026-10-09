/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { createTimezoneAwareAxisFormatter } from '../../../../node_modules/@perses-dev/timeseries-chart-plugin/lib/utils/timezone-formatter';
it('distinguishes subminute ticks across a thirty-minute log window while retaining whole-minute labels', () => {
  const axis = createTimezoneAwareAxisFormatter(1800000, 'UTC');
  const base = Date.UTC(2026, 8, 9, 12, 0, 0);
  expect(axis(base)).toBe('12:00');
  expect(axis(base + 5000)).toBe('12:00:05');
  expect(axis(base + 10000)).toBe('12:00:10');
  expect(axis(base + 30000)).toBe('12:00:30');
  expect(createTimezoneAwareAxisFormatter(10000, 'UTC')(base + 1000)).toBe('12:00:01.000');
  expect(createTimezoneAwareAxisFormatter(86400000 * 3, 'UTC')(base)).toBe('09.09 12:00');
});
