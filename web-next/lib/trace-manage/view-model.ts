import {
  appendSignalRouteContext,
  buildSignalAlertHandlingHref,
  buildSignalAlertRulesHref,
  buildSignalEntityHref,
  readEpochMillisRouteParam,
  stripReturnLabelFromHref,
  type SignalRouteContext
} from '../signal-route-context';
import type { CodeNavigationHint, TraceDetail, TraceListItem, TraceOverview, TraceSpanEvent, TraceSpanLink, TraceSpanNode } from '@/lib/types';
import { buildCodeNavigationUrl } from '../code-navigation';
import { statusTone } from './display-mapping';
import { buildSpanRows } from './span-derivation';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type Row = {
  title: string;
  copy: string;
  meta?: string;
};

export type TraceExplorerRow = {
  key: string;
  traceId: string;
  rootSpanId: string;
  name: string;
  service: string;
  namespace: string;
  duration: string;
  status: string;
  statusTone: 'danger' | 'warning' | 'success' | undefined;
  startTime: string;
};

export type TraceWaterfallPreviewRow = {
  key: string;
  title: string;
  copy: string;
  detailLabel?: string;
  durationLabel: string;
  offsetLabel: string;
  leftPct: number;
  widthPct: number;
  depth: number;
  tone: 'default' | 'danger';
  selected?: boolean;
  events?: TraceWaterfallEventMarker[];
};

export type TraceWaterfallEventMarker = {
  key: string;
  label: string;
  leftPct: number;
  tone: 'default' | 'danger';
  offsetLabel?: string;
  attributesLabel?: string;
};

export type TraceAttributionDiagnostic = {
  key: string;
  label: string;
  value: string;
  state: 'present' | 'missing';
  meta: string;
};

export function buildTraceExplorerRows(
  items: TraceListItem[],
  formatDurationNanos: (value?: number | null) => string,
  formatTime: (value?: number | string | null) => string
): TraceExplorerRow[] {
  return items.map((item, index) => {
    const traceId = item.traceId || `trace-${index}`;
    return {
      key: traceId,
      traceId,
      rootSpanId: item.rootSpanId || '-',
      name: item.rootSpanName || traceId,
      service: item.serviceName || '-',
      namespace: item.serviceNamespace || 'default',
      duration: formatDurationNanos(item.durationNanos),
      status: item.status || 'UNSET',
      statusTone: statusTone(item.status || null),
      startTime: formatTime(item.startTime)
    };
  });
}

export function buildTraceWaterfallRows(
  detail: TraceDetail | null,
  selectedSpanId: string | null | undefined,
  formatDurationNanos: (value?: number | null) => string,
  t: Translator
): TraceWaterfallPreviewRow[] {
  const spans = detail?.spans || [];
  const orderedSpans = buildSpanRows(spans);
  const traceStartMs = resolveTraceStartMs(detail, spans);
  const totalDurationMs = resolveTraceDurationMs(detail, spans, traceStartMs);

  return orderedSpans.map(span => {
    const spanStartMs = toEpochMillis(span.startTime) ?? traceStartMs;
    const startOffsetMs = Math.max(spanStartMs - traceStartMs, 0);
    const spanDurationMs = Math.max((span.durationNanos ?? 0) / 1_000_000, 0.5);
    const leftPct = clampPercent((startOffsetMs / totalDurationMs) * 100);
    const widthPct = Math.max(Math.min((spanDurationMs / totalDurationMs) * 100, 100 - leftPct), 0.5);
    const tone = span.highlighted || (span.status || '').toUpperCase().includes('ERROR') ? 'danger' : 'default';

    return {
      key: span.spanId,
      title: span.spanName || span.spanId,
      copy: [span.serviceName || detail?.serviceName || '-', span.status || 'UNSET', span.spanKind || undefined]
        .filter(Boolean)
        .join(' · '),
      detailLabel: span.spanId,
      durationLabel: formatDurationNanos(span.durationNanos),
      offsetLabel: `${Math.round(startOffsetMs)} ms`,
      leftPct,
      widthPct,
      depth: span.depth,
      tone,
      selected: span.spanId === selectedSpanId,
      events: buildSpanEventMarkers(span.spanId, span.events, traceStartMs, totalDurationMs, spanStartMs, spanDurationMs, tone, t)
    };
  });
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function toEpochMillis(value?: number | string | null): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    if (value > 1_000_000_000_000_000) return value / 1_000_000;
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length > 15) {
      return Number(BigInt(trimmed) / 1_000_000n);
    }
    return Number(trimmed);
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function resolveTraceStartMs(detail: TraceDetail | null, spans: TraceSpanNode[]) {
  const detailStart = toEpochMillis(detail?.startTime);
  if (detailStart != null) return detailStart;
  const spanStarts = spans.map(span => toEpochMillis(span.startTime)).filter((value): value is number => value != null);
  return spanStarts.length > 0 ? Math.min(...spanStarts) : 0;
}

