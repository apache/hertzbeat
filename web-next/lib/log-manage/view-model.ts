import {
  appendSignalRouteContext,
  buildSignalAlertHandlingHref,
  buildSignalAlertRulesHref,
  buildSignalEntityHref,
  stripReturnLabelFromHref,
  type SignalRouteContext
} from '../signal-route-context';
import type { CodeNavigationHint, LogEntry, TraceSpanNode } from '@/lib/types';
import { buildCodeNavigationUrl } from '../code-navigation';
import { logSeverityTone, type LogSeverityTone } from './display-mapping';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type Row = {
  title: string;
  copy: string;
  meta?: string;
};

type Fact = {
  label: string;
  value: string;
  monospace?: boolean;
};

export type LogAttributionDiagnostic = {
  key: string;
  label: string;
  value: string;
  state: 'present' | 'missing';
  meta: string;
};

export type LogExplorerRow = {
  key: string;
  timestamp: string;
  message: string;
  service: string;
  severity: string;
  severityTone: LogSeverityTone;
  traceId: string;
  spanId: string;
};

export function buildTrendRows(hourlyStats: Record<string, number> | undefined, t: Translator): Row[] {
  return Object.entries(hourlyStats || {})
    .slice(-6)
    .map(([hour, count]) => ({
      title: hour,
      copy: t('log.manage.trend.count', { count }),
      meta: t('log.manage.trend.meta')
    }));
}

export function buildSelectedLogRows(
  selectedLog: LogEntry | null,
  t: Translator,
  bodyText: (value: unknown) => string,
  formatTime: (value?: number | string | null) => string,
  severityLabel: (entry: Partial<LogEntry>) => string = entry => entry.severityText || (entry.severityNumber != null ? String(entry.severityNumber) : 'LOG')
): Row[] {
  if (!selectedLog) {
    return [{ title: t('log.manage.empty-selected.title'), copy: t('log.manage.empty-selected.copy'), meta: '-' }];
  }

  return [
    {
      title: selectedLog.resource?.['service.name']?.toString() || t('log.manage.unknown-service'),
      copy: bodyText(selectedLog.body),
      meta: selectedLog.traceId || t('log.manage.no-trace')
    },
    {
      title: t('log.manage.selected.resource-keys'),
      copy: String(Object.keys(selectedLog.resource || {}).length),
      meta: t('log.manage.selected.attributes', { count: Object.keys(selectedLog.attributes || {}).length })
    },
    {
      title: t('log.manage.selected.span-severity'),
      copy: `${selectedLog.spanId || '-'} · ${severityLabel(selectedLog)}`,
      meta: formatTime(selectedLog.timeUnixNano ? selectedLog.timeUnixNano / 1_000_000 : null)
    },
    ...(selectedLog.traceId
      ? [
          {
            title: t('log.manage.trace-id'),
            copy: selectedLog.traceId,
            meta: 'trace'
          }
        ]
      : []),
    ...(selectedLog.spanId
      ? [
          {
            title: t('log.manage.span-id'),
            copy: selectedLog.spanId,
            meta: 'span'
          }
        ]
      : [])
  ];
}

export function buildSelectedLogFacts(
  selectedLog: LogEntry | null,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  severityLabel: (entry: Partial<LogEntry>) => string = entry => entry.severityText || (entry.severityNumber != null ? String(entry.severityNumber) : 'LOG')
): Fact[] {
  if (!selectedLog) {
    return [];
  }

  return [
    {
      label: t('log.stream.severity'),
      value: severityLabel(selectedLog)
    },
    {
      label: t('log.stream.timestamp'),
      value: formatTime(selectedLog.timeUnixNano ? selectedLog.timeUnixNano / 1_000_000 : null)
    },
    ...(selectedLog.traceId
      ? [
          {
            label: t('log.stream.trace-id-full'),
            value: selectedLog.traceId,
            monospace: true
          }
        ]
      : []),
    ...(selectedLog.spanId
      ? [
          {
            label: t('log.stream.span-id-full'),
            value: selectedLog.spanId,
            monospace: true
          }
        ]
      : []),
    ...buildHertzBeatLogFacts(selectedLog)
  ];
}

function buildHertzBeatLogFacts(selectedLog: LogEntry): Fact[] {
  return [
    ['HertzBeat event_id', readAttribute(selectedLog.attributes, 'hertzbeat.event_id')],
    ['HertzBeat ingest_id', readAttribute(selectedLog.attributes, 'hertzbeat.ingest_id')],
    ['HertzBeat entity_id', readAttribute(selectedLog.resource, 'hertzbeat.entity_id')],
    ['HertzBeat workspace_id', readAttribute(selectedLog.resource, 'hertzbeat.workspace_id')]
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => ({
      label,
      value,
      monospace: true
    }));
}

