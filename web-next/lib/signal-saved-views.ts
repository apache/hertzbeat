import {
  buildSignalDashboardPanelDraftKey,
  type SignalDashboardPanelDraft,
  type SignalDashboardPanelVisualization
} from './signal-dashboard-panel-drafts';

export type SignalSavedViewSignal = 'logs' | 'traces' | 'metrics';

export type SignalSavedQueryViewPersistenceMode = 'server-first' | 'local-fallback';

export type SignalSavedQueryView = {
  id: string;
  label: string;
  description: string;
  route: string;
  createdAt: number;
};

export type SignalSavedQueryViewWithSignal = SignalSavedQueryView & {
  signal: SignalSavedViewSignal;
};

export type SignalSavedQueryViewsLoadResult = {
  views: SignalSavedQueryViewWithSignal[];
  failedSignals: SignalSavedViewSignal[];
};

type ServerSignalSavedView = {
  id?: number;
  signal?: string;
  viewKey?: string;
  label?: string;
  description?: string;
  route?: string;
  querySnapshot?: string;
  payload?: string;
  createTime?: string;
  updateTime?: string;
};

type ApiMessage<T> = {
  code: number;
  msg?: string;
  data?: T;
};

const SIGNAL_ROUTE_PREFIX: Record<SignalSavedViewSignal, string> = {
  logs: '/log/manage',
  traces: '/trace/manage',
  metrics: '/ingestion/otlp/metrics'
};

