export const TIME_CONTEXT_PRESETS = [
  { value: 'last-30m', durationMs: 30 * 60 * 1000 },
  { value: 'last-1h', durationMs: 60 * 60 * 1000 },
  { value: 'last-6h', durationMs: 6 * 60 * 60 * 1000 },
  { value: 'last-1d', durationMs: 24 * 60 * 60 * 1000 },
  { value: 'last-1w', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { value: 'last-4w', durationMs: 28 * 24 * 60 * 60 * 1000 },
  { value: 'last-12w', durationMs: 84 * 24 * 60 * 60 * 1000 }
] as const;

export const TIME_CONTEXT_QUERY_KEYS = ['timeRange', 'from', 'to', 'start', 'end', 'refresh', 'live', 'tz', 'timezone'] as const;
export const MAX_TIME_CONTEXT_WINDOW_MS = 84 * 24 * 60 * 60 * 1000;
export const TIME_CONTEXT_REFRESH_INTERVAL_SECONDS = [10, 30, 60, 300] as const;
export const MANUAL_TIME_CONTEXT_REFRESH_INTERVAL = -1;

export type TimeContextQueryKey = (typeof TIME_CONTEXT_QUERY_KEYS)[number];
export type TimeContextPreset = (typeof TIME_CONTEXT_PRESETS)[number]['value'];
export type TimeContextRefreshInterval = (typeof TIME_CONTEXT_REFRESH_INTERVAL_SECONDS)[number];
export type TimeContext = Partial<Record<TimeContextQueryKey, string>>;
export type ExpressionTimeRangeKind = 'relative' | 'absolute' | 'semi-relative';
export type ExpressionTimeRangeInput = {
  from?: string | null;
  to?: string | null;
};
export type ExpressionTimeRangeModel = {
  kind: ExpressionTimeRangeKind;
  from: string;
  to: string;
  start: string;
  end: string;
  timezone?: string;
};
export type ChartDataZoomRange = {
  start?: number;
  end?: number;
  startValue?: number | string;
  endValue?: number | string;
};
export type EventWindowTimeContextSource = {
  eventStart?: number | string | null;
  eventEnd?: number | string | null;
  bufferMs?: number;
  fallbackTimeRange?: string;
};

export type SearchParamReader = {
  get: (name: string) => string | null;
};

const PRESET_BY_VALUE = new Map<string, (typeof TIME_CONTEXT_PRESETS)[number]>(
  TIME_CONTEXT_PRESETS.map(preset => [preset.value, preset])
);
const RELATIVE_RANGE_PATTERN = /^last-(\d+)(m|h|d|w)$/;
const DATE_MATH_TOKEN_PATTERN = /([+-]\d+(?:ms|s|m|h|d|w|M|Q|y)|\/(?:s|m|h|d|w|M|Q|y|fQ|fy))/g;
const RELATIVE_UNIT_TO_MS: Record<string, number> = {
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000
};
const DEFAULT_EVENT_WINDOW_BUFFER_MS = 15 * 60 * 1000;

function normalizeText(value: string | null | undefined) {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function toFiniteTime(value: number | string | null | undefined) {
  if (value == null || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric)) return numeric;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function padDateTimePart(value: number, length = 2) {
  return String(value).padStart(length, '0');
}

function formatAbsoluteDateTimeLocal(timestamp: number) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${padDateTimePart(date.getMonth() + 1)}-${padDateTimePart(date.getDate())} ${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}:${padDateTimePart(date.getSeconds())}`;
}

function parseAbsoluteDateTimeLocal(value: string) {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour = '0', minute = '0', second = '0', millisecond = '0'] = match;
  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millisecond.padEnd(3, '0'))
  ).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function addDateMathUnit(timestamp: number, amount: number, unit: string) {
  const date = new Date(timestamp);
  if (unit === 'ms') return timestamp + amount;
  if (unit === 's') return timestamp + amount * 1000;
  if (unit === 'm') return timestamp + amount * 60 * 1000;
  if (unit === 'h') return timestamp + amount * 60 * 60 * 1000;
  if (unit === 'd') return timestamp + amount * 24 * 60 * 60 * 1000;
  if (unit === 'w') return timestamp + amount * 7 * 24 * 60 * 60 * 1000;
  if (unit === 'M') {
    date.setUTCMonth(date.getUTCMonth() + amount);
    return date.getTime();
  }
  if (unit === 'Q') {
    date.setUTCMonth(date.getUTCMonth() + amount * 3);
    return date.getTime();
  }
  if (unit === 'y') {
    date.setUTCFullYear(date.getUTCFullYear() + amount);
    return date.getTime();
  }
  return undefined;
}

function roundDateMathUnit(timestamp: number, unit: string) {
  const date = new Date(timestamp);
  if (unit === 's') date.setUTCMilliseconds(0);
  if (unit === 'm') date.setUTCSeconds(0, 0);
  if (unit === 'h') date.setUTCMinutes(0, 0, 0);
  if (unit === 'd') date.setUTCHours(0, 0, 0, 0);
  if (unit === 'w') {
    const day = date.getUTCDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    date.setUTCHours(0, 0, 0, 0);
  }
  if (unit === 'M') {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  }
  if (unit === 'Q' || unit === 'fQ') {
    const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
    date.setUTCMonth(quarterStartMonth, 1);
    date.setUTCHours(0, 0, 0, 0);
  }
  if (unit === 'y' || unit === 'fy') {
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }
  return date.getTime();
}

export function parseDateMathExpression(value: string | null | undefined, now = Date.now()) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const absolute = parseAbsoluteDateTimeLocal(trimmed);
  if (absolute != null) return absolute;

  if (!trimmed.startsWith('now')) return undefined;
  let cursor = 3;
  let timestamp = now;

  while (cursor < trimmed.length) {
    DATE_MATH_TOKEN_PATTERN.lastIndex = cursor;
    const match = DATE_MATH_TOKEN_PATTERN.exec(trimmed);
    if (!match || match.index !== cursor) return undefined;
    const token = match[1];
    if (token.startsWith('/')) {
      timestamp = roundDateMathUnit(timestamp, token.slice(1));
    } else {
      const operation = /^([+-])(\d+)(ms|s|m|h|d|w|M|Q|y)$/.exec(token);
      if (!operation) return undefined;
      const [, sign, amount, unit] = operation;
      const nextTimestamp = addDateMathUnit(timestamp, Number(amount) * (sign === '-' ? -1 : 1), unit);
      if (nextTimestamp == null) return undefined;
      timestamp = nextTimestamp;
    }
    cursor = DATE_MATH_TOKEN_PATTERN.lastIndex;
  }

  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function classifyExpressionTimeRange(from: string, to: string): ExpressionTimeRangeKind {
  const fromRelative = from.startsWith('now');
  const toRelative = to.startsWith('now');
  if (fromRelative && toRelative) return 'relative';
  if (!fromRelative && !toRelative) return 'absolute';
  return 'semi-relative';
}

export function timeRangeToExpressionRange(value: string | null | undefined): ExpressionTimeRangeInput | null {
  const timeRange = readTimeRangeParam(value);
  const match = timeRange ? RELATIVE_RANGE_PATTERN.exec(timeRange) : null;
  if (!match) return null;
  return {
    from: `now-${match[1]}${match[2]}`,
    to: 'now'
  };
}

export function timeWindowToTimeRange(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  const candidate = trimmed.startsWith('last-') ? trimmed.toLowerCase() : `last-${trimmed.toLowerCase()}`;
  return readTimeRangeParam(candidate);
}

export function timeRangeToTimeWindow(value: string | null | undefined) {
  const timeRange = readTimeRangeParam(normalizeText(value)?.toLowerCase());
  if (!timeRange) return null;
  const normalized = timeRange.replace(/^last-/, '');
  return normalized.endsWith('w') ? normalized.replace('w', 'W') : normalized;
}

function hasRefreshInterval(value: number, intervals: readonly number[]) {
  return intervals.includes(value);
}

export function resolveTimeContextRefreshInterval(
  context: Pick<TimeContext, 'refresh' | 'live'>,
  intervals: readonly number[] = TIME_CONTEXT_REFRESH_INTERVAL_SECONDS,
  defaultInterval: number = 30
) {
  if (context.live === 'false') return MANUAL_TIME_CONTEXT_REFRESH_INTERVAL;
  const value = Number(context.refresh);
  return hasRefreshInterval(value, intervals) ? value : defaultInterval;
}

export function timeContextRefreshIntervalToContext(
  value: number,
  intervals: readonly number[] = TIME_CONTEXT_REFRESH_INTERVAL_SECONDS
): TimeContext {
  if (value <= 0) {
    return { refresh: undefined, live: 'false' };
  }
  if (hasRefreshInterval(value, intervals)) {
    return { refresh: String(value), live: undefined };
  }
  return { refresh: undefined, live: undefined };
}

export function resolveExpressionTimeRange(input: ExpressionTimeRangeInput, now = Date.now()): ExpressionTimeRangeModel | null {
  const from = normalizeText(input.from);
  const to = normalizeText(input.to);
  if (!from || !to) return null;

  const start = parseDateMathExpression(from, now);
  const end = parseDateMathExpression(to, now);
  if (start == null || end == null || end < start || end - start > MAX_TIME_CONTEXT_WINDOW_MS) return null;

  return {
    kind: classifyExpressionTimeRange(from, to),
    from,
    to,
    start: String(start),
    end: String(end)
  };
}

export function parseExpressionTimeRangeFromParams(searchParams: SearchParamReader, now = Date.now()): ExpressionTimeRangeModel | null {
  const resolved = resolveExpressionTimeRange(
    {
      from: searchParams.get('from'),
      to: searchParams.get('to')
    },
    now
  );
  if (!resolved) return null;

  const timezone = readTimezoneParam(searchParams.get('timezone'));
  return {
    ...resolved,
    ...(timezone ? { timezone } : {})
  };
}

export function appendExpressionTimeRangeParams(params: URLSearchParams, model: ExpressionTimeRangeModel) {
  params.set('from', model.from);
  params.set('to', model.to);
  if (model.timezone) {
    params.set('timezone', model.timezone);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function readEpochMillisTimeParam(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  return /^\d+$/.test(trimmed) ? trimmed : undefined;
}

export function readTimeRangeParam(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  if (PRESET_BY_VALUE.has(trimmed)) return trimmed;
  const durationMs = readRelativeTimeRangeDurationMs(trimmed);
  return durationMs ? trimmed : undefined;
}

export function readRelativeTimeRangeDurationMs(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  const match = RELATIVE_RANGE_PATTERN.exec(trimmed);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs = RELATIVE_UNIT_TO_MS[unit];
  const durationMs = amount * unitMs;
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_TIME_CONTEXT_WINDOW_MS) return undefined;
  return durationMs;
}

export function readRefreshSecondsParam(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const seconds = Number(trimmed);
  return seconds > 0 && seconds <= 86_400 ? trimmed : undefined;
}

export function readLiveParam(value: string | null | undefined) {
  const trimmed = normalizeText(value)?.toLowerCase();
  if (!trimmed) return undefined;
  if (trimmed === 'true' || trimmed === '1') return 'true';
  if (trimmed === 'false' || trimmed === '0') return 'false';
  return undefined;
}

export function readTimezoneParam(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  if (trimmed.length > 64) return undefined;
  if (trimmed === 'UTC') return trimmed;
  return /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){1,3}$/.test(trimmed) ? trimmed : undefined;
}

export function readExpressionTimeParam(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  if (trimmed.length > 128 || /[<>\u0000-\u001F]/.test(trimmed)) return undefined;
  return parseDateMathExpression(trimmed, Date.UTC(2026, 0, 1, 0, 0, 0)) == null ? undefined : trimmed;
}

export function readStepParam(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  if (!/^\d+(ms|s|m|h|d)$/.test(trimmed)) return undefined;
  return Number.parseInt(trimmed, 10) > 0 ? trimmed : undefined;
}

export function normalizeTimeContextValue(key: TimeContextQueryKey, value: string | null | undefined) {
  if (key === 'timeRange') return readTimeRangeParam(value);
  if (key === 'from' || key === 'to') return readExpressionTimeParam(value);
  if (key === 'start' || key === 'end') return readEpochMillisTimeParam(value);
  if (key === 'refresh') return readRefreshSecondsParam(value);
  if (key === 'live') return readLiveParam(value);
  return readTimezoneParam(value);
}

export function sanitizeTimeContext(context: TimeContext): TimeContext {
  const sanitized: TimeContext = {};
  TIME_CONTEXT_QUERY_KEYS.forEach(key => {
    const value = normalizeTimeContextValue(key, context[key]);
    if (value) {
      sanitized[key] = value;
    }
  });
  if (sanitized.timezone && !sanitized.tz) {
    sanitized.tz = sanitized.timezone;
  }
  if (sanitized.tz && !sanitized.timezone && context.timezone != null) {
    sanitized.timezone = sanitized.tz;
  }
  if (sanitized.live === 'false') {
    delete sanitized.refresh;
  }
  if ((sanitized.from && !sanitized.to) || (!sanitized.from && sanitized.to)) {
    delete sanitized.from;
    delete sanitized.to;
  }
  if (sanitized.from && sanitized.to && !resolveExpressionTimeRange({ from: sanitized.from, to: sanitized.to })) {
    delete sanitized.from;
    delete sanitized.to;
  }
  if (sanitized.from && sanitized.to && sanitized.tz && !sanitized.timezone) {
    sanitized.timezone = sanitized.tz;
  }
  return sanitized;
}

export function parseTimeContextFromParams(searchParams: SearchParamReader): TimeContext {
  const context: TimeContext = {};
  TIME_CONTEXT_QUERY_KEYS.forEach(key => {
    const value = normalizeTimeContextValue(key, searchParams.get(key));
    if (value) {
      context[key] = value;
    }
  });
  return sanitizeTimeContext(context);
}

export function appendTimeContextParams(params: URLSearchParams, context: TimeContext) {
  const sanitized = sanitizeTimeContext(context);
  const expressionOwnsRoute = Boolean(sanitized.from && sanitized.to);
  TIME_CONTEXT_QUERY_KEYS.forEach(key => {
    const value = sanitized[key];
    if (expressionOwnsRoute && key === 'timeRange') {
      return;
    }
    if (expressionOwnsRoute && (key === 'start' || key === 'end')) {
      return;
    }
    if (expressionOwnsRoute && key === 'tz' && value && !sanitized.timezone) {
      params.set('timezone', value);
      return;
    }
    if (key === 'tz' && sanitized.timezone === value) {
      return;
    }
    if (value) {
      params.set(key, value);
    }
  });
}

export function resolveTimeContextBounds(context: TimeContext, now = Date.now()) {
  const sanitized = sanitizeTimeContext(context);
  if (sanitized.from && sanitized.to) {
    const resolved = resolveExpressionTimeRange({ from: sanitized.from, to: sanitized.to }, now);
    if (!resolved) return null;
    return { start: resolved.start, end: resolved.end };
  }
  if (sanitized.start && sanitized.end) {
    const start = Number(sanitized.start);
    const end = Number(sanitized.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > MAX_TIME_CONTEXT_WINDOW_MS) {
      return null;
    }
    return { start: sanitized.start, end: sanitized.end };
  }
  const preset = sanitized.timeRange ? PRESET_BY_VALUE.get(sanitized.timeRange) : undefined;
  const durationMs = preset?.durationMs ?? readRelativeTimeRangeDurationMs(sanitized.timeRange);
  if (!durationMs) return null;
  return {
    start: String(now - durationMs),
    end: String(now)
  };
}

function readTimeContextTimezone(context: TimeContext) {
  return context.timezone || context.tz || '';
}

export function isSameTimeContextRange(left: TimeContext | null | undefined, right: TimeContext | null | undefined) {
  if (!left || !right) return false;
  const leftContext = sanitizeTimeContext(left);
  const rightContext = sanitizeTimeContext(right);
  if (leftContext.from && leftContext.to && rightContext.from && rightContext.to) {
    return (
      leftContext.from === rightContext.from &&
      leftContext.to === rightContext.to &&
      readTimeContextTimezone(leftContext) === readTimeContextTimezone(rightContext)
    );
  }
  if (leftContext.start && leftContext.end && rightContext.start && rightContext.end) {
    return leftContext.start === rightContext.start && leftContext.end === rightContext.end;
  }
  return false;
}

export function resolveAppliedTimeContext(
  context: TimeContext,
  fallback: TimeContext = {},
  defaultTimeRange: TimeContextPreset = 'last-30m',
  now = Date.now()
): TimeContext {
  const merged: TimeContext = {
    timeRange: defaultTimeRange,
    ...fallback,
    ...context
  };
  if (context.start && context.end && !context.from && !context.to) {
    delete merged.from;
    delete merged.to;
  }
  const sanitized = sanitizeTimeContext(merged);
  const bounds = resolveTimeContextBounds(sanitized, now);

  return sanitizeTimeContext({
    ...sanitized,
    start: bounds?.start,
    end: bounds?.end
  });
}

export function buildChartDataZoomTimeContext(
  timestamps: Array<number | string | null | undefined>,
  zoomRange: ChartDataZoomRange | null | undefined,
  fallbackTimeRange?: string
): TimeContext | null {
  if (!zoomRange) return null;

  const times = timestamps
    .map(toFiniteTime)
    .filter((value): value is number => value != null)
    .sort((left, right) => left - right);
  if (times.length < 2) return null;

  const firstTime = times[0];
  const lastTime = times[times.length - 1];
  const span = lastTime - firstTime;
  if (!Number.isFinite(span) || span <= 0) return null;

  const explicitStart = toFiniteTime(zoomRange.startValue);
  const explicitEnd = toFiniteTime(zoomRange.endValue);
  const hasExplicitBounds = explicitStart != null && explicitEnd != null;
  const startPercent = typeof zoomRange.start === 'number' ? clamp(zoomRange.start, 0, 100) : 0;
  const endPercent = typeof zoomRange.end === 'number' ? clamp(zoomRange.end, 0, 100) : 100;

  if (!hasExplicitBounds && startPercent <= 0 && endPercent >= 100) return null;
  if (hasExplicitBounds && explicitStart <= firstTime && explicitEnd >= lastTime) return null;

  const start = Math.round(clamp(hasExplicitBounds ? explicitStart : firstTime + span * (startPercent / 100), firstTime, lastTime));
  const end = Math.round(clamp(hasExplicitBounds ? explicitEnd : firstTime + span * (endPercent / 100), firstTime, lastTime));
  if (end <= start) return null;
  const from = formatAbsoluteDateTimeLocal(start);
  const to = formatAbsoluteDateTimeLocal(end);
  if (!from || !to) return null;

  return sanitizeTimeContext({
    timeRange: fallbackTimeRange,
    from,
    to
  });
}

export function buildEventWindowTimeContext(context: TimeContext, source: EventWindowTimeContextSource = {}): TimeContext {
  const sanitized = sanitizeTimeContext(context);
  if (sanitized.start && sanitized.end && resolveTimeContextBounds(sanitized)) {
    return sanitized;
  }

  const eventStart = toFiniteTime(source.eventStart);
  const eventEnd = toFiniteTime(source.eventEnd) ?? eventStart;
  if (eventStart == null || eventEnd == null) {
    return sanitized;
  }

  const normalizedBuffer = typeof source.bufferMs === 'number' && Number.isFinite(source.bufferMs) && source.bufferMs >= 0
    ? Math.min(source.bufferMs, MAX_TIME_CONTEXT_WINDOW_MS / 2)
    : DEFAULT_EVENT_WINDOW_BUFFER_MS;
  const rangeStart = Math.min(eventStart, eventEnd);
  const rangeEnd = Math.max(eventStart, eventEnd);
  const start = Math.max(0, Math.round(rangeStart - normalizedBuffer));
  const end = Math.round(rangeEnd + normalizedBuffer);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_TIME_CONTEXT_WINDOW_MS) {
    return sanitized;
  }

  return sanitizeTimeContext({
    timeRange: source.fallbackTimeRange,
    ...sanitized,
    start: String(start),
    end: String(end)
  });
}
