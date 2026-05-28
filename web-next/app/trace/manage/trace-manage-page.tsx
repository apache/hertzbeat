'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, BellRing, ListChecks, Play, RotateCcw, Search, Server, Timer, Workflow } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HzActionGroup, HzAttributeDiagnostics, HzButton, HzButtonIcon, HzButtonLink, HzChipGroup, HzControlStack, HzDataCellText, HzDataTable, HzDetailRows, HzDialogBodyLayout, HzDialogEventNotice, HzDialogEventText, HzDialogMetaItem, HzDisabledActionShell, HzEmptyState, HzInput, HzPanelHeader, HzPanelSurface, HzQueryActionGroup, HzQueryStatusSelect, HzQueryTokenField, HzSearchFieldFrame, HzSearchFieldIcon, HzSelect, HzSignalTrendBars, HzSignalWorkbenchShell, HzStateNotice, HzStatCell, HzStatStrip, HzStatusBadge, HzTableRowActionButton, HzWorkbenchHeaderCopy, HzWorkbenchLayout, type HzStatusTone } from '@hertzbeat/ui';
import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { formatDurationNanos, formatTime } from '@/lib/format';
import { buildTraceUrls, type TraceManageRouteState, type TraceQueryState } from '@/lib/trace-manage/query-state';
import {
  buildSelectedSpanEventRows,
  buildSelectedSpanFacts,
  buildSelectedSpanLinkRows,
  buildTraceAttributionDiagnostics,
  buildTraceExplorerRows,
  buildTraceHandoffLinks,
  buildTraceWaterfallRows,
  type TraceExplorerRow
} from '@/lib/trace-manage/view-model';
import { buildSignalEntityContextRows, type SignalRouteContext } from '@/lib/signal-route-context';
import { resolveAppliedTimeContext, sanitizeTimeContext, type TimeContext } from '@/lib/time-context';
import type { PageResult, TraceDetail, TraceListItem, TraceOverview } from '@/lib/types';
import { ObservabilityStatusState, ObservabilityWaterfall, type ObservabilityWaterfallTick } from '../../../components/observability';
import { OverlayDialog } from '../../../components/workbench/overlay-dialog';
import { loadTraceDetailBundle } from '../../../lib/trace-manage/controller';
import { buildResetTraceManageRoute, buildTraceManageRoute } from './route-state';

type TraceManageData = {
  overview: TraceOverview;
  list: PageResult<TraceListItem>;
};

const EMPTY_TRACE_OVERVIEW: TraceOverview = {
  totalTraceCount: 0,
  errorTraceCount: 0,
  latestObservedAt: null,
  hasActiveTrace: false
};

function normalizeTraceOverview(overview: TraceOverview | null | undefined): TraceOverview {
  return {
    ...EMPTY_TRACE_OVERVIEW,
    ...(overview || {})
  };
}

function normalizeTraceList(list: PageResult<TraceListItem> | null | undefined): PageResult<TraceListItem> {
  return {
    content: Array.isArray(list?.content) ? list.content : [],
    totalElements: Number.isFinite(list?.totalElements) ? list.totalElements : 0,
    pageIndex: Number.isFinite(list?.pageIndex) ? list.pageIndex : 0,
    pageSize: Number.isFinite(list?.pageSize) ? list.pageSize : 8
  };
}

function normalizeTraceManageData(data: {
  overview?: TraceOverview | null;
  list?: PageResult<TraceListItem> | null;
}): TraceManageData {
  return {
    overview: normalizeTraceOverview(data.overview),
    list: normalizeTraceList(data.list)
  };
}

const emptyTraceQuery: TraceQueryState = {
  traceId: '',
  spanId: '',
  serviceName: '',
  errorOnly: false
};

const EMPTY_TRACE_MANAGE_ROUTE_STATE: TraceManageRouteState = {
  initialQuery: emptyTraceQuery,
  routeContext: {},
  shouldCleanUrl: false
};

const TRACE_MANAGE_SETTLED_CACHE_TTL_MS = 10_000;

type TraceDetailDrawerState = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  detail: TraceDetail | null;
  selectedSpanId?: string | null;
  selectedEventKey?: string | null;
};
type TraceTranslator = ReturnType<typeof useI18n>['t'];

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

function buildTraceReturnHref(routeContext: SignalRouteContext, query: TraceQueryState) {
  return buildTraceManageRoute(routeContext, query);
}

