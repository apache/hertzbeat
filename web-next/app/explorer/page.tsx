'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, BellPlus, Gauge, LayoutDashboard, Play, Save, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { buildExplorerFilters, buildExplorerResultRows } from '../../lib/explorer-surface/view-model';

function signalTone(signal: string) {
  if (signal === '链路') return 'border-[#7a3f55] bg-[#241119] text-[#f18aa6]';
  if (signal === '日志') return 'border-[#3a5674] bg-[#101b29] text-[#9bc5ee]';
  if (signal === '指标') return 'border-[#315b49] bg-[#0f211b] text-[#8bd8ad]';
  return 'border-[#303642] bg-[#151821] text-[#d7dce6]';
}

const actionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe3ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-[#3b4454] hover:bg-[#151821]';
const primaryActionClass =
  'inline-flex h-8 items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-4 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';
const panelClass = 'rounded-[4px] border border-[#252b35] bg-[#0d1015] shadow-[0_18px_60px_rgba(0,0,0,0.28)]';
const inputClass =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#e6edf7] outline-none transition-colors placeholder:text-[#697386] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.12)]';

export default function ExplorerPage() {
  const filters = buildExplorerFilters();
  const rows = buildExplorerResultRows();
  const activeRow = rows[0];

  return (
    <main
      data-explorer-route="otlp-cold-workbench"
      data-explorer-style-baseline="hertzbeat-cold-matte"
      className="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6">
        <section data-explorer-header="cold-compact-header" className={`${panelClass} px-5 py-4`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]">可观测</p>
              <h1 className="text-[30px] font-semibold tracking-normal text-[#f4f7fb]">查询工作台</h1>
              <p className="mt-3 max-w-[760px] text-[13px] leading-6 text-[#9ca7ba]">
                统一检索链路、日志和指标结果，围绕查询栏、趋势带、表格和详情面板完成定位。
              </p>
            </div>
            <div data-explorer-action-row="cold-workbench-actions" className="flex flex-wrap items-center gap-2">
              <Link href="/explorer?view=saved" className={actionClass}>
                <Save className="h-4 w-4" aria-hidden="true" />
                保存视图
              </Link>
              <Link href="/alert/setting?source=explorer" className={actionClass}>
                <BellPlus className="h-4 w-4" aria-hidden="true" />
                创建告警
              </Link>
              <Link href="/dashboard?source=explorer" className={actionClass}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                加入仪表盘
              </Link>
            </div>
          </div>
        </section>

        <section data-explorer-query-bar="cold-query-row" className={`${panelClass} px-4 py-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-[#3f4450] bg-[#141923] text-[12px] font-semibold text-[#d5dfef]">
              A
            </div>
            <div className="relative min-w-[360px] max-w-[680px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8798]" aria-hidden="true" />
              <Input
                aria-label="查询条件"
                className={`${inputClass} w-full pl-9 font-mono`}
                placeholder="输入服务、状态或资源属性过滤条件"
                defaultValue={'service.name = "checkout" AND status = "错误"'}
              />
            </div>
            <Select aria-label="信号类型" containerClassName="w-[136px]" className="h-8 min-w-0 text-[#d5dce8]" defaultValue="all">
              <option value="all">全部信号</option>
              <option value="trace">链路</option>
              <option value="log">日志</option>
              <option value="metric">指标</option>
            </Select>
            <Select aria-label="排序方式" containerClassName="w-[148px]" className="h-8 min-w-0 text-[#d5dce8]" defaultValue="time-desc">
              <option value="time-desc">时间倒序</option>
              <option value="duration-desc">耗时倒序</option>
            </Select>
            <button type="button" className={primaryActionClass}>
              <Play className="h-4 w-4" aria-hidden="true" />
              运行查询
            </button>
          </div>
        </section>

        <div className="grid min-h-[620px] gap-4 xl:grid-cols-[232px_minmax(0,1fr)]">
          <aside data-explorer-filter-rail="cold-static-rail" className={`${panelClass} h-fit px-4 py-4`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#e4ebf5]">
                <Gauge className="h-4 w-4 text-[#8d97a8]" aria-hidden="true" />
                快速筛选
              </div>
              <button type="button" className="text-[12px] font-semibold text-[#9aa6b8] hover:text-[#dbe4f0]">
                清除
              </button>
            </div>
            <div className="space-y-4">
              {filters.map(filter => (
                <section key={filter.title} className="space-y-2">
                  <div className="text-[12px] font-semibold text-[#8d98aa]">{filter.title}</div>
                  <div className="space-y-1">
                    {filter.values.map(value => (
                      <label key={value} className="flex h-7 items-center gap-2 rounded-[3px] px-1 text-[12px] text-[#c7d0df] hover:bg-[#151a22]">
                        <span className="grid h-4 w-4 place-items-center rounded-[3px] border border-[#4d65c8] bg-[#17213a] text-[10px] font-semibold text-[#b9c8ff]">
                          ✓
                        </span>
                        <span className="min-w-0 truncate">{value}</span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            <section data-explorer-chart-band="cold-chart-band" className={`${panelClass} px-4 py-4`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-[#8e99ab]">趋势带</p>
                  <p className="mt-1 text-[13px] text-[#d5dde9]">近 30 分钟跨信号命中量</p>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#8d98aa]">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  结果 {rows.length}
                </div>
              </div>
              <div className="flex h-[86px] items-end gap-2 border-t border-[#232a34] pt-3">
                {[28, 36, 22, 54, 45, 68, 42, 58, 33, 74, 49, 62].map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className="min-w-0 flex-1 rounded-[3px] border border-[#2f3b4d] bg-[#182232]"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </section>

            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
              <section data-explorer-result-table="cold-dense-table" className={`${panelClass} min-w-0 overflow-hidden`}>
                <div className="flex h-11 items-center justify-between border-b border-[#252b35] px-4 text-[12px] text-[#8e99ab]">
                  <span>跨信号结果</span>
                  <span>{rows.length} 条</span>
                </div>
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="border-b border-[#252b35] bg-[#10141b] text-[12px] font-semibold text-[#8f9aab]">
                    <tr>
                      <th className="w-[112px] px-4 py-3">信号类型</th>
                      <th className="w-[180px] px-4 py-3">服务</th>
                      <th className="px-4 py-3">操作</th>
                      <th className="w-[96px] px-4 py-3">状态</th>
                      <th className="w-[96px] px-4 py-3">耗时</th>
                      <th className="w-[176px] px-4 py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} className="border-b border-[#232a34] last:border-b-0 hover:bg-[#10141b]">
                        <td className="px-4 py-3">
                          <span className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold ${signalTone(row.signal)}`}>
                            {row.signal}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#e6edf7]">{row.service}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={row.signal === '链路' ? '/trace/manage?serviceName=checkout' : row.signal === '日志' ? '/log/manage?search=payment' : '/ingestion/otlp/metrics?serviceName=frontend'}
                            className="font-medium text-[#9fb4e7] hover:text-[#d7e2ff]"
                          >
                            {row.operation}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#e6edf7]">{row.status}</td>
                        <td className="px-4 py-3 text-[#cbd5e1]">{row.duration}</td>
                        <td className="px-4 py-3 text-[#cbd5e1]">{row.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <aside data-explorer-detail-panel="cold-detail-panel" className={`${panelClass} h-fit px-4 py-4`}>
                <p className="text-[12px] font-semibold text-[#8d98aa]">详情面板</p>
                <h2 className="mt-2 text-[18px] font-semibold text-[#f0f4fa]">{activeRow.service}</h2>
                <div className="mt-4 space-y-3 text-[12px] text-[#9aa6b8]">
                  <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                    <span>信号</span>
                    <span className="font-semibold text-[#dbe5f3]">{activeRow.signal}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                    <span>状态</span>
                    <span className="font-semibold text-[#dbe5f3]">{activeRow.status}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                    <span>耗时</span>
                    <span className="font-semibold text-[#dbe5f3]">{activeRow.duration}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Link href="/trace/manage" className={actionClass}>
                    查看链路
                  </Link>
                  <Link href="/log/manage" className={actionClass}>
                    查看日志
                  </Link>
                  <Link href="/ingestion/otlp/metrics" className={actionClass}>
                    查看指标
                  </Link>
                  <Link href="/entities" className={actionClass}>对象目录</Link>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
