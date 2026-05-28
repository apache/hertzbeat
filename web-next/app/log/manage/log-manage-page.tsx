'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BellRing,
  Eye,
  ListChecks,
  PauseCircle,
  Play,
  PlayCircle,
  RotateCcw,
  Search,
  ScrollText,
  Server,
  Trash2,
  Wifi,
  WifiOff,
  Workflow
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HzActionGroup, HzAttributeDiagnostics, HzButton, HzButtonIcon, HzButtonLink, HzControlStack, HzDataTable, HzDetailAside, HzDetailBodyStack, HzDetailRows, HzEmptyState, HzInput, HzLogStreamLiveRow, HzPanelHeader, HzPanelSurface, HzScrollViewport, HzSearchFieldFrame, HzSearchFieldIcon, HzSelect, HzSignalTrendBars, HzStateNotice, HzStatCell, HzStatusBadge, HzWorkbenchLayout, type HzStatusTone } from '@hertzbeat/ui';
import { LogRelatedTraceDialog } from '../../../components/log-manage/log-related-trace-dialog';
import { LogStreamDetailDialog } from '../../../components/log-manage/log-stream-detail-dialog';
import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';
import { useI18n } from '@/components/providers/i18n-provider';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { apiMessageGet } from '@/lib/api-client';
import { bodyText, formatTime } from '@/lib/format';
import { logSeverityTone, severityLabel, type LogSeverityTone } from '@/lib/log-manage/display-mapping';
import {
  buildLogStreamUrl,
  buildLogUrls,
  resolveBrowserLogStreamUrl,
  type LogManageRouteState,
  type LogQueryState,
  type LogWorkbenchView
} from '@/lib/log-manage/query-state';
import { buildStreamItemKey, enqueuePendingStreamItem, mergeStreamBatch } from '../../../lib/log-manage/stream-buffer';
import { shouldShowStreamPauseOverlay } from '../../../lib/log-manage/stream-notices';
import { resolveStreamSelection } from '../../../lib/log-manage/stream-selection';
import {
  findSelectedStreamRowIndex,
  readStreamViewportState,
  resolveResetStreamViewportState,
  resolveStreamWindow,
  STREAM_VIEWPORT_ROW_HEIGHT
} from '../../../lib/log-manage/stream-viewport';
import {
  buildLogCodeNavigationUrl,
  buildLogAttributionDiagnostics,
  buildLogExplorerRows,
  buildLogHandoffLinks,
  buildSelectedLogFacts,
  buildSelectedLogRows,
  type LogAttributionDiagnostic
} from '@/lib/log-manage/view-model';
import { buildSignalEntityContextRows, type SignalRouteContext } from '@/lib/signal-route-context';
import { loadTraceDetailBundle } from '../../../lib/trace-manage/controller';
import { buildSelectedSpanFacts, buildTraceWaterfallRows } from '../../../lib/trace-manage/view-model';
import { resolveAppliedTimeContext, sanitizeTimeContext, type TimeContext } from '@/lib/time-context';
import type { LogEntry, LogOverview, LogTraceCoverage, LogTrendStats, PageResult, TraceDetail } from '@/lib/types';
import { buildLogManageRoute, buildResetLogManageRoute } from './route-state';

type LogManageData = {
  overview: LogOverview;
  list: PageResult<LogEntry>;
  trend: LogTrendStats;
  coverage: LogTraceCoverage;
  query: LogQueryState;
  loadStatus?: {
    state: 'degraded';
    message: string;
  };
};

type BackendLogOverview = LogOverview & {
  totalCount?: number;
  errorCount?: number;
};

export type LogManagePageProps = {
  forcedView?: LogWorkbenchView;
  showViewToggle?: boolean;
};

const EMPTY_QUERY: LogQueryState = {
  search: '',
  logContent: '',
  traceId: '',
  spanId: '',
  severityNumber: '',
  severityText: ''
};

const EMPTY_LOG_MANAGE_ROUTE_STATE: LogManageRouteState = {
  initialQuery: EMPTY_QUERY,
  currentView: 'stream',
  routeContext: {},
  shouldCleanUrl: false
};

const quickSeverityFilters = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
const maxStreamEntries = 10000;
const maxPendingStreamEntries = 1000;
const LOG_MANAGE_SETTLED_CACHE_TTL_MS = 10_000;
const LOG_MANAGE_API_TIMEOUT_MS = 3_500;

function logSeverityStatusTone(severityTone: LogSeverityTone): HzStatusTone {
  if (severityTone === 'danger') return 'critical';
  if (severityTone === 'warning') return 'warning';
  if (severityTone === 'success') return 'success';
  return 'neutral';
}

function logStreamStatusBadgeTone(status: 'connecting' | 'connected' | 'disconnected'): HzStatusTone {
  if (status === 'connected') return 'success';
  if (status === 'connecting') return 'warning';
  return 'critical';
}

function updateDraftField(field: keyof LogQueryState, value: string) {
  return (previous: LogQueryState): LogQueryState => ({
    ...previous,
    [field]: value
  });
}

function normalizeLogOverview(overview: BackendLogOverview): LogOverview {
  return {
    ...overview,
    totalLogs: overview.totalLogs ?? overview.totalCount ?? 0,
    errorLogs: overview.errorLogs ?? overview.errorCount ?? 0
  };
}

function emptyLogManageData(query: LogQueryState, message: string): LogManageData {
  return {
    overview: {
      totalLogs: 0,
      errorLogs: 0,
      distinctTraceCount: 0,
      latestObservedAt: null,
      hasActiveLog: false
    },
    list: {
      content: [],
      totalElements: 0,
      pageIndex: 0,
      pageSize: 8
    },
    trend: {
      hourlyStats: {}
    },
    coverage: {
      traceCoverage: {
        withBothTraceAndSpan: 0,
        withTrace: 0,
        withoutTrace: 0,
        withSpan: 0
      }
    },
    query,
    loadStatus: {
      state: 'degraded',
      message
    }
  };
}

function describeLogManageLoadFailure(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Log API request failed';
}

async function apiMessageGetWithTimeout<T>(path: string, timeoutMs = LOG_MANAGE_API_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Log API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      apiMessageGet<T>(path, { signal: controller.signal }),
      timeout
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

type StreamLogItem = {
  key: string;
  entry: LogEntry;
};

type DetailSelection = {
  entry: LogEntry;
  source: 'history' | 'stream';
  selectionState: 'attached' | 'detached';
};

type RelatedTracePreviewState = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  detail: TraceDetail | null;
  selectedSpanId?: string | null;
  selectedEventKey?: string | null;
  contextLog: LogEntry | null;
};

type LogManageTranslate = ReturnType<typeof useI18n>['t'];

