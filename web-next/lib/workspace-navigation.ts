import type { OtlpMetricsQueryState } from './otlp-metrics/controller';
import { buildLogRouteUrl, type LogQueryState, type LogWorkbenchView } from './log-manage/query-state';
import { appendSignalRouteContext, type SignalRouteContext } from './signal-route-context';
import { buildTraceRouteUrl, type TraceQueryState } from './trace-manage/query-state';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type SignalWorkspaceTabKey = 'entity' | 'ingestion' | 'metrics' | 'logs' | 'traces' | 'monitors';

export type SignalWorkspaceTab = {
  key: SignalWorkspaceTabKey;
  label: string;
  href: string;
  active: boolean;
  disabled?: boolean;
};

const EMPTY_LOG_QUERY: LogQueryState = {
  search: '',
  logContent: '',
  traceId: '',
  spanId: '',
  severityNumber: '',
  severityText: ''
};

const EMPTY_TRACE_QUERY: TraceQueryState = {
  traceId: '',
  spanId: '',
  serviceName: '',
  errorOnly: false
};

function appendStringParams(params: URLSearchParams, values: Record<string, string | undefined>) {
  Object.entries(values).forEach(([key, value]) => {
    const trimmed = value?.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  });
}

export function resolveTraceWorkspaceLabel(t: Translator) {
  return t('trace.center.console.title') || t('trace.manage.workspace');
}

export function buildEntityWorkspaceHref(routeContext: SignalRouteContext) {
  if (routeContext.returnTo) {
    return routeContext.returnTo;
  }
  if (routeContext.entityId) {
    return `/entities/${routeContext.entityId}`;
  }
  return '/entities';
}

export function buildMonitorsWorkspaceHref(routeContext: SignalRouteContext, overrides?: Partial<SignalRouteContext>) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, { ...routeContext, ...overrides });
  const queryString = params.toString();
  return queryString ? `/monitors?${queryString}` : '/monitors';
}

export function buildIngestionWorkspaceHref(query: OtlpMetricsQueryState = {}) {
  const params = new URLSearchParams();
  appendStringParams(
    params,
    Object.fromEntries(Object.entries(query).map(([key, value]) => [key, value == null ? undefined : String(value)]))
  );
  const queryString = params.toString();
  return queryString ? `/ingestion/otlp?${queryString}` : '/ingestion/otlp';
}

export function buildMetricsWorkspaceHref(query: OtlpMetricsQueryState = {}) {
  const params = new URLSearchParams();
  appendStringParams(params, Object.fromEntries(Object.entries(query).map(([key, value]) => [key, value == null ? undefined : String(value)])));
  const queryString = params.toString();
  return queryString ? `/ingestion/otlp/metrics?${queryString}` : '/ingestion/otlp/metrics';
}

export function buildLogWorkspaceHref(query: LogQueryState, routeContext: SignalRouteContext, options?: { view?: LogWorkbenchView }) {
  const params = new URLSearchParams(buildLogRouteUrl(query, { view: options?.view }).split('?')[1] || '');
  appendSignalRouteContext(params, routeContext);
  const queryString = params.toString();
  return queryString ? `/log/manage?${queryString}` : '/log/manage';
}

export function buildTraceWorkspaceHref(query: TraceQueryState, routeContext: SignalRouteContext) {
  const params = new URLSearchParams(buildTraceRouteUrl(query).split('?')[1] || '');
  appendSignalRouteContext(params, routeContext);
  const queryString = params.toString();
  return queryString ? `/trace/manage?${queryString}` : '/trace/manage';
}

export function buildEntitySignalRouteContext({
  entityId,
  entityName,
  returnTo,
  serviceName,
  serviceNamespace,
  environment
}: {
  entityId?: string | number | null;
  entityName?: string | null;
  returnTo?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
}): SignalRouteContext {
  const resolvedEntityId = entityId == null ? undefined : String(entityId);
  const resolvedEntityName = entityName?.trim() || undefined;
  const resolvedReturnTo = returnTo?.trim() || (resolvedEntityId ? `/entities/${resolvedEntityId}` : undefined);

  return {
    entityId: resolvedEntityId,
    entityName: resolvedEntityName,
    returnTo: resolvedReturnTo,
    serviceName: serviceName?.trim() || undefined,
    serviceNamespace: serviceNamespace?.trim() || undefined,
    environment: environment?.trim() || undefined
  };
}

