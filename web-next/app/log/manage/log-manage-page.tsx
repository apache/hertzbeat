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
import { useRouter, useSearchParams } from 'next/navigation';
import { LogRelatedTraceDialog } from '../../../components/log-manage/log-related-trace-dialog';
import { LogStreamDetailDialog } from '../../../components/log-manage/log-stream-detail-dialog';
import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';
import { useI18n } from '@/components/providers/i18n-provider';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { apiMessageGet } from '@/lib/api-client';
import { bodyText, formatTime } from '@/lib/format';
import { severityLabel } from '@/lib/log-manage/display-mapping';
import {
  buildLogStreamUrl,
  buildLogUrls,
  queryStateFromParams,
  resolveBrowserLogStreamUrl,
  resolveLogWorkbenchView,
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
import { buildSignalEntityContextRows, readSignalRouteContext, type SignalRouteContext } from '@/lib/signal-route-context';
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

const quickSeverityFilters = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
const maxStreamEntries = 10000;
const maxPendingStreamEntries = 1000;

const actionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe3ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-[#3b4454] hover:bg-[#151821]';
const primaryActionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#3b4454] bg-[#18202c] px-4 text-[12px] font-semibold text-[#f2f6fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:bg-[#202938]';
const disabledActionClass =
  'inline-flex h-8 cursor-not-allowed items-center justify-center gap-2 rounded-[3px] border border-[#242a34] bg-[#0b0e13] px-3 text-[12px] font-semibold text-[#687386] opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';
const panelClass = 'rounded-[4px] border border-[#252b35] bg-[#0d1015] shadow-[0_18px_60px_rgba(0,0,0,0.28)]';
const inputClass =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#e6edf7] outline-none transition-colors placeholder:text-[#697386] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.12)]';

function severityTone(severity: string) {
  const normalized = severity.toUpperCase();
  if (normalized.includes('ERROR') || normalized.includes('FATAL')) return 'border-[#70424a] bg-[#231116] text-[#f39aa8]';
  if (normalized.includes('WARN')) return 'border-[#6f5730] bg-[#21190d] text-[#efca83]';
  if (normalized.includes('INFO')) return 'border-[#315b49] bg-[#0f211b] text-[#8bd8ad]';
  return 'border-[#303642] bg-[#151821] text-[#d7dce6]';
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
  showIcon = false
}: {
  href: string;
  canOpen: boolean;
  missingEntityHandoffTitle: string;
  showIcon?: boolean;
}) {
  const icon = showIcon ? <Workflow className="h-4 w-4" aria-hidden="true" /> : null;

  if (canOpen) {
    return (
      <Link data-log-manage-entity-action="true" href={href} className={actionClass}>
        {icon}
        实体详情
      </Link>
    );
  }

  return (
    <span className="inline-flex" title={missingEntityHandoffTitle}>
      <button
        data-log-manage-entity-action="true"
        data-log-manage-entity-action-disabled="missing-entity-id"
        type="button"
        className={disabledActionClass}
        disabled
        title={missingEntityHandoffTitle}
        aria-label={missingEntityHandoffTitle}
      >
        {icon}
        实体详情
      </button>
    </span>
  );
}

function LogAttributionDiagnosticsPanel({ rows }: { rows: LogAttributionDiagnostic[] }) {
  if (rows.length === 0) return null;

  return (
    <div
      data-log-manage-selected-attribution-diagnostics="hertzbeat-attribute-diagnostics"
      aria-label="归因诊断 hertzbeat.entity_id hertzbeat.collector hertzbeat.template"
      className="mt-4 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#8792a5]">归因诊断</p>
        <span className="text-[11px] font-semibold text-[#6d7788]">hertzbeat.*</span>
      </div>
      <div className="space-y-2">
        {rows.map(row => (
          <div
            key={row.key}
            data-log-manage-selected-attribution-diagnostic-state={row.state}
            className="grid grid-cols-[minmax(0,1fr)_52px] gap-2 text-[11px]"
          >
            <span className="min-w-0">
              <span className="block truncate font-mono font-semibold text-[#e6edf7]">{row.label}</span>
              <span className="block truncate text-[#6d7788]">{row.value} · {row.meta}</span>
            </span>
            <span
              className={`inline-flex h-5 items-center justify-center rounded-[3px] border px-1.5 font-semibold ${
                row.state === 'present'
                  ? 'border-[rgba(96,181,134,0.36)] bg-[rgba(96,181,134,0.1)] text-[rgba(120,220,160,0.95)]'
                  : 'border-[rgba(216,111,91,0.36)] bg-[rgba(216,111,91,0.1)] text-[rgba(244,154,168,0.95)]'
              }`}
            >
              {row.state === 'present' ? '已提供' : '缺失'}
            </span>
          </div>
        ))}
      </div>
    </div>
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

function resolveLogDetailTitle(entry: LogEntry | null) {
  if (!entry) return '日志详情';
  const text = bodyText(entry.body);
  return text.length > 96 ? `${text.slice(0, 96)}...` : text || '日志详情';
}

function resolveLogDetailSubtitle(entry: LogEntry | null) {
  if (!entry) return '未选择日志';
  return (
    readLogAttribute(entry.resource, 'service.name') ||
    readLogAttribute(entry.attributes, 'service.name') ||
    entry.severityText ||
    'HertzBeat Logs'
  );
}

function streamStatusCopy(status: 'connecting' | 'connected' | 'disconnected') {
  if (status === 'connected') return '已连接';
  if (status === 'connecting') return '连接中';
  return '未连接';
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

function tracePreviewTranslator(t: (key: string, params?: Record<string, string | number | null | undefined>) => string) {
  return (key: string, params?: Record<string, string | number | null | undefined>) => {
    const tracePreviewMessages: Record<string, string> = {
      'trace.manage.empty-selected-span.title': '选择一个跨度',
      'trace.manage.empty-selected-span.copy': '选择左侧跨度后查看服务、状态和事件证据。',
      'trace.manage.selected-span.service-namespace': '服务与命名空间',
      'trace.manage.trace-state-empty': '暂无链路状态'
    };
    return tracePreviewMessages[key] || t(key, params);
  };
}

function mergeTraceDetailSpans(detail: TraceDetail, spans: TraceDetail['spans']): TraceDetail {
  return {
    ...detail,
    spans: spans.length > 0 ? spans : detail.spans || []
  };
}

function hasDisplayReturnLabel(searchParams: { get(name: string): string | null }) {
  const returnTo = searchParams.get('returnTo') || '';
  return Boolean(searchParams.get('returnLabel') || returnTo.includes('returnLabel='));
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
  const selectedSeverity = draft.severityText.trim().toUpperCase();
  const latestObservedAt = data.overview.latestObservedAt ? formatTime(data.overview.latestObservedAt) : '-';
  const traceCoverage = data.coverage.traceCoverage?.withBothTraceAndSpan ?? 0;
  const trendBars = Object.entries(data.trend.hourlyStats || {}).slice(-12);
  const maxTrend = Math.max(...trendBars.map(([, count]) => Number(count) || 0), 1);
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
    ['日志时间', activeRow?.timestamp || '-', '日志写入时间'],
    ['日志级别', activeRow?.severity || '-', selectedSeverity || '当前筛选'],
    ['正文摘要', activeRow?.message || '-', '日志正文'],
    ['最近上报', latestObservedAt, '工作台最新日志']
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
    tracePreviewTranslator(t),
    formatTraceDurationNanos
  );
  const relatedTraceStageFacts = relatedTraceDetail
    ? [
        {
          label: '当前跨度',
          value: relatedTraceSelectedSpan?.spanName || relatedTraceSelectedSpan?.spanId || relatedTraceDetail.rootSpanName || relatedTraceDetail.traceId,
          tone: 'accent' as const
        },
        {
          label: '错误跨度',
          value: String(relatedTraceDetail.errorSpanCount || relatedTraceRows.filter(row => row.tone === 'danger').length),
          tone: (relatedTraceDetail.errorSpanCount || relatedTraceRows.filter(row => row.tone === 'danger').length) > 0 ? ('error' as const) : ('default' as const)
        },
        {
          label: '事件',
          value: String(relatedTraceEventCount),
          tone: 'default' as const
        },
        {
          label: '关联',
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
        error: '链路预览暂时不可用，请稍后重试或打开完整链路工作台。',
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
      <section data-log-manage-view-switch="stream-history" className={`${panelClass} px-3 py-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12px] font-semibold text-[#8792a5]">日志视图</div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              data-log-manage-view-option="stream"
              data-log-manage-view-active={currentView === 'stream'}
              onClick={() => switchView('stream')}
              className={currentView === 'stream' ? primaryActionClass : actionClass}
            >
              <Wifi className="h-4 w-4" aria-hidden="true" />
              日志流
            </button>
            <button
              type="button"
              data-log-manage-view-option="list"
              data-log-manage-view-active={currentView === 'list'}
              onClick={() => switchView('list')}
              className={currentView === 'list' ? primaryActionClass : actionClass}
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              历史检索
            </button>
          </div>
        </div>
      </section>
    ) : null;

  const renderDetailDialog = () => (
    <LogStreamDetailDialog
      open={detailLog != null}
      onClose={() => setDetailSelection(null)}
      title={detailSelection?.source === 'stream' ? '日志流详情' : '日志详情'}
      subtitle={resolveLogDetailTitle(detailLog)}
      traceId={detailLog?.traceId}
      selectionState={detailSelection?.selectionState}
      facts={detailFacts}
      attributionDiagnostics={detailAttributionDiagnostics}
      badges={['JSON']}
      metaItems={[
        resolveLogDetailSubtitle(detailLog),
        ...(detailLog?.traceId ? [`traceId · ${detailLog.traceId}`] : [])
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {detailLog?.traceId ? (
            <button
              data-log-manage-results-open-trace-action="true"
              type="button"
              className={actionClass}
              onClick={() => openRelatedTracePreview(detailLog)}
            >
              查看链路
            </button>
          ) : (
            <span className="inline-flex" title={missingTraceHandoffTitle}>
              <button
                data-log-manage-results-open-trace-action="true"
                data-log-manage-results-open-trace-action-disabled="missing-trace-id"
                type="button"
                className={disabledActionClass}
                disabled
                title={missingTraceHandoffTitle}
                aria-label={missingTraceHandoffTitle}
              >
                查看链路
              </button>
            </span>
          )}
          <Link href={detailHandoffLinks.metricsHref} className={actionClass}>
            查看指标
          </Link>
          <LogEntityDetailAction
            href={detailHandoffLinks.entityHref}
            canOpen={canOpenDetailEntity}
            missingEntityHandoffTitle={missingEntityHandoffTitle}
          />
          {detailCodeHref ? (
            <a href={detailCodeHref} target="_blank" rel="noreferrer" className={actionClass}>
              查看代码
            </a>
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
      title={relatedTraceSelectedSpan?.spanName || relatedTraceDetail?.rootSpanName || relatedTraceDetail?.traceId || '关联链路预览'}
      subtitle={relatedTraceDetail?.serviceName || resolveLogDetailSubtitle(relatedTraceContextLog)}
      loading={relatedTracePreview.loading}
      error={relatedTracePreview.error}
      rows={relatedTraceRows}
      selectedKey={relatedTraceSelectedSpan?.spanId || null}
      selectedEventKey={relatedTracePreview.selectedEventKey}
      onSelect={key => setRelatedTracePreview(previous => ({ ...previous, selectedSpanId: key, selectedEventKey: null }))}
      onSelectEvent={(eventKey, rowKey) => setRelatedTracePreview(previous => ({ ...previous, selectedSpanId: rowKey || previous.selectedSpanId, selectedEventKey: eventKey }))}
      stageMeta={[
        ...(relatedTraceDetail?.traceId ? [relatedTraceDetail.traceId] : []),
        relatedTraceRows.length > 0 ? `${relatedTraceRows.length} 个跨度` : '',
        ...(relatedTraceDetail?.durationNanos ? [formatTraceDurationNanos(relatedTraceDetail.durationNanos)] : [])
      ].filter(Boolean)}
      badges={relatedTraceDetail ? ['链路预览'] : []}
      metaItems={relatedTraceDetail ? [`traceId · ${relatedTraceDetail.traceId}`] : []}
      stageFacts={relatedTraceStageFacts}
      timelineTicks={buildTraceTimelineTicks(relatedTraceDetail?.durationNanos)}
      selectedFacts={relatedTraceSelectedFacts}
      headerAction={
        relatedTraceWorkspaceEntry?.traceId ? (
          <Link data-log-related-trace-open-workspace-action="true" href={relatedTraceWorkspaceHref} className={actionClass}>
            查看完整链路
          </Link>
        ) : (
          <span className="inline-flex" title={missingFullTraceHandoffTitle}>
            <button
              data-log-related-trace-open-workspace-action-disabled="missing-trace-id"
              type="button"
              className={disabledActionClass}
              disabled
              title={missingFullTraceHandoffTitle}
              aria-label={missingFullTraceHandoffTitle}
            >
              查看完整链路
            </button>
          </span>
        )
      }
      emptyTitle="暂无关联链路"
      emptyCopy="该日志没有可预览的链路详情。"
      loadingTitle="正在加载链路预览"
      loadingCopy="正在从当前日志上下文加载链路预览。"
      spanLabel="跨度"
      durationLabel="耗时"
      timelineLabel="时间轴"
    />
  );

  const renderStreamStage = () => {
    const selectedStreamRows = selectedStreamEntry
      ? buildSelectedLogRows(selectedStreamEntry, t, bodyText, formatTime, severityLabel)
      : [];
    const pauseVisible = shouldShowStreamPauseOverlay({ isPaused: isStreamPaused, itemCount: streamItems.length });

    return (
      <section
        data-log-manage-stream-stage="hertzbeat-live-log-stream"
        data-log-manage-stream-live-state={isStreamPaused ? 'paused' : 'live'}
        className={`${panelClass} overflow-hidden`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252b35] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#8792a5]">日志流</p>
            <h2 className="mt-1 text-[18px] font-semibold text-[#f0f4fa]">实时日志流</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-log-manage-stream-status={streamStatus}
              className={`inline-flex h-8 items-center gap-2 rounded-[3px] border px-3 text-[12px] font-semibold ${
                streamStatus === 'connected'
                  ? 'border-[#315b49] bg-[#0d1b17] text-[#8bd8ad]'
                  : streamStatus === 'connecting'
                    ? 'border-[#6f5730] bg-[#1d170d] text-[#efca83]'
                    : 'border-[#70424a] bg-[#1d1115] text-[#f39aa8]'
              }`}
            >
              {streamStatus === 'connected' ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
              {streamStatusCopy(streamStatus)}
            </span>
            <span className="inline-flex h-8 items-center rounded-[3px] border border-[#2b3039] px-3 text-[12px] font-semibold text-[#dbe3ee]">
              {streamItems.length} 条日志
            </span>
            <span
              data-log-manage-stream-live-chip={isStreamPaused ? 'paused' : 'live'}
              className={`inline-flex h-8 items-center rounded-[3px] border px-3 text-[12px] font-semibold ${
                isStreamPaused ? 'border-[#6f5730] bg-[#1d170d] text-[#efca83]' : 'border-[#315b49] bg-[#0d1b17] text-[#8bd8ad]'
              }`}
            >
              {isStreamPaused ? '已暂停' : '实时'}
            </span>
            <button
              data-log-manage-reconnect-action="true"
              type="button"
              className={actionClass}
              onClick={() => setStreamReconnectNonce(value => value + 1)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              重连
            </button>
            <button type="button" className={actionClass} onClick={() => setIsStreamPaused(value => !value)}>
              {isStreamPaused ? <PlayCircle className="h-4 w-4" aria-hidden="true" /> : <PauseCircle className="h-4 w-4" aria-hidden="true" />}
              {isStreamPaused ? '继续' : '暂停'}
            </button>
            <button type="button" className={actionClass} onClick={clearStream}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              清空
            </button>
          </div>
        </div>
        {pauseVisible ? (
          <div className="border-b border-[#2b3039] bg-[#17140b] px-4 py-2 text-[12px] font-semibold text-[#efca83]">
            日志流已暂停，新的日志会暂时留在采集链路中，继续后重新连接。
          </div>
        ) : null}
        <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            ref={streamViewportRef}
            data-log-manage-stream-viewport="virtualized-log-stream"
            data-log-manage-stream-window={`${streamWindow.startIndex}:${streamWindow.endIndex}`}
            data-log-manage-stream-row-height={STREAM_VIEWPORT_ROW_HEIGHT}
            data-log-manage-stream-retention={`${streamItems.length}/${maxStreamEntries}`}
            onScroll={event => setStreamViewport(readStreamViewportState(event.currentTarget))}
            className="hb-scrollbar max-h-[620px] overflow-auto"
          >
            {streamItems.length > 0 ? (
              <div className="divide-y divide-[#252b35]">
                {streamWindow.topSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: streamWindow.topSpacerHeight }} /> : null}
                {visibleStreamItems.map((item, offset) => {
                  const entry = item.entry;
                  const entryTraceId = entry.traceId || '-';
                  const selected = item.key === selectedStreamKey;
                  const rowIndex = streamWindow.startIndex + offset;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      data-log-manage-stream-row="true"
                      data-log-manage-stream-row-index={rowIndex}
                      data-log-manage-stream-row-style="compact-live-row"
                      data-log-manage-stream-trace-id={entryTraceId}
                      data-log-manage-stream-selected={selected}
                      onClick={() => selectStreamItem(item)}
                      style={{ height: STREAM_VIEWPORT_ROW_HEIGHT }}
                      className={`grid w-full grid-cols-[58px_minmax(0,112px)_minmax(0,1fr)] items-center gap-3 px-4 text-left transition-colors hover:bg-[#10141b] sm:grid-cols-[64px_156px_minmax(0,1fr)_180px] lg:grid-cols-[72px_176px_minmax(0,1fr)_220px] ${
                        selected ? 'bg-[#111927]' : 'bg-transparent'
                      }`}
                    >
                      <span className={`inline-flex h-5 min-w-[50px] items-center justify-center self-center rounded-[3px] border px-2 text-[11px] font-semibold ${severityTone(severityLabel(entry))}`}>
                        {severityLabel(entry)}
                      </span>
                      <span className="truncate font-mono text-[11px] text-[#7f8a9d]">
                        {formatTime(entry.timeUnixNano ? entry.timeUnixNano / 1_000_000 : null)}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[12px] text-[#e8edf5]">{bodyText(entry.body)}</span>
                      <span className="hidden min-w-0 items-center gap-2 text-[11px] text-[#7f8a9d] sm:flex">
                        <span className="truncate">{readLogAttribute(entry.resource, 'service.name') || 'unknown-service'}</span>
                        <span className="min-w-[72px] truncate font-mono">traceId · {entryTraceId}</span>
                      </span>
                    </button>
                  );
                })}
                {streamWindow.bottomSpacerHeight > 0 ? <div aria-hidden="true" style={{ height: streamWindow.bottomSpacerHeight }} /> : null}
              </div>
            ) : (
              <div data-log-manage-stream-empty-state="true" className="flex h-[520px] items-center justify-center text-center text-[13px] text-[#d5d8e1]">
                <div>
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-[4px] border border-[#2b3039] bg-[#101217]">
                    <Wifi className="h-5 w-5 text-[#9aa6b8]" aria-hidden="true" />
                  </div>
                  <p className="mt-3 font-semibold">等待实时日志</p>
                  <p className="mt-2 text-[#8f9bad]">保持连接后，Collector 和 OTLP 写入的日志会实时进入这里。</p>
                </div>
              </div>
            )}
          </div>
          <aside className="border-l border-[#252b35] bg-[#0b0e13] px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-[#8792a5]">选中日志</p>
              {streamSelection.detached ? <span className="text-[11px] font-semibold text-[#efca83]">已脱离缓冲</span> : null}
            </div>
            <h3 className="mt-2 line-clamp-2 text-[16px] font-semibold text-[#f0f4fa]">
              {selectedStreamEntry ? resolveLogDetailTitle(selectedStreamEntry) : '未选择日志'}
            </h3>
            <div className="mt-4 space-y-2">
              {selectedStreamRows.length > 0 ? (
                selectedStreamRows.map(row => (
                  <div key={row.title} className="rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-2">
                    <p className="truncate text-[11px] font-semibold text-[#8792a5]">{row.title}</p>
                    <p className="mt-1 truncate text-[12px] font-semibold text-[#e6edf7]">{row.copy}</p>
                    <p className="mt-1 truncate text-[11px] text-[#6d7788]">{row.meta}</p>
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-[#7f8a9d]">点击任意日志查看完整内容、链路和实体上下文。</p>
              )}
            </div>
            <LogAttributionDiagnosticsPanel rows={selectedStreamAttributionDiagnostics} />
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className={actionClass}
                disabled={!selectedStreamEntry}
                onClick={() => openLogDetails(selectedStreamEntry, 'stream', streamSelection.detached ? 'detached' : 'attached')}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                查看日志
              </button>
              <button
                data-log-manage-results-open-trace-action="true"
                data-log-manage-open-log-detail-before-trace="true"
                type="button"
                className={selectedStreamEntry?.traceId ? actionClass : disabledActionClass}
                disabled={!selectedStreamEntry?.traceId}
                title={!selectedStreamEntry?.traceId ? missingTraceHandoffTitle : undefined}
                aria-label={!selectedStreamEntry?.traceId ? missingTraceHandoffTitle : undefined}
                data-log-manage-results-open-trace-action-disabled={!selectedStreamEntry?.traceId ? 'missing-trace-id' : undefined}
                onClick={() => openTraceDrilldownFromLog(selectedStreamEntry, 'stream', streamSelection.detached ? 'detached' : 'attached')}
              >
                查看链路
              </button>
              <LogEntityDetailAction
                href={streamHandoffLinks.entityHref}
                canOpen={canOpenStreamEntity}
                missingEntityHandoffTitle={missingEntityHandoffTitle}
              />
            </div>
          </aside>
        </div>
      </section>
    );
  };

  return (
    <main
      data-log-manage-route="otlp-cold-log-workbench"
      data-log-manage-style-baseline="hertzbeat-cold-matte"
      className="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6">
        <section data-log-manage-header="cold-compact-header" className={`${panelClass} px-5 py-4`}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
              <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]">可观测</p>
              <h1 className="text-[30px] font-semibold tracking-normal text-[#f4f7fb]">日志工作台</h1>
              <p className="mt-3 max-w-[780px] text-[13px] leading-6 text-[#9ca7ba]">
                围绕采集来源、实体、链路和告警处理筛选日志，把实时流、历史检索和上下文排查放在同一工作台。
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
              <div data-log-manage-action-row="cold-workbench-actions" className="flex flex-wrap items-center justify-end gap-2">
                <Link href={handoffLinks.intakeHref} className={actionClass}>
                  <Workflow className="h-4 w-4" aria-hidden="true" />
                  返回 OTLP 接入
                </Link>
                <Link href="/setting/collector" className={actionClass}>
                  <Server className="h-4 w-4" aria-hidden="true" />
                  采集集群
                </Link>
                <LogEntityDetailAction
                  href={handoffLinks.entityHref}
                  canOpen={canOpenActiveEntity}
                  missingEntityHandoffTitle={missingEntityHandoffTitle}
                  showIcon
                />
                <Link href={handoffLinks.alertHandlingHref} className={actionClass}>
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                  告警处理
                </Link>
                <Link href="/setting/define" className={actionClass}>
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  监控模板
                </Link>
              </div>
            </div>
          </div>
        </section>

        {renderViewSwitch()}

        <section data-log-manage-query-bar="cold-query-row" className={`${panelClass} px-4 py-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[320px] max-w-[560px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8798]" aria-hidden="true" />
              <Input
                aria-label="日志查询"
                value={draft.search}
                onChange={event => setDraft(updateDraftField('search', event.target.value))}
                placeholder='service.name = "checkout"'
                className={`${inputClass} w-full pl-9 font-mono`}
              />
            </div>
            <Select aria-label="严重级别" value={draft.severityText || 'all'} onChange={event => applySeverity(event.target.value === 'all' ? '' : event.target.value)} containerClassName="w-[132px]" className="h-8 min-w-0 text-[#d5dce8]">
              <option value="all">全部级别</option>
              {quickSeverityFilters.map(severity => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </Select>
            <button data-log-manage-run-query-action="true" type="button" className={primaryActionClass} onClick={() => applyQuery()}>
              <Play className="h-4 w-4" aria-hidden="true" />
              {currentView === 'stream' ? '应用到日志流' : '运行查询'}
            </button>
            <button type="button" className={actionClass} onClick={resetQuery}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              重置
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              aria-label="链路 ID"
              value={draft.traceId}
              onChange={event => setDraft(updateDraftField('traceId', event.target.value))}
              placeholder="链路 ID"
              className={`${inputClass} w-[220px] font-mono`}
            />
            <Input
              aria-label="跨度 ID"
              value={draft.spanId}
              onChange={event => setDraft(updateDraftField('spanId', event.target.value))}
              placeholder="跨度 ID"
              className={`${inputClass} w-[220px] font-mono`}
            />
            <Input
              aria-label="日志正文"
              value={draft.logContent}
              onChange={event => setDraft(updateDraftField('logContent', event.target.value))}
              placeholder="搜索日志正文"
              className={`${inputClass} min-w-[280px] max-w-[520px] flex-1`}
            />
          </div>
        </section>

        {currentView === 'stream' ? renderStreamStage() : null}

        {currentView === 'list' ? (
        <section data-log-manage-chart-band="cold-chart-band" className={`${panelClass} px-4 py-4`}>
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,160px))_minmax(0,1fr)]">
            {[
              ['日志总数', data.overview.totalLogs],
              ['错误日志', data.overview.errorLogs],
              ['链路关联', traceCoverage],
              ['最近时间', latestObservedAt]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3">
                <p className="text-[12px] font-semibold text-[#8792a5]">{label}</p>
                <p className="mt-2 truncate text-[18px] font-semibold text-[#f2f6fb]">{value}</p>
              </div>
            ))}
            <div className="min-w-0 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3">
              <div className="mb-3 flex items-center justify-between text-[12px] text-[#8792a5]">
                <span className="font-semibold">趋势带</span>
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  {trendBars.length || 0} 点
                </span>
              </div>
              <div className="flex h-16 items-end gap-2">
                {(trendBars.length ? trendBars : [['-', 0]]).map(([hour, count]) => (
                  <div key={hour} className="min-w-0 flex-1">
                    <div
                      className="rounded-[3px] border border-[#2f3b4d] bg-[#182232]"
                      style={{ height: `${Math.max(10, (Number(count) / maxTrend) * 64)}px` }}
                      title={`${hour}: ${count}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {currentView === 'list' ? (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <section data-log-manage-log-list="cold-dense-log-list" className={`${panelClass} min-w-0 overflow-hidden`}>
            <div className="flex h-11 items-center justify-between border-b border-[#252b35] px-4 text-[12px] text-[#8e99ab]">
              <span className="inline-flex items-center gap-2">
                <ScrollText className="h-4 w-4" aria-hidden="true" />
                最近日志
              </span>
              <span>{rows.length} 条</span>
            </div>
            {rows.length ? (
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="border-b border-[#252b35] bg-[#10141b] text-[12px] font-semibold text-[#8f9aab]">
                  <tr>
                    <th className="w-[176px] px-4 py-3">时间</th>
                    <th className="w-[116px] px-4 py-3">严重级别</th>
                    <th className="w-[180px] px-4 py-3">服务</th>
                    <th className="px-4 py-3">日志正文</th>
                    <th className="w-[220px] px-4 py-3">链路</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const entry = data.list.content?.[index] ?? null;
                    return (
                      <tr
                        key={row.key}
                        data-log-manage-row-detail-action="true"
                        role="button"
                        tabIndex={0}
                        onClick={() => openLogDetails(entry, 'history')}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openLogDetails(entry, 'history');
                          }
                        }}
                        className="cursor-pointer border-b border-[#232a34] last:border-b-0 hover:bg-[#10141b]"
                      >
                        <td className="px-4 py-3 font-mono text-[12px] text-[#cbd5e1]">{row.timestamp}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold ${severityTone(row.severity)}`}>
                            {row.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#e6edf7]">{row.service}</td>
                        <td className="min-w-0 px-4 py-3">
                          <span className="block truncate font-mono text-[12px] text-[#e8edf5]">{row.message}</span>
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7f8a9d]">
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            查看日志
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#9aa6b8]">
                          <button
                            data-log-manage-row-trace-detail-action="true"
                            type="button"
                            disabled={row.traceId === '-'}
                            title={row.traceId === '-' ? missingTraceHandoffTitle : undefined}
                            aria-label={row.traceId === '-' ? missingTraceHandoffTitle : undefined}
                            data-log-manage-row-trace-detail-action-disabled={row.traceId === '-' ? 'missing-trace-id' : undefined}
                            onClick={event => {
                              event.stopPropagation();
                              openLogDetails(entry, 'history');
                            }}
                            className="text-left hover:text-[#d7e2ff] disabled:cursor-not-allowed disabled:text-[#5d6674]"
                          >
                            {row.traceId}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex h-[360px] items-center justify-center text-center text-[13px] text-[#d5d8e1]">
                <div>
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-[4px] border border-[#2b3039] bg-[#101217]">
                    <ScrollText className="h-5 w-5 text-[#9aa6b8]" aria-hidden="true" />
                  </div>
                  <p className="mt-3 font-semibold">暂无日志</p>
                  <p data-log-manage-empty-guidance="operator-no-data-guidance" className="mt-2 text-[#8f9bad]">
                    确认时间范围、实体归因、采集器和监控模板后再查看日志。
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside data-log-manage-detail-panel="cold-detail-panel" className={`${panelClass} h-fit px-4 py-4`}>
            <p className="text-[12px] font-semibold text-[#8d98aa]">详情面板</p>
            <h2 className="mt-2 truncate text-[18px] font-semibold text-[#f0f4fa]">{activeRow?.service || '未选择日志'}</h2>
            <div className="mt-4 space-y-3 text-[12px] text-[#9aa6b8]">
              <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                <span>严重级别</span>
                <span className="font-semibold text-[#dbe5f3]">{activeRow?.severity || '-'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                <span>链路 ID</span>
                <span className="max-w-[190px] truncate font-mono font-semibold text-[#dbe5f3]">{activeRow?.traceId || '-'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                <span>跨度 ID</span>
                <span className="max-w-[190px] truncate font-mono font-semibold text-[#dbe5f3]">{activeRow?.spanId || '-'}</span>
              </div>
            </div>
            <div
              data-log-manage-selected-evidence="selected-log-evidence"
              aria-label="日志证据 日志时间 日志级别 正文摘要 最近上报"
              className="mt-4 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-[#8792a5]">日志证据</p>
                <span className="text-[11px] font-semibold text-[#6d7788]">当前选中</span>
              </div>
              <div className="space-y-2">
                {activeLogEvidenceRows.map(([label, value, meta]) => (
                  <div key={label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-[11px]">
                    <span className="text-[#7f8a9d]">{label}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#e6edf7]">{value}</span>
                      <span className="block truncate text-[#6d7788]">{meta}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div
              data-log-manage-entity-context="hertzbeat-signal-entity-context"
              aria-label="实体上下文 当前实体 监控实例 当前服务 链路上下文 当前环境 时间范围 采集来源"
              className="mt-4 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[11px] font-semibold text-[#8792a5]">实体上下文</p>
              </div>
              <div className="space-y-2">
                {entityContextRows.map(row => (
                  <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-[11px]">
                    <span className="text-[#7f8a9d]">{row.label}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#e6edf7]">{row.value}</span>
                      <span className="block truncate text-[#6d7788]">{row.meta}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <LogAttributionDiagnosticsPanel rows={activeAttributionDiagnostics} />
            <div className="mt-4 flex flex-col gap-2">
              <p
                data-log-manage-alert-context-hint="entity-trace-alert-handoff"
                className="rounded-[3px] border border-[#252b35] bg-[#10141b] px-2.5 py-2 text-[11px] leading-4 text-[#8792a5]"
              >
                按当前实体、服务和已带入的链路上下文查看相关告警
              </p>
              <p
                data-log-manage-signal-handoff-hint="log-trace-metric-context"
                className="rounded-[3px] border border-[#252b35] bg-[#10141b] px-2.5 py-2 text-[11px] leading-4 text-[#8792a5]"
              >
                当前日志的链路、跨度和服务上下文会带入链路与指标工作台
              </p>
              <LogEntityDetailAction
                href={handoffLinks.entityHref}
                canOpen={canOpenActiveEntity}
                missingEntityHandoffTitle={missingEntityHandoffTitle}
              />
              <Link href={handoffLinks.alertHandlingHref} className={actionClass}>
                告警处理
              </Link>
              <button
                data-log-manage-results-open-trace-action="true"
                data-log-manage-open-log-detail-before-trace="true"
                type="button"
                className={activeEntry?.traceId ? actionClass : disabledActionClass}
                disabled={!activeEntry?.traceId}
                title={!activeEntry?.traceId ? missingTraceHandoffTitle : undefined}
                aria-label={!activeEntry?.traceId ? missingTraceHandoffTitle : undefined}
                data-log-manage-results-open-trace-action-disabled={!activeEntry?.traceId ? 'missing-trace-id' : undefined}
                onClick={() => openTraceDrilldownFromLog(activeEntry, 'history')}
              >
                查看链路
              </button>
              <Link href={handoffLinks.metricsHref} className={actionClass}>
                查看指标
              </Link>
              <Link href={handoffLinks.entitiesHref} className={actionClass}>
                对象目录
              </Link>
            </div>
          </aside>
        </div>
        ) : null}
        {renderDetailDialog()}
        {renderRelatedTraceDialog()}
      </div>
    </main>
  );
}

export default function LogManagePage({
  forcedView,
  showViewToggle = true
}: LogManagePageProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [draft, setDraft] = useState<LogQueryState>(() => queryStateFromParams(searchParams));
  const [query, setQuery] = useState<LogQueryState>(() => queryStateFromParams(searchParams));
  const { t } = useI18n();
  const currentView = forcedView ?? resolveLogWorkbenchView(searchParams);
  const routeContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const logTimeContext = useMemo(() => sanitizeTimeContext({
    timeRange: routeContext.timeRange || 'last-30m',
    start: routeContext.start,
    end: routeContext.end,
    refresh: routeContext.refresh,
    live: routeContext.live || 'true',
    tz: routeContext.tz
  }), [routeContext]);

  const buildRouteWithContext = useCallback(
    (nextQuery: LogQueryState, view: LogWorkbenchView) => buildLogManageRoute(searchParams, nextQuery, view),
    [searchParams]
  );

  useEffect(() => {
    if (hasDisplayReturnLabel(searchParams)) {
      router.replace(buildLogManageRoute(searchParams, query, currentView));
    }
  }, [currentView, query, router, searchParams]);

  const applyLogTimeContext = useCallback((timeContext: TimeContext) => {
    const appliedContext = resolveAppliedTimeContext(timeContext, logTimeContext);
    router.replace(buildLogManageRoute(searchParams, query, currentView, appliedContext));
  }, [currentView, logTimeContext, query, router, searchParams]);

  const load = useCallback(async (): Promise<LogManageData> => {
    const { listUrl, overviewUrl, trendUrl, coverageUrl } = buildLogUrls(query, routeContext);
    const [overview, list, trend, coverage] = await Promise.all([
      apiMessageGet<BackendLogOverview>(overviewUrl),
      apiMessageGet<PageResult<LogEntry>>(listUrl),
      apiMessageGet<LogTrendStats>(trendUrl),
      apiMessageGet<LogTraceCoverage>(coverageUrl)
    ]);
    return { overview: normalizeLogOverview(overview), list, trend, coverage, query };
  }, [query, routeContext]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('log.manage.loading')}>
      {data => {
        const resetQuery = () => {
          setDraft(EMPTY_QUERY);
          setQuery(EMPTY_QUERY);
          router.replace(buildResetLogManageRoute(searchParams, currentView));
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
            currentLogReturnHref={buildLogManageRoute(searchParams, query, currentView)}
          />
        );
      }}
    </ClientWorkbench>
  );
}
