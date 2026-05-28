import { appendSignalRouteContext, buildSignalAlertHandlingHref, buildSignalAlertRulesHref, buildSignalEntityHref, type SignalRouteContext } from './signal-route-context';

export type EntityWorkbenchSignal = 'overview' | 'metrics' | 'logs' | 'traces' | 'topology' | 'alerts';

export type EntityWorkbenchNavigationContext = SignalRouteContext & {
  entityId: string;
};

const ENTITY_WORKBENCH_SIGNAL_PATHS: Record<Exclude<EntityWorkbenchSignal, 'overview' | 'alerts'>, string> = {
  metrics: '/ingestion/otlp/metrics',
  logs: '/log/manage',
  traces: '/trace/manage',
  topology: '/topology'
};

function withEntityWorkbenchContext(path: string, context: EntityWorkbenchNavigationContext, extras: Record<string, string> = {}) {
  const params = new URLSearchParams(extras);
  appendSignalRouteContext(params, context);
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function buildEntityWorkbenchHref(signal: EntityWorkbenchSignal, context: EntityWorkbenchNavigationContext) {
  if (signal === 'overview') {
    return buildSignalEntityHref(context);
  }
  if (signal === 'alerts') {
    return buildSignalAlertHandlingHref('traces', context);
  }
  return withEntityWorkbenchContext(ENTITY_WORKBENCH_SIGNAL_PATHS[signal], context);
}

export function buildEntityWorkbenchNavigation(context: EntityWorkbenchNavigationContext) {
  return {
    overviewHref: buildEntityWorkbenchHref('overview', context),
    metricsHref: buildEntityWorkbenchHref('metrics', context),
    logsHref: buildEntityWorkbenchHref('logs', context),
    tracesHref: buildEntityWorkbenchHref('traces', context),
    topologyHref: buildEntityWorkbenchHref('topology', context),
    alertsHref: buildEntityWorkbenchHref('alerts', context),
    alertRulesHref: buildSignalAlertRulesHref('traces', context)
  };
}
