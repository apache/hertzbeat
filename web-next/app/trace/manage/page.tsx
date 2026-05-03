'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, BellRing, GitBranch, ListChecks, Play, RotateCcw, Search, Server, Timer, Workflow } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiMessageGet } from '@/lib/api-client';
import { formatDurationNanos, formatTime } from '@/lib/format';
import { buildTraceUrls, queryStateFromParams, type TraceQueryState } from '@/lib/trace-manage/query-state';
import {
  buildSelectedSpanEventRows,
  buildSelectedSpanFacts,
  buildSelectedSpanLinkRows,
  buildTraceAttributionDiagnostics,
  buildTraceExplorerRows,
  buildTraceHandoffLinks,
  buildTraceWaterfallRows
} from '@/lib/trace-manage/view-model';
import { buildSignalEntityContextRows, readEpochMillisRouteParam, readSignalRouteContext, type SignalRouteContext } from '@/lib/signal-route-context';
import { resolveAppliedTimeContext, sanitizeTimeContext, type TimeContext } from '@/lib/time-context';
import type { PageResult, TraceDetail, TraceListItem, TraceOverview } from '@/lib/types';
import { ObservabilityStatusState, ObservabilityWaterfall, type ObservabilityWaterfallTick } from '../../../components/observability';
import { OverlayDialog } from '../../../components/workbench/overlay-dialog';
import { RowList } from '../../../components/workbench/workbench-page';
import { loadTraceDetailBundle } from '../../../lib/trace-manage/controller';
import { buildResetTraceManageRoute, buildTraceManageRoute } from './route-state';

type TraceManageData = {
  overview: TraceOverview;
  list: PageResult<TraceListItem>;
};

const emptyTraceQuery: TraceQueryState = {
  traceId: '',
  spanId: '',
  serviceName: '',
  errorOnly: false
};

type TraceDetailDrawerState = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  detail: TraceDetail | null;
  selectedSpanId?: string | null;
  selectedEventKey?: string | null;
};

const actionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe3ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-[#3b4454] hover:bg-[#151821]';
const primaryActionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#3b4454] bg-[#18202c] px-4 text-[12px] font-semibold text-[#f2f6fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:bg-[#202938]';
const disabledActionClass =
  'inline-flex h-8 cursor-not-allowed items-center justify-center gap-2 rounded-[3px] border border-[#242a34] bg-[#0b0e13] px-3 text-[12px] font-semibold text-[#687386] opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]';
const panelClass = 'rounded-[4px] border border-[#252b35] bg-[#0d1015] shadow-[0_18px_60px_rgba(0,0,0,0.28)]';
const inputClass =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#e6edf7] outline-none transition-colors placeholder:text-[#697386] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.12)]';

function hasNavigationId(value?: string | null) {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== '-');
}

function firstNavigationId(...values: Array<string | null | undefined>) {
  return values.find(hasNavigationId);
}

function readTraceAttribute(source: Record<string, string> | undefined, key: string) {
  return firstNavigationId(source?.[key]);
}

function updateDraftField(field: keyof TraceQueryState, value: string | boolean) {
  return (previous: TraceQueryState): TraceQueryState => ({
    ...previous,
    [field]: value
  });
}

function buildTraceReturnHref(searchParams: URLSearchParams, query: TraceQueryState) {
  return buildTraceManageRoute(searchParams, query);
}

function mergeTraceDetailSpans(detail: TraceDetail, spans: TraceDetail['spans']): TraceDetail {
  return {
    ...detail,
    spans: spans.length > 0 ? spans : detail.spans || []
  };
}

function buildTraceTimelineTicks(durationNanos?: number | null): ObservabilityWaterfallTick[] {
  const totalNanos = Math.max(Number(durationNanos || 0), 1_000_000);
  return [0, 25, 50, 75, 100].map(percent => ({
    percent,
    label: percent === 0 ? '0 ms' : formatDurationNanos((totalNanos * percent) / 100)
  }));
}

function hasDisplayReturnLabel(searchParams: { get(name: string): string | null }) {
  const returnTo = searchParams.get('returnTo') || '';
  return Boolean(searchParams.get('returnLabel') || returnTo.includes('returnLabel='));
}

function hasUnsanitizedTraceTimeBounds(searchParams: { get(name: string): string | null }) {
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  return Boolean(
    (start && readEpochMillisRouteParam(start) !== start.trim()) ||
      (end && readEpochMillisRouteParam(end) !== end.trim())
  );
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes('ERROR')) return 'border-[#70424a] bg-[#231116] text-[#f39aa8]';
  if (normalized.includes('OK')) return 'border-[#315b49] bg-[#0f211b] text-[#8bd8ad]';
  return 'border-[#303642] bg-[#151821] text-[#d7dce6]';
}

type TraceAttributionDiagnosticRow = ReturnType<typeof buildTraceAttributionDiagnostics>[number];

