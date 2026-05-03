'use client';

import React from 'react';
import Link from 'next/link';
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
import { apiMessageGet } from '@/lib/api-client';
import { buildOverviewConsoleViewModel } from '@/lib/overview/view-model';
import type { DashboardSummary, PageResult, SingleAlert } from '@/lib/types';
import { OverviewDetailDialog } from '../../components/overview/overview-detail-dialog';
import { OverviewProblemFocusDialog } from '../../components/overview/overview-problem-focus-dialog';
import { ThreeSignalDeskShell } from '../../components/pages/three-signal-desk-shell';
import { buildOverviewSignalDeskHref } from '../../lib/overview/navigation';

type OverviewData = {
  summary: DashboardSummary;
  alerts: PageResult<SingleAlert>;
};

function resolveProblemFocusBadgeVariant(severity: string) {
  if (severity === 'critical' || severity === 'error') {
    return 'danger' as const;
  }
  if (severity === 'healthy') {
    return 'success' as const;
  }
  return 'accent' as const;
}

export default function OverviewPage() {
  const { t } = useI18n();
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [problemFocusDialogOpen, setProblemFocusDialogOpen] = React.useState(false);
  const [selectedSummaryCard, setSelectedSummaryCard] = React.useState<OverviewSummaryItem | null>(null);
  const [selectedImpactedEntity, setSelectedImpactedEntity] = React.useState<OverviewImpactedItem | null>(null);

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
      load={async (): Promise<OverviewData> => {
        const [summary, alerts] = await Promise.all([
          apiMessageGet<DashboardSummary>('/summary'),
          apiMessageGet<PageResult<SingleAlert>>('/alerts?pageIndex=0&pageSize=6&sort=gmtUpdate&order=desc')
        ]);
        return { summary, alerts };
      }}
      loadingCopy={t('overview.loading')}
    >
      {data => {
        const apps = data.summary.apps || [];
        const alerts = data.alerts.content || [];
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
              railWidth="wide"
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
                <div className="grid gap-3">
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
                            <Badge variant={resolveProblemFocusBadgeVariant(viewModel.problemFocus.severity)}>
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
                status={selectedImpactedEntity?.severity}
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