function buildSelectedTraceReturnHref(
  currentTraceReturnHref: string,
  detail: TraceDetail | null | undefined,
  selectedSpan: TraceSpanNode | null,
  routeContext: SignalRouteContext
) {
  const url = new URL(currentTraceReturnHref || '/trace/manage', 'http://localhost');
  const selectedTraceId = firstNavigationId(detail?.traceId, routeContext.traceId);
  const selectedSpanId = firstNavigationId(selectedSpan?.spanId, routeContext.spanId);
  const selectedServiceName = firstNavigationId(selectedSpan?.serviceName, detail?.serviceName, routeContext.serviceName);
  const selectedNamespace = firstNavigationId(
    selectedSpan?.resourceAttributes?.['service.namespace'],
    detail?.serviceNamespace,
    routeContext.serviceNamespace
  );
  const selectedEnvironment = firstNavigationId(
    selectedSpan?.resourceAttributes?.['deployment.environment.name'],
    routeContext.environment
  );

  if (selectedTraceId) url.searchParams.set('traceId', selectedTraceId);
  if (selectedSpanId) url.searchParams.set('spanId', selectedSpanId);
  if (selectedServiceName) url.searchParams.set('serviceName', selectedServiceName);
  if (selectedNamespace) url.searchParams.set('serviceNamespace', selectedNamespace);
  if (selectedEnvironment) url.searchParams.set('environment', selectedEnvironment);

  return `${url.pathname}${url.search}`;
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

function traceStatusBadgeTone(statusTone: TraceExplorerRow['statusTone']): HzStatusTone {
  if (statusTone === 'danger') return 'critical';
  if (statusTone === 'success') return 'success';
  if (statusTone === 'warning') return 'warning';
  return 'neutral';
}

type TraceAttributionDiagnosticRow = ReturnType<typeof buildTraceAttributionDiagnostics>[number];

function TraceAttributionDiagnostics({ rows }: { rows: TraceAttributionDiagnosticRow[] }) {
  const { t } = useI18n();

  if (rows.length === 0) return null;

  return (
    <HzAttributeDiagnostics
      data-trace-manage-attribution-diagnostics="hertzbeat-attribute-diagnostics"
      data-trace-manage-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
      aria-label={t('trace.manage.attribution-diagnostics.aria')}
      title={t('trace.manage.attribution-diagnostics.title')}
      namespaceLabel="hertzbeat.*"
      rows={rows.map(row => ({
        key: row.key,
        label: row.label,
        value: row.value,
        meta: row.meta,
        state: row.state,
        stateLabel: row.state === 'present'
          ? t('trace.manage.attribution-diagnostics.present')
          : t('trace.manage.attribution-diagnostics.missing'),
        tone: row.state === 'present' ? 'success' : 'critical',
        rowProps: { 'data-trace-manage-attribution-diagnostic-state': row.state },
        badgeProps: {
          'data-trace-manage-attribution-diagnostic-badge-owner': 'hertzbeat-ui-status-badge',
          'data-trace-manage-attribution-diagnostic-badge-state': row.state
        }
      }))}
    />
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

function buildTraceWaterfallEventFacts(selection: TraceWaterfallEventSelection, t: TraceTranslator) {
  const { row, event } = selection;
  return [
    {
      title: t('trace.manage.drawer.event-fact.title'),
      copy: event.label || t('trace.manage.drawer.event-fact.fallback'),
      meta: t('trace.manage.drawer.event-fact.meta')
    },
    {
      title: t('trace.manage.drawer.event-fact.span'),
      copy: row.title || row.key,
      meta: row.detailLabel || row.copy
    },
    {
      title: t('trace.manage.drawer.event-fact.position'),
      copy: event.offsetLabel || `${Math.round(event.leftPct)}%`,
      meta: t('trace.manage.drawer.event-fact.timeline')
    },
    {
      title: t('trace.manage.drawer.event-fact.attributes'),
      copy: event.attributesLabel || t('trace.manage.drawer.event-fact.no-attributes'),
      meta: 'attributes'
    }
  ];
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
  const selectedTraceReturnHref = buildSelectedTraceReturnHref(currentTraceReturnHref, detail, selectedSpan, handoffRouteContext);
  const attributionDiagnostics = buildTraceAttributionDiagnostics(detail, selectedSpan, handoffRouteContext, t);
  const waterfallRows = buildTraceWaterfallRows(detail, selectedSpan?.spanId || state.selectedSpanId, formatDurationNanos, t);
  const selectedSpanFacts = buildSelectedSpanFacts(selectedSpan, detail, t, formatDurationNanos);
  const selectedSpanEvents = buildSelectedSpanEventRows(selectedSpan, formatTime, t);
  const selectedSpanLinks = buildSelectedSpanLinkRows(selectedSpan, t);
  const selectedTraceEvent = findTraceWaterfallEvent(waterfallRows, state.selectedEventKey);
  const handoffLinks = buildTraceHandoffLinks(detail, selectedSpan, handoffRouteContext, {
    intakeReturnTo: currentTraceReturnHref,
    logsReturnTo: selectedTraceReturnHref,
    metricsReturnTo: selectedTraceReturnHref
  });
  const traceEventCount = waterfallRows.reduce((count, row) => count + (row.events?.length || 0), 0);
  const missingTraceHandoffTitle = t('trace.manage.handoff.logs-disabled');
  const missingEntityHandoffTitle = t('trace.manage.handoff.entity-disabled');
  const canOpenLogs = hasNavigationId(detail?.traceId);
  const canOpenEntity = handoffLinks.entityHref.startsWith('/entities/');
  const selectedFacts = selectedTraceEvent ? buildTraceWaterfallEventFacts(selectedTraceEvent, t) : [
    ...selectedSpanFacts,
    ...selectedSpanEvents.map(row => ({ ...row, title: `${t('trace.manage.drawer.event-prefix')} · ${row.title}` })),
    ...selectedSpanLinks.map(row => ({ ...row, title: `${t('trace.manage.drawer.link-prefix')} · ${row.title}` }))
  ];
  const showSelectedSpan = () => onSelectEvent(null, selectedTraceEvent?.row.key);

  return (
    <OverlayDialog
      open={state.open}
      onClose={onClose}
      placement="right"
      maxWidthClassName="max-w-[1120px]"
      kicker={t('trace.manage.drawer.kicker')}
      title={selectedSpan?.spanName || detail?.rootSpanName || detail?.traceId || t('trace.manage.drawer.title-fallback')}
      footer={
        <HzActionGroup
          data-trace-manage-drawer-action-group="handoff-actions"
          data-trace-manage-drawer-action-group-owner="hertzbeat-ui-action-group"
          data-trace-manage-drawer-action-group-layout-owner="hertzbeat-ui-action-group"
          layout="full-end"
        >
          {canOpenLogs ? (
            <HzButtonLink
              component={Link}
              data-trace-manage-open-logs-action="true"
              data-trace-manage-drawer-detail-action="logs"
              href={handoffLinks.logsHref}
              size="md"
            >
              {t('trace.manage.drawer.action.logs')}
            </HzButtonLink>
          ) : (
            <HzDisabledActionShell
              title={missingTraceHandoffTitle}
              data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
              data-trace-manage-disabled-action="logs"
              data-trace-manage-disabled-action-scope="drawer-footer"
            >
              <HzButton
                data-trace-manage-open-logs-action="true"
                data-trace-manage-open-logs-action-disabled="missing-trace-id"
                data-trace-manage-drawer-detail-action="logs"
                size="md"
                disabled
                title={missingTraceHandoffTitle}
                aria-label={missingTraceHandoffTitle}
              >
                {t('trace.manage.drawer.action.logs')}
              </HzButton>
            </HzDisabledActionShell>
          )}
          <HzButtonLink component={Link} data-trace-manage-drawer-detail-action="metrics" href={handoffLinks.metricsHref} size="md">
            {t('trace.manage.drawer.action.metrics')}
          </HzButtonLink>
          {canOpenEntity ? (
            <HzButtonLink component={Link} data-trace-manage-drawer-detail-action="entity" href={handoffLinks.entityHref} size="md">
              {t('trace.manage.drawer.action.entity')}
            </HzButtonLink>
          ) : (
            <HzDisabledActionShell
              title={missingEntityHandoffTitle}
              data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
              data-trace-manage-disabled-action="entity"
              data-trace-manage-disabled-action-scope="drawer-footer"
            >
              <HzButton
                data-trace-manage-entity-action-disabled="missing-entity-id"
                data-trace-manage-drawer-detail-action="entity"
                size="md"
                disabled
                title={missingEntityHandoffTitle}
                aria-label={missingEntityHandoffTitle}
              >
                {t('trace.manage.drawer.action.entity')}
              </HzButton>
            </HzDisabledActionShell>
          )}
        </HzActionGroup>
      }
    >
      <HzDialogBodyLayout
        data-trace-manage-detail-drawer="waterfall-side-modal"
        data-trace-manage-detail-drawer-owner="hertzbeat-ui-dialog-body-layout"
      >
        {state.loading ? (
          <ObservabilityStatusState title={t('trace.manage.drawer.loading.title')} copy={t('trace.manage.drawer.loading.copy')} />
        ) : state.error ? (
          <ObservabilityStatusState title={t('trace.manage.drawer.error.title')} copy={state.error} tone="danger" />
        ) : detail ? (
          <>
            <HzChipGroup
              data-trace-manage-drawer-meta="shared-chip-group"
              data-trace-manage-drawer-meta-owner="hertzbeat-ui-toolbar-chips"
            >
              <HzDialogMetaItem
                data-trace-manage-drawer-meta-item="trace-id"
                data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
                width="trace-id"
              >
                {detail.traceId}
              </HzDialogMetaItem>
              <HzDialogMetaItem
                data-trace-manage-drawer-meta-item="span-count"
                data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
                width="span-count"
              >
                {t('trace.manage.drawer.span-count', { count: waterfallRows.length })}
              </HzDialogMetaItem>
              <HzDialogMetaItem
                data-trace-manage-drawer-meta-item="duration"
                data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"
                width="duration"
              >
                {formatDurationNanos(detail.durationNanos)}
              </HzDialogMetaItem>
            </HzChipGroup>
            <HzStatStrip
              data-trace-manage-drawer-stage-stats="shared-stat-strip"
              data-trace-manage-drawer-stage-stats-owner="hertzbeat-ui-stat-strip"
            >
              {[
                {
                  id: 'current-span',
                  label: t('trace.manage.drawer.stat.current-span'),
                  value: selectedSpan?.spanName || selectedSpan?.spanId || detail.rootSpanName || '-',
                  tone: 'info' as HzStatusTone
                },
                {
                  id: 'error-spans',
                  label: t('trace.manage.drawer.stat.error-spans'),
                  value: String(detail.errorSpanCount || waterfallRows.filter(row => row.tone === 'danger').length),
                  tone: (detail.errorSpanCount || waterfallRows.some(row => row.tone === 'danger') ? 'critical' : 'neutral') as HzStatusTone
                },
                {
                  id: 'events',
                  label: t('trace.manage.drawer.stat.events'),
                  value: String(traceEventCount),
                  tone: 'neutral' as HzStatusTone
                },
                {
                  id: 'links',
                  label: t('trace.manage.drawer.stat.links'),
                  value: String((selectedSpan?.links || []).length),
                  tone: 'neutral' as HzStatusTone
                }
              ].map(item => (
                <HzStatCell
                  key={item.id}
                  data-trace-manage-drawer-stage-stat-owner="hertzbeat-ui-stat-cell"
                  data-trace-manage-drawer-stage-stat={item.id}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                  variant="tile"
                  density="compact"
                />
              ))}
            </HzStatStrip>
            <HzDialogBodyLayout
              variant="waterfall-detail"
              data-trace-manage-drawer-body-layout="shared-waterfall-detail"
              data-trace-manage-drawer-body-layout-owner="hertzbeat-ui-dialog-body-layout"
            >
              <ObservabilityWaterfall
                rows={waterfallRows}
                spanLabel={t('trace.manage.drawer.waterfall.span')}
                durationLabel={t('trace.manage.drawer.waterfall.duration')}
                timelineLabel={t('trace.manage.drawer.waterfall.timeline')}
                timelineTicks={buildTraceTimelineTicks(detail.durationNanos)}
                selectedEventKey={state.selectedEventKey}
                onSelect={onSelectSpan}
                onSelectEvent={onSelectEvent}
              />
              <HzDialogBodyLayout
                variant="side-stack"
                data-trace-manage-drawer-side-stack="selected-facts"
                data-trace-manage-drawer-side-stack-owner="hertzbeat-ui-dialog-body-layout"
              >
                <TraceAttributionDiagnostics rows={attributionDiagnostics} />
                {selectedTraceEvent ? (
                  <HzDialogEventNotice
                    data-trace-manage-event-detail="span-event-detail"
                    data-trace-manage-event-detail-owner="hertzbeat-ui-dialog-event-notice"
                    title={selectedTraceEvent.event.label}
                    description={(
                      <HzDialogEventText
                        data-trace-manage-event-detail-copy="span-event-not-span"
                        data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
                      >
                        {t('trace.manage.drawer.event-detail.copy')}
                      </HzDialogEventText>
                    )}
                    meta={(
                      <HzDialogEventText
                        variant="meta"
                        data-trace-manage-event-detail-meta="span-event-label"
                        data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
                      >
                        {t('trace.manage.drawer.event-detail.title')}
                      </HzDialogEventText>
                    )}
                    actions={(
                      <HzButton
                        data-trace-manage-event-detail-action="view-span"
                        data-trace-manage-event-detail-control="shared-hz-button"
                        intent="ghost"
                        size="xs"
                        onClick={showSelectedSpan}
                      >
                        {t('trace.manage.drawer.event-detail.action.span')}
                      </HzButton>
                    )}
                    tone="info"
                    variant="hint"
                  />
                ) : null}
                <HzDetailRows
                  data-trace-manage-drawer-selected-facts="shared-detail-rows"
                  data-trace-manage-drawer-selected-facts-owner="hertzbeat-ui-detail-rows"
                  rows={selectedFacts.map(row => ({
                    key: `${row.title}-${row.meta ?? ''}`,
                    title: row.title,
                    copy: row.copy,
                    meta: row.meta
                  }))}
                />
              </HzDialogBodyLayout>
            </HzDialogBodyLayout>
          </>
        ) : (
          <ObservabilityStatusState title={t('trace.manage.drawer.empty.title')} copy={t('trace.manage.drawer.empty.copy')} />
        )}
      </HzDialogBodyLayout>
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
        name: draft.traceId ? t('trace.manage.route.fallback.filtered-trace') : t('trace.manage.route.fallback.waiting-query'),
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
      rows,
      t
    ]
  );
  const handoffLinks = buildTraceHandoffLinks(null, null, routeContext, {
    traceId: selectedTrace.traceId !== '-' ? selectedTrace.traceId : draft.traceId || undefined,
    spanId: selectedTrace.rootSpanId !== '-' ? selectedTrace.rootSpanId : draft.spanId || undefined,
    serviceName: selectedTrace.service !== '-' ? selectedTrace.service : draft.serviceName || routeContext.serviceName || undefined,
    serviceNamespace: selectedTrace.namespace !== '-' ? selectedTrace.namespace : routeContext.serviceNamespace || undefined,
    environment: routeContext.environment,
    intakeReturnTo: currentTraceReturnHref,
    logsReturnTo: currentTraceReturnHref,
    metricsReturnTo: currentTraceReturnHref
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
  const activeTraceId = selectedTrace.traceId !== '-' ? selectedTrace.traceId : t('trace.manage.route.fallback.unselected');
  const selectedTraceEvidenceRows = [
    [t('trace.manage.route.evidence.trace-id'), activeTraceId, 'traceId'],
    [t('trace.manage.route.evidence.trace-status'), selectedTrace.status, draft.errorOnly ? t('trace.manage.route.evidence.error-only') : t('trace.manage.route.evidence.current-filter')],
    [t('trace.manage.route.evidence.start-time'), selectedTrace.startTime, t('trace.manage.route.evidence.root-span-start')],
    [t('trace.manage.route.evidence.latest-observed'), latestObservedAt, t('trace.manage.route.evidence.latest-workbench-trace')]
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
        error: t('trace.manage.drawer.error.copy'),
        detail: null,
        selectedSpanId: initialSelectedSpanId,
        selectedEventKey: null
      });
    }
  }, [t]);

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
    <HzSignalWorkbenchShell
      data-trace-manage-route="otlp-cold-trace-workbench"
      data-trace-manage-style-baseline="hertzbeat-cold-matte"
      data-trace-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"
    >
        <HzPanelSurface
          data-trace-manage-header="cold-compact-header"
          data-trace-manage-panel-surface="header"
          data-trace-manage-header-padding-owner="hertzbeat-ui-panel-surface"
          padding="header"
        >
          <HzWorkbenchLayout
            as="div"
            variant="header-actions"
            data-trace-manage-header-layout="shared-header-actions"
            data-trace-manage-header-layout-owner="hertzbeat-ui-workbench-layout"
          >
            <HzWorkbenchHeaderCopy
              data-trace-manage-header-copy="shared-workbench-header-copy"
              data-trace-manage-header-copy-owner="hertzbeat-ui-workbench-header-copy"
              eyebrow={t('trace.manage.route.kicker')}
              title={t('trace.manage.route.title')}
              copy={t('trace.manage.route.subtitle')}
            />
            <HzWorkbenchLayout
              as="div"
              variant="time-toolbar"
              data-trace-manage-time-toolbar="top-right-corner"
              data-trace-manage-time-toolbar-owner="hertzbeat-ui-workbench-layout"
            >
              <HzControlStack
                layout="end-inline"
                data-trace-manage-time-control="shared-time-context-control"
                data-trace-manage-time-control-owner="hertzbeat-ui-control-stack"
                data-trace-manage-time-control-placement="top-right"
                data-trace-manage-time-control-visual="narrow-top-right-rail"
                data-trace-manage-time-control-fit="no-clipping"
              >
                <TimeRangeControl
                  value={timeContext}
                  labels={buildTimeRangeControlLabels(t)}
                  onApply={applyTimeContext}
                  onRefresh={() => applyTimeContext(timeContext)}
                  onReset={() => applyTimeContext({ timeRange: 'last-30m', refresh: timeContext.refresh, live: 'false', tz: timeContext.tz })}
                  showAbsoluteFields
                  variant="narrow-rail"
                  data-trace-manage-time-range-control-owner="hertzbeat-shared-time-range-control"
                  presetSelectProps={{ 'data-trace-manage-time-range-select': 'true' }}
                  presetOptionDataAttribute="data-trace-manage-time-range-preset"
                  refreshActionProps={{ 'data-trace-manage-time-refresh-action': 'true' }}
                />
              </HzControlStack>
              <HzActionGroup
                data-trace-manage-action-row="cold-workbench-actions"
                data-trace-manage-action-row-owner="hertzbeat-ui-action-group"
                data-trace-manage-action-row-layout-owner="hertzbeat-ui-action-group"
                layout="full-end"
              >
                {routeContext.returnTo ? (
                  <HzButtonLink component={Link} data-trace-manage-return-action="true" href={routeContext.returnTo} size="md" data-trace-manage-header-action="return-source">
                    <HzButtonIcon
                      icon={Workflow}
                      data-trace-manage-header-action-icon="return-source"
                      data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.route.action.return-source')}
                  </HzButtonLink>
                ) : null}
                <HzButtonLink component={Link} href={handoffLinks.intakeHref} size="md" data-trace-manage-header-action="intake">
                  <HzButtonIcon
                    icon={Workflow}
                    data-trace-manage-header-action-icon="intake"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.intake')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/collector" size="md" data-trace-manage-header-action="collector">
                  <HzButtonIcon
                    icon={Server}
                    data-trace-manage-header-action-icon="collector"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.collectors')}
                </HzButtonLink>
                {canOpenEntity ? (
                  <HzButtonLink component={Link} href={handoffLinks.entityHref} size="md" data-trace-manage-header-action="entity">
                    <HzButtonIcon
                      icon={Workflow}
                      data-trace-manage-header-action-icon="entity"
                      data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.route.action.entity')}
                  </HzButtonLink>
                ) : (
                  <HzDisabledActionShell
                    title={missingEntityHandoffTitle}
                    data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
                    data-trace-manage-disabled-action="entity"
                    data-trace-manage-disabled-action-scope="header"
                  >
                    <HzButton
                      data-trace-manage-entity-action-disabled="missing-entity-id"
                      size="md"
                      disabled
                      title={missingEntityHandoffTitle}
                      aria-label={missingEntityHandoffTitle}
                    >
                      <HzButtonIcon
                        icon={Workflow}
                        data-trace-manage-header-action-icon="entity"
                        data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                      />
                      {t('trace.manage.route.action.entity')}
                    </HzButton>
                  </HzDisabledActionShell>
                )}
                <HzButtonLink component={Link} href={handoffLinks.alertHandlingHref} size="md" data-trace-manage-header-action="alerts">
                  <HzButtonIcon
                    icon={BellRing}
                    data-trace-manage-header-action-icon="alerts"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.alerts')}
                </HzButtonLink>
                <HzButtonLink component={Link} href="/setting/define" size="md" data-trace-manage-header-action="templates">
                  <HzButtonIcon
                    icon={ListChecks}
                    data-trace-manage-header-action-icon="templates"
                    data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.templates')}
                </HzButtonLink>
              </HzActionGroup>
            </HzWorkbenchLayout>
          </HzWorkbenchLayout>
        </HzPanelSurface>

        <HzPanelSurface
          data-trace-manage-query-bar="cold-query-row"
          data-trace-manage-panel-surface="query"
          data-trace-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"
          padding="query"
        >
          <HzControlStack
            layout="inline-wrap"
            data-trace-manage-query-control-stack="shared-inline-controls"
            data-trace-manage-query-control-stack-owner="hertzbeat-ui-control-stack"
          >
            <HzSearchFieldFrame
              data-trace-manage-query-search-frame="shared-search-field-frame"
              data-trace-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"
              icon={(
                <HzSearchFieldIcon
                  icon={Search}
                  data-trace-manage-query-search-icon="service"
                  data-trace-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"
                />
              )}
            >
              <HzInput
                aria-label={t('trace.manage.route.query.service')}
                placeholder={t('trace.manage.route.query.service')}
                value={draft.serviceName}
                onChange={event => setDraft(updateDraftField('serviceName', event.target.value))}
                inset="search-icon"
                data-trace-manage-service-input="true"
                data-trace-manage-query-search-input-owner="hertzbeat-ui-input"
              />
            </HzSearchFieldFrame>
            <HzQueryTokenField
              width="trace-id"
              aria-label={t('trace.manage.route.query.trace-id')}
              value={draft.traceId}
              onChange={event => setDraft(updateDraftField('traceId', event.target.value))}
              placeholder={t('trace.manage.route.query.trace-id')}
              data-trace-manage-trace-id-input="true"
              fieldProps={{
                'data-trace-manage-query-token-field': 'trace-id',
                'data-trace-manage-query-token-field-owner': 'hertzbeat-ui-query-token-field'
              }}
            />
            <HzQueryTokenField
              width="span-id"
              aria-label={t('trace.manage.route.query.span-id')}
              value={draft.spanId}
              onChange={event => setDraft(updateDraftField('spanId', event.target.value))}
              placeholder={t('trace.manage.route.query.span-id')}
              fieldProps={{
                'data-trace-manage-query-token-field': 'span-id',
                'data-trace-manage-query-token-field-owner': 'hertzbeat-ui-query-token-field'
              }}
            />
            <HzQueryStatusSelect
              aria-label={t('trace.manage.route.query.status')}
              value={draft.errorOnly ? 'error' : 'all'}
              onChange={event => setDraft(updateDraftField('errorOnly', event.target.value === 'error'))}
              data-trace-manage-status-filter="true"
              data-trace-manage-query-status-select="shared-query-status-select"
              data-trace-manage-query-status-select-owner="hertzbeat-ui-query-status-select"
              options={[
                { value: 'all', label: t('trace.manage.route.query.status.all') },
                { value: 'error', label: t('trace.manage.route.query.status.error') }
              ]}
            />
            <HzQueryActionGroup
              data-trace-manage-query-action-group="shared-query-action-group"
              data-trace-manage-query-action-group-owner="hertzbeat-ui-query-action-group"
            >
              <HzButton data-trace-manage-search-action="true" intent="primary" size="md" onClick={() => applyQuery()}>
                <HzButtonIcon icon={Play} data-trace-manage-query-action-icon="run" data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon" />
                {t('trace.manage.route.query.run')}
              </HzButton>
              <HzButton data-trace-manage-reset-action="true" intent="secondary" size="md" onClick={resetQuery}>
                <HzButtonIcon icon={RotateCcw} data-trace-manage-query-action-icon="reset" data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon" />
                {t('trace.manage.route.query.reset')}
              </HzButton>
            </HzQueryActionGroup>
          </HzControlStack>
        </HzPanelSurface>

        <HzPanelSurface
          data-trace-manage-chart-band="cold-chart-band"
          data-trace-manage-panel-surface="chart"
          data-trace-manage-chart-padding-owner="hertzbeat-ui-panel-surface"
          padding="chart"
        >
          <HzWorkbenchLayout
            as="div"
            variant="summary-trend"
            data-trace-manage-chart-layout="shared-summary-trend"
            data-trace-manage-chart-layout-owner="hertzbeat-ui-workbench-layout"
          >
            {[
              { id: 'total', label: t('trace.manage.route.stat.total'), value: data.overview.totalTraceCount ?? 0 },
              { id: 'errors', label: t('trace.manage.route.stat.errors'), value: data.overview.errorTraceCount ?? 0 },
              { id: 'list-count', label: t('trace.manage.route.stat.list-count'), value: rows.length },
              { id: 'latest', label: t('trace.manage.route.stat.latest'), value: latestObservedAt }
            ].map(item => (
              <HzStatCell
                key={item.id}
                data-trace-manage-summary-stat-owner="hertzbeat-ui-stat-cell"
                data-trace-manage-summary-stat={item.id}
                label={item.label}
                value={item.value}
                variant="tile"
              />
            ))}
            <HzSignalTrendBars
              data-trace-manage-signal-trend-owner="hertzbeat-ui-signal-trend-bars"
              title={t('trace.manage.route.chart.title')}
              meta={t('trace.manage.route.chart.latest-window')}
              bars={chartRows.map((row, index) => {
                const isError = row.status.toUpperCase().includes('ERROR');
                return {
                  id: `${row.key}-${index}`,
                  label: row.service,
                  value: Math.max(1, chartRows.length - index),
                  tone: isError ? ('critical' as const) : ('info' as const),
                  title: `${row.service} ${row.duration}`
                };
              })}
            />
          </HzWorkbenchLayout>
        </HzPanelSurface>

        <HzWorkbenchLayout
          variant="table-detail"
          data-trace-manage-table-detail-layout="shared-table-detail"
          data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"
        >
          <HzPanelSurface
            data-trace-manage-trace-table="cold-dense-trace-list"
            data-trace-manage-panel-surface="table"
            data-trace-manage-panel-surface-clip-owner="hertzbeat-ui-panel-surface"
            data-trace-manage-row-control-owner="shared-hz-button"
            clip
          >
            <HzPanelHeader
              data-trace-manage-table-header-owner="hertzbeat-ui-panel-header"
              title={t('trace.manage.route.table.title')}
              subtitle={t('trace.manage.route.table.subtitle')}
              meta={(
                <HzStatusBadge
                  data-trace-manage-table-count-badge-owner="hertzbeat-ui-status-badge"
                  data-trace-manage-table-count={rows.length}
                  tone="neutral"
                  size="xs"
                >
                  {t('trace.manage.route.table.count', { count: rows.length })}
                </HzStatusBadge>
              )}
            />
            <HzDataTable
              data-trace-manage-table-chrome-owner="hertzbeat-ui-data-table"
              variant="embedded"
              rows={rows}
              getRowKey={row => row.key}
              selectedRowKey={selectedTrace.key}
              getRowProps={() => ({ 'data-trace-manage-row-detail-action': 'true' })}
              emptyLabel={(
                <HzEmptyState
                  data-trace-manage-empty-guidance="operator-no-data-guidance"
                  data-trace-manage-empty-state-owner="hertzbeat-ui-empty-state"
                  title={t('trace.manage.route.empty.title')}
                  description={t('trace.manage.route.empty.copy')}
                  layout="table-panel"
                />
              )}
              columns={[
                {
                  key: 'start',
                  header: t('trace.manage.route.table.header.start'),
                  render: row => (
                    <HzDataCellText
                      data-trace-manage-start-cell-owner="hertzbeat-ui-data-cell-text"
                      variant="timestamp"
                    >
                      {row.startTime}
                    </HzDataCellText>
                  )
                },
                {
                  key: 'service',
                  header: t('trace.manage.route.table.header.service'),
                  render: row => (
                    <HzDataCellText
                      data-trace-manage-service-cell-owner="hertzbeat-ui-data-cell-text"
                      variant="title"
                    >
                      {row.service}
                    </HzDataCellText>
                  )
                },
                {
                  key: 'root-span',
                  header: t('trace.manage.route.table.header.root-span'),
                  render: row => (
                    <HzTableRowActionButton
                      data-trace-manage-open-detail-action="side-waterfall-modal"
                      data-trace-manage-row-control="shared-hz-button"
                      data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"
                      intent="ghost"
                      size="xs"
                      width="root-span"
                      onClick={() => openTraceDetailDrawer(row)}
                    >
                      {row.name}
                    </HzTableRowActionButton>
                  )
                },
                {
                  key: 'duration',
                  header: t('trace.manage.route.table.header.duration'),
                  render: row => (
                    <HzDataCellText
                      data-trace-manage-duration-cell-owner="hertzbeat-ui-data-cell-text"
                      variant="value"
                    >
                      {row.duration}
                    </HzDataCellText>
                  )
                },
                {
                  key: 'status',
                  header: t('trace.manage.route.table.header.status'),
                  render: row => (
                    <HzStatusBadge
                      data-trace-manage-status-tone={row.statusTone ?? 'neutral'}
                      data-trace-manage-status-badge-owner="hertzbeat-ui-status-badge"
                      tone={traceStatusBadgeTone(row.statusTone)}
                    >
                      {row.status}
                    </HzStatusBadge>
                  )
                },
                {
                  key: 'trace-id',
                  header: t('trace.manage.route.table.header.trace-id'),
                  render: row => (
                    <HzDataCellText
                      data-trace-manage-trace-id-cell-owner="hertzbeat-ui-data-cell-text"
                      variant="identifier"
                      display="block"
                      width="trace-id"
                    >
                      {row.traceId}
                    </HzDataCellText>
                  )
                }
              ]}
            />
          </HzPanelSurface>

          <HzPanelSurface
            data-trace-manage-detail-panel="cold-detail-panel"
            data-trace-manage-panel-surface="detail"
            data-trace-manage-panel-surface-clip-owner="hertzbeat-ui-panel-surface"
            clip
          >
            <HzPanelHeader
              data-trace-manage-detail-header-owner="hertzbeat-ui-panel-header"
              eyebrow={t('trace.manage.route.detail.title')}
              title={selectedTrace.name}
              subtitle={activeTraceId}
            />
            <HzWorkbenchLayout
              as="div"
              variant="detail-stack"
              data-trace-manage-detail-body-layout="shared-detail-stack"
              data-trace-manage-detail-body-layout-owner="hertzbeat-ui-workbench-layout"
            >
              <HzDetailRows
                data-trace-manage-detail-facts-owner="hertzbeat-ui-detail-rows"
                rows={[
                  [t('trace.manage.route.detail.service'), selectedTrace.service],
                  [t('trace.manage.route.detail.namespace'), selectedTrace.namespace],
                  [t('trace.manage.route.detail.root-span'), selectedTrace.rootSpanId],
                  [t('trace.manage.route.detail.duration'), selectedTrace.duration]
                ].map(([label, value]) => ({
                  key: String(label),
                  title: label,
                  copy: value
                }))}
              />
              <HzDetailRows
                data-trace-manage-selected-evidence="selected-trace-evidence"
                data-trace-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"
                aria-label={t('trace.manage.route.evidence.aria')}
                heading={t('trace.manage.route.evidence.title')}
                rows={selectedTraceEvidenceRows.map(([label, value, meta]) => ({
                  key: String(label),
                  title: label,
                  copy: value,
                  meta
                }))}
              />
              <HzDetailRows
                data-trace-manage-entity-context="hertzbeat-signal-entity-context"
                data-trace-manage-entity-context-owner="hertzbeat-ui-detail-rows"
                aria-label={t('trace.manage.route.entity-context.aria')}
                heading={t('trace.manage.route.entity-context.title')}
                rows={entityContextRows.map(row => ({
                  key: row.label,
                  title: row.label,
                  copy: row.value,
                  meta: row.meta
                }))}
              />
              <TraceAttributionDiagnostics rows={routeAttributionDiagnostics} />
            </HzWorkbenchLayout>
            <HzWorkbenchLayout
              as="div"
              variant="detail-footer"
              data-trace-manage-detail-footer-layout="shared-detail-footer"
              data-trace-manage-detail-footer-layout-owner="hertzbeat-ui-workbench-layout"
            >
              <HzStateNotice
                data-trace-manage-alert-context-hint="entity-trace-alert-handoff"
                data-trace-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                title={t('trace.manage.route.handoff.alert-hint')}
                variant="hint"
              />
              <HzStateNotice
                data-trace-manage-signal-handoff-hint="trace-log-metric-context"
                data-trace-manage-handoff-hint-owner="hertzbeat-ui-state-notice"
                title={t('trace.manage.route.handoff.signal-hint')}
                variant="hint"
              />
              {canOpenEntity ? (
                <HzButtonLink component={Link} data-trace-manage-history-detail-action="entity" href={handoffLinks.entityHref} size="md">
                  <HzButtonIcon
                    icon={Workflow}
                    data-trace-manage-detail-footer-action-icon="entity"
                    data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.route.action.entity')}
                </HzButtonLink>
              ) : (
                <HzDisabledActionShell
                  title={missingEntityHandoffTitle}
                  data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
                  data-trace-manage-disabled-action="entity"
                  data-trace-manage-disabled-action-scope="detail-footer"
                >
                  <HzButton
                    data-trace-manage-entity-action-disabled="missing-entity-id"
                    data-trace-manage-history-detail-action="entity"
                    size="md"
                    disabled
                    title={missingEntityHandoffTitle}
                    aria-label={missingEntityHandoffTitle}
                  >
                    <HzButtonIcon
                      icon={Workflow}
                      data-trace-manage-detail-footer-action-icon="entity"
                      data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.route.action.entity')}
                  </HzButton>
                </HzDisabledActionShell>
              )}
              <HzButtonLink component={Link} data-trace-manage-history-detail-action="alerts" href={handoffLinks.alertHandlingHref} size="md">
                <HzButtonIcon
                  icon={BellRing}
                  data-trace-manage-detail-footer-action-icon="alerts"
                  data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('trace.manage.route.action.alerts')}
              </HzButtonLink>
              {canOpenLogs ? (
                <HzButtonLink
                  component={Link}
                  data-trace-manage-open-logs-action="true"
                  data-trace-manage-history-detail-action="logs"
                  href={handoffLinks.logsHref}
                  size="md"
                >
                  <HzButtonIcon
                    icon={Timer}
                    data-trace-manage-detail-footer-action-icon="logs"
                    data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('trace.manage.drawer.action.logs')}
                </HzButtonLink>
              ) : (
                <HzDisabledActionShell
                  title={missingTraceHandoffTitle}
                  data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
                  data-trace-manage-disabled-action="logs"
                  data-trace-manage-disabled-action-scope="detail-footer"
                >
                  <HzButton
                    data-trace-manage-open-logs-action="true"
                    data-trace-manage-open-logs-action-disabled="missing-trace-id"
                    data-trace-manage-history-detail-action="logs"
                    size="md"
                    disabled
                    title={missingTraceHandoffTitle}
                    aria-label={missingTraceHandoffTitle}
                  >
                    <HzButtonIcon
                      icon={Timer}
                      data-trace-manage-detail-footer-action-icon="logs"
                      data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('trace.manage.drawer.action.logs')}
                  </HzButton>
                </HzDisabledActionShell>
              )}
              <HzButtonLink component={Link} data-trace-manage-history-detail-action="metrics" href={handoffLinks.metricsHref} size="md">
                <HzButtonIcon
                  icon={BarChart3}
                  data-trace-manage-detail-footer-action-icon="metrics"
                  data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('trace.manage.drawer.action.metrics')}
              </HzButtonLink>
              <HzButtonLink component={Link} data-trace-manage-history-detail-action="entities" href={handoffLinks.entitiesHref} size="md">
                <HzButtonIcon
                  icon={Workflow}
                  data-trace-manage-detail-footer-action-icon="entities"
                  data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('trace.manage.route.action.catalog')}
              </HzButtonLink>
            </HzWorkbenchLayout>
          </HzPanelSurface>
        </HzWorkbenchLayout>
        <TraceWaterfallDrawer
          state={traceDetailDrawer}
          routeContext={routeContext}
          currentTraceReturnHref={currentTraceReturnHref}
          onClose={closeTraceDetailDrawer}
          onSelectSpan={spanId => setTraceDetailDrawer(previous => ({ ...previous, selectedSpanId: spanId, selectedEventKey: null }))}
          onSelectEvent={(eventKey, spanId) => setTraceDetailDrawer(previous => ({ ...previous, selectedSpanId: spanId || previous.selectedSpanId, selectedEventKey: eventKey }))}
        />
    </HzSignalWorkbenchShell>
  );
}

