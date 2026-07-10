'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowLeft, Bell, CheckCircle2, CircleHelp, Edit3, FileText, GitBranch, Network, RefreshCw, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { useI18n } from '../providers/i18n-provider';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
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
import { appendSignalRouteContext, stripReturnLabelFromHref, type SignalRouteContext } from '../../lib/signal-route-context';
import type { EntityDetailDto } from '../../lib/types';

type EntityDetailSurfaceProps = {
  detail: EntityDetailDto;
  routeContext?: SignalRouteContext;
  createdResult?: boolean;
  updatedResult?: boolean;
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

type EvidenceChainStep = {
  key: 'identity' | 'live' | 'alerts' | 'topology' | 'next';
  number: number;
  title: string;
  state: string;
  copy: string;
  actionLabel: string;
  href?: string;
  tone: 'success' | 'focus' | 'warning' | 'danger' | 'neutral';
  Icon: LucideIcon;
  priority: boolean;
};

type EntityDetailWorkspaceTabKey = 'evidence' | 'alerts' | 'health' | 'related' | 'relationships' | 'source';

type IncomingContextRow = {
  label: string;
  value: string;
  meta: string;
};

type AttributionRow = DetailRow & {
  key: string;
  state: 'ready' | 'review' | 'missing';
};

type EntityDetailTranslator = (key: string, params?: TranslationParams) => string;

const coldEntityDetailVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#eef4ff]';

const coldDangerButtonClassName =
  'h-8 min-w-[88px] rounded-[3px] border-[#3f2228] bg-[#181013] px-3 text-[12px] font-semibold text-[#f0b8c1] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#8b3341] hover:bg-[#211217] hover:text-[#ffd5dc]';

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#eef4ff]';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#eef4ff]';

function translateEntityDetail(key: string, params?: TranslationParams) {
  const template = SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
  return interpolate(template, params);
}

function buildEntityDetailContextHref(path: string, routeContext?: SignalRouteContext) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, routeContext ?? {});
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function buildAllEntitiesHref(routeContext?: SignalRouteContext) {
  const returnTo = stripReturnLabelFromHref(routeContext?.returnTo);
  if (returnTo?.startsWith('/entities') && !returnTo.startsWith('//')) {
    return returnTo;
  }
  return buildEntityDetailContextHref('/entities', routeContext);
}

function hasEntityDiscoveryReturnContext(routeContext?: SignalRouteContext) {
  const returnTo = stripReturnLabelFromHref(routeContext?.returnTo);
  return Boolean(returnTo === '/entities/discovery' || returnTo?.startsWith('/entities/discovery?'));
}

function hasEntityListReturnContext(routeContext?: SignalRouteContext) {
  const returnTo = stripReturnLabelFromHref(routeContext?.returnTo);
  return Boolean(returnTo?.startsWith('/entities') && !returnTo.startsWith('//'));
}

function EntityDetailActionHelp({
  copy,
  id,
  label
}: {
  copy: string;
  id: string;
  label: string;
}) {
  const tooltipId = `entity-detail-action-help-${id}`;

  return (
    <span
      data-entity-detail-action-help={id}
      data-entity-detail-action-help-style="icon-after-action"
      className="group/help relative inline-flex"
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        data-entity-detail-action-help-trigger="hertzbeat-ui-action-help"
        data-entity-detail-action-help-visual="circle-help-icon"
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#8d95a5] transition hover:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-entity-detail-action-help-icon="lucide-circle-help" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        data-entity-detail-action-help-tooltip={id}
        className="pointer-events-none absolute right-0 top-7 z-20 hidden w-64 rounded-[3px] border border-[#303743] bg-[#111827] px-3 py-2 text-left text-[11px] font-normal leading-5 text-[#d8e4ff] shadow-[0_18px_45px_rgba(0,0,0,0.35)] group-hover/help:block group-focus-within/help:block"
      >
        {copy}
      </span>
    </span>
  );
}

function resolveTitle(detail: EntityDetailDto, t: EntityDetailTranslator = translateEntityDetail) {
  const entity = detail.entity?.entity || {};
  return entity.displayName || entity.name || t('entities.detail.title.fallback');
}

function resolveSubtitle(detail: EntityDetailDto, t: EntityDetailTranslator = translateEntityDetail) {
  if (isMissingEntityDetail(detail)) {
    return t('entities.detail.state.missing.evidence-meta');
  }
  if (isUnavailableEntityDetail(detail)) {
    return t('entities.detail.state.unavailable.evidence-meta');
  }

  const activeAlerts = detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? 0;
  const downMonitors = detail.evidenceSummary?.downMonitorCount ?? 0;
  const traceSummary = detail.signalEvidence?.traceSummary || detail.traceSummary;
  const unifiedSummary = detail.signalEvidence?.unifiedEvidenceSummary || detail.unifiedEvidenceSummary;
  const entity = detail.entity?.entity || {};
  const statusInfo = (detail as EntityDetailDto & { status?: { reason?: string | null }; statusInfo?: { reason?: string | null } }).status
    || (detail as EntityDetailDto & { statusInfo?: { reason?: string | null } }).statusInfo;
  const hasNoLiveEvidenceState = statusInfo?.reason === 'no live evidence bound yet';
  const boundMonitorCount = detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? detail.entity?.monitorBinds?.length ?? 0;
  const identityCount = detail.evidenceSummary?.identityCount ?? detail.entity?.identities?.length ?? 0;
  const hasKnownOwnerOrIdentity = Boolean(entity.owner?.trim()) || identityCount > 0;
  const signalEvidenceCount =
    (unifiedSummary?.metricEvidenceCount ?? 0) + (unifiedSummary?.logEvidenceCount ?? 0) + (unifiedSummary?.traceEvidenceCount ?? 0);
  const signalEvidenceItemCount =
    (detail.signalEvidence?.metricEvidence?.length ?? 0) +
    (detail.signalEvidence?.logEvidence?.length ?? 0) +
    (detail.signalEvidence?.traceEvidence?.length ?? 0);
  const hasEvidence =
    !hasNoLiveEvidenceState &&
    (boundMonitorCount > 0 || (traceSummary?.recentTraceCount ?? 0) > 0 || signalEvidenceCount > 0 || signalEvidenceItemCount > 0);

  if (activeAlerts > 0) {
    return t('entities.detail.subtitle.active-alerts');
  }
  if (downMonitors > 0) {
    return t('entities.detail.subtitle.down-monitors');
  }
  if (hasEvidence) {
    return t('entities.detail.subtitle.has-evidence');
  }
  if (hasKnownOwnerOrIdentity) {
    return t('entities.detail.subtitle.needs-live-evidence');
  }
  return t('entities.detail.subtitle.needs-context');
}

