import React from 'react';
import { Pencil } from 'lucide-react';
import { MonitorHistoryChartGrid } from './monitor-history-chart-grid';
import { MonitorSummaryCard } from './monitor-summary-card';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { RowList } from '../workbench/workbench-page';
import type { MonitorHistoryMetricCatalogItem } from '../../lib/monitor-detail/controller';
import { buildMonitorDetailSections, type MonitorDetailSectionsInput, type MonitorDetailSectionsOutput } from '../../lib/monitor-detail/detail-route-state';
import { buildMonitorMetricTableMatrix, type MonitorFavoriteJumpRow } from '../../lib/monitor-detail/view-model';
import type { TimeContext } from '../../lib/time-context';
import type { GrafanaDashboard, Monitor, MonitorDetailMetric, MonitorHistoryData, MonitorRealtimeMetricData, Param } from '../../lib/types';
import { formatTime } from '../../lib/format';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type EvidenceRow = { key: string; title: string; copy: string; meta: string };
type MetricCardPayloadState = {
  payload: MonitorRealtimeMetricData | null;
  loading: boolean;
  error: string | null;
};

function FlatStage({
  title,
  description,
  children,
  className = '',
  header = 'visible',
  rhythm = 'default'
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  header?: 'visible' | 'hidden';
  rhythm?: 'default' | 'angular-tight';
}) {
  const stageClassName =
    rhythm === 'angular-tight'
      ? `monitor-detail-stage space-y-2 pt-0 ${className}`
      : `monitor-detail-stage space-y-3 border-t border-[var(--ops-border-color)] pt-3 ${className}`;

  return (
    <section
      className={stageClassName}
      data-monitor-detail-flat-stage="true"
      data-monitor-detail-stage-header={header === 'hidden' ? 'hidden' : undefined}
      data-monitor-detail-stage-rhythm={rhythm === 'angular-tight' ? 'angular-tight' : undefined}
    >
      {header === 'visible' ? (
        <div>
          <h3 className="text-[13px] font-semibold tracking-[0.02em] text-[var(--ops-text-primary)]">{title}</h3>
          {description ? <p className="mt-1 text-[12px] leading-5 text-[var(--ops-text-secondary)]">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function MetricSignalList({
  leadingCard,
  rows,
  selectedKey,
  payloads,
  onSelectMetric,
  t
}: {
  leadingCard?: React.ReactNode;
  rows: EvidenceRow[];
  selectedKey: string | null;
  payloads: Record<string, MetricCardPayloadState | undefined>;
  onSelectMetric: (key: string) => void;
  t: Translator;
}) {
  return (
    <div
      className="monitor-detail-stage monitor-detail-stage--signals space-y-2 pt-0.5"
      data-monitor-detail-signal-list="true"
      data-monitor-detail-signal-grid="monitor-data-table"
      data-monitor-detail-signal-list-rhythm="angular-tight"
      data-monitor-detail-signal-list-geometry="angular-two-column-metric-cards"
    >
      {rows.length > 0 ? (
        <div
          className="monitor-detail-card-grid monitor-detail-card-grid--realtime monitor-detail-signal-card-grid grid auto-rows-fr grid-cols-1 items-stretch gap-2 lg:grid-cols-2"
          data-monitor-detail-card-grid-rhythm="angular-tight"
          data-monitor-detail-realtime-card-flow="angular-cards-list"
          data-monitor-detail-realtime-card-grid="basic-and-metrics"
          data-monitor-detail-realtime-reference="apache-hertzbeat-master-cards-lists"
          data-monitor-detail-realtime-card-height="angular-400px"
          data-monitor-detail-realtime-card-chrome="angular-card-box"
        >
          {leadingCard}
          {rows.map(row => {
            const selected = row.key === selectedKey;
            const state = payloads[row.key];
            const matrix = buildMonitorMetricTableMatrix(state?.payload, t);
            const columns = matrix.columns.slice(0, 3);
            const tableRows = matrix.rows.slice(0, 4);
            const hasTable = columns.length > 0 && tableRows.length > 0;
            return (
              <section
                key={row.key}
                className={[
                  'monitor-detail-card monitor-detail-card--signal-flat monitor-detail-card--signal-metric monitor-workbench-surface monitor-workbench-surface--plain min-h-[400px] min-w-0 grid content-start gap-3 rounded-[3px] border p-3 bg-[var(--ops-surface-raised)] transition-colors',
                  'border-[var(--ops-border-color)]'
                ].join(' ')}
                data-monitor-detail-signal-card="true"
                data-monitor-detail-signal-card-chrome="angular-card-box"
                data-monitor-detail-signal-row={row.key}
                data-monitor-detail-signal-row-density="angular-metric-card"
                data-monitor-detail-signal-selected-style="angular-neutral"
                data-selected={selected ? 'true' : 'false'}
              >
                <header className="monitor-workbench-surface__header flex items-start justify-between gap-3 border-b border-[var(--ops-border-color)] pb-2">
                  <button
                    type="button"
                    className="monitor-workbench-card-title__copy min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.2)]"
                    data-monitor-detail-signal-row-title="true"
                    onClick={() => onSelectMetric(row.key)}
                  >
                    <div className="monitor-workbench-card-title__title truncate text-[16px] font-semibold leading-6 text-[var(--ops-text-primary)]">
                      {row.title}
                    </div>
                  </button>
                  {state?.loading ? (
                    <span className="flex-none text-[11px] text-[var(--ops-text-tertiary)]">{t('common.loading')}</span>
                  ) : null}
                </header>
                <button
                  type="button"
                  className="monitor-workbench-metric-table grid w-full gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.2)]"
                  data-monitor-detail-signal-card-table="true"
                  data-monitor-detail-signal-card-body-density="angular-card-table"
                  onClick={() => onSelectMetric(row.key)}
                >
                  {state?.error ? (
                    <span className="border-y border-rose-400/20 bg-rose-400/10 px-3 py-3 text-sm text-rose-200">{state.error}</span>
                  ) : hasTable ? (
                    <span className="grid overflow-hidden border-y border-[var(--ops-border-color)]" data-monitor-detail-signal-card-table-row="metric-fields">
                      <span
                        className="grid gap-2 border-b border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-2 text-[11px] font-semibold text-[var(--ops-text-tertiary)]"
                        style={{ gridTemplateColumns: `minmax(96px, 0.8fr) repeat(${columns.length}, minmax(64px, 1fr))` }}
                      >
                        <span>{t('common.labels')}</span>
                        {columns.map(column => (
                          <span key={column.key} className="truncate">
                            {column.title}
                          </span>
                        ))}
                      </span>
                      {tableRows.map(tableRow => (
                        <span
                          key={tableRow.key}
                          className="grid gap-2 border-b border-[var(--ops-border-color)] px-3 py-2 text-[12px] last:border-b-0"
                          style={{ gridTemplateColumns: `minmax(96px, 0.8fr) repeat(${columns.length}, minmax(64px, 1fr))` }}
                        >
                          <span className="truncate text-[var(--ops-text-secondary)]">{tableRow.label}</span>
                          {columns.map((column, index) => (
                            <span key={column.key} className="truncate font-semibold text-[var(--ops-text-primary)]">
                              {tableRow.values[index] ?? '-'}
                            </span>
                          ))}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="border-y border-[var(--ops-border-color)] px-3 py-4 text-sm text-[var(--ops-text-secondary)]">
                      {state?.loading ? t('common.loading') : t('monitor.detail.metric.table.empty.copy')}
                    </span>
                  )}
                </button>
              </section>
            );
          })}
        </div>
      ) : (
        <RowList rows={[{ title: t('monitor.detail.metric.search.empty.title'), copy: t('monitor.detail.metric.search.empty.copy'), meta: '-' }]} />
      )}
    </div>
  );
}

function MonitorRealtimeTightSequence({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="monitor-detail-tab-sequence monitor-detail-tab-sequence--angular-tight space-y-2"
      data-monitor-detail-tab-sequence="angular-tight"
    >
      {children}
    </div>
  );
}

function MonitorBasicPlainSurface({
  monitor,
  editHref,
  t
}: {
  monitor: Monitor;
  editHref: string;
  t: Translator;
}) {
  return (
    <section
      className="monitor-detail-card monitor-detail-card--overview monitor-detail-card--overview-flat monitor-workbench-surface monitor-workbench-surface--plain min-h-[400px] min-w-0 grid content-start gap-3 rounded-[3px] border p-3 border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)]"
      data-monitor-basic-stage-surface="monitor-data-table"
      data-monitor-basic-grid-item="angular-first-card"
      data-monitor-basic-card-chrome="angular-card-box"
    >
      <header className="monitor-workbench-surface__header flex items-start justify-between gap-3 border-b border-[var(--ops-border-color)] pb-2">
        <div className="monitor-workbench-card-title__copy min-w-0">
          <div className="monitor-workbench-card-title__title text-[16px] font-semibold leading-6 text-[var(--ops-text-primary)]">
            {t('monitor.detail.basic')}
          </div>
        </div>
        <div className="monitor-workbench-surface__meta flex flex-none items-center gap-2">
          <a
            href={editHref}
            aria-label={t('monitor.edit-monitor')}
            className="monitor-workbench-surface__edit inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent text-[var(--ops-text-tertiary)] transition-colors hover:text-[var(--ops-text-primary)]"
            data-monitor-basic-edit-action="monitor-data-table"
            data-monitor-basic-edit-action-density="plain-icon"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>
      <MonitorSummaryCard monitor={monitor} formatTime={formatTime} t={t} />
    </section>
  );
}

export type MonitorSectionCompositionProps = {
  monitor: Monitor;
  editHref: string;
  params: Param[];
  selectedMetric: MonitorDetailMetric | null;
  metricSearch: string;
  metricRows: EvidenceRow[];
  metricCardPayloads: Record<string, MetricCardPayloadState | undefined>;
  metrics: MonitorDetailMetric[];
  favoriteNames: string[];
  favoriteJumpRows: MonitorFavoriteJumpRow[];
  selectedFavoriteKey: string | null;
  favoriteSurfaceMode: 'realtime' | 'history';
  selectedMetricKey: string | null;
  metricPayload: unknown;
  metricPayloadLoading: boolean;
  metricPayloadError: string | null;
  selectedMetricRowKey: string | null;
  metricTableMode: 'table' | 'detail';
  metricFullscreen: boolean;
  historyLoading: boolean;
  historyError: string | null;
  historyMetrics: MonitorHistoryMetricCatalogItem[];
  historyMetricSearch: string;
  historyRows: EvidenceRow[];
  selectedHistoryMetricKey: string | null;
  historySeriesSearch: string;
  historySeriesRows: EvidenceRow[];
  selectedHistorySeriesKey: string | null;
  selectedHistoryPointIndex: number | null;
  historyPayload: MonitorHistoryData | null;
  historyChartPayloads: Record<string, MonitorHistoryData | null | undefined>;
  historyChartLoadingKeys: string[];
  historyChartErrors: Record<string, string | undefined>;
  historyPayloadLoading: boolean;
  historyPayloadError: string | null;
  historyInterval: boolean;
  historyWindow: string;
  historyTimeContext?: TimeContext;
  historyWindows: Array<{ value: string; label: string }>;
  historyModes: Array<{ value: boolean; label: string }>;
  historyFullscreen: boolean;
  grafanaState: GrafanaDashboard;
  grafanaMessage: string | null;
  grafanaError: string | null;
  favoriteMessage: string | null;
  favoriteError: string | null;
  onMetricSearchChange: (value: string) => void;
  onSelectMetric: (key: string) => void;
  onToggleFavorite: (metricName: string) => Promise<void> | void;
  onSelectMetricRow: (key: string) => void;
  onMetricModeChange: (mode: 'table' | 'detail') => void;
  onMetricRefresh: () => void;
  onMetricFullscreenToggle: () => void;
  onHistoryMetricSearchChange: (value: string) => void;
  onSelectHistoryMetric: (key: string) => void;
  onToggleHistoryFavorite: (item: MonitorHistoryMetricCatalogItem) => Promise<void> | void;
  onHistorySeriesSearchChange: (value: string) => void;
  onSelectHistorySeries: (key: string) => void;
  onSelectHistoryPoint: (index: number) => void;
  onHistoryRefresh: () => void;
  onHistoryWindowChange: (value: string) => void;
  onHistoryTimeContextApply?: (context: TimeContext) => void;
  onApplyHistoryChartZoomTimeRange?: (context: TimeContext) => void;
  onHistoryModeChange: (value: boolean) => void;
  onHistoryFullscreenToggle: () => void;
  onSelectFavorite: (key: string) => void;
  onSetFavoriteSurfaceMode: (mode: 'realtime' | 'history') => void;
  onRemoveFavoriteToken: (token: string) => Promise<void> | void;
  onDeleteGrafanaDashboard: () => Promise<void> | void;
  t: Translator;
};

export function MonitorDetailSections(props: MonitorSectionCompositionProps): MonitorDetailSectionsOutput {
  const {
    monitor,
    editHref,
    metricRows,
    metricCardPayloads,
    favoriteJumpRows,
    favoriteSurfaceMode,
    selectedMetricKey,
    metricPayloadLoading,
    metricPayloadError,
    historyLoading,
    historyError,
    historyMetrics,
    historyRows,
    selectedHistoryMetricKey,
    historyChartPayloads,
    historyChartLoadingKeys,
    historyChartErrors,
    historyInterval,
    historyWindow,
    historyTimeContext,
    historyWindows,
    historyModes,
    grafanaState,
    grafanaMessage,
    grafanaError,
    favoriteMessage,
    favoriteError,
    onSelectMetric,
    onSelectHistoryMetric,
    onHistoryWindowChange,
    onHistoryTimeContextApply,
    onApplyHistoryChartZoomTimeRange,
    onHistoryModeChange,
    onHistoryRefresh,
    onSetFavoriteSurfaceMode,
    onDeleteGrafanaDashboard,
    t
  } = props;

  const realtimeFavoriteRows = favoriteJumpRows.filter(row => row.targetKind === 'realtime');
  const historyFavoriteRows = favoriteJumpRows.filter(row => row.targetKind === 'history');
  const historyMetricByKey = new Map(historyMetrics.map(item => [`${item.metrics}:${item.metric}`, item]));
  const historyChartItems = historyRows
    .map(row => historyMetrics.find(item => `${item.metrics}:${item.metric}` === row.key))
    .filter((item): item is MonitorHistoryMetricCatalogItem => Boolean(item))
    .slice(0, 6);
  const favoriteMetricRows = realtimeFavoriteRows.map(row => ({
    key: row.targetKey,
    title: row.title,
    copy: row.copy,
    meta: row.meta
  }));
  const favoriteHistoryChartItems = historyFavoriteRows
    .map(row => historyMetricByKey.get(row.targetKey))
    .filter((item): item is MonitorHistoryMetricCatalogItem => Boolean(item))
    .slice(0, 6);

  const contextNode = null;

  const realtimeNode = (
    <MonitorRealtimeTightSequence>
      <FlatStage
        title={t('monitor.detail.tab.realtime')}
        className="monitor-detail-stage--signals"
        header="hidden"
        rhythm="angular-tight"
      >
        {metricPayloadLoading ? (
          <div className="text-sm text-[var(--ops-text-secondary)]">{t('common.loading')}</div>
        ) : metricPayloadError ? (
          <div className="text-sm text-rose-300">{metricPayloadError}</div>
        ) : (
          null
        )}
        <MetricSignalList
          leadingCard={<MonitorBasicPlainSurface monitor={monitor} editHref={editHref} t={t} />}
          rows={metricRows}
          selectedKey={selectedMetricKey}
          payloads={metricCardPayloads}
          onSelectMetric={onSelectMetric}
          t={t}
        />
      </FlatStage>
    </MonitorRealtimeTightSequence>
  );

  const historyNode = (
    <div
      className="monitor-detail-history-cards"
      data-monitor-detail-history-layout="angular-chart-cards-only"
      data-monitor-detail-history-reference="apache-hertzbeat-master-cards"
    >
      {historyLoading ? (
        <div className="rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-4 py-8 text-sm text-[var(--ops-text-secondary)]">
          {t('common.loading')}
        </div>
      ) : historyError ? (
        <div className="rounded-[3px] border border-rose-400/20 bg-rose-400/10 px-4 py-8 text-sm text-rose-200">
          {historyError}
        </div>
      ) : (
        <MonitorHistoryChartGrid
          items={historyChartItems}
          payloads={historyChartPayloads}
          loadingKeys={historyChartLoadingKeys}
          errors={historyChartErrors}
          selectedKey={selectedHistoryMetricKey}
          aggregated={historyInterval}
          showControls={true}
          historyWindow={historyWindow}
          timeContext={historyTimeContext}
          historyWindows={historyWindows}
          historyModes={historyModes}
          onHistoryWindowChange={onHistoryWindowChange}
          onHistoryTimeContextApply={onHistoryTimeContextApply}
          onApplyChartZoomTimeRange={onApplyHistoryChartZoomTimeRange}
          onHistoryModeChange={onHistoryModeChange}
          onRefresh={onHistoryRefresh}
          onSelectMetric={onSelectHistoryMetric}
          formatTime={formatTime}
          t={t}
        />
      )}
    </div>
  );

  const favoritesNode = (
    <div
      className="favorite-content space-y-3 rounded-[3px] border border-[var(--ops-border-color)] bg-transparent p-2"
      data-monitor-detail-favorite-layout="angular-favorite-content"
      data-monitor-detail-favorite-mode={favoriteSurfaceMode}
    >
      <div className="favorite-selector" data-monitor-detail-favorite-selector="angular-select-200">
        <Select
          aria-label={t('monitor.detail.favorite')}
          value={favoriteSurfaceMode}
          containerClassName="w-[200px]"
          onChange={event => onSetFavoriteSurfaceMode(event.target.value as 'realtime' | 'history')}
        >
          <option value="realtime">{t('monitor.detail.realtime')}</option>
          <option value="history">{t('monitor.detail.history')}</option>
        </Select>
      </div>

      {favoriteSurfaceMode === 'realtime' ? (
        favoriteMetricRows.length > 0 ? (
          <div data-monitor-detail-favorite-realtime="cards-lists">
            <MetricSignalList
              rows={favoriteMetricRows}
              selectedKey={selectedMetricKey}
              payloads={metricCardPayloads}
              onSelectMetric={onSelectMetric}
              t={t}
            />
          </div>
        ) : (
          <div
            className="rounded-[3px] border border-dashed border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-5 py-10 text-sm text-[var(--ops-text-secondary)]"
            data-monitor-detail-favorite-empty="realtime"
          >
            {t('monitor.detail.favorite.surface.empty.realtime.title')}
          </div>
        )
      ) : favoriteHistoryChartItems.length > 0 ? (
        <div data-monitor-detail-favorite-history="cards">
          <MonitorHistoryChartGrid
            items={favoriteHistoryChartItems}
            payloads={historyChartPayloads}
            loadingKeys={historyChartLoadingKeys}
            errors={historyChartErrors}
            selectedKey={selectedHistoryMetricKey}
            aggregated={historyInterval}
            historyWindow={historyWindow}
            timeContext={historyTimeContext}
            onApplyChartZoomTimeRange={onApplyHistoryChartZoomTimeRange}
            onSelectMetric={onSelectHistoryMetric}
            formatTime={formatTime}
            t={t}
          />
        </div>
      ) : (
        <div
          className="rounded-[3px] border border-dashed border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-5 py-10 text-sm text-[var(--ops-text-secondary)]"
          data-monitor-detail-favorite-empty="history"
        >
          {t('monitor.detail.favorite.surface.empty.history.title')}
        </div>
      )}

      {favoriteMessage ? <div className="text-sm text-emerald-300">{favoriteMessage}</div> : null}
      {favoriteError ? <div className="text-sm text-rose-300">{favoriteError}</div> : null}
    </div>
  );

  const grafanaNode = (
    <div className="space-y-4">
      <FlatStage
        title={t('monitor.detail.section.grafana.title')}
        description={t('monitor.detail.grafana.copy')}
      >
        <RowList
          rows={[
            {
              title: t('monitor.detail.grafana.status'),
              copy: grafanaState.enabled ? t('common.enabled') : t('common.disabled'),
              meta: grafanaState.url || '-'
            }
          ]}
        />
        {grafanaState.enabled && grafanaState.url ? (
          <>
            <div className="overflow-hidden border-y border-[var(--ops-border-color)]">
              <iframe title="grafana-dashboard" src={grafanaState.url} className="h-[720px] w-full border-0" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="subtle" onClick={() => void onDeleteGrafanaDashboard()}>
                {t('monitor.detail.delete-grafana')}
              </Button>
            </div>
          </>
        ) : null}
        {grafanaMessage ? <div className="text-sm text-emerald-300">{grafanaMessage}</div> : null}
        {grafanaError ? <div className="text-sm text-rose-300">{grafanaError}</div> : null}
      </FlatStage>
    </div>
  );

  return buildMonitorDetailSections({
    contextNode,
    realtimeNode,
    historyNode,
    favoritesNode,
    grafanaNode
  } satisfies MonitorDetailSectionsInput);
}