export function buildEntityWorkspaceTabs({
  t,
  active,
  routeContext,
  includeMetrics = true,
  disabledKeys = []
}: {
  t: Translator;
  active: SignalWorkspaceTabKey;
  routeContext: SignalRouteContext;
  includeMetrics?: boolean;
  disabledKeys?: SignalWorkspaceTabKey[];
}) {
  const tabs: SignalWorkspaceTab[] = [
    {
      key: 'entity',
      label: t('entity.detail'),
      href: buildEntityWorkspaceHref(routeContext),
      active: active === 'entity'
    }
  ];

  if (includeMetrics) {
    tabs.push({
      key: 'metrics',
      label: t('ingestion.otlp.metrics.title'),
      href: buildMetricsWorkspaceHref(routeContext),
      active: active === 'metrics'
    });
  }

  tabs.push(
    {
      key: 'monitors',
      label: t('menu.monitor.center'),
      href: buildMonitorsWorkspaceHref(routeContext),
      active: active === 'monitors'
    },
    {
      key: 'logs',
      label: t('log.manage.console.title'),
      href: buildLogWorkspaceHref(EMPTY_LOG_QUERY, routeContext),
      active: active === 'logs'
    },
    {
      key: 'traces',
      label: resolveTraceWorkspaceLabel(t),
      href: buildTraceWorkspaceHref(EMPTY_TRACE_QUERY, routeContext),
      active: active === 'traces'
    }
  );

  return tabs.map(tab => (disabledKeys.includes(tab.key) ? { ...tab, disabled: true } : tab));
}

export function buildEntityEditorWorkspaceTabs({
  t,
  entityId,
  entityName
}: {
  t: Translator;
  entityId?: string | number | null;
  entityName?: string | null;
}) {
  const hasEntity = entityId != null && String(entityId).trim() !== '';
  return buildEntityWorkspaceTabs({
    t,
    active: 'entity',
    routeContext: buildEntitySignalRouteContext({ entityId, entityName }),
    includeMetrics: false,
    disabledKeys: hasEntity ? [] : ['monitors', 'logs', 'traces']
  });
}

export function buildSignalWorkspaceTabs({
  t,
  active,
  routeContext,
  logQuery,
  logView,
  traceQuery,
  metricsQuery,
  monitorContext
}: {
  t: Translator;
  active: SignalWorkspaceTabKey;
  routeContext: SignalRouteContext;
  logQuery: LogQueryState;
  logView?: LogWorkbenchView;
  traceQuery: TraceQueryState;
  metricsQuery: OtlpMetricsQueryState;
  monitorContext?: Partial<SignalRouteContext>;
}): SignalWorkspaceTab[] {
  return [
    {
      key: 'entity',
      label: t('entity.detail'),
      href: buildEntityWorkspaceHref(routeContext),
      active: active === 'entity'
    },
    {
      key: 'ingestion',
      label: t('otlp.title'),
      href: buildIngestionWorkspaceHref({ ...routeContext, ...metricsQuery }),
      active: active === 'ingestion'
    },
    {
      key: 'metrics',
      label: t('ingestion.otlp.metrics.title'),
      href: buildMetricsWorkspaceHref({ ...routeContext, ...metricsQuery }),
      active: active === 'metrics'
    },
    {
      key: 'logs',
      label: t('log.manage.console.title'),
      href: buildLogWorkspaceHref(logQuery, routeContext, { view: logView }),
      active: active === 'logs'
    },
    {
      key: 'traces',
      label: resolveTraceWorkspaceLabel(t),
      href: buildTraceWorkspaceHref(traceQuery, routeContext),
      active: active === 'traces'
    },
    {
      key: 'monitors',
      label: t('menu.monitor.center'),
      href: buildMonitorsWorkspaceHref(routeContext, monitorContext),
      active: active === 'monitors'
    }
  ];
}
