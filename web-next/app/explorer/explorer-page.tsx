'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BellPlus, BarChart3, LayoutDashboard, Play, Save } from 'lucide-react';
import {
  HzButton,
  HzButtonLink,
  HzDataCellText,
  HzDataMetaText,
  HzDataTable,
  HzExplorerFrame,
  HzQueryBar,
  HzSelect,
  type HzDataColumn
} from '@hertzbeat/ui';
import { ClientWorkbench } from '../../components/workbench/client-workbench';
import { useI18n } from '../../components/providers/i18n-provider';
import {
  buildExplorerRouteUrl,
  loadExplorerReadData,
  readExplorerQueryState,
  type ExplorerQueryState,
  type ExplorerReadData,
  type ExplorerSignalFilter
} from '../../lib/explorer-surface/controller';
import { buildExplorerFilters, type ExplorerResultRow, type ExplorerSignalTone } from '../../lib/explorer-surface/view-model';

type Translator = ReturnType<typeof useI18n>['t'];

function signalToneClass(signalTone: ExplorerSignalTone) {
  if (signalTone === 'trace') return 'border-[#7a3f55] bg-[#241119] text-[#f18aa6]';
  if (signalTone === 'log') return 'border-[#3a5674] bg-[#101b29] text-[#9bc5ee]';
  if (signalTone === 'metric') return 'border-[#315b49] bg-[#0f211b] text-[#8bd8ad]';
  return 'border-[#303642] bg-[#151821] text-[#d7dce6]';
}

export default function ExplorerPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryState = useMemo(() => readExplorerQueryState(searchParams), [searchParams]);
  const load = useCallback(() => loadExplorerReadData(t, undefined, queryState), [queryState, t]);
  const cacheKey = `explorer:trace-log-read:${queryState.signal}:${queryState.q}`;

  return (
    <ClientWorkbench load={load} loadingCopy={t('common.workbench.loading.copy')} cacheKey={cacheKey}>
      {data => <ExplorerWorksurface data={data} t={t} />}
    </ClientWorkbench>
  );
}

