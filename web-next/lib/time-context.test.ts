import { describe, expect, it } from 'vitest';
import {
  TIME_CONTEXT_PRESETS,
  MAX_TIME_CONTEXT_WINDOW_MS,
  appendExpressionTimeRangeParams,
  appendTimeContextParams,
  buildChartDataZoomTimeContext,
  buildEventWindowTimeContext,
  parseDateMathExpression,
  parseExpressionTimeRangeFromParams,
  parseTimeContextFromParams,
  resolveTimeContextRefreshInterval,
  resolveExpressionTimeRange,
  resolveAppliedTimeContext,
  isSameTimeContextRange,
  timeRangeToExpressionRange,
  timeContextRefreshIntervalToContext,
  timeRangeToTimeWindow,
  timeWindowToTimeRange,
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

  it('keeps display labels out of the platform time preset model', () => {
    expect(TIME_CONTEXT_PRESETS.every(preset => !('label' in preset))).toBe(true);
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

  it('preserves custom absolute route semantics while resolving bounds from explicit start and end', () => {
    expect(sanitizeTimeContext({ timeRange: 'custom', start: '1712730000000', end: '1712733600000' })).toEqual({
      timeRange: 'custom',
      start: '1712730000000',
      end: '1712733600000'
    });
    expect(resolveTimeContextBounds({ timeRange: 'custom', start: '1712730000000', end: '1712733600000' })).toEqual({
      start: '1712730000000',
      end: '1712733600000'
    });
    expect(resolveTimeContextBounds({ timeRange: 'custom' })).toBeNull();
  });

  it('resolves date-math expressions without forcing every signal page to reimplement parser logic', () => {
    const now = Date.UTC(2026, 4, 17, 8, 12, 57);

    expect(parseDateMathExpression('now', now)).toBe(now);
    expect(parseDateMathExpression('now-5m', now)).toBe(now - 5 * 60 * 1000);
    expect(parseDateMathExpression('now-6h', now)).toBe(now - 6 * 60 * 60 * 1000);
    expect(parseDateMathExpression('now+30s', now)).toBe(now + 30 * 1000);
    expect(parseDateMathExpression('now-1d/d', now)).toBe(Date.UTC(2026, 4, 16, 0, 0, 0));
    expect(parseDateMathExpression('now/d+8h', now)).toBe(Date.UTC(2026, 4, 17, 8, 0, 0));
    expect(parseDateMathExpression('2026-05-17 15:12:57', now)).toBe(new Date(2026, 4, 17, 15, 12, 57).getTime());
    expect(parseDateMathExpression('not-a-time', now)).toBeUndefined();
  });

  it('interprets absolute calendar expressions in the operator local timezone', () => {
    const now = Date.UTC(2026, 4, 17, 8, 12, 57);

    expect(parseDateMathExpression('2026-05-17 15:12:57', now)).toBe(new Date(2026, 4, 17, 15, 12, 57).getTime());
    expect(resolveExpressionTimeRange({ from: '2026-05-17 15:00:00', to: '2026-05-17 16:00:00' }, now)).toMatchObject({
      kind: 'absolute',
      start: String(new Date(2026, 4, 17, 15, 0, 0).getTime()),
      end: String(new Date(2026, 4, 17, 16, 0, 0).getTime())
    });
  });

  it('classifies date-math relative, absolute, and semi-relative ranges as one platform time model', () => {
    const now = Date.UTC(2026, 4, 17, 8, 12, 57);

    expect(resolveExpressionTimeRange({ from: 'now-1h', to: 'now' }, now)).toEqual({
      kind: 'relative',
      from: 'now-1h',
      to: 'now',
      start: String(Date.UTC(2026, 4, 17, 7, 12, 57)),
      end: String(now)
    });

    expect(resolveExpressionTimeRange({ from: '2026-05-17 07:00:00', to: '2026-05-17 08:00:00' }, now)).toEqual({
      kind: 'absolute',
      from: '2026-05-17 07:00:00',
      to: '2026-05-17 08:00:00',
      start: String(new Date(2026, 4, 17, 7, 0, 0).getTime()),
      end: String(new Date(2026, 4, 17, 8, 0, 0).getTime())
    });

    expect(resolveExpressionTimeRange({ from: '2026-05-17 07:00:00', to: 'now' }, now)).toEqual({
      kind: 'semi-relative',
      from: '2026-05-17 07:00:00',
      to: 'now',
      start: String(new Date(2026, 4, 17, 7, 0, 0).getTime()),
      end: String(now)
    });
  });

  it('converts shared relative presets into expression from/to ranges for platform route owners', () => {
    expect(timeRangeToExpressionRange('last-1h')).toEqual({ from: 'now-1h', to: 'now' });
    expect(timeRangeToExpressionRange('last-12w')).toEqual({ from: 'now-12w', to: 'now' });
    expect(timeRangeToExpressionRange('last-45m')).toEqual({ from: 'now-45m', to: 'now' });
    expect(timeRangeToExpressionRange('bad-range')).toBeNull();
  });

  it('maps UI time windows to platform timeRange values in the shared model', () => {
    expect(timeWindowToTimeRange('30m')).toBe('last-30m');
    expect(timeWindowToTimeRange('1h')).toBe('last-1h');
    expect(timeWindowToTimeRange('1W')).toBe('last-1w');
    expect(timeWindowToTimeRange('last-4w')).toBe('last-4w');
    expect(timeWindowToTimeRange('last-45m')).toBe('last-45m');
    expect(timeWindowToTimeRange('bad-window')).toBeUndefined();
    expect(timeWindowToTimeRange(undefined)).toBeUndefined();

    expect(timeRangeToTimeWindow('last-30m')).toBe('30m');
    expect(timeRangeToTimeWindow('last-1w')).toBe('1W');
    expect(timeRangeToTimeWindow('last-4w')).toBe('4W');
    expect(timeRangeToTimeWindow('last-45m')).toBe('45m');
    expect(timeRangeToTimeWindow('bad-range')).toBeNull();
    expect(timeRangeToTimeWindow(undefined)).toBeNull();
  });

  it('maps refresh interval controls to shared refresh/live route context', () => {
    expect(resolveTimeContextRefreshInterval({ refresh: '10' })).toBe(10);
    expect(resolveTimeContextRefreshInterval({ refresh: '60' })).toBe(60);
    expect(resolveTimeContextRefreshInterval({ refresh: '60', live: 'false' })).toBe(-1);
    expect(resolveTimeContextRefreshInterval({ refresh: 'off' })).toBe(-1);
    expect(resolveTimeContextRefreshInterval({ refresh: 'manual' })).toBe(-1);
    expect(resolveTimeContextRefreshInterval({ refresh: 'false' })).toBe(-1);
    expect(resolveTimeContextRefreshInterval({ refresh: '7' })).toBe(30);
    expect(resolveTimeContextRefreshInterval({})).toBe(30);
    expect(parseTimeContextFromParams(new URLSearchParams('refresh=off'))).toEqual({ refresh: 'off' });
    expect(parseTimeContextFromParams(new URLSearchParams('refresh=manual'))).toEqual({ refresh: 'manual' });

    expect(timeContextRefreshIntervalToContext(60)).toEqual({ refresh: '60', live: undefined });
    expect(timeContextRefreshIntervalToContext(-1)).toEqual({ refresh: undefined, live: 'false' });
    expect(timeContextRefreshIntervalToContext(0)).toEqual({ refresh: undefined, live: 'false' });
    expect(timeContextRefreshIntervalToContext(7)).toEqual({ refresh: undefined, live: undefined });
  });

  it('parses and appends expression time range from/to/timezone URL parameters for shared observability links', () => {
    const now = Date.UTC(2026, 4, 17, 8, 12, 57);
    const parsed = parseExpressionTimeRangeFromParams(
      new URLSearchParams('to=now&from=now-6h&timezone=Asia%2FShanghai'),
      now
    );

    expect(parsed).toEqual({
      kind: 'relative',
      from: 'now-6h',
      to: 'now',
      start: String(Date.UTC(2026, 4, 17, 2, 12, 57)),
      end: String(now),
      timezone: 'Asia/Shanghai'
    });

    const params = new URLSearchParams();
    appendExpressionTimeRangeParams(params, parsed!);
    expect(params.toString()).toBe('from=now-6h&to=now&timezone=Asia%2FShanghai');
  });

  it('preserves expression from/to in state but lets them own the standard platform URL contract', () => {
    const now = Date.UTC(2026, 4, 17, 8, 12, 57);
    const parsed = parseTimeContextFromParams(
      new URLSearchParams('timeRange=last-1h&from=now-6h&to=now&timezone=Asia%2FShanghai&refresh=30&live=1')
    );

    expect(parsed).toEqual({
      timeRange: 'last-1h',
      from: 'now-6h',
      to: 'now',
      refresh: '30',
      live: 'true',
      tz: 'Asia/Shanghai',
      timezone: 'Asia/Shanghai'
    });
    expect(resolveTimeContextBounds(parsed, now)).toEqual({
      start: String(Date.UTC(2026, 4, 17, 2, 12, 57)),
      end: String(now)
    });
    expect(sanitizeTimeContext({ from: 'not-a-time', to: 'now', timezone: 'bad<script>' })).toEqual({});

    const params = new URLSearchParams();
    appendTimeContextParams(params, parsed);
    expect(params.toString()).toBe('from=now-6h&to=now&refresh=30&live=true&timezone=Asia%2FShanghai');
  });

  it('treats paused live mode as the canonical manual refresh state in shared time context routes', () => {
    const parsed = parseTimeContextFromParams(
      new URLSearchParams('from=now-1h&to=now&refresh=60&live=false&timezone=Asia%2FShanghai')
    );

    expect(parsed).toEqual({
      from: 'now-1h',
      to: 'now',
      live: 'false',
      tz: 'Asia/Shanghai',
      timezone: 'Asia/Shanghai'
    });
    expect(sanitizeTimeContext({ from: 'now-1h', to: 'now', refresh: '60', live: 'false' })).toEqual({
      from: 'now-1h',
      to: 'now',
      live: 'false'
    });

    const params = new URLSearchParams();
    appendTimeContextParams(params, parsed);
    expect(params.toString()).toBe('from=now-1h&to=now&live=false&timezone=Asia%2FShanghai');
  });

  it('bridges expression timezone URLs to the toolbar tz field without duplicating route params', () => {
    const parsed = parseTimeContextFromParams(
      new URLSearchParams('from=now-1h&to=now&timezone=Asia%2FShanghai')
    );

    expect(parsed).toEqual({
      from: 'now-1h',
      to: 'now',
      tz: 'Asia/Shanghai',
      timezone: 'Asia/Shanghai'
    });

    const params = new URLSearchParams();
    appendTimeContextParams(params, parsed);
    expect(params.toString()).toBe('from=now-1h&to=now&timezone=Asia%2FShanghai');
  });

  it('writes toolbar tz selections back to expression routes as timezone', () => {
    const params = new URLSearchParams();
    appendTimeContextParams(params, {
      from: 'now-1h',
      to: 'now',
      tz: 'Asia/Shanghai'
    });

    expect(params.toString()).toBe('from=now-1h&to=now&timezone=Asia%2FShanghai');
  });

  it('keeps toolbar tz selections visible as timezone in applied expression context state', () => {
    const now = Date.UTC(2026, 4, 17, 8, 12, 57);

    expect(
      resolveAppliedTimeContext(
        {
          from: 'now-1h',
          to: 'now',
          tz: 'Asia/Shanghai'
        },
        {},
        'last-1h',
        now
      )
    ).toEqual({
      timeRange: 'last-1h',
      from: 'now-1h',
      to: 'now',
      start: String(Date.UTC(2026, 4, 17, 7, 12, 57)),
      end: String(now),
      tz: 'Asia/Shanghai',
      timezone: 'Asia/Shanghai'
    });
  });

  it('keeps expression route URLs free of duplicate preset and derived epoch bounds', () => {
    const params = new URLSearchParams();
    appendTimeContextParams(params, {
      timeRange: 'last-1h',
      from: 'now-1h',
      to: 'now',
      start: String(Date.UTC(2026, 4, 17, 7, 12, 57)),
      end: String(Date.UTC(2026, 4, 17, 8, 12, 57)),
      refresh: '30',
      timezone: 'Asia/Shanghai'
    });

    expect(params.toString()).toBe('from=now-1h&to=now&refresh=30&timezone=Asia%2FShanghai');
  });

  it('lets explicit absolute chart zoom windows override fallback expression ranges', () => {
    const now = Date.UTC(2026, 4, 17, 8, 12, 57);

    expect(
      resolveAppliedTimeContext(
        {
          timeRange: 'last-1h',
          start: String(Date.UTC(2026, 4, 17, 7, 30, 0)),
          end: String(Date.UTC(2026, 4, 17, 7, 45, 0))
        },
        {
          timeRange: 'last-1h',
          from: 'now-1h',
          to: 'now',
          refresh: '30',
          timezone: 'Asia/Shanghai'
        },
        'last-1h',
        now
      )
    ).toEqual({
      timeRange: 'last-1h',
      start: String(Date.UTC(2026, 4, 17, 7, 30, 0)),
      end: String(Date.UTC(2026, 4, 17, 7, 45, 0)),
      refresh: '30',
      tz: 'Asia/Shanghai',
      timezone: 'Asia/Shanghai'
    });
  });

  it('compares applied time ranges through the shared platform model instead of monitor-local helpers', () => {
    expect(
      isSameTimeContextRange(
        { from: '2026-05-17 15:30:00', to: '2026-05-17 16:30:00', tz: 'Asia/Shanghai' },
        { from: '2026-05-17 15:30:00', to: '2026-05-17 16:30:00', timezone: 'Asia/Shanghai', refresh: '60' }
      )
    ).toBe(true);

    expect(
      isSameTimeContextRange(
        { start: '1713199100000', end: '1713202700000', live: 'false' },
        { start: '1713199100000', end: '1713202700000', refresh: '30', live: 'false' }
      )
    ).toBe(true);

    expect(
      isSameTimeContextRange(
        { from: '2026-05-17 15:30:00', to: '2026-05-17 16:30:00', timezone: 'UTC' },
        { from: '2026-05-17 15:30:00', to: '2026-05-17 16:30:00', timezone: 'Asia/Shanghai' }
      )
    ).toBe(false);
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
    const first = new Date(2026, 4, 17, 15, 0, 0).getTime();
    const middle = new Date(2026, 4, 17, 16, 0, 0).getTime();
    const last = new Date(2026, 4, 17, 17, 0, 0).getTime();

    expect(buildChartDataZoomTimeContext([first, middle, last], { start: 25, end: 75 }, 'last-1h')).toEqual({
      timeRange: 'last-1h',
      from: '2026-05-17 15:30:00',
      to: '2026-05-17 16:30:00'
    });

    expect(buildChartDataZoomTimeContext([first, middle, last], { startValue: first + 15 * 60 * 1000, endValue: last - 15 * 60 * 1000 }, 'last-1h')).toEqual({
      timeRange: 'last-1h',
      from: '2026-05-17 15:15:00',
      to: '2026-05-17 16:45:00'
    });

    expect(buildChartDataZoomTimeContext([first, middle, last], { start: 0, end: 100 }, 'last-1h')).toBeNull();
    expect(buildChartDataZoomTimeContext([first, middle, last], { start: 0, end: 100, startValue: first, endValue: last }, 'last-1h')).toBeNull();
  });

  it('represents chart dataZoom windows as readable absolute expressions instead of epoch route fields', () => {
    const first = new Date(2026, 4, 17, 15, 0, 0).getTime();
    const middle = new Date(2026, 4, 17, 16, 0, 0).getTime();
    const last = new Date(2026, 4, 17, 17, 0, 0).getTime();

    expect(buildChartDataZoomTimeContext([first, middle, last], { start: 25, end: 75 }, 'last-1h')).toEqual({
      timeRange: 'last-1h',
      from: '2026-05-17 15:30:00',
      to: '2026-05-17 16:30:00'
    });
  });

  it('fills missing evidence links with an event-centered window while preserving manual live mode and timezone', () => {
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
