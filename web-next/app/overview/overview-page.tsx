'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { StageSection, SupportPanel } from '@/components/observability';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  OverviewActivityTimeline,
  OverviewChecklist,
  OverviewGuidancePanel,
  OverviewImpactedList,
  OverviewQuickEntryGrid,
  OverviewSectionAction,
  OverviewStatusGrid,
  OverviewSummaryGrid,
  type OverviewImpactedItem,
  type OverviewSummaryItem
} from '@/components/overview/overview-console';
import { api } from '@/lib/api-facade';
import { buildOverviewConsoleViewModel } from '@/lib/overview/view-model';
import { queryKeys } from '@/lib/query-keys';
import type { DashboardSummary, PageResult, SingleAlert } from '@/lib/types';
import { OverviewDetailDialog } from '../../components/overview/overview-detail-dialog';
import { OverviewProblemFocusDialog } from '../../components/overview/overview-problem-focus-dialog';
import { ThreeSignalDeskShell } from '../../components/pages/three-signal-desk-shell';
import { buildOverviewSignalDeskHref } from '../../lib/overview/navigation';
import {
  appendSignalRouteContext,
  buildSignalEntityContextRows,
  readSignalRouteContext,
  type SearchParamReader,
  type SignalRouteContext
} from '../../lib/signal-route-context';
import {
  createSignalDashboardPanelDraft,
  deleteSignalDashboardPanelDraft,
  loadAllSignalDashboardPanelDrafts,
  saveSignalDashboardPanelDraft,
  type SignalDashboardPanelDraft,
  type SignalDashboardPanelVisualization
} from '../../lib/signal-dashboard-panel-drafts';

export type OverviewData = {
  summary: DashboardSummary;
  alerts: PageResult<SingleAlert>;
  summaryFailed?: boolean;
  alertsFailed?: boolean;
};

export type OverviewRenderDataState = {
  renderData: OverviewData;
  nextReadyData: OverviewData | null;
  retainedReadyData: boolean;
};

const OVERVIEW_SUMMARY_URL = '/summary';
const OVERVIEW_ALERT_LIST_URL = '/alerts?pageIndex=0&pageSize=6&sort=gmtUpdate&order=desc';
const OVERVIEW_ALERT_LIST_QUERY = { pageIndex: 0, pageSize: 6, sort: 'gmtUpdate', order: 'desc' } as const;
const OVERVIEW_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_OVERVIEW_SUMMARY: DashboardSummary = { apps: [] };
const EMPTY_OVERVIEW_ALERTS: PageResult<SingleAlert> = {
  content: [],
  totalElements: 0,
  pageIndex: OVERVIEW_ALERT_LIST_QUERY.pageIndex,
  pageSize: OVERVIEW_ALERT_LIST_QUERY.pageSize
};

type OverviewRequestState<T> = {
  data: T;
  failed: boolean;
};

export type DashboardPanelDraft = {
  signal: 'logs' | 'traces' | 'metrics';
  signalLabelKey: string;
  panelTitle: string;
  explorerHref: string;
  panelQuery?: string;
  panelQueryType?: string;
  panelExpression?: string;
  panelDatasource?: string;
  context: SignalRouteContext;
};

export type SavedDashboardPanelDraft = DashboardPanelDraft & {
  id: string;
  createdAt: number;
  serverDraftKey?: string;
  persistence?: 'local' | 'server';
};

type DashboardPanelDraftStorage = Pick<Storage, 'getItem' | 'setItem'>;

type DashboardPanelDraftQueryRow = {
  label: string;
  value: string;
  meta: string;
};

export const DASHBOARD_PANEL_DRAFT_STORAGE_KEY = 'hertzbeat.dashboard.panel-drafts';
const DASHBOARD_PANEL_DRAFT_LIMIT = 6;

const DASHBOARD_DRAFT_SIGNAL_PATHS: Record<DashboardPanelDraft['signal'], string> = {
  logs: '/log/manage',
  traces: '/trace/manage',
  metrics: '/ingestion/otlp/metrics'
};

const DASHBOARD_DRAFT_SIGNAL_LABEL_KEYS: Record<DashboardPanelDraft['signal'], string> = {
  logs: 'dashboard.add-panel.signal.logs',
  traces: 'dashboard.add-panel.signal.traces',
  metrics: 'dashboard.add-panel.signal.metrics'
};

const DASHBOARD_DRAFT_DEFAULT_VISUALIZATIONS: Record<DashboardPanelDraft['signal'], SignalDashboardPanelVisualization> = {
  logs: 'table',
  traces: 'trace',
  metrics: 'graph'
};

