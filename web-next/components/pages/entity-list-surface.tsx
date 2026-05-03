'use client';

import Link from 'next/link';
import React from 'react';
import { Bell, GitBranch, Inbox, Network, Plus, RefreshCw, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import type { EntityQueryState } from '../../lib/entity-manage/query-state';
import type { LightweightEntityHealthAffordance } from '../../lib/entity-health-affordance';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type EntityListTableRow = {
  key: string;
  name: string;
  type: string;
  environment: string;
  status: string;
  health?: LightweightEntityHealthAffordance;
  monitorCount: string;
  activeAlertCount: string;
  relationCount: string;
  updatedAt: string;
  href: string;
};

type EntityListSurfaceProps = {
  t: Translator;
  rows: EntityListTableRow[];
  draft: EntityQueryState;
  total: number;
  rangeFrom: number;
  rangeTo: number;
  abnormalCount: number;
  alertingCount: number;
  linkedCount: number;
  onDraftChange: (patch: Partial<EntityQueryState>) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onReset: () => void;
};

const coldEntityVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldSmallButtonClassName =
  'h-7 min-w-[64px] rounded-[3px] border-[#2b3039] bg-[#101217] px-2.5 text-[12px] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldEvidenceBadgeClassName =
  'rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]';

function statusClassName(status: string) {
  if (status === 'healthy' || status === '健康' || status.includes('正常')) {
    return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
  }
  if (status.includes('告警') || status.includes('异常') || status.toLowerCase().includes('critical')) {
    return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
  }
  return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
}

function resolveCopy(t: Translator, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

function EmptyTableRow({ t }: { t: Translator }) {
  return (
    <tr data-entity-list-empty-state="cold-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
      <td colSpan={6} className="h-[240px] px-3 text-center text-[#a9b0bb]">
        <div className="inline-flex flex-col items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-[13px] font-semibold text-[#eef2f7]">
            {resolveCopy(t, 'entities.list.empty.title', '暂无实体')}
          </div>
          <div className="text-[12px] leading-5 text-[#8f99ab]">
            {resolveCopy(t, 'entities.list.empty.copy', '创建实体或导入定义后会出现在这里。')}
          </div>
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
  abnormalCount,
  alertingCount,
  linkedCount,
  onDraftChange,
  onSearch,
  onRefresh,
  onReset
}: EntityListSurfaceProps) {
  const title = resolveCopy(t, 'entities.list.title', '对象目录');

  return (
    <main
      data-entity-list-surface="otlp-cold-entity-console"
      data-entity-list-style-baseline={coldEntityVisual.canvasName}
      className={coldEntityVisual.canvas.root}
      style={coldEntityVisual.canvas.backgroundStyle}
    >
      <section className={coldEntityVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div data-entity-list-header="cold-compact-header" className={coldEntityVisual.panel.hero}>
              <div className="max-w-[880px]">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">对象优先调查</div>
                <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  围绕服务、资源与实体定位问题并进入调查，先按对象筛出风险，再决定进入日志、链路、指标还是告警工作台。
                </p>
                <div data-entity-list-command-row="standard-equal-buttons" className={coldEntityVisual.button.row}>
                  <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('common.refresh')}
                  </Button>
                  <Link href="/entities/new" className={coldPrimaryLinkClassName}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    创建实体
                  </Link>
                  <Link href="/entities/discovery" className={coldLinkButtonClassName}>
                    <Network className="h-3.5 w-3.5" aria-hidden="true" />
                    从遥测发现
                  </Link>
                  <Link href="/entities/import" className={coldLinkButtonClassName}>
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    导入定义
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div data-entity-list-admin-layout="full-width-admin-list" className="space-y-5">
            <div data-entity-list-count-strip="cold-inline-counts" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['实体总数', total, Network],
                ['活跃异常对象', abnormalCount, Bell],
                ['高风险对象', alertingCount, Bell],
                ['有关联对象', linkedCount, GitBranch]
              ].map(([label, value, Icon]) => {
                const MetricIcon = Icon as typeof Network;
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

            <section className="min-w-0">
              <SearchRow
                data-entity-list-toolbar="cold-table-toolbar"
                value={draft.search}
                placeholder="搜索实体名称、命名空间、负责人"
                searchLabel={t('common.search')}
                inputWidthClassName="w-[420px]"
                onValueChange={value => onDraftChange({ search: value })}
                onSearch={onSearch}
                trailingActions={
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      data-entity-list-refresh-action="search-row-secondary"
                      className={coldSmallButtonClassName}
                      onClick={onRefresh}
                    >
                      {t('common.refresh')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      data-entity-list-clear-action="search-row-secondary"
                      className={coldSmallButtonClassName}
                      onClick={onReset}
                    >
                      {t('common.clear')}
                    </Button>
                  </>
                }
              />

              <div
                data-entity-list-table-shell="cold-dense-table"
                className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-[#252b34] bg-[#101217] px-3 text-[12px] text-[#8f99ab]">
                  <span className="font-semibold text-[#dbe4f0]">{total} 个实体</span>
                  <span>显示 {rangeFrom}-{rangeTo} / {total}</span>
                </div>
                <div className="overflow-x-auto">
                  <table data-entity-list-table="cold-entity-table" className="min-w-[1040px] w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                    <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                      <tr>
                        <th className="w-[24%] px-3 py-2.5">{t('entities.list.column.object')}</th>
                        <th className="w-[14%] px-3 py-2.5">负责人</th>
                        <th className="w-[18%] px-3 py-2.5">进展</th>
                        <th className="w-[24%] px-3 py-2.5">证据关联</th>
                        <th className="w-[12%] px-3 py-2.5">{t('entities.list.column.status')}</th>
                        <th className="w-[150px] px-3 py-2.5">下一步动作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length > 0 ? rows.map(row => (
                        <tr key={row.key} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                          <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">
                            <Link href={row.href} className="inline-flex max-w-full text-[#dbe4f0] hover:text-white">
                              <span className="truncate">{row.name}</span>
                            </Link>
                            <div className="mt-1 truncate text-[11px] font-normal text-[#858d9a]">
                              {row.type} · {row.environment}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-[#dbe4f0]">未设置</td>
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
                                  {row.status === 'healthy' || row.status === '健康' ? '40%' : '20%'} · 待完善
                                </div>
                                <div className="mt-1 text-[11px] text-[#858d9a]">当前缺少负责人、处置手册</div>
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={coldEvidenceBadgeClassName}>{row.monitorCount} 监控</span>
                              <span className={coldEvidenceBadgeClassName}>{row.activeAlertCount} 告警</span>
                              <span className={coldEvidenceBadgeClassName}>{row.relationCount} 身份标识</span>
                            </div>
                            <div className="mt-2 text-[11px] text-[#858d9a]">最近更新 {row.updatedAt}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${statusClassName(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div data-entity-list-row-actions="cold-inline-actions" className="flex flex-wrap gap-1.5">
                              <Link
                                href={row.href}
                                data-entity-list-row-owner-action="text-only"
                                className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white"
                              >
                                设置负责人
                              </Link>
                              <Link href="/log/manage" className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white">
                                日志线索
                              </Link>
                              <Link href="/trace/manage" className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white">
                                链路证据
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <EmptyTableRow t={t} />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
