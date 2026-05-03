import { normalizeTimeContextValue } from './time-context';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type SearchParamReader = {
  get: (name: string) => string | null;
};

export const SIGNAL_ROUTE_CONTEXT_PARAM_KEYS = [
  'start',
  'end',
  'timeRange',
  'refresh',
  'live',
  'tz',
  'entityId',
  'entityName',
  'returnTo',
  'serviceName',
  'serviceNamespace',
  'environment',
  'monitorId',
  'monitorName',
  'monitorApp',
  'monitorInstance',
  'traceId',
  'spanId',
  'source',
  'collector',
  'template',
  'codeRepo',
  'codeProvider',
  'codePath',
  'codeSearch',
  'codeLabel'
] as const;

export type SignalRouteContextKey = (typeof SIGNAL_ROUTE_CONTEXT_PARAM_KEYS)[number];

export type SignalRouteContext = Partial<Record<SignalRouteContextKey, string>>;

function normalizeValue(value: string | null | undefined) {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function readEpochMillisRouteParam(value: string | null | undefined) {
  const trimmed = normalizeValue(value);
  if (!trimmed) return undefined;
  return /^\d+$/.test(trimmed) ? trimmed : undefined;
}

export function readEntityIdRouteParam(value: string | null | undefined) {
  const trimmed = normalizeValue(value);
  if (!trimmed) return undefined;
  return /^\d+\.\d+$/.test(trimmed) ? undefined : trimmed;
}

function normalizeContextValue(key: SignalRouteContextKey, value: string | null | undefined) {
  if (key === 'returnTo') return stripReturnLabelFromHref(value);
  if (key === 'timeRange' || key === 'start' || key === 'end' || key === 'refresh' || key === 'live' || key === 'tz') {
    return normalizeTimeContextValue(key, value);
  }
  if (key === 'entityId') return readEntityIdRouteParam(value);
  if (key === 'monitorId') return readEntityIdRouteParam(value);
  return normalizeValue(value);
}

export function appendSignalRouteContext(nextParams: URLSearchParams, context: SignalRouteContext) {
  SIGNAL_ROUTE_CONTEXT_PARAM_KEYS.forEach(key => {
    const value = normalizeContextValue(key, context[key]);
    if (value) {
      nextParams.set(key, value);
    }
  });
}

export function readSignalRouteContext(searchParams: SearchParamReader): SignalRouteContext {
  const nextContext: SignalRouteContext = {};
  SIGNAL_ROUTE_CONTEXT_PARAM_KEYS.forEach(key => {
    const value = normalizeContextValue(key, searchParams.get(key));
    if (value) {
      nextContext[key] = value;
    }
  });
  return nextContext;
}

export function copySignalRouteContextParams(searchParams: SearchParamReader, nextParams: URLSearchParams) {
  appendSignalRouteContext(nextParams, readSignalRouteContext(searchParams));
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => normalizeValue(value) != null);
}

function translate(t: Translator | undefined, key: string, fallback: string, params?: Record<string, string | number | null | undefined>) {
  if (!t) return fallback;
  const translated = t(key, params);
  return translated && translated !== key ? translated : fallback;
}

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function buildSourceContextRow(source: string, sourceMeta: string, t?: Translator): SignalEntityContextRow {
  const normalizedSource = source.trim().toLowerCase();
  const label = translate(t, 'signal.context.source.label', '采集来源');

  if (normalizedSource === 'alert' || normalizedSource.startsWith('alert:')) {
    return {
      label,
      value: translate(t, 'signal.context.source.alert.value', '告警事件'),
      meta: sourceMeta || translate(t, 'signal.context.source.alert.meta', '告警证据上下文')
    };
  }

  if (normalizedSource === 'topology' || normalizedSource.startsWith('topology:')) {
    const topologySource = normalizedSource.slice('topology:'.length);
    const topologyMeta =
      topologySource === 'otlp-trace-call'
        ? translate(t, 'signal.context.source.topology.otlp-trace-call', 'OTLP 调用关系')
        : topologySource === 'monitor-ownership'
          ? translate(t, 'signal.context.source.topology.monitor-ownership', '监控对象归属')
          : topologySource === 'template-dependency'
            ? translate(t, 'signal.context.source.topology.template-dependency', '模板依赖')
            : topologySource === 'k8s-workload'
              ? translate(t, 'signal.context.source.topology.k8s-workload', 'K8s 工作负载')
              : topologySource === 'database-middleware-connection'
                ? translate(t, 'signal.context.source.topology.database-middleware-connection', '数据库 / 中间件连接')
                : topologySource === 'cmdb-manual-label'
                  ? translate(t, 'signal.context.source.topology.cmdb-manual-label', 'CMDB / 手工标签')
                  : topologySource === 'alert-impact'
                    ? translate(t, 'signal.context.source.topology.alert-impact', '告警影响面')
                    : undefined;
    return {
      label,
      value: translate(t, 'signal.context.source.topology.value', '拓扑关系'),
      meta: sourceMeta || topologyMeta || translate(t, 'signal.context.source.topology.meta', '拓扑影响面上下文')
    };
  }

  if (normalizedSource === 'monitor') {
    return {
      label,
      value: translate(t, 'signal.context.source.monitor.value', '传统监控'),
      meta: sourceMeta || translate(t, 'signal.context.source.monitor.meta', '监控中心上下文')
    };
  }

  if (normalizedSource === 'otlp') {
    return {
      label,
      value: 'OTLP',
      meta: sourceMeta || translate(t, 'signal.context.source.otlp.meta', 'HertzBeat OTLP 接入')
    };
  }

  return {
    label,
    value: source,
    meta: sourceMeta || translate(t, 'signal.context.source.default.meta', 'HertzBeat 接入')
  };
}