const DASHBOARD_DRAFT_SYNC_LABEL_KEYS = {
  'local-cache': 'dashboard.add-panel.sync.local-cache',
  'server-loading': 'dashboard.add-panel.sync.server-loading',
  'server-backed': 'dashboard.add-panel.sync.server-backed',
  'server-unavailable': 'dashboard.add-panel.sync.server-unavailable',
  saving: 'dashboard.add-panel.sync.saving',
  saved: 'dashboard.add-panel.sync.saved',
  failed: 'dashboard.add-panel.sync.failed'
} as const;

function firstRouteText(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => value != null && value.trim() !== '')?.trim();
}

function compactDashboardPanelDraftText(value: string | null | undefined) {
  const normalized = firstRouteText(value);
  if (!normalized) return undefined;
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

function buildDashboardPanelDraftQueryRows(
  draft: DashboardPanelDraft,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
): DashboardPanelDraftQueryRow[] {
  const rows: DashboardPanelDraftQueryRow[] = [];
  if (draft.panelExpression) {
    rows.push({
      label: t('dashboard.add-panel.expression.label'),
      value: draft.panelExpression,
      meta: draft.panelDatasource || draft.panelQueryType || t('dashboard.add-panel.expression.meta')
    });
  }
  if (draft.panelQuery) {
    rows.push({
      label: t('dashboard.add-panel.query.label'),
      value: draft.panelQuery,
      meta: draft.panelQueryType || t('dashboard.add-panel.query.meta')
    });
  }
  return rows;
}

function readDashboardDraftRouteSearchParams(route: string) {
  const queryStart = route.indexOf('?');
  if (queryStart < 0) {
    return new URLSearchParams();
  }
  return new URLSearchParams(route.slice(queryStart + 1));
}

function readDashboardDraftPayloadTimestamp(payload: string | undefined) {
  if (!payload) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(payload) as { createdAt?: unknown };
    return typeof parsed.createdAt === 'number' && Number.isFinite(parsed.createdAt)
      ? parsed.createdAt
      : undefined;
  } catch {
    return undefined;
  }
}

function readDashboardDraftServerTimestamp(draft: SignalDashboardPanelDraft) {
  const timestamp = firstRouteText(draft.updateTime, draft.createTime);
  if (!timestamp) {
    return undefined;
  }
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function signalDashboardPanelDraftToSavedDraft(
  draft: SignalDashboardPanelDraft
): SavedDashboardPanelDraft | null {
  if (draft.signal !== 'logs' && draft.signal !== 'traces' && draft.signal !== 'metrics') {
    return null;
  }
  if (!draft.route || !draft.title || !draft.draftKey) {
    return null;
  }
  const searchParams = readDashboardDraftRouteSearchParams(draft.route);
  const context = readSignalRouteContext(searchParams);
  return {
    id: `${draft.signal}:${draft.draftKey}`,
    createdAt: readDashboardDraftServerTimestamp(draft) || readDashboardDraftPayloadTimestamp(draft.payload) || Date.now(),
    signal: draft.signal,
    signalLabelKey: DASHBOARD_DRAFT_SIGNAL_LABEL_KEYS[draft.signal],
    panelTitle: draft.title,
    explorerHref: draft.route,
    panelQuery: compactDashboardPanelDraftText(context.panelQuery || draft.querySnapshot || draft.description),
    panelQueryType: firstRouteText(context.panelQueryType, draft.visualization),
    panelExpression: compactDashboardPanelDraftText(context.panelExpression),
    panelDatasource: firstRouteText(context.panelDatasource),
    context,
    serverDraftKey: draft.draftKey,
    persistence: 'server'
  };
}

function mergeSavedDashboardPanelDrafts(drafts: SavedDashboardPanelDraft[]) {
  const seen = new Set<string>();
  const merged: SavedDashboardPanelDraft[] = [];
  for (const draft of drafts) {
    const key = draft.serverDraftKey ? `${draft.signal}:${draft.serverDraftKey}` : draft.id;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(draft);
  }
  return merged
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, DASHBOARD_PANEL_DRAFT_LIMIT);
}

export function createSignalDashboardPanelDraftFromOverviewIntent(
  draft: DashboardPanelDraft
): SignalDashboardPanelDraft {
  const querySummary = firstRouteText(draft.panelExpression, draft.panelQuery, draft.panelQueryType, draft.panelTitle) || draft.panelTitle;
  return createSignalDashboardPanelDraft({
    signal: draft.signal,
    title: draft.panelTitle,
    description: querySummary,
    visualization: DASHBOARD_DRAFT_DEFAULT_VISUALIZATIONS[draft.signal],
    route: draft.explorerHref,
    payload: {
      source: 'overview-add-panel-intent',
      context: draft.context
    }
  });
}