function TraceAttributionDiagnostics({ rows }: { rows: TraceAttributionDiagnosticRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div
      data-trace-manage-attribution-diagnostics="hertzbeat-attribute-diagnostics"
      aria-label="归因诊断 hertzbeat.entity_id hertzbeat.entity_name hertzbeat.workspace_id hertzbeat.collector hertzbeat.template"
      className="rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#8792a5]">归因诊断</p>
        <span className="text-[11px] font-semibold text-[#6d7788]">hertzbeat.*</span>
      </div>
      <div className="space-y-2">
        {rows.map(row => (
          <div
            key={row.key}
            data-trace-manage-attribution-diagnostic-state={row.state}
            className="grid grid-cols-[minmax(0,1fr)_52px] gap-2 text-[11px]"
          >
            <span className="min-w-0">
              <span className="block truncate font-mono font-semibold text-[#e6edf7]">{row.label}</span>
              <span className="block truncate text-[#6d7788]">
                {row.value} · {row.meta}
              </span>
            </span>
            <span
              className={`inline-flex h-5 items-center justify-center rounded-[3px] border px-1.5 font-semibold ${
                row.state === 'present' ? 'border-[#24543b] bg-[#0d241a] text-[#76d69b]' : 'border-[#4a3140] bg-[#24111a] text-[#d68aa6]'
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

type TraceWaterfallRow = ReturnType<typeof buildTraceWaterfallRows>[number];
type TraceWaterfallEventSelection = {
  row: TraceWaterfallRow;
  event: NonNullable<TraceWaterfallRow['events']>[number];
};

function findTraceWaterfallEvent(rows: TraceWaterfallRow[], eventKey?: string | null): TraceWaterfallEventSelection | null {
  if (!eventKey) return null;
  for (const row of rows) {
    const event = row.events?.find(item => item.key === eventKey);
    if (event) return { row, event };
  }
  return null;
}

function buildTraceWaterfallEventFacts(selection: TraceWaterfallEventSelection) {
  const { row, event } = selection;
  return [
    {
      title: '跨度事件',
      copy: event.label || '未命名事件',
      meta: '不是新的跨度，是当前跨度上的时间点'
    },
    {
      title: '所属跨度',
      copy: row.title || row.key,
      meta: row.detailLabel || row.copy
    },
    {
      title: '事件位置',
      copy: event.offsetLabel || `${Math.round(event.leftPct)}%`,
      meta: '相对链路时间轴'
    },
    {
      title: '事件属性',
      copy: event.attributesLabel || '无属性',
      meta: 'attributes'
    }
  ];
}

function chartHeight(index: number, total: number, isError: boolean) {
  const base = 26 + ((index * 17 + total * 9) % 48);
  return `${Math.min(86, base + (isError ? 14 : 0))}%`;
}

function TraceWaterfallDrawer({
  state,
  routeContext,
  currentTraceReturnHref,
  onClose,
  onSelectSpan,
  onSelectEvent
}: {
  state: TraceDetailDrawerState;
  routeContext: SignalRouteContext;
  currentTraceReturnHref: string;
  onClose: () => void;
  onSelectSpan: (spanId: string) => void;
  onSelectEvent: (eventKey: string | null, spanId?: string) => void;
}) {
  const { t } = useI18n();
  const detail = state.detail;
  const selectedSpan = detail?.spans.find(span => span.spanId === state.selectedSpanId) || detail?.spans[0] || null;
  const detailEntityId = firstNavigationId(
    routeContext.entityId,
    readTraceAttribute(detail?.resourceAttributes, 'hertzbeat.entity_id'),
    readTraceAttribute(selectedSpan?.resourceAttributes, 'hertzbeat.entity_id')
  );
  const handoffRouteContext = detailEntityId && !routeContext.entityId ? { ...routeContext, entityId: detailEntityId } : routeContext;
  const attributionDiagnostics = buildTraceAttributionDiagnostics(detail, selectedSpan, handoffRouteContext, t);
  const waterfallRows = buildTraceWaterfallRows(detail, selectedSpan?.spanId || state.selectedSpanId, formatDurationNanos);
  const selectedSpanFacts = buildSelectedSpanFacts(selectedSpan, detail, t, formatDurationNanos);
  const selectedSpanEvents = buildSelectedSpanEventRows(selectedSpan, formatTime);
  const selectedSpanLinks = buildSelectedSpanLinkRows(selectedSpan);
  const selectedTraceEvent = findTraceWaterfallEvent(waterfallRows, state.selectedEventKey);
  const handoffLinks = buildTraceHandoffLinks(detail, selectedSpan, handoffRouteContext, {
    intakeReturnTo: currentTraceReturnHref,
    logsReturnTo: currentTraceReturnHref
  });
  const traceEventCount = waterfallRows.reduce((count, row) => count + (row.events?.length || 0), 0);
  const missingTraceHandoffTitle = t('trace.manage.handoff.logs-disabled');
  const missingEntityHandoffTitle = t('trace.manage.handoff.entity-disabled');
  const canOpenLogs = hasNavigationId(detail?.traceId);
  const canOpenEntity = handoffLinks.entityHref.startsWith('/entities/');
  const selectedFacts = selectedTraceEvent ? buildTraceWaterfallEventFacts(selectedTraceEvent) : [
    ...selectedSpanFacts,
    ...selectedSpanEvents.map(row => ({ ...row, title: `事件 · ${row.title}` })),
    ...selectedSpanLinks.map(row => ({ ...row, title: `关联 · ${row.title}` }))
  ];
  const showSelectedSpan = () => onSelectEvent(null, selectedTraceEvent?.row.key);

  return (
    <OverlayDialog
      open={state.open}
      onClose={onClose}
      placement="right"
      maxWidthClassName="max-w-[1120px]"
      kicker="链路详情"
      title={selectedSpan?.spanName || detail?.rootSpanName || detail?.traceId || '链路瀑布'}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {canOpenLogs ? (
            <Link data-trace-manage-open-logs-action="true" href={handoffLinks.logsHref} className={actionClass}>
              查看日志
            </Link>
          ) : (
            <span className="inline-flex" title={missingTraceHandoffTitle}>
              <button
                data-trace-manage-open-logs-action="true"
                data-trace-manage-open-logs-action-disabled="missing-trace-id"
                type="button"
                className={disabledActionClass}
                disabled
                title={missingTraceHandoffTitle}
                aria-label={missingTraceHandoffTitle}
              >
                查看日志
              </button>
            </span>
          )}
          <Link href={handoffLinks.metricsHref} className={actionClass}>
            查看指标
          </Link>
          {canOpenEntity ? (
            <Link href={handoffLinks.entityHref} className={actionClass}>
              实体详情
            </Link>
          ) : (
            <span className="inline-flex" title={missingEntityHandoffTitle}>
              <button
                data-trace-manage-entity-action-disabled="missing-entity-id"
                type="button"
                className={disabledActionClass}
                disabled
                title={missingEntityHandoffTitle}
                aria-label={missingEntityHandoffTitle}
              >
                实体详情
              </button>
            </span>
          )}
        </div>
      }
    >
      <div data-trace-manage-detail-drawer="waterfall-side-modal" className="grid gap-4">
        {state.loading ? (
          <ObservabilityStatusState title="正在加载链路详情" copy="正在加载该链路的 Span、事件、关联关系和关联日志。" />
        ) : state.error ? (
          <ObservabilityStatusState title="加载链路详情失败" copy={state.error} tone="danger" />
        ) : detail ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--ops-text-secondary)]">
              <span className="font-mono">{detail.traceId}</span>
              <span>{waterfallRows.length} 个跨度</span>
              <span>{formatDurationNanos(detail.durationNanos)}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                 ['当前跨度', selectedSpan?.spanName || selectedSpan?.spanId || detail.rootSpanName || '-'],
                 ['错误跨度', String(detail.errorSpanCount || waterfallRows.filter(row => row.tone === 'danger').length)],
                 ['事件', String(traceEventCount)],
                 ['关联', String((selectedSpan?.links || []).length)]
               ].map(([label, value]) => (
                <article key={label} className="rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]">{label}</p>
                  <p className="mt-1 truncate text-[13px] font-semibold text-[var(--ops-text-primary)]">{value}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
              <ObservabilityWaterfall
                rows={waterfallRows}
                spanLabel="跨度"
                durationLabel="耗时"
                timelineLabel="时间轴"
                timelineTicks={buildTraceTimelineTicks(detail.durationNanos)}
                selectedEventKey={state.selectedEventKey}
                onSelect={onSelectSpan}
                onSelectEvent={onSelectEvent}
              />
              <div className="grid gap-3">
                <TraceAttributionDiagnostics rows={attributionDiagnostics} />
                {selectedTraceEvent ? (
                  <div
                    data-trace-manage-event-detail="span-event-detail"
                    className="flex items-center justify-between gap-3 border-b border-[#252b35] pb-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#8792a5]">事件详情</p>
                      <p className="mt-1 truncate text-[13px] font-semibold text-[#e6edf7]">{selectedTraceEvent.event.label}</p>
                      <p data-trace-manage-event-detail-copy="span-event-not-span" className="mt-0.5 text-[11px] text-[#8792a5]">
                        不是新的跨度，是当前跨度上的时间点
                      </p>
                    </div>
                    <button type="button" className="text-[11px] font-semibold text-[#8f9bad] hover:text-[#f2f6fb]" onClick={showSelectedSpan}>
                      查看跨度
                    </button>
                  </div>
                ) : null}
                <RowList rows={selectedFacts} />
              </div>
            </div>
          </>
        ) : (
          <ObservabilityStatusState title="选择一条链路" copy="从链路列表打开详情后，会在这里展示 waterfall 和跨度证据。" />
        )}
      </div>
    </OverlayDialog>
  );
}

function TraceExplorer({
  data,
  draft,
  setDraft,
  applyQuery,
  resetQuery,
  routeContext,
  timeContext,
  applyTimeContext,
  currentTraceReturnHref
}: {
  data: TraceManageData;
  draft: TraceQueryState;
  setDraft: React.Dispatch<React.SetStateAction<TraceQueryState>>;
  applyQuery: (nextQuery?: TraceQueryState) => void;
  resetQuery: () => void;
  routeContext: SignalRouteContext;
  timeContext: TimeContext;
  applyTimeContext: (timeContext: TimeContext) => void;
  currentTraceReturnHref: string;
}) {
  const { t } = useI18n();
  const rows = useMemo(() => buildTraceExplorerRows(data.list.content || [], formatDurationNanos, formatTime), [data.list.content]);
  const selectedTrace = useMemo(
    () =>
      rows[0] ?? {
        key: draft.traceId || 'trace-empty',
        traceId: draft.traceId || '-',
        rootSpanId: draft.spanId || '-',
        name: draft.traceId ? '过滤链路' : '等待查询',
        service: draft.serviceName || routeContext.serviceName || '-',
        namespace: routeContext.serviceNamespace || '-',
        duration: '-',
        status: draft.errorOnly ? 'ERROR' : 'UNSET',
        startTime: '-'
      },
    [
      draft.errorOnly,
      draft.serviceName,
      draft.spanId,
      draft.traceId,
      routeContext.serviceName,
      routeContext.serviceNamespace,
      rows
    ]
  );
  const handoffLinks = buildTraceHandoffLinks(null, null, routeContext, {
    traceId: selectedTrace.traceId !== '-' ? selectedTrace.traceId : draft.traceId || undefined,
    spanId: selectedTrace.rootSpanId !== '-' ? selectedTrace.rootSpanId : draft.spanId || undefined,
    serviceName: selectedTrace.service !== '-' ? selectedTrace.service : draft.serviceName || routeContext.serviceName || undefined,
    serviceNamespace: selectedTrace.namespace !== '-' ? selectedTrace.namespace : routeContext.serviceNamespace || undefined,
    environment: routeContext.environment,
    intakeReturnTo: currentTraceReturnHref,
    logsReturnTo: currentTraceReturnHref
  });
  const missingTraceHandoffTitle = t('trace.manage.handoff.logs-disabled');
  const missingEntityHandoffTitle = t('trace.manage.handoff.entity-disabled');
  const canOpenLogs = hasNavigationId(selectedTrace.traceId) || hasNavigationId(draft.traceId) || hasNavigationId(routeContext.traceId);
  const canOpenEntity = hasNavigationId(routeContext.entityId);
  const entityContextRows = buildSignalEntityContextRows(routeContext, {
    serviceName: selectedTrace.service !== '-' ? selectedTrace.service : draft.serviceName,
    serviceNamespace: selectedTrace.namespace !== '-' ? selectedTrace.namespace : routeContext.serviceNamespace,
    environment: routeContext.environment,
    traceId: selectedTrace.traceId !== '-' ? selectedTrace.traceId : draft.traceId,
    spanId: selectedTrace.rootSpanId !== '-' ? selectedTrace.rootSpanId : draft.spanId,
    source: routeContext.source || 'OTLP'
  });
  const routeAttributionDiagnostics = buildTraceAttributionDiagnostics(null, null, routeContext, t);
  const latestObservedAt = data.overview.latestObservedAt ? formatTime(data.overview.latestObservedAt) : '-';
  const chartRows = rows.length ? rows.slice(0, 10) : [selectedTrace];
  const activeTraceId = selectedTrace.traceId !== '-' ? selectedTrace.traceId : '未选择';
  const selectedTraceEvidenceRows = [
    ['链路 ID', activeTraceId, 'traceId'],
    ['链路状态', selectedTrace.status, draft.errorOnly ? '仅看错误链路' : '当前筛选'],
    ['开始时间', selectedTrace.startTime, '根跨度开始'],
    ['最近上报', latestObservedAt, '工作台最新链路']
  ];
  const [traceDetailDrawer, setTraceDetailDrawer] = useState<TraceDetailDrawerState>({
    open: false,
    loading: false,
    error: null,
    detail: null,
    selectedSpanId: null,
    selectedEventKey: null
  });
  const autoOpenedTraceDetailKeyRef = useRef<string | null>(null);
  const requestedTraceId = firstNavigationId(draft.traceId, routeContext.traceId);
  const requestedSpanId = firstNavigationId(draft.spanId, routeContext.spanId);

  const closeTraceDetailDrawer = () => {
    setTraceDetailDrawer({
      open: false,
      loading: false,
      error: null,
      detail: null,
      selectedSpanId: null,
      selectedEventKey: null
    });
  };

  const openTraceDetailDrawer = useCallback(async (row: typeof rows[number], preferredSpanId?: string | null) => {
    const traceId = row.traceId?.trim();
    if (!traceId || traceId === '-') return;
    const initialSelectedSpanId = firstNavigationId(preferredSpanId, row.rootSpanId) || null;
    setTraceDetailDrawer({
      open: true,
      loading: true,
      error: null,
      detail: null,
      selectedSpanId: initialSelectedSpanId,
      selectedEventKey: null
    });
    try {
      const bundle = await loadTraceDetailBundle(apiMessageGet, traceId);
      const detail = mergeTraceDetailSpans(bundle.detail, bundle.spans);
      const selectedSpanId = firstNavigationId(
        detail.spans.find(span => span.spanId === preferredSpanId)?.spanId,
        detail.spans.find(span => span.spanId === row.rootSpanId)?.spanId,
        detail.spans[0]?.spanId,
        row.rootSpanId
      ) || null;
      setTraceDetailDrawer({
        open: true,
        loading: false,
        error: null,
        detail,
        selectedSpanId,
        selectedEventKey: null
      });
    } catch {
      setTraceDetailDrawer({
        open: true,
        loading: false,
        error: '链路详情暂时不可用，请重试或调整查询条件。',
        detail: null,
        selectedSpanId: initialSelectedSpanId,
        selectedEventKey: null
      });
    }
  }, []);

  useEffect(() => {
    if (!requestedTraceId || traceDetailDrawer.open) return;
    const traceRow = rows.find(row => row.traceId === requestedTraceId) || (selectedTrace.traceId === requestedTraceId ? selectedTrace : null);
    if (!traceRow || !hasNavigationId(traceRow.traceId)) return;

    const autoOpenKey = `${traceRow.traceId}:${requestedSpanId || traceRow.rootSpanId || ''}`;
    if (autoOpenedTraceDetailKeyRef.current === autoOpenKey) return;

    autoOpenedTraceDetailKeyRef.current = autoOpenKey;
    void openTraceDetailDrawer(traceRow, requestedSpanId);
  }, [openTraceDetailDrawer, requestedSpanId, requestedTraceId, rows, selectedTrace, traceDetailDrawer.open]);

  return (
    <main
      data-trace-manage-route="otlp-cold-trace-workbench"
      data-trace-manage-style-baseline="hertzbeat-cold-matte"
      className="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6">
        <section data-trace-manage-header="cold-compact-header" className={`${panelClass} px-5 py-4`}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
              <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]">可观测</p>
	              <h1 className="text-[30px] font-semibold tracking-normal text-[#f4f7fb]">链路工作台</h1>
	              <p className="mt-3 max-w-[820px] text-[13px] leading-6 text-[#9ca7ba]">
	                按服务、链路 ID、跨度 ID 和错误状态筛选链路，直接查看趋势、列表和详情。
	              </p>
            </div>
            <div
              data-trace-manage-time-toolbar="top-right-corner"
              className="ml-auto grid w-full min-w-0 max-w-[1120px] gap-2 xl:w-auto"
            >
              <div
                data-trace-manage-time-control="shared-time-context-control"
                data-trace-manage-time-control-placement="top-right"
                data-trace-manage-time-control-visual="narrow-top-right-rail"
                data-trace-manage-time-control-fit="no-clipping"
                className="flex max-w-full justify-end"
              >
                <TimeRangeControl
                  value={timeContext}
                  labels={buildTimeRangeControlLabels(t)}
                  onApply={applyTimeContext}
                  onRefresh={() => applyTimeContext(timeContext)}
                  onReset={() => applyTimeContext({ timeRange: 'last-30m', refresh: timeContext.refresh, live: 'false', tz: timeContext.tz })}
                  showAbsoluteFields
                  variant="narrow-rail"
                  className="justify-end"
                  presetSelectProps={{ 'data-trace-manage-time-range-select': 'true' }}
                  presetOptionDataAttribute="data-trace-manage-time-range-preset"
                  refreshActionProps={{ 'data-trace-manage-time-refresh-action': 'true' }}
                />
              </div>
              <div data-trace-manage-action-row="cold-workbench-actions" className="flex flex-wrap items-center justify-end gap-2">
                {routeContext.returnTo ? (
                  <Link data-trace-manage-return-action="true" href={routeContext.returnTo} className={actionClass}>
                    <Workflow className="h-4 w-4" aria-hidden="true" />
                    返回来源
                  </Link>
                ) : null}
                <Link href={handoffLinks.intakeHref} className={actionClass}>
                  <Workflow className="h-4 w-4" aria-hidden="true" />
                  返回 OTLP 接入
                </Link>
                <Link href="/setting/collector" className={actionClass}>
                  <Server className="h-4 w-4" aria-hidden="true" />
                  采集集群
                </Link>
                {canOpenEntity ? (
                  <Link href={handoffLinks.entityHref} className={actionClass}>
                    <Workflow className="h-4 w-4" aria-hidden="true" />
                    实体详情
                  </Link>
                ) : (
                  <span className="inline-flex" title={missingEntityHandoffTitle}>
                    <button
                      data-trace-manage-entity-action-disabled="missing-entity-id"
                      type="button"
                      className={disabledActionClass}
                      disabled
                      title={missingEntityHandoffTitle}
                      aria-label={missingEntityHandoffTitle}
                    >
                      <Workflow className="h-4 w-4" aria-hidden="true" />
                      实体详情
                    </button>
                  </span>
                )}
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

        <section data-trace-manage-query-bar="cold-query-row" className={`${panelClass} px-4 py-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[280px] max-w-[420px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8798]" aria-hidden="true" />
              <Input
                aria-label="服务名称"
                placeholder="服务名称"
                value={draft.serviceName}
                onChange={event => setDraft(updateDraftField('serviceName', event.target.value))}
                data-trace-manage-service-input="true"
                className={`${inputClass} w-full pl-9`}
              />
            </div>
            <Input
              aria-label="链路 ID"
              value={draft.traceId}
              onChange={event => setDraft(updateDraftField('traceId', event.target.value))}
              placeholder="链路 ID"
              data-trace-manage-trace-id-input="true"
              className={`${inputClass} w-[240px] font-mono`}
            />
            <Input
              aria-label="跨度 ID"
              value={draft.spanId}
              onChange={event => setDraft(updateDraftField('spanId', event.target.value))}
              placeholder="跨度 ID"
              className={`${inputClass} w-[220px] font-mono`}
            />
            <Select
              aria-label="链路状态"
              value={draft.errorOnly ? 'error' : 'all'}
              onChange={event => setDraft(updateDraftField('errorOnly', event.target.value === 'error'))}
              data-trace-manage-status-filter="true"
              containerClassName="w-[120px]"
              className="h-8 min-w-0 text-[#d5dce8]"
            >
              <option value="all">全部链路</option>
              <option value="error">错误链路</option>
            </Select>
            <button data-trace-manage-search-action="true" type="button" className={primaryActionClass} onClick={() => applyQuery()}>
              <Play className="h-4 w-4" aria-hidden="true" />
              运行查询
            </button>
            <button data-trace-manage-reset-action="true" type="button" className={actionClass} onClick={resetQuery}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              重置
            </button>
          </div>
        </section>

        <section data-trace-manage-chart-band="cold-chart-band" className={`${panelClass} px-4 py-4`}>
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,160px))_minmax(0,1fr)]">
            {[
              ['链路总数', data.overview.totalTraceCount ?? 0],
              ['错误链路', data.overview.errorTraceCount ?? 0],
              ['列表条数', rows.length],
              ['最近时间', latestObservedAt]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3">
                <p className="text-[12px] font-semibold text-[#8792a5]">{label}</p>
                <p className="mt-2 truncate text-[18px] font-semibold text-[#f2f6fb]">{value}</p>
              </div>
            ))}
            <div className="min-w-0 rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3">
              <div className="mb-3 flex items-center justify-between text-[12px] text-[#8792a5]">
                <span className="font-semibold text-[#c6cfdd]">趋势带</span>
                <span>近 10 条链路</span>
              </div>
              <div className="flex h-16 items-end gap-1.5">
                {chartRows.map((row, index) => {
                  const isError = row.status.toUpperCase().includes('ERROR');
                  return (
                    <span
                      key={`${row.key}-${index}`}
                      className={`min-w-0 flex-1 rounded-t-[3px] border ${isError ? 'border-[#70424a] bg-[#35131d]' : 'border-[#2b4462] bg-[#132235]'}`}
                      style={{ height: chartHeight(index, chartRows.length, isError) }}
                      title={`${row.service} ${row.duration}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
          <div data-trace-manage-trace-table="cold-dense-trace-list" className={`${panelClass} min-w-0 overflow-hidden`}>
            <div className="flex h-11 items-center justify-between border-b border-[#252b35] px-4">
              <div>
                <p className="text-[12px] font-semibold text-[#8792a5]">最近链路</p>
                <p className="mt-0.5 text-[11px] text-[#5f6979]">按当前查询条件展示</p>
              </div>
              <span className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#9ca7ba]">
                {rows.length} 条
              </span>
            </div>
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="border-b border-[#252b35] bg-[#10141b] text-[#8792a5]">
                <tr>
                  <th className="px-4 py-3 font-semibold">开始时间</th>
                  <th className="px-4 py-3 font-semibold">服务</th>
                  <th className="px-4 py-3 font-semibold">根跨度</th>
                  <th className="px-4 py-3 font-semibold">耗时</th>
                  <th className="px-4 py-3 font-semibold">状态</th>
                  <th className="px-4 py-3 font-semibold">链路 ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map(row => (
                    <tr key={row.key} className="border-b border-[#1f2530] last:border-b-0 hover:bg-[#111721]">
                      <td className="px-4 py-3 font-mono text-[11px] text-[#c8d2df]">{row.startTime}</td>
                      <td className="px-4 py-3 font-semibold text-[#edf3fb]">{row.service}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          data-trace-manage-open-detail-action="side-waterfall-modal"
                          onClick={() => openTraceDetailDrawer(row)}
                          className="text-left font-semibold text-[#edf3fb] hover:text-[#9fb6ff]"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#c8d2df]">{row.duration}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold ${statusTone(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-[11px] text-[#8792a5]">{row.traceId}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="h-[260px] text-center">
                      <div className="mx-auto flex max-w-[280px] flex-col items-center">
                        <GitBranch className="h-8 w-8 text-[#7d8798]" aria-hidden="true" />
                        <p className="mt-3 text-[14px] font-semibold text-[#edf3fb]">暂无链路</p>
                        <p data-trace-manage-empty-guidance="operator-no-data-guidance" className="mt-2 text-[12px] leading-5 text-[#7f8a9d]">
                          确认时间范围、实体归因、采集器和监控模板后再查看链路。
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <aside data-trace-manage-detail-panel="cold-detail-panel" className={`${panelClass} min-w-0 overflow-hidden`}>
            <div className="border-b border-[#252b35] px-4 py-3">
              <p className="text-[12px] font-semibold text-[#8792a5]">详情面板</p>
              <h2 className="mt-2 truncate text-[18px] font-semibold text-[#f2f6fb]">{selectedTrace.name}</h2>
              <p className="mt-1 truncate font-mono text-[11px] text-[#6d7788]">{activeTraceId}</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              {[
                ['服务', selectedTrace.service],
                ['命名空间', selectedTrace.namespace],
                ['根跨度', selectedTrace.rootSpanId],
                ['耗时', selectedTrace.duration]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#8792a5]">{label}</p>
                  <p className="mt-1 truncate text-[13px] font-semibold text-[#e6edf7]">{value}</p>
                </div>
              ))}
              <div
                data-trace-manage-selected-evidence="selected-trace-evidence"
                aria-label="链路证据 链路 ID 链路状态 开始时间 最近上报"
                className="rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[#8792a5]">链路证据</p>
                  <span className="text-[11px] font-semibold text-[#6d7788]">当前选中</span>
                </div>
                <div className="space-y-2">
                  {selectedTraceEvidenceRows.map(([label, value, meta]) => (
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
                data-trace-manage-entity-context="hertzbeat-signal-entity-context"
                aria-label="实体上下文 当前实体 监控实例 当前服务 链路上下文 当前环境 时间范围 采集来源"
                className="rounded-[4px] border border-[#252b35] bg-[#10141b] px-3 py-3"
	              >
	                <div className="mb-2 flex items-center justify-between gap-2">
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
              <TraceAttributionDiagnostics rows={routeAttributionDiagnostics} />
            </div>
            <div className="grid gap-2 border-t border-[#252b35] px-4 py-4">
              <p
                data-trace-manage-alert-context-hint="entity-trace-alert-handoff"
                className="rounded-[3px] border border-[#252b35] bg-[#10141b] px-2.5 py-2 text-[11px] leading-4 text-[#8792a5]"
              >
                按当前实体、服务和已带入的链路上下文查看相关告警
              </p>
              <p
                data-trace-manage-signal-handoff-hint="trace-log-metric-context"
                className="rounded-[3px] border border-[#252b35] bg-[#10141b] px-2.5 py-2 text-[11px] leading-4 text-[#8792a5]"
              >
                当前链路的 traceId、spanId 和服务上下文会带入日志与指标工作台
              </p>
              {canOpenEntity ? (
                <Link href={handoffLinks.entityHref} className={actionClass}>
                  <Workflow className="h-4 w-4" aria-hidden="true" />
                  实体详情
                </Link>
              ) : (
                <span className="inline-flex" title={missingEntityHandoffTitle}>
                  <button
                    data-trace-manage-entity-action-disabled="missing-entity-id"
                    type="button"
                    className={disabledActionClass}
                    disabled
                    title={missingEntityHandoffTitle}
                    aria-label={missingEntityHandoffTitle}
                  >
                    <Workflow className="h-4 w-4" aria-hidden="true" />
                    实体详情
                  </button>
                </span>
              )}
              <Link href={handoffLinks.alertHandlingHref} className={actionClass}>
                <BellRing className="h-4 w-4" aria-hidden="true" />
                告警处理
              </Link>
              {canOpenLogs ? (
                <Link data-trace-manage-open-logs-action="true" href={handoffLinks.logsHref} className={actionClass}>
                  <Timer className="h-4 w-4" aria-hidden="true" />
                  查看日志
                </Link>
              ) : (
                <span className="inline-flex" title={missingTraceHandoffTitle}>
                  <button
                    data-trace-manage-open-logs-action="true"
                    data-trace-manage-open-logs-action-disabled="missing-trace-id"
                    type="button"
                    className={disabledActionClass}
                    disabled
                    title={missingTraceHandoffTitle}
                    aria-label={missingTraceHandoffTitle}
                  >
                    <Timer className="h-4 w-4" aria-hidden="true" />
                    查看日志
                  </button>
                </span>
              )}
              <Link href={handoffLinks.metricsHref} className={actionClass}>
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                查看指标
              </Link>
              <Link href={handoffLinks.entitiesHref} className={actionClass}>
                <Workflow className="h-4 w-4" aria-hidden="true" />
                对象目录
              </Link>
            </div>
          </aside>
        </section>
        <TraceWaterfallDrawer
          state={traceDetailDrawer}
          routeContext={routeContext}
          currentTraceReturnHref={currentTraceReturnHref}
          onClose={closeTraceDetailDrawer}
          onSelectSpan={spanId => setTraceDetailDrawer(previous => ({ ...previous, selectedSpanId: spanId, selectedEventKey: null }))}
          onSelectEvent={(eventKey, spanId) => setTraceDetailDrawer(previous => ({ ...previous, selectedSpanId: spanId || previous.selectedSpanId, selectedEventKey: eventKey }))}
        />
      </div>
    </main>
  );
}

export default function TraceManagePage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = useMemo(() => queryStateFromParams(searchParams), [searchParams]);
  const routeContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const [draft, setDraft] = useState<TraceQueryState>(initialQuery);
  const [query, setQuery] = useState<TraceQueryState>(initialQuery);
  const traceTimeContext = useMemo(() => sanitizeTimeContext({
    timeRange: routeContext.timeRange || 'last-30m',
    start: routeContext.start,
    end: routeContext.end,
    refresh: routeContext.refresh,
    live: routeContext.live || 'false',
    tz: routeContext.tz
  }), [routeContext]);
  const traceUrls = useMemo(() => buildTraceUrls(query, routeContext), [query, routeContext]);
  const traceTimeRefreshKey = useMemo(
    () =>
      [
        traceTimeContext.timeRange || '',
        traceTimeContext.start || '',
        traceTimeContext.end || '',
        traceTimeContext.refresh || '',
        traceTimeContext.live || '',
        traceTimeContext.tz || ''
      ].join('|'),
    [traceTimeContext.end, traceTimeContext.live, traceTimeContext.refresh, traceTimeContext.start, traceTimeContext.timeRange, traceTimeContext.tz]
  );
  const loadCacheKey = useMemo(() => `trace-manage:${traceUrls.listUrl}|${traceUrls.overviewUrl}|${traceTimeRefreshKey}`, [traceTimeRefreshKey, traceUrls]);

  const load = useCallback(async (): Promise<TraceManageData> => {
    const [overview, list] = await Promise.all([
      apiMessageGet<TraceOverview>(traceUrls.overviewUrl),
      apiMessageGet<PageResult<TraceListItem>>(traceUrls.listUrl)
    ]);
    return { overview, list };
  }, [traceUrls]);

  const applyQuery = useCallback((nextQuery: TraceQueryState = draft) => {
    setQuery(nextQuery);
    router.replace(buildTraceManageRoute(searchParams, nextQuery));
  }, [draft, router, searchParams]);

  const applyTraceTimeContext = useCallback((timeContext: TimeContext) => {
    const appliedContext = resolveAppliedTimeContext(timeContext, traceTimeContext);
    router.replace(buildTraceManageRoute(searchParams, query, appliedContext));
  }, [query, router, searchParams, traceTimeContext]);

  const resetQuery = useCallback(() => {
    setDraft(emptyTraceQuery);
    setQuery(emptyTraceQuery);
    router.replace(buildResetTraceManageRoute(searchParams));
  }, [router, searchParams]);

  useEffect(() => {
    if (hasDisplayReturnLabel(searchParams) || hasUnsanitizedTraceTimeBounds(searchParams)) {
      router.replace(buildTraceManageRoute(searchParams, query));
    }
  }, [query, router, searchParams]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('trace.manage.loading')} cacheKey={loadCacheKey}>
      {data => (
        <TraceExplorer
          data={data}
          draft={draft}
          setDraft={setDraft}
          applyQuery={applyQuery}
          resetQuery={resetQuery}
          routeContext={routeContext}
          timeContext={traceTimeContext}
          applyTimeContext={applyTraceTimeContext}
          currentTraceReturnHref={buildTraceReturnHref(searchParams, query)}
        />
      )}
    </ClientWorkbench>
  );
}