export default function TraceManagePage({
  initialRouteState
}: {
  initialRouteState?: TraceManageRouteState;
} = {}) {
  const traceManageRouteState = initialRouteState ?? EMPTY_TRACE_MANAGE_ROUTE_STATE;
  const { t } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState<TraceQueryState>(() => traceManageRouteState.initialQuery);
  const [query, setQuery] = useState<TraceQueryState>(() => traceManageRouteState.initialQuery);
  const routeContext = traceManageRouteState.routeContext;
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
    return normalizeTraceManageData({ overview, list });
  }, [traceUrls]);

  const applyQuery = useCallback((nextQuery: TraceQueryState = draft) => {
    setQuery(nextQuery);
    router.replace(buildTraceManageRoute(routeContext, nextQuery));
  }, [draft, routeContext, router]);

  const applyTraceTimeContext = useCallback((timeContext: TimeContext) => {
    const appliedContext = resolveAppliedTimeContext(timeContext, traceTimeContext);
    router.replace(buildTraceManageRoute(routeContext, query, appliedContext));
  }, [query, routeContext, router, traceTimeContext]);

  const resetQuery = useCallback(() => {
    setDraft(emptyTraceQuery);
    setQuery(emptyTraceQuery);
    router.replace(buildResetTraceManageRoute(routeContext));
  }, [routeContext, router]);

  useEffect(() => {
    if (traceManageRouteState.shouldCleanUrl) {
      router.replace(buildTraceManageRoute(routeContext, query));
    }
  }, [query, routeContext, router, traceManageRouteState.shouldCleanUrl]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('trace.manage.loading')}
      cacheKey={loadCacheKey}
      cacheSettledTtlMs={TRACE_MANAGE_SETTLED_CACHE_TTL_MS}
    >
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
          currentTraceReturnHref={buildTraceReturnHref(routeContext, query)}
        />
      )}
    </ClientWorkbench>
  );
}