function formatEpochMillisLabel(value: string | undefined, timezone: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return value || '-';
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat('zh-CN', {
      ...(timezone ? { timeZone: timezone } : {}),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return value;
  }
}

function formatLiveState(value: string | undefined, t?: Translator) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0') return translate(t, 'signal.context.time.live.paused', '已暂停');
  if (normalized === 'true' || normalized === '1') return translate(t, 'signal.context.time.live.active', '实时刷新');
  return undefined;
}

function buildTimeContextMeta({
  end,
  live,
  refresh,
  start,
  timezone,
  t
}: {
  end?: string;
  live?: string;
  refresh?: string;
  start?: string;
  timezone?: string;
  t?: Translator;
}) {
  const parts: string[] = [];

  if (start || end) {
    parts.push(`${formatEpochMillisLabel(start, timezone)} → ${formatEpochMillisLabel(end, timezone)}`);
  }
  if (refresh) {
    parts.push(translate(t, 'signal.context.time.refresh', `刷新 ${refresh}${/^\d+$/.test(refresh) ? 's' : ''}`, {
      value: `${refresh}${/^\d+$/.test(refresh) ? 's' : ''}`
    }));
  }
  const liveState = formatLiveState(live, t);
  if (liveState) {
    parts.push(liveState);
  }
  if (timezone) {
    parts.push(timezone);
  }

  return parts.length > 0 ? parts.join(' · ') : translate(t, 'signal.context.time.meta.default', '查询窗口');
}

export function stripReturnLabelFromHref(href: string | null | undefined, depth = 0): string | undefined {
  const trimmed = normalizeValue(href);
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed, 'http://hertzbeat.local');
    if (url.origin !== 'http://hertzbeat.local') return trimmed;
    url.searchParams.delete('returnLabel');
    const nestedReturnTo = url.searchParams.get('returnTo');
    if (nestedReturnTo && depth < 3) {
      url.searchParams.set('returnTo', stripReturnLabelFromHref(nestedReturnTo, depth + 1) || nestedReturnTo);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return trimmed;
  }
}

export function buildSignalEntityHref(context: SignalRouteContext, fallbackSearch?: string) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  const entityId = readEntityIdRouteParam(context.entityId);
  if (entityId) {
    return withQuery(`/entities/${encodeURIComponent(entityId)}`, params);
  }
  const search = normalizeValue(fallbackSearch || context.entityName || context.serviceName);
  if (search) {
    params.set('search', search);
  }
  return withQuery('/entities', params);
}

export function buildSignalAlertRulesHref(signal: 'metrics' | 'logs' | 'traces', context: SignalRouteContext) {
  const params = new URLSearchParams();
  params.set('signal', signal);
  appendSignalRouteContext(params, context);
  return withQuery('/alert/setting', params);
}

