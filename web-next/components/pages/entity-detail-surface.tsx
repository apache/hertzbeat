'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Bell, Edit3, FileText, GitBranch, Network, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { interpolate, type TranslationParams } from '../../lib/i18n';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import {
  buildCollectionSourceRows,
  buildCurrentAlertRows,
  buildDetailFacts,
  buildDrilldownRows,
  buildEntityAttributionRows,
  buildEntityContextHandoffLinks,
  buildEntityEvidenceHandoffRows,
  buildEntityHealthModel,
  buildEntityIncomingContextRows,
  buildNextActionRows,
  buildOverviewRows,
  buildRelationshipRows,
  buildSummaryRows,
  buildUnifiedEvidenceRows
} from '../../lib/entity-detail/view-model';
import type { SignalRouteContext } from '../../lib/signal-route-context';
import type { EntityDetailDto } from '../../lib/types';

type EntityDetailSurfaceProps = {
  detail: EntityDetailDto;
  routeContext?: SignalRouteContext;
  actionError: string | null;
  isPending: boolean;
  onDelete: (entityId: string | number | null | undefined) => void;
  onRefresh: () => void;
};

type DetailRow = {
  title: string;
  copy: string;
  freshness?: string;
  href?: string;
  meta: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

type ContextLinkRow = DetailRow & {
  key: string;
};

type EvidenceHandoffRow = DetailRow & {
  key: string;
  evidence: string;
  count: number;
};

type IncomingContextRow = {
  label: string;
  value: string;
  meta: string;
};

type AttributionRow = DetailRow & {
  key: string;
  state: 'ready' | 'review' | 'missing';
};

const coldEntityDetailVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldDangerButtonClassName =
  'h-8 min-w-[88px] rounded-[3px] border-[#3f2228] bg-[#181013] px-3 text-[12px] font-semibold text-[#f0b8c1] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#8b3341] hover:bg-[#211217] hover:text-[#ffd5dc]';

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

function translateEntityDetail(key: string, params?: TranslationParams) {
  const template = SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
  return interpolate(template, params);
}

function resolveTitle(detail: EntityDetailDto) {
  const entity = detail.entity?.entity || {};
  return entity.displayName || entity.name || translateEntityDetail('entities.detail.title.fallback');
}

function resolveSubtitle(detail: EntityDetailDto) {
  const activeAlerts = detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? 0;
  const downMonitors = detail.evidenceSummary?.downMonitorCount ?? 0;
  const hasEvidence = (detail.logSummary?.hintCount ?? 0) > 0 || (detail.traceSummary?.recentTraceCount ?? 0) > 0 || (detail.boundMonitors?.length ?? 0) > 0;

  if (activeAlerts > 0) {
    return translateEntityDetail('entities.detail.subtitle.active-alerts');
  }
  if (downMonitors > 0) {
    return translateEntityDetail('entities.detail.subtitle.down-monitors');
  }
  if (hasEvidence) {
    return translateEntityDetail('entities.detail.subtitle.has-evidence');
  }
  return translateEntityDetail('entities.detail.subtitle.needs-context');
}

function countMetrics(detail: EntityDetailDto) {
  return [
    {
      label: translateEntityDetail('entities.detail.metric.bound-monitors'),
      value: detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? detail.entity?.monitorBinds?.length ?? 0,
      Icon: Network
    },
    {
      label: translateEntityDetail('entities.detail.metric.active-alerts'),
      value: detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? detail.evidenceSummary?.activeAlertCount ?? 0,
      Icon: Bell
    },
    {
      label: translateEntityDetail('entities.detail.metric.identities'),
      value: detail.evidenceSummary?.identityCount ?? detail.entity?.identities?.length ?? 0,
      Icon: FileText
    },
    {
      label: translateEntityDetail('entities.detail.metric.relations'),
      value: detail.entity?.relations?.length ?? 0,
      Icon: GitBranch
    }
  ];
}

function rowStatusClass(tone: DetailRow['tone'] = 'neutral') {
  switch (tone) {
    case 'success':
      return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
    case 'warning':
      return 'border-[#574622] bg-[#1b1710] text-[#facc6b]';
    case 'danger':
      return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
    default:
      return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
  }
}

function attributionStateClass(state: AttributionRow['state']) {
  switch (state) {
    case 'ready':
      return 'border-[#1f5137] bg-[#0f2f23] text-[#86efac]';
    case 'review':
      return 'border-[#574622] bg-[#1b1710] text-[#facc6b]';
    default:
      return 'border-[#5f2630] bg-[#211217] text-[#f0b8c1]';
  }
}

function attributionStateLabel(state: AttributionRow['state']) {
  switch (state) {
    case 'ready':
      return translateEntityDetail('entities.detail.attribution.ready');
    case 'review':
      return translateEntityDetail('entities.detail.attribution.review');
    default:
      return translateEntityDetail('entities.detail.attribution.missing');
  }
}

function AttributionRows({ rows }: { rows: AttributionRow[] }) {
  return (
    <div data-entity-detail-attribution-panel="entity-resource-attribution" className="mb-3 grid gap-2 sm:grid-cols-2">
      {rows.map(row => (
        <div
          key={row.key}
          data-entity-detail-attribution-row={row.key}
          data-entity-detail-attribution-state={row.state}
          className="min-h-[76px] rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#eef2f7]">{row.title}</div>
              <p className="mt-1 truncate text-[12px] leading-5 text-[#8f99ab]">{row.copy}</p>
            </div>
            <span className={`shrink-0 rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${attributionStateClass(row.state)}`}>
              {attributionStateLabel(row.state)}
            </span>
          </div>
          <p className="mt-2 truncate text-[11px] leading-4 text-[#7e8494]">{row.meta}</p>
        </div>
      ))}
    </div>
  );
}

function RowStack({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map(row => {
        const className = `grid min-h-[54px] gap-2 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${row.href ? 'text-[#dbe4f0] transition hover:border-[#4e74f8] hover:bg-[#151820]' : ''}`;
        const content = (
          <>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[#eef2f7]">{row.title}</div>
            <p className="mt-1 truncate text-[12px] leading-5 text-[#8f99ab]">{row.copy}</p>
            {row.freshness ? (
              <p data-entity-health-collector-freshness="last-seen" className="mt-0.5 truncate text-[11px] leading-4 text-[#6f7788]">
                {row.freshness}
              </p>
            ) : null}
          </div>
          <span className={`inline-flex max-w-full items-center justify-center truncate rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${rowStatusClass(row.tone)}`}>
            {row.meta}
          </span>
          </>
        );

        return row.href ? (
          <Link
            key={`${row.title}-${row.copy}-${row.meta}`}
            href={row.href}
            data-entity-health-collector-handoff="collector-cluster"
            className={className}
          >
            {content}
          </Link>
        ) : (
          <div key={`${row.title}-${row.copy}-${row.meta}`} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function DetailPanel({
  children,
  copy,
  marker,
  title
}: {
  children: React.ReactNode;
  copy: string;
  marker: string;
  title: string;
}) {
  return (
    <section data-entity-detail-panel={marker} className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.28)]">
      <div className="mb-3 flex min-h-[36px] items-start justify-between gap-3 border-b border-[#252b34] pb-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[#eef2f7]">{title}</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{copy}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RouteRows({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <Link
          key={`${row.title}-${row.copy}`}
          href={row.copy.startsWith('/') ? row.copy : '#'}
          className="grid min-h-[54px] gap-2 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151820] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        >
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-[#eef2f7]">{row.title}</span>
            <span className="mt-1 block truncate text-[12px] text-[#8f99ab]">{row.copy}</span>
          </span>
          <span className="rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-0.5 text-[11px] font-semibold text-[#cbd5e1]">
            {row.meta}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ContextLinkRows({ rows }: { rows: ContextLinkRow[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(link => (
        <Link
          key={link.key}
          data-entity-detail-context-link={link.key}
          href={link.copy}
          className="grid min-h-[64px] gap-1 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151820]"
        >
          <span className="text-[12px] font-semibold text-[#eef2f7]">{link.title}</span>
          <span className="truncate text-[11px] text-[#8f99ab]">{link.copy}</span>
          <span className="mt-1 w-fit rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-0.5 text-[11px] font-semibold text-[#cbd5e1]">
            {link.meta}
          </span>
        </Link>
      ))}
    </div>
  );
}

function EvidenceHandoffRows({ rows }: { rows: EvidenceHandoffRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div data-entity-detail-evidence-handoff="alert-topology-runbook" className="mt-3 grid gap-2 sm:grid-cols-3">
      {rows.map(row => (
        <Link
          key={row.key}
          data-entity-detail-evidence-handoff-row={row.key}
          data-entity-detail-evidence-handoff-source={row.evidence}
          data-entity-detail-evidence-handoff-count={row.count}
          href={row.href || '#'}
          className="grid min-h-[64px] gap-1 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151820]"
        >
          <span className="text-[12px] font-semibold text-[#eef2f7]">{row.title}</span>
          <span className="truncate text-[11px] text-[#8f99ab]">{row.copy}</span>
          <span className={`mt-1 w-fit max-w-full truncate rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold ${rowStatusClass(row.tone)}`}>
            {row.meta}
          </span>
        </Link>
      ))}
    </div>
  );
}

function InheritedContextRows({ rows }: { rows: IncomingContextRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div data-entity-detail-inherited-context="route-context" className="mb-3 grid gap-2 sm:grid-cols-2">
      {rows.map(row => (
        <div
          key={`${row.label}-${row.value}-${row.meta}`}
          data-entity-detail-inherited-context-row={row.label}
          className="min-h-[52px] rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="shrink-0 text-[11px] font-semibold tracking-[0.08em] text-[#7e8494]">{row.label}</span>
            <span className="min-w-0 truncate text-right text-[12px] font-semibold text-[#eef2f7]">{row.value}</span>
          </div>
          <p className="mt-1 truncate text-[11px] leading-4 text-[#8f99ab]">{row.meta}</p>
        </div>
      ))}
    </div>
  );
}

export function EntityDetailSurface({ detail, routeContext, actionError, isPending, onDelete, onRefresh }: EntityDetailSurfaceProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const entity = detail.entity?.entity || {};
  const entityId = entity.id;
  const title = resolveTitle(detail);
  const facts = buildDetailFacts(entity, translateEntityDetail);
  const metrics = countMetrics(detail);
  const contextLinks = buildEntityContextHandoffLinks(detail, routeContext || 'last-1h', translateEntityDetail);
  const incomingContextRows = buildEntityIncomingContextRows(routeContext, translateEntityDetail);
  const healthRows = buildEntityHealthModel(detail, translateEntityDetail);
  const evidenceRows = buildUnifiedEvidenceRows(detail, translateEntityDetail);
  const evidenceHandoffRows = buildEntityEvidenceHandoffRows(detail, routeContext || 'last-1h', translateEntityDetail);
  const closeDeleteDialog = () => setDeleteDialogOpen(false);
  const submitDeleteDialog = () => {
    if (!entityId) {
      closeDeleteDialog();
      return;
    }
    closeDeleteDialog();
    onDelete(entityId);
  };

  return (
    <>
      <main
        data-entity-detail-surface="otlp-cold-entity-detail"
        data-entity-detail-style-baseline={coldEntityDetailVisual.canvasName}
        data-entity-detail-layout="full-width-workbench"
        className={coldEntityDetailVisual.canvas.root}
        style={coldEntityDetailVisual.canvas.backgroundStyle}
      >
        <section className={coldEntityDetailVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-entity-detail-header="cold-compact-header" className={coldEntityDetailVisual.panel.hero}>
                <div className="max-w-[920px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">{translateEntityDetail('entities.detail.header.kicker')}</span>
                    <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] font-semibold text-[#cbd5e1]">{translateEntityDetail('entities.detail.header.badge')}</span>
                  </div>
                  <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">{resolveSubtitle(detail)}</p>
                  <div data-entity-detail-command-row="standard-equal-buttons" className={coldEntityDetailVisual.button.row}>
                    <Link href="/entities" className={coldLinkButtonClassName}>
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      {translateEntityDetail('entities.detail.action.all-entities')}
                    </Link>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {translateEntityDetail('common.refresh')}
                    </Button>
                    {entityId ? (
                      <Link href={`/entities/${entityId}/definition`} className={coldLinkButtonClassName}>
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        {translateEntityDetail('entities.detail.action.edit-definition')}
                      </Link>
                    ) : null}
                    {entityId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className={coldDangerButtonClassName}
                        data-entity-detail-delete-confirm-trigger="cold-modal"
                        disabled={isPending}
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {translateEntityDetail('entities.detail.action.delete')}
                      </Button>
                    ) : null}
                    {entityId ? (
                      <Link href={`/entities/${entityId}/edit`} className={coldPrimaryLinkClassName}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {translateEntityDetail('entities.detail.action.edit')}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

          <div data-entity-detail-count-strip="cold-inline-counts" className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex min-h-[36px] items-center justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-3 text-[12px] text-[#a9b0bb]"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </span>
                <span className="text-[17px] font-semibold tabular-nums text-[#eef2f7]">{value}</span>
              </div>
            ))}
          </div>

          <div
            data-entity-detail-error="cold-inline-error"
            className={actionError ? 'mb-5 rounded-[4px] border border-[#7f1d1d]/55 bg-[#2a1214] px-4 py-3 text-[12px] text-[#fca5a5]' : 'hidden'}
            aria-hidden={actionError ? undefined : true}
          >
            <span className="font-semibold">{translateEntityDetail('entities.detail.error.title')}</span>
            {actionError ? <span className="ml-2">{actionError}</span> : null}
          </div>

          <div data-entity-detail-signal-grid="cold-detail-grid" className="grid items-start gap-5 lg:grid-cols-2">
            <DetailPanel
              marker="overview"
              title={translateEntityDetail('entities.detail.panel.overview.title')}
              copy={translateEntityDetail('entities.detail.panel.overview.copy')}
            >
              <div data-entity-detail-overview-panel="cold-overview-panel">
                <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {facts.map(fact => (
                    <div key={fact.label} className="min-h-[36px] rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-[0.08em] text-[#7e8494]">{fact.label}</div>
                      <div className="mt-1 truncate text-[12px] font-semibold text-[#eef2f7]">{fact.value}</div>
                    </div>
                  ))}
                </div>
                <RowStack rows={buildOverviewRows(entity, detail, translateEntityDetail)} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="context"
              title={translateEntityDetail('entities.detail.panel.context.title')}
              copy={translateEntityDetail('entities.detail.panel.context.copy')}
            >
              <div data-entity-detail-context-center="hertzbeat-entity-context">
                <InheritedContextRows rows={incomingContextRows} />
                <ContextLinkRows rows={contextLinks} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="health"
              title={translateEntityDetail('entities.detail.panel.health.title')}
              copy={translateEntityDetail('entities.detail.panel.health.copy')}
            >
              <div
                data-entity-health-model="lightweight-service-health"
                data-entity-health-slo-mode="lightweight-no-slo-authoring"
              >
                <RowStack rows={healthRows} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="evidence"
              title={translateEntityDetail('entities.detail.panel.evidence.title')}
              copy={translateEntityDetail('entities.detail.panel.evidence.copy')}
            >
              <div data-entity-detail-evidence-model="red-use-read-model">
                <RowStack rows={evidenceRows} />
                <EvidenceHandoffRows rows={evidenceHandoffRows} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="alerts"
              title={translateEntityDetail('entities.detail.panel.alerts.title')}
              copy={translateEntityDetail('entities.detail.panel.alerts.copy')}
            >
              <div data-entity-detail-current-alerts="current-alerts">
                <RowStack rows={buildCurrentAlertRows(detail, translateEntityDetail)} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="next"
              title={translateEntityDetail('entities.detail.panel.next.title')}
              copy={translateEntityDetail('entities.detail.panel.next.copy')}
            >
              <div data-entity-detail-next-panel="cold-next-panel">
                <RowStack rows={buildNextActionRows(detail, entityId, translateEntityDetail)} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="related"
              title={translateEntityDetail('entities.detail.panel.related.title')}
              copy={translateEntityDetail('entities.detail.panel.related.copy')}
            >
              <div data-entity-detail-related-panel="cold-related-panel">
                <RowStack rows={buildSummaryRows(detail, translateEntityDetail)} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="relationships"
              title={translateEntityDetail('entities.detail.panel.relationships.title')}
              copy={translateEntityDetail('entities.detail.panel.relationships.copy')}
            >
              <div data-entity-detail-relationships-panel="upstream-downstream">
                <RowStack rows={buildRelationshipRows(detail, translateEntityDetail)} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="source"
              title={translateEntityDetail('entities.detail.panel.source.title')}
              copy={translateEntityDetail('entities.detail.panel.source.copy')}
            >
              <div data-entity-detail-collection-source-panel="source-template-binding">
                <AttributionRows rows={buildEntityAttributionRows(detail, translateEntityDetail)} />
                <div data-entity-detail-template-binding="monitor-template-binding">
                  <RowStack rows={buildCollectionSourceRows(detail, translateEntityDetail)} />
                </div>
              </div>
            </DetailPanel>

            <DetailPanel
              marker="drilldown"
              title={translateEntityDetail('entities.detail.panel.drilldown.title')}
              copy={translateEntityDetail('entities.detail.panel.drilldown.copy')}
            >
              <div data-entity-detail-drilldown-panel="cold-drilldown-panel">
                <RouteRows rows={buildDrilldownRows(entityId, translateEntityDetail)} />
              </div>
            </DetailPanel>

            <div className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 text-[12px] leading-5 text-[#8f99ab] lg:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#eef2f7]">
                <Activity className="h-3.5 w-3.5 text-[#858d9a]" aria-hidden="true" />
                {translateEntityDetail('entities.detail.disposition.title')}
              </div>
              {translateEntityDetail('entities.detail.disposition.copy')}
            </div>
          </div>
        </div>
        </section>
      </main>
      <OverlayDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        title={translateEntityDetail('entities.detail.delete.title')}
        kicker={translateEntityDetail('entities.detail.delete.kicker')}
        maxWidthClassName="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="default" className={coldButtonClassName} onClick={closeDeleteDialog}>
              {translateEntityDetail('entities.detail.delete.cancel')}
            </Button>
            <Button size="sm" variant="default" className={coldDangerButtonClassName} disabled={isPending} onClick={submitDeleteDialog}>
              {translateEntityDetail('entities.detail.delete.confirm')}
            </Button>
          </div>
        }
      >
        <div data-entity-detail-delete-confirm="cold-modal" className="space-y-3 text-[12px] leading-6 text-[#a9b0bb]">
          <p>{translateEntityDetail('entities.detail.delete.copy')}</p>
          <div className="rounded-[3px] border border-[#3f2228] bg-[#181013] px-3 py-2 text-[#f0b8c1]">
            {title} {entityId ? <span className="text-[#8f99ab]">#{entityId}</span> : null}
          </div>
        </div>
      </OverlayDialog>
    </>
  );
}
