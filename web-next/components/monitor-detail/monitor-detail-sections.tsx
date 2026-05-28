import React from 'react';
import {
  HzActionGroup,
  HzButton,
  HzButtonLink,
  HzEmptyState,
  HzLoadingState,
  HzMonitorBasicCard,
  HzMonitorEvidenceFrame,
  HzMonitorFavoritePane,
  HzMonitorFavoriteSurface,
  HzMonitorDetailStage,
  HzMonitorDetailTabSequence,
  HzMonitorDetailSignalList,
  HzMonitorIncrementalLoadFooter,
  HzMonitorMetricCard,
  HzMonitorMetricCardGrid,
  HzMonitorMetricFavoriteAction,
  HzStateNotice
} from '@hertzbeat/ui';
import { MonitorHistoryChartGrid } from './monitor-history-chart-grid';
import { MonitorSummaryCard } from './monitor-summary-card';
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

function MetricSignalList({
  leadingCard,
  rows,
  selectedKey,
  payloads,
  favoriteNames,
  onSelectMetric,
  onToggleFavorite,
  visibleTotal,
  hasMore,
  onLoadMore,
  loadMoreLabel,
  completeLabel,
  incrementalMode = 'angular-sentinel',
  incrementalScope = 'realtime',
  t,
  ...signalListProps
}: {
  leadingCard?: React.ReactNode;
  rows: EvidenceRow[];
  selectedKey: string | null;
  payloads: Record<string, MetricCardPayloadState | undefined>;
  favoriteNames: string[];
  onSelectMetric: (key: string) => void;
  onToggleFavorite: (metricName: string) => Promise<void> | void;
  visibleTotal?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: React.ReactNode;
  completeLabel?: React.ReactNode;
  incrementalMode?: string;
  incrementalScope?: string;
  t: Translator;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <HzMonitorDetailSignalList
      {...signalListProps}
      data-monitor-detail-signal-list-owner="hertzbeat-ui-signal-list"
      data-monitor-detail-signal-grid="monitor-data-table"
      data-monitor-detail-signal-list-rhythm="shared-tight"
      data-monitor-detail-signal-list-geometry="shared-two-column-metric-cards"
      data-monitor-detail-realtime-payload-errors="card-local"
    >
      {rows.length > 0 ? (
        <HzMonitorMetricCardGrid
          data-monitor-detail-card-grid-rhythm="shared-tight"
          data-monitor-detail-realtime-card-flow="shared-metric-card-grid"
          data-monitor-detail-realtime-card-grid="basic-and-metrics"
          data-monitor-detail-realtime-reference="hertzbeat-ui-monitor-card-grid"
          data-monitor-detail-realtime-card-height="content-driven"
          data-monitor-detail-realtime-card-chrome="hertzbeat-ui-card-grid"
        >
          {leadingCard}
          {rows.map(row => {
            const selected = row.key === selectedKey;
            const state = payloads[row.key];
            const matrix = buildMonitorMetricTableMatrix(state?.payload, t);
            const columns = matrix.columns.slice(0, 3);
            const tableRows = matrix.rows.slice(0, 4);
            const favorited = favoriteNames.includes(row.key);
            return (
              <HzMonitorMetricCard
                key={row.key}
                title={row.title}
                columns={columns}
                rows={tableRows.map(tableRow => ({
                  key: tableRow.key,
                  label: tableRow.label,
                  values: columns.map((_, index) => tableRow.values[index] ?? '-')
                }))}
                selected={selected}
                loading={state?.loading}
                error={state?.error}
                loadingLabel={t('common.loading')}
                emptyLabel={t('monitor.detail.metric.table.empty.copy')}
                labelHeader={t('common.labels')}
                actions={
                  <HzMonitorMetricFavoriteAction
                    active={favorited}
                    label={favorited ? t('monitor.detail.favorite.remove') : t('monitor.detail.favorite.add')}
                    onClick={event => {
                      event.stopPropagation();
                      void onToggleFavorite(row.key);
                    }}
                    data-monitor-detail-signal-row-action="favorite"
                  />
                }
                onSelect={() => onSelectMetric(row.key)}
                data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"
                data-monitor-detail-signal-card="true"
                data-monitor-detail-signal-card-chrome="hertzbeat-ui-metric-card"
                data-monitor-detail-signal-row={row.key}
                data-monitor-detail-signal-row-density="shared-metric-card"
                data-monitor-detail-signal-selected-style="left-rail"
              />
            );
          })}
        </HzMonitorMetricCardGrid>
      ) : (
        <HzEmptyState
          title={t('monitor.detail.metric.search.empty.title')}
          description={t('monitor.detail.metric.search.empty.copy')}
          data-monitor-detail-empty-owner="hertzbeat-ui-empty-state"
          data-monitor-detail-empty-scope="metric-search"
        />
      )}
      {visibleTotal != null && visibleTotal > rows.length ? (
        <HzMonitorIncrementalLoadFooter
          visibleCount={rows.length}
          totalCount={visibleTotal}
          hasMore={hasMore}
          loadMoreLabel={loadMoreLabel ?? t('common.view-more')}
          completeLabel={completeLabel}
          onLoadMore={onLoadMore}
          data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
          data-monitor-detail-incremental-mode={incrementalMode}
          data-monitor-detail-incremental-scope={incrementalScope}
        />
      ) : null}
    </HzMonitorDetailSignalList>
  );
}

