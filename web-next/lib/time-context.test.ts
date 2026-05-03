import { describe, expect, it } from 'vitest';
import {
  TIME_CONTEXT_PRESETS,
  MAX_TIME_CONTEXT_WINDOW_MS,
  appendTimeContextParams,
  buildChartDataZoomTimeContext,
  buildEventWindowTimeContext,
  parseTimeContextFromParams,
  resolveTimeContextBounds,
  sanitizeTimeContext
} from './time-context';

describe('shared observability time context', () => {
  it('keeps the platform preset set shared by OTLP metrics and monitor history', () => {
    expect(TIME_CONTEXT_PRESETS.map(preset => preset.value)).toEqual([
      'last-30m',
      'last-1h',
      'last-6h',
      'last-1d',
      'last-1w',
      'last-4w',
      'last-12w'
    ]);
  });

  it('resolves preset bounds without each route owning a private duration table', () => {
    expect(resolveTimeContextBounds({ timeRange: 'last-1h' }, 1_712_733_600_000)).toEqual({
      start: '1712730000000',
      end: '1712733600000'
    });
  });

  it('accepts validated custom relative windows within the platform maximum', () => {
    expect(sanitizeTimeContext({ timeRange: 'last-45m' })).toEqual({ timeRange: 'last-45m' });
    expect(resolveTimeContextBounds({ timeRange: 'last-45m' }, 1_712_733_600_000)).toEqual({
      start: '1712730900000',
      end: '1712733600000'
    });

    expect(sanitizeTimeContext({ timeRange: 'last-0m' })).toEqual({});
    expect(sanitizeTimeContext({ timeRange: 'last-13w' })).toEqual({});
    expect(sanitizeTimeContext({ timeRange: 'last-90d' })).toEqual({});
    expect(sanitizeTimeContext({ timeRange: 'last-2q' })).toEqual({});
  });

  it('rejects absolute windows that exceed the shared platform maximum', () => {
    const start = 1_712_730_000_000;
    expect(resolveTimeContextBounds({ start: String(start), end: String(start + MAX_TIME_CONTEXT_WINDOW_MS) })).toEqual({
      start: String(start),
      end: String(start + MAX_TIME_CONTEXT_WINDOW_MS)
    });
    expect(resolveTimeContextBounds({ start: String(start), end: String(start + MAX_TIME_CONTEXT_WINDOW_MS + 1) })).toBeNull();
    expect(resolveTimeContextBounds({ start: '1712733600000', end: '1712730000000' })).toBeNull();
  });

  it('sanitizes route time context primitives before they reach URLs', () => {
    expect(
      sanitizeTimeContext({
        timeRange: 'last-6h',
        start: '1712730000000',
        end: '1712751600000',
        refresh: '30',
        live: 'true',
        tz: 'Asia/Shanghai'
      })
    ).toEqual({
      timeRange: 'last-6h',
      start: '1712730000000',
      end: '1712751600000',
      refresh: '30',
      live: 'true',
      tz: 'Asia/Shanghai'
    });

    expect(
      sanitizeTimeContext({
        timeRange: 'last-five-minutes',
        start: '1712730000000.99',
        end: 'now',
        refresh: '-1',
        live: 'yes',
        tz: 'Asia/Shanghai<script>'
      })
    ).toEqual({});
  });

  it('parses and appends the standard URL keys in one stable order', () => {
    const parsed = parseTimeContextFromParams(
      new URLSearchParams('end=1712733600000&live=1&refresh=30&start=1712730000000&timeRange=last-1h&tz=Asia%2FShanghai')
    );
    expect(parsed).toEqual({
      timeRange: 'last-1h',
      start: '1712730000000',
      end: '1712733600000',
      refresh: '30',
      live: 'true',
      tz: 'Asia/Shanghai'
    });

    const params = new URLSearchParams();
    appendTimeContextParams(params, parsed);
    expect(params.toString()).toBe('timeRange=last-1h&start=1712730000000&end=1712733600000&refresh=30&live=true&tz=Asia%2FShanghai');
  });

  it('keeps chart dataZoom as local observation until it is explicitly applied as query time', () => {
    expect(buildChartDataZoomTimeContext([1000, 2000, 3000], { start: 25, end: 75 }, 'last-1h')).toEqual({
      timeRange: 'last-1h',
      start: '1500',
      end: '2500'
    });

    expect(buildChartDataZoomTimeContext([1000, 2000, 3000], { startValue: 1250, endValue: 2750 }, 'last-1h')).toEqual({
      timeRange: 'last-1h',
      start: '1250',
      end: '2750'
    });

    expect(buildChartDataZoomTimeContext([1000, 2000, 3000], { start: 0, end: 100 }, 'last-1h')).toBeNull();
    expect(buildChartDataZoomTimeContext([1000, 2000, 3000], { start: 0, end: 100, startValue: 1000, endValue: 3000 }, 'last-1h')).toBeNull();
  });

  it('fills missing evidence links with an event-centered window while preserving refresh, live, and timezone', () => {
    expect(
      buildEventWindowTimeContext(
        {
          timeRange: 'last-1h',
          refresh: '30',
          live: 'false',
          tz: 'Asia/Shanghai'
        },
        {
          eventStart: 1_713_200_000_000,
          eventEnd: 1_713_201_800_000
        }
      )
    ).toEqual({
      timeRange: 'last-1h',
      start: '1713199100000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai'
    });

    expect(
      buildEventWindowTimeContext(
        {
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          refresh: '15'
        },
        {
          eventStart: 1_713_100_000_000
        }
      )
    ).toEqual({
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '15'
    });
  });
});