function resolveRelationEvidenceCount(detail: EntityDetailDto) {
  return Math.max(
    Array.isArray(detail.topologyNeighbors) ? detail.topologyNeighbors.length : 0,
    Array.isArray(detail.entity?.relations) ? detail.entity.relations.length : 0
  );
}

function countMetrics(detail: EntityDetailDto, t: EntityDetailTranslator = translateEntityDetail) {
  return [
    {
      key: 'bound-monitors',
      label: t('entities.detail.metric.bound-monitors'),
      value: detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? detail.entity?.monitorBinds?.length ?? 0,
      Icon: Network
    },
    {
      key: 'active-alerts',
      label: t('entities.detail.metric.active-alerts'),
      value: detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? detail.evidenceSummary?.activeAlertCount ?? 0,
      Icon: Bell
    },
    {
      key: 'identities',
      label: t('entities.detail.metric.identities'),
      value: detail.evidenceSummary?.identityCount ?? detail.entity?.identities?.length ?? 0,
      Icon: FileText
    },
    {
      key: 'relations',
      label: t('entities.detail.metric.relations'),
      value: resolveRelationEvidenceCount(detail),
      Icon: GitBranch
    }
  ];
}

function buildDeleteImpactRows(detail: EntityDetailDto, t: EntityDetailTranslator = translateEntityDetail) {
  return countMetrics(detail, t).map(metric => ({
    label: metric.label,
    value: metric.value
  }));
}

function isUnavailableEntityDetail(detail: EntityDetailDto) {
  return detail.detailState?.state === 'unavailable' || detail.detailState?.reason === 'recoverable-detail-load-failed';
}

function isMissingEntityDetail(detail: EntityDetailDto) {
  return detail.detailState?.reason === 'entity-detail-missing';
}

function rowStatusClass(tone: DetailRow['tone'] = 'neutral') {
  switch (tone) {
    case 'success':
      return 'border-[#303743] bg-[#101217] text-[#dbe4f0]';
    case 'warning':
      return 'border-[#574622] bg-[#1b1710] text-[#facc6b]';
    case 'danger':
      return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
    default:
      return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
  }
}

function chainToneClass(tone: EvidenceChainStep['tone'], selected: boolean) {
  const selectedClass = selected ? 'ring-1 ring-[#4e74f8]' : '';
  switch (tone) {
    case 'success':
      return `border-[#303743] bg-[#101217] text-[#dbe4f0] ${selectedClass}`;
    case 'focus':
      return `border-[#335f9d] bg-[#111827] text-[#93c5fd] ${selectedClass}`;
    case 'warning':
      return `border-[#574622] bg-[#1b1710] text-[#facc6b] ${selectedClass}`;
    case 'danger':
      return `border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5] ${selectedClass}`;
    default:
      return `border-[#303743] bg-[#101217] text-[#cbd5e1] ${selectedClass}`;
  }
}

function chainPillClass(tone: EvidenceChainStep['tone']) {
  switch (tone) {
    case 'success':
      return 'border-[#303743] bg-[#101217] text-[#dbe4f0]';
    case 'focus':
      return 'border-[#335f9d] bg-[#13213a] text-[#93c5fd]';
    case 'warning':
      return 'border-[#574622] bg-[#2a2110] text-[#facc6b]';
    case 'danger':
      return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
    default:
      return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
  }
}

function chainStatusTone(tone: EvidenceChainStep['tone']): DetailRow['tone'] {
  if (tone === 'success') return 'success';
  if (tone === 'warning' || tone === 'focus') return 'warning';
  if (tone === 'danger') return 'danger';
  return 'neutral';
}

