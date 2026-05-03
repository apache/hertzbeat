'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Database, Network, Plus, Search, Upload, Users } from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { searchDiscoveryMonitors } from '@/lib/entity-discovery/controller';
import { buildDiscoveryTableRows } from '@/lib/entity-discovery/view-model';
import type { DiscoveryTableRow } from '@/lib/entity-discovery/view-model';
import type { EntityCatalogSuggestions, EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset, Monitor } from '@/lib/types';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { resolveDiscoverySearchSubmission } from '../../lib/entity-discovery/search-state';

type EntityDiscoverySurfaceProps = {
  presets: EntityDiscoveryGovernancePreset[];
  activities: EntityDiscoveryGovernanceActivity[];
  catalog: EntityCatalogSuggestions;
};

const coldEntityDiscoveryVisual = coldOpsCatalogVisual;

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

function statusClassName(status: string) {
  if (status === '正常' || status === '已启用' || status === '成功') {
    return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
  }
  if (status === '待确认' || status === '待处理') {
    return 'border-[#7c4a03]/50 bg-[#261903] text-[#fbbf24]';
  }
  if (status === '异常') {
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

function localizeActivitySummary(summary?: string | null) {
  const normalized = summary?.trim();
  switch (normalized) {
    case 'preset synced':
      return '预设已同步';
    case 'shared governance updated':
      return '共享治理已更新';
    default:
      return normalized || '暂无活动';
  }
}

function EntityDiscoveryTable({ rows, emptyCopy }: { rows: DiscoveryTableRow[]; emptyCopy: string }) {
  return (
    <div
      data-entity-discovery-table-shell="cold-dense-table"
      className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
    >
      <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-[#252b34] bg-[#101217] px-3 text-[12px] text-[#8f99ab]">
        <span className="font-semibold text-[#dbe4f0]">发现线索</span>
        <span>{rows.length > 0 ? `${rows.length} 条结果` : '等待搜索'}</span>
      </div>
      <div className="overflow-x-auto">
        <table data-entity-discovery-table="cold-discovery-table" className="min-w-[1120px] w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
          <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
            <tr>
              <th className="w-[20%] px-3 py-2.5">线索</th>
              <th className="w-[14%] px-3 py-2.5">实例</th>
              <th className="w-[10%] px-3 py-2.5">状态</th>
              <th className="w-[11%] px-3 py-2.5">归属</th>
              <th className="w-[12%] px-3 py-2.5">系统</th>
              <th className="w-[9%] px-3 py-2.5">环境</th>
              <th className="w-[15%] px-3 py-2.5">归因</th>
              <th className="w-[136px] px-3 py-2.5">操作</th>
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
                    <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${statusClassName(row.status)}`}>
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
                    <div data-entity-discovery-row-actions="cold-inline-actions" className="flex flex-wrap gap-1.5">
                      <Link href={row.href} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white">
                        {row.primaryActionLabel}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr data-entity-discovery-empty-state="cold-inline-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                <td colSpan={8} className="h-[220px] px-3 text-center text-[#a9b0bb]">
                  <div className="inline-flex flex-col items-center gap-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
                      <Search className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="text-[13px] font-semibold text-[#eef2f7]">先搜索一组需要治理的监控线索</div>
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

export function EntityDiscoverySurface({ presets, activities, catalog }: EntityDiscoverySurfaceProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Monitor[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function tr(key: string, fallback: string) {
    const translated = t(key);
    return translated === key ? fallback : translated;
  }

  const rows = useMemo(
    () => (searched && results.length > 0 ? buildDiscoveryTableRows(results, presets, catalog) : []),
    [catalog, presets, results, searched]
  );
  const sourceCount = (catalog.systems?.length || 0) + (catalog.environments?.length || 0);
  const latestActivity = localizeActivitySummary(activities[0]?.summary);
  const searchLabel = tr('entities.discovery.action.search', '搜索');
  const clearLabel = tr('entities.discovery.action.clear', '清空');
  const catalogChips = [
    ...(catalog.owners || []).slice(0, 2).map(owner => ({ label: owner, type: '负责人' })),
    ...(catalog.systems || []).slice(0, 2).map(system => ({ label: system, type: '系统' })),
    ...(catalog.environments || []).slice(0, 1).map(environment => ({ label: environment, type: '环境' }))
  ];
  const matchedCount = rows.filter(row => row.owner !== '-').length;
  const createCount = rows.filter(row => row.owner === '-').length;

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
      setError(nextError instanceof Error ? nextError.message : tr('entities.discovery.search.error', '遥测发现查询失败'));
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
      data-entity-discovery-surface="otlp-cold-discovery-console"
      data-entity-discovery-style-baseline={coldEntityDiscoveryVisual.canvasName}
      data-entity-discovery-layout="full-width-workbench"
      className={coldEntityDiscoveryVisual.canvas.root}
      style={coldEntityDiscoveryVisual.canvas.backgroundStyle}
    >
      <section className={coldEntityDiscoveryVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div data-entity-discovery-header="cold-compact-header" className={coldEntityDiscoveryVisual.panel.hero}>
              <div className="max-w-[880px]">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">对象优先调查</div>
                <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">遥测发现</h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  先搜索一组需要治理的监控线索，再决定归并、完善归属，还是送入定义工作台继续收口。
                </p>
                <div data-entity-discovery-command-row="standard-equal-buttons" className={coldEntityDiscoveryVisual.button.row}>
                  <Link href="/entities/import" className={coldPrimaryLinkClassName}>
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    从定义创建
                  </Link>
                  <Link href="/entities/new" className={coldLinkButtonClassName}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    创建实体
                  </Link>
                  <Link href="/entities" className={coldLinkButtonClassName}>
                    <Network className="h-3.5 w-3.5" aria-hidden="true" />
                    对象目录
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div data-entity-discovery-count-strip="cold-inline-counts" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['线索', rows.length, Search],
                ['已匹配', matchedCount, Users],
                ['建议新建', createCount, Plus],
                ['目录来源', sourceCount, Database]
              ].map(([label, value, Icon]) => {
                const MetricIcon = Icon as typeof Search;
                return (
                  <div
                    key={String(label)}
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

            <section className="min-w-0 space-y-3">
              <SearchRow
                data-entity-discovery-toolbar="cold-search-row"
                data-entity-discovery-search-owner="shared-search-row"
                value={search}
                placeholder="搜索监控名称或实例"
                searchLabel={loading ? tr('common.loading', '加载中...') : searchLabel}
                clearLabel={clearLabel}
                inputWidthClassName="w-[360px]"
                searchDisabled={loading}
                showClearWhenEmpty
                onValueChange={setSearch}
                onSearch={() => void runSearch()}
                onClear={clearSearch}
              />

              {error ? (
                <div className="rounded-[3px] border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-[12px] text-rose-100">{error}</div>
              ) : null}

              <div data-entity-discovery-policy-panel="cold-policy-strip" className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-[#eef2f7]">治理筛选与共享策略</div>
                    <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">按已有负责人、系统和环境预设给线索完善上下文。</p>
                  </div>
                  <div className="text-[11px] text-[#858d9a]">最近活动 {latestActivity}</div>
                </div>
                <div data-entity-discovery-source-chips="cold-inline-chips" className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#cbd5e1]">
                  {catalogChips.length > 0 ? (
                    catalogChips.map(chip => (
                      <span key={`${chip.type}-${chip.label}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1">
                        {chip.type} · {chip.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#858d9a]">暂无共享策略，先搜索一条监控线索。</span>
                  )}
                </div>
              </div>

              <EntityDiscoveryTable
                rows={rows}
                emptyCopy={
                  searched
                    ? tr('entities.discovery.empty.search.copy', '没有找到匹配的监控线索。')
                    : tr('entities.discovery.empty.idle.copy', '先搜索一条监控，再把它转成实体草稿。')
                }
              />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
