/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { createTimezoneAwareAxisFormatter } from '@perses-dev/timeseries-chart-plugin/lib/utils/timezone-formatter';
import primitiveStyles from './hertzbeat-perses-primitives.module.css?raw';

describe('native compact time series', () => {
  it('distinguishes seconds in a short window using the selected timezone', () => {
    const format = createTimezoneAwareAxisFormatter(22_000, 'Asia/Shanghai');
    expect(format(Date.parse('2026-09-07T06:04:29Z'))).toBe('14:04:29');
    expect(format(Date.parse('2026-09-07T06:04:31Z'))).toBe('14:04:31');
  });
  it('distinguishes subsecond samples while preserving ordinary minute labels', () => {
    const timestamp = Date.parse('2026-09-07T06:04:29.123Z');
    expect(createTimezoneAwareAxisFormatter(1000, 'UTC')(timestamp)).toBe('06:04:29.123');
    expect(createTimezoneAwareAxisFormatter(1_800_000, 'UTC')(timestamp)).toBe('06:04:29');
    expect(createTimezoneAwareAxisFormatter(1_800_000, 'UTC')(Date.parse('2026-09-07T06:04:00Z'))).toBe('06:04');
  });
  it('sizes the compact frame and actual native runtime from the same height with an 84px fallback', () => {
    const compact = primitiveStyles.slice(
      primitiveStyles.indexOf(".primitive[data-variant='compact']"),
      primitiveStyles.indexOf('.completeness')
    );
    expect(compact).toContain('grid-template-rows: var(--hb-perses-compact-height, 84px) auto');
    expect(compact).toContain('height: var(--hb-perses-compact-height, 84px)');
    expect(compact).not.toMatch(/(?:height|rows): 84px/);
  });
});