function resolveTraceDurationMs(detail: TraceDetail | null, spans: TraceSpanNode[], traceStartMs: number) {
  const detailDurationMs = Math.max((detail?.durationNanos ?? 0) / 1_000_000, 0);
  const spanEndMs = spans.reduce((max, span) => {
    const spanStartMs = toEpochMillis(span.startTime) ?? traceStartMs;
    const spanOffsetMs = Math.max(spanStartMs - traceStartMs, 0);
    const spanDurationMs = Math.max((span.durationNanos ?? 0) / 1_000_000, 0.5);
    const eventOffsetMs = (span.events || []).reduce((eventMax, event) => {
      const eventMs = toEpochMillis(event.timeUnixNano);
      return eventMs == null ? eventMax : Math.max(eventMax, Math.max(eventMs - traceStartMs, 0));
    }, 0);
    return Math.max(max, spanOffsetMs + spanDurationMs, eventOffsetMs);
  }, 0);
  return Math.max(detailDurationMs, spanEndMs, 1);
}

function buildSpanEventMarkers(
  spanId: string,
  events: TraceSpanEvent[] | undefined,
  traceStartMs: number,
  totalDurationMs: number,
  spanStartMs: number,
  spanDurationMs: number,
  spanTone: 'default' | 'danger',
  t: Translator
): TraceWaterfallEventMarker[] {
  const eventItems = events || [];
  return eventItems
    .map((event, index) => {
      const eventMs = toEpochMillis(event.timeUnixNano) ?? spanStartMs + (spanDurationMs * (index + 1)) / (eventItems.length + 1);
      return {
        key: `${spanId}:event:${index}`,
        label: event.name || t('trace.manage.event.fallback'),
        leftPct: clampPercent(((eventMs - traceStartMs) / totalDurationMs) * 100),
        tone: spanTone === 'danger' || (event.name || '').toLowerCase().includes('exception') ? ('danger' as const) : ('default' as const),
        offsetLabel: `+${Math.round(Math.max(eventMs - traceStartMs, 0))} ms`,
        attributesLabel: formatEventAttributes(event.attributes, t)
      };
    })
    .filter((event): event is TraceWaterfallEventMarker => event != null);
}

export function buildTraceExplorerState(
  overview: TraceOverview,
  listCount: number,
  formatTime: (value?: number | string | null) => string
) {
  return {
    traceCountLabel: `${overview.totalTraceCount ?? 0} traces`,
    errorCountLabel: `${overview.errorTraceCount ?? 0} errors`,
    listCountLabel: `${listCount} rows`,
    latestObservedLabel: formatTime(overview.latestObservedAt),
    hasResults: listCount > 0
  };
}

export function buildSelectedSpanFacts(
  selectedSpan: TraceSpanNode | null,
  detail: TraceDetail | null,
  t: Translator,
  formatDurationNanos: (value?: number | null) => string
): Row[] {
  if (!selectedSpan) {
    return [{ title: t('trace.manage.empty-selected-span.title'), copy: t('trace.manage.empty-selected-span.copy'), meta: '-' }];
  }

  return [
    {
      title: selectedSpan.spanName || selectedSpan.spanId,
      copy: `${selectedSpan.spanKind || 'Span'} · ${selectedSpan.status || 'UNSET'}`,
      meta: formatDurationNanos(selectedSpan.durationNanos)
    },
    {
      title: t('trace.manage.selected-span.service-namespace'),
      copy: `${selectedSpan.serviceName || detail?.serviceName || '-'} · ${selectedSpan.resourceAttributes?.['service.namespace'] || detail?.serviceNamespace || '-'}`,
      meta: selectedSpan.traceState || t('trace.manage.trace-state-empty')
    }
  ];
}

