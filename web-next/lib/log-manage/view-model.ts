import {
  appendSignalRouteContext,
  buildSignalAlertHandlingHref,
  buildSignalAlertRulesHref,
  buildSignalDashboardHref,
  buildSignalEntityHref,
  stripReturnLabelFromHref,
  type SignalAlertRuleDraftContext,
  type SignalRouteContext
} from '../signal-route-context';
import type { CodeNavigationHint, LogEntry, TraceSpanNode } from '@/lib/types';
import { buildCodeNavigationUrl } from '../code-navigation';
import { logSeverityTone, type LogSeverityTone } from './display-mapping';
import type { LogQueryState } from './query-state';

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

export type LogAttributeRow = {
  key: string;
  source: string;
  name: string;
  value: string;
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

export type LogMetricsPreviewTarget = {
  family: 'cpu' | 'memory';
  query: string;
  source: 'k8s' | 'host';
};

const LOG_K8S_METRICS_PREVIEW_TARGETS: LogMetricsPreviewTarget[] = [
  { family: 'cpu', query: 'container.cpu.usage', source: 'k8s' },
  { family: 'memory', query: 'container.memory.working_set', source: 'k8s' }
];

const LOG_HOST_METRICS_PREVIEW_TARGETS: LogMetricsPreviewTarget[] = [
  { family: 'cpu', query: 'system.cpu.utilization', source: 'host' },
  { family: 'memory', query: 'system.memory.usage', source: 'host' }
];

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

export function buildLogAttributeRows(selectedLog: LogEntry | null, t: Translator): LogAttributeRow[] {
  const rows = [
    ...buildAttributeRows('resource', selectedLog?.resource, t('log.manage.attributes.source.resource'), t),
    ...buildAttributeRows('attribute', selectedLog?.attributes, t('log.manage.attributes.source.attribute'), t)
  ].sort((left, right) => left.source.localeCompare(right.source) || left.name.localeCompare(right.name));

  if (rows.length > 0) return rows;

  return [
    {
      key: 'empty',
      source: '-',
      name: t('log.manage.attributes.empty.name'),
      value: t('log.manage.attributes.empty.value')
    }
  ];
}

function buildAttributeRows(kind: 'resource' | 'attribute', attributes: Record<string, unknown> | undefined, source: string, t: Translator): LogAttributeRow[] {
  return Object.entries(attributes || {})
    .filter(([key]) => key.trim() !== '')
    .map(([key, value]) => ({
      key: `${kind}-${key}`,
      source,
      name: key,
      value: formatLogAttributeValue(value, t)
    }));
}

function formatLogAttributeValue(value: unknown, t: Translator): string {
  if (value == null) return '-';
  if (Array.isArray(value)) {
    const values = value.map(part => formatLogAttributeValue(part, t)).filter(part => part !== '-');
    return values.length > 0 ? values.join(', ') : '-';
  }
  if (typeof value === 'object') return t('log.manage.attributes.value.object');
  return String(value);
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
    return Number(BigInt(raw) / BigInt(1000000));
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

function escapeMetricFilterValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildMetricFilterExpression(name: string, value: string | undefined) {
  const trimmedName = name.trim();
  const trimmedValue = value?.trim();
  if (!trimmedName || !trimmedValue || trimmedValue === '-') return undefined;
  return `${trimmedName}="${escapeMetricFilterValue(trimmedValue)}"`;
}

function buildTraceAttributeFilterExpression(name: string, value: string | undefined) {
  const trimmedName = name.trim();
  const trimmedValue = value?.trim();
  if (!/^[A-Za-z0-9_.:-]+$/.test(trimmedName) || !trimmedValue || trimmedValue === '-') return undefined;
  return `${trimmedName}="${escapeMetricFilterValue(trimmedValue)}"`;
}

function buildLogTraceOperationAttributeFilter(selectedLog: LogEntry | null, traceId: string | undefined, spanId: string | undefined) {
  if (traceId || spanId) return undefined;
  const httpRoute = firstText(
    readAttribute(selectedLog?.attributes, 'http.route'),
    readAttribute(selectedLog?.attributes, 'http_route')
  );
  if (httpRoute) return buildTraceAttributeFilterExpression('http.route', httpRoute);
  return buildTraceAttributeFilterExpression('span.name', readAttribute(selectedLog?.attributes, 'span.name'));
}

function buildLogMetricsResourceFilter(selectedLog: LogEntry | null) {
  const expressions = [
    buildMetricFilterExpression('k8s.namespace.name', firstText(
      readAttribute(selectedLog?.resource, 'k8s.namespace.name'),
      readAttribute(selectedLog?.attributes, 'k8s.namespace.name'),
      readAttribute(selectedLog?.resource, 'k8s_namespace_name'),
      readAttribute(selectedLog?.attributes, 'k8s_namespace_name')
    )),
    buildMetricFilterExpression('k8s.pod.name', firstText(
      readAttribute(selectedLog?.resource, 'k8s.pod.name'),
      readAttribute(selectedLog?.attributes, 'k8s.pod.name'),
      readAttribute(selectedLog?.resource, 'k8s_pod_name'),
      readAttribute(selectedLog?.attributes, 'k8s_pod_name')
    )),
    buildMetricFilterExpression('k8s.node.name', firstText(
      readAttribute(selectedLog?.resource, 'k8s.node.name'),
      readAttribute(selectedLog?.attributes, 'k8s.node.name'),
      readAttribute(selectedLog?.resource, 'k8s_node_name'),
      readAttribute(selectedLog?.attributes, 'k8s_node_name')
    )),
    buildMetricFilterExpression('k8s.container.name', firstText(
      readAttribute(selectedLog?.resource, 'k8s.container.name'),
      readAttribute(selectedLog?.attributes, 'k8s.container.name'),
      readAttribute(selectedLog?.resource, 'container.name'),
      readAttribute(selectedLog?.attributes, 'container.name'),
      readAttribute(selectedLog?.resource, 'k8s_container_name'),
      readAttribute(selectedLog?.attributes, 'k8s_container_name')
    )),
    buildMetricFilterExpression('host.name', firstText(
      readAttribute(selectedLog?.resource, 'host.name'),
      readAttribute(selectedLog?.attributes, 'host.name'),
      readAttribute(selectedLog?.resource, 'host_name'),
      readAttribute(selectedLog?.attributes, 'host_name')
    ))
  ];
  const seen = new Set<string>();
  return expressions
    .filter((expression): expression is string => Boolean(expression && !seen.has(expression) && seen.add(expression)))
    .join(' and ');
}

function metricsFilterContainsAny(filter: string, keys: string[]) {
  return keys.some(key => new RegExp(`(?:^|\\s|and\\s)${key.replace(/\./g, '\\.')}\\s*=`, 'i').test(filter));
}

function compactAlertDraftValue(value: string | null | undefined, maxLength = 160) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function buildLogSeverityAlertExpression(severityText: string | null | undefined) {
  const normalized = severityText?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (!/^[A-Z0-9_.-]+$/.test(normalized)) return null;
  return `log.severityText == '${normalized}'`;
}

function buildLogSeverityNumberAlertExpression(severityNumber: string | null | undefined) {
  const normalized = severityNumber?.trim();
  if (!normalized) return undefined;
  if (!/^\d+$/.test(normalized)) return null;
  return `log.severityNumber == ${Number(normalized)}`;
}

function escapeLogAlertStringLiteral(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildLogAlertMapAccessor(source: 'resource' | 'attributes', key: string) {
  return `log.${source}['${key}']`;
}

function buildLogContentAlertExpression(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (normalized.length > 160 || /[\r\n\t]/.test(normalized)) return null;
  return `contains(log.body, '${escapeLogAlertStringLiteral(normalized)}')`;
}

function buildLogAlertValueLiteral(value: string, quoted: boolean) {
  if (!quoted && /^-?\d+(?:\.\d+)?$/.test(value)) return value;
  return `'${escapeLogAlertStringLiteral(value)}'`;
}

function isSafeLogAlertKey(value: string) {
  return /^[A-Za-z0-9_.:-]+$/.test(value);
}

function isSafeLogAlertTextValue(value: string) {
  return value.length > 0 && value.length <= 160 && !/[\r\n\t]/.test(value);
}

function splitLogAlertFilterClauses(value: string) {
  const clauses: string[] = [];
  let quote: '"' | "'" | null = null;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') {
      depth += 1;
      continue;
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && char === ',') {
      clauses.push(value.slice(start, index).trim());
      start = index + 1;
      continue;
    }
    if (
      depth === 0
      && /\s/.test(char)
      && /\s+and\s+/i.test(value.slice(index, index + 5))
    ) {
      clauses.push(value.slice(start, index).trim());
      start = index + 5;
      index += 4;
    }
  }
  clauses.push(value.slice(start).trim());
  return clauses.filter(Boolean);
}

function splitLogAlertListValues(value: string) {
  return splitLogAlertFilterClauses(value).map(item => {
    const normalized = item.trim();
    const quotedMatch = normalized.match(/^(?:"([^"\\\r\n]*)"|'([^'\\\r\n]*)')$/);
    if (quotedMatch) {
      return { value: quotedMatch[1] ?? quotedMatch[2] ?? '', quoted: true };
    }
    if (/^[A-Za-z0-9_.:/{}-]+$/.test(normalized)) {
      return { value: normalized, quoted: false };
    }
    return null;
  });
}

function buildLogAttributeAlertExpression(source: 'resource' | 'attributes', key: string, value: string | undefined) {
  const normalizedKey = key.trim();
  const normalizedValue = value?.trim();
  if (!isSafeLogAlertKey(normalizedKey) || !normalizedValue) return undefined;
  return `${buildLogAlertMapAccessor(source, normalizedKey)} == '${escapeLogAlertStringLiteral(normalizedValue)}'`;
}

function buildLogDirectFieldAlertExpression(field: 'traceId' | 'spanId', value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (!/^[A-Za-z0-9_.:-]+$/.test(normalized)) return null;
  return `log.${field} == '${escapeLogAlertStringLiteral(normalized)}'`;
}

function parseLogFilterAlertClause(source: 'resource' | 'attributes', clause: string) {
  const normalized = clause.trim();
  if (!normalized) return undefined;

  const existsMatch = normalized.match(/^([A-Za-z0-9_.:-]+)\s+EXISTS$/i);
  if (existsMatch) {
    return `${buildLogAlertMapAccessor(source, existsMatch[1])} != ''`;
  }

  const containsMatch = normalized.match(/^([A-Za-z0-9_.:-]+)\s+CONTAINS\s*(?:"([^"\\\r\n]*)"|'([^'\\\r\n]*)'|([A-Za-z0-9_.:/{}-]+))$/i);
  if (containsMatch) {
    const key = containsMatch[1];
    const value = containsMatch[2] ?? containsMatch[3] ?? containsMatch[4] ?? '';
    if (!isSafeLogAlertKey(key) || !isSafeLogAlertTextValue(value)) {
      return undefined;
    }
    const accessor = source === 'attributes' && key.toLowerCase() === 'body'
      ? 'log.body'
      : buildLogAlertMapAccessor(source, key);
    return `contains(${accessor}, '${escapeLogAlertStringLiteral(value)}')`;
  }

  const listMatch = normalized.match(/^([A-Za-z0-9_.:-]+)\s+(NOT\s+IN|IN)\s*\(([\s\S]*)\)$/i);
  if (listMatch) {
    const values = splitLogAlertListValues(listMatch[3]);
    if (values.length === 0 || values.some(value => !value || !value.value.trim())) {
      return undefined;
    }
    const accessor = buildLogAlertMapAccessor(source, listMatch[1]);
    const isNotIn = /\bNOT\s+IN\b/i.test(listMatch[2]);
    const operator = isNotIn ? '!=' : '==';
    const joiner = isNotIn ? ' && ' : ' || ';
    return `(${values.map(value => `${accessor} ${operator} ${buildLogAlertValueLiteral(value!.value, value!.quoted)}`).join(joiner)})`;
  }

  const quotedMatch = normalized.match(/^([A-Za-z0-9_.:-]+)\s*(!=|=|:)\s*(?:"([^"\\\r\n]*)"|'([^'\\\r\n]*)')$/);
  if (quotedMatch) {
    const operator = quotedMatch[2] === '!=' ? '!=' : '==';
    return `${buildLogAlertMapAccessor(source, quotedMatch[1])} ${operator} ${buildLogAlertValueLiteral(quotedMatch[3] ?? quotedMatch[4] ?? '', true)}`;
  }

  const rawMatch = normalized.match(/^([A-Za-z0-9_.:-]+)\s*(!=|=|:)\s*([A-Za-z0-9_.:/{}-]+)$/);
  if (rawMatch) {
    const operator = rawMatch[2] === '!=' ? '!=' : '==';
    return `${buildLogAlertMapAccessor(source, rawMatch[1])} ${operator} ${buildLogAlertValueLiteral(rawMatch[3], false)}`;
  }

  return undefined;
}

function buildLogFilterAlertExpressions(source: 'resource' | 'attributes', filter: string | null | undefined) {
  const normalized = filter?.trim();
  if (!normalized) return [];

  const clauses = splitLogAlertFilterClauses(normalized);
  if (clauses.length === 0) return [];

  const expressions = clauses.map(clause => parseLogFilterAlertClause(source, clause));
  return expressions.every(Boolean) ? expressions as string[] : undefined;
}

export function buildLogAlertRuleDraft(query: LogQueryState, routeContext: SignalRouteContext = {}): SignalAlertRuleDraftContext {
  const severityExpression = buildLogSeverityAlertExpression(query.severityText);
  const severityNumberExpression = buildLogSeverityNumberAlertExpression(query.severityNumber);
  const contentExpression = buildLogContentAlertExpression(query.logContent || query.search);
  const resourceExpressions = buildLogFilterAlertExpressions('resource', query.resourceFilter);
  const attributeExpressions = buildLogFilterAlertExpressions('attributes', query.attributeFilter);
  const parts = [
    ['search', query.search],
    ['content', query.logContent],
    ['resourceFilter', query.resourceFilter],
    ['attributeFilter', query.attributeFilter],
    ['severityText', query.severityText],
    ['severityNumber', query.severityNumber],
    ['traceId', query.traceId || routeContext.traceId],
    ['spanId', query.spanId || routeContext.spanId],
    ['serviceName', routeContext.serviceName],
    ['environment', routeContext.environment]
  ]
    .map(([key, value]) => {
      const normalized = compactAlertDraftValue(value);
      return normalized ? `${key}=${normalized}` : undefined;
    })
    .filter((value): value is string => Boolean(value));
  const serviceName = compactAlertDraftValue(routeContext.serviceName);
  const routeContextExpressions = [
    buildLogAttributeAlertExpression('resource', 'service.name', routeContext.serviceName),
    buildLogAttributeAlertExpression('resource', 'service.namespace', routeContext.serviceNamespace),
    buildLogAttributeAlertExpression('resource', 'deployment.environment.name', routeContext.environment)
  ];
  const traceScopeExpressions = [
    buildLogDirectFieldAlertExpression('traceId', query.traceId || routeContext.traceId),
    buildLogDirectFieldAlertExpression('spanId', query.spanId || routeContext.spanId)
  ];
  const hasUnsafeTraceScope = traceScopeExpressions.some(expression => expression === null);
  const expression = severityExpression !== null
      && severityNumberExpression !== null
      && contentExpression !== null
      && resourceExpressions
      && attributeExpressions
      && !hasUnsafeTraceScope
    ? Array.from(new Set([
        severityExpression,
        severityNumberExpression,
        contentExpression,
        ...routeContextExpressions,
        ...traceScopeExpressions,
        ...resourceExpressions,
        ...attributeExpressions
      ].filter((value): value is string => Boolean(value)))).join(' && ') || undefined
    : undefined;
  return {
    name: serviceName ? `${serviceName} log alert` : 'Log alert',
    query: parts.join('\n'),
    queryType: 'logs',
    expression,
    ...(expression ? { template: 'Log matched: {{log.body}}' } : {})
  };
}

export function buildLogMetricsPreviewTargets(metricsHref: string | null | undefined): LogMetricsPreviewTarget[] {
  if (!metricsHref) return [];
  let filter = '';
  try {
    filter = new URL(metricsHref, 'http://localhost').searchParams.get('filter') || '';
  } catch {
    return [];
  }
  const targets = [
    ...(metricsFilterContainsAny(filter, ['k8s.pod.name', 'k8s.container.name', 'k8s.node.name', 'k8s.namespace.name'])
      ? LOG_K8S_METRICS_PREVIEW_TARGETS
      : []),
    ...(metricsFilterContainsAny(filter, ['host.name']) ? LOG_HOST_METRICS_PREVIEW_TARGETS : [])
  ];
  return targets;
}

export function buildLogHandoffLinks(
  selectedLog: LogEntry | null,
  routeContext: SignalRouteContext = {},
  options?: {
    intakeReturnTo?: string;
    intakeReturnLabel?: string;
    traceReturnTo?: string;
    traceReturnLabel?: string;
    metricsReturnTo?: string;
    metricsReturnLabel?: string;
    alertDraft?: SignalAlertRuleDraftContext;
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
  const traceOperationName = firstText(
    readAttribute(selectedLog?.attributes, 'operation.name'),
    readAttribute(selectedLog?.attributes, 'span.name'),
    routeContext.operationName
  );
  const operationName = firstText(
    traceOperationName,
    readAttribute(selectedLog?.attributes, 'http.route'),
    readAttribute(selectedLog?.attributes, 'http_route')
  );
  const metricsFilter = buildLogMetricsResourceFilter(selectedLog);
  const signalDraft = options?.alertDraft;
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
    operationName,
    returnTo: stripReturnLabelFromHref(routeContext.returnTo),
    source: routeContext.source || 'otlp',
    start: routeContext.start || String(start),
    end: routeContext.end || String(end)
  };

  const traceContext: SignalRouteContext = {
    ...signalContext,
    operationName: traceOperationName,
    returnTo: stripReturnLabelFromHref(options?.traceReturnTo || signalContext.returnTo)
  };
  const metricsContext: SignalRouteContext = {
    ...signalContext,
    returnTo: stripReturnLabelFromHref(options?.metricsReturnTo || signalContext.returnTo)
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
  const traceOperationAttributeFilter = buildLogTraceOperationAttributeFilter(selectedLog, traceId, spanId);
  if (traceOperationAttributeFilter) traceParams.set('attributeFilter', traceOperationAttributeFilter);
  const traceHref = traceParams.toString() ? `/trace/manage?${traceParams.toString()}` : '/trace/manage';

  const metricsParams = new URLSearchParams();
  if (traceId) metricsParams.set('traceId', traceId);
  if (spanId) metricsParams.set('spanId', spanId);
  if (serviceName) metricsParams.set('serviceName', serviceName);
  if (serviceNamespace) metricsParams.set('serviceNamespace', serviceNamespace);
  if (operationName) metricsParams.set('operationName', operationName);
  if (metricsFilter) metricsParams.set('filter', metricsFilter);
  appendSignalRouteContext(metricsParams, metricsContext);

  const entityParams = new URLSearchParams();
  if (serviceName) entityParams.set('search', serviceName);

  return {
    intakeHref: intakeParams.toString() ? `/ingestion/otlp?${intakeParams.toString()}` : '/ingestion/otlp',
    traceHref,
    metricsHref: `/ingestion/otlp/metrics?${metricsParams.toString()}`,
    entitiesHref: entityParams.toString() ? `/entities?${entityParams.toString()}` : '/entities',
    entityHref: buildSignalEntityHref(signalContext, serviceName),
    alertHandlingHref: buildSignalAlertHandlingHref('logs', signalContext),
    alertRulesHref: buildSignalAlertRulesHref('logs', signalContext, signalDraft),
    dashboardHref: buildSignalDashboardHref('logs', signalContext, signalDraft)
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
