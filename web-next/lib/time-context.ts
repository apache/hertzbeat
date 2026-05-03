export const TIME_CONTEXT_PRESETS = [
  { value: 'last-30m', label: '近 30 分钟', durationMs: 30 * 60 * 1000 },
  { value: 'last-1h', label: '近 1 小时', durationMs: 60 * 60 * 1000 },
  { value: 'last-6h', label: '近 6 小时', durationMs: 6 * 60 * 60 * 1000 },
  { value: 'last-1d', label: '近 1 天', durationMs: 24 * 60 * 60 * 1000 },
  { value: 'last-1w', label: '近 1 周', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { value: 'last-4w', label: '近 4 周', durationMs: 28 * 24 * 60 * 60 * 1000 },
  { value: 'last-12w', label: '近 12 周', durationMs: 84 * 24 * 60 * 60 * 1000 }
] as const;

export const TIME_CONTEXT_QUERY_KEYS = ['timeRange', 'start', 'end', 'refresh', 'live', 'tz'] as const;
export const MAX_TIME_CONTEXT_WINDOW_MS = 84 * 24 * 60 * 60 * 1000;

export type TimeContextQueryKey = (typeof TIME_CONTEXT_QUERY_KEYS)[number];
export type TimeContextPreset = (typeof TIME_CONTEXT_PRESETS)[number]['value'];
export type TimeContext = Partial<Record<TimeContextQueryKey, string>>;
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

export function readStepParam(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  if (!trimmed) return undefined;
  if (!/^\d+(ms|s|m|h|d)$/.test(trimmed)) return undefined;
  return Number.parseInt(trimmed, 10) > 0 ? trimmed : undefined;
}

export function normalizeTimeContextValue(key: TimeContextQueryKey, value: string | null | undefined) {
  if (key === 'timeRange') return readTimeRangeParam(value);
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
  return context;
}

export function appendTimeContextParams(params: URLSearchParams, context: TimeContext) {
  const sanitized = sanitizeTimeContext(context);
  TIME_CONTEXT_QUERY_KEYS.forEach(key => {
    const value = sanitized[key];
    if (value) {
      params.set(key, value);
    }
  });
}

export function resolveTimeContextBounds(context: TimeContext, now = Date.now()) {
  const sanitized = sanitizeTimeContext(context);
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

export function resolveAppliedTimeContext(
  context: TimeContext,
  fallback: TimeContext = {},
  defaultTimeRange: TimeContextPreset = 'last-30m',
  now = Date.now()
): TimeContext {
  const sanitized = sanitizeTimeContext({
    timeRange: defaultTimeRange,
    ...fallback,
    ...context
  });
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

  return sanitizeTimeContext({
    timeRange: fallbackTimeRange,
    start: String(start),
    end: String(end)
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
