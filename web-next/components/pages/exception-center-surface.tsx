'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '../providers/i18n-provider';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { buildExceptionCopy, buildExceptionExplorerRows, buildExceptionFilters, buildRecoveryRows } from '../../lib/exception-center/view-model';

export function ExceptionCenterSurface({ type }: { type: string }) {
  const { t } = useI18n();
  const copy = buildExceptionCopy(type, t);
  const rows = buildExceptionExplorerRows(type);
  const filters = buildExceptionFilters(t);
  const recoveryRows = buildRecoveryRows(t);

  return (
    <main
      data-exception-center-surface="hertzbeat-exceptions"
      data-exception-type={type}
      className="relative min-h-[calc(100vh-56px)] bg-[#08090c] text-[#e8eaed]"
    >
      <div className="flex min-h-[calc(100vh-56px)] border-t border-[#252832] bg-[#08090c]">
        <aside
          data-exception-filter-sidebar="hertzbeat-exception-filters"
          className="w-[264px] shrink-0 border-r border-[#252832] bg-[#101217]"
        >
          <div className="flex h-12 items-center justify-between border-b border-[#252832] px-4">
            <div className="flex items-center gap-2">
              <span className="text-[16px] text-[#d7dbe5]">▽</span>
              <p className="text-[14px] font-semibold text-[#f3f4f7]">{t('exception.chrome.filter-title')}</p>
            </div>
            <button
              type="button"
              aria-label={t('exception.chrome.refresh-filters')}
              className="h-7 rounded-[4px] border border-[#252832] bg-[#151821] px-2 text-[12px] text-[#d7dbe5]"
            >
              ↻
            </button>
          </div>

          <div className="divide-y divide-[#252832]">
            {filters.map((filter, index) => (
              <section key={filter.title} className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-[#d5d8e1]">
                  <span>{filter.title}</span>
                  <button type="button" className="text-[11px] font-medium text-[#7190ff]">
                    {t('exception.chrome.clear-all')}
                  </button>
                </div>
                {filter.values.length > 0 ? (
                  <div className="space-y-1.5">
                    {filter.values.slice(0, index === 1 ? 10 : 4).map(value => (
                      <label key={value} className="flex h-7 items-center gap-2 text-[12px] text-[#d6d9e2]">
                        <span className="grid h-4 w-4 place-items-center rounded-[3px] bg-[#526cff] text-[10px] font-semibold text-white">✓</span>
                        <span>{value}</span>
                      </label>
                    ))}
                    {index === 1 ? (
                      <button type="button" className="ml-6 text-[12px] font-medium text-[#7190ff]">{t('exception.chrome.expand-more')}</button>
                    ) : null}
                  </div>
                ) : (
                  <button type="button" className="flex h-8 w-full items-center gap-2 text-left text-[12px] text-[#c2c7d2]">
                    <span>›</span>
                    <span>{filter.title}</span>
                  </button>
                )}
              </section>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-12 items-center justify-between border-b border-[#252832] bg-[#0b0c0f] px-5">
            <div className="flex h-full items-center gap-3">
              <h1 className="text-[14px] font-semibold text-[#f3f4f7]">{t('exception.chrome.title')}</h1>
              <span className="rounded-[4px] border border-[#252832] bg-[#151821] px-2 py-1 text-[11px] font-semibold text-[#8f98aa]">
                {copy.title}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#d6d9e2]">
              <span className="rounded-[4px] border border-[#252832] bg-[#151821] px-2 py-1">1w</span>
              <span className="font-semibold">{t('exception.time.last-7d')}</span>
              <span className="rounded-[4px] border border-[#252832] bg-[#151821] px-2 py-1 text-[#9ca3b4]">UTC + 8:00</span>
              <button type="button" className="h-8 rounded-[4px] border border-[#252832] bg-[#151821] px-3 text-[#d7dbe5]">{t('exception.action.search')}</button>
              <button type="button" className="h-8 rounded-[4px] border border-[#526cff] bg-[#526cff] px-4 font-semibold text-white">{t('exception.action.run-query')}</button>
              <button type="button" className="h-8 rounded-[4px] border border-[#252832] bg-[#151821] px-3 text-[#d7dbe5]">{t('exception.action.feedback')}</button>
              <button type="button" className="h-8 rounded-[4px] border border-[#252832] bg-[#151821] px-3 text-[#d7dbe5]">{t('exception.action.share')}</button>
            </div>
          </header>

          <section data-exception-query-bar="hertzbeat-error-query" className="border-b border-[#252832] bg-[#0b0c0f] px-5 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_150px_120px] gap-2">
              <Input
                aria-label={t('exception.query.aria')}
                className="h-8 rounded-[4px] border border-[#252832] bg-[#111318] px-3 font-mono text-[12px] text-[#e7eaf1] outline-none placeholder:text-[#777f91]"
                defaultValue=""
                placeholder={t('exception.query.placeholder')}
              />
              <Select
                aria-label={t('exception.scope.aria')}
                containerClassName="w-full"
                className="h-8 min-w-0 text-[#d5d8e1]"
                defaultValue="all"
              >
                <option value="all">{t('exception.scope.all')}</option>
                <option value="critical">{t('exception.scope.critical')}</option>
              </Select>
              <Select
                aria-label={t('exception.sort.aria')}
                containerClassName="w-full"
                className="h-8 min-w-0 text-[#d5d8e1]"
                defaultValue="lastSeen"
              >
                <option value="lastSeen">{t('exception.sort.last-seen')}</option>
                <option value="count">{t('exception.sort.count')}</option>
              </Select>
            </div>
          </section>

          <section className="min-h-[560px] bg-[#08090c] px-5 py-4">
            <div data-exception-table="hertzbeat-exception-list" className="overflow-hidden rounded-[4px] border border-[#252832] bg-[#111318]">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="border-b border-[#303440] bg-[#1a1c22] text-[12px] font-semibold text-[#dfe3ed]">
                  <tr>
                    <th className="w-[280px] px-4 py-3">{t('exception.table.type')}</th>
                    <th className="px-4 py-3">{t('exception.table.message')}</th>
                    <th className="w-[120px] px-4 py-3">{t('exception.table.count')}</th>
                    <th className="w-[200px] px-4 py-3">{t('exception.table.last-seen')}</th>
                    <th className="w-[200px] px-4 py-3">{t('exception.table.first-seen')}</th>
                    <th className="w-[180px] px-4 py-3">{t('exception.table.application')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.key} className="border-b border-[#303440] last:border-b-0">
                      <td className="px-4 py-4">
                        <Link href={row.href} className="font-medium text-[#7190ff]">
                          {row.exceptionType}
                        </Link>
                      </td>
                      <td className="px-4 py-4 font-medium text-[#e8eaed]">{row.errorMessage}</td>
                      <td className="px-4 py-4 font-semibold text-[#e8eaed]">{row.count}</td>
                      <td className="px-4 py-4 text-[#e8eaed]">{row.lastSeen}</td>
                      <td className="px-4 py-4 text-[#e8eaed]">{row.firstSeen}</td>
                      <td className="px-4 py-4 font-semibold text-[#e8eaed]">{row.application}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[4px] border border-[#252832] bg-[#101217] px-4 py-3 text-[12px] text-[#8f98aa]">
              <div className="flex items-center gap-3">
                <span>
                  {rows.length} {t('exception.summary.groups')}
                </span>
                <span>{copy.subtitle}</span>
              </div>
              <div className="flex items-center gap-2">
                {recoveryRows.map(row => (
                  <Link
                    key={row.href}
                    href={row.href}
                    className="rounded-full border border-[#252832] bg-[#0b0c0f] px-3 py-1.5 font-semibold text-[#f3f4f7]"
                  >
                    {row.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