function hashRoute(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildSignalSavedViewKey(signal: SignalSavedViewSignal, route: string) {
  return `${signal}-${hashRoute(route)}`;
}

function isSafeViewKey(value: string) {
  return /^[A-Za-z0-9_.:-]{1,128}$/.test(value);
}

function readRouteParam(route: string, key: string) {
  try {
    return new URL(route, 'http://hertzbeat.local').searchParams.get(key) || '';
  } catch {
    return '';
  }
}

function readRouteParams(route: string) {
  try {
    return new URL(route, 'http://hertzbeat.local').searchParams;
  } catch {
    return new URLSearchParams();
  }
}

const SAVED_VIEW_SUMMARY_PARAM_KEYS: Record<SignalSavedViewSignal, string[]> = {
  logs: [
    'view',
    'search',
    'severityText',
    'serviceName',
    'serviceNamespace',
    'environment',
    'entityId',
    'entityType',
    'entityName',
    'source',
    'collector',
    'template',
    'traceId',
    'spanId',
    'resourceFilter',
    'attributeFilter',
    'groupBy',
    'groupLimit',
    'groupOrder',
    'groupMinCount',
    'columns',
    'format',
    'maxLines',
    'listPageSize',
    'listPageIndex',
    'timeRange'
  ],
  traces: [
    'view',
    'serviceName',
    'serviceNamespace',
    'operationName',
    'environment',
    'entityId',
    'entityType',
    'entityName',
    'source',
    'collector',
    'template',
    'traceId',
    'spanId',
    'resourceFilter',
    'minDurationMs',
    'maxDurationMs',
    'errorOnly',
    'spanScope',
    'groupBy',
    'groupLimit',
    'groupOrder',
    'groupMinCount',
    'columns',
    'listPageSize',
    'listPageIndex',
    'timeRange'
  ],
  metrics: [
    'query',
    'series',
    'filter',
    'traceId',
    'spanId',
    'serviceName',
    'serviceNamespace',
    'environment',
    'entityId',
    'entityType',
    'entityName',
    'source',
    'collector',
    'template',
    'aggregation',
    'temporalAggregation',
    'groupBy',
    'legendFormat',
    'formula',
    'step',
    'limit',
    'inspector',
    'warningThreshold',
    'criticalThreshold',
    'expectedRange',
    'relatedMetricSource',
    'relatedMetricFamily',
    'relatedMetricReason',
    'relatedMetricMatchedLabels',
    'relatedMetricResourceMatch',
    'timeRange'
  ]
};

export function buildSignalSavedViewRouteSummary(signal: SignalSavedViewSignal, route: string) {
  const params = readRouteParams(route);
  return SAVED_VIEW_SUMMARY_PARAM_KEYS[signal].reduce<Record<string, string>>((summary, key) => {
    const value = params.get(key)?.trim();
    if (value) summary[key] = value;
    return summary;
  }, {});
}

export function formatSignalSavedViewRouteSummary(summary: Record<string, string>) {
  return Object.entries(summary)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

function resolveSavedViewVisualization(signal: SignalSavedViewSignal, route: string): SignalDashboardPanelVisualization {
  const view = readRouteParam(route, 'view');
  if (signal === 'logs') {
    return view === 'table' ? 'table' : 'list';
  }
  if (signal === 'traces') {
    if (view === 'time-series') return 'time-series';
    if (view === 'trace') return 'trace';
    return 'table';
  }
  return readRouteParam(route, 'inspector') === 'table' ? 'table' : 'graph';
}

function parseViewCreatedAt(view: ServerSignalSavedView) {
  if (typeof view.payload === 'string') {
    try {
      const parsed = JSON.parse(view.payload) as { createdAt?: unknown };
      if (typeof parsed.createdAt === 'number' && Number.isFinite(parsed.createdAt)) {
        return parsed.createdAt;
      }
    } catch {
      // Ignore malformed metadata; the route snapshot still has value.
    }
  }
  const timestamp = Date.parse(view.createTime || view.updateTime || '');
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

export function mapServerSignalSavedView(signal: SignalSavedViewSignal, view: ServerSignalSavedView): SignalSavedQueryView | null {
  const routePrefix = SIGNAL_ROUTE_PREFIX[signal];
  const route = typeof view.route === 'string' ? view.route : '';
  const viewKey = typeof view.viewKey === 'string' && isSafeViewKey(view.viewKey)
    ? view.viewKey
    : typeof view.id === 'number'
      ? `${signal}-${view.id}`
      : '';
  if (!viewKey || !route.startsWith(routePrefix)) return null;
  return {
    id: viewKey,
    label: typeof view.label === 'string' && view.label.trim() ? view.label : routePrefix,
    description: typeof view.description === 'string' ? view.description : '',
    route,
    createdAt: parseViewCreatedAt(view)
  };
}

function toServerSignalSavedView(signal: SignalSavedViewSignal, view: SignalSavedQueryView): ServerSignalSavedView {
  const viewKey = isSafeViewKey(view.id) ? view.id : buildSignalSavedViewKey(signal, view.route);
  return {
    signal,
    viewKey,
    label: view.label,
    description: view.description,
    route: view.route,
    querySnapshot: view.route,
    payload: JSON.stringify({ createdAt: view.createdAt })
  };
}

async function requestSignalSavedView<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (typeof fetch === 'undefined') {
    throw new Error('Signal saved view API is unavailable');
  }
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Signal saved view request failed with ${response.status}`);
  }
  const payload = await response.json() as ApiMessage<T>;
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Signal saved view request failed');
  }
  return payload.data as T;
}

export async function loadSignalSavedQueryViews(signal: SignalSavedViewSignal): Promise<SignalSavedQueryView[]> {
  const payload = await requestSignalSavedView<ServerSignalSavedView[]>(`/signal/saved-view/${signal}`);
  return Array.isArray(payload)
    ? payload.map(view => mapServerSignalSavedView(signal, view)).filter((view): view is SignalSavedQueryView => Boolean(view))
    : [];
}

export async function loadAllSignalSavedQueryViews(): Promise<SignalSavedQueryViewWithSignal[]> {
  return (await loadAllSignalSavedQueryViewsWithDiagnostics()).views;
}

export async function loadAllSignalSavedQueryViewsWithDiagnostics(): Promise<SignalSavedQueryViewsLoadResult> {
  const loadSignal = async (signal: SignalSavedViewSignal) => {
    try {
      return {
        signal,
        views: (await loadSignalSavedQueryViews(signal)).map(item => ({ ...item, signal })),
        failed: false
      };
    } catch {
      return {
        signal,
        views: [],
        failed: true
      };
    }
  };
  const results = await Promise.all([
    loadSignal('logs'),
    loadSignal('traces'),
    loadSignal('metrics')
  ]);
  return {
    views: results.flatMap(result => result.views),
    failedSignals: results.filter(result => result.failed).map(result => result.signal)
  };
}

export function createSignalDashboardPanelDraftFromSavedView(
  signal: SignalSavedViewSignal,
  view: SignalSavedQueryView
): SignalDashboardPanelDraft {
  const visualization = resolveSavedViewVisualization(signal, view.route);
  const routeSummary = buildSignalSavedViewRouteSummary(signal, view.route);
  const routeSummaryText = formatSignalSavedViewRouteSummary(routeSummary);
  return {
    signal,
    draftKey: buildSignalDashboardPanelDraftKey(signal, view.route, visualization),
    title: view.label,
    description: view.description || routeSummaryText,
    visualization,
    route: view.route,
    querySnapshot: view.route,
    payload: JSON.stringify({
      createdAt: Date.now(),
      source: 'signal-saved-view',
      savedViewId: view.id,
      savedViewLabel: view.label,
      savedViewCreatedAt: view.createdAt,
      savedViewRouteSummary: routeSummary,
      savedViewRouteSummaryText: routeSummaryText
    })
  };
}

export async function saveSignalSavedQueryView(signal: SignalSavedViewSignal, view: SignalSavedQueryView): Promise<SignalSavedQueryView> {
  const payload = await requestSignalSavedView<ServerSignalSavedView>('/signal/saved-view', {
    method: 'PUT',
    body: JSON.stringify(toServerSignalSavedView(signal, view))
  });
  return mapServerSignalSavedView(signal, payload) || view;
}

export async function deleteSignalSavedQueryView(signal: SignalSavedViewSignal, viewId: string): Promise<void> {
  await requestSignalSavedView<void>(`/signal/saved-view/${signal}/${encodeURIComponent(viewId)}`, {
    method: 'DELETE'
  });
}
