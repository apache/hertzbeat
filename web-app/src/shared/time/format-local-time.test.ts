/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';
import { formatShortLocalTimeRange } from './format-local-time';

describe('short local evidence window', () => {
  it('shows the two exact second boundaries with one shared timezone', () => {
    const result = formatShortLocalTimeRange(Date.parse('2026-09-05T09:35:00Z'), Date.parse('2026-09-05T10:05:00Z'), {
      locale: 'en-US',
      timeZone: 'UTC'
    });
    expect(result).toContain('09:35:00');
    expect(result).toContain('10:05:00');
    expect(result.split('UTC')).toHaveLength(2);
  });

  it('includes calendar dates when the local range crosses midnight', () => {
    const result = formatShortLocalTimeRange(Date.parse('2026-09-05T23:35:00Z'), Date.parse('2026-09-06T00:05:00Z'), {
      locale: 'en-US',
      timeZone: 'UTC'
    });
    expect(result).toContain('09/05');
    expect(result).toContain('09/06');
    expect(result).toContain('23:35:00');
    expect(result).toContain('00:05:00');
  });

  it('retains both timezone offsets for an ambiguous daylight-saving overlap', () => {
    const result = formatShortLocalTimeRange(Date.parse('2026-11-01T05:30:00Z'), Date.parse('2026-11-01T06:30:00Z'), {
      locale: 'en-US',
      timeZone: 'America/New_York'
    });
    expect(result).toContain('EDT');
    expect(result).toContain('EST');
  });

  it.each([
    ['2026-03-08T09:30:00Z', '2026-03-08T10:30:00Z', '01:30:00', '03:30:00', 'PST', 'PDT'],
    ['2026-11-01T08:30:00Z', '2026-11-01T09:30:00Z', '01:30:00', '01:30:00', 'PDT', 'PST']
  ])(
    'labels both LA offsets across DST at %s without changing the absolute window',
    (start, end, fromTime, toTime, fromZone, toZone) => {
      const window = { from: Date.parse(start), to: Date.parse(end) };
      const original = { ...window };
      const result = formatShortLocalTimeRange(window.from, window.to, {
        locale: 'en-US',
        timeZone: 'America/Los_Angeles'
      });
      expect(result).toContain(fromTime + ' ' + fromZone);
      expect(result).toContain(toTime + ' ' + toZone);
      expect(window).toEqual(original);
      expect(window.to - window.from).toBe(3_600_000);
    }
  );
});