function readDashboardPanelDraft(searchParams: SearchParamReader): DashboardPanelDraft | null {
  if (searchParams.get('intent') !== 'add-panel') {
    return null;
  }
  const signal = searchParams.get('signal');
  if (signal !== 'logs' && signal !== 'traces' && signal !== 'metrics') {
    return null;
  }

  const context = readSignalRouteContext(searchParams);
  const panelQuery = compactDashboardPanelDraftText(context.panelQuery);
  const panelExpression = compactDashboardPanelDraftText(context.panelExpression);
  const panelQueryType = firstRouteText(context.panelQueryType);
  const panelDatasource = firstRouteText(context.panelDatasource);
  const panelTitle = firstRouteText(searchParams.get('panelTitle'), context.serviceName, context.entityName, signal)
    || signal;
  const explorerParams = new URLSearchParams();
  appendSignalRouteContext(explorerParams, {
    ...context,
    returnTo: '/overview'
  });
  const explorerQuery = explorerParams.toString();

  return {
    signal,
    signalLabelKey: DASHBOARD_DRAFT_SIGNAL_LABEL_KEYS[signal],
    panelTitle,
    explorerHref: `${DASHBOARD_DRAFT_SIGNAL_PATHS[signal]}${explorerQuery ? `?${explorerQuery}` : ''}`,
    panelQuery,
    panelQueryType,
    panelExpression,
    panelDatasource,
    context
  };
}

function isSavedDashboardPanelDraft(value: unknown): value is SavedDashboardPanelDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<SavedDashboardPanelDraft>;
  return typeof candidate.id === 'string'
    && Number.isFinite(candidate.createdAt)
    && (candidate.signal === 'logs' || candidate.signal === 'traces' || candidate.signal === 'metrics')
    && typeof candidate.panelTitle === 'string'
    && typeof candidate.explorerHref === 'string'
    && (candidate.panelQuery == null || typeof candidate.panelQuery === 'string')
    && (candidate.panelQueryType == null || typeof candidate.panelQueryType === 'string')
    && (candidate.panelExpression == null || typeof candidate.panelExpression === 'string')
    && (candidate.panelDatasource == null || typeof candidate.panelDatasource === 'string')
    && (candidate.serverDraftKey == null || typeof candidate.serverDraftKey === 'string')
    && (candidate.persistence == null || candidate.persistence === 'local' || candidate.persistence === 'server')
    && Boolean(candidate.context)
    && typeof candidate.context === 'object';
}

function browserDraftStorage(): DashboardPanelDraftStorage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage;
}