function readTraceText(source: Record<string, string> | undefined, ...keys: string[]) {
  return firstText(...keys.map(key => source?.[key]));
}

export function buildTraceAttributionDiagnostics(
  detail: TraceDetail | null,
  selectedSpan: TraceSpanNode | null,
  routeContext: SignalRouteContext = {},
  t: Translator
): TraceAttributionDiagnostic[] {
  const read = (...keys: string[]) =>
    firstText(
      ...keys.flatMap(key => [
        routeContext[key as keyof SignalRouteContext] as string | undefined,
        readTraceText(detail?.resourceAttributes, key),
        readTraceText(selectedSpan?.resourceAttributes, key),
        readTraceText(selectedSpan?.spanAttributes, key)
      ])
    );
  const row = (key: string, value: string | undefined, presentMeta: string, missingMeta: string): TraceAttributionDiagnostic => ({
    key,
    label: key,
    value: value || '-',
    state: value ? 'present' : 'missing',
    meta: value ? presentMeta : missingMeta
  });
  const entityId = read('entityId', 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id');
  const entityName = read('entityName', 'hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name');
  const workspaceId = read('hertzbeat.workspace_id', 'hertzbeat_workspace_id', 'workspace.id', 'workspace_id');
  const collector = read('collector', 'hertzbeat.collector', 'hertzbeat_collector');
  const template = read('template', 'hertzbeat.template', 'hertzbeat_template', 'hertzbeat.monitor_template', 'hertzbeat_monitor_template');

  return [
    row(
      'hertzbeat.entity_id',
      entityId,
      t('trace.manage.attribution-diagnostics.entity-id.present'),
      t('trace.manage.attribution-diagnostics.entity-id.missing')
    ),
    row(
      'hertzbeat.entity_name',
      entityName,
      t('trace.manage.attribution-diagnostics.entity-name.present'),
      t('trace.manage.attribution-diagnostics.entity-name.missing')
    ),
    row(
      'hertzbeat.workspace_id',
      workspaceId,
      t('trace.manage.attribution-diagnostics.workspace-id.present'),
      t('trace.manage.attribution-diagnostics.workspace-id.missing')
    ),
    row(
      'hertzbeat.collector',
      collector,
      t('trace.manage.attribution-diagnostics.collector.present'),
      t('trace.manage.attribution-diagnostics.collector.missing')
    ),
    row(
      'hertzbeat.template',
      template,
      t('trace.manage.attribution-diagnostics.template.present'),
      t('trace.manage.attribution-diagnostics.template.missing')
    )
  ];
}

export function buildQueryStats(overview: TraceOverview, listCount: number, t: Translator): Array<[string, string]> {
  return [
    [
      t('trace.manage.stat.error-ratio'),
      overview.totalTraceCount ? `${Math.round((overview.errorTraceCount / overview.totalTraceCount) * 100)}%` : '0%'
    ],
    [
      t('trace.manage.stat.activity'),
      overview.hasActiveTrace ? t('common.active') : t('common.idle')
    ],
    [t('trace.manage.stat.list-count'), String(listCount)]
  ];
}

export function buildSelectedSpanEventRows(
  selectedSpan: TraceSpanNode | null,
  formatTime: (value?: number | string | null) => string,
  t: Translator
): Row[] {
  return selectedSpan?.events?.slice(0, 5).map((event: TraceSpanEvent) => ({
    title: event.name || t('trace.manage.event.fallback'),
    copy: formatEventAttributes(event.attributes, t),
    meta: formatTime(toEventEpochMillis(event.timeUnixNano) ?? null)
  })) || [];
}

export function buildSelectedSpanLinkRows(selectedSpan: TraceSpanNode | null, t: Translator): Row[] {
  return selectedSpan?.links?.slice(0, 5).map((link: TraceSpanLink) => ({
    title: link.traceId || t('trace.manage.link.fallback'),
    copy: link.spanId || '-',
    meta: link.traceState || t('trace.manage.link.meta')
  })) || [];
}

function formatEventAttributes(attributes: TraceSpanEvent['attributes'] | undefined, t: Translator) {
  const entries = Object.entries(attributes || {}).filter(([key]) => key.trim() !== '');
  if (entries.length === 0) return t('trace.manage.event.attributes.empty');

  const visibleEntries = entries.slice(0, 4).map(([key, value]) => `${key}=${formatEventAttributeValue(value, t)}`);
  if (entries.length > 4) {
    visibleEntries.push(t('trace.manage.event.attributes.more', { count: entries.length - 4 }));
  }
  return visibleEntries.join(' · ');
}

function formatEventAttributeValue(value: unknown, t: Translator): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value.map(part => formatEventAttributeValue(part, t)).filter(part => part !== '-').join(', ');
    return joined || '-';
  }
  return t('trace.manage.event.attributes.object');
}