function finiteDetailCount(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function findContextHref(rows: ContextLinkRow[], key: string) {
  return rows.find(row => row.key === key)?.copy;
}

function findEvidenceHandoffHref(rows: EvidenceHandoffRow[], key: string) {
  return rows.find(row => row.key === key)?.href;
}

function withEntityDetailQueryParam(href: string | undefined, key: string, value: string) {
  if (!href) return undefined;
  const url = new URL(href, 'https://hertzbeat.local');
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function buildEntityEvidenceChainSteps({
  contextLinks,
  definitionHref,
  detail,
  editHref,
  entityId,
  evidenceHandoffRows,
  nextActionRows,
  t
}: {
  contextLinks: ContextLinkRow[];
  definitionHref?: string;
  detail: EntityDetailDto;
  editHref?: string;
  entityId: string | number | null | undefined;
  evidenceHandoffRows: EvidenceHandoffRow[];
  nextActionRows: DetailRow[];
  t: EntityDetailTranslator;
}): EvidenceChainStep[] {
  const entity = detail.entity?.entity || {};
  const identityCount = finiteDetailCount(detail.evidenceSummary?.identityCount ?? detail.entity?.identities?.length, 0);
  const hasIdentity = identityCount > 0 || Boolean(entity.owner?.trim()) || Boolean(entity.name?.trim()) || Boolean(entity.id);
  const boundMonitorCount = finiteDetailCount(detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? detail.entity?.monitorBinds?.length, 0);
  const unifiedSummary = detail.signalEvidence?.unifiedEvidenceSummary || detail.unifiedEvidenceSummary;
  const liveEvidenceCount =
    boundMonitorCount +
    finiteDetailCount(detail.traceSummary?.recentTraceCount ?? detail.signalEvidence?.traceSummary?.recentTraceCount, 0) +
    finiteDetailCount(unifiedSummary?.activeSignalCount, 0) +
    finiteDetailCount(unifiedSummary?.metricEvidenceCount, 0) +
    finiteDetailCount(unifiedSummary?.logEvidenceCount, 0) +
    finiteDetailCount(unifiedSummary?.traceEvidenceCount, 0);
  const hasLiveEvidence = liveEvidenceCount > 0;
  const activeAlertCount = finiteDetailCount(detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? detail.evidenceSummary?.activeAlertCount, 0);
  const relationCount = resolveRelationEvidenceCount(detail);
  const hasTopology = relationCount > 0;
  const monitorHref = findContextHref(contextLinks, 'monitors');
  const metricsHref = findContextHref(contextLinks, 'metrics');
  const otlpHref = metricsHref || findContextHref(contextLinks, 'logs') || findContextHref(contextLinks, 'traces');
  const alertHref = findEvidenceHandoffHref(evidenceHandoffRows, 'alerts') || findContextHref(contextLinks, 'alerts');
  const topologyHref = findEvidenceHandoffHref(evidenceHandoffRows, 'topology') || findContextHref(contextLinks, 'topology');
  const nextServerHref = nextActionRows.find(row => row.href)?.href;
  const liveEvidenceSetupHref = withEntityDetailQueryParam(editHref, 'stage', 'signals') || monitorHref || otlpHref;
  const nextHref = !hasLiveEvidence ? liveEvidenceSetupHref : activeAlertCount > 0 ? alertHref : nextServerHref || topologyHref || definitionHref;

  return [
    {
      key: 'identity',
      number: 1,
      title: t('entities.detail.chain.identity.title'),
      state: t(hasIdentity ? 'entities.detail.chain.identity.ready' : 'entities.detail.chain.identity.missing'),
      copy: t(hasIdentity ? 'entities.detail.chain.identity.ready-copy' : 'entities.detail.chain.identity.missing-copy'),
      actionLabel: t('entities.detail.chain.identity.action'),
      href: definitionHref || (entityId ? `/entities/${entityId}/definition` : undefined),
      tone: hasIdentity ? 'success' : 'warning',
      Icon: FileText,
      priority: !hasIdentity
    },
    {
      key: 'live',
      number: 2,
      title: t('entities.detail.chain.live.title'),
      state: t(hasLiveEvidence ? 'entities.detail.chain.live.ready' : 'entities.detail.chain.live.missing'),
      copy: t(hasLiveEvidence ? 'entities.detail.chain.live.ready-copy' : 'entities.detail.chain.live.missing-copy'),
      actionLabel: t(hasLiveEvidence ? 'entities.detail.chain.live.action-ready' : 'entities.detail.chain.live.action-missing'),
      href: hasLiveEvidence ? metricsHref || otlpHref : liveEvidenceSetupHref,
      tone: hasLiveEvidence ? 'success' : 'focus',
      Icon: Activity,
      priority: !hasLiveEvidence
    },
    {
      key: 'alerts',
      number: 3,
      title: t('entities.detail.chain.alerts.title'),
      state: t(activeAlertCount > 0 ? 'entities.detail.chain.alerts.active' : 'entities.detail.chain.alerts.empty'),
      copy: t(activeAlertCount > 0 ? 'entities.detail.chain.alerts.active-copy' : 'entities.detail.chain.alerts.empty-copy', { count: activeAlertCount }),
      actionLabel: t(activeAlertCount > 0 ? 'entities.detail.chain.alerts.action-active' : 'entities.detail.chain.alerts.action-empty'),
      href: alertHref,
      tone: activeAlertCount > 0 ? 'danger' : 'success',
      Icon: Bell,
      priority: activeAlertCount > 0
    },
    {
      key: 'topology',
      number: 4,
      title: t('entities.detail.chain.topology.title'),
      state: t(hasTopology ? 'entities.detail.chain.topology.ready' : 'entities.detail.chain.topology.empty'),
      copy: t(hasTopology ? 'entities.detail.chain.topology.ready-copy' : 'entities.detail.chain.topology.empty-copy', { count: relationCount }),
      actionLabel: t('entities.detail.chain.topology.action'),
      href: topologyHref,
      tone: hasTopology ? 'success' : 'neutral',
      Icon: GitBranch,
      priority: false
    },
    {
      key: 'next',
      number: 5,
      title: t('entities.detail.chain.next.title'),
      state: t(!hasLiveEvidence ? 'entities.detail.chain.next.waiting' : activeAlertCount > 0 ? 'entities.detail.chain.next.alerts' : 'entities.detail.chain.next.ready'),
      copy: t(!hasLiveEvidence ? 'entities.detail.chain.next.waiting-copy' : activeAlertCount > 0 ? 'entities.detail.chain.next.alerts-copy' : 'entities.detail.chain.next.ready-copy'),
      actionLabel: t(!hasLiveEvidence ? 'entities.detail.chain.next.action-bind' : activeAlertCount > 0 ? 'entities.detail.chain.next.action-alerts' : 'entities.detail.chain.next.action-ready'),
      href: nextHref,
      tone: !hasLiveEvidence ? 'warning' : activeAlertCount > 0 ? 'danger' : 'success',
      Icon: CheckCircle2,
      priority: !hasLiveEvidence || activeAlertCount > 0
    }
  ];
}

function attributionStateClass(state: AttributionRow['state']) {
  switch (state) {
    case 'ready':
      return 'border-[#303743] bg-[#101217] text-[#dbe4f0]';
    case 'review':
      return 'border-[#574622] bg-[#1b1710] text-[#facc6b]';
    default:
      return 'border-[#5f2630] bg-[#211217] text-[#f0b8c1]';
  }
}

function attributionStateLabel(state: AttributionRow['state'], t: EntityDetailTranslator = translateEntityDetail) {
  switch (state) {
    case 'ready':
      return t('entities.detail.attribution.ready');
    case 'review':
      return t('entities.detail.attribution.review');
    default:
      return t('entities.detail.attribution.missing');
  }
}

function AttributionRows({ rows, t }: { rows: AttributionRow[]; t: EntityDetailTranslator }) {
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
              {attributionStateLabel(row.state, t)}
            </span>
          </div>
          <p className="mt-2 truncate text-[11px] leading-4 text-[#7e8494]">{row.meta}</p>
        </div>
      ))}
    </div>
  );
}

function formatRoutePreview(value: string) {
  if (!value.startsWith('/')) {
    return value;
  }

  const [pathname, query = ''] = value.split('?');
  if (!query) {
    return pathname;
  }

  const visibleKeys = Array.from(new URLSearchParams(query).keys())
    .filter(key => !['returnTo', 'returnLabel'].includes(key))
    .slice(0, 3);

  return visibleKeys.length > 0 ? `${pathname} · ${visibleKeys.join(', ')}` : pathname;
}