export function buildLogAttributionDiagnostics(selectedLog: LogEntry | null, t: Translator): LogAttributionDiagnostic[] {
  if (!selectedLog) return [];
  const read = (...keys: string[]) => firstText(
    ...keys.flatMap(key => [
      readAttribute(selectedLog.resource, key),
      readAttribute(selectedLog.attributes, key)
    ])
  );
  const row = (key: string, value: string | undefined, meta: string): LogAttributionDiagnostic => ({
    key,
    label: key,
    value: value || '-',
    state: value ? 'present' : 'missing',
    meta
  });
  const eventId = read('hertzbeat.event_id', 'hertzbeat_event_id');
  const ingestId = read('hertzbeat.ingest_id', 'hertzbeat_ingest_id');
  const entityId = read('hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id');
  const entityName = read('hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name');
  const workspaceId = read('hertzbeat.workspace_id', 'hertzbeat_workspace_id', 'workspace.id', 'workspace_id');
  const collector = read('hertzbeat.collector', 'hertzbeat_collector', 'collector');
  const template = read('hertzbeat.template', 'hertzbeat_template', 'hertzbeat.monitor_template', 'hertzbeat_monitor_template', 'template');

  return [
    row('hertzbeat.event_id', eventId, eventId ? t('log.manage.attribution.event-id.present') : t('log.manage.attribution.event-id.missing')),
    row('hertzbeat.ingest_id', ingestId, ingestId ? t('log.manage.attribution.ingest-id.present') : t('log.manage.attribution.ingest-id.missing')),
    row('hertzbeat.entity_id', entityId, entityId ? t('log.manage.attribution.entity-id.present') : t('log.manage.attribution.entity-id.missing')),
    row('hertzbeat.entity_name', entityName, entityName ? t('log.manage.attribution.entity-name.present') : t('log.manage.attribution.entity-name.missing')),
    row('hertzbeat.workspace_id', workspaceId, workspaceId ? t('log.manage.attribution.workspace-id.present') : t('log.manage.attribution.workspace-id.missing')),
    row('hertzbeat.collector', collector, t('log.manage.attribution.collector')),
    row('hertzbeat.template', template, t('log.manage.attribution.template'))
  ];
}

export function buildLogExplorerRows(
  entries: LogEntry[],
  formatters: {
    bodyText: (value: unknown) => string;
    formatTime: (value?: number | string | null) => string;
    severityLabel: (entry: Partial<LogEntry>) => string;
  }
): LogExplorerRow[] {
  return entries.map((entry, index) => {
    const service =
      readAttribute(entry.resource, 'service.name') ||
      readAttribute(entry.attributes, 'service.name') ||
      '-';
    return {
      key: `${entry.timeUnixNano ?? '0'}-${entry.traceId || 'none'}-${entry.spanId || 'none'}-${index}`,
      timestamp: formatters.formatTime(entry.timeUnixNano ? entry.timeUnixNano / 1_000_000 : null),
      message: formatters.bodyText(entry.body),
      service,
      severity: formatters.severityLabel(entry),
      severityTone: logSeverityTone(formatters.severityLabel(entry)),
      traceId: entry.traceId || '-',
      spanId: entry.spanId || '-'
    };
  });
}

