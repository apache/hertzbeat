'use client';

import Link from 'next/link';
import React from 'react';
import { Bell, CircleHelp, GitBranch, Inbox, Network, Plus, RefreshCw, Upload } from 'lucide-react';
import { HzInlineFeedback, HzPaginationBar } from '@hertzbeat/ui';
import { Button } from '../ui/button';
import { SearchRow } from '../ui/search-row';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { cn } from '../../lib/utils';
import { queryStateToQueryString, type EntityQueryState } from '../../lib/entity-manage/query-state';
import { entityStatusLabel, entityTypeLabel } from '../../lib/entity-manage/display-mapping';
import type { LightweightEntityHealthAffordance } from '../../lib/entity-health-affordance';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type EntityListTableRow = {
  key: string;
  name: string;
  identityName?: string;
  owner: string;
  type: string;
  environment: string;
  status: string;
  statusReason?: string;
  statusTone: 'success' | 'warning' | 'danger' | 'neutral';
  health?: LightweightEntityHealthAffordance;
  monitorCount: string;
  activeAlertCount: string;
  identityCount: string;
  relationCount: string;
  updatedAt: string;
  href: string;
  ownerHref: string;
  metricHref: string;
  logHref: string;
  traceHref: string;
  discoveryCandidateMode?: boolean;
};