function MonitorBasicSharedSurface({
  monitor,
  editHref,
  t
}: {
  monitor: Monitor;
  editHref: string;
  t: Translator;
}) {
  return (
    <HzMonitorBasicCard
      heading={t('monitor.detail.basic')}
      editHref={editHref}
      editLabel={t('monitor.edit-monitor')}
      data-monitor-basic-owner="hertzbeat-ui-basic-card"
    >
      <MonitorSummaryCard monitor={monitor} formatTime={formatTime} t={t} />
    </HzMonitorBasicCard>
  );
}

export type MonitorSectionCompositionProps = {
  monitor: Monitor;
  editHref: string;
  params: Param[];
  selectedMetric: MonitorDetailMetric | null;
  metricSearch: string;
  metricRows: EvidenceRow[];
  realtimeMetricTotalCount: number;
  realtimeMetricHasMore: boolean;
  metricCardPayloads: Record<string, MetricCardPayloadState | undefined>;
  metrics: MonitorDetailMetric[];
  favoriteNames: string[];
  favoriteJumpRows: MonitorFavoriteJumpRow[];
  selectedFavoriteKey: string | null;
  favoriteSurfaceMode: 'realtime' | 'history';
  favoriteRealtimeMetricVisibleCount: number;
  favoriteRealtimeMetricTotalCount: number;
  favoriteRealtimeMetricHasMore: boolean;
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
  historyChartVisibleCount: number;
  historyChartTotalCount: number;
  historyChartHasMore: boolean;
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
  favoriteHistoryChartVisibleCount: number;
  favoriteHistoryChartTotalCount: number;
  favoriteHistoryChartHasMore: boolean;
  grafanaState: GrafanaDashboard;
  grafanaMessage: string | null;
  grafanaError: string | null;
  favoriteMessage: string | null;
  favoriteError: string | null;
  onMetricSearchChange: (value: string) => void;
  onSelectMetric: (key: string) => void;
  onToggleFavorite: (metricName: string) => Promise<void> | void;
  onLoadMoreRealtimeMetrics: () => void;
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
  onFavoriteHistoryRefresh: () => void;
  onLoadMoreHistoryCharts: () => void;
  onHistoryWindowChange: (value: string) => void;
  onHistoryTimeContextApply?: (context: TimeContext) => void;
  onApplyHistoryChartZoomTimeRange?: (context: TimeContext) => void;
  onHistoryModeChange: (value: boolean) => void;
  onHistoryFullscreenToggle: () => void;
  onSelectFavorite: (key: string) => void;
  onSetFavoriteSurfaceMode: (mode: 'realtime' | 'history') => void;
  onLoadMoreFavoriteRealtimeMetrics: () => void;
  onLoadMoreFavoriteHistoryCharts: () => void;
  onRemoveFavoriteToken: (token: string) => Promise<void> | void;
  onDeleteGrafanaDashboard: () => Promise<void> | void;
  t: Translator;
};