function readLogAttribute(source: Record<string, unknown> | undefined, key: string) {
  const value = source?.[key];
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function hasExactLogEntity(entry: LogEntry | null, routeContext: SignalRouteContext) {
  return Boolean(
    routeContext.entityId ||
      readLogAttribute(entry?.resource, 'hertzbeat.entity_id') ||
      readLogAttribute(entry?.attributes, 'hertzbeat.entity_id') ||
      readLogAttribute(entry?.resource, 'hertzbeat_entity_id') ||
      readLogAttribute(entry?.attributes, 'hertzbeat_entity_id') ||
      readLogAttribute(entry?.resource, 'entity.id') ||
      readLogAttribute(entry?.attributes, 'entity.id')
  );
}

function LogEntityDetailAction({
  href,
  canOpen,
  missingEntityHandoffTitle,
  label,
  actionScope = 'detail',
  showIcon = false
}: {
  href: string;
  canOpen: boolean;
  missingEntityHandoffTitle: string;
  label: string;
  actionScope?: 'header' | 'stream-detail' | 'detail';
  showIcon?: boolean;
}) {
  const icon = showIcon ? (
    <HzButtonIcon
      icon={Workflow}
      data-log-manage-header-action-icon={actionScope === 'header' ? 'entity' : undefined}
      data-log-manage-header-action-icon-owner={actionScope === 'header' ? 'hertzbeat-ui-button-icon' : undefined}
    />
  ) : null;
  const actionScopeProps =
    actionScope === 'header'
      ? { 'data-log-manage-header-action': 'entity' }
      : actionScope === 'stream-detail'
        ? { 'data-log-manage-stream-detail-action': 'entity' }
        : { 'data-log-manage-detail-action': 'entity' };

  if (canOpen) {
    return (
      <HzButtonLink component={Link} data-log-manage-entity-action="true" href={href} size="md" {...actionScopeProps}>
        {icon}
        {label}
      </HzButtonLink>
    );
  }

  return (
    <span className="inline-flex" title={missingEntityHandoffTitle}>
      <HzButton
        data-log-manage-entity-action="true"
        data-log-manage-entity-action-disabled="missing-entity-id"
        size="md"
        disabled
        title={missingEntityHandoffTitle}
        aria-label={missingEntityHandoffTitle}
        {...actionScopeProps}
      >
        {icon}
        {label}
      </HzButton>
    </span>
  );
}

function LogAttributionDiagnosticsPanel({ rows, t }: { rows: LogAttributionDiagnostic[]; t: LogManageTranslate }) {
  if (rows.length === 0) return null;

  return (
    <HzAttributeDiagnostics
      data-log-manage-selected-attribution-diagnostics="hertzbeat-attribute-diagnostics"
      data-log-manage-selected-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
      aria-label={t('log.manage.selected.attribution.aria')}
      className="mt-4 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
      title={t('log.manage.selected.attribution.title')}
      namespaceLabel="hertzbeat.*"
      rows={rows.map(row => ({
        key: row.key,
        label: row.label,
        value: row.value,
        meta: row.meta,
        state: row.state,
        stateLabel: row.state === 'present'
          ? t('log.manage.selected.attribution.state.present')
          : t('log.manage.selected.attribution.state.missing'),
        tone: row.state === 'present' ? 'success' : 'critical',
        rowProps: { 'data-log-manage-selected-attribution-diagnostic-state': row.state },
        badgeProps: {
          'data-log-manage-attribution-diagnostic-badge-owner': 'hertzbeat-ui-status-badge',
          'data-log-manage-attribution-diagnostic-badge-state': row.state
        }
      }))}
    />
  );
}

function buildSeedStreamItemKey(entry: LogEntry, index: number) {
  return [
    entry.timeUnixNano == null ? `seed-time-${index}` : String(entry.timeUnixNano),
    entry.traceId?.trim() || 'no-trace',
    entry.spanId?.trim() || 'no-span',
    `seed-${index}`
  ].join(':');
}

function buildInitialStreamItems(entries: LogEntry[] = []) {
  return entries.slice(0, maxStreamEntries).map((entry, index) => ({
    key: buildSeedStreamItemKey(entry, index),
    entry
  }));
}

function buildAutoTraceLogDetailKey(entry: LogEntry, source: 'history' | 'stream', seed: string | number) {
  return [
    source,
    seed,
    entry.timeUnixNano == null ? 'no-time' : String(entry.timeUnixNano),
    entry.traceId?.trim() || 'no-trace',
    entry.spanId?.trim() || 'no-span'
  ].join(':');
}

function stringifyLogEntry(entry: LogEntry | null) {
  if (!entry) return '';
  try {
    return JSON.stringify(entry, null, 2);
  } catch {
    return String(entry.body ?? '');
  }
}

function resolveLogDetailTitle(entry: LogEntry | null, t: LogManageTranslate) {
  if (!entry) return t('log.manage.stream.detail.title');
  const text = bodyText(entry.body);
  return text.length > 96 ? `${text.slice(0, 96)}...` : text || t('log.manage.stream.detail.title');
}

function resolveLogDetailSubtitle(entry: LogEntry | null, t: LogManageTranslate) {
  if (!entry) return t('log.manage.stream.selected.none');
  return (
    readLogAttribute(entry.resource, 'service.name') ||
    readLogAttribute(entry.attributes, 'service.name') ||
    entry.severityText ||
    'HertzBeat Logs'
  );
}

function streamStatusCopy(status: 'connecting' | 'connected' | 'disconnected', t: LogManageTranslate) {
  if (status === 'connected') return t('log.manage.stream.status.connected');
  if (status === 'connecting') return t('log.manage.stream.status.connecting');
  return t('log.manage.stream.status.disconnected');
}

function formatTraceDurationNanos(value?: number | null) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '-';
  const millis = numeric / 1_000_000;
  if (millis >= 1000) return `${(millis / 1000).toFixed(2)} s`;
  if (millis >= 1) return `${millis.toFixed(2)} ms`;
  return `${numeric} ns`;
}

function buildTraceTimelineTicks(durationNanos?: number | null) {
  const totalNanos = Math.max(Number(durationNanos || 0), 1_000_000);
  return [0, 25, 50, 75, 100].map(percent => ({
    percent,
    label: percent === 0 ? '0 ms' : formatTraceDurationNanos((totalNanos * percent) / 100)
  }));
}

function mergeTraceDetailSpans(detail: TraceDetail, spans: TraceDetail['spans']): TraceDetail {
  return {
    ...detail,
    spans: spans.length > 0 ? spans : detail.spans || []
  };
}

