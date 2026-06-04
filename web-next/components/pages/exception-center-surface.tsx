'use client';

import React from 'react';
import Link from 'next/link';
import {
  HzButton,
  HzButtonLink,
  HzDataTable,
  HzExplorerFrame,
  HzInput,
  HzPanelSurface,
  HzSelect,
  HzStatusBadge
} from '@hertzbeat/ui';
import { useI18n } from '../providers/i18n-provider';
import {
  buildExceptionCopy,
  buildExceptionExplorerRows,
  buildExceptionFilters,
  buildRecoveryRows,
  type ExceptionExplorerRow
} from '../../lib/exception-center/view-model';

export function ExceptionCenterSurface({ type }: { type: string }) {
  const { t } = useI18n();
  const copy = buildExceptionCopy(type, t);
  const rows = buildExceptionExplorerRows(type);
  const filters = buildExceptionFilters(t);
  const recoveryRows = buildRecoveryRows(t);
  const columns = React.useMemo(
    () => [
      {
        key: 'type',
        header: t('exception.table.type'),
        width: '280px',
        render: (row: ExceptionExplorerRow) => (
          <Link href={row.href} className="font-medium text-[#7190ff]">
            {row.exceptionType}
          </Link>
        )
      },
      {
        key: 'message',
        header: t('exception.table.message'),
        render: (row: ExceptionExplorerRow) => <span className="font-medium text-[#e8eaed]">{row.errorMessage}</span>
      },
      {
        key: 'count',
        header: t('exception.table.count'),
        width: '120px',
        render: (row: ExceptionExplorerRow) => <span className="font-semibold text-[#e8eaed]">{row.count}</span>
      },
      {
        key: 'lastSeen',
        header: t('exception.table.last-seen'),
        width: '200px',
        render: (row: ExceptionExplorerRow) => <span>{row.lastSeen}</span>
      },
      {
        key: 'firstSeen',
        header: t('exception.table.first-seen'),
        width: '200px',
        render: (row: ExceptionExplorerRow) => <span>{row.firstSeen}</span>
      },
      {
        key: 'application',
        header: t('exception.table.application'),
        width: '180px',
        render: (row: ExceptionExplorerRow) => <span className="font-semibold text-[#e8eaed]">{row.application}</span>
      }
    ],
    [t]
  );

  return (
    <main
      data-exception-center-surface="hertzbeat-ui-exceptions"
      data-exception-type={type}
      className="relative min-h-[calc(100vh-56px)] bg-[#08090c] text-[#e8eaed]"
    >
      <HzExplorerFrame
        data-exception-shared-frame="hertzbeat-ui"
        className="mx-0 mb-0 mt-0 min-h-[calc(100vh-56px)] sm:mx-0"
        eyebrow={t('exception.chrome.title')}
        title={copy.title}
        description={copy.subtitle}
        mainId="exception-center-main"
        mainLabel={t('exception.chrome.title')}
        filterRailLabel={t('exception.chrome.filter-title')}
        actions={
          <>
            <HzStatusBadge tone={copy.tone === 'danger' ? 'critical' : 'info'} size="xs" data-exception-type-badge-owner="hertzbeat-ui-status-badge">
              {type}
            </HzStatusBadge>
            <HzStatusBadge tone="neutral" size="xs">1w</HzStatusBadge>
            <span className="text-[12px] font-semibold text-[#d6d9e2]">{t('exception.time.last-7d')}</span>
            <HzStatusBadge tone="neutral" size="xs">UTC + 8:00</HzStatusBadge>
            <HzButton type="button" intent="secondary" data-exception-action-owner="hertzbeat-ui-button">{t('exception.action.search')}</HzButton>
            <HzButton type="button" intent="primary" data-exception-run-query-owner="hertzbeat-ui-button">{t('exception.action.run-query')}</HzButton>
            <HzButton type="button" intent="secondary" data-exception-feedback-owner="hertzbeat-ui-button">{t('exception.action.feedback')}</HzButton>
            <HzButton type="button" intent="secondary" data-exception-share-owner="hertzbeat-ui-button">{t('exception.action.share')}</HzButton>
          </>
        }
        queryBar={
          <HzPanelSurface
            data-exception-query-bar="hertzbeat-ui-error-query"
            data-exception-query-bar-owner="hertzbeat-ui-panel-surface"
            className="rounded-none border-x-0 border-t-0 shadow-none"
            padding="query"
          >
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_150px_120px]">
              <HzInput
                aria-label={t('exception.query.aria')}
                className="font-mono"
                defaultValue=""
                placeholder={t('exception.query.placeholder')}
                readOnly
                data-exception-query-input-owner="hertzbeat-ui-input"
              />
              <HzSelect
                aria-label={t('exception.scope.aria')}
                defaultValue="all"
                data-exception-scope-select-owner="hertzbeat-ui-select"
                options={[
                  { value: 'all', label: t('exception.scope.all') },
                  { value: 'critical', label: t('exception.scope.critical') }
                ]}
              />
              <HzSelect
                aria-label={t('exception.sort.aria')}
                defaultValue="lastSeen"
                data-exception-sort-select-owner="hertzbeat-ui-select"
                options={[
                  { value: 'lastSeen', label: t('exception.sort.last-seen') },
                  { value: 'count', label: t('exception.sort.count') }
                ]}
              />
            </div>
          </HzPanelSurface>
        }
        filterRail={
          <aside
            data-exception-filter-sidebar="hertzbeat-ui-exception-filters"
            className="bg-[var(--hz-ui-surface)] px-3 py-3"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#e4ebf5]">{t('exception.chrome.filter-title')}</div>
              <HzButton
                type="button"
                size="xs"
                intent="ghost"
                aria-label={t('exception.chrome.refresh-filters')}
                data-exception-filter-refresh-owner="hertzbeat-ui-button"
              >
                {t('exception.action.search')}
              </HzButton>
            </div>
            <div className="space-y-4">
              {filters.map((filter, index) => (
                <section key={filter.title} className="space-y-2">
                  <div className="flex items-center justify-between text-[12px] font-semibold text-[#d5d8e1]">
                    <span>{filter.title}</span>
                    <HzButton type="button" intent="ghost" size="xs">{t('exception.chrome.clear-all')}</HzButton>
                  </div>
                  {filter.values.length > 0 ? (
                    <div className="space-y-1.5">
                      {filter.values.slice(0, index === 1 ? 10 : 4).map(value => (
                        <label key={value} className="flex h-7 items-center gap-2 rounded-[3px] px-1 text-[12px] text-[#d6d9e2] hover:bg-[#151a22]">
                          <span className="grid h-4 w-4 place-items-center rounded-[3px] border border-[#4d65c8] bg-[#17213a] text-[10px] font-semibold text-[#b9c8ff]">
                            *
                          </span>
                          <span className="min-w-0 truncate">{value}</span>
                        </label>
                      ))}
                      {index === 1 ? (
                        <HzButton type="button" intent="ghost" size="xs" className="ml-5">{t('exception.chrome.expand-more')}</HzButton>
                      ) : null}
                    </div>
                  ) : (
                    <HzButton type="button" intent="ghost" size="sm" layout="full" className="justify-start">
                      {filter.title}
                    </HzButton>
                  )}
                </section>
              ))}
            </div>
          </aside>
        }
      >
        <section className="min-h-[560px] bg-[#08090c] px-5 py-4">
          <HzPanelSurface clip data-exception-table="hertzbeat-ui-exception-list" data-exception-table-owner="hertzbeat-ui-data-table">
            <div className="flex h-11 items-center justify-between border-b border-[var(--hz-ui-line-soft)] px-4 text-[12px] text-[#8e99ab]">
              <span>{t('exception.chrome.title')}</span>
              <span>
                {rows.length} {t('exception.summary.groups')}
              </span>
            </div>
            <HzDataTable
              rows={rows}
              columns={columns}
              getRowKey={row => row.key}
              variant="embedded"
              data-exception-table-chrome-owner="hertzbeat-ui-data-table"
            />
          </HzPanelSurface>

          <HzPanelSurface
            className="mt-4"
            padding="query"
            data-exception-summary-owner="hertzbeat-ui-panel-surface"
          >
            <div className="flex flex-col gap-3 text-[12px] text-[#8f98aa] xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  {rows.length} {t('exception.summary.groups')}
                </span>
                <span>{copy.subtitle}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {recoveryRows.map(row => (
                  <HzButtonLink
                    key={row.href}
                    component={Link}
                    href={row.href}
                    intent="secondary"
                    size="sm"
                    data-exception-recovery-action-owner="hertzbeat-ui-button-link"
                    title={`${row.title}: ${row.copy}`}
                  >
                    {row.label}
                  </HzButtonLink>
                ))}
              </div>
            </div>
          </HzPanelSurface>
        </section>
      </HzExplorerFrame>
    </main>
  );
}
