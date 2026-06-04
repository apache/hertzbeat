'use client';

import React from 'react';
import Link from 'next/link';
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
  const queryClient = useQueryClient();
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [problemFocusDialogOpen, setProblemFocusDialogOpen] = React.useState(false);
  const [selectedSummaryCard, setSelectedSummaryCard] = React.useState<OverviewSummaryItem | null>(null);
  const [selectedImpactedEntity, setSelectedImpactedEntity] = React.useState<OverviewImpactedItem | null>(null);
  const lastReadyOverviewDataRef = React.useRef<OverviewData | null>(null);
  const overviewCacheKey = React.useMemo(
    () => ['overview', OVERVIEW_SUMMARY_URL, OVERVIEW_ALERT_LIST_URL, refreshNonce].join(':'),
    [refreshNonce]
  );
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