function LogManageExplorer({
  data,
  query,
  draft,
  setDraft,
  applyQuery,
  resetQuery,
  switchView,
  currentView,
  showViewToggle,
  routeContext,
  timeContext,
  applyTimeContext,
  currentLogReturnHref
}: {
  data: LogManageData;
  query: LogQueryState;
  draft: LogQueryState;
  setDraft: React.Dispatch<React.SetStateAction<LogQueryState>>;
  applyQuery: (nextQuery?: LogQueryState) => void;
  resetQuery: () => void;
  switchView: (view: LogWorkbenchView) => void;
  currentView: LogWorkbenchView;
  showViewToggle: boolean;
  routeContext: SignalRouteContext;
  timeContext: TimeContext;
  applyTimeContext: (timeContext: TimeContext) => void;
  currentLogReturnHref: string;
}) {
  const { t } = useI18n();
  const rows = buildLogExplorerRows(data.list.content || [], {
    bodyText,
    formatTime,
    severityLabel
  });
  const logEntryByRowKey = useMemo(
    () => new Map(rows.map((row, index) => [row.key, data.list.content?.[index] ?? null])),
    [data.list.content, rows]
  );
  const selectedSeverity = draft.severityText.trim().toUpperCase();
  const latestObservedAt = data.overview.latestObservedAt ? formatTime(data.overview.latestObservedAt) : '-';
  const traceCoverage = data.coverage.traceCoverage?.withBothTraceAndSpan ?? 0;
  const trendBars = Object.entries(data.trend.hourlyStats || {}).slice(-12);
  const activeRow = rows[0];
  const activeEntry = data.list.content?.[0] ?? null;
  const handoffLinks = buildLogHandoffLinks(activeEntry, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref
  });
  const activeServiceName = activeEntry?.resource?.['service.name']?.toString() || activeRow?.service;
  const activeServiceNamespace = activeEntry?.resource?.['service.namespace']?.toString();
  const activeEnvironment = activeEntry?.resource?.['deployment.environment.name']?.toString();
  const activeAttributionDiagnostics = buildLogAttributionDiagnostics(activeEntry, t);
  const activeLogEvidenceRows = [
    [t('log.manage.evidence.time.title'), activeRow?.timestamp || '-', t('log.manage.evidence.time.meta')],
    [t('log.manage.evidence.severity.title'), activeRow?.severity || '-', selectedSeverity || t('log.manage.evidence.severity.current-filter')],
    [t('log.manage.evidence.body.title'), activeRow?.message || '-', t('log.manage.evidence.body.meta')],
    [t('log.manage.evidence.latest.title'), latestObservedAt, t('log.manage.evidence.latest.meta')]
  ];
  const entityContextRows = buildSignalEntityContextRows(routeContext, {
    serviceName: activeServiceName,
    serviceNamespace: activeServiceNamespace,
    environment: activeEnvironment,
    source: routeContext.source || 'OTLP'
  });
  const initialStreamItems = useMemo(() => buildInitialStreamItems(data.list.content || []), [data.list.content]);
  const [streamItems, setStreamItems] = useState<StreamLogItem[]>(() => (currentView === 'stream' ? initialStreamItems : []));
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [streamReconnectNonce, setStreamReconnectNonce] = useState(0);
  const [isStreamPaused, setIsStreamPaused] = useState(() => routeContext.live === 'false');
  const [selectedStreamKey, setSelectedStreamKey] = useState<string | null>(null);
  const [persistedStreamItem, setPersistedStreamItem] = useState<StreamLogItem | null>(null);
  const [detailSelection, setDetailSelection] = useState<DetailSelection | null>(null);
  const [relatedTracePreview, setRelatedTracePreview] = useState<RelatedTracePreviewState>({
    open: false,
    loading: false,
    error: null,
    detail: null,
    selectedSpanId: null,
    selectedEventKey: null,
    contextLog: null
  });
  const isStreamPausedRef = useRef(isStreamPaused);
  const streamSequenceRef = useRef(0);
  const streamViewportRef = useRef<HTMLDivElement | null>(null);
  const pendingStreamItemsRef = useRef<StreamLogItem[]>([]);
  const streamFlushFrameRef = useRef<number | null>(null);
  const autoOpenedTraceDetailKeyRef = useRef<string | null>(null);
  const [streamViewport, setStreamViewport] = useState(() =>
    resolveResetStreamViewportState({ viewportHeight: STREAM_VIEWPORT_ROW_HEIGHT * 7 })
  );
  const streamUrl = useMemo(() => resolveBrowserLogStreamUrl(buildLogStreamUrl(query, routeContext)), [query, routeContext]);
  const streamSelection = resolveStreamSelection({
    items: streamItems,
    selectedKey: selectedStreamKey,
    persisted: persistedStreamItem
  });
  const streamItemKeys = useMemo(() => streamItems.map(streamItem => streamItem.key), [streamItems]);
  const selectedStreamIndex = findSelectedStreamRowIndex({
    itemKeys: streamItemKeys,
    selectedKey: selectedStreamKey,
    detached: streamSelection.detached
  });
  const streamWindow = resolveStreamWindow({
    itemCount: streamItems.length,
    scrollTop: streamViewport.scrollTop,
    viewportHeight: streamViewport.viewportHeight,
    anchorIndex: streamViewport.isPinnedToLatest ? null : selectedStreamIndex
  });
  const visibleStreamItems = useMemo(
    () => (streamWindow.endIndex >= streamWindow.startIndex ? streamItems.slice(streamWindow.startIndex, streamWindow.endIndex + 1) : []),
    [streamItems, streamWindow.endIndex, streamWindow.startIndex]
  );
  const selectedStreamEntry = streamSelection.selected?.entry ?? null;
  const selectedStreamAttributionDiagnostics = buildLogAttributionDiagnostics(selectedStreamEntry, t);
  const streamHandoffLinks = buildLogHandoffLinks(selectedStreamEntry, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref
  });
  const detailLog = detailSelection?.entry ?? null;
  const detailHandoffLinks = buildLogHandoffLinks(detailLog, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref
  });
  const detailRows = buildSelectedLogRows(detailLog, t, bodyText, formatTime, severityLabel);
  const detailFacts = buildSelectedLogFacts(detailLog, t, formatTime, severityLabel);
  const detailAttributionDiagnostics = buildLogAttributionDiagnostics(detailLog, t);
  const detailJson = stringifyLogEntry(detailLog);
  const detailCodeHref = buildLogCodeNavigationUrl(detailLog);
  const relatedTraceDetail = relatedTracePreview.detail;
  const relatedTraceSelectedSpan =
    relatedTraceDetail?.spans.find(span => span.spanId === relatedTracePreview.selectedSpanId) || relatedTraceDetail?.spans[0] || null;
  const relatedTraceContextLog = relatedTracePreview.contextLog;
  const relatedTraceWorkspaceEntry: LogEntry | null =
    relatedTraceContextLog || relatedTraceDetail
      ? {
          ...(relatedTraceContextLog || {}),
          traceId: relatedTraceDetail?.traceId || relatedTraceContextLog?.traceId,
          spanId: relatedTraceSelectedSpan?.spanId || relatedTraceContextLog?.spanId
        }
      : null;
  const relatedTraceWorkspaceHref = buildLogHandoffLinks(relatedTraceWorkspaceEntry, routeContext, {
    intakeReturnTo: currentLogReturnHref,
    traceReturnTo: currentLogReturnHref
  }).traceHref;
  const relatedTraceRows = buildTraceWaterfallRows(
    relatedTraceDetail,
    relatedTraceSelectedSpan?.spanId || relatedTracePreview.selectedSpanId,
    formatTraceDurationNanos
  );
  const relatedTraceEventCount = relatedTraceRows.reduce((count, row) => count + (row.events?.length || 0), 0);
  const relatedTraceSelectedFacts = buildSelectedSpanFacts(
    relatedTraceSelectedSpan,
    relatedTraceDetail,
    t,
    formatTraceDurationNanos
  );
  const relatedTraceStageFacts = relatedTraceDetail
    ? [
        {
          label: t('log.manage.related-trace.fact.current-span'),
          value: relatedTraceSelectedSpan?.spanName || relatedTraceSelectedSpan?.spanId || relatedTraceDetail.rootSpanName || relatedTraceDetail.traceId,
          tone: 'accent' as const
        },
        {
          label: t('log.manage.related-trace.fact.error-spans'),
          value: String(relatedTraceDetail.errorSpanCount || relatedTraceRows.filter(row => row.tone === 'danger').length),
          tone: (relatedTraceDetail.errorSpanCount || relatedTraceRows.filter(row => row.tone === 'danger').length) > 0 ? ('error' as const) : ('default' as const)
        },
        {
          label: t('log.manage.related-trace.fact.events'),
          value: String(relatedTraceEventCount),
          tone: 'default' as const
        },
        {
          label: t('log.manage.related-trace.fact.links'),
          value: String((relatedTraceSelectedSpan?.links || []).length),
          tone: 'default' as const
        }
      ]
    : [];
  const missingTraceHandoffTitle = t('log.manage.handoff.trace-disabled');
  const missingFullTraceHandoffTitle = t('log.manage.handoff.full-trace-disabled');
  const missingEntityHandoffTitle = t('log.manage.handoff.entity-disabled');
  const canOpenActiveEntity = hasExactLogEntity(activeEntry, routeContext);
  const canOpenStreamEntity = hasExactLogEntity(selectedStreamEntry, routeContext);
  const canOpenDetailEntity = hasExactLogEntity(detailLog, routeContext);
  const requestedTraceId = query.traceId.trim() || routeContext.traceId?.trim() || '';

  useEffect(() => {
    setIsStreamPaused(routeContext.live === 'false');
  }, [routeContext.live]);

  useEffect(() => {
    isStreamPausedRef.current = isStreamPaused;
  }, [isStreamPaused]);

  const flushPendingStreamItems = useCallback(() => {
    streamFlushFrameRef.current = null;
    const incoming = pendingStreamItemsRef.current;
    pendingStreamItemsRef.current = [];
    if (incoming.length === 0) {
      return;
    }

    const container = streamViewportRef.current;
    const shouldHoldCurrentRows = container ? !readStreamViewportState(container).isPinnedToLatest : false;
    const nextScrollTop = shouldHoldCurrentRows && container ? container.scrollTop + incoming.length * STREAM_VIEWPORT_ROW_HEIGHT : 0;

    setStreamItems(previous => mergeStreamBatch(previous, incoming, maxStreamEntries).items);

    if (shouldHoldCurrentRows && container) {
      requestAnimationFrame(() => {
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        container.scrollTop = Math.min(nextScrollTop, maxScrollTop);
        setStreamViewport(readStreamViewportState(container));
      });
    }
  }, []);

  const schedulePendingStreamFlush = useCallback(() => {
    if (streamFlushFrameRef.current != null) {
      return;
    }

    streamFlushFrameRef.current = requestAnimationFrame(flushPendingStreamItems);
  }, [flushPendingStreamItems]);

  useEffect(() => {
    const container = streamViewportRef.current;
    if (!container || !streamViewport.isPinnedToLatest) {
      return;
    }

    if (container.scrollTop !== 0) {
      container.scrollTop = 0;
    }

    const nextViewportHeight = container.clientHeight || streamViewport.viewportHeight;
    if (streamViewport.scrollTop !== 0 || streamViewport.viewportHeight !== nextViewportHeight) {
      setStreamViewport({
        scrollTop: 0,
        viewportHeight: nextViewportHeight,
        isPinnedToLatest: true
      });
    }
  }, [streamItems.length, streamViewport.isPinnedToLatest, streamViewport.scrollTop, streamViewport.viewportHeight]);

  useEffect(() => {
    if (currentView !== 'stream') {
      setStreamStatus('disconnected');
      return undefined;
    }
    if (typeof EventSource === 'undefined') {
      setStreamStatus('disconnected');
      return undefined;
    }
    if (isStreamPaused) {
      setStreamStatus('disconnected');
      return undefined;
    }

    setStreamStatus('connecting');
    const eventSource = new EventSource(streamUrl);
    eventSource.onopen = () => {
      setStreamStatus('connected');
    };
    eventSource.onerror = () => {
      setStreamStatus('disconnected');
    };
    const handleLogEvent = (event: MessageEvent<string>) => {
      if (isStreamPausedRef.current) return;
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        const sequence = streamSequenceRef.current + 1;
        streamSequenceRef.current = sequence;
        const item = {
          key: buildStreamItemKey(entry, sequence),
          entry
        };
        const result = enqueuePendingStreamItem(pendingStreamItemsRef.current, item, maxPendingStreamEntries);
        pendingStreamItemsRef.current = result.pending;
        schedulePendingStreamFlush();
      } catch {
        // Ignore malformed stream payloads; the SSE connection should keep flowing.
      }
    };

    eventSource.addEventListener('LOG_EVENT', handleLogEvent);
    return () => {
      eventSource.removeEventListener('LOG_EVENT', handleLogEvent);
      eventSource.close();
      pendingStreamItemsRef.current = [];
      if (streamFlushFrameRef.current != null) {
        cancelAnimationFrame(streamFlushFrameRef.current);
        streamFlushFrameRef.current = null;
      }
    };
  }, [currentView, isStreamPaused, schedulePendingStreamFlush, streamReconnectNonce, streamUrl]);
  const applySeverity = (severity: string) => {
    const nextSeverity = selectedSeverity === severity ? '' : severity;
    const nextQuery = {
      ...draft,
      severityText: nextSeverity
    };
    setDraft(nextQuery);
    applyQuery(nextQuery);
  };

  const openLogDetails = (entry: LogEntry | null, source: 'history' | 'stream', selectionState: 'attached' | 'detached' = 'attached') => {
    if (!entry) return;
    setDetailSelection({ entry, source, selectionState });
  };

  useEffect(() => {
    if (!requestedTraceId || detailSelection) {
      return;
    }

    if (currentView === 'list') {
      const matchIndex = (data.list.content || []).findIndex(entry => entry.traceId?.trim() === requestedTraceId);
      if (matchIndex < 0) {
        return;
      }
      const entry = data.list.content[matchIndex];
      const key = buildAutoTraceLogDetailKey(entry, 'history', matchIndex);
      if (autoOpenedTraceDetailKeyRef.current === key) {
        return;
      }
      autoOpenedTraceDetailKeyRef.current = key;
      setDetailSelection({ entry, source: 'history', selectionState: 'attached' });
      return;
    }

    if (currentView === 'stream') {
      const item = visibleStreamItems.find(streamItem => streamItem.entry.traceId?.trim() === requestedTraceId);
      if (!item) {
        return;
      }
      const key = buildAutoTraceLogDetailKey(item.entry, 'stream', item.key);
      if (autoOpenedTraceDetailKeyRef.current === key) {
        return;
      }
      autoOpenedTraceDetailKeyRef.current = key;
      setSelectedStreamKey(item.key);
      setPersistedStreamItem(item);
      setDetailSelection({ entry: item.entry, source: 'stream', selectionState: 'attached' });
    }
  }, [currentView, data.list.content, detailSelection, requestedTraceId, visibleStreamItems]);

  const openTraceDrilldownFromLog = (
    entry: LogEntry | null,
    source: 'history' | 'stream',
    selectionState: 'attached' | 'detached' = 'attached'
  ) => {
    if (!entry?.traceId?.trim()) return;
    openLogDetails(entry, source, selectionState);
  };

  const closeRelatedTracePreview = () => {
    setRelatedTracePreview({
      open: false,
      loading: false,
      error: null,
      detail: null,
      selectedSpanId: null,
      selectedEventKey: null,
      contextLog: null
    });
  };

  const openRelatedTracePreview = async (entry: LogEntry | null) => {
    const traceId = entry?.traceId?.trim();
    if (!traceId) return;
    setRelatedTracePreview({
      open: true,
      loading: true,
      error: null,
      detail: null,
      selectedSpanId: entry.spanId || null,
      selectedEventKey: null,
      contextLog: entry
    });
    try {
      const bundle = await loadTraceDetailBundle(apiMessageGet, traceId);
      const detail = mergeTraceDetailSpans(bundle.detail, bundle.spans);
      const selectedSpanId = detail.spans.find(span => span.spanId === entry.spanId)?.spanId || detail.spans[0]?.spanId || entry.spanId || null;
      setRelatedTracePreview({
        open: true,
        loading: false,
        error: null,
        detail,
        selectedSpanId,
        selectedEventKey: null,
        contextLog: entry
      });
    } catch {
      setRelatedTracePreview({
        open: true,
        loading: false,
        error: t('log.manage.related-trace.error'),
        detail: null,
        selectedSpanId: entry.spanId || null,
        selectedEventKey: null,
        contextLog: entry
      });
    }
  };

  const selectStreamItem = (item: StreamLogItem, detached = false) => {
    setSelectedStreamKey(item.key);
    setPersistedStreamItem(item);
    openLogDetails(item.entry, 'stream', detached ? 'detached' : 'attached');
  };

  const clearStream = () => {
    setStreamItems([]);
    setSelectedStreamKey(null);
    setPersistedStreamItem(null);
    pendingStreamItemsRef.current = [];
    if (streamFlushFrameRef.current != null) {
      cancelAnimationFrame(streamFlushFrameRef.current);
      streamFlushFrameRef.current = null;
    }
    streamSequenceRef.current = 0;
    const resetViewport = resolveResetStreamViewportState({
      viewportHeight: streamViewportRef.current?.clientHeight || streamViewport.viewportHeight
    });
    setStreamViewport(resetViewport);
    if (streamViewportRef.current) {
      streamViewportRef.current.scrollTop = 0;
    }
  };

  const renderViewSwitch = () =>
    showViewToggle ? (
      <HzPanelSurface
        data-log-manage-view-switch="stream-history"
        data-log-manage-panel-surface="view-switch"
        data-log-manage-view-switch-panel-surface-owner="hertzbeat-ui-panel-surface"
        padding="view-switch"
      >
        <HzWorkbenchLayout
          as="div"
          variant="view-switch"
          data-log-manage-view-switch-layout="shared-view-switch"
          data-log-manage-view-switch-layout-owner="hertzbeat-ui-workbench-layout"
        >
          <div className="text-[12px] font-semibold text-[#8792a5]">{t('log.manage.stream.view-switch.title')}</div>
          <HzActionGroup
            layout="end-wrap"
            data-log-manage-view-toggle-group="shared-action-group"
            data-log-manage-view-toggle-group-owner="hertzbeat-ui-action-group"
          >
            <HzButton
              data-log-manage-view-toggle-control="shared-hz-button"
              data-log-manage-view-option="stream"
              data-log-manage-view-active={currentView === 'stream'}
              aria-pressed={currentView === 'stream'}
              intent={currentView === 'stream' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => switchView('stream')}
            >
              <Wifi className="h-4 w-4" aria-hidden="true" />
              {t('log.manage.stream.view.stream')}
            </HzButton>
            <HzButton
              data-log-manage-view-toggle-control="shared-hz-button"
              data-log-manage-view-option="list"
              data-log-manage-view-active={currentView === 'list'}
              aria-pressed={currentView === 'list'}
              intent={currentView === 'list' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => switchView('list')}
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              {t('log.manage.stream.view.history')}
            </HzButton>
          </HzActionGroup>
        </HzWorkbenchLayout>
      </HzPanelSurface>
    ) : null;

  const renderDetailDialog = () => (
    <LogStreamDetailDialog
      open={detailLog != null}
      onClose={() => setDetailSelection(null)}
      title={detailSelection?.source === 'stream' ? t('log.manage.stream.detail.stream-title') : t('log.manage.stream.detail.title')}
      subtitle={resolveLogDetailTitle(detailLog, t)}
      traceId={detailLog?.traceId}
      selectionState={detailSelection?.selectionState}
      warning={detailSelection?.selectionState === 'detached' ? t('log.manage.stream.detail.detached-warning') : undefined}
      facts={detailFacts}
      attributionDiagnostics={detailAttributionDiagnostics}
      badges={['JSON']}
      metaItems={[
        resolveLogDetailSubtitle(detailLog, t),
        ...(detailLog?.traceId ? [`traceId · ${detailLog.traceId}`] : [])
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {detailLog?.traceId ? (
            <HzButton
              data-log-manage-detail-dialog-action="trace"
              data-log-manage-results-open-trace-action="true"
              size="md"
              onClick={() => openRelatedTracePreview(detailLog)}
            >
              {t('log.manage.stream.action.view-trace')}
            </HzButton>
          ) : (
            <span className="inline-flex" title={missingTraceHandoffTitle}>
              <HzButton
                data-log-manage-detail-dialog-action="trace"
                data-log-manage-results-open-trace-action="true"
                data-log-manage-results-open-trace-action-disabled="missing-trace-id"
                size="md"
                disabled
                title={missingTraceHandoffTitle}
                aria-label={missingTraceHandoffTitle}
              >
                {t('log.manage.stream.action.view-trace')}
              </HzButton>
            </span>
          )}
          <HzButtonLink component={Link} data-log-manage-detail-dialog-action="metrics" href={detailHandoffLinks.metricsHref} size="md">
            {t('log.manage.stream.action.view-metrics')}
          </HzButtonLink>
          <LogEntityDetailAction
            href={detailHandoffLinks.entityHref}
            canOpen={canOpenDetailEntity}
            missingEntityHandoffTitle={missingEntityHandoffTitle}
            label={t('log.manage.route.action.entity')}
          />
          {detailCodeHref ? (
            <HzButtonLink data-log-manage-detail-dialog-action="code" href={detailCodeHref} target="_blank" rel="noreferrer" size="md">
              {t('log.manage.stream.action.view-code')}
            </HzButtonLink>
          ) : null}
        </div>
      }
      rows={detailRows}
      json={detailJson}
    />
  );

  const renderRelatedTraceDialog = () => (
    <LogRelatedTraceDialog
      open={relatedTracePreview.open}
      onClose={closeRelatedTracePreview}
      title={relatedTraceSelectedSpan?.spanName || relatedTraceDetail?.rootSpanName || relatedTraceDetail?.traceId || t('log.manage.related-trace.fallback-title')}
      subtitle={relatedTraceDetail?.serviceName || resolveLogDetailSubtitle(relatedTraceContextLog, t)}
      loading={relatedTracePreview.loading}
      error={relatedTracePreview.error}
      rows={relatedTraceRows}
      selectedKey={relatedTraceSelectedSpan?.spanId || null}
      selectedEventKey={relatedTracePreview.selectedEventKey}
      onSelect={key => setRelatedTracePreview(previous => ({ ...previous, selectedSpanId: key, selectedEventKey: null }))}
      onSelectEvent={(eventKey, rowKey) => setRelatedTracePreview(previous => ({ ...previous, selectedSpanId: rowKey || previous.selectedSpanId, selectedEventKey: eventKey }))}
      stageMeta={[
        ...(relatedTraceDetail?.traceId ? [relatedTraceDetail.traceId] : []),
        relatedTraceRows.length > 0 ? t('log.manage.related-trace.spans-count', { count: relatedTraceRows.length }) : '',
        ...(relatedTraceDetail?.durationNanos ? [formatTraceDurationNanos(relatedTraceDetail.durationNanos)] : [])
      ].filter(Boolean)}
      badges={relatedTraceDetail ? [t('log.manage.related-trace.badge')] : []}
      metaItems={relatedTraceDetail ? [`traceId · ${relatedTraceDetail.traceId}`] : []}
      stageFacts={relatedTraceStageFacts}
      timelineTicks={buildTraceTimelineTicks(relatedTraceDetail?.durationNanos)}
      selectedFacts={relatedTraceSelectedFacts}
      headerAction={
        relatedTraceWorkspaceEntry?.traceId ? (
          <HzButtonLink
            component={Link}
            data-log-related-trace-open-workspace-action="true"
            data-log-related-trace-detail-action="workspace"
            href={relatedTraceWorkspaceHref}
            size="md"
          >
            {t('log.manage.related-trace.open-workspace')}
          </HzButtonLink>
        ) : (
          <span className="inline-flex" title={missingFullTraceHandoffTitle}>
            <HzButton
              data-log-related-trace-open-workspace-action-disabled="missing-trace-id"
              data-log-related-trace-detail-action="workspace"
              size="md"
              disabled
              title={missingFullTraceHandoffTitle}
              aria-label={missingFullTraceHandoffTitle}
            >
              {t('log.manage.related-trace.open-workspace')}
            </HzButton>
          </span>
        )
      }
      emptyTitle={t('log.manage.related-trace.empty-title')}
      emptyCopy={t('log.manage.related-trace.empty-copy')}
      loadingTitle={t('log.manage.related-trace.loading-title')}
      loadingCopy={t('log.manage.related-trace.loading-copy')}
      spanLabel={t('log.manage.related-trace.span-label')}
      durationLabel={t('log.manage.related-trace.duration-label')}
      timelineLabel={t('log.manage.related-trace.timeline-label')}
    />
  );

  const renderStreamStage = () => {
    const selectedStreamRows = selectedStreamEntry
      ? buildSelectedLogRows(selectedStreamEntry, t, bodyText, formatTime, severityLabel)
      : [];
    const pauseVisible = shouldShowStreamPauseOverlay({ isPaused: isStreamPaused, itemCount: streamItems.length });
    const streamStageHeaderActions = (
      <>
        <HzStatusBadge
          data-log-manage-stream-status={streamStatus}
          data-log-manage-stream-status-badge-owner="hertzbeat-ui-status-badge"
          tone={logStreamStatusBadgeTone(streamStatus)}
          size="md"
        >
          {streamStatus === 'connected' ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
          {streamStatusCopy(streamStatus, t)}
        </HzStatusBadge>
        <HzStatusBadge data-log-manage-stream-count-badge-owner="hertzbeat-ui-status-badge" tone="neutral" size="md">
          {t('log.manage.stream.count', { count: streamItems.length })}
        </HzStatusBadge>
        <HzStatusBadge
          data-log-manage-stream-live-chip={isStreamPaused ? 'paused' : 'live'}
          data-log-manage-stream-live-badge-owner="hertzbeat-ui-status-badge"
          tone={isStreamPaused ? 'warning' : 'success'}
          size="md"
        >
          {isStreamPaused ? t('log.manage.stream.state.paused') : t('log.manage.stream.state.live')}
        </HzStatusBadge>
        <HzButton
          data-log-manage-reconnect-action="true"
          data-log-manage-stream-control="reconnect"
          size="md"
          onClick={() => setStreamReconnectNonce(value => value + 1)}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('log.manage.stream.action.reconnect')}
        </HzButton>
        <HzButton data-log-manage-stream-control="pause-toggle" size="md" onClick={() => setIsStreamPaused(value => !value)}>
          {isStreamPaused ? <PlayCircle className="h-4 w-4" aria-hidden="true" /> : <PauseCircle className="h-4 w-4" aria-hidden="true" />}
          {isStreamPaused ? t('log.manage.stream.action.resume') : t('log.manage.stream.action.pause')}
        </HzButton>
        <HzButton data-log-manage-stream-control="clear" size="md" onClick={clearStream}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('log.manage.stream.action.clear')}
        </HzButton>
      </>
    );

    return (
      <HzPanelSurface
        data-log-manage-stream-stage="hertzbeat-live-log-stream"
        data-log-manage-panel-surface="stream-stage"
        data-log-manage-stream-live-state={isStreamPaused ? 'paused' : 'live'}
        data-log-manage-stream-stage-panel-surface-owner="hertzbeat-ui-panel-surface"
        clip
      >
        <HzPanelHeader
          data-log-manage-stream-stage-header-owner="hertzbeat-ui-panel-header"
          eyebrow={t('log.manage.stream.stage.kicker')}
          title={t('log.manage.stream.stage.title')}
          actions={streamStageHeaderActions}
        />
        {pauseVisible ? (
          <HzStateNotice
            data-log-manage-stream-pause-notice-owner="hertzbeat-ui-state-notice"
            data-log-manage-stream-pause-notice="paused-buffer-visible"
            tone="warning"
            title={t('log.manage.stream.paused-copy')}
            variant="embedded"
            className="border-b border-t-0 border-[#2b3039] bg-[#17140b]"
          />
        ) : null}
        <HzWorkbenchLayout
          as="div"
          variant="stream-stage"
          data-log-manage-stream-stage-layout="shared-stream-stage"
          data-log-manage-stream-stage-layout-owner="hertzbeat-ui-workbench-layout"
        >
          <HzScrollViewport
            ref={streamViewportRef}
            variant="log-stream"
            data-log-manage-stream-viewport="virtualized-log-stream"
            data-log-manage-stream-viewport-owner="hertzbeat-ui-scroll-viewport"
            data-log-manage-stream-window={`${streamWindow.startIndex}:${streamWindow.endIndex}`}
            data-log-manage-stream-row-height={STREAM_VIEWPORT_ROW_HEIGHT}
            data-log-manage-stream-retention={`${streamItems.length}/${maxStreamEntries}`}
            onScroll={event => setStreamViewport(readStreamViewportState(event.currentTarget))}
          >
            {streamItems.length > 0 ? (
              <div className="divide-y divide-[#252b35]">
                {streamWindow.topSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: streamWindow.topSpacerHeight }} /> : null}
                {visibleStreamItems.map((item, offset) => {
                  const entry = item.entry;
                  const entryTraceId = entry.traceId || '-';
                  const selected = item.key === selectedStreamKey;
                  const rowIndex = streamWindow.startIndex + offset;
                  const streamSeverity = severityLabel(entry);
                  return (
                    <HzLogStreamLiveRow
                      key={item.key}
                      selected={selected}
                      data-log-manage-stream-row="true"
                      data-log-manage-stream-row-owner="hertzbeat-ui-log-stream-row"
                      data-log-manage-stream-row-index={rowIndex}
                      data-log-manage-stream-row-style="compact-live-row"
                      data-log-manage-stream-trace-id={entryTraceId}
                      data-log-manage-stream-selected={selected}
                      onClick={() => selectStreamItem(item)}
                      style={{ height: STREAM_VIEWPORT_ROW_HEIGHT }}
                    >
                      <HzStatusBadge
                        data-log-manage-stream-severity-tone={logSeverityTone(streamSeverity)}
                        data-log-manage-stream-severity-badge-owner="hertzbeat-ui-status-badge"
                        tone={logSeverityStatusTone(logSeverityTone(streamSeverity))}
                        className="min-w-[50px] justify-center self-center"
                      >
                        {streamSeverity}
                      </HzStatusBadge>
                      <span className="truncate font-mono text-[11px] text-[#7f8a9d]">
                        {formatTime(entry.timeUnixNano ? entry.timeUnixNano / 1_000_000 : null)}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[12px] text-[#e8edf5]">{bodyText(entry.body)}</span>
                      <span className="hidden min-w-0 items-center gap-2 text-[11px] text-[#7f8a9d] sm:flex">
                        <span className="truncate">{readLogAttribute(entry.resource, 'service.name') || 'unknown-service'}</span>
                        <span className="min-w-[72px] truncate font-mono">traceId · {entryTraceId}</span>
                      </span>
                    </HzLogStreamLiveRow>
                  );
                })}
                {streamWindow.bottomSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: streamWindow.bottomSpacerHeight }} /> : null}
              </div>
            ) : (
              <HzEmptyState
                data-log-manage-stream-empty-state="true"
                data-log-manage-stream-empty-owner="hertzbeat-ui-empty-state"
                title={t('log.manage.stream.empty.title')}
                description={t('log.manage.stream.empty.copy')}
                className="h-[520px] border-y-0 text-left"
              />
            )}
          </HzScrollViewport>
          <HzDetailAside
            data-log-manage-stream-selected-aside="shared-detail-aside"
            data-log-manage-stream-selected-aside-owner="hertzbeat-ui-detail-aside"
          >
            <HzPanelHeader
              data-log-manage-stream-selected-header-owner="hertzbeat-ui-panel-header"
              eyebrow={t('log.manage.stream.selected.title')}
              title={selectedStreamEntry ? resolveLogDetailTitle(selectedStreamEntry, t) : t('log.manage.stream.selected.none')}
              meta={streamSelection.detached ? (
                <HzStatusBadge
                  data-log-manage-stream-selected-detached-badge-owner="hertzbeat-ui-status-badge"
                  tone="warning"
                  size="xs"
                >
                  {t('log.manage.stream.selected.detached')}
                </HzStatusBadge>
              ) : null}
              className="-mx-4 -mt-4 border-x-0 border-t-0 bg-transparent"
            />
            <HzDetailBodyStack
              data-log-manage-stream-selected-body="shared-detail-body-stack"
              data-log-manage-stream-selected-body-owner="hertzbeat-ui-detail-body-stack"
            >
              {selectedStreamRows.length > 0 ? (
                <HzDetailRows
                  data-log-manage-stream-selected-detail-owner="hertzbeat-ui-detail-rows"
                  rows={selectedStreamRows}
                />
              ) : (
                <HzStateNotice
                  data-log-manage-stream-selected-helper-owner="hertzbeat-ui-state-notice"
                  data-log-manage-stream-selected-helper="selected-empty"
                  tone="info"
                  title={t('log.manage.stream.selected.helper')}
                  variant="hint"
                />
              )}
            </HzDetailBodyStack>
            <LogAttributionDiagnosticsPanel rows={selectedStreamAttributionDiagnostics} t={t} />
            <HzControlStack
              data-log-manage-stream-detail-action-stack="shared-control-stack"
              data-log-manage-stream-detail-action-stack-owner="hertzbeat-ui-control-stack"
              className="mt-4"
            >
              <HzButton
                data-log-manage-stream-detail-action="view-log"
                size="md"
                disabled={!selectedStreamEntry}
                onClick={() => openLogDetails(selectedStreamEntry, 'stream', streamSelection.detached ? 'detached' : 'attached')}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                {t('log.manage.stream.action.view-log')}
              </HzButton>
              <HzButton
                data-log-manage-results-open-trace-action="true"
                data-log-manage-open-log-detail-before-trace="true"
                data-log-manage-stream-detail-action="view-trace"
                size="md"
                disabled={!selectedStreamEntry?.traceId}
                title={!selectedStreamEntry?.traceId ? missingTraceHandoffTitle : undefined}
                aria-label={!selectedStreamEntry?.traceId ? missingTraceHandoffTitle : undefined}
                data-log-manage-results-open-trace-action-disabled={!selectedStreamEntry?.traceId ? 'missing-trace-id' : undefined}
                onClick={() => openTraceDrilldownFromLog(selectedStreamEntry, 'stream', streamSelection.detached ? 'detached' : 'attached')}
              >
                {t('log.manage.stream.action.view-trace')}
              </HzButton>
              <LogEntityDetailAction
                href={streamHandoffLinks.entityHref}
                canOpen={canOpenStreamEntity}
                missingEntityHandoffTitle={missingEntityHandoffTitle}
                label={t('log.manage.route.action.entity')}
                actionScope="stream-detail"
              />
            </HzControlStack>
          </HzDetailAside>
        </HzWorkbenchLayout>
      </HzPanelSurface>
    );
  };

  return (
    <main
      data-log-manage-route="otlp-cold-log-workbench"
      data-log-manage-style-baseline="hertzbeat-cold-matte"
      className="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6">
        <HzPanelSurface
          data-log-manage-header="cold-compact-header"
          data-log-manage-panel-surface="header"
          data-log-manage-header-padding-owner="hertzbeat-ui-panel-surface"
          padding="header"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
              <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]">{t('log.manage.route.kicker')}</p>
              <h1 className="text-[30px] font-semibold tracking-normal text-[#f4f7fb]">{t('log.manage.route.title')}</h1>
              <p className="mt-3 max-w-[780px] text-[13px] leading-6 text-[#9ca7ba]">
                {t('log.manage.route.subtitle')}
              </p>
            </div>
            <div
              data-log-manage-time-toolbar="top-right-corner"
              className="ml-auto grid w-full min-w-0 max-w-[1120px] gap-2 xl:w-auto"
            >
              <div
                data-log-manage-time-control="shared-time-context-control"
                data-log-manage-time-control-placement="top-right"
                data-log-manage-time-control-visual="narrow-top-right-rail"
                data-log-manage-time-control-fit="no-clipping"
                className="flex max-w-full justify-end"
              >
                <TimeRangeControl
                  value={timeContext}
                  labels={buildTimeRangeControlLabels(t)}
                  onApply={applyTimeContext}
                  onRefresh={() => applyTimeContext(timeContext)}
                  onReset={() => applyTimeContext({ timeRange: 'last-30m', refresh: timeContext.refresh, live: 'true', tz: timeContext.tz })}
                  showAbsoluteFields
                  variant="narrow-rail"
                  className="justify-end"
                  presetSelectProps={{ 'data-log-manage-time-range-select': 'true' }}
                  presetOptionDataAttribute="data-log-manage-time-range-preset"
                  refreshActionProps={{ 'data-log-manage-time-refresh-action': 'true' }}
                />
              </div>
              <HzActionGroup
                data-log-manage-action-row="cold-workbench-actions"
                data-log-manage-action-row-owner="hertzbeat-ui-action-group"
                data-log-manage-action-row-layout-owner="hertzbeat-ui-action-group"
                layout="full-end"
              >
                {routeContext.returnTo ? (
                  <HzButtonLink
                    component={Link}
                    data-log-manage-return-action="true"
                    data-log-manage-header-action="return-source"
                    href={routeContext.returnTo}
                    size="md"
                  >
                    <HzButtonIcon
                      icon={Workflow}
                      data-log-manage-header-action-icon="return-source"
                      data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('log.manage.route.action.return-source')}
                  </HzButtonLink>
                ) : null}
                <HzButtonLink component={Link} href={handoffLinks.intakeHref} size="md" data-log-manage-header-action="intake">
                  <HzButtonIcon
                    icon={Workflow}
                    data-log-manage-header-action-icon="intake"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.intake')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/collector" size="md" data-log-manage-header-action="collector">
                  <HzButtonIcon
                    icon={Server}
                    data-log-manage-header-action-icon="collector"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.collector')}
                </HzButtonLink>
                <LogEntityDetailAction
                  href={handoffLinks.entityHref}
                  canOpen={canOpenActiveEntity}
                  missingEntityHandoffTitle={missingEntityHandoffTitle}
                  label={t('log.manage.route.action.entity')}
                  actionScope="header"
                  showIcon
                />
                <HzButtonLink component={Link} href={handoffLinks.alertHandlingHref} size="md" data-log-manage-header-action="alerts">
                  <HzButtonIcon
                    icon={BellRing}
                    data-log-manage-header-action-icon="alerts"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.alerts')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/define" size="md" data-log-manage-header-action="templates">
                  <HzButtonIcon
                    icon={ListChecks}
                    data-log-manage-header-action-icon="templates"
                    data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.route.action.templates')}
                </HzButtonLink>
              </HzActionGroup>
            </div>
          </div>
        </HzPanelSurface>

        {renderViewSwitch()}

        <HzPanelSurface
          data-log-manage-query-bar="cold-query-row"
          data-log-manage-panel-surface="query"
          data-log-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"
          padding="query"
        >
          <div className="flex flex-wrap items-center gap-2">
            <HzSearchFieldFrame
              width="log-query"
              data-log-manage-query-search-frame="shared-search-field-frame"
              data-log-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"
              icon={(
                <HzSearchFieldIcon
                  icon={Search}
                  data-log-manage-query-search-icon="service"
                  data-log-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"
                />
              )}
            >
              <HzInput
                aria-label={t('log.manage.query.search.aria')}
                value={draft.search}
                onChange={event => setDraft(updateDraftField('search', event.target.value))}
                placeholder={t('log.manage.query.search.placeholder')}
                inset="search-icon"
                width="log-query-expression"
                data-log-manage-query-search-input="true"
                data-log-manage-query-search-input-owner="hertzbeat-ui-input"
              />
            </HzSearchFieldFrame>
            <HzSelect
              aria-label={t('log.manage.query.severity.aria')}
              value={draft.severityText || 'all'}
              onChange={event => applySeverity(event.target.value === 'all' ? '' : event.target.value)}
              width="log-severity"
              triggerTone="signal-query"
              data-log-manage-query-severity-select="shared-log-severity-select"
              data-log-manage-query-severity-select-owner="hertzbeat-ui-select"
              options={[
                { value: 'all', label: t('log.manage.query.severity.all') },
                ...quickSeverityFilters.map(severity => ({ value: severity, label: severity }))
              ]}
            />
            <HzButton data-log-manage-run-query-action="true" intent="primary" size="md" onClick={() => applyQuery()}>
              <Play className="h-4 w-4" aria-hidden="true" />
              {currentView === 'stream' ? t('log.manage.query.run.stream') : t('log.manage.query.run.history')}
            </HzButton>
            <HzButton data-log-manage-reset-action="true" intent="secondary" size="md" onClick={resetQuery}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('log.manage.query.reset')}
            </HzButton>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <HzInput
              aria-label={t('log.manage.query.trace-id')}
              value={draft.traceId}
              onChange={event => setDraft(updateDraftField('traceId', event.target.value))}
              placeholder={t('log.manage.query.trace-id')}
              width="log-query-token"
              data-log-manage-query-token-input="trace-id"
              data-log-manage-query-token-input-owner="hertzbeat-ui-input"
            />
            <HzInput
              aria-label={t('log.manage.query.span-id')}
              value={draft.spanId}
              onChange={event => setDraft(updateDraftField('spanId', event.target.value))}
              placeholder={t('log.manage.query.span-id')}
              width="log-query-token"
              data-log-manage-query-token-input="span-id"
              data-log-manage-query-token-input-owner="hertzbeat-ui-input"
            />
            <HzInput
              aria-label={t('log.manage.query.body.aria')}
              value={draft.logContent}
              onChange={event => setDraft(updateDraftField('logContent', event.target.value))}
              placeholder={t('log.manage.query.body.placeholder')}
              width="log-query-body"
              data-log-manage-query-body-input="shared-log-body-input"
              data-log-manage-query-body-input-owner="hertzbeat-ui-input"
            />
          </div>
        </HzPanelSurface>

        {data.loadStatus?.state === 'degraded' ? (
          <HzStateNotice
            data-log-manage-api-degraded="true"
            data-log-manage-api-degraded-owner="hertzbeat-ui-state-notice"
            tone="warning"
            title={t('log.manage.api.degraded.title')}
            description={t('log.manage.api.degraded.copy')}
            meta={data.loadStatus.message}
          />
        ) : null}

        {currentView === 'stream' ? renderStreamStage() : null}

        {currentView === 'list' ? (
        <HzPanelSurface
          data-log-manage-chart-band="cold-chart-band"
          data-log-manage-panel-surface="chart"
          data-log-manage-chart-padding-owner="hertzbeat-ui-panel-surface"
          padding="chart"
        >
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,160px))_minmax(0,1fr)]">
            {[
              { id: 'total', label: t('log.manage.summary.total'), value: data.overview.totalLogs },
              { id: 'errors', label: t('log.manage.summary.errors'), value: data.overview.errorLogs },
              { id: 'trace-coverage', label: t('log.manage.summary.trace-coverage'), value: traceCoverage },
              { id: 'latest', label: t('log.manage.summary.latest'), value: latestObservedAt }
            ].map(item => (
              <HzStatCell
                key={item.id}
                data-log-manage-summary-stat-owner="hertzbeat-ui-stat-cell"
                data-log-manage-summary-stat={item.id}
                label={item.label}
                value={item.value}
                variant="tile"
              />
            ))}
            <HzSignalTrendBars
              data-log-manage-signal-trend-owner="hertzbeat-ui-signal-trend-bars"
              title={t('log.manage.trend.title')}
              meta={(
                <>
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  {t('log.manage.trend.points', { count: trendBars.length || 0 })}
                </>
              )}
              bars={trendBars.map(([hour, count]) => ({
                id: hour,
                label: hour,
                value: Number(count) || 0,
                tone: 'info' as const,
                title: `${hour}: ${count}`
              }))}
            />
          </div>
        </HzPanelSurface>
        ) : null}

        {currentView === 'list' ? (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <HzPanelSurface
            data-log-manage-log-list="cold-dense-log-list"
            data-log-manage-panel-surface="table"
            data-log-manage-row-control-owner="shared-hz-button"
            className="overflow-hidden"
          >
            <HzPanelHeader
              data-log-manage-table-header-owner="hertzbeat-ui-panel-header"
              title={(
                <>
                  <ScrollText className="h-4 w-4" aria-hidden="true" />
                  {t('log.manage.list.title')}
                </>
              )}
              meta={<HzStatusBadge data-log-manage-table-count-badge-owner="hertzbeat-ui-status-badge" tone="neutral" size="xs">{t('log.manage.list.count', { count: rows.length })}</HzStatusBadge>}
            />
            <HzDataTable
              data-log-manage-table-chrome-owner="hertzbeat-ui-data-table"
              variant="embedded"
              rows={rows}
              getRowKey={row => row.key}
              selectedRowKey={activeRow?.key}
              onRowClick={row => openLogDetails(logEntryByRowKey.get(row.key) ?? null, 'history')}
              getRowProps={() => ({ 'data-log-manage-row-detail-action': 'true' })}
              emptyLabel={(
              <HzEmptyState
                data-log-manage-empty-guidance="operator-no-data-guidance"
                data-log-manage-empty-state-owner="hertzbeat-ui-empty-state"
                title={t('log.manage.empty.title')}
                description={t('log.manage.empty.copy')}
                className="h-[360px] border-y-0 text-left"
              />
              )}
              columns={[
                {
                  key: 'time',
                  header: t('log.manage.list.column.time'),
                  width: '176px',
                  render: row => <span className="font-mono text-[12px] text-[#cbd5e1]">{row.timestamp}</span>
                },
                {
                  key: 'severity',
                  header: t('log.manage.list.column.severity'),
                  width: '116px',
                  render: row => (
                    <HzStatusBadge
                      data-log-manage-severity-tone={row.severityTone}
                      data-log-manage-severity-badge-owner="hertzbeat-ui-status-badge"
                      tone={logSeverityStatusTone(row.severityTone)}
                    >
                      {row.severity}
                    </HzStatusBadge>
                  )
                },
                {
                  key: 'service',
                  header: t('log.manage.list.column.service'),
                  width: '180px',
                  render: row => <span className="font-semibold text-[#e6edf7]">{row.service}</span>
                },
                {
                  key: 'body',
                  header: t('log.manage.list.column.body'),
                  render: row => (
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12px] text-[#e8edf5]">{row.message}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7f8a9d]">
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('log.manage.stream.action.view-log')}
                      </span>
                    </span>
                  )
                },
                {
                  key: 'trace',
                  header: t('log.manage.list.column.trace'),
                  width: '220px',
                  render: row => (
                    <HzButton
                      data-log-manage-row-trace-detail-action="true"
                      data-log-manage-row-control="shared-hz-button"
                      intent="ghost"
                      size="xs"
                      disabled={row.traceId === '-'}
                      title={row.traceId === '-' ? missingTraceHandoffTitle : undefined}
                      aria-label={row.traceId === '-' ? missingTraceHandoffTitle : undefined}
                      data-log-manage-row-trace-detail-action-disabled={row.traceId === '-' ? 'missing-trace-id' : undefined}
                      onClick={() => openLogDetails(logEntryByRowKey.get(row.key) ?? null, 'history')}
                      className="max-w-[180px] justify-start truncate font-mono"
                    >
                      {row.traceId}
                    </HzButton>
                  )
                }
              ]}
            />
          </HzPanelSurface>

          <HzPanelSurface data-log-manage-detail-panel="cold-detail-panel" data-log-manage-panel-surface="detail" className="h-fit overflow-hidden">
            <HzPanelHeader
              data-log-manage-detail-header-owner="hertzbeat-ui-panel-header"
              eyebrow={t('log.manage.detail.title')}
              title={(
                <>
                  <Server className="h-4 w-4" aria-hidden="true" />
                  {activeRow?.service || t('log.manage.stream.selected.none')}
                </>
              )}
            />
            <div className="px-4 py-4">
              <HzDetailRows
                data-log-manage-detail-facts-owner="hertzbeat-ui-detail-rows"
                rows={[
                  { key: 'severity', title: t('log.manage.detail.severity'), copy: activeRow?.severity || '-' },
                  { key: 'trace-id', title: t('log.manage.detail.trace-id'), copy: activeRow?.traceId || '-' },
                  { key: 'span-id', title: t('log.manage.detail.span-id'), copy: activeRow?.spanId || '-' }
                ]}
              />
              <HzDetailRows
                data-log-manage-selected-evidence="selected-log-evidence"
                data-log-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"
                aria-label={t('log.manage.evidence.aria')}
                className="mt-4"
                heading={t('log.manage.evidence.title')}
                rows={activeLogEvidenceRows.map(([label, value, meta]) => ({
                  key: String(label),
                  title: label,
                  copy: value,
                  meta
                }))}
              />
              <HzDetailRows
                data-log-manage-entity-context="hertzbeat-signal-entity-context"
                data-log-manage-entity-context-owner="hertzbeat-ui-detail-rows"
                aria-label={t('log.manage.context.entity.aria')}
                className="mt-4"
                heading={t('log.manage.context.entity.title')}
                rows={entityContextRows.map(row => ({
                  key: row.label,
                  title: row.label,
                  copy: row.value,
                  meta: row.meta
                }))}
              />
              <LogAttributionDiagnosticsPanel rows={activeAttributionDiagnostics} t={t} />
              <HzControlStack
                data-log-manage-history-detail-action-stack="shared-control-stack"
                data-log-manage-history-detail-action-stack-owner="hertzbeat-ui-control-stack"
                className="mt-4"
              >
                <HzStateNotice
                  data-log-manage-alert-context-hint="entity-trace-alert-handoff"
                  data-log-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                  title={t('log.manage.handoff.alert-hint')}
                  variant="hint"
                />
                <HzStateNotice
                  data-log-manage-signal-handoff-hint="log-trace-metric-context"
                  data-log-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                  title={t('log.manage.handoff.signal-hint')}
                  variant="hint"
                />
                <LogEntityDetailAction
                  href={handoffLinks.entityHref}
                  canOpen={canOpenActiveEntity}
                  missingEntityHandoffTitle={missingEntityHandoffTitle}
                  label={t('log.manage.route.action.entity')}
                />
                <HzButtonLink component={Link} data-log-manage-history-detail-action="alerts" href={handoffLinks.alertHandlingHref} size="md">
                  {t('log.manage.handoff.alerts')}
                </HzButtonLink>
                <HzButton
                  data-log-manage-history-detail-action="traces"
                  data-log-manage-results-open-trace-action="true"
                  data-log-manage-open-log-detail-before-trace="true"
                  size="md"
                  disabled={!activeEntry?.traceId}
                  title={!activeEntry?.traceId ? missingTraceHandoffTitle : undefined}
                  aria-label={!activeEntry?.traceId ? missingTraceHandoffTitle : undefined}
                  data-log-manage-results-open-trace-action-disabled={!activeEntry?.traceId ? 'missing-trace-id' : undefined}
                  onClick={() => openTraceDrilldownFromLog(activeEntry, 'history')}
                >
                  {t('log.manage.handoff.traces')}
                </HzButton>
                <HzButtonLink component={Link} data-log-manage-history-detail-action="metrics" href={handoffLinks.metricsHref} size="md">
                  {t('log.manage.handoff.metrics')}
                </HzButtonLink>
                <HzButtonLink component={Link} data-log-manage-history-detail-action="entities" href={handoffLinks.entitiesHref} size="md">
                  {t('log.manage.handoff.entities')}
                </HzButtonLink>
              </HzControlStack>
            </div>
          </HzPanelSurface>
        </div>
        ) : null}
        {renderDetailDialog()}
        {renderRelatedTraceDialog()}
      </div>
    </main>
  );
}