function toEventEpochMillis(value?: number | string | null) {
  if (value == null) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return Number(value > 1_000_000_000_000_000 ? BigInt(Math.trunc(value)) / 1_000_000n : BigInt(Math.trunc(value)));
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed.length > 15 ? BigInt(trimmed) / 1_000_000n : BigInt(trimmed));
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toEpochMs(value?: number | string | null) {
  if (value == null) return undefined;
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toRouteEpochMillis(value?: number | string | null) {
  if (value == null) return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 && Number.isInteger(value) ? String(value) : undefined;
  }
  const trimmed = value.trim();
  const epochMillis = readEpochMillisRouteParam(trimmed);
  if (epochMillis) return epochMillis;
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? undefined : String(parsed);
}

function readTraceSignalAttribute(
  detail: TraceDetail | null,
  selectedSpan: TraceSpanNode | null,
  ...keys: string[]
) {
  return firstText(
    ...keys.flatMap(key => [
      readTraceText(selectedSpan?.resourceAttributes, key),
      readTraceText(selectedSpan?.spanAttributes, key),
      readTraceText(detail?.resourceAttributes, key)
    ])
  );
}

function durationNanosToWholeMillis(value?: number | null) {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  const millis = value / 1_000_000;
  return Number.isInteger(millis) ? millis : undefined;
}

