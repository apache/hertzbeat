'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Database, Network, Plus, Search, Upload, Users } from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { searchDiscoveryMonitors } from '@/lib/entity-discovery/controller';
import { buildDiscoveryTableRows } from '@/lib/entity-discovery/view-model';
import type { DiscoveryStatusTone, DiscoveryTableRow } from '@/lib/entity-discovery/view-model';
import type { EntityCatalogSuggestions, EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset, Monitor } from '@/lib/types';
import { SearchRow } from '../ui/search-row';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import {
  buildDiscoveryCandidateActionHref,
  resolveDiscoverySearchSubmission,
  type DiscoveryCandidateContext
} from '../../lib/entity-discovery/search-state';

type EntityDiscoverySurfaceProps = {
  presets: EntityDiscoveryGovernancePreset[];
  activities: EntityDiscoveryGovernanceActivity[];
  catalog: EntityCatalogSuggestions;
  candidateContext?: DiscoveryCandidateContext | null;
};

type EntityDiscoveryTranslator = ReturnType<typeof useI18n>['t'];

type EntityDiscoveryTableCopy = {
  title: string;
  resultStatus: string;
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

const coldEntityDiscoveryVisual = hzOpsCatalogVisual;

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

function statusClassName(tone: DiscoveryStatusTone) {
  if (tone === 'success') {
    return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
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
    return 'border-[#1f5137] bg-[#0f2f23] text-[#86efac]';
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

function EntityDiscoveryTable({ rows, emptyCopy, copy }: { rows: DiscoveryTableRow[]; emptyCopy: string; copy: EntityDiscoveryTableCopy }) {
  return (
    <div
      data-entity-discovery-table-shell="hertzbeat-ui-dense-table"
      className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
    >
      <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-[#252b34] bg-[#101217] px-3 text-[12px] text-[#8f99ab]">
        <span className="font-semibold text-[#dbe4f0]">{copy.title}</span>
        <span>{copy.resultStatus}</span>
      </div>
      <div className="overflow-x-auto">
        <table data-entity-discovery-table="hertzbeat-ui-discovery-table" className="min-w-[1120px] w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
          <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
            <tr>
              <th className="w-[20%] px-3 py-2.5">{copy.columns.clue}</th>
              <th className="w-[14%] px-3 py-2.5">{copy.columns.instance}</th>
              <th className="w-[10%] px-3 py-2.5">{copy.columns.status}</th>
              <th className="w-[11%] px-3 py-2.5">{copy.columns.owner}</th>
              <th className="w-[12%] px-3 py-2.5">{copy.columns.system}</th>
              <th className="w-[9%] px-3 py-2.5">{copy.columns.environment}</th>
              <th className="w-[15%] px-3 py-2.5">{copy.columns.attribution}</th>
              <th className="w-[136px] px-3 py-2.5">{copy.columns.action}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map(row => (
                <tr key={row.key} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                  <td className="px-3 py-2.5">
                    <Link href={row.href} className="inline-flex max-w-full font-semibold text-[#eef2f7] hover:text-white">
                      <span className="truncate">{row.name}</span>
                    </Link>
                    <div className="mt-1 truncate text-[11px] text-[#858d9a]">{row.activity}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[#a9b0bb]">{row.instance}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${statusClassName(row.statusTone)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#dbe4f0]">{row.owner}</td>
                  <td className="px-3 py-2.5 text-[#a9b0bb]">{row.system}</td>
                  <td className="px-3 py-2.5 text-[#a9b0bb]">{row.environment}</td>
                  <td className="px-3 py-2.5">
                    <div data-entity-discovery-attribution-state={row.attributionState} className="space-y-1">
                      <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${attributionClassName(row.attributionState)}`}>
                        {row.attributionLabel}
                      </span>
                      <div className="truncate text-[11px] text-[#858d9a]">{row.attributionCopy}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div data-entity-discovery-row-actions="hertzbeat-ui-inline-actions" className="flex flex-wrap gap-1.5">
                      <Link href={row.href} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white">
                        {row.primaryActionLabel}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr data-entity-discovery-empty-state="hertzbeat-ui-inline-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                <td colSpan={8} className="h-[220px] px-3 text-center text-[#a9b0bb]">
                  <div className="inline-flex flex-col items-center gap-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
                      <Search className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="text-[13px] font-semibold text-[#eef2f7]">{copy.emptyTitle}</div>
                    <div className="text-[12px] leading-5 text-[#8f99ab]">{emptyCopy}</div>
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

export function EntityDiscoverySurface({ presets, activities, catalog, candidateContext = null }: EntityDiscoverySurfaceProps) {
  const { t } = useI18n();
  const candidateSearch = candidateContext?.search ?? '';
  const [search, setSearch] = useState(candidateSearch);
  const [results, setResults] = useState<Monitor[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (candidateSearch !== '') {
      setSearch(candidateSearch);
    }
  }, [candidateSearch]);

  const rows = useMemo(
    () => (searched && results.length > 0 ? buildDiscoveryTableRows(results, presets, catalog, t) : []),
    [catalog, presets, results, searched, t]
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
  const matchedCount = rows.filter(
    row => row.attributionState === 'merge' || row.attributionState === 'resolved' || row.attributionState === 'preset'
  ).length;
  const createCount = rows.filter(row => row.attributionState === 'create' || row.attributionState === 'review').length;
  const candidateActionHref = candidateContext != null ? buildDiscoveryCandidateActionHref(candidateContext) : null;
  const tableCopy: EntityDiscoveryTableCopy = {
    title: t('entities.discovery.table.title'),
    resultStatus: rows.length > 0 ? t('entities.discovery.table.result-count', { count: rows.length }) : t('entities.discovery.table.waiting'),
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

  async function runSearch() {
    const submission = resolveDiscoverySearchSubmission(search);

    if (submission.mode === 'idle' || submission.normalizedSearch == null) {
      setResults([]);
      setError(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      setResults(await searchDiscoveryMonitors(apiMessageGet, submission.normalizedSearch));
    } catch (nextError) {
      setResults([]);
      setError(nextError instanceof Error ? nextError.message : t('entities.discovery.search.error'));
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setSearch('');
    setResults([]);
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
            <div data-entity-discovery-header="hertzbeat-ui-compact-header" className={coldEntityDiscoveryVisual.panel.hero}>
              <div className="max-w-[880px]">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('entities.discovery.workspace.kicker')}</div>
                <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{t('entities.discovery.workspace.title')}</h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  {t('entities.discovery.workspace.subtitle')}
                </p>
                <div data-entity-discovery-command-row="standard-equal-buttons" className={coldEntityDiscoveryVisual.button.row}>
                  <Link href="/entities/import" className={coldPrimaryLinkClassName}>
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('entities.discovery.action.import')}
                  </Link>
                  <Link href="/entities/new" className={coldLinkButtonClassName}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('entities.discovery.action.create')}
                  </Link>
                  <Link href="/entities" className={coldLinkButtonClassName}>
                    <Network className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('entities.discovery.action.catalog')}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div data-entity-discovery-count-strip="hertzbeat-ui-inline-counts" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: t('entities.discovery.metric.clues'), value: rows.length, Icon: Search },
                { label: t('entities.discovery.metric.matched'), value: matchedCount, Icon: Users },
                { label: t('entities.discovery.metric.create-suggested'), value: createCount, Icon: Plus },
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
                onSearch={() => void runSearch()}
                onClear={clearSearch}
              />

              {candidateContext != null && candidateActionHref != null ? (
                <div
                  data-entity-discovery-otlp-candidate="query-context"
                  data-entity-discovery-candidate-identity-key={candidateContext.identityKey}
                  data-entity-discovery-candidate-identity-value={candidateContext.identityValue}
                  data-entity-discovery-candidate-service={candidateContext.serviceName}
                  data-entity-discovery-candidate-namespace={candidateContext.serviceNamespace}
                  data-entity-discovery-candidate-environment={candidateContext.environment}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-2.5 text-[12px] text-[#a9b0bb]"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#eef2f7]">{t('entities.discovery.candidate.title')}</div>
                    <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{t('entities.discovery.candidate.copy')}</p>
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
                    </div>
                  </div>
                  <Link
                    href={candidateActionHref}
                    data-entity-discovery-candidate-action="create-draft"
                    className={coldPrimaryLinkClassName}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('entities.discovery.candidate.action.create')}
                  </Link>
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
                emptyCopy={
                  searched
                    ? t('entities.discovery.empty.search.copy')
                    : t('entities.discovery.empty.idle.copy')
                }
              />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
