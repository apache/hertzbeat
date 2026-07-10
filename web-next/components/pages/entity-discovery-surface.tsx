'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleHelp, Database, Network, Plus, Search, Upload, Users } from 'lucide-react';
import { HzInlineFeedback } from '@hertzbeat/ui';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { searchDiscoveryMonitors } from '@/lib/entity-discovery/controller';
import type { DiscoveryMonitorSearchResult } from '@/lib/entity-discovery/controller';
import { buildDiscoveryTableRows } from '@/lib/entity-discovery/view-model';
import type { DiscoveryStatusTone, DiscoveryTableRow } from '@/lib/entity-discovery/view-model';
import type {
  EntityCatalogSuggestions,
  EntityDiscoveryGovernanceActivity,
  EntityDiscoveryGovernancePreset,
  EntitySummaryInfo,
  Monitor,
  PageResult
} from '@/lib/types';
import { SearchRow } from '../ui/search-row';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import {
  buildDiscoveryCandidateActionHref,
  buildDiscoveryCandidateEntityLookupUrl,
  buildDiscoveryCandidateExistingEntityHref,
  resolveDiscoveryCandidateEntityMatch,
  type DiscoveryCandidateEntityMatch,
  resolveDiscoverySearchSubmission,
  type DiscoveryCandidateContext
} from '../../lib/entity-discovery/search-state';

type EntityDiscoverySurfaceProps = {
  presets: EntityDiscoveryGovernancePreset[];
  activities: EntityDiscoveryGovernanceActivity[];
  catalog: EntityCatalogSuggestions;
  candidateContext?: DiscoveryCandidateContext | null;
  initialSearch?: string | null;
  initialSource?: string | null;
  initialPageIndex?: number;
  deleteSuccess?: boolean;
  deletedEntity?: string | null;
};

type EntityDiscoveryTranslator = ReturnType<typeof useI18n>['t'];

export type EntityDiscoveryCandidateLookupStatus = 'idle' | 'loading' | 'settled' | 'error';

export function isEntityDiscoveryCandidateCreateReady(
  candidateContext: DiscoveryCandidateContext | null | undefined,
  candidateEntityLookupStatus: EntityDiscoveryCandidateLookupStatus,
  candidateResolved: boolean
) {
  return candidateContext != null && candidateEntityLookupStatus === 'settled' && !candidateResolved;
}

type EntityDiscoveryTableCopy = {
  title: string;
  resultStatus: string;
  overflowActionLabel?: string;
  previousPageLabel: string;
  nextPageLabel: string;
  pageSummary: string;
  emptyTitle: string;
  columns: {
    clue: string;
    instance: string;
    status: string;
    owner: string;
    system: string;
    environment: string;
    attribution: string;
    action: string;
  };
};