export function buildSignalAlertHandlingHref(signal: 'metrics' | 'logs' | 'traces', context: SignalRouteContext) {
  const params = new URLSearchParams();
  params.set('status', 'firing');
  params.set('signal', signal);
  const search = normalizeValue(context.serviceName || context.entityName);
  if (search) {
    params.set('search', search);
  }
  appendSignalRouteContext(params, context);
  return withQuery('/alert', params);
}

export type SignalEntityContextRow = {
  label: string;
  value: string;
  meta: string;
};

export function buildSignalEntityContextRows(
  context: SignalRouteContext,
  fallback: Partial<Pick<SignalRouteContext, 'entityId' | 'entityName' | 'serviceName' | 'serviceNamespace' | 'environment' | 'timeRange' | 'start' | 'end' | 'refresh' | 'live' | 'tz' | 'traceId' | 'spanId' | 'monitorId' | 'monitorName' | 'monitorApp' | 'monitorInstance' | 'source' | 'collector' | 'template'>> = {},
  t?: Translator
): SignalEntityContextRow[] {
  const entityId = readEntityIdRouteParam(firstText(context.entityId, fallback.entityId));
  const entityName = firstText(context.entityName, fallback.entityName, context.serviceName, fallback.serviceName);
  const serviceName = firstText(context.serviceName, fallback.serviceName);
  const serviceNamespace = firstText(context.serviceNamespace, fallback.serviceNamespace);
  const environment = firstText(context.environment, fallback.environment);
  const monitorId = readEntityIdRouteParam(firstText(context.monitorId, fallback.monitorId));
  const monitorName = firstText(context.monitorName, fallback.monitorName);
  const monitorApp = firstText(context.monitorApp, fallback.monitorApp);
  const monitorInstance = firstText(context.monitorInstance, fallback.monitorInstance);
  const timeRange = firstText(context.timeRange, fallback.timeRange);
  const start = firstText(context.start, fallback.start);
  const end = firstText(context.end, fallback.end);
  const refresh = firstText(context.refresh, fallback.refresh);
  const live = firstText(context.live, fallback.live);
  const timezone = firstText(context.tz, fallback.tz);
  const traceId = firstText(context.traceId, fallback.traceId);
  const spanId = firstText(context.spanId, fallback.spanId);
  const source = firstText(context.source, fallback.source) || 'OTLP';
  const collector = firstText(context.collector, fallback.collector);
  const template = firstText(context.template, fallback.template);
  const sourceMeta = [
    collector ? `${translate(t, 'signal.context.collector.prefix', '采集器')} ${collector}` : undefined,
    template ? `${translate(t, 'signal.context.template.prefix', '模板')} ${template}` : undefined
  ]
    .filter(Boolean)
    .join(' · ');

  const rows: SignalEntityContextRow[] = [
    {
      label: translate(t, 'signal.context.entity.label', '当前实体'),
      value: entityName || entityId || '-',
      meta: entityId ? `entityId ${entityId}` : translate(t, 'signal.context.entity.meta', '实体中心')
    }
  ];

  if (monitorId || monitorName || monitorInstance || monitorApp) {
    rows.push({
      label: translate(t, 'signal.context.monitor.label', '监控实例'),
      value: monitorName || monitorInstance || monitorId || '-',
      meta:
        [monitorApp, monitorInstance, monitorId ? `monitorId ${monitorId}` : undefined].filter(Boolean).join(' · ') ||
        translate(t, 'signal.context.monitor.meta', '监控中心')
    });
  }

  rows.push(
    {
      label: translate(t, 'signal.context.service.label', '当前服务'),
      value: serviceName || '-',
      meta: serviceNamespace || translate(t, 'signal.context.service.meta', '服务上下文')
    },
    {
      label: translate(t, 'signal.context.environment.label', '当前环境'),
      value: environment || '-',
      meta: translate(t, 'signal.context.environment.meta', '环境')
    },
    {
      label: translate(t, 'signal.context.time.label', '时间范围'),
      value: timeRange || (start || end ? `${start || '-'} → ${end || '-'}` : translate(t, 'signal.context.time.current-query', '当前查询')),
      meta: buildTimeContextMeta({ end, live, refresh, start, timezone, t })
    }
  );

  rows.push(buildSourceContextRow(source, sourceMeta, t));

  if (traceId || spanId) {
    rows.splice(2, 0, {
      label: translate(t, 'signal.context.trace.label', '链路上下文'),
      value: traceId || '-',
      meta: spanId ? `spanId ${spanId}` : 'traceId'
    });
  }

  return rows;
}