function normalizeTraceMetaPart(value?: string | null) {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function buildRelatedTraceRowCopy(span: Partial<TraceSpanNode>, fallbackServiceName?: string | null) {
  const serviceName = normalizeTraceMetaPart(span.serviceName) || normalizeTraceMetaPart(fallbackServiceName) || '-';
  return [
    serviceName,
    normalizeTraceMetaPart(span.status),
    normalizeTraceMetaPart(span.spanKind)
  ]
    .filter(Boolean)
    .join(' · ');
}

function firstText(...values: Array<string | undefined>) {
  return values.find(value => value != null && value.trim() !== '');
}

function readAttribute(source: Record<string, unknown> | undefined, key: string) {
  const value = source?.[key];
  return typeof value === 'string' ? value : undefined;
}

function epochMillisFromUnixNano(value: number | string | null | undefined) {
  if (value == null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) {
    return Number(BigInt(raw) / 1_000_000n);
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return Math.trunc(numeric / 1_000_000);
}

function resolveCurrentTimeWindow(logEntry?: LogEntry): [number, number] {
  const observedAt = epochMillisFromUnixNano(logEntry?.timeUnixNano);
  if (observedAt != null && observedAt > 0) {
    return [Math.max(0, observedAt - 15 * 60 * 1000), observedAt + 60 * 1000];
  }
  const end = Date.now();
  return [end - 15 * 60 * 1000, end];
}

export function buildLogHandoffLinks(
  selectedLog: LogEntry | null,
  routeContext: SignalRouteContext = {},
  options?: {
    intakeReturnTo?: string;
    intakeReturnLabel?: string;
    traceReturnTo?: string;
    traceReturnLabel?: string;
  }
) {
  const [start, end] = resolveCurrentTimeWindow(selectedLog || undefined);
  const serviceName = firstText(readAttribute(selectedLog?.resource, 'service.name'), readAttribute(selectedLog?.attributes, 'service.name'), routeContext.serviceName);
  const serviceNamespace = firstText(
    readAttribute(selectedLog?.resource, 'service.namespace'),
    readAttribute(selectedLog?.attributes, 'service.namespace'),
    routeContext.serviceNamespace
  );
  const environment = firstText(
    readAttribute(selectedLog?.resource, 'deployment.environment.name'),
    readAttribute(selectedLog?.attributes, 'deployment.environment.name'),
    routeContext.environment
  );
  const entityId = firstText(
    readAttribute(selectedLog?.resource, 'hertzbeat.entity_id'),
    readAttribute(selectedLog?.attributes, 'hertzbeat.entity_id'),
    readAttribute(selectedLog?.resource, 'hertzbeat_entity_id'),
    readAttribute(selectedLog?.attributes, 'hertzbeat_entity_id'),
    readAttribute(selectedLog?.resource, 'entity.id'),
    readAttribute(selectedLog?.attributes, 'entity.id'),
    routeContext.entityId
  );
  const entityName = firstText(
    readAttribute(selectedLog?.resource, 'hertzbeat.entity_name'),
    readAttribute(selectedLog?.attributes, 'hertzbeat.entity_name'),
    readAttribute(selectedLog?.resource, 'hertzbeat_entity_name'),
    readAttribute(selectedLog?.attributes, 'hertzbeat_entity_name'),
    readAttribute(selectedLog?.resource, 'entity.name'),
    readAttribute(selectedLog?.attributes, 'entity.name'),
    routeContext.entityName
  );
  const collector = firstText(
    readAttribute(selectedLog?.resource, 'hertzbeat.collector'),
    readAttribute(selectedLog?.attributes, 'hertzbeat.collector'),
    readAttribute(selectedLog?.resource, 'hertzbeat_collector'),
    readAttribute(selectedLog?.attributes, 'hertzbeat_collector'),
    routeContext.collector
  );
  const template = firstText(
    readAttribute(selectedLog?.resource, 'hertzbeat.template'),
    readAttribute(selectedLog?.attributes, 'hertzbeat.template'),
    readAttribute(selectedLog?.resource, 'hertzbeat_template'),
    readAttribute(selectedLog?.attributes, 'hertzbeat_template'),
    readAttribute(selectedLog?.resource, 'hertzbeat.monitor_template'),
    readAttribute(selectedLog?.attributes, 'hertzbeat.monitor_template'),
    routeContext.template
  );
  const traceId = firstText(selectedLog?.traceId, routeContext.traceId);
  const spanId = firstText(selectedLog?.spanId, routeContext.spanId);
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
    start: routeContext.start || String(start),
    end: routeContext.end || String(end)
  };

  const traceContext: SignalRouteContext = {
    ...signalContext,
    returnTo: stripReturnLabelFromHref(options?.traceReturnTo || signalContext.returnTo)
  };

  const intakeParams = new URLSearchParams();
  appendSignalRouteContext(intakeParams, signalContext);
  intakeParams.set('returnTo', stripReturnLabelFromHref(options?.intakeReturnTo || '/log/manage') || '/log/manage');
  intakeParams.set('signal', 'logs');

  const traceParams = new URLSearchParams();
  if (traceId) traceParams.set('traceId', traceId);
  if (spanId) traceParams.set('spanId', spanId);
  if (traceContext.serviceName) traceParams.set('serviceName', traceContext.serviceName);
  appendSignalRouteContext(traceParams, traceContext);
  const traceHref = traceParams.toString() ? `/trace/manage?${traceParams.toString()}` : '/trace/manage';

  const metricsParams = new URLSearchParams();
  if (traceId) metricsParams.set('traceId', traceId);
  if (spanId) metricsParams.set('spanId', spanId);
  if (serviceName) metricsParams.set('serviceName', serviceName);
  if (serviceNamespace) metricsParams.set('serviceNamespace', serviceNamespace);
  appendSignalRouteContext(metricsParams, signalContext);

  const entityParams = new URLSearchParams();
  if (serviceName) entityParams.set('search', serviceName);

  return {
    intakeHref: intakeParams.toString() ? `/ingestion/otlp?${intakeParams.toString()}` : '/ingestion/otlp',
    traceHref,
    metricsHref: `/ingestion/otlp/metrics?${metricsParams.toString()}`,
    entitiesHref: entityParams.toString() ? `/entities?${entityParams.toString()}` : '/entities',
    entityHref: buildSignalEntityHref(signalContext, serviceName),
    alertHandlingHref: buildSignalAlertHandlingHref('logs', signalContext),
    alertRulesHref: buildSignalAlertRulesHref('logs', signalContext)
  };
}

export function buildLogCodeNavigationUrl(selectedLog: LogEntry | null, hint?: CodeNavigationHint) {
  if (!hint?.repositoryUrl) return undefined;
  const searchQuery = firstText(
    readAttribute(selectedLog?.attributes, 'code.function'),
    readAttribute(selectedLog?.attributes, 'code.namespace'),
    readAttribute(selectedLog?.attributes, 'http.route'),
    readAttribute(selectedLog?.resource, 'service.name'),
    hint.searchQuery
  );
  const defaultPath = firstText(
    readAttribute(selectedLog?.attributes, 'code.filepath'),
    hint.defaultPath
  );
  return buildCodeNavigationUrl({
    ...hint,
    searchQuery,
    defaultPath
  });
}