export default function LogManagePage({
  initialRouteState,
  forcedView,
  showViewToggle = true
}: LogManagePageProps & { initialRouteState?: LogManageRouteState } = {}) {
  const logManageRouteState = initialRouteState ?? EMPTY_LOG_MANAGE_ROUTE_STATE;
  const router = useRouter();
  const [draft, setDraft] = useState<LogQueryState>(() => logManageRouteState.initialQuery);
  const [query, setQuery] = useState<LogQueryState>(() => logManageRouteState.initialQuery);
  const { t } = useI18n();
  const currentView = forcedView ?? logManageRouteState.currentView;
  const routeContext = logManageRouteState.routeContext;
  const logTimeContext = useMemo(() => sanitizeTimeContext({
    timeRange: routeContext.timeRange || 'last-30m',
    start: routeContext.start,
    end: routeContext.end,
    refresh: routeContext.refresh,
    live: routeContext.live || 'true',
    tz: routeContext.tz
  }), [routeContext]);
  const logUrls = useMemo(() => buildLogUrls(query, routeContext), [query, routeContext]);
  const logManageCacheKey = useMemo(
    () => [
      'log-manage',
      currentView,
      logUrls.overviewUrl,
      logUrls.listUrl,
      logUrls.trendUrl,
      logUrls.coverageUrl
    ].join('|'),
    [currentView, logUrls]
  );

  const buildRouteWithContext = useCallback(
    (nextQuery: LogQueryState, view: LogWorkbenchView) => buildLogManageRoute(routeContext, nextQuery, view),
    [routeContext]
  );

  useEffect(() => {
    if (logManageRouteState.shouldCleanUrl) {
      router.replace(buildLogManageRoute(routeContext, query, currentView));
    }
  }, [currentView, logManageRouteState.shouldCleanUrl, query, routeContext, router]);

  const applyLogTimeContext = useCallback((timeContext: TimeContext) => {
    const appliedContext = resolveAppliedTimeContext(timeContext, logTimeContext);
    router.replace(buildLogManageRoute(routeContext, query, currentView, appliedContext));
  }, [currentView, logTimeContext, query, routeContext, router]);

  const load = useCallback(async (): Promise<LogManageData> => {
    const { listUrl, overviewUrl, trendUrl, coverageUrl } = logUrls;
    try {
      const [overview, list, trend, coverage] = await Promise.all([
        apiMessageGetWithTimeout<BackendLogOverview>(overviewUrl),
        apiMessageGetWithTimeout<PageResult<LogEntry>>(listUrl),
        apiMessageGetWithTimeout<LogTrendStats>(trendUrl),
        apiMessageGetWithTimeout<LogTraceCoverage>(coverageUrl)
      ]);
      return { overview: normalizeLogOverview(overview), list, trend, coverage, query };
    } catch (error) {
      return emptyLogManageData(query, describeLogManageLoadFailure(error));
    }
  }, [logUrls, query]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('log.manage.loading')}
      cacheKey={logManageCacheKey}
      cacheSettledTtlMs={LOG_MANAGE_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const resetQuery = () => {
          setDraft(EMPTY_QUERY);
          setQuery(EMPTY_QUERY);
          router.replace(buildResetLogManageRoute(routeContext, currentView));
        };

        const applyQuery = (override?: LogQueryState) => {
          const nextQuery = override ? { ...override } : { ...draft };
          setQuery(nextQuery);
          router.replace(buildRouteWithContext(nextQuery, currentView));
        };

        const switchView = (view: LogWorkbenchView) => {
          router.replace(buildRouteWithContext(query, view));
        };

        return (
          <LogManageExplorer
            data={data}
            query={query}
            draft={draft}
            setDraft={setDraft}
            applyQuery={applyQuery}
            resetQuery={resetQuery}
            switchView={switchView}
            currentView={currentView}
            showViewToggle={showViewToggle}
            routeContext={routeContext}
            timeContext={logTimeContext}
            applyTimeContext={applyLogTimeContext}
            currentLogReturnHref={buildLogManageRoute(routeContext, query, currentView)}
          />
        );
      }}
    </ClientWorkbench>
  );
}
