'use client';

import React from 'react';
import { Cloud, Inbox, Power, PowerOff, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '../ui/button';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { buildCollectorClusterHealthEvidence, buildCollectorTableRows } from '../../lib/collector-manage/view-model';
import type { CollectorSummary, PageResult } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type CollectorManageSurfaceProps = {
  t: Translator;
  data: { list: PageResult<CollectorSummary> };
  search: string;
  formatTime: (value?: number | string | null) => string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onDeploy: () => void;
  onGoOnline: () => void;
  onGoOffline: () => void;
  onDelete: () => void;
  onRowGoOnline: (collector: string) => void;
  onRowGoOffline: (collector: string) => void;
  onRowDelete: (collector: string) => void;
};

const coldCollectorVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white disabled:opacity-40';

function statusClassName(statusLabel: string) {
  if (statusLabel.includes('在线') || statusLabel.toLowerCase().includes('online')) {
    return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
  }
  return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
}

function EmptyTableRow({ colSpan }: { colSpan: number }) {
  return (
    <tr data-collector-empty-state="cold-table-empty" className="bg-[#0b0c0e]">
      <td colSpan={colSpan} className="h-[240px] px-3 py-10 text-center text-[#858d9a]">
        <div className="inline-flex flex-col items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-[13px] font-semibold text-[#dbe4f0]">暂无数据</div>
        </div>
      </td>
    </tr>
  );
}

export function CollectorManageSurface({
  t,
  data,
  search,
  formatTime,
  onSearchChange,
  onSearch,
  onRefresh,
  onDeploy,
  onGoOnline,
  onGoOffline,
  onDelete,
  onRowGoOnline,
  onRowGoOffline,
  onRowDelete
}: CollectorManageSurfaceProps) {
  const collectors = data.list.content ?? [];
  const rows = buildCollectorTableRows(collectors, t, formatTime);
  const clusterHealth = buildCollectorClusterHealthEvidence(collectors, formatTime);

  return (
    <div
      data-collector-manage-surface="otlp-cold-collector-console"
      data-collector-manage-style-baseline={coldCollectorVisual.canvasName}
      className={coldCollectorVisual.canvas.root}
      style={coldCollectorVisual.canvas.backgroundStyle}
    >
      <section className={coldCollectorVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div data-collector-header="cold-compact-header" className={coldCollectorVisual.panel.hero}>
              <div className="max-w-[840px]">
                <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                  {t('menu.advanced.collector')}
                </h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  管理已注册采集器节点、运行状态和任务分布，保持部署、搜索、上下线和删除操作在同一个高密度后台工作面中完成。
                </p>
                <div data-collector-command-row="standard-equal-buttons" className={coldCollectorVisual.button.row}>
                  <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('common.refresh')}
                  </Button>
                  <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onDeploy}>
                    <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('collector.deploy')}
                  </Button>
                  <Button size="sm" variant="default" className={coldButtonClassName} onClick={onGoOnline}>
                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('collector.online')}
                  </Button>
                  <Button size="sm" variant="default" className={coldButtonClassName} onClick={onGoOffline}>
                    <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('collector.offline')}
                  </Button>
                  <Button size="sm" variant="default" className={coldButtonClassName} onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('collector.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div
            data-collector-health-evidence="cluster-status"
            data-collector-health-tone={clusterHealth.tone}
            className="mb-5 grid gap-3 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.28)] md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="text-[12px] font-semibold tracking-[0.12em] text-[#7e8494]">{clusterHealth.title}</div>
              <div className="mt-1 text-[14px] font-semibold text-[#eef2f7]">{clusterHealth.copy}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="inline-flex items-center justify-center rounded-[3px] border border-[#303743] bg-[#101217] px-2.5 py-1 text-[11px] font-semibold text-[#cbd5e1]">
                {clusterHealth.meta}
              </span>
              <span
                data-collector-health-freshness="last-seen"
                className="inline-flex items-center justify-center rounded-[3px] border border-[#303743] bg-[#101217] px-2.5 py-1 text-[11px] font-semibold text-[#9aa3b2]"
              >
                {clusterHealth.freshness}
              </span>
            </div>
          </div>

          <div data-collector-admin-layout="full-width-admin-list" className="space-y-5">
            <section className="min-w-0">
              <SearchRow
                data-collector-toolbar="cold-table-toolbar"
                data-collector-search-owner="shared-search-row"
                value={search}
                placeholder={t('collector.name')}
                searchLabel={t('common.search')}
                inputWidthClassName="w-[360px]"
                onValueChange={onSearchChange}
                onSearch={onSearch}
              />

              <div
                data-collector-table-shell="cold-dense-table"
                className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <table data-collector-manage-table="cold-collector-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                  <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                    <tr>
                      <th className="w-[18%] px-3 py-2.5">{t('collector.name')}</th>
                      <th className="w-[11%] px-3 py-2.5">{t('collector.status')}</th>
                      <th className="w-[14%] px-3 py-2.5">{t('collector.mode')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.task')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.pinned')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.dispatched')}</th>
                      <th className="w-[12%] px-3 py-2.5">{t('collector.ip')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.version')}</th>
                      <th className="w-[13%] px-3 py-2.5">{t('collector.start-time')}</th>
                      <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? rows.map(row => (
                      <tr key={row.key} data-collector-row={row.key} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                        <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">
                          <div className="min-w-0">
                            <span className="inline-flex max-w-full items-center gap-1.5">
                            <Cloud className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                            <span className="truncate">{row.name}</span>
                            </span>
                            <div
                              data-collector-row-health="collector-status"
                              data-collector-row-health-tone={row.healthEvidence.tone}
                              className="mt-1 truncate text-[11px] font-medium text-[#858d9a]"
                            >
                              {row.healthEvidence.copy}
                            </div>
                            <div data-collector-row-freshness="last-seen" className="mt-0.5 truncate text-[11px] font-medium text-[#6f7788]">
                              {row.healthEvidence.freshness}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${statusClassName(row.statusLabel)}`}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                            {row.modeLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{row.taskCount}</td>
                        <td className="px-3 py-2.5 tabular-nums">{row.pinCount}</td>
                        <td className="px-3 py-2.5 tabular-nums">{row.dispatchCount}</td>
                        <td className="truncate px-3 py-2.5" title={row.ip}>{row.ip}</td>
                        <td className="truncate px-3 py-2.5" title={row.version}>{row.version}</td>
                        <td className="px-3 py-2.5 text-[#858d9a]">{row.updatedAt}</td>
                        <td className="px-3 py-2.5">
                          <div data-collector-row-actions="cold-icon-actions" className="flex gap-1.5">
                            {row.nextAction === 'online' ? (
                              <Button
                                size="icon"
                                variant="default"
                                className={coldIconButtonClassName}
                                title={t('collector.online')}
                                onClick={() => onRowGoOnline(row.name)}
                                disabled={!row.canMutate}
                              >
                                <Power className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">{t('collector.online')}</span>
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="default"
                                className={coldIconButtonClassName}
                                title={t('collector.offline')}
                                onClick={() => onRowGoOffline(row.name)}
                                disabled={!row.canMutate}
                              >
                                <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">{t('collector.offline')}</span>
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="default"
                              className={coldIconButtonClassName}
                              title={t('collector.delete')}
                              onClick={() => onRowDelete(row.name)}
                              disabled={!row.canMutate}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">{t('collector.delete')}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )) : <EmptyTableRow colSpan={10} />}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