type EntityListSurfaceProps = {
  t: Translator;
  rows: EntityListTableRow[];
  draft: EntityQueryState;
  total: number;
  rangeFrom: number;
  rangeTo: number;
  pageIndex?: number;
  pageSize?: number;
  abnormalCount: number;
  healthPendingCount?: number;
  alertingCount: number;
  linkedCount: number;
  pageOutOfRange?: {
    requestedPage: number;
    displayedPage: number;
    totalPages: number;
  };
  pageSizeAdjustment?: {
    requested: string;
    applied: string;
  };
  payloadTrim?: {
    received: number;
    rendered: number;
  };
  deleteSuccess?: boolean;
  deletedEntity?: string;
  onDraftChange: (patch: Partial<EntityQueryState>) => void;
  onSearch: (submittedSearch?: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onPageIndexChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

const coldEntityVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#eef4ff]';

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#eef4ff]';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#eef4ff]';

const coldSmallButtonClassName =
  'h-7 min-w-[64px] rounded-[3px] border-[#2b3039] bg-[#101217] px-2.5 text-[12px] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#eef4ff]';

const coldEvidenceBadgeClassName =
  'rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]';

const coldCompactActionLinkClassName =
  'rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-[#eef4ff]';

type EntityListActionHelpCopy = {
  label: string;
  body: string;
  impact?: string;
};

type EntityListActiveFilterChip = {
  id: 'type' | 'status';
  label: string;
};

type DiscoveryCandidateContext = {
  monitorLabel: string;
  monitorMeta: string;
  monitorHref?: string;
  returnHref: string;
};

function safeInternalHref(value: string | undefined, fallback: string) {
  const href = value?.trim();
  if (!href || !href.startsWith('/') || href.startsWith('//')) return fallback;
  return href;
}

function buildDiscoveryCandidateContext(t: Translator, draft: EntityQueryState): DiscoveryCandidateContext | null {
  if (draft.source !== 'discovery-candidate') return null;
  const monitorId = draft.monitorId?.trim();
  const monitorName = draft.monitorName?.trim();
  const monitorApp = draft.monitorApp?.trim();
  const monitorInstance = draft.monitorInstance?.trim();
  if (!monitorId && !monitorName && !monitorApp && !monitorInstance) return null;

  return {
    monitorLabel: monitorName || (monitorId ? t('entities.list.discovery-candidate.monitor-id', { id: monitorId }) : t('common.none')),
    monitorMeta: t('entities.list.discovery-candidate.monitor-meta', {
      app: monitorApp || t('common.none'),
      instance: monitorInstance || t('common.none')
    }),
    monitorHref: monitorId ? `/monitors/${encodeURIComponent(monitorId)}` : undefined,
    returnHref: safeInternalHref(draft.returnTo, '/entities/discovery')
  };
}

function buildEntityListCurrentHref(draft: EntityQueryState) {
  const queryString = queryStateToQueryString(draft);
  return queryString ? `/entities?${queryString}` : '/entities';
}

function buildEntityCreateHref(draft: EntityQueryState) {
  const monitorId = draft.monitorId?.trim();
  if (draft.source !== 'discovery-candidate' || !monitorId) {
    return '/entities/new';
  }

  const params = new URLSearchParams({ source: 'discovery-candidate', monitorId });
  const monitorName = draft.monitorName?.trim();
  const monitorApp = draft.monitorApp?.trim();
  const monitorInstance = draft.monitorInstance?.trim();
  if (monitorName) params.set('monitorName', monitorName);
  if (monitorApp) params.set('monitorApp', monitorApp);
  if (monitorInstance) params.set('monitorInstance', monitorInstance);
  params.set('returnTo', buildEntityListCurrentHref(draft));
  return `/entities/new?${params.toString()}`;
}

function buildEntityListActiveFilterChips(t: Translator, draft: EntityQueryState): EntityListActiveFilterChip[] {
  const chips: EntityListActiveFilterChip[] = [];
  const type = draft.type?.trim();
  const status = draft.status?.trim();
  if (type) {
    chips.push({
      id: 'type',
      label: t('entities.list.active-filter.type', { value: entityTypeLabel(type, t) })
    });
  }
  if (status) {
    chips.push({
      id: 'status',
      label: t('entities.list.active-filter.status', { value: entityStatusLabel(status, t) })
    });
  }
  return chips;
}

function entityListActionHelp(t: Translator, id: string): EntityListActionHelpCopy {
  const impactKey = `entities.list.action-help.${id}.impact`;
  const impact = t(impactKey);
  return {
    label: t(`entities.list.action-help.${id}.label`),
    body: t(`entities.list.action-help.${id}.body`),
    impact: impact === impactKey ? undefined : impact
  };
}

function EntityListActionHelp({
  id,
  label,
  body,
  impact
}: EntityListActionHelpCopy & {
  id: string;
}) {
  return (
    <span
      data-entity-list-action-help={id}
      className="group/help relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
    >
      <button
        type="button"
        aria-label={label}
        data-entity-list-action-help-trigger="hertzbeat-ui-action-help"
        data-entity-list-action-help-style="icon-after-action"
        data-entity-list-action-help-visual="circle-help-icon"
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#b8c7df] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-entity-list-action-help-icon="lucide-circle-help" />
      </button>
      <span
        role="tooltip"
        data-entity-list-action-help-tooltip={id}
        className="pointer-events-none absolute right-0 top-6 z-30 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{body}</span>
        {impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span> : null}
      </span>
    </span>
  );
}

function EntityListActionHelpItem({
  help,
  children
}: {
  help: EntityListActionHelpCopy & { id: string };
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1" data-entity-list-action-help-item={help.id}>
      {children}
      <EntityListActionHelp {...help} />
    </span>
  );
}

function EntityListActionLink({
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-[#eef4ff]"
      {...props}
    >
      {children}
    </Link>
  );
}

function statusClassName(statusTone: EntityListTableRow['statusTone']) {
  if (statusTone === 'success') {
    return 'border-[#303743] bg-[#101217] text-[#dbe4f0]';
  }
  if (statusTone === 'danger') {
    return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
  }
  if (statusTone === 'warning') {
    return 'border-[#854d0e]/55 bg-[#2a1c0c] text-[#facc15]';
  }
  return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
}

function EntityListCompactRowEvidence({ t, row }: { t: Translator; row: EntityListTableRow }) {
  return (
    <div
      data-entity-list-row-compact-evidence="first-column-narrow-viewport"
      className="mt-2 flex flex-wrap gap-1.5 xl:hidden"
    >
      <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.monitors', { count: row.monitorCount })}</span>
      <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.alerts', { count: row.activeAlertCount })}</span>
      <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.identities', { count: row.identityCount })}</span>
      <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.relations', { count: row.relationCount })}</span>
    </div>
  );
}

function EntityListCompactRowActions({ t, row }: { t: Translator; row: EntityListTableRow }) {
  const ownerActionKey = row.discoveryCandidateMode ? 'entities.list.row.action.bind-monitor' : 'entities.list.row.action.owner';
  return (
    <div
      data-entity-list-row-compact-actions="first-column-narrow-viewport"
      className="mt-2 flex flex-wrap gap-1.5 xl:hidden"
    >
      <Link
        href={row.ownerHref}
        data-entity-list-command-action={row.discoveryCandidateMode ? 'bind-monitor' : 'edit-owner'}
        data-entity-list-row-compact-owner-action="first-column"
        className={coldCompactActionLinkClassName}
      >
        {t(ownerActionKey)}
      </Link>
      <Link
        href={row.metricHref}
        data-entity-list-command-action="open-metrics"
        data-entity-list-row-compact-metric-action="first-column"
        className={coldCompactActionLinkClassName}
      >
        {t('entities.list.row.action.metrics')}
      </Link>
      <Link
        href={row.logHref}
        data-entity-list-command-action="open-logs"
        data-entity-list-row-compact-log-action="first-column"
        className={coldCompactActionLinkClassName}
      >
        {t('entities.list.row.action.logs')}
      </Link>
      <Link
        href={row.traceHref}
        data-entity-list-command-action="open-traces"
        data-entity-list-row-compact-trace-action="first-column"
        className={coldCompactActionLinkClassName}
      >
        {t('entities.list.row.action.traces')}
      </Link>
    </div>
  );
}

function EmptyTableRow({
  t,
  discoveryCandidateContext,
  entityCreateHref,
  filteredEmpty = false,
  onRefresh,
  onReset
}: {
  t: Translator;
  discoveryCandidateContext?: DiscoveryCandidateContext | null;
  entityCreateHref: string;
  filteredEmpty?: boolean;
  onRefresh: () => void;
  onReset: () => void;
}) {
  const emptyState = discoveryCandidateContext ? 'discovery-candidate' : filteredEmpty ? 'filtered' : 'plain';
  const emptyTitleKey = discoveryCandidateContext
    ? 'entities.list.empty.discovery-candidate.title'
    : filteredEmpty
      ? 'entities.list.empty.filtered.title'
      : 'entities.list.empty.title';
  const emptyCopyKey = discoveryCandidateContext
    ? 'entities.list.empty.discovery-candidate.copy'
    : filteredEmpty
      ? 'entities.list.empty.filtered.copy'
      : 'entities.list.empty.copy';

  return (
    <tr data-entity-list-empty-state="hertzbeat-ui-table-empty" data-entity-list-empty-mode={emptyState} className="border-t border-[#252b34] bg-[#0b0c0e]">
      <td colSpan={6} className="h-[240px] px-3 text-center text-[#a9b0bb]">
        <div className="inline-flex flex-col items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div data-entity-list-empty-title={emptyState} className="text-[13px] font-semibold text-[#eef2f7]">
            {t(emptyTitleKey)}
          </div>
          <div data-entity-list-empty-copy={emptyState} className="max-w-[520px] text-[12px] leading-5 text-[#8f99ab]">
            {t(emptyCopyKey)}
          </div>
          {discoveryCandidateContext ? (
            <Link
              href={entityCreateHref}
              data-entity-list-command-action="create-entity-draft"
              data-entity-list-empty-create-action="discovery-candidate-monitor-draft"
              className={coldPrimaryLinkClassName}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('entities.list.empty.discovery-candidate.action')}
            </Link>
          ) : null}
          {!discoveryCandidateContext && filteredEmpty ? (
            <div
              data-entity-list-empty-filtered-actions="clear-refresh"
              className="mt-1 flex flex-wrap items-center justify-center gap-2"
            >
              <Button
                type="button"
                size="sm"
                variant="default"
                data-entity-list-command-action="clear-filters"
                data-entity-list-empty-filtered-clear="reset-filters"
                className={coldPrimaryLinkClassName}
                onClick={onReset}
              >
                {t('common.clear')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="default"
                data-entity-list-command-action="refresh"
                data-entity-list-empty-filtered-refresh="reload-results"
                className={coldLinkButtonClassName}
                onClick={onRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {t('common.refresh')}
              </Button>
            </div>
          ) : null}
          {!discoveryCandidateContext && !filteredEmpty ? (
            <div
              data-entity-list-empty-actions="first-run-entity-paths"
              className="mt-1 flex flex-wrap items-center justify-center gap-2"
            >
              <Link
                href="/entities/new"
                data-entity-list-command-action="create"
                data-entity-list-empty-action="create"
                className={coldPrimaryLinkClassName}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('entities.list.empty.action.create')}
              </Link>
              <Link
                href="/entities/discovery"
                data-entity-list-command-action="discovery"
                data-entity-list-empty-action="discovery"
                className={coldLinkButtonClassName}
              >
                <Network className="h-3.5 w-3.5" aria-hidden="true" />
                {t('entities.list.empty.action.discovery')}
              </Link>
              <Link
                href="/entities/import"
                data-entity-list-command-action="import"
                data-entity-list-empty-action="import"
                className={coldLinkButtonClassName}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {t('entities.list.empty.action.import')}
              </Link>
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function EntityListSurface({
  t,
  rows,
  draft,
  total,
  rangeFrom,
  rangeTo,
  pageIndex = 0,
  pageSize = 8,
  abnormalCount,
  healthPendingCount = 0,
  alertingCount,
  linkedCount,
  pageOutOfRange,
  pageSizeAdjustment,
  payloadTrim,
  deleteSuccess = false,
  deletedEntity,
  onDraftChange,
  onSearch,
  onRefresh,
  onReset,
  onPageIndexChange,
  onPageSizeChange
}: EntityListSurfaceProps) {
  const healthMetric = abnormalCount > 0
    ? { id: 'abnormal', label: t('entities.list.metric.abnormal'), value: abnormalCount, Icon: Bell }
    : { id: 'pending-evidence', label: t('entities.list.metric.pending-evidence'), value: healthPendingCount, Icon: Inbox };
  const metricItems = [
    { id: 'total', label: t('entities.list.metric.total'), value: total, Icon: Network },
    healthMetric,
    { id: 'alerting', label: t('entities.list.metric.alerting'), value: alertingCount, Icon: Bell },
    { id: 'linked', label: t('entities.list.metric.linked'), value: linkedCount, Icon: GitBranch }
  ];
  const normalizedPageSize = pageSize > 0 ? pageSize : 8;
  const normalizedPageIndex = Math.max(0, pageIndex);
  const currentPage = normalizedPageIndex + 1;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const hasPagedCatalog = total > normalizedPageSize;
  const paginationSummary = t('entities.list.pagination.summary', {
    page: currentPage,
    totalPages,
    from: rangeFrom,
    to: rangeTo,
    total
  });
  const pageSizeOptions = [8, 20, 50];
  const discoveryCandidateContext = buildDiscoveryCandidateContext(t, draft);
  const entityCreateHref = buildEntityCreateHref(draft);
  const rowActionsHelp = {
    id: 'row-actions',
    label: t('entities.list.column.next-action'),
    body: [
      entityListActionHelp(t, 'row-owner').body,
      entityListActionHelp(t, 'row-metrics').body,
      entityListActionHelp(t, 'row-logs').body,
      entityListActionHelp(t, 'row-traces').body
    ].join(' ')
  };
  const isFilteredEmpty =
    rows.length === 0
    && !discoveryCandidateContext
    && Boolean(draft.search?.trim() || draft.type?.trim() || draft.status?.trim());
  const activeFilterChips = buildEntityListActiveFilterChips(t, draft);
  const handlePageJumpChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    const nextPageIndex = Math.min(Math.max(parsed - 1, 0), totalPages - 1);
    onPageIndexChange?.(nextPageIndex);
  };
  const renderPaginationBar = (placement: 'top' | 'bottom') => (
    <div
      data-entity-list-pagination="hertzbeat-ui-dense-pagination"
      data-entity-list-pagination-owner="hertzbeat-ui-pagination-bar"
      data-entity-list-pagination-placement={placement}
    >
      <HzPaginationBar
        summary={paginationSummary}
        pageSizeLabel={t('entities.list.pagination.page-size')}
        pageSizeValue={String(normalizedPageSize)}
        pageSizeOptions={pageSizeOptions.map(value => ({ value: String(value), label: String(value) }))}
        pageJumpLabel={t('entities.list.pagination.page')}
        pageJumpValue={String(currentPage)}
        pageJumpMax={totalPages}
        previousLabel={t('common.previous-page')}
        nextLabel={t('common.next-page')}
        previousDisabled={normalizedPageIndex <= 0}
        nextDisabled={currentPage >= totalPages}
        onPrevious={() => onPageIndexChange?.(Math.max(normalizedPageIndex - 1, 0))}
        onNext={() => onPageIndexChange?.(Math.min(normalizedPageIndex + 1, totalPages - 1))}
        onPageSizeChange={value => onPageSizeChange?.(Number.parseInt(value, 10))}
        onPageJumpChange={handlePageJumpChange}
        pageJumpInputProps={
          {
            'data-entity-list-pagination-page-jump-owner': 'hertzbeat-ui-input',
            'data-entity-list-pagination-placement': placement
          } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
        }
        pageSizeSelectProps={
          {
            'data-entity-list-pagination-page-size-owner': 'hertzbeat-ui-select',
            'data-entity-list-pagination-placement': placement
          } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']
        }
        previousButtonProps={
          {
            'data-entity-list-pagination-previous-owner': 'hertzbeat-ui-button',
            'data-entity-list-pagination-placement': placement
          } as React.ComponentProps<typeof HzPaginationBar>['previousButtonProps']
        }
        nextButtonProps={
          {
            'data-entity-list-pagination-next-owner': 'hertzbeat-ui-button',
            'data-entity-list-pagination-placement': placement
          } as React.ComponentProps<typeof HzPaginationBar>['nextButtonProps']
        }
        className="border-x-0"
      />
    </div>
  );

  return (
    <main
      data-entity-list-surface="otlp-hertzbeat-ui-entity-console"
      data-entity-list-style-baseline={coldEntityVisual.canvasName}
      className={cn(coldEntityVisual.canvas.root, 'w-full min-w-0')}
      style={coldEntityVisual.canvas.backgroundStyle}
    >
      <section className={cn(coldEntityVisual.layout.pageSection, 'w-full min-w-0')}>
        <div className="mx-auto w-full max-w-[1480px] min-w-0">
          <div className="mb-5">
            <div
              data-entity-list-header="hertzbeat-ui-compact-header"
              data-entity-list-header-nesting-contract="flat-page-introduction"
              className="p-0"
            >
              <div className="max-w-[880px]">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('entities.list.kicker')}</div>
                <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{t('entities.list.title')}</h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  {t('entities.list.subtitle')}
                </p>
                <div
                  data-entity-list-command-row="standard-equal-buttons"
                  data-entity-list-command-row-mobile="two-column-wrap"
                  className="mt-6 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap"
                >
                  <EntityListActionHelpItem help={{ id: 'refresh', ...entityListActionHelp(t, 'refresh') }}>
                    <Button
                      size="sm"
                      variant="default"
                      data-entity-list-command-action="refresh"
                      className={coldButtonClassName}
                      onClick={onRefresh}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                  </EntityListActionHelpItem>
                  <EntityListActionHelpItem help={{ id: 'create', ...entityListActionHelp(t, 'create') }}>
                    <Link
                      href={entityCreateHref}
                      data-entity-list-command-action="create"
                      className={coldPrimaryLinkClassName}
                      data-entity-list-create-action={discoveryCandidateContext ? 'discovery-candidate-monitor-draft' : 'manual'}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('entities.list.action.create')}
                    </Link>
                  </EntityListActionHelpItem>
                  <EntityListActionHelpItem help={{ id: 'discovery', ...entityListActionHelp(t, 'discovery') }}>
                    <Link href="/entities/discovery" data-entity-list-command-action="discovery" className={coldLinkButtonClassName}>
                      <Network className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('entities.list.action.discovery')}
                    </Link>
                  </EntityListActionHelpItem>
                  <EntityListActionHelpItem help={{ id: 'import', ...entityListActionHelp(t, 'import') }}>
                    <Link href="/entities/import" data-entity-list-command-action="import" className={coldLinkButtonClassName}>
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('entities.list.action.import')}
                    </Link>
                  </EntityListActionHelpItem>
                </div>
              </div>
            </div>
          </div>

          <div data-entity-list-admin-layout="full-width-admin-list" className="w-full min-w-0 space-y-5">
            <div data-entity-list-count-strip="hertzbeat-ui-inline-counts" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {metricItems.map(({ id, label, value, Icon }) => {
                const MetricIcon = Icon;
                return (
                  <div
                    key={id}
                    data-entity-list-count-metric={id}
                    className="flex min-h-[36px] items-center justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-3 text-[12px] text-[#a9b0bb]"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <MetricIcon className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="text-[17px] font-semibold tabular-nums text-[#eef2f7]">{value as number}</span>
                  </div>
                );
              })}
            </div>

            <section className="min-w-0">
              {discoveryCandidateContext ? (
                <div
                  data-entity-list-discovery-candidate-context="monitor-candidate"
                  className="mb-3 flex flex-col gap-3 rounded-[4px] border border-[#31405c] bg-[#101826] px-3 py-3 text-[12px] text-[#a9b0bb] lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#eef2f7]">{t('entities.list.discovery-candidate.title')}</div>
                    <div className="mt-1 truncate text-[#cbd5e1]" data-entity-list-discovery-candidate-monitor="current-monitor">
                      {discoveryCandidateContext.monitorLabel}
                    </div>
                    <div className="mt-1 text-[11px] text-[#8f99ab]">{discoveryCandidateContext.monitorMeta}</div>
                    <div className="mt-2 max-w-[820px] text-[11px] leading-5 text-[#98a2b3]">
                      {t('entities.list.discovery-candidate.copy')}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={discoveryCandidateContext.returnHref} className={`inline-flex items-center justify-center ${coldSmallButtonClassName}`}>
                      {t('entities.list.discovery-candidate.return')}
                    </Link>
                    {discoveryCandidateContext.monitorHref ? (
                      <Link href={discoveryCandidateContext.monitorHref} className={`inline-flex items-center justify-center ${coldSmallButtonClassName}`}>
                        {t('entities.list.discovery-candidate.open-monitor')}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {deleteSuccess ? (
                <div className="mb-3">
                  <HzInlineFeedback
                    tone="success"
                    title={t('common.notify.delete-success')}
                    description={t('entities.list.delete-success.description', {
                      id: deletedEntity?.trim() || t('common.none')
                    })}
                    variant="embedded"
                    data-entity-list-delete-success="entity-delete-confirmed"
                    data-entity-list-delete-success-owner="hertzbeat-ui-inline-feedback"
                    data-entity-list-delete-success-id={deletedEntity?.trim() || ''}
                  />
                </div>
              ) : null}
              {pageOutOfRange ? (
                <div className="mb-3">
                  <HzInlineFeedback
                    tone="warning"
                    title={t('entities.list.pagination.out-of-range.title', {
                      requestedPage: pageOutOfRange.requestedPage,
                      totalPages: pageOutOfRange.totalPages
                    })}
                    description={t('entities.list.pagination.out-of-range.description', {
                      displayedPage: pageOutOfRange.displayedPage,
                      totalPages: pageOutOfRange.totalPages
                    })}
                    variant="embedded"
                    data-entity-list-page-out-of-range="showing-last-page"
                    data-entity-list-page-out-of-range-owner="hertzbeat-ui-inline-feedback"
                  />
                </div>
              ) : null}
              {pageSizeAdjustment ? (
                <div className="mb-3">
                  <HzInlineFeedback
                    tone="warning"
                    title={t('entities.list.pagination.page-size-adjusted.title', {
                      requested: pageSizeAdjustment.requested,
                      applied: pageSizeAdjustment.applied
                    })}
                    description={t('entities.list.pagination.page-size-adjusted.description')}
                    variant="embedded"
                    data-entity-list-page-size-adjusted="unsupported-page-size"
                    data-entity-list-page-size-adjusted-owner="hertzbeat-ui-inline-feedback"
                  />
                </div>
              ) : null}
              {payloadTrim ? (
                <div className="mb-3">
                  <HzInlineFeedback
                    tone="warning"
                    title={t('entities.list.pagination.payload-trimmed.title', {
                      received: payloadTrim.received,
                      rendered: payloadTrim.rendered
                    })}
                    description={t('entities.list.pagination.payload-trimmed.description')}
                    meta={(
                      <span
                        data-entity-list-payload-trimmed-actions="refresh-clear"
                        className="flex items-center gap-1.5"
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          data-entity-list-payload-trimmed-refresh="table-reload"
                          className={coldSmallButtonClassName}
                          onClick={onRefresh}
                        >
                          {t('common.refresh')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          data-entity-list-payload-trimmed-clear="reset-filters"
                          className={coldSmallButtonClassName}
                          onClick={onReset}
                        >
                          {t('common.clear')}
                        </Button>
                      </span>
                    )}
                    variant="embedded"
                    data-entity-list-payload-trimmed="page-size-guard"
                    data-entity-list-payload-trimmed-owner="hertzbeat-ui-inline-feedback"
                  />
                </div>
              ) : null}
              <SearchRow
                data-entity-list-toolbar="hertzbeat-ui-table-toolbar"
                value={draft.search}
                placeholder={t('entities.list.search.placeholder')}
                searchLabel={t('common.search')}
                inputWidthClassName="w-full sm:w-[420px]"
                onValueChange={value => onDraftChange({ search: value })}
                onSearch={onSearch}
                trailingActions={
                  <>
                    <EntityListActionHelpItem help={{ id: 'filter-refresh', ...entityListActionHelp(t, 'filter-refresh') }}>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        data-entity-list-command-action="refresh"
                        data-entity-list-refresh-action="search-row-secondary"
                        className={coldSmallButtonClassName}
                        onClick={onRefresh}
                      >
                        {t('common.refresh')}
                      </Button>
                    </EntityListActionHelpItem>
                    <EntityListActionHelpItem help={{ id: 'clear', ...entityListActionHelp(t, 'clear') }}>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        data-entity-list-command-action="clear-filters"
                        data-entity-list-clear-action="search-row-secondary"
                        className={coldSmallButtonClassName}
                        onClick={onReset}
                      >
                        {t('common.clear')}
                      </Button>
                    </EntityListActionHelpItem>
                  </>
                }
              />
              {activeFilterChips.length > 0 ? (
                <div
                  data-entity-list-active-filters="visible-url-filters"
                  data-entity-list-active-filters-owner="hertzbeat-ui-filter-scope"
                  className="mb-3 flex flex-col gap-2 rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-2 text-[12px] text-[#98a2b3] md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#dbe4f0]">{t('entities.list.active-filter.title')}</div>
                    <div className="mt-1 text-[11px] leading-5 text-[#8f99ab]">{t('entities.list.active-filter.copy')}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5" aria-label={t('entities.list.active-filter.title')}>
                    {activeFilterChips.map(chip => (
                      <span
                        key={chip.id}
                        data-entity-list-active-filter-chip={chip.id}
                        className="rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-0.5 text-[11px] font-semibold text-[#dbe4f0]"
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {hasPagedCatalog ? (
                <div
                  data-entity-list-scale-scope="paged-catalog"
                  data-entity-list-scale-scope-owner="hertzbeat-ui-inline-scope"
                  className="mb-3 flex flex-col gap-1 rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-2 text-[12px] text-[#98a2b3] md:flex-row md:items-center md:justify-between"
                >
                  <span className="font-semibold text-[#dbe4f0]">{t('entities.list.scale-scope.title')}</span>
                  <span className="md:text-right">
                    {t('entities.list.scale-scope.copy', {
                      from: rangeFrom,
                      to: rangeTo,
                      total
                    })}
                  </span>
                </div>
              ) : null}

              <div
                data-entity-list-table-shell="hertzbeat-ui-dense-table"
                className="w-full min-w-0 overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-[#252b34] bg-[#101217] px-3 text-[12px] text-[#8f99ab]">
                  <span className="font-semibold text-[#dbe4f0]">{t('entities.list.table.total', { total })}</span>
                  <span>{t('entities.list.table.range', { from: rangeFrom, to: rangeTo, total })}</span>
                </div>
                {hasPagedCatalog ? renderPaginationBar('top') : null}
                <div className="overflow-x-auto">
                  <table data-entity-list-table="hertzbeat-ui-entity-table" className="min-w-[760px] w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb] xl:min-w-[1040px]">
                    <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                      <tr>
                        <th className="w-[34%] px-3 py-2.5 xl:w-[24%]">{t('entities.list.column.object')}</th>
                        <th className="w-[14%] px-3 py-2.5">{t('entities.list.column.owner')}</th>
                        <th className="w-[28%] px-3 py-2.5 xl:w-[18%]">{t('entities.list.column.progress')}</th>
                        <th className="hidden w-[24%] px-3 py-2.5 xl:table-cell">{t('entities.list.column.evidence')}</th>
                        <th className="w-[16%] px-3 py-2.5 xl:w-[12%]">{t('entities.list.column.status')}</th>
                        <th className="hidden w-[150px] px-3 py-2.5 xl:table-cell">
                          <span
                            data-entity-list-row-action-help-contract="single-header-help"
                            className="inline-flex items-center gap-1"
                          >
                            {t('entities.list.column.next-action')}
                            <EntityListActionHelp {...rowActionsHelp} />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length > 0 ? rows.map(row => (
                        <tr key={row.key} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                          <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">
                            <Link
                              href={row.href}
                              data-entity-list-command-action="open-detail"
                              className="inline-flex max-w-full text-[#dbe4f0] hover:text-[#eef4ff]"
                            >
                              <span className="truncate">{row.name}</span>
                            </Link>
                            {row.identityName ? (
                              <div
                                data-entity-list-row-identity-name="service-name"
                                className="mt-1 truncate font-mono text-[11px] font-normal text-[#9aa6b8]"
                              >
                                {t('entities.list.row.identity-name', { name: row.identityName })}
                              </div>
                            ) : null}
                            <div className="mt-1 truncate text-[11px] font-normal text-[#858d9a]">
                              {row.type} · {row.environment}
                            </div>
                            <EntityListCompactRowEvidence t={t} row={row} />
                            <EntityListCompactRowActions t={t} row={row} />
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-[#dbe4f0]">{row.owner}</td>
                          <td className="px-3 py-2.5">
                            {row.health ? (
                              <div
                                data-entity-list-health-affordance="lightweight-service-health"
                                data-entity-health-score={row.health.score}
                              >
                                <div className="font-semibold text-[#eef2f7]">{row.health.label}</div>
                                <div className="mt-1 text-[11px] text-[#858d9a]">{row.health.copy}</div>
                                <div className="mt-1 text-[11px] text-[#8f99ab]">{row.health.meta}</div>
                              </div>
                            ) : (
                              <>
                                <div className="font-semibold text-[#eef2f7]">
                                  {t('entities.list.row.progress.incomplete', {
                                    percent: row.statusTone === 'success' ? '40%' : '20%'
                                  })}
                                </div>
                                <div className="mt-1 text-[11px] text-[#858d9a]">{t('entities.list.row.progress.missing')}</div>
                              </>
                            )}
                          </td>
                          <td className="hidden px-3 py-2.5 xl:table-cell">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.monitors', { count: row.monitorCount })}</span>
                              <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.alerts', { count: row.activeAlertCount })}</span>
                              <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.identities', { count: row.identityCount })}</span>
                              <span className={coldEvidenceBadgeClassName}>{t('entities.list.row.evidence.relations', { count: row.relationCount })}</span>
                            </div>
                            <div className="mt-2 text-[11px] text-[#858d9a]">{t('entities.list.row.evidence.updated', { time: row.updatedAt })}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${statusClassName(row.statusTone)}`}>
                              {row.status}
                            </span>
                            {row.statusReason ? (
                              <div
                                data-entity-list-row-status-reason="evidence-lifecycle"
                                className="mt-1 max-w-[220px] text-[11px] leading-4 text-[#8f99ab]"
                              >
                                {row.statusReason}
                              </div>
                            ) : null}
                          </td>
                          <td className="hidden px-3 py-2.5 xl:table-cell">
                            <div data-entity-list-row-actions="hertzbeat-ui-inline-actions" className="flex flex-wrap gap-1.5">
                              <EntityListActionLink
                                href={row.ownerHref}
                                data-entity-list-command-action={row.discoveryCandidateMode ? 'bind-monitor' : 'edit-owner'}
                                data-entity-list-row-owner-action="text-only"
                              >
                                {t(row.discoveryCandidateMode ? 'entities.list.row.action.bind-monitor' : 'entities.list.row.action.owner')}
                              </EntityListActionLink>
                              <EntityListActionLink
                                href={row.metricHref}
                                data-entity-list-command-action="open-metrics"
                                data-entity-list-row-metric-action="context-handoff"
                              >
                                {t('entities.list.row.action.metrics')}
                              </EntityListActionLink>
                              <EntityListActionLink
                                href={row.logHref}
                                data-entity-list-command-action="open-logs"
                                data-entity-list-row-log-action="context-handoff"
                              >
                                {t('entities.list.row.action.logs')}
                              </EntityListActionLink>
                              <EntityListActionLink
                                href={row.traceHref}
                                data-entity-list-command-action="open-traces"
                                data-entity-list-row-trace-action="context-handoff"
                              >
                                {t('entities.list.row.action.traces')}
                              </EntityListActionLink>
                            </div>
                          </td>
                        </tr>
                      )) : (
                      <EmptyTableRow
                        t={t}
                        discoveryCandidateContext={discoveryCandidateContext}
                        entityCreateHref={entityCreateHref}
                        filteredEmpty={isFilteredEmpty}
                        onRefresh={onRefresh}
                        onReset={onReset}
                      />
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationBar('bottom')}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