function compactLinkLabel(title: string, meta: string) {
  return `${title}: ${meta}`;
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
            aria-label={compactLinkLabel(row.title, row.meta)}
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

function RouteRows({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <Link
          key={`${row.title}-${row.copy}`}
          href={row.copy.startsWith('/') ? row.copy : '#'}
          aria-label={compactLinkLabel(row.title, row.meta)}
          className="grid min-h-[54px] gap-2 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151820] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        >
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-[#eef2f7]">{row.title}</span>
            <span className="mt-1 block truncate text-[12px] text-[#8f99ab]">{formatRoutePreview(row.copy)}</span>
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
          aria-label={compactLinkLabel(link.title, link.meta)}
          className="grid min-h-[64px] gap-1 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151820]"
        >
          <span className="text-[12px] font-semibold text-[#eef2f7]">{link.title}</span>
          <span className="truncate text-[11px] text-[#8f99ab]">{formatRoutePreview(link.copy)}</span>
          {link.freshness ? (
            <span data-entity-detail-context-scope={link.key} className="truncate text-[11px] leading-4 text-[#aeb7c7]">
              {link.freshness}
            </span>
          ) : null}
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
          aria-label={compactLinkLabel(row.title, row.meta)}
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

function EntityEvidenceChain({
  onSelect,
  selectedStep,
  steps,
  t
}: {
  onSelect: (key: EvidenceChainStep['key']) => void;
  selectedStep: EvidenceChainStep;
  steps: EvidenceChainStep[];
  t: EntityDetailTranslator;
}) {
  const SelectedIcon = selectedStep.Icon;
  const titleId = 'entity-detail-evidence-chain-title';
  const panelId = 'entity-detail-evidence-chain-panel';
  const selectedTabId = `entity-detail-evidence-chain-tab-${selectedStep.key}`;

  const moveStepFocus = (key: EvidenceChainStep['key']) => {
    onSelect(key);
    window.requestAnimationFrame(() => {
      document.getElementById(`entity-detail-evidence-chain-tab-${key}`)?.focus();
    });
  };

  const handleStepKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = steps.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = index >= lastIndex ? 0 : index + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = index <= 0 ? lastIndex : index - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    if (nextIndex == null) {
      return;
    }

    event.preventDefault();
    moveStepFocus(steps[nextIndex].key);
  };

  return (
    <section
      data-entity-detail-evidence-chain="diagnosis-first"
      data-entity-detail-evidence-chain-state={selectedStep.key}
      aria-labelledby={titleId}
      className="mb-5 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.24)]"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-[13px] font-semibold text-[#eef2f7]">{t('entities.detail.chain.title')}</h2>
          <p className="mt-1 max-w-[780px] text-[12px] leading-5 text-[#8f99ab]">{t('entities.detail.chain.copy')}</p>
        </div>
        <span className={`rounded-[3px] border px-2 py-1 text-[11px] font-semibold ${chainPillClass(selectedStep.tone)}`}>
          {selectedStep.state}
        </span>
      </div>

      <div role="tablist" aria-labelledby={titleId} className="grid gap-2 lg:grid-cols-5">
        {steps.map(step => {
          const selected = step.key === selectedStep.key;
          const Icon = step.Icon;
          const tabId = `entity-detail-evidence-chain-tab-${step.key}`;
          return (
            <button
              key={step.key}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              data-entity-detail-evidence-chain-step={step.key}
              data-entity-detail-evidence-chain-priority={step.priority ? 'true' : 'false'}
              data-entity-detail-evidence-chain-selected={selected ? 'true' : 'false'}
              onClick={() => onSelect(step.key)}
              onKeyDown={event => handleStepKeyDown(event, steps.indexOf(step))}
              className={`min-h-[78px] rounded-[4px] border px-3 py-2.5 text-left transition hover:border-[#4e74f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] ${chainToneClass(step.tone, selected)}`}
            >
              <span className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-current/30 bg-black/15 text-[12px] font-semibold tabular-nums">
                  {step.number}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#eef2f7]">
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{step.title}</span>
                  </span>
                  <span className="mt-1 block truncate text-[12px]">{step.state}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={selectedTabId}
        tabIndex={0}
        data-entity-detail-evidence-chain-diagnosis={selectedStep.key}
        className="mt-3 grid gap-3 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#eef2f7]">
            <SelectedIcon className="h-3.5 w-3.5 text-[#9aa7b8]" aria-hidden="true" />
            {selectedStep.title}
          </div>
          <p className="mt-1 text-[12px] leading-5 text-[#9aa7b8]">{selectedStep.copy}</p>
        </div>
        {selectedStep.href ? (
          <Link
            href={selectedStep.href}
            data-entity-detail-command-action={`evidence-chain-${selectedStep.key}`}
            data-entity-detail-evidence-chain-action={selectedStep.key}
            className={`inline-flex h-8 min-w-[116px] items-center justify-center rounded-[3px] border px-3 text-[12px] font-semibold hover:border-[#4e74f8] hover:text-[#eef4ff] ${rowStatusClass(chainStatusTone(selectedStep.tone))}`}
          >
            {selectedStep.actionLabel}
          </Link>
        ) : (
          <span
            data-entity-detail-command-action={`evidence-chain-${selectedStep.key}`}
            data-entity-detail-evidence-chain-action={selectedStep.key}
            className={`inline-flex h-8 min-w-[116px] items-center justify-center rounded-[3px] border px-3 text-[12px] font-semibold ${rowStatusClass(chainStatusTone(selectedStep.tone))}`}
          >
            {selectedStep.actionLabel}
          </span>
        )}
      </div>
    </section>
  );
}

export function EntityDetailSurface({
  detail,
  routeContext,
  createdResult = false,
  updatedResult = false,
  actionError,
  isPending,
  onDelete,
  onRefresh
}: EntityDetailSurfaceProps) {
  const { t } = useI18n();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedEvidenceStepKey, setSelectedEvidenceStepKey] = React.useState<EvidenceChainStep['key'] | null>(null);
  const [selectedWorkspaceTabKey, setSelectedWorkspaceTabKey] = React.useState<EntityDetailWorkspaceTabKey | null>(null);
  const entity = detail.entity?.entity || {};
  const entityId = entity.id;
  const unavailableDetail = isUnavailableEntityDetail(detail);
  const missingDetail = isMissingEntityDetail(detail);
  const title = resolveTitle(detail, t);
  const facts = buildDetailFacts(entity, t);
  const metrics = countMetrics(detail, t).map(metric => ({
    ...metric,
    value: unavailableDetail ? '-' : metric.value
  }));
  const deleteImpactRows = unavailableDetail ? [] : buildDeleteImpactRows(detail, t);
  const deleteHasImpact = deleteImpactRows.some(row => row.value > 0);
  const contextLinks = unavailableDetail ? [] : buildEntityContextHandoffLinks(detail, routeContext || 'last-1h', t);
  const incomingContextRows = buildEntityIncomingContextRows(routeContext, t);
  const healthRows = buildEntityHealthModel(detail, t);
  const evidenceRows = buildUnifiedEvidenceRows(detail, t);
  const evidenceHandoffRows = unavailableDetail ? [] : buildEntityEvidenceHandoffRows(detail, routeContext || 'last-1h', t);
  const collectionSourceRows = unavailableDetail ? [] : buildCollectionSourceRows(detail, t);
  const identityPreview = collectionSourceRows.find(row => row.title === t('entities.detail.collection.identity.title'))?.meta;
  const nextActionRows = unavailableDetail ? [] : buildNextActionRows(detail, entityId, t, routeContext);
  const drilldownRows = unavailableDetail ? [] : buildDrilldownRows(entityId, t, routeContext);
  const unavailableRows = [
    {
      title: t('entities.detail.state.unavailable.copy'),
      copy: t('entities.detail.state.unavailable.evidence-meta'),
      meta: t('common.none'),
      tone: 'warning' as const
    }
  ];
  const allEntitiesHref = buildAllEntitiesHref(routeContext);
  const discoveryReturnContext = hasEntityDiscoveryReturnContext(routeContext);
  const listReturnContext = hasEntityListReturnContext(routeContext);
  const allEntitiesLabelKey = discoveryReturnContext
    ? 'entities.detail.action.return-entity-discovery'
    : listReturnContext
    ? 'entities.detail.action.return-entity-list'
    : 'entities.detail.action.all-entities';
  const commandRowHelpKey = unavailableDetail
    ? 'entities.detail.action.command-row.unavailable-help'
    : discoveryReturnContext
    ? 'entities.detail.action.command-row.discovery-help'
    : listReturnContext
    ? 'entities.detail.action.command-row.list-help'
    : 'entities.detail.action.command-row.help';
  const definitionHref = entityId ? buildEntityDetailContextHref(`/entities/${entityId}/definition`, routeContext) : undefined;
  const editHref = entityId ? buildEntityDetailContextHref(`/entities/${entityId}/edit`, routeContext) : undefined;
  const evidenceChainSteps = unavailableDetail
    ? []
    : buildEntityEvidenceChainSteps({
        contextLinks,
        definitionHref,
        detail,
        editHref,
        entityId,
        evidenceHandoffRows,
        nextActionRows,
        t
      });
  const postCreateGuideSteps = evidenceChainSteps.filter(step => step.key === 'identity' || step.key === 'live' || step.key === 'next');
  const defaultEvidenceStep = evidenceChainSteps.find(step => step.priority) || evidenceChainSteps[0];
  const selectedEvidenceStep =
    evidenceChainSteps.find(step => step.key === selectedEvidenceStepKey) ||
    defaultEvidenceStep;
  const defaultWorkspaceTabKey: EntityDetailWorkspaceTabKey =
    selectedEvidenceStep?.key === 'alerts'
      ? 'alerts'
      : selectedEvidenceStep?.key === 'topology'
      ? 'relationships'
      : selectedEvidenceStep?.key === 'identity'
      ? 'source'
      : 'evidence';
  const activeWorkspaceTabKey = selectedWorkspaceTabKey || defaultWorkspaceTabKey;
  const workspaceTabs: Array<{
    copy: string;
    key: EntityDetailWorkspaceTabKey;
    title: string;
    content: React.ReactNode;
  }> = [
    {
      key: 'evidence',
      title: t('entities.detail.panel.evidence.title'),
      copy: t('entities.detail.panel.evidence.copy'),
      content: (
        <div data-entity-detail-evidence-model="red-use-read-model">
          <RowStack rows={evidenceRows} />
          <EvidenceHandoffRows rows={evidenceHandoffRows} />
        </div>
      )
    },
    {
      key: 'alerts',
      title: t('entities.detail.panel.alerts.title'),
      copy: t('entities.detail.panel.alerts.copy'),
      content: (
        <div data-entity-detail-current-alerts="current-alerts">
          <RowStack rows={buildCurrentAlertRows(detail, t)} />
        </div>
      )
    },
    {
      key: 'health',
      title: t('entities.detail.panel.health.title'),
      copy: t('entities.detail.panel.health.copy'),
      content: (
        <div
          data-entity-health-model="lightweight-service-health"
          data-entity-health-slo-mode="lightweight-no-slo-authoring"
        >
          <RowStack rows={healthRows} />
        </div>
      )
    },
    {
      key: 'related',
      title: t('entities.detail.panel.related.title'),
      copy: t('entities.detail.panel.related.copy'),
      content: (
        <div data-entity-detail-related-panel="hertzbeat-ui-related-panel">
          <RowStack rows={buildSummaryRows(detail, t)} />
        </div>
      )
    },
    {
      key: 'relationships',
      title: t('entities.detail.panel.relationships.title'),
      copy: t('entities.detail.panel.relationships.copy'),
      content: (
        <div data-entity-detail-relationships-panel="upstream-downstream">
          <RowStack rows={buildRelationshipRows(detail, routeContext || 'last-1h', t)} />
        </div>
      )
    },
    {
      key: 'source',
      title: t('entities.detail.panel.source.title'),
      copy: t('entities.detail.panel.source.copy'),
      content: (
        <div data-entity-detail-collection-source-panel="source-template-binding">
          <AttributionRows rows={buildEntityAttributionRows(detail, t)} t={t} />
          <div data-entity-detail-template-binding="monitor-template-binding">
            <RowStack rows={collectionSourceRows} />
          </div>
        </div>
      )
    }
  ];
  const focusWorkspaceTab = (key: EntityDetailWorkspaceTabKey) => {
    if (typeof document === 'undefined') {
      return;
    }
    document.querySelector<HTMLButtonElement>(`[data-entity-detail-workspace-tab="${key}"]`)?.focus();
  };
  const handleWorkspaceTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    key: EntityDetailWorkspaceTabKey
  ) => {
    const currentIndex = workspaceTabs.findIndex(tab => tab.key === key);
    if (currentIndex < 0) {
      return;
    }

    let nextKey: EntityDetailWorkspaceTabKey | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextKey = workspaceTabs[(currentIndex + 1) % workspaceTabs.length]?.key ?? null;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextKey = workspaceTabs[(currentIndex - 1 + workspaceTabs.length) % workspaceTabs.length]?.key ?? null;
    } else if (event.key === 'Home') {
      nextKey = workspaceTabs[0]?.key ?? null;
    } else if (event.key === 'End') {
      nextKey = workspaceTabs[workspaceTabs.length - 1]?.key ?? null;
    } else {
      return;
    }

    if (!nextKey) {
      return;
    }
    event.preventDefault();
    setSelectedWorkspaceTabKey(nextKey);
    window.requestAnimationFrame(() => focusWorkspaceTab(nextKey));
  };
  const handleEvidenceStepSelect = (key: EvidenceChainStep['key']) => {
    setSelectedEvidenceStepKey(key);
    if (key === 'alerts') {
      setSelectedWorkspaceTabKey('alerts');
    } else if (key === 'topology') {
      setSelectedWorkspaceTabKey('relationships');
    } else if (key === 'identity') {
      setSelectedWorkspaceTabKey('source');
    } else if (key === 'live' || key === 'next') {
      setSelectedWorkspaceTabKey('evidence');
    }
  };
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
        data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"
        data-entity-detail-style-baseline={coldEntityDetailVisual.canvasName}
        data-entity-detail-layout="full-width-workbench"
        className={coldEntityDetailVisual.canvas.root}
        style={coldEntityDetailVisual.canvas.backgroundStyle}
      >
        <section className={coldEntityDetailVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div
                data-entity-detail-header="hertzbeat-ui-compact-header"
                data-entity-detail-header-nesting-contract="flat-page-introduction"
                className="p-0"
              >
                <div className="max-w-[920px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('entities.detail.header.kicker')}</span>
                    <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] font-semibold text-[#cbd5e1]">{t('entities.detail.header.badge')}</span>
                  </div>
                  <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">{resolveSubtitle(detail, t)}</p>
                  <div data-entity-detail-command-row="standard-equal-buttons" className={coldEntityDetailVisual.button.row}>
                    <Link
                      href={allEntitiesHref}
                      data-entity-detail-command-action="return"
                      className={coldLinkButtonClassName}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      {t(allEntitiesLabelKey)}
                    </Link>
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      data-entity-detail-command-action="refresh"
                      onClick={onRefresh}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    {!unavailableDetail && entityId ? (
                      <Link
                        href={definitionHref || `/entities/${entityId}/definition`}
                        data-entity-detail-command-action="edit-definition"
                        className={coldLinkButtonClassName}
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('entities.detail.action.edit-definition')}
                      </Link>
                    ) : null}
                    {!unavailableDetail && entityId ? (
                      <Link
                        href={editHref || `/entities/${entityId}/edit`}
                        data-entity-detail-command-action="edit"
                        className={coldPrimaryLinkClassName}
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('entities.detail.action.edit')}
                      </Link>
                    ) : null}
                    {!unavailableDetail && entityId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className={coldDangerButtonClassName}
                        data-entity-detail-command-action="delete"
                        data-entity-detail-delete-confirm-trigger="hertzbeat-ui-modal"
                        disabled={isPending}
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('entities.detail.action.delete')}
                      </Button>
                    ) : null}
                    <span data-entity-detail-command-row-help-contract="single-header-help" className="inline-flex h-8 items-center">
                      <EntityDetailActionHelp
                        id="command-row"
                        label={t('entities.detail.action.command-row.help-label')}
                        copy={t(commandRowHelpKey)}
                      />
                    </span>
                  </div>
                </div>
              </div>
          </div>

          {(createdResult || updatedResult) && !unavailableDetail ? (
            <div
              role="status"
              data-entity-detail-created-feedback={createdResult ? 'post-create-next-step' : undefined}
              data-entity-detail-updated-feedback={updatedResult ? 'post-edit-readback' : undefined}
              data-entity-detail-created-feedback-state="saved-and-readable"
              className="mb-5 flex items-start gap-3 rounded-[4px] border border-[#303743] bg-[#101217] px-4 py-3 text-[12px] leading-5 text-[#aeb7c7]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8fa2c7]" aria-hidden="true" />
              <div className="min-w-0">
                <div className="font-semibold text-[#eef2f7]">
                  {t(createdResult ? 'entities.detail.created.title' : 'entities.detail.updated.title')}
                </div>
                <div className="mt-1 text-[#9aa7b8]">
                  {t(createdResult ? 'entities.detail.created.copy' : 'entities.detail.updated.copy')}
                </div>
                {createdResult ? (
                  <ol
                    data-entity-detail-created-guide="novice-next-steps"
                    className="mt-3 grid gap-2 md:grid-cols-3"
                    aria-label={t('entities.detail.created.title')}
                  >
                    {postCreateGuideSteps.map(step => {
                      const content = (
                        <>
                          <span className="flex items-start gap-2">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-[#303743] bg-[#101217] text-[11px] font-semibold text-[#dbe4f0]">
                              {step.number}
                            </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[12px] font-semibold text-[#eef2f7]">{step.title}</span>
                                <span className="mt-0.5 block truncate text-[11px] leading-4 text-[#8f99ab]">{step.state}</span>
                              </span>
                            </span>
                          <span
                            data-entity-detail-created-guide-copy={step.key}
                            className="mt-2 block text-[11px] leading-4 text-[#9aa7b8]"
                          >
                            {step.copy}
                          </span>
                          {step.key === 'identity' && identityPreview && identityPreview !== '-' ? (
                            <span
                              data-entity-detail-created-guide-evidence="identity"
                              className="mt-2 block break-all rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-1 font-mono text-[11px] leading-4 text-[#d8e4ff]"
                            >
                              {identityPreview}
                            </span>
                          ) : null}
                          <span className="mt-2 block truncate text-[11px] font-semibold text-[#d8e4ff]">{step.actionLabel}</span>
                        </>
                      );

                      return (
                        <li key={step.key} data-entity-detail-created-guide-step={step.key} className="min-w-0">
                          {step.href ? (
                            <Link
                              href={step.href}
                              data-entity-detail-command-action={`created-guide-${step.key}`}
                              data-entity-detail-created-guide-action={step.key}
                              data-entity-detail-created-guide-target={step.href}
                              className="block min-h-[112px] rounded-[3px] border border-[#303743] bg-[#101217] px-3 py-2.5 text-[#aeb7c7] transition hover:border-[#4e74f8] hover:bg-[#151b28]"
                            >
                              {content}
                            </Link>
                          ) : (
                            <div
                              data-entity-detail-command-action={`created-guide-${step.key}`}
                              className="min-h-[112px] rounded-[3px] border border-[#303743] bg-[#101217] px-3 py-2.5"
                            >
                              {content}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
                {!createdResult && updatedResult ? (
                  <div data-entity-detail-updated-actions="post-edit-readback" className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={allEntitiesHref}
                      data-entity-detail-updated-action="return"
                      data-entity-detail-updated-action-target={allEntitiesHref}
                      className={coldLinkButtonClassName}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      {t(allEntitiesLabelKey)}
                    </Link>
                    {definitionHref ? (
                      <Link
                        href={definitionHref}
                        data-entity-detail-updated-action="definition"
                        data-entity-detail-updated-action-target={definitionHref}
                        className={coldLinkButtonClassName}
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('entities.detail.action.edit-definition')}
                      </Link>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className={`${coldButtonClassName} inline-flex items-center justify-center gap-2`}
                      data-entity-detail-updated-action="refresh"
                      disabled={isPending}
                      onClick={onRefresh}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {unavailableDetail ? (
            <div
              role="status"
              data-entity-detail-unavailable-feedback={missingDetail ? 'entity-deleted-or-missing' : 'backend-detail-unavailable'}
              data-entity-detail-unavailable-actions="safe-return-refresh-only"
              className="mb-5 flex items-start gap-3 rounded-[4px] border border-[#574622] bg-[#1b1710] px-4 py-3 text-[12px] leading-5 text-[#facc6b]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-semibold text-[#fde68a]">
                  {t(missingDetail ? 'entities.detail.state.missing.copy' : 'entities.detail.state.unavailable.copy')}
                </div>
                <div className="mt-1 text-[#c8b36f]">
                  {t(missingDetail ? 'entities.detail.state.missing.evidence-meta' : 'entities.detail.state.unavailable.evidence-meta')}
                </div>
              </div>
            </div>
          ) : null}

          <div
            data-entity-detail-error="hertzbeat-ui-inline-error"
            className={actionError ? 'mb-5 rounded-[4px] border border-[#7f1d1d]/55 bg-[#2a1214] px-4 py-3 text-[12px] text-[#fca5a5]' : 'hidden'}
            aria-hidden={actionError ? undefined : true}
          >
            <span className="font-semibold">{t('entities.detail.error.title')}</span>
            {actionError ? <span className="ml-2">{actionError}</span> : null}
          </div>

          {unavailableDetail ? (
            <section
              data-entity-detail-missing-recovery={missingDetail ? 'deleted-or-not-found' : 'backend-unavailable'}
              data-entity-detail-missing-recovery-actions="return-refresh-only"
              className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 text-[12px] leading-6 text-[#a9b0bb] shadow-[0_20px_56px_rgba(0,0,0,0.28)]"
            >
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#eef2f7]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#facc6b]" aria-hidden="true" />
                {t(missingDetail ? 'entities.detail.state.missing.recovery-title' : 'entities.detail.state.unavailable.recovery-title')}
              </div>
              <p className="max-w-[760px] text-[#a9b0bb]">
                {t(missingDetail ? 'entities.detail.state.missing.recovery-copy' : 'entities.detail.state.unavailable.recovery-copy')}
              </p>
              <p className="mt-3 max-w-[760px] text-[#7e8494]">
                {t('entities.detail.state.unavailable.recovery-hint')}
              </p>
            </section>
          ) : (
            <>
          {selectedEvidenceStep ? (
            <EntityEvidenceChain
              steps={evidenceChainSteps}
              selectedStep={selectedEvidenceStep}
              t={t}
              onSelect={handleEvidenceStepSelect}
            />
          ) : null}

          <div
            data-entity-detail-signal-grid="hertzbeat-ui-detail-grid"
            data-entity-detail-direction2-workbench="evidence-workspace-context-rail"
            className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
          >
            <section
              data-entity-detail-evidence-workspace="single"
              className="min-w-0 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.24)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#252b34] px-4 py-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#eef2f7]">{t('entities.detail.panel.evidence.title')}</h2>
                  <p className="mt-1 max-w-[680px] text-[12px] leading-5 text-[#8f99ab]">{t('entities.detail.panel.evidence.copy')}</p>
                </div>
                <div
                  role="tablist"
                  aria-label={t('entities.detail.panel.evidence.title')}
                  data-entity-detail-workspace-tablist-responsive="wrap-mobile-no-local-scroll"
                  className="grid w-full max-w-full grid-cols-2 rounded-[3px] border border-[#303743] bg-[#101217] sm:inline-flex sm:w-auto sm:overflow-x-visible"
                >
                  {workspaceTabs.map(tab => {
                    const selected = tab.key === activeWorkspaceTabKey;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={`entity-detail-workspace-panel-${tab.key}`}
                        data-entity-detail-workspace-tab={tab.key}
                        data-entity-detail-workspace-tab-selected={selected ? 'true' : 'false'}
                        onClick={() => setSelectedWorkspaceTabKey(tab.key)}
                        onKeyDown={event => handleWorkspaceTabKeyDown(event, tab.key)}
                        tabIndex={selected ? 0 : -1}
                        className={`h-8 min-w-0 border-r border-b border-[#303743] px-2 text-[12px] font-semibold last:border-r-0 odd:border-r even:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8] sm:shrink-0 sm:border-b-0 sm:px-3 sm:even:border-r sm:last:border-r-0 ${
                          selected ? 'bg-[#162139] text-[#d8e4ff]' : 'text-[#8f99ab] hover:bg-[#151b28] hover:text-[#dbe4f0]'
                        }`}
                      >
                        {tab.title}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-4">
                {workspaceTabs.map(tab => {
                  const selected = tab.key === activeWorkspaceTabKey;
                  return (
                    <section
                      key={tab.key}
                      id={`entity-detail-workspace-panel-${tab.key}`}
                      role="tabpanel"
                      data-entity-detail-workspace-panel={tab.key}
                      data-entity-detail-workspace-panel-selected={selected ? 'true' : 'false'}
                      hidden={!selected}
                      className="min-h-[260px]"
                    >
                      <div className="mb-3 border-b border-[#252b34] pb-3">
                        <h3 className="text-[13px] font-semibold text-[#eef2f7]">{tab.title}</h3>
                        <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{tab.copy}</p>
                      </div>
                      {tab.content}
                    </section>
                  );
                })}
              </div>
            </section>

            <aside
              data-entity-detail-context-rail="identity-route-shortcuts"
              className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.24)] xl:sticky xl:top-5"
            >
              <div className="border-b border-[#252b34] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[#eef2f7]">{t('entities.detail.panel.overview.title')}</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{t('entities.detail.panel.overview.copy')}</p>
              </div>

              <div data-entity-detail-count-strip="hertzbeat-ui-inline-counts" className="grid gap-2 border-b border-[#252b34] p-3 sm:grid-cols-2 xl:grid-cols-1">
                {metrics.map(({ Icon, key, label, value }) => (
                  <div
                    key={label}
                    data-entity-detail-count-metric={key}
                    className="flex min-h-[36px] items-center justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] text-[#a9b0bb]"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="text-[17px] font-semibold tabular-nums text-[#eef2f7]">{value}</span>
                  </div>
                ))}
              </div>

              <div data-entity-detail-overview-panel="hertzbeat-ui-overview-panel" className="border-b border-[#252b34] p-3">
                <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {facts.map(fact => (
                    <div key={fact.label} className="min-h-[36px] rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-[0.08em] text-[#7e8494]">{fact.label}</div>
                      <div className="mt-1 truncate text-[12px] font-semibold text-[#eef2f7]">{fact.value}</div>
                    </div>
                  ))}
                </div>
                <RowStack rows={buildOverviewRows(entity, detail, t)} />
              </div>

              <div data-entity-detail-context-center="hertzbeat-entity-context" className="border-b border-[#252b34] p-3">
                <div className="mb-3">
                  <h3 className="text-[12px] font-semibold text-[#eef2f7]">{t('entities.detail.panel.context.title')}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{t('entities.detail.panel.context.copy')}</p>
                </div>
                <InheritedContextRows rows={incomingContextRows} />
                {unavailableDetail ? <RowStack rows={unavailableRows} /> : <ContextLinkRows rows={contextLinks} />}
              </div>

              <div data-entity-detail-next-panel="hertzbeat-ui-next-panel" className="border-b border-[#252b34] p-3">
                <div className="mb-3">
                  <h3 className="text-[12px] font-semibold text-[#eef2f7]">{t('entities.detail.panel.next.title')}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{t('entities.detail.panel.next.copy')}</p>
                </div>
                <RowStack rows={nextActionRows.length > 0 ? nextActionRows : unavailableRows} />
              </div>

              <div data-entity-detail-drilldown-panel="hertzbeat-ui-drilldown-panel" className="p-3">
                <div className="mb-3">
                  <h3 className="text-[12px] font-semibold text-[#eef2f7]">{t('entities.detail.panel.drilldown.title')}</h3>
                  <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{t('entities.detail.panel.drilldown.copy')}</p>
                </div>
                {drilldownRows.length > 0 ? <RouteRows rows={drilldownRows} /> : <RowStack rows={unavailableRows} />}
              </div>
            </aside>

            <div className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 text-[12px] leading-5 text-[#8f99ab] xl:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#eef2f7]">
                <Activity className="h-3.5 w-3.5 text-[#858d9a]" aria-hidden="true" />
                {t('entities.detail.disposition.title')}
              </div>
              {t('entities.detail.disposition.copy')}
            </div>
          </div>
          </>
          )}
        </div>
        </section>
      </main>
      <OverlayDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        closeLabel={t('common.dialog.close')}
        title={t('entities.detail.delete.title')}
        kicker={t('entities.detail.delete.kicker')}
        maxWidthClassName="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="default" className={coldButtonClassName} onClick={closeDeleteDialog}>
              {t('entities.detail.delete.cancel')}
            </Button>
            <Button size="sm" variant="default" className={coldDangerButtonClassName} disabled={isPending} onClick={submitDeleteDialog}>
              {t('entities.detail.delete.confirm')}
            </Button>
          </div>
        }
      >
        <div data-entity-detail-delete-confirm="hertzbeat-ui-modal" className="space-y-3 text-[12px] leading-6 text-[#a9b0bb]">
          <p>{t('entities.detail.delete.copy')}</p>
          {deleteImpactRows.length > 0 ? (
            <div
              data-entity-detail-delete-impact-summary="read-model-counts"
              className="grid gap-2 sm:grid-cols-2"
            >
              {deleteImpactRows.map(row => (
                <div
                  key={row.label}
                  data-entity-detail-delete-impact-row={row.label}
                  className="flex min-h-[36px] items-center justify-between gap-3 rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] px-3"
                >
                  <span className="truncate text-[11px] font-semibold text-[#8f99ab]">{row.label}</span>
                  <span className="text-[14px] font-semibold tabular-nums text-[#eef2f7]">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {deleteHasImpact ? (
            <p data-entity-detail-delete-impact-warning="has-related-evidence" className="text-[#f0b8c1]">
              {t('entities.detail.delete.impact-warning')}
            </p>
          ) : null}
          <div className="rounded-[3px] border border-[#3f2228] bg-[#181013] px-3 py-2 text-[#f0b8c1]">
            {title} {entityId ? <span className="text-[#8f99ab]">#{entityId}</span> : null}
          </div>
        </div>
      </OverlayDialog>
    </>
  );
}
