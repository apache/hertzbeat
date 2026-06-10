import { appendTimeContextParams, normalizeTimeContextValue, sanitizeTimeContext, type TimeContext } from './time-context';
import { interpolate, type TranslationParams } from './i18n';
import { SUPPLEMENTAL_MESSAGES } from './i18n-runtime-messages';

type Translator = (key: string, params?: TranslationParams) => string;

export type SearchParamReader = {
  get: (name: string) => string | null;
};

export const SIGNAL_ROUTE_CONTEXT_PARAM_KEYS = [
  'start',
  'end',
  'from',
  'to',
  'timeRange',
  'refresh',
  'live',
  'tz',
  'timezone',
  'entityId',
  'entityType',
  'entityName',
  'filters',
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
  'operationName',
  'source',
  'collector',
  'template',
  'alertName',
  'alertQuery',
  'alertQueryType',
  'alertExpression',
  'alertDatasource',
  'alertTemplate',
  'panelQuery',
  'panelQueryType',
  'panelExpression',
  'panelDatasource',
  'codeRepo',
  'codeProvider',
  'codePath',
  'codeSearch',
  'codeLabel'
] as const;

export type SignalRouteContextKey = (typeof SIGNAL_ROUTE_CONTEXT_PARAM_KEYS)[number];

export type SignalRouteContext = Partial<Record<SignalRouteContextKey, string>>;

export type SignalPanelEditContext = {
  intent: 'edit-panel';
  dashboardKey?: string;
  panelId?: string;
  draftKey?: string;
  returnTo?: string;
  returnLabel?: string;
};

export type SignalAlertRuleDraftContext = {
  name?: string;
  query?: string;
  queryType?: string;
  expression?: string;
  datasource?: string;
  template?: string;
};