export function readSavedDashboardPanelDrafts(storage: DashboardPanelDraftStorage | undefined = browserDraftStorage()) {
  if (!storage) {
    return [];
  }
  try {
    const parsed = JSON.parse(storage.getItem(DASHBOARD_PANEL_DRAFT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(isSavedDashboardPanelDraft).slice(0, DASHBOARD_PANEL_DRAFT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function writeSavedDashboardPanelDrafts(
  drafts: SavedDashboardPanelDraft[],
  storage: DashboardPanelDraftStorage | undefined = browserDraftStorage()
) {
  const nextDrafts = drafts.filter(isSavedDashboardPanelDraft).slice(0, DASHBOARD_PANEL_DRAFT_LIMIT);
  if (storage) {
    storage.setItem(DASHBOARD_PANEL_DRAFT_STORAGE_KEY, JSON.stringify(nextDrafts));
  }
  return nextDrafts;
}

export function saveDashboardPanelDraft(
  draft: DashboardPanelDraft,
  currentDrafts: SavedDashboardPanelDraft[],
  storage: DashboardPanelDraftStorage | undefined = browserDraftStorage(),
  now = Date.now()
) {
  const savedDraft: SavedDashboardPanelDraft = {
    ...draft,
    id: `${draft.signal}:${now}:${draft.panelTitle}`,
    createdAt: now,
    persistence: 'local'
  };
  return writeSavedDashboardPanelDrafts([savedDraft, ...currentDrafts], storage);
}

async function loadOverviewRequest<T>(read: () => Promise<T>, fallback: T): Promise<OverviewRequestState<T>> {
  try {
    return { data: await read(), failed: false };
  } catch {
    return { data: fallback, failed: true };
  }
}

async function loadOverviewConsoleData(): Promise<OverviewData> {
  const [summary, alerts] = await Promise.all([
    loadOverviewRequest(() => api.overview.summary(), EMPTY_OVERVIEW_SUMMARY),
    loadOverviewRequest(() => api.overview.alerts(OVERVIEW_ALERT_LIST_QUERY), EMPTY_OVERVIEW_ALERTS)
  ]);

  return {
    summary: summary.data,
    alerts: alerts.data,
    summaryFailed: summary.failed,
    alertsFailed: alerts.failed
  };
}

export function hasOverviewReadyContext(data: OverviewData): boolean {
  return (data.summary.apps || []).length > 0 || (data.alerts.content || []).length > 0;
}

export function resolveOverviewRenderData(data: OverviewData, previousReadyData: OverviewData | null): OverviewRenderDataState {
  if (hasOverviewReadyContext(data)) {
    return {
      renderData: data,
      nextReadyData: data,
      retainedReadyData: false
    };
  }

  if (previousReadyData) {
    return {
      renderData: previousReadyData,
      nextReadyData: previousReadyData,
      retainedReadyData: true
    };
  }

  return {
    renderData: data,
    nextReadyData: null,
    retainedReadyData: false
  };
}

function problemFocusBadgeVariant(severityTone: 'default' | 'success' | 'warning' | 'danger') {
  if (severityTone === 'danger') {
    return 'danger' as const;
  }
  if (severityTone === 'success') {
    return 'success' as const;
  }
  if (severityTone === 'warning') {
    return 'accent' as const;
  }
  return 'default' as const;
}

export default function OverviewPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [problemFocusDialogOpen, setProblemFocusDialogOpen] = React.useState(false);
  const [selectedSummaryCard, setSelectedSummaryCard] = React.useState<OverviewSummaryItem | null>(null);
  const [selectedImpactedEntity, setSelectedImpactedEntity] = React.useState<OverviewImpactedItem | null>(null);
  const [savedDashboardPanelDrafts, setSavedDashboardPanelDrafts] = React.useState<SavedDashboardPanelDraft[]>(
    readSavedDashboardPanelDrafts
  );
  const [dashboardPanelDraftSyncState, setDashboardPanelDraftSyncState] = React.useState<
    'local-cache' | 'server-loading' | 'server-backed' | 'server-unavailable' | 'saving' | 'saved' | 'failed'
  >('local-cache');
  const lastReadyOverviewDataRef = React.useRef<OverviewData | null>(null);
  const overviewCacheKey = React.useMemo(
    () => ['overview', OVERVIEW_SUMMARY_URL, OVERVIEW_ALERT_LIST_URL, refreshNonce].join(':'),
    [refreshNonce]
  );
  const dashboardPanelDraft = React.useMemo(() => readDashboardPanelDraft(searchParams), [searchParams]);
  React.useEffect(() => {
    let active = true;
    setDashboardPanelDraftSyncState('server-loading');
    loadAllSignalDashboardPanelDrafts()
      .then(serverDrafts => {
        if (!active) {
          return;
        }
        const nextDrafts = mergeSavedDashboardPanelDrafts(
          serverDrafts
            .map(signalDashboardPanelDraftToSavedDraft)
            .filter((draft): draft is SavedDashboardPanelDraft => draft != null)
        );
        setSavedDashboardPanelDrafts(nextDrafts);
        writeSavedDashboardPanelDrafts(nextDrafts);
        setDashboardPanelDraftSyncState('server-backed');
      })
      .catch(() => {
        if (active) {
          setDashboardPanelDraftSyncState('server-unavailable');
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const load = React.useCallback(async (): Promise<OverviewData> => {
    return queryClient.fetchQuery({
      queryKey: queryKeys.overview.console({
        summary: OVERVIEW_SUMMARY_URL,
        alerts: OVERVIEW_ALERT_LIST_URL,
        refreshNonce
      }),
      queryFn: loadOverviewConsoleData,
      staleTime: 5000
    });
  }, [queryClient, refreshNonce]);

  function openProblemFocusDialog() {
    setSelectedSummaryCard(null);
    setSelectedImpactedEntity(null);
    setProblemFocusDialogOpen(true);
  }

  function openSummaryCardDialog(card: OverviewSummaryItem) {
    setProblemFocusDialogOpen(false);
    setSelectedImpactedEntity(null);
    setSelectedSummaryCard(card);
  }

  function openImpactedEntityDialog(entity: OverviewImpactedItem) {
    setProblemFocusDialogOpen(false);
    setSelectedSummaryCard(null);
    setSelectedImpactedEntity(entity);
  }

  async function saveCurrentDashboardPanelDraft() {
    if (!dashboardPanelDraft) {
      return;
    }
    const localDrafts = saveDashboardPanelDraft(dashboardPanelDraft, savedDashboardPanelDrafts);
    setSavedDashboardPanelDrafts(localDrafts);
    setDashboardPanelDraftSyncState('saving');
    try {
      const serverDraft = await saveSignalDashboardPanelDraft(
        createSignalDashboardPanelDraftFromOverviewIntent(dashboardPanelDraft)
      );
      const savedServerDraft = signalDashboardPanelDraftToSavedDraft(serverDraft);
      if (savedServerDraft) {
        const nextDrafts = mergeSavedDashboardPanelDrafts([savedServerDraft, ...localDrafts]);
        setSavedDashboardPanelDrafts(nextDrafts);
        writeSavedDashboardPanelDrafts(nextDrafts);
      }
      setDashboardPanelDraftSyncState('saved');
    } catch {
      setDashboardPanelDraftSyncState('failed');
    }
  }

  async function deleteSavedDashboardPanelDraft(draft: SavedDashboardPanelDraft) {
    const nextDrafts = writeSavedDashboardPanelDrafts(
      savedDashboardPanelDrafts.filter(candidate => candidate.id !== draft.id)
    );
    setSavedDashboardPanelDrafts(nextDrafts);
    if (!draft.serverDraftKey) {
      return;
    }
    try {
      await deleteSignalDashboardPanelDraft(draft.signal, draft.serverDraftKey);
      setDashboardPanelDraftSyncState('server-backed');
    } catch {
      setDashboardPanelDraftSyncState('failed');
    }
  }

  return (
    <ClientWorkbench
      key={refreshNonce}
      load={load}
      loadingCopy={t('overview.loading')}
      cacheKey={overviewCacheKey}
      cacheSettledTtlMs={OVERVIEW_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const { renderData, nextReadyData, retainedReadyData } = resolveOverviewRenderData(data, lastReadyOverviewDataRef.current);
        lastReadyOverviewDataRef.current = nextReadyData;
        const apps = renderData.summary.apps || [];
        const alerts = renderData.alerts.content || [];
        const overviewReadPartiallyFailed = Boolean(data.summaryFailed || data.alertsFailed);
        const viewModel = buildOverviewConsoleViewModel(apps, alerts, t);
        const topAlert = alerts[0];
        const setupRoute = buildOverviewSignalDeskHref('/ingestion/otlp?signal=logs', topAlert);
        const statusActionHref = '/entities';
        const statusActionLabel = t('dashboard.home.status.action.entities');
        const quickEntryItems = viewModel.quickEntryItems.map(item => ({
          ...item,
          route: buildOverviewSignalDeskHref(item.route, topAlert)
        }));
        const guidanceNextLinks = viewModel.guidanceNextLinks.map(item => ({
          ...item,
          route: buildOverviewSignalDeskHref(item.route, topAlert)
        }));
        const guidanceLinkLabels = new Set(guidanceNextLinks.map(item => item.label));
        const condensedQuickEntryItems = quickEntryItems.filter(item => !guidanceLinkLabels.has(item.label));
        const actionableImpactedEntities = viewModel.impactedEntities.filter(
          item => item.status !== 'healthy' || item.severity !== 'healthy'
        );
        const healthyOverviewPlaceholder = !viewModel.showSetupGuide && viewModel.problemFocus.severity === 'healthy';
        const statusItems = healthyOverviewPlaceholder
          ? [
              {
                key: 'workspace' as const,
                label: t('dashboard.home.status.workspace'),
                value: t('dashboard.home.status.ready'),
                ready: true
              },
              {
                key: 'ingestion' as const,
                label: t('dashboard.home.status.ingestion'),
                value: t('dashboard.home.status.pending'),
                ready: false
              },
              {
                key: 'entities' as const,
                label: t('dashboard.home.status.entities'),
                value: t('dashboard.home.status.pending'),
                ready: false
              },
              {
                key: 'alerts' as const,
                label: t('dashboard.home.status.alerts'),
                value: t('dashboard.home.status.pending'),
                ready: false
              }
            ]
          : viewModel.workspaceStatusItems;
        const railChecklistItems = healthyOverviewPlaceholder
          ? viewModel.checklistItems.map(item => ({
              ...item,
              ready: false
            }))
          : viewModel.checklistItems;
        const setupLikeGuidance = viewModel.showSetupGuide || healthyOverviewPlaceholder;
        const railGuidanceHeadline = setupLikeGuidance
          ? t('dashboard.guidance.setup.headline')
          : viewModel.guidanceHeadline;
        const railGuidanceDescription = setupLikeGuidance
          ? t('dashboard.guidance.setup.description')
          : viewModel.guidanceDescription;
        const railGuidanceReasons = setupLikeGuidance
          ? [
              { label: t('dashboard.setup.status.logs'), value: t('dashboard.setup.status.pending') },
              { label: t('dashboard.setup.status.traces'), value: t('dashboard.setup.status.pending') },
              { label: t('dashboard.setup.status.metrics'), value: t('dashboard.setup.status.pending') }
            ]
          : viewModel.guidanceReasons;
        const railGuidanceNextLinks = setupLikeGuidance
          ? []
          : guidanceNextLinks.map(item => ({
              label: item.label,
              description: item.description,
              href: item.route
            }));
        const dashboardPanelDraftContextRows = dashboardPanelDraft
          ? [
              ...buildSignalEntityContextRows(dashboardPanelDraft.context, {}, t),
              ...buildDashboardPanelDraftQueryRows(dashboardPanelDraft, t)
            ]
          : [];
        const hasDashboardPanelDraftWorkspace = Boolean(dashboardPanelDraft) || savedDashboardPanelDrafts.length > 0;
        const dashboardPanelDraftSubtitle = dashboardPanelDraft
          ? t('dashboard.add-panel.description', {
              signal: t(dashboardPanelDraft.signalLabelKey),
              title: dashboardPanelDraft.panelTitle
            })
          : t('dashboard.add-panel.saved-description');

        return (
          <>
            <ThreeSignalDeskShell
              kicker={t('dashboard.darkops.kicker')}
              title={t('dashboard.darkops.title')}
              subtitle={t('dashboard.darkops.subtitle')}
              showRail
              showFooter
              chrome="plain"
              railWidth="wide"
              className="bg-[#0b0c0e]"
              surfaceClassName="bg-[#0b0c0e]"
              mainClassName="bg-[#0b0c0e]"
              railClassName="bg-[#0b0c0e]"
              data-overview-shell-chrome="plain-dark-workbench"
              mainProps={{ 'data-overview-shell-main-owner': 'plain-dark-workbench' }}
              railProps={{ 'data-overview-shell-rail-owner': 'plain-dark-workbench' }}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setProblemFocusDialogOpen(false);
                      setSelectedSummaryCard(null);
                      setSelectedImpactedEntity(null);
                      setRefreshNonce(current => current + 1);
                    }}
                  >
                    {t('dashboard.darkops.action.refresh')}
                  </Button>
                  {!viewModel.showSetupGuide && !healthyOverviewPlaceholder ? (
                    <Link href="/alerts" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                      {t('dashboard.darkops.action.review-alerts')}
                    </Link>
                  ) : null}
                </>
              }
              main={
                <div
                  className="grid gap-3"
                  data-overview-request-fallback={overviewReadPartiallyFailed ? 'angular-partial-request-fallback' : undefined}
                  data-overview-stale-ready-retained={retainedReadyData ? 'angular-has-ready-overview-retains-last-data' : undefined}
                >
                <OverviewStatusGrid
                  title={t('dashboard.home.status.title')}
                  description={t('dashboard.home.status.copy')}
                  items={statusItems}
                  density={healthyOverviewPlaceholder ? 'compact' : 'default'}
                  action={
                    !viewModel.showSetupGuide && !healthyOverviewPlaceholder ? (
                      <OverviewSectionAction href={statusActionHref} label={statusActionLabel} />
                    ) : undefined
                  }
                />

                {hasDashboardPanelDraftWorkspace ? (
                  <SupportPanel
                    title={t('dashboard.add-panel.title')}
                    subtitle={dashboardPanelDraftSubtitle}
                    chrome="plain"
                    expanded
                  >
                    <div
                      className="grid gap-3"
                      data-overview-dashboard-panel-draft="true"
                      data-overview-dashboard-panel-draft-signal={dashboardPanelDraft?.signal}
                      data-overview-dashboard-panel-draft-owner="overview-add-panel-intent"
                      data-overview-dashboard-panel-draft-persistence={dashboardPanelDraftSyncState}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--ops-text-secondary)]">
                        {dashboardPanelDraft ? (
                          <>
                            <span
                              className="rounded-[3px] border border-[var(--ops-border-color)] px-2 py-1 font-semibold text-[var(--ops-text-primary)]"
                              data-overview-dashboard-panel-draft-title="true"
                            >
                              {dashboardPanelDraft.panelTitle}
                            </span>
                            <span data-overview-dashboard-panel-draft-signal-label="true">
                              {t(dashboardPanelDraft.signalLabelKey)}
                            </span>
                          </>
                        ) : null}
                        <span
                          className="rounded-[3px] border border-[var(--ops-border-color)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ops-text-tertiary)]"
                          data-overview-dashboard-panel-draft-sync-state={dashboardPanelDraftSyncState}
                        >
                          {t(DASHBOARD_DRAFT_SYNC_LABEL_KEYS[dashboardPanelDraftSyncState])}
                        </span>
                      </div>
                      {dashboardPanelDraft ? (
                        <>
                          <div
                            className="grid gap-2 sm:grid-cols-2"
                            data-overview-dashboard-panel-draft-context="true"
                          >
                            {dashboardPanelDraftContextRows.map(row => (
                              <div key={`${row.label}:${row.value}`} className="rounded-[3px] border border-[var(--ops-border-color)] px-2.5 py-2">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ops-text-tertiary)]">
                                  {row.label}
                                </div>
                                <div className="mt-1 truncate text-[12px] font-semibold text-[var(--ops-text-primary)]">
                                  {row.value}
                                </div>
                                <div className="mt-1 truncate text-[11px] text-[var(--ops-text-tertiary)]">
                                  {row.meta}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2" data-overview-dashboard-panel-draft-actions="true">
                            <OverviewSectionAction
                              onClick={saveCurrentDashboardPanelDraft}
                              label={t('dashboard.add-panel.action.save-draft')}
                              variant="primary"
                            />
                            <OverviewSectionAction
                              href={dashboardPanelDraft.explorerHref}
                              label={t('dashboard.add-panel.action.open-explorer')}
                            />
                            <OverviewSectionAction
                              href="/alerts"
                              label={t('dashboard.problem-focus.review-alerts')}
                            />
                          </div>
                        </>
                      ) : null}
                      {savedDashboardPanelDrafts.length > 0 ? (
                        <div
                          className="grid gap-2"
                          data-overview-dashboard-panel-draft-list="true"
                          data-overview-dashboard-panel-draft-list-count={savedDashboardPanelDrafts.length}
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ops-text-tertiary)]">
                            {t('dashboard.add-panel.saved-title')}
                          </div>
                          <div className="grid gap-1">
                            {savedDashboardPanelDrafts.map(savedDraft => (
                              <div
                                key={savedDraft.id}
                                className="grid gap-1 rounded-[3px] border border-[var(--ops-border-color)] px-2.5 py-2 text-[12px]"
                                data-overview-dashboard-panel-draft-list-item={savedDraft.signal}
                                data-overview-dashboard-panel-draft-list-item-persistence={savedDraft.persistence || 'local'}
                              >
                                <Link
                                  href={savedDraft.explorerHref}
                                  className="grid gap-0.5 hover:text-[var(--ops-text-primary)]"
                                >
                                  <span className="font-semibold text-[var(--ops-text-primary)]">
                                    {savedDraft.panelTitle}
                                  </span>
                                  <span className="text-[11px] text-[var(--ops-text-tertiary)]">
                                    {t(savedDraft.signalLabelKey)}
                                  </span>
                                </Link>
                                <div className="flex flex-wrap gap-2">
                                  <OverviewSectionAction
                                    href={savedDraft.explorerHref}
                                    label={t('dashboard.add-panel.action.open-explorer')}
                                  />
                                  <OverviewSectionAction
                                    onClick={() => void deleteSavedDashboardPanelDraft(savedDraft)}
                                    label={t('dashboard.add-panel.action.delete-draft')}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </SupportPanel>
                ) : null}

                {viewModel.showSetupGuide ? (
                  <SupportPanel title={t('dashboard.empty.title')} subtitle={t('dashboard.empty.copy')} chrome="plain" expanded>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">
                      {t('dashboard.empty.title')}
                    </div>
                  </SupportPanel>
                ) : (
                  <>
                    {healthyOverviewPlaceholder ? (
                      <SupportPanel
                        title={t('dashboard.empty.title')}
                        subtitle={t('dashboard.empty.copy')}
                        chrome="default"
                        tone="default"
                        expanded
                      >
                        <div className="min-h-[48px]" />
                      </SupportPanel>
                    ) : null}

                    {!healthyOverviewPlaceholder ? (
                      <>
                        <StageSection
                          title={viewModel.problemFocus.title}
                          description={viewModel.problemFocus.summary}
                          chrome="plain"
                          compact
                          actions={
                            <Badge
                              variant={problemFocusBadgeVariant(viewModel.problemFocus.severityTone)}
                              data-overview-problem-focus-severity-tone={viewModel.problemFocus.severityTone}
                            >
                              {viewModel.problemFocus.severityLabel}
                            </Badge>
                          }
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">
                            {t('dashboard.problem-focus.kicker')}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-4">
                            <div className="grid gap-1 border-r border-[var(--ops-border-color)] pr-4">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ops-text-tertiary)]">
                                {t('dashboard.problem-focus.entity')}
                              </div>
                              <div className="text-[13px] font-semibold text-[var(--ops-text-primary)]">
                                {viewModel.problemFocus.entity}
                              </div>
                            </div>
                            <div className="grid gap-1">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ops-text-tertiary)]">
                                {t('dashboard.problem-focus.owner')}
                              </div>
                              <div className="text-[13px] font-semibold text-[var(--ops-text-primary)]">
                                {viewModel.problemFocus.owner}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <OverviewSectionAction
                              onClick={openProblemFocusDialog}
                              label={t('dashboard.problem-focus.open-context')}
                              variant="primary"
                            />
                            <OverviewSectionAction
                              href="/alerts"
                              label={t('dashboard.problem-focus.review-alerts')}
                            />
                          </div>
                        </StageSection>

                        <OverviewSummaryGrid
                          items={viewModel.summaryCards}
                          onSelect={openSummaryCardDialog}
                        />
                      </>
                    ) : null}

                    {!healthyOverviewPlaceholder ? (
                      <OverviewQuickEntryGrid
                        kicker={t('dashboard.quick-entry.kicker')}
                        title={t('dashboard.quick-entry.title')}
                        items={condensedQuickEntryItems}
                      />
                    ) : null}

                    {!healthyOverviewPlaceholder && actionableImpactedEntities.length > 0 ? (
                      <OverviewImpactedList
                        kicker={t('dashboard.affected.kicker')}
                        title={t('dashboard.affected.title')}
                        action={
                          <OverviewSectionAction
                            href="/entities"
                            label={t('dashboard.affected.browse-all')}
                          />
                        }
                        items={actionableImpactedEntities}
                        onOpenItem={openImpactedEntityDialog}
                      />
                    ) : null}
                  </>
                )}
                </div>
              }
              rail={
                <div className="grid gap-3">
                <OverviewGuidancePanel
                  headline={railGuidanceHeadline}
                  description={railGuidanceDescription}
                  density={healthyOverviewPlaceholder ? 'compact' : 'default'}
                  compactReasons={healthyOverviewPlaceholder}
                  reasonDensity={healthyOverviewPlaceholder ? 'compact' : 'default'}
                  primaryAction={
                    setupLikeGuidance ? (
                      <OverviewSectionAction
                        href={setupRoute}
                        label={t('dashboard.guidance.setup.action')}
                        variant="primary"
                      />
                    ) : (
                      <OverviewSectionAction
                        onClick={openProblemFocusDialog}
                        label={t('dashboard.problem-focus.open-context')}
                        variant="primary"
                      />
                    )
                  }
                  secondaryAction={
                    !setupLikeGuidance ? (
                      <OverviewSectionAction
                        href="/alerts"
                        label={t('dashboard.problem-focus.review-alerts')}
                      />
                    ) : undefined
                  }
                  reasons={railGuidanceReasons}
                  nextLinks={railGuidanceNextLinks}
                  startLabel={t('workspace.guidance.start')}
                  reasonsLabel={t('workspace.guidance.reasons')}
                  nextLabel={t('workspace.guidance.next')}
                />

                <OverviewChecklist
                  title={t('dashboard.setup.checklist.title')}
                  items={railChecklistItems}
                  density={healthyOverviewPlaceholder ? 'compact' : 'default'}
                />
                </div>
              }
              footer={
                <OverviewActivityTimeline
                  title={t('dashboard.activity.title')}
                  items={viewModel.activityItems}
                  emptyText={t('dashboard.activity.empty')}
                />
              }
            />
            {!viewModel.showSetupGuide ? (
              <OverviewProblemFocusDialog
                open={problemFocusDialogOpen}
                onClose={() => setProblemFocusDialogOpen(false)}
                kicker={t('dashboard.problem-focus.kicker')}
                title={viewModel.problemFocus.title}
                summary={viewModel.problemFocus.summary}
                subtitle={`${viewModel.problemFocus.entity} · ${viewModel.problemFocus.severityLabel}`}
                ownerLabel={t('dashboard.problem-focus.owner')}
                owner={viewModel.problemFocus.owner}
                entityLabel={t('dashboard.problem-focus.entity')}
                entity={viewModel.problemFocus.entity}
                closeLabel={t('common.button.cancel')}
              />
            ) : null}
            {!viewModel.showSetupGuide ? (
              <OverviewDetailDialog
                open={selectedSummaryCard !== null}
                onClose={() => setSelectedSummaryCard(null)}
                title={selectedSummaryCard?.label || ''}
                subtitle={t('dashboard.summary.drawer-subtitle')}
                description={selectedSummaryCard?.hint || ''}
                sections={
                  selectedSummaryCard
                    ? [
                        { label: t('dashboard.summary.value'), value: selectedSummaryCard.value },
                        { label: t('dashboard.summary.delta'), value: selectedSummaryCard.delta }
                      ]
                    : []
                }
                closeLabel={t('common.button.cancel')}
              />
            ) : null}
            {!viewModel.showSetupGuide ? (
              <OverviewDetailDialog
                open={selectedImpactedEntity !== null}
                onClose={() => setSelectedImpactedEntity(null)}
                title={selectedImpactedEntity ? `${selectedImpactedEntity.name} ${selectedImpactedEntity.type}` : ''}
                subtitle={t('dashboard.affected.drawer-subtitle')}
                description={selectedImpactedEntity?.lastIssue || ''}
                statusTone={selectedImpactedEntity?.severityTone}
                statusLabel={selectedImpactedEntity?.severityLabel}
                sections={
                  selectedImpactedEntity
                    ? [
                        { label: t('dashboard.problem-focus.owner'), value: selectedImpactedEntity.owner },
                        { label: t('dashboard.affected.status-label'), value: selectedImpactedEntity.statusLabel }
                      ]
                    : []
                }
                closeLabel={t('common.button.cancel')}
              />
            ) : null}
          </>
        );
      }}
    </ClientWorkbench>
  );
}