export function buildTraceHandoffLinks(
  detail: TraceDetail | null,
  selectedSpan: TraceSpanNode | null,
  routeContext: SignalRouteContext = {},
  options?: {
    traceId?: string;
    spanId?: string;
    serviceName?: string;
    serviceNamespace?: string;
    environment?: string;
    intakeReturnTo?: string;
    intakeReturnLabel?: string;
    logsReturnTo?: string;
    logsReturnLabel?: string;
    metricsReturnTo?: string;
  }
) {
  const traceId = detail?.traceId || options?.traceId;
  const spanId = selectedSpan?.spanId || options?.spanId;
  const serviceName =
    selectedSpan?.serviceName || detail?.serviceName || options?.serviceName || routeContext.serviceName || undefined;
  const serviceNamespace =
    selectedSpan?.resourceAttributes?.['service.namespace']
    || detail?.serviceNamespace
    || options?.serviceNamespace
    || routeContext.serviceNamespace
    || undefined;
  const environment =
    selectedSpan?.resourceAttributes?.['deployment.environment.name']
    || options?.environment
    || routeContext.environment
    || undefined;
  const entityId = firstText(
    routeContext.entityId,
    readTraceSignalAttribute(detail, selectedSpan, 'entityId', 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id')
  );
  const entityName = firstText(
    routeContext.entityName,
    readTraceSignalAttribute(detail, selectedSpan, 'entityName', 'hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name')
  );
  const collector = firstText(
    routeContext.collector,
    readTraceSignalAttribute(detail, selectedSpan, 'collector', 'hertzbeat.collector', 'hertzbeat_collector')
  );
  const template = firstText(
    routeContext.template,
    readTraceSignalAttribute(detail, selectedSpan, 'template', 'hertzbeat.template', 'hertzbeat_template', 'hertzbeat.monitor_template', 'hertzbeat_monitor_template')
  );
  const routeStart = readEpochMillisRouteParam(routeContext.start);
  const routeEnd = readEpochMillisRouteParam(routeContext.end);
  const detailStart = toRouteEpochMillis(detail?.startTime);
  const detailDurationMs = durationNanosToWholeMillis(detail?.durationNanos);
  const start = routeStart || detailStart;
  const end =
    routeEnd ||
    (detailStart != null && detailDurationMs != null ? String(Number(detailStart) + detailDurationMs) : undefined);
  const signalContext: SignalRouteContext = {
    ...routeContext,
    entityId,
    entityName,
    serviceName,
    serviceNamespace,
    environment,
    collector,
    template,
    traceId,
    spanId,
    returnTo: stripReturnLabelFromHref(routeContext.returnTo),
    source: routeContext.source || 'otlp',
    start,
    end
  };
  const logsContext: SignalRouteContext = {
    ...signalContext,
    returnTo: stripReturnLabelFromHref(options?.logsReturnTo || signalContext.returnTo)
  };
  const metricsContext: SignalRouteContext = {
    ...signalContext,
    returnTo: stripReturnLabelFromHref(options?.metricsReturnTo || signalContext.returnTo)
  };

  const intakeParams = new URLSearchParams();
  appendSignalRouteContext(intakeParams, signalContext);
  intakeParams.set('returnTo', stripReturnLabelFromHref(options?.intakeReturnTo || '/trace/manage') || '/trace/manage');
  intakeParams.set('signal', 'traces');

  const logsParams = new URLSearchParams();
  if (traceId) logsParams.set('traceId', traceId);
  if (spanId) logsParams.set('spanId', spanId);
  appendSignalRouteContext(logsParams, logsContext);

  const metricsParams = new URLSearchParams();
  if (traceId) metricsParams.set('traceId', traceId);
  if (spanId) metricsParams.set('spanId', spanId);
  if (serviceName) metricsParams.set('serviceName', serviceName);
  if (serviceNamespace) metricsParams.set('serviceNamespace', serviceNamespace);
  appendSignalRouteContext(metricsParams, metricsContext);

  const entityParams = new URLSearchParams();
  if (serviceName) entityParams.set('search', serviceName);

  return {
    intakeHref: intakeParams.toString() ? `/ingestion/otlp?${intakeParams.toString()}` : '/ingestion/otlp',
    logsHref: logsParams.toString() ? `/log/manage?${logsParams.toString()}` : '/log/manage',
    metricsHref: metricsParams.toString() ? `/ingestion/otlp/metrics?${metricsParams.toString()}` : '/ingestion/otlp/metrics',
    entitiesHref: entityParams.toString() ? `/entities?${entityParams.toString()}` : '/entities',
    entityHref: buildSignalEntityHref(signalContext, serviceName),
    alertHandlingHref: buildSignalAlertHandlingHref('traces', signalContext),
    alertRulesHref: buildSignalAlertRulesHref('traces', signalContext)
  };
}

function firstText(...values: Array<string | undefined>) {
  return values.find(value => value != null && value.trim() !== '');
}

export function buildTraceCodeNavigationUrl(selectedSpan: TraceSpanNode | null, hint?: CodeNavigationHint) {
  if (!hint?.repositoryUrl) return undefined;
  const searchQuery = firstText(
    selectedSpan?.spanAttributes?.['code.function'],
    selectedSpan?.spanAttributes?.['code.namespace'],
    selectedSpan?.spanAttributes?.['http.route'],
    selectedSpan?.serviceName || undefined,
    hint.searchQuery
  );
  const defaultPath = firstText(
    selectedSpan?.spanAttributes?.['code.filepath'],
    hint.defaultPath
  );
  return buildCodeNavigationUrl({
    ...hint,
    searchQuery,
    defaultPath
  });
}