export function buildSignalAlertMatchLabels(signal: string | undefined, context: SignalRouteContext) {
  return [
    ['hertzbeat.signal', signal],
    ['hertzbeat.entity.id', context.entityId],
    ['hertzbeat.entity.type', context.entityType],
    ['service.name', context.serviceName],
    ['service.namespace', context.serviceNamespace],
    ['operation.name', context.operationName],
    ['deployment.environment', context.environment],
    ['trace_id', context.traceId],
    ['span_id', context.spanId],
    ['hertzbeat.source', context.source],
    ['hertzbeat.collector', context.collector],
    ['hertzbeat.template', context.template],
    ['hertzbeat.monitor.id', context.monitorId],
    ['hertzbeat.monitor.app', context.monitorApp],
    ['hertzbeat.monitor.instance', context.monitorInstance],
    ['hertzbeat.alert.datasource', context.alertDatasource],
    ['hertzbeat.alert.query_type', context.alertQueryType],
    ['hertzbeat.alert.template', context.alertTemplate]
  ]
    .map(([key, value]) => {
      const normalizedValue = firstText(value);
      return normalizedValue ? `${key}:${normalizedValue}` : undefined;
    })
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

export function buildSignalAlertGroupKeys(signal: string | undefined, context: SignalRouteContext) {
  return [
    ['hertzbeat.signal', signal],
    ['hertzbeat.entity.id', context.entityId],
    ['hertzbeat.entity.type', context.entityType],
    ['service.name', context.serviceName],
    ['service.namespace', context.serviceNamespace],
    ['operation.name', context.operationName],
    ['deployment.environment', context.environment],
    ['hertzbeat.source', context.source],
    ['hertzbeat.collector', context.collector],
    ['hertzbeat.monitor.app', context.monitorApp],
    ['hertzbeat.alert.datasource', context.alertDatasource],
    ['hertzbeat.alert.query_type', context.alertQueryType]
  ]
    .map(([key, value]) => (firstText(value) ? key : undefined))
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

const SIGNAL_TIME_CONTEXT_PARAM_KEYS = new Set<SignalRouteContextKey>([
  'start',
  'end',
  'from',
  'to',
  'timeRange',
  'refresh',
  'live',
  'tz',
  'timezone'
]);

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
  if (key === 'timeRange' || key === 'start' || key === 'end' || key === 'from' || key === 'to' || key === 'refresh' || key === 'live' || key === 'tz' || key === 'timezone') {
    return normalizeTimeContextValue(key, value);
  }
  if (key === 'entityId') return readEntityIdRouteParam(value);
  if (key === 'monitorId') return readEntityIdRouteParam(value);
  return normalizeValue(value);
}

export function appendSignalRouteContext(nextParams: URLSearchParams, context: SignalRouteContext) {
  const expressionOwnsTimeRoute = Boolean(
    normalizeContextValue('from', context.from) && normalizeContextValue('to', context.to)
  );
  if (expressionOwnsTimeRoute) {
    appendTimeContextParams(nextParams, {
      timeRange: context.timeRange,
      from: context.from,
      to: context.to,
      start: context.start,
      end: context.end,
      refresh: context.refresh,
      live: context.live,
      tz: context.tz,
      timezone: context.timezone
    } satisfies TimeContext);
  }
  SIGNAL_ROUTE_CONTEXT_PARAM_KEYS.forEach(key => {
    if (expressionOwnsTimeRoute && SIGNAL_TIME_CONTEXT_PARAM_KEYS.has(key)) {
      return;
    }
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
  Object.assign(
    nextContext,
    sanitizeTimeContext({
      timeRange: nextContext.timeRange,
      from: nextContext.from,
      to: nextContext.to,
      start: nextContext.start,
      end: nextContext.end,
      refresh: nextContext.refresh,
      live: nextContext.live,
      tz: nextContext.tz,
      timezone: nextContext.timezone
    })
  );
  return nextContext;
}

export function readSignalPanelEditContext(searchParams: SearchParamReader): SignalPanelEditContext | null {
  if (normalizeValue(searchParams.get('intent')) !== 'edit-panel') {
    return null;
  }
  const dashboardKey = normalizeValue(searchParams.get('dashboardKey'));
  const panelId = normalizeValue(searchParams.get('panelId'));
  const draftKey = normalizeValue(searchParams.get('draftKey'));
  if (!dashboardKey || !panelId) {
    return null;
  }
  return {
    intent: 'edit-panel',
    dashboardKey,
    panelId,
    draftKey,
    returnTo: stripReturnLabelFromHref(searchParams.get('returnTo')),
    returnLabel: normalizeValue(searchParams.get('returnLabel'))
  };
}

export function copySignalRouteContextParams(searchParams: SearchParamReader, nextParams: URLSearchParams) {
  appendSignalRouteContext(nextParams, readSignalRouteContext(searchParams));
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => normalizeValue(value) != null);
}

function translate(t: Translator | undefined, key: string, params?: TranslationParams) {
  const fallback = SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;

  if (!t) return interpolate(fallback, params);
  const translated = t(key, params);
  return translated && translated !== key ? translated : interpolate(fallback, params);
}

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function buildSourceContextRow(source: string, sourceMeta: string, t?: Translator): SignalEntityContextRow {
  const normalizedSource = source.trim().toLowerCase();
  const label = translate(t, 'signal.context.source.label');

  if (normalizedSource === 'alert' || normalizedSource.startsWith('alert:')) {
    return {
      label,
      value: translate(t, 'signal.context.source.alert.value'),
      meta: sourceMeta || translate(t, 'signal.context.source.alert.meta')
    };
  }

  if (normalizedSource === 'topology' || normalizedSource.startsWith('topology:')) {
    const topologySource = normalizedSource.slice('topology:'.length);
    const topologyMeta =
      topologySource === 'otlp-trace-call'
        ? translate(t, 'signal.context.source.topology.otlp-trace-call')
        : topologySource === 'monitor-ownership'
          ? translate(t, 'signal.context.source.topology.monitor-ownership')
          : topologySource === 'template-dependency'
            ? translate(t, 'signal.context.source.topology.template-dependency')
            : topologySource === 'k8s-workload'
              ? translate(t, 'signal.context.source.topology.k8s-workload')
              : topologySource === 'database-middleware-connection'
                ? translate(t, 'signal.context.source.topology.database-middleware-connection')
                : topologySource === 'cmdb-manual-label'
                  ? translate(t, 'signal.context.source.topology.cmdb-manual-label')
                  : topologySource === 'alert-impact'
                    ? translate(t, 'signal.context.source.topology.alert-impact')
                    : undefined;
    return {
      label,
      value: translate(t, 'signal.context.source.topology.value'),
      meta: sourceMeta || topologyMeta || translate(t, 'signal.context.source.topology.meta')
    };
  }

  if (normalizedSource === 'monitor') {
    return {
      label,
      value: translate(t, 'signal.context.source.monitor.value'),
      meta: sourceMeta || translate(t, 'signal.context.source.monitor.meta')
    };
  }

  if (normalizedSource === 'otlp') {
    return {
      label,
      value: 'OTLP',
      meta: sourceMeta || translate(t, 'signal.context.source.otlp.meta')
    };
  }

  return {
    label,
    value: source,
    meta: sourceMeta || translate(t, 'signal.context.source.default.meta')
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
  if (normalized === 'false' || normalized === '0') return translate(t, 'signal.context.time.live.paused');
  if (normalized === 'true' || normalized === '1') return translate(t, 'signal.context.time.live.active');
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
    parts.push(translate(t, 'signal.context.time.refresh', {
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

  return parts.length > 0 ? parts.join(' · ') : translate(t, 'signal.context.time.meta.default');
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

export function isDashboardReturnContext(href: string | null | undefined) {
  const normalizedHref = stripReturnLabelFromHref(href);
  if (!normalizedHref || !normalizedHref.startsWith('/') || normalizedHref.startsWith('//')) return false;
  try {
    const url = new URL(normalizedHref, 'http://hertzbeat.local');
    return url.origin === 'http://hertzbeat.local' && url.pathname === '/dashboard';
  } catch {
    return false;
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

export function buildSignalAlertRulesHref(
  signal: 'metrics' | 'logs' | 'traces',
  context: SignalRouteContext,
  draft?: SignalAlertRuleDraftContext
) {
  const params = new URLSearchParams();
  params.set('signal', signal);
  params.set('intent', 'create');
  appendSignalRouteContext(params, {
    ...context,
    alertName: draft?.name || context.alertName,
    alertQuery: draft?.query || context.alertQuery,
    alertQueryType: draft?.queryType || context.alertQueryType,
    alertExpression: draft?.expression || context.alertExpression,
    alertDatasource: draft?.datasource || context.alertDatasource,
    alertTemplate: draft?.template || context.alertTemplate
  });
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

export function buildSignalAlertWorkspaceHref(
  mode: 'notice' | 'group' | 'silence' | 'inhibit',
  signal: 'metrics' | 'logs' | 'traces' | undefined,
  context: SignalRouteContext
) {
  const params = new URLSearchParams();
  if (signal) {
    params.set('signal', signal);
  }
  appendSignalRouteContext(params, context);
  return withQuery(`/alert/${mode}`, params);
}

export function buildSignalDashboardHref(
  signal: 'metrics' | 'logs' | 'traces',
  context: SignalRouteContext,
  draft?: SignalAlertRuleDraftContext
) {
  const params = new URLSearchParams();
  params.set('intent', 'add-panel');
  params.set('signal', signal);
  const panelTitle = normalizeValue(context.serviceName || context.entityName);
  if (panelTitle) {
    params.set('panelTitle', panelTitle);
  }
  appendSignalRouteContext(params, {
    ...context,
    panelQuery: draft?.query || context.panelQuery,
    panelQueryType: draft?.queryType || context.panelQueryType,
    panelExpression: draft?.expression || context.panelExpression,
    panelDatasource: draft?.datasource || context.panelDatasource
  });
  return withQuery('/dashboard', params);
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
    collector ? `${translate(t, 'signal.context.collector.prefix')} ${collector}` : undefined,
    template ? `${translate(t, 'signal.context.template.prefix')} ${template}` : undefined
  ]
    .filter(Boolean)
    .join(' · ');

  const rows: SignalEntityContextRow[] = [
    {
      label: translate(t, 'signal.context.entity.label'),
      value: entityName || entityId || '-',
      meta: entityId ? `entityId ${entityId}` : translate(t, 'signal.context.entity.meta')
    }
  ];

  if (monitorId || monitorName || monitorInstance || monitorApp) {
    rows.push({
      label: translate(t, 'signal.context.monitor.label'),
      value: monitorName || monitorInstance || monitorId || '-',
      meta:
        [monitorApp, monitorInstance, monitorId ? `monitorId ${monitorId}` : undefined].filter(Boolean).join(' · ') ||
        translate(t, 'signal.context.monitor.meta')
    });
  }

  rows.push(
    {
      label: translate(t, 'signal.context.service.label'),
      value: serviceName || '-',
      meta: serviceNamespace || translate(t, 'signal.context.service.meta')
    },
    {
      label: translate(t, 'signal.context.environment.label'),
      value: environment || '-',
      meta: translate(t, 'signal.context.environment.meta')
    },
    {
      label: translate(t, 'signal.context.time.label'),
      value: timeRange || (start || end ? `${start || '-'} → ${end || '-'}` : translate(t, 'signal.context.time.current-query')),
      meta: buildTimeContextMeta({ end, live, refresh, start, timezone, t })
    }
  );

  rows.push(buildSourceContextRow(source, sourceMeta, t));

  if (traceId || spanId) {
    rows.splice(2, 0, {
      label: translate(t, 'signal.context.trace.label'),
      value: traceId || '-',
      meta: spanId ? `spanId ${spanId}` : 'traceId'
    });
  }

  return rows;
}