type EntityDiscoveryEmptyAction = {
  id: string;
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

const coldEntityDiscoveryVisual = hzOpsCatalogVisual;

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

type EntityDiscoveryActionHelpCopy = {
  label: string;
  body: string;
  impact?: string;
};

function entityDiscoveryActionHelp(t: EntityDiscoveryTranslator, id: string): EntityDiscoveryActionHelpCopy {
  const impactKey = `entities.discovery.action-help.${id}.impact`;
  const impact = t(impactKey);
  return {
    label: t(`entities.discovery.action-help.${id}.label`),
    body: t(`entities.discovery.action-help.${id}.body`),
    impact: impact === impactKey ? undefined : impact
  };
}

function EntityDiscoveryActionHelp({
  id,
  label,
  body,
  impact
}: EntityDiscoveryActionHelpCopy & {
  id: string;
}) {
  return (
    <span
      data-entity-discovery-action-help={id}
      className="group/help relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
    >
      <button
        type="button"
        aria-label={label}
        data-entity-discovery-action-help-trigger="hertzbeat-ui-action-help"
        data-entity-discovery-action-help-style="icon-after-action"
        data-entity-discovery-action-help-visual="circle-help-icon"
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#b8c7df] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-entity-discovery-action-help-icon="lucide-circle-help" />
      </button>
      <span
        role="tooltip"
        data-entity-discovery-action-help-tooltip={id}
        className="pointer-events-none absolute right-0 top-6 z-30 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{body}</span>
        {impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span> : null}
      </span>
    </span>
  );
}

function EntityDiscoveryActionHelpItem({
  help,
  children
}: {
  help: EntityDiscoveryActionHelpCopy & { id: string };
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1" data-entity-discovery-action-help-item={help.id}>
      {children}
      <EntityDiscoveryActionHelp {...help} />
    </span>
  );
}

function statusClassName(tone: DiscoveryStatusTone) {
  if (tone === 'success') {
    return 'border-[#303743] bg-[#101217] text-[#dbe4f0]';
  }
  if (tone === 'warning') {
    return 'border-[#7c4a03]/50 bg-[#261903] text-[#fbbf24]';
  }
  if (tone === 'critical') {
    return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
  }
  return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
}

function attributionClassName(state: DiscoveryTableRow['attributionState']) {
  if (state === 'merge' || state === 'resolved' || state === 'preset') {
    return 'border-[#303743] bg-[#101217] text-[#dbe4f0]';
  }
  if (state === 'review') {
    return 'border-[#7c4a03]/50 bg-[#261903] text-[#fbbf24]';
  }
  return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
}

function localizeActivitySummary(summary: string | null | undefined, t: EntityDiscoveryTranslator) {
  const normalized = summary?.trim();
  switch (normalized) {
    case 'preset synced':
      return t('entities.discovery.activity.preset-synced');
    case 'shared governance updated':
      return t('entities.discovery.activity.shared-governance-updated');
    default:
      return normalized || t('entities.discovery.activity.empty');
  }
}

export function buildEntityDiscoveryReturnHref(search: string, pageIndex: number, source?: string | null) {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();
  const normalizedSource = source?.trim() ?? '';
  if (normalizedSearch !== '') {
    params.set('search', normalizedSearch);
  }
  if (pageIndex > 0) {
    params.set('pageIndex', String(pageIndex));
  }
  if (normalizedSource !== '') {
    params.set('source', normalizedSource);
  }
  const query = params.toString();
  return query ? `/entities/discovery?${query}` : '/entities/discovery';
}

function EntityDiscoveryTable({
  rows,
  emptyCopy,
  emptyActions,
  emptyStateMode,
  overflowActionHref,
  pagination,
  copy
}: {
  rows: DiscoveryTableRow[];
  emptyCopy: string;
  emptyActions?: EntityDiscoveryEmptyAction[];
  emptyStateMode: 'idle' | 'no-results';
  overflowActionHref?: string | null;
  pagination?: {
    canPrevious: boolean;
    canNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
  } | null;
  copy: EntityDiscoveryTableCopy;
}) {
  return (
    <div
      data-entity-discovery-table-shell="hertzbeat-ui-dense-table"
      className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
    >
      <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-[#252b34] bg-[#101217] px-3 text-[12px] text-[#8f99ab]">
        <span className="font-semibold text-[#dbe4f0]">{copy.title}</span>
        <span className="inline-flex items-center gap-2">
          <span>{copy.resultStatus}</span>
          {overflowActionHref && copy.overflowActionLabel ? (
            <Link
              href={overflowActionHref}
              data-entity-discovery-command-action="open-monitor-center"
              data-entity-discovery-overflow-action="monitor-center"
              className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold normal-case tracking-normal text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white"
            >
              {copy.overflowActionLabel}
            </Link>
          ) : null}
          {pagination ? (
            <span data-entity-discovery-result-pagination="inline" className="inline-flex items-center gap-1">
              <span className="sr-only">{copy.pageSummary}</span>
              <button
                type="button"
                data-entity-discovery-command-action="previous-page"
                data-entity-discovery-result-pagination-previous="true"
                aria-label={copy.previousPageLabel}
                disabled={!pagination.canPrevious}
                onClick={pagination.onPrevious}
                className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white disabled:cursor-not-allowed disabled:border-[#252b34] disabled:text-[#5f6877]"
              >
                {copy.previousPageLabel}
              </button>
              <button
                type="button"
                data-entity-discovery-command-action="next-page"
                data-entity-discovery-result-pagination-next="true"
                aria-label={copy.nextPageLabel}
                disabled={!pagination.canNext}
                onClick={pagination.onNext}
                className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white disabled:cursor-not-allowed disabled:border-[#252b34] disabled:text-[#5f6877]"
              >
                {copy.nextPageLabel}
              </button>
            </span>
          ) : null}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table
          data-entity-discovery-table="hertzbeat-ui-discovery-table"
          data-entity-discovery-table-density={rows.length > 0 ? 'wide-results' : 'empty-state-fit'}
          className={`${rows.length > 0 ? 'min-w-[760px] xl:min-w-[1120px]' : 'min-w-full'} w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]`}
        >
          <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
            <tr>
              <th className="w-[38%] px-3 py-2.5 xl:w-[20%]">{copy.columns.clue}</th>
              <th className="w-[20%] px-3 py-2.5 xl:w-[14%]">{copy.columns.instance}</th>
              <th className="w-[14%] px-3 py-2.5 xl:w-[10%]">{copy.columns.status}</th>
              <th className="w-[18%] px-3 py-2.5 xl:w-[11%]">{copy.columns.owner}</th>
              <th className="hidden w-[12%] px-3 py-2.5 xl:table-cell">{copy.columns.system}</th>
              <th className="hidden w-[9%] px-3 py-2.5 xl:table-cell">{copy.columns.environment}</th>
              <th className="hidden w-[15%] px-3 py-2.5 xl:table-cell">{copy.columns.attribution}</th>
              <th
                data-entity-discovery-action-column="sticky-visible"
                className="sticky right-0 z-10 hidden w-[136px] border-l border-[#252b34] bg-[#101217] px-3 py-2.5 xl:table-cell"
              >
                {copy.columns.action}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map(row => (
                <tr key={row.key} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                  <td className="px-3 py-2.5">
                    <Link
                      href={row.href}
                      data-entity-discovery-command-action="open-result"
                      className="inline-flex max-w-full font-semibold text-[#eef2f7] hover:text-white"
                    >
                      <span className="truncate">{row.name}</span>
                    </Link>
                    <div className="mt-1 truncate text-[11px] text-[#858d9a]">{row.activity}</div>
                    <div data-entity-discovery-row-compact-context="first-column-narrow-viewport" className="mt-2 flex flex-wrap gap-1.5 xl:hidden">
                      <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                        {copy.columns.system} · {row.system}
                      </span>
                      <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                        {copy.columns.environment} · {row.environment}
                      </span>
                      <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${attributionClassName(row.attributionState)}`}>
                        {row.attributionLabel}
                      </span>
                    </div>
                    <div data-entity-discovery-row-compact-actions="first-column-narrow-viewport" className="mt-2 flex flex-wrap gap-1.5 xl:hidden">
                      <Link
                        href={row.href}
                        data-entity-discovery-command-action="open-result"
                        data-entity-discovery-row-compact-action="open-result"
                        className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white"
                      >
                        {row.primaryActionLabel}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[#a9b0bb]">{row.instance}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${statusClassName(row.statusTone)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#dbe4f0]">{row.owner}</td>
                  <td className="hidden px-3 py-2.5 text-[#a9b0bb] xl:table-cell">{row.system}</td>
                  <td className="hidden px-3 py-2.5 text-[#a9b0bb] xl:table-cell">{row.environment}</td>
                  <td className="hidden px-3 py-2.5 xl:table-cell">
                    <div data-entity-discovery-attribution-state={row.attributionState} className="space-y-1">
                      <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${attributionClassName(row.attributionState)}`}>
                        {row.attributionLabel}
                      </span>
                      <div className="truncate text-[11px] text-[#858d9a]">{row.attributionCopy}</div>
                    </div>
                  </td>
                  <td className="sticky right-0 z-10 hidden border-l border-[#252b34] bg-[#0b0c0e] px-3 py-2.5 xl:table-cell">
                    <div data-entity-discovery-row-actions="hertzbeat-ui-inline-actions" className="flex flex-wrap gap-1.5">
                      <Link
                        href={row.href}
                        data-entity-discovery-command-action="open-result"
                        className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white"
                      >
                        {row.primaryActionLabel}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr
                data-entity-discovery-empty-state="hertzbeat-ui-inline-empty"
                data-entity-discovery-empty-state-mode={emptyStateMode}
                className="border-t border-[#252b34] bg-[#0b0c0e]"
              >
                <td colSpan={8} className="h-[220px] px-3 text-center text-[#a9b0bb]">
                  <div role="status" aria-live="polite" className="inline-flex flex-col items-center gap-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
                      <Search className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="text-[13px] font-semibold text-[#eef2f7]">{copy.emptyTitle}</div>
                    <div className="max-w-[520px] text-[12px] leading-5 text-[#8f99ab]">{emptyCopy}</div>
                    {emptyActions?.length ? (
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1" data-entity-discovery-empty-actions="source-entrypoints">
                        {emptyActions.map(action => {
                          const EmptyActionIcon = action.Icon;

                          return (
                            <Link
                              key={action.id}
                              href={action.href}
                              data-entity-discovery-command-action={action.id}
                              data-entity-discovery-empty-action={action.id}
                              className="inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#303743] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white"
                            >
                              <EmptyActionIcon className="h-3.5 w-3.5" aria-hidden={true} />
                              {action.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EntityDiscoverySurface({
  presets,
  activities,
  catalog,
  candidateContext = null,
  initialSearch = null,
  initialSource = null,
  initialPageIndex = 0,
  deleteSuccess = false,
  deletedEntity = null
}: EntityDiscoverySurfaceProps) {
  const { t } = useI18n();
  const candidateSearch = candidateContext?.search ?? '';
  const routeSearch = initialSearch?.trim() ?? '';
  const seededSearch = routeSearch || candidateSearch;
  const [search, setSearch] = useState(seededSearch);
  const [results, setResults] = useState<Monitor[]>([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultPageIndex, setResultPageIndex] = useState(initialPageIndex);
  const [resultPageSize, setResultPageSize] = useState(50);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateEntityMatch, setCandidateEntityMatch] = useState<DiscoveryCandidateEntityMatch | null>(null);
  const [candidateEntityLookupStatus, setCandidateEntityLookupStatus] = useState<EntityDiscoveryCandidateLookupStatus>('idle');
  const initialRouteSearchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (seededSearch !== '') {
      setSearch(seededSearch);
    }
  }, [seededSearch]);

  const lookupCandidateEntity = useCallback(
    async (context: DiscoveryCandidateContext | null | undefined = candidateContext) => {
      if (context == null) {
        return;
      }

    setCandidateEntityMatch(null);
    setCandidateEntityLookupStatus('loading');

      try {
        const result = await apiMessageGet<PageResult<EntitySummaryInfo>>(buildDiscoveryCandidateEntityLookupUrl(context));
        setCandidateEntityMatch(resolveDiscoveryCandidateEntityMatch(context, result.content || []));
        setCandidateEntityLookupStatus('settled');
      } catch {
        setCandidateEntityMatch(null);
        setCandidateEntityLookupStatus('error');
      }
    },
    [candidateContext]
  );

  useEffect(() => {
    if (candidateContext == null) {
      setCandidateEntityMatch(null);
      setCandidateEntityLookupStatus('idle');
      return;
    }

    let active = true;
    setCandidateEntityMatch(null);
    setCandidateEntityLookupStatus('loading');

    void apiMessageGet<PageResult<EntitySummaryInfo>>(buildDiscoveryCandidateEntityLookupUrl(candidateContext))
      .then(result => {
        if (!active) {
          return;
        }
        setCandidateEntityMatch(resolveDiscoveryCandidateEntityMatch(candidateContext, result.content || []));
        setCandidateEntityLookupStatus('settled');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setCandidateEntityMatch(null);
        setCandidateEntityLookupStatus('error');
      });

    return () => {
      active = false;
    };
  }, [candidateContext]);

  const discoveryReturnHref = useMemo(() => {
    return buildEntityDiscoveryReturnHref(search, resultPageIndex, initialSource);
  }, [initialSource, resultPageIndex, search]);
  const rows = useMemo(
    () =>
      searched && results.length > 0
        ? buildDiscoveryTableRows(results, presets, catalog, t, { returnTo: discoveryReturnHref })
        : [],
    [catalog, discoveryReturnHref, presets, results, searched, t]
  );
  const sourceCount = (catalog.systems?.length || 0) + (catalog.environments?.length || 0);
  const latestActivity = localizeActivitySummary(activities[0]?.summary, t);
  const searchLabel = t('entities.discovery.action.search');
  const clearLabel = t('entities.discovery.action.clear');
  const ownerChipLabel = t('entities.discovery.catalog.owner');
  const systemChipLabel = t('entities.discovery.catalog.system');
  const environmentChipLabel = t('entities.discovery.catalog.environment');
  const catalogChips = [
    ...(catalog.owners || []).slice(0, 2).map(owner => ({ label: owner, type: ownerChipLabel })),
    ...(catalog.systems || []).slice(0, 2).map(system => ({ label: system, type: systemChipLabel })),
    ...(catalog.environments || []).slice(0, 1).map(environment => ({ label: environment, type: environmentChipLabel }))
  ];
  const candidateActionHref = candidateContext != null ? buildDiscoveryCandidateActionHref(candidateContext) : null;
  const candidateExistingEntityHref =
    candidateContext != null && candidateEntityMatch != null
      ? buildDiscoveryCandidateExistingEntityHref(candidateContext, candidateEntityMatch)
      : null;
  const candidateResolved = candidateExistingEntityHref != null;
  const candidateChecking = candidateContext != null && !candidateResolved && (candidateEntityLookupStatus === 'idle' || candidateEntityLookupStatus === 'loading');
  const candidateLookupFailed = candidateContext != null && !candidateResolved && candidateEntityLookupStatus === 'error';
  const candidateCreateReady = isEntityDiscoveryCandidateCreateReady(candidateContext, candidateEntityLookupStatus, candidateResolved);
  const matchedCount = rows.filter(
    row => row.attributionState === 'merge' || row.attributionState === 'resolved' || row.attributionState === 'preset'
  ).length;
  const createCount = rows.filter(row => row.attributionState === 'create' || row.attributionState === 'review').length;
  const totalResultCount = searched ? Math.max(resultTotal, rows.length) : 0;
  const candidateClueCount = candidateContext != null ? 1 : 0;
  const displayClueCount = totalResultCount + candidateClueCount;
  const displayMatchedCount = matchedCount + (candidateResolved ? 1 : 0);
  const displayCreateCount = createCount + (candidateCreateReady ? 1 : 0);
  const isResultLimited = totalResultCount > rows.length;
  const totalResultPages = resultPageSize > 0 ? Math.max(1, Math.ceil(totalResultCount / resultPageSize)) : 1;
  const canPreviousResultPage = searched && resultPageIndex > 0 && !loading;
  const canNextResultPage = searched && resultPageIndex + 1 < totalResultPages && !loading;
  const resultFrom = rows.length > 0 ? resultPageIndex * resultPageSize + 1 : 0;
  const resultTo = rows.length > 0 ? resultPageIndex * resultPageSize + rows.length : 0;
  const pageSummary = t('common.pagination.summary', {
    page: resultPageIndex + 1,
    totalPages: totalResultPages,
    from: resultFrom,
    to: resultTo,
    total: totalResultCount
  });
  const resultStatus =
    rows.length === 0
      ? searched
        ? t('entities.discovery.table.result-count', { count: 0 })
        : t('entities.discovery.table.waiting')
      : isResultLimited
        ? t('entities.discovery.table.result-count-limited', { displayed: rows.length, total: totalResultCount })
        : t('entities.discovery.table.result-count', { count: rows.length });
  const overflowMonitorCenterHref = useMemo(() => {
    const normalizedSearch = search.trim();
    if (!isResultLimited || normalizedSearch === '') {
      return null;
    }
    const params = new URLSearchParams({
      search: normalizedSearch,
      pageSize: '50',
      source: initialSource?.trim() || 'entity-discovery-overflow',
      returnTo: discoveryReturnHref
    });
    return `/monitors?${params.toString()}`;
  }, [discoveryReturnHref, initialSource, isResultLimited, search]);
  const tableCopy: EntityDiscoveryTableCopy = {
    title: t('entities.discovery.table.title'),
    resultStatus,
    overflowActionLabel: t('entities.discovery.table.overflow-action.monitor-center'),
    previousPageLabel: t('common.previous-page'),
    nextPageLabel: t('common.next-page'),
    pageSummary,
    emptyTitle: t('entities.discovery.empty.title'),
    columns: {
      clue: t('entities.discovery.table.column.clue'),
      instance: t('entities.discovery.table.column.instance'),
      status: t('entities.discovery.table.column.status'),
      owner: t('entities.discovery.table.column.owner'),
      system: t('entities.discovery.table.column.system'),
      environment: t('entities.discovery.table.column.environment'),
      attribution: t('entities.discovery.table.column.attribution'),
      action: t('entities.discovery.table.column.action')
    }
  };
  const emptyActions: EntityDiscoveryEmptyAction[] = [
    {
      id: 'monitor-center',
      href: '/monitors?source=entity-discovery-empty',
      label: t('entities.discovery.empty.action.monitor-center'),
      Icon: Network
    },
    {
      id: 'otlp-ingestion',
      href: '/ingestion/otlp?source=entity-discovery-empty',
      label: t('entities.discovery.empty.action.otlp-ingestion'),
      Icon: Upload
    }
  ];

  const runSearch = useCallback(
    async (nextSearch: string, nextPageIndex = 0) => {
      const submission = resolveDiscoverySearchSubmission(nextSearch);

      if (submission.mode === 'idle' || submission.normalizedSearch == null) {
        setResults([]);
        setResultTotal(0);
        setResultPageIndex(0);
        setError(null);
        setSearched(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSearched(true);

      try {
        const searchResult: DiscoveryMonitorSearchResult = await searchDiscoveryMonitors(apiMessageGet, submission.normalizedSearch, nextPageIndex);
        setResults(searchResult.monitors);
        setResultTotal(searchResult.totalElements);
        setResultPageIndex(searchResult.pageIndex);
        setResultPageSize(searchResult.pageSize);
      } catch (nextError) {
        setResults([]);
        setResultTotal(0);
        setResultPageIndex(0);
        setError(nextError instanceof Error ? nextError.message : t('entities.discovery.search.error'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (routeSearch === '') {
      initialRouteSearchKeyRef.current = null;
      return;
    }

    const routeSearchKey = JSON.stringify([routeSearch, initialPageIndex]);
    if (initialRouteSearchKeyRef.current === routeSearchKey) {
      return;
    }
    initialRouteSearchKeyRef.current = routeSearchKey;

    void runSearch(routeSearch, initialPageIndex);
  }, [initialPageIndex, routeSearch, runSearch]);

  function clearSearch() {
    setSearch('');
    setResults([]);
    setResultTotal(0);
    setResultPageIndex(0);
    setError(null);
    setSearched(false);
  }

  return (
    <main
      data-entity-discovery-surface="otlp-hertzbeat-ui-discovery-console"
      data-entity-discovery-style-baseline={coldEntityDiscoveryVisual.canvasName}
      data-entity-discovery-layout="full-width-workbench"
      className={coldEntityDiscoveryVisual.canvas.root}
      style={coldEntityDiscoveryVisual.canvas.backgroundStyle}
    >
      <section className={coldEntityDiscoveryVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div
              data-entity-discovery-header="hertzbeat-ui-compact-header"
              data-entity-discovery-header-nesting-contract="flat-page-introduction"
              className="p-0"
            >
              <div className="max-w-[880px]">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('entities.discovery.workspace.kicker')}</div>
                <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{t('entities.discovery.workspace.title')}</h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  {t('entities.discovery.workspace.subtitle')}
                </p>
                <div data-entity-discovery-command-row="standard-equal-buttons" className={coldEntityDiscoveryVisual.button.row}>
                  <EntityDiscoveryActionHelpItem help={{ id: 'import', ...entityDiscoveryActionHelp(t, 'import') }}>
                    <Link href="/entities/import" data-entity-discovery-command-action="import" className={coldPrimaryLinkClassName}>
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('entities.discovery.action.import')}
                    </Link>
                  </EntityDiscoveryActionHelpItem>
                  <EntityDiscoveryActionHelpItem help={{ id: 'create', ...entityDiscoveryActionHelp(t, 'create') }}>
                    <Link href="/entities/new" data-entity-discovery-command-action="create" className={coldLinkButtonClassName}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('entities.discovery.action.create')}
                    </Link>
                  </EntityDiscoveryActionHelpItem>
                  <EntityDiscoveryActionHelpItem help={{ id: 'catalog', ...entityDiscoveryActionHelp(t, 'catalog') }}>
                    <Link href="/entities" data-entity-discovery-command-action="catalog" className={coldLinkButtonClassName}>
                      <Network className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('entities.discovery.action.catalog')}
                    </Link>
                  </EntityDiscoveryActionHelpItem>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div data-entity-discovery-count-strip="hertzbeat-ui-inline-counts" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: t('entities.discovery.metric.clues'), value: displayClueCount, Icon: Search },
                { label: t('entities.discovery.metric.matched'), value: displayMatchedCount, Icon: Users },
                { label: t('entities.discovery.metric.create-suggested'), value: displayCreateCount, Icon: Plus },
                { label: t('entities.discovery.metric.catalog-sources'), value: sourceCount, Icon: Database }
              ].map(({ label, value, Icon: MetricIcon }) => {
                return (
                  <div
                    key={String(label)}
                    className="flex min-h-[36px] items-center justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-3 text-[12px] text-[#a9b0bb]"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <MetricIcon className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="text-[17px] font-semibold tabular-nums text-[#eef2f7]">{value}</span>
                  </div>
                );
              })}
            </div>

            <section className="min-w-0 space-y-3">
              {deleteSuccess ? (
                <HzInlineFeedback
                  tone="success"
                  title={t('common.notify.delete-success')}
                  description={t('entities.discovery.delete-success.description', {
                    id: deletedEntity?.trim() || t('common.none')
                  })}
                  variant="embedded"
                  data-entity-discovery-delete-success="entity-delete-confirmed"
                  data-entity-discovery-delete-success-owner="hertzbeat-ui-inline-feedback"
                  data-entity-discovery-delete-success-id={deletedEntity?.trim() || ''}
                />
              ) : null}

              <SearchRow
                data-entity-discovery-toolbar="hertzbeat-ui-search-row"
                data-entity-discovery-search-owner="shared-search-row"
                value={search}
                placeholder={t('entities.discovery.search.placeholder')}
                searchLabel={loading ? t('common.loading') : searchLabel}
                clearLabel={clearLabel}
                inputWidthClassName="w-[360px]"
                searchDisabled={loading}
                showClearWhenEmpty
                onValueChange={setSearch}
                onSearch={() => void runSearch(search, 0)}
                onClear={clearSearch}
              />

              {candidateContext != null && candidateActionHref != null ? (
                <div
                  data-entity-discovery-otlp-candidate="query-context"
                  data-entity-discovery-candidate-resolution={candidateResolved ? 'matched-entity' : candidateEntityLookupStatus}
                  data-entity-discovery-candidate-identity-key={candidateContext.identityKey}
                  data-entity-discovery-candidate-identity-value={candidateContext.identityValue}
                  data-entity-discovery-candidate-service={candidateContext.serviceName}
                  data-entity-discovery-candidate-namespace={candidateContext.serviceNamespace}
                  data-entity-discovery-candidate-environment={candidateContext.environment}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-2.5 text-[12px] text-[#a9b0bb]"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#eef2f7]">
                      {candidateResolved
                        ? t('entities.discovery.candidate.resolved.title')
                        : candidateChecking
                          ? t('entities.discovery.candidate.checking.title')
                          : candidateLookupFailed
                            ? t('entities.discovery.candidate.lookup-failed.title')
                            : t('entities.discovery.candidate.title')}
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">
                      {candidateResolved
                        ? t('entities.discovery.candidate.resolved.copy', { entity: candidateEntityMatch?.entityName })
                        : candidateChecking
                          ? t('entities.discovery.candidate.checking.copy')
                          : candidateLookupFailed
                            ? t('entities.discovery.candidate.lookup-failed.copy')
                        : t('entities.discovery.candidate.copy')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#cbd5e1]">
                      <span className="rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-1">
                        {t('entities.discovery.candidate.identity')} · {candidateContext.identityKey} = {candidateContext.identityValue}
                      </span>
                      {candidateContext.serviceNamespace != null ? (
                        <span className="rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-1">
                          {t('entities.discovery.candidate.namespace')} · {candidateContext.serviceNamespace}
                        </span>
                      ) : null}
                      {candidateContext.environment != null ? (
                        <span className="rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-1">
                          {t('entities.discovery.candidate.environment')} · {candidateContext.environment}
                        </span>
                      ) : null}
                      {candidateResolved ? (
                        <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[#dbe4f0]">
                          {t('entities.discovery.candidate.resolved.entity')} · {candidateEntityMatch?.entityName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {candidateResolved ? (
                    <EntityDiscoveryActionHelpItem
                      help={{
                        id: 'candidate-open',
                        ...entityDiscoveryActionHelp(t, 'candidate-open')
                      }}
                    >
                      <Link
                        href={candidateExistingEntityHref ?? candidateActionHref}
                        data-entity-discovery-command-action="candidate-open"
                        data-entity-discovery-candidate-action="open-entity"
                        className={coldPrimaryLinkClassName}
                      >
                        <Database className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('entities.discovery.candidate.action.open')}
                      </Link>
                    </EntityDiscoveryActionHelpItem>
                  ) : candidateChecking ? (
                    <button
                      type="button"
                      disabled
                      data-entity-discovery-command-action="candidate-checking"
                      data-entity-discovery-candidate-action="checking-existing"
                      className={`${coldPrimaryLinkClassName} cursor-not-allowed opacity-70`}
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('entities.discovery.candidate.action.checking')}
                    </button>
                  ) : candidateLookupFailed ? (
                    <button
                      type="button"
                      data-entity-discovery-command-action="candidate-retry"
                      data-entity-discovery-candidate-action="retry-lookup"
                      className={coldPrimaryLinkClassName}
                      onClick={() => void lookupCandidateEntity(candidateContext)}
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.button.retry')}
                    </button>
                  ) : (
                    <EntityDiscoveryActionHelpItem
                      help={{
                        id: 'candidate-create',
                        ...entityDiscoveryActionHelp(t, 'candidate-create')
                      }}
                    >
                      <Link
                        href={candidateActionHref}
                        data-entity-discovery-command-action="candidate-create"
                        data-entity-discovery-candidate-action="create-draft"
                        className={coldPrimaryLinkClassName}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('entities.discovery.candidate.action.create')}
                      </Link>
                    </EntityDiscoveryActionHelpItem>
                  )}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[3px] border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-[12px] text-rose-100">{error}</div>
              ) : null}

              <div data-entity-discovery-policy-panel="hertzbeat-ui-policy-strip" className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[#eef2f7]">{t('entities.discovery.policy.title')}</div>
                    <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{t('entities.discovery.policy.copy')}</p>
                  </div>
                  <div className="text-[11px] text-[#858d9a]">{t('entities.discovery.policy.latest-activity', { activity: latestActivity })}</div>
                </div>
                <div data-entity-discovery-source-chips="hertzbeat-ui-inline-chips" className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#cbd5e1]">
                  {catalogChips.length > 0 ? (
                    catalogChips.map(chip => (
                      <span key={`${chip.type}-${chip.label}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1">
                        {chip.type} · {chip.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#858d9a]">{t('entities.discovery.policy.empty')}</span>
                  )}
                </div>
              </div>

              <EntityDiscoveryTable
                rows={rows}
                copy={tableCopy}
                emptyStateMode={searched ? 'no-results' : 'idle'}
                overflowActionHref={overflowMonitorCenterHref}
                pagination={
                  searched && totalResultPages > 1
                    ? {
                        canPrevious: canPreviousResultPage,
                        canNext: canNextResultPage,
                        onPrevious: () => void runSearch(search, Math.max(0, resultPageIndex - 1)),
                        onNext: () => void runSearch(search, resultPageIndex + 1)
                      }
                    : null
                }
                emptyCopy={
                  searched
                    ? t('entities.discovery.empty.search.copy')
                    : t('entities.discovery.empty.idle.copy')
                }
                emptyActions={emptyActions}
              />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