function ExplorerWorksurface({ data, t }: { data: ExplorerReadData; t: Translator }) {
  const router = useRouter();
  const filters = buildExplorerFilters(t);
  const rows = data.rows;
  const activeRow = rows[0] || null;
  const [draft, setDraft] = useState<ExplorerQueryState>(data.query);
  useEffect(() => {
    setDraft(data.query);
  }, [data.query]);
  const applyQuery = useCallback(() => {
    router.replace(buildExplorerRouteUrl(draft));
  }, [draft, router]);
  const columns: HzDataColumn<ExplorerResultRow>[] = [
    {
      key: 'signal',
      header: t('explorer.table.signal-type'),
      width: '112px',
      render: row => (
        <span
          className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold ${signalToneClass(row.signalTone)}`}
          data-explorer-signal-tone={row.signalTone}
        >
          {row.signal}
        </span>
      )
    },
    {
      key: 'service',
      header: t('explorer.table.service'),
      width: '180px',
      render: row => <HzDataCellText>{row.service}</HzDataCellText>
    },
    {
      key: 'operation',
      header: t('explorer.table.operation'),
      render: row => (
        <a href={row.href} className="font-medium text-[#9fb4e7] hover:text-[#d7e2ff]">
          {row.operation}
        </a>
      )
    },
    {
      key: 'status',
      header: t('explorer.table.status'),
      width: '96px',
      render: row => <HzDataCellText>{row.status}</HzDataCellText>
    },
    {
      key: 'duration',
      header: t('explorer.table.duration'),
      width: '96px',
      render: row => <HzDataMetaText casing="plain">{row.duration}</HzDataMetaText>
    },
    {
      key: 'time',
      header: t('explorer.table.time'),
      width: '176px',
      render: row => <HzDataMetaText casing="plain">{row.timestamp}</HzDataMetaText>
    }
  ];

  return (
    <main
      data-explorer-route="otlp-hertzbeat-ui-workbench"
      data-explorer-style-baseline="hertzbeat-ui-matte"
      data-explorer-api-owner={data.apiOwner}
      data-explorer-api-state={data.apiState}
      data-explorer-api-total={rows.length}
      data-explorer-api-trace-total={data.traceTotal}
      data-explorer-api-log-total={data.logTotal}
      data-explorer-api-metric-total={data.metricTotal}
      data-explorer-query-state={data.query.q || 'none'}
      data-explorer-signal-filter={data.query.signal}
      className="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"
    >
      <HzExplorerFrame
        data-explorer-shared-frame="hertzbeat-ui"
        className="mx-0 mb-0 mt-0 min-h-[calc(100vh-56px)] sm:mx-0"
        eyebrow={t('explorer.kicker')}
        title={t('explorer.title')}
        description={t('explorer.subtitle')}
        mainId="explorer-shared-main"
        mainLabel={t('explorer.title')}
        filterRailLabel={t('explorer.filters.title')}
        actions={
          <>
            <HzButtonLink href="/explorer?view=saved" intent="secondary" data-explorer-action="save-view">
              <Save size={14} />
              {t('explorer.actions.save-view')}
            </HzButtonLink>
            <HzButtonLink href="/alert/setting?source=explorer" intent="secondary" data-explorer-action="create-alert">
              <BellPlus size={14} />
              {t('explorer.actions.create-alert')}
            </HzButtonLink>
            <HzButtonLink href="/dashboard?source=explorer" intent="secondary" data-explorer-action="add-dashboard">
              <LayoutDashboard size={14} />
              {t('explorer.actions.add-dashboard')}
            </HzButtonLink>
          </>
        }
        queryBar={
          <div data-explorer-query-bar="hertzbeat-ui-query-row">
            <HzQueryBar
              query={draft.q}
              onQueryChange={q => setDraft(current => ({ ...current, q }))}
              inputProps={{ 'aria-label': t('explorer.query.aria'), placeholder: t('explorer.query.placeholder'), 'data-explorer-query-input': 'url-owned' }}
              actions={
                <>
                  <HzSelect
                    aria-label={t('explorer.signal.aria')}
                    className="w-[136px]"
                    value={draft.signal}
                    onChange={event => setDraft(current => ({ ...current, signal: event.target.value as ExplorerSignalFilter }))}
                    data-explorer-signal-select="url-owned"
                    options={[
                      { value: 'all', label: t('explorer.signal.all') },
                      { value: 'trace', label: t('explorer.rows.trace.signal') },
                      { value: 'log', label: t('explorer.rows.log.signal') },
                      { value: 'metric', label: t('explorer.rows.metric.signal') }
                    ]}
                  />
                  <HzSelect
                    aria-label={t('explorer.sort.aria')}
                    className="w-[148px]"
                    defaultValue="time-desc"
                    options={[
                      { value: 'time-desc', label: t('explorer.sort.time-desc') },
                      { value: 'duration-desc', label: t('explorer.sort.duration-desc') }
                    ]}
                  />
                  <HzButton
                    type="button"
                    intent="primary"
                    onClick={applyQuery}
                    data-explorer-query-action="run"
                    data-explorer-query-url={buildExplorerRouteUrl(draft)}
                  >
                    <Play size={14} />
                    {t('explorer.query.run')}
                  </HzButton>
                </>
              }
            />
          </div>
        }
        filterRail={
          <aside data-explorer-filter-rail="hertzbeat-ui-static-rail" className="bg-[var(--hz-ui-surface)] px-3 py-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#e4ebf5]">{t('explorer.filters.title')}</div>
              <button type="button" className="text-[12px] font-semibold text-[#9aa6b8] hover:text-[#dbe4f0]">
                {t('explorer.filters.clear')}
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
        }
      >
        <section data-explorer-chart-band="hertzbeat-ui-chart-band" className="border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#8e99ab]">{t('explorer.chart.title')}</p>
              <p className="mt-1 text-[13px] text-[#d5dde9]" data-explorer-api-source={`${data.sourceUrls.traces}|${data.sourceUrls.logs}|${data.sourceUrls.metrics}`}>
                {t('explorer.chart.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#8d98aa]">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              {t('explorer.chart.result-count', { count: rows.length })}
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

        <div className="grid min-h-[420px] gap-0 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <section data-explorer-result-table="hertzbeat-ui-dense-table" className="min-w-0 overflow-hidden border-r border-[var(--hz-ui-line-soft)]">
            <div className="flex h-11 items-center justify-between border-b border-[var(--hz-ui-line-soft)] px-4 text-[12px] text-[#8e99ab]">
              <span>{t('explorer.results.title')}</span>
              <span>{t('explorer.results.count', { count: rows.length })}</span>
            </div>
            <HzDataTable
              columns={columns}
              rows={rows}
              getRowKey={row => row.key}
              variant="embedded"
              data-explorer-result-table-owner="hertzbeat-ui-data-table"
            />
            {rows.length === 0 ? (
              <div data-explorer-api-empty-state="trace-log-bff-query-api" className="border-t border-[var(--hz-ui-line-soft)] px-4 py-8 text-[13px] text-[#8f9bad]">
                {t('common.no-data')}
              </div>
            ) : null}
          </section>

          <aside data-explorer-detail-panel="hertzbeat-ui-detail-panel" className="h-fit bg-[var(--hz-ui-surface)] px-4 py-4">
            <p className="text-[12px] font-semibold text-[#8d98aa]">{t('explorer.detail.title')}</p>
            <h2 className="mt-2 text-[18px] font-semibold text-[#f0f4fa]">{activeRow?.service || t('common.no-data')}</h2>
            <div className="mt-4 space-y-3 text-[12px] text-[#9aa6b8]">
              <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                <span>{t('explorer.detail.signal')}</span>
                <span className="font-semibold text-[#dbe5f3]">{activeRow?.signal || '-'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                <span>{t('explorer.detail.status')}</span>
                <span className="font-semibold text-[#dbe5f3]">{activeRow?.status || '-'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[#2c3441] pb-2">
                <span>{t('explorer.detail.duration')}</span>
                <span className="font-semibold text-[#dbe5f3]">{activeRow?.duration || '-'}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <HzButtonLink href="/trace/manage" intent="secondary">{t('explorer.handoff.trace')}</HzButtonLink>
              <HzButtonLink href="/log/manage" intent="secondary">{t('explorer.handoff.log')}</HzButtonLink>
              <HzButtonLink href="/ingestion/otlp/metrics" intent="secondary">{t('explorer.handoff.metrics')}</HzButtonLink>
              <HzButtonLink href="/entities" intent="secondary">{t('explorer.handoff.entities')}</HzButtonLink>
            </div>
          </aside>
        </div>
      </HzExplorerFrame>
    </main>
  );
}