export function MonitorDetailSections(props: MonitorSectionCompositionProps): MonitorDetailSectionsOutput {
  const {
    monitor,
    editHref,
    metricRows,
    realtimeMetricTotalCount,
    realtimeMetricHasMore,
    metricCardPayloads,
    favoriteNames,
    favoriteJumpRows,
    favoriteSurfaceMode,
    favoriteRealtimeMetricVisibleCount,
    favoriteRealtimeMetricTotalCount,
    favoriteRealtimeMetricHasMore,
    selectedMetricKey,
    metricPayloadLoading,
    metricPayloadError,
    historyLoading,
    historyError,
    historyMetrics,
    historyRows,
    historyChartVisibleCount,
    historyChartTotalCount,
    historyChartHasMore,
    selectedHistoryMetricKey,
    historyChartPayloads,
    historyChartLoadingKeys,
    historyChartErrors,
    historyInterval,
    historyWindow,
    historyTimeContext,
    historyWindows,
    historyModes,
    favoriteHistoryChartVisibleCount,
    favoriteHistoryChartTotalCount,
    favoriteHistoryChartHasMore,
    grafanaState,
    grafanaMessage,
    grafanaError,
    favoriteMessage,
    favoriteError,
    onSelectMetric,
    onToggleFavorite,
    onLoadMoreRealtimeMetrics,
    onSelectHistoryMetric,
    onToggleHistoryFavorite,
    onHistoryWindowChange,
    onHistoryTimeContextApply,
    onApplyHistoryChartZoomTimeRange,
    onHistoryModeChange,
    onHistoryRefresh,
    onFavoriteHistoryRefresh,
    onLoadMoreHistoryCharts,
    onSetFavoriteSurfaceMode,
    onLoadMoreFavoriteRealtimeMetrics,
    onLoadMoreFavoriteHistoryCharts,
    onDeleteGrafanaDashboard,
    t
  } = props;

  const realtimeFavoriteRows = favoriteJumpRows.filter(row => row.targetKind === 'realtime');
  const historyFavoriteRows = favoriteJumpRows.filter(row => row.targetKind === 'history');
  const historyMetricByKey = new Map(historyMetrics.map(item => [`${item.metrics}:${item.metric}`, item]));
  const historyChartItems = historyRows
    .map(row => historyMetrics.find(item => `${item.metrics}:${item.metric}` === row.key))
    .filter((item): item is MonitorHistoryMetricCatalogItem => Boolean(item))
    .slice(0, historyChartVisibleCount);
  const visibleRealtimeFavoriteRows = realtimeFavoriteRows.slice(0, favoriteRealtimeMetricVisibleCount);
  const favoriteMetricRows = visibleRealtimeFavoriteRows.map(row => ({
    key: row.targetKey,
    title: row.title,
    copy: row.copy,
    meta: row.meta
  }));
  const favoriteHistoryChartItems = historyFavoriteRows
    .map(row => historyMetricByKey.get(row.targetKey))
    .filter((item): item is MonitorHistoryMetricCatalogItem => Boolean(item))
    .slice(0, favoriteHistoryChartVisibleCount);
  const renderFavoriteFeedback = (scope: 'realtime' | 'history') => {
    if (favoriteMessage) {
      return (
        <HzStateNotice
          tone="success"
          title={favoriteMessage}
          variant="embedded"
          data-monitor-detail-favorite-feedback="success"
          data-monitor-detail-favorite-feedback-scope={scope}
          data-monitor-detail-favorite-feedback-copy="angular-favorite-copy"
        />
      );
    }
    if (favoriteError) {
      return (
        <HzStateNotice
          tone="critical"
          title={favoriteError}
          variant="embedded"
          data-monitor-detail-favorite-feedback="error"
          data-monitor-detail-favorite-feedback-scope={scope}
          data-monitor-detail-favorite-feedback-copy="angular-favorite-copy"
        />
      );
    }
    return null;
  };

  const contextNode = null;

  const realtimeNode = (
    <HzMonitorDetailTabSequence data-monitor-detail-tab-sequence-owner="hertzbeat-ui-detail-tab-sequence">
      <HzMonitorDetailStage
        title={t('monitor.detail.tab.realtime')}
        header="hidden"
        rhythm="tight"
        data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"
      >
        {renderFavoriteFeedback('realtime')}
        <MetricSignalList
          leadingCard={<MonitorBasicSharedSurface monitor={monitor} editHref={editHref} t={t} />}
          rows={metricRows}
          selectedKey={selectedMetricKey}
          payloads={metricCardPayloads}
          favoriteNames={favoriteNames}
          onSelectMetric={onSelectMetric}
          onToggleFavorite={onToggleFavorite}
          visibleTotal={realtimeMetricTotalCount}
          hasMore={realtimeMetricHasMore}
          onLoadMore={onLoadMoreRealtimeMetrics}
          loadMoreLabel={t('common.view-more')}
          data-monitor-detail-realtime-selection-reset="angular-table-reload"
          t={t}
        />
      </HzMonitorDetailStage>
    </HzMonitorDetailTabSequence>
  );

  const historyNode = (
    <div
      className="monitor-detail-history-charts"
      data-monitor-detail-history-layout="hertzbeat-ui-history-chart-grid"
      data-monitor-detail-history-reference="hertzbeat-ui-history-chart-grid"
    >
      {renderFavoriteFeedback('history')}
      {historyLoading ? (
        <HzLoadingState
          title={t('common.loading')}
          rows={4}
          data-monitor-detail-state-owner="hertzbeat-ui-loading-state"
          data-monitor-detail-state-scope="history"
        />
      ) : historyError ? (
        <HzStateNotice
          tone="critical"
          title={t('common.load-failed')}
          description={historyError}
          data-monitor-detail-state-owner="hertzbeat-ui-state-notice"
          data-monitor-detail-state-scope="history"
        />
      ) : (
        <>
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
            favoriteNames={favoriteNames}
            onToggleFavorite={onToggleHistoryFavorite}
            formatTime={formatTime}
            t={t}
          />
          {historyChartTotalCount > historyChartItems.length ? (
            <HzMonitorIncrementalLoadFooter
              visibleCount={historyChartItems.length}
              totalCount={historyChartTotalCount}
              hasMore={historyChartHasMore}
              loadMoreLabel={t('common.view-more')}
              onLoadMore={onLoadMoreHistoryCharts}
              data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
              data-monitor-detail-incremental-mode="angular-chart-sentinel"
              data-monitor-detail-incremental-scope="history"
            />
          ) : null}
        </>
      )}
    </div>
  );

  const favoritesNode = (
    <HzMonitorFavoriteSurface
      value={favoriteSurfaceMode}
      options={[
        { value: 'realtime', label: t('monitor.detail.realtime') },
        { value: 'history', label: t('monitor.detail.history') }
      ]}
      selectorLabel={t('monitor.detail.favorite')}
      onValueChange={value => onSetFavoriteSurfaceMode(value as 'realtime' | 'history')}
      message={favoriteMessage}
      error={favoriteError}
      data-monitor-detail-favorite-owner="hertzbeat-ui-favorite-surface"
      data-monitor-detail-favorite-layout="hertzbeat-ui-favorite-surface"
      data-monitor-detail-favorite-mode={favoriteSurfaceMode}
      data-monitor-detail-favorite-feedback-copy="angular-favorite-copy"
      data-monitor-detail-favorite-set-semantics="angular-set"
      data-monitor-detail-favorite-active-fallback="angular-subselector-sticky"
      data-monitor-detail-favorite-history-reload-reset="angular-chart-reload"
      data-monitor-detail-favorite-empty-contract="angular-subselector-empty"
      data-monitor-detail-favorite-realtime-incremental="angular-favorite-sentinel"
      selectorProps={{ 'data-monitor-detail-favorite-selector': 'hertzbeat-ui-select-menu' } as React.HTMLAttributes<HTMLDivElement>}
    >
      {favoriteSurfaceMode === 'realtime' ? (
        favoriteMetricRows.length > 0 ? (
          <HzMonitorFavoritePane kind="realtime" data-monitor-detail-favorite-realtime="shared-pane">
            <MetricSignalList
              rows={favoriteMetricRows}
              selectedKey={selectedMetricKey}
              payloads={metricCardPayloads}
              favoriteNames={favoriteNames}
              onSelectMetric={onSelectMetric}
              onToggleFavorite={onToggleFavorite}
              data-monitor-detail-realtime-selection-reset="angular-table-reload"
              visibleTotal={favoriteRealtimeMetricTotalCount}
              hasMore={favoriteRealtimeMetricHasMore}
              onLoadMore={onLoadMoreFavoriteRealtimeMetrics}
              loadMoreLabel={t('common.view-more')}
              incrementalMode="angular-favorite-sentinel"
              incrementalScope="favorite-realtime"
              t={t}
            />
          </HzMonitorFavoritePane>
        ) : (
          <HzEmptyState
            title={t('monitor.detail.favorite.surface.empty.realtime.title')}
            data-monitor-detail-empty-owner="hertzbeat-ui-empty-state"
            data-monitor-detail-empty-scope="favorite-realtime"
            data-monitor-detail-favorite-empty-teardown="angular-empty-no-sentinel"
          />
        )
      ) : favoriteHistoryChartItems.length > 0 ? (
        <HzMonitorFavoritePane
          kind="history"
          data-monitor-detail-favorite-history="shared-pane"
          data-monitor-detail-favorite-history-source="favorite-history-chart-payloads"
          data-monitor-detail-favorite-history-controls="angular-chart-toolbox"
        >
          <MonitorHistoryChartGrid
            items={favoriteHistoryChartItems}
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
            onRefresh={onFavoriteHistoryRefresh}
            onSelectMetric={onSelectHistoryMetric}
            favoriteNames={favoriteNames}
            onToggleFavorite={onToggleHistoryFavorite}
            formatTime={formatTime}
            t={t}
          />
          {favoriteHistoryChartTotalCount > favoriteHistoryChartItems.length ? (
            <HzMonitorIncrementalLoadFooter
              visibleCount={favoriteHistoryChartItems.length}
              totalCount={favoriteHistoryChartTotalCount}
              hasMore={favoriteHistoryChartHasMore}
              loadMoreLabel={t('common.view-more')}
              onLoadMore={onLoadMoreFavoriteHistoryCharts}
              data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
              data-monitor-detail-incremental-mode="angular-favorite-chart-sentinel"
              data-monitor-detail-incremental-scope="favorite-history"
            />
          ) : null}
        </HzMonitorFavoritePane>
      ) : (
        <HzEmptyState
          title={t('monitor.detail.favorite.surface.empty.history.title')}
          data-monitor-detail-empty-owner="hertzbeat-ui-empty-state"
          data-monitor-detail-empty-scope="favorite-history"
          data-monitor-detail-favorite-empty-teardown="angular-empty-no-sentinel"
        />
      )}
    </HzMonitorFavoriteSurface>
  );

  const grafanaNode = (
    <HzMonitorDetailStage
      title={t('monitor.detail.section.grafana.title')}
      description={t('monitor.detail.grafana.copy')}
      data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"
      data-monitor-detail-grafana-layout-owner="hertzbeat-ui-detail-stage"
      data-monitor-detail-grafana-action-contract="angular-edit-config-delete-dashboard"
    >
      <HzStateNotice
        tone={grafanaState.enabled ? 'success' : 'neutral'}
        title={t('monitor.detail.grafana.status')}
        description={grafanaState.enabled ? t('common.enabled') : t('common.disabled')}
        meta={grafanaState.url || '-'}
        variant="embedded"
        data-monitor-detail-grafana-status-owner="hertzbeat-ui-state-notice"
      />
      {grafanaState.enabled && grafanaState.url ? (
        <>
          <HzMonitorEvidenceFrame
            variant="media"
            data-monitor-detail-grafana-frame-owner="hertzbeat-ui-evidence-frame"
          >
            <iframe title="grafana-dashboard" src={grafanaState.url} />
          </HzMonitorEvidenceFrame>
          <HzActionGroup
            density="inline"
            data-monitor-detail-grafana-actions-owner="hertzbeat-ui-action-group"
            data-monitor-detail-grafana-actions-contract="angular-dashboard-actions"
          >
            <HzButtonLink
              href={editHref}
              size="sm"
              data-monitor-detail-grafana-config-owner="hertzbeat-ui-button-link"
              data-monitor-detail-grafana-config-action="monitor-edit-grafana"
            >
              {t('monitor.detail.grafana.configure')}
            </HzButtonLink>
            <HzButton
              intent="danger"
              size="sm"
              onClick={() => void onDeleteGrafanaDashboard()}
              data-monitor-detail-grafana-delete-owner="hertzbeat-ui-button"
              data-monitor-detail-grafana-delete-action="delete-dashboard"
            >
              {t('monitor.detail.delete-grafana')}
            </HzButton>
          </HzActionGroup>
        </>
      ) : null}
      {grafanaMessage ? (
        <HzStateNotice
          tone="success"
          title={grafanaMessage}
          variant="embedded"
          data-monitor-detail-state-owner="hertzbeat-ui-state-notice"
          data-monitor-detail-state-scope="grafana-success"
          data-monitor-detail-grafana-delete-teardown="angular-hide-tab"
        />
      ) : null}
      {grafanaError ? (
        <HzStateNotice
          tone="critical"
          title={t('common.delete-failed')}
          description={grafanaError}
          variant="embedded"
          data-monitor-detail-state-owner="hertzbeat-ui-state-notice"
          data-monitor-detail-state-scope="grafana-error"
        />
      ) : null}
    </HzMonitorDetailStage>
  );

  return buildMonitorDetailSections({
    contextNode,
    realtimeNode,
    historyNode,
    favoritesNode,
    grafanaNode
  } satisfies MonitorDetailSectionsInput);
}
