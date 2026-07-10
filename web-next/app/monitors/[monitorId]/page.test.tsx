import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/monitor-detail-page.tsx'), 'utf8');
const sectionsSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');
const consoleSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');
const chartGridSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-history-chart-grid.tsx'), 'utf8');

describe('MonitorDetailPage route contract', () => {
  it('routes monitor detail through the shared HertzBeat console and section owner', () => {
    expect(source).toContain('MonitorDetailConsole');
    expect(source).toContain('MonitorDetailSections');
    expect(source).toContain('loadMonitorDetailBundleFromFacade');
    expect(source).toContain('useQueryClient');
    expect(source).toContain('queryClient.fetchQuery({');
    expect(source).toContain('queryKey: queryKeys.monitors.detail(monitorId)');
    expect(source).toContain('staleTime: 5000');
    expect(source).toContain('api.monitors.detail<MonitorDetailResponse>');
    expect(source).toContain('api.monitors.grafanaDashboard');
    expect(source).toContain('api.monitors.favoriteMetrics');
    expect(source).not.toContain('loadMonitorDetailBundle(apiMessageGet, monitorId)');
    expect(source).not.toContain("import { apiMessageDelete, apiMessageGet, apiMessagePost } from '@/lib/api-client';");
    expect(source).not.toContain('buildMonitorWorkbenchSummaryFacts');
    expect(source).not.toContain("const historyChartSummaryCount = currentTab === 'history' ? historyMetrics.length : 0;");
    expect(source).toContain('historyChartPayloads');
    expect(source).toContain('historyChartLoadingKeys');
    expect(source).toContain('historyChartErrors');
    expect(chartGridSource).toContain("data-monitor-history-panel-state': hasHistorySeries ? 'series-ready' : 'history-store-empty'");
    expect(chartGridSource).toContain("emptyTitle={t('monitor.detail.history.blocker.title')}");
    expect(chartGridSource).toContain("emptyDescription={t('monitor.detail.history.blocker.copy')}");
    expect(uiSource).toContain('data-hz-metric-timeseries-state="empty"');
    expect(source).toContain('const displayedHistoryChartItems = useMemo(');
    expect(source).toContain('filteredHistoryMetrics.slice(0, visibleHistoryChartCount)');
    expect(source).toContain('start: historyTimeContext.start');
    expect(source).toContain('end: historyTimeContext.end');
    expect(source).toContain('onApplyHistoryChartZoomTimeRange: handleApplyHistoryTimeContext');
    expect(source).toContain('historyChartPayloads,');
    expect(source).not.toContain('workbenchSummaryFacts={workbenchSummaryFacts}');
    expect(source).toContain('editHref,');
    expect(source).not.toContain('buildMonitorDetailFacts(monitor');
  });

  it('invalidates the monitor detail React Query data after mutable detail actions', () => {
    expect(source).toContain('const invalidateMonitorDetailQuery = useCallback(');
    expect(source).toContain('queryClient.invalidateQueries({ queryKey: queryKeys.monitors.detail(monitor.id) })');
    expect(source).toContain('void invalidateMonitorDetailQuery();');
    expect(source).toContain('addMonitorFavoriteFromFacade(api.monitors.addFavoriteMetric, monitor.id, metricName)');
    expect(source).toContain('removeMonitorFavoriteFromFacade(api.monitors.removeFavoriteMetric, monitor.id, metricName)');
    expect(source).toContain('removeMonitorFavoriteFromFacade(api.monitors.removeFavoriteMetric, monitor.id, token)');
    expect(source).toContain('deleteMonitorGrafanaDashboardFromFacade(api.monitors.deleteGrafanaDashboard, monitor.id)');
  });

  it('keeps monitor history time range synchronized with the platform from/to route contract', () => {
    expect(source).toContain('useRouter');
    expect(source).toContain('const searchParamString = searchParams.toString();');
    expect(source).toContain('parseTimeContextFromParams(new URLSearchParams(searchParamString))');
    expect(source).toContain('[searchParamString]');
    expect(source).not.toContain('parseTimeContextFromParams(searchParams)');
    expect(source).toContain('resolveAppliedTimeContext');
    expect(source).toContain('timeRangeToExpressionRange');
    expect(source).toContain('timeRangeToTimeWindow');
    expect(source).toContain('timeWindowToTimeRange');
    expect(source).toContain('function resolveMonitorHistoryWindow(');
    expect(source).not.toContain('function timeRangeToExpressionFrom(');
    expect(source).not.toContain('function historyWindowToTimeRange(');
    expect(source).not.toContain('function timeRangeToHistoryWindow(');
    expect(source).toContain('buildMonitorHistoryTimeRoute');
    expect(source).toContain('router.replace(route);');
    expect(source).toContain('function replaceMonitorHistoryTimeRoute(context: TimeContext) {');
    expect(source).toContain("window.history.replaceState(window.history.state, '', route);");
    expect(source).toContain('historyTimeContext.from');
    expect(source).toContain('historyTimeContext.to');
    expect(source).toContain('historyTimeContext.timezone');
  });

  it('keeps hidden monitor detail tabs from loading unrelated metric payloads', () => {
    expect(source).toContain(
      "const shouldLoadRealtimeMetrics = currentTab === 'realtime' || (currentTab === 'favorites' && favoriteSurfaceMode === 'realtime');"
    );
    expect(source).toContain(
      "const shouldLoadHistoryCatalog = currentTab === 'history' || (currentTab === 'favorites' && favoriteSurfaceMode === 'history');"
    );
    expect(source).toContain(
      "const shouldLoadHistoryPayloads = currentTab === 'history' || (currentTab === 'favorites' && favoriteSurfaceMode === 'history');"
    );
    expect(source).toContain("if (!shouldLoadRealtimeMetrics) {");
    expect(source).toContain('if (!shouldLoadHistoryCatalog) return;');
    expect(source).toContain("if (!shouldLoadHistoryPayloads || !selectedHistoryMetric) {");
    expect(source).toContain('[displayedMetricNameKey, metricReloadToken, monitor.id, shouldLoadRealtimeMetrics, t]');
    expect(source).toContain('[historyCatalogReloadToken, monitor, shouldLoadHistoryCatalog, t]');
    expect(source).toContain('shouldLoadHistoryPayloads,');
    expect(consoleSource).toContain('data-monitor-detail-history-catalog-load="angular-tab-click-lazy"');
    expect(consoleSource).toContain('data-monitor-detail-realtime-tab-load="angular-click-load-real-time-metric"');
  });

  it('reloads favorite tab payloads through the active Angular favorite subselector', () => {
    expect(source).toContain("const shouldLoadChartGrid = currentTab === 'history' || (currentTab === 'favorites' && favoriteSurfaceMode === 'history');");
    expect(source).toContain("currentTab === 'favorites' && favoriteSurfaceMode === 'history'");
    expect(source).toContain('const favoriteHistoryCatalogItemKey = favoriteHistoryCatalogItems.map');
    expect(source).toContain('? favoriteHistoryChartItems');
    expect(source).toContain('const favoriteHistoryChartItemKey = favoriteHistoryChartItems.map');
    expect(source).toContain("if (currentTab !== 'favorites' || favoriteSurfaceMode !== 'history') return;");
    expect(source).toContain('setSelectedHistoryMetricKey(first ? `${first.metrics}:${first.metric}` : null);');
    expect(source).toContain('setSelectedHistorySeriesKey(null);');
    expect(source).toContain('setSelectedHistoryPointIndex(null);');
    expect(source).toContain('setHistoryPayload(null);');
    expect(source).toContain('setFavoriteReloadToken(prev => prev + 1);');
    expect(source).toContain("if (favoriteSurfaceMode === 'history') {");
    expect(source).toContain('resetHistoryInvestigationSelection(favoriteHistoryCatalogItems);');
    expect(source).toContain('setHistoryReloadToken(prev => prev + 1);');
    expect(source).toContain('setMetricReloadToken(prev => prev + 1);');
    expect(source).toContain("if (tab === 'favorites') {");
    expect(source).toContain('setVisibleFavoriteRealtimeMetricCount(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);');
    expect(source).toContain('setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);');
    expect(consoleSource).toContain('data-monitor-detail-favorite-tab-load="angular-click-load-favorite-metrics"');
    expect(sectionsSource).toContain('data-monitor-detail-favorite-history-reload-reset="angular-chart-reload"');
    expect(sectionsSource).toContain('data-monitor-detail-favorite-history-source="favorite-history-chart-payloads"');
  });

  it('keeps favorite history chart controls available like Angular monitor-data-chart toolboxes', () => {
    expect(source).toContain('function handleFavoriteHistoryRefresh() {');
    expect(source).toContain('setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);');
    expect(source).toContain('setFavoriteReloadToken(prev => prev + 1);');
    expect(source).toContain('setHistoryReloadToken(prev => prev + 1);');
    expect(source).toContain('onFavoriteHistoryRefresh: handleFavoriteHistoryRefresh');
    expect(sectionsSource).toContain('data-monitor-detail-favorite-history-controls="angular-chart-toolbox"');
    expect(sectionsSource).toContain('onRefresh={onFavoriteHistoryRefresh}');
  });

  it('keeps history and favorite chart grids incrementally reachable like Angular sentinels', () => {
    expect(source).toContain('const MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE = 6;');
    expect(source).toContain('const [visibleHistoryChartCount, setVisibleHistoryChartCount] = useState(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);');
    expect(source).toContain(
      'const [visibleFavoriteHistoryChartCount, setVisibleFavoriteHistoryChartCount] = useState(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);'
    );
    expect(source).toContain('filteredHistoryMetrics.slice(0, visibleHistoryChartCount)');
    expect(source).toContain('const favoriteHistoryCatalogItems = useMemo(');
    expect(source).toContain('() => favoriteHistoryCatalogItems.slice(0, visibleFavoriteHistoryChartCount)');
    expect(source).toContain('setVisibleHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);');
    expect(source).toContain('setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);');
    expect(source).toContain('historyChartVisibleCount: visibleHistoryChartCount');
    expect(source).toContain('favoriteHistoryChartVisibleCount: visibleFavoriteHistoryChartCount');
    expect(source).toContain('onLoadMoreHistoryCharts: () =>');
    expect(source).toContain('onLoadMoreFavoriteHistoryCharts: () =>');
    expect(source).not.toContain('filterMonitorHistoryMetricCatalog(historyMetrics, historyMetricSearch).slice(0, 6)');
    expect(sectionsSource).toContain('data-monitor-detail-incremental-mode="angular-chart-sentinel"');
    expect(sectionsSource).toContain('data-monitor-detail-incremental-mode="angular-favorite-chart-sentinel"');
  });

  it('keeps favorite realtime metrics incrementally reachable like Angular favoriteMetricsLoadSentinel', () => {
    expect(source).toContain('const MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE = 6;');
    expect(source).toContain(
      'const [visibleFavoriteRealtimeMetricCount, setVisibleFavoriteRealtimeMetricCount] = useState(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);'
    );
    expect(source).toContain("const favoriteRealtimeRows = useMemo(() => favoriteJumpRows.filter(row => row.targetKind === 'realtime'), [favoriteJumpRows]);");
    expect(source).toContain('const favoriteRealtimeMetricHasMore = visibleFavoriteRealtimeMetricCount < favoriteRealtimeRows.length;');
    expect(source).toContain('setVisibleFavoriteRealtimeMetricCount(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);');
    expect(source).toContain('favoriteRealtimeMetricVisibleCount: visibleFavoriteRealtimeMetricCount');
    expect(source).toContain('favoriteRealtimeMetricTotalCount: favoriteRealtimeRows.length');
    expect(source).toContain('favoriteRealtimeMetricHasMore,');
    expect(source).toContain('onLoadMoreFavoriteRealtimeMetrics: () =>');
    expect(sectionsSource).toContain('visibleRealtimeFavoriteRows = realtimeFavoriteRows.slice(0, favoriteRealtimeMetricVisibleCount)');
    expect(sectionsSource).toContain('incrementalMode="angular-favorite-sentinel"');
    expect(sectionsSource).toContain('incrementalScope="favorite-realtime"');
  });

  it('resets history chart pagination when the shared history toolbar refreshes like Angular loadMetricChart', () => {
    expect(source).toContain('api.monitors.warehouseStorageStatus');
    expect(source).toContain('api.monitors.historyMetricCatalogDefine');
    expect(source).toContain(
      'loadMonitorHistoryMetricCatalogFromFacade(api.monitors.warehouseStorageStatus, api.monitors.historyMetricCatalogDefine, monitor)'
    );
    expect(source).not.toContain('loadMonitorHistoryMetricCatalog(apiMessageGet, monitor)');
    expect(source).toContain('const [historyCatalogReloadToken, setHistoryCatalogReloadToken] = useState(0);');
    expect(source).toContain('[historyCatalogReloadToken, monitor, shouldLoadHistoryCatalog, t]');
    expect(source).toContain("if (tab === 'history') {");
    expect(source).toContain('resetHistoryInvestigationSelection(filteredHistoryMetrics);');
    expect(source).toContain('setHistoryCatalogReloadToken(prev => prev + 1);');
    expect(source).toContain('function handleHistoryRefresh() {');
    expect(source).toContain('setVisibleHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);');
    expect(source).toContain('setHistoryReloadToken(prev => prev + 1);');
    expect(source).toContain('onHistoryRefresh: handleHistoryRefresh');
    expect(source).not.toContain('onHistoryRefresh: () => setHistoryReloadToken(prev => prev + 1)');
    expect(consoleSource).toContain('data-monitor-detail-history-tab-load="angular-click-load-metric-chart"');
  });

  it('resets history investigation selection on chart reload and time changes like stateless Angular charts', () => {
    expect(source).toContain('api.monitors.historyMetric');
    expect(source).toContain('queryKeys.monitors.history');
    expect(source).not.toContain('queryKeys.dashboard.panel');
    expect(source).not.toContain('monitorDetailDashboardTemplate.id');
    expect(source).toContain('const readMonitorHistoryMetricPanelData = useCallback(');
    expect(source).toContain('readMonitorHistoryMetricPanelData(selectedHistoryMetric)');
    expect(source).toContain('readMonitorHistoryMetricPanelData(item)');
    expect(source).toContain('loadMonitorHistoryMetricDataFromFacade(api.monitors.historyMetric, monitor, item, {');
    expect(source).not.toContain('loadMonitorHistoryMetricData(apiMessageGet, monitor');
    expect(source).toContain('const resetHistoryInvestigationSelection = useCallback((items: MonitorHistoryMetricCatalogItem[] = filteredHistoryMetrics) => {');
    expect(source).toContain('const first = items[0];');
    expect(source).toContain('setSelectedHistoryMetricKey(first ? `${first.metrics}:${first.metric}` : null);');
    expect(source).toContain('setSelectedHistorySeriesKey(null);');
    expect(source).toContain('setSelectedHistoryPointIndex(null);');
    expect(source).toContain('setHistoryPayload(null);');
    expect(source).toContain('setHistoryPayloadError(null);');
    expect(source).toContain('resetActiveHistoryInvestigationSelection();');
    expect(source).toContain('function handleHistoryModeChange(value: boolean) {');
    expect(source).toContain('function handleSelectHistoryMetricKey(key: string) {');
    expect(source).toContain('resetHistoryInvestigationSelection(filteredHistoryMetrics);');
    expect(source).toContain('resetHistoryInvestigationSelection(favoriteHistoryCatalogItems);');
    expect(source).toContain('onSelectHistoryMetric: handleSelectHistoryMetricKey');
    expect(source).toContain('onHistoryModeChange: handleHistoryModeChange');
    expect(source).not.toContain('onSelectHistoryMetric: setSelectedHistoryMetricKey');
    expect(source).not.toContain('onHistoryModeChange: setHistoryInterval');
    expect(chartGridSource).toContain('data-monitor-history-selection-reset="angular-chart-reload"');
  });

  it('keeps realtime metrics incrementally reachable instead of truncating the Angular metric catalog', () => {
    expect(source).toContain('api.monitors.realtimeMetric');
    expect(source).toContain('loadMonitorRealtimeMetricDataFromFacade(api.monitors.realtimeMetric, monitor.id, name)');
    expect(source).toContain('loadMonitorRealtimeMetricDataFromFacade(api.monitors.realtimeMetric, monitor.id, selectedMetric.name)');
    expect(source).not.toContain('loadMonitorRealtimeMetricData(apiMessageGet, String(monitor.id)');
    expect(source).toContain('const MONITOR_DETAIL_REALTIME_PAGE_SIZE = 10;');
    expect(source).toContain('const [visibleRealtimeMetricCount, setVisibleRealtimeMetricCount] = useState(MONITOR_DETAIL_REALTIME_PAGE_SIZE);');
    expect(source).toContain('const displayedMetrics = filteredMetrics.slice(0, visibleRealtimeMetricCount);');
    expect(source).toContain('const realtimeMetricHasMore = visibleRealtimeMetricCount < filteredMetrics.length;');
    expect(source).toContain('setVisibleRealtimeMetricCount(MONITOR_DETAIL_REALTIME_PAGE_SIZE);');
    expect(source).toContain('realtimeMetricTotalCount: filteredMetrics.length');
    expect(source).toContain('realtimeMetricHasMore,');
    expect(source).toContain('onLoadMoreRealtimeMetrics: () =>');
    expect(source).not.toContain('const displayedMetrics = filteredMetrics.slice(0, 10);');
    expect(sectionsSource).toContain('HzMonitorIncrementalLoadFooter');
    expect(sectionsSource).toContain('data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"');
    expect(sectionsSource).toContain("incrementalMode = 'angular-sentinel'");
  });

  it('keeps realtime metric payload failures scoped to each Angular-style card', () => {
    const realtimeStart = sectionsSource.indexOf('const realtimeNode = (');
    const historyStart = sectionsSource.indexOf('const historyNode = (', realtimeStart);
    const realtimeSource = sectionsSource.slice(realtimeStart, historyStart);
    const signalListSource = sectionsSource.slice(
      sectionsSource.indexOf('function MetricSignalList'),
      sectionsSource.indexOf('function MonitorBasicSharedSurface')
    );

    expect(signalListSource).toContain('data-monitor-detail-realtime-payload-errors="card-local"');
    expect(realtimeSource).toContain('metricCardPayloads');
    expect(realtimeSource).not.toContain('metricPayloadError ?');
    expect(realtimeSource).not.toContain('data-monitor-detail-state-scope="realtime"');
  });

  it('resets realtime table selection and detail mode on metric reload like stateless Angular data tables', () => {
    expect(source).toContain('const resetRealtimeInvestigationSelection = useCallback(() => {');
    expect(source).toContain('setMetricPayload(null);');
    expect(source).toContain('setMetricPayloadError(null);');
    expect(source).toContain('setSelectedMetricRowKey(null);');
    expect(source).toContain("setMetricTableMode('table');");
    expect(source).toContain('function handleSelectMetricKey(key: string) {');
    expect(source).toContain('function handleMetricRefresh() {');
    expect(source).toContain('resetRealtimeInvestigationSelection();');
    expect(source).toContain('onSelectMetric: handleSelectMetricKey');
    expect(source).toContain('onMetricRefresh: handleMetricRefresh');
    expect(source).not.toContain('onSelectMetric: setSelectedMetricKey');
    expect(source).not.toContain('onMetricRefresh: () => setMetricReloadToken(prev => prev + 1)');
    expect(sectionsSource).toContain('data-monitor-detail-realtime-selection-reset="angular-table-reload"');
  });

  it('synchronizes the persistent monitor refresh toolbar with the platform refresh route context', () => {
    expect(source).toContain('resolveTimeContextRefreshInterval');
    expect(source).toContain('const MONITOR_DETAIL_DEFAULT_REFRESH_INTERVAL_SECONDS = 90;');
    expect(source).toContain('TIME_CONTEXT_REFRESH_INTERVAL_SECONDS');
    expect(source).not.toContain('function resolveMonitorDetailRefreshInterval(');
    expect(source).toContain('TIME_CONTEXT_REFRESH_INTERVAL_SECONDS,');
    expect(source).toContain('MONITOR_DETAIL_DEFAULT_REFRESH_INTERVAL_SECONDS');
    expect(source).toContain('const rawRouteTimeContext = useMemo(');
    expect(source).toContain('() => normalizeMonitorHistoryTimeContext(rawRouteTimeContext)');
    expect(source).toContain('rawRouteTimeContext,');
    expect(source).toContain('const [refreshInterval, setRefreshInterval] = useState<number>(() => routeRefreshInterval);');
    expect(source).toContain('const [refreshCountdown, setRefreshCountdown] = useState<number>(() => (routeRefreshInterval > 0 ? routeRefreshInterval : -1));');
    expect(source).toContain('setRefreshInterval(routeRefreshInterval);');
    expect(consoleSource).toContain('data-monitor-detail-default-refresh-contract={refreshInterval === 90 ?');
    expect(consoleSource).toContain('data-monitor-detail-refresh-copy-contract="angular-deadline-label"');
  });

  it('keeps Grafana refresh aligned to the previous Angular data tab', () => {
    expect(source).toContain("const [lastRefreshableTab, setLastRefreshableTab] = useState<MonitorDetailRefreshableTab>('realtime');");
    expect(source).toContain('resolveMonitorDetailRefreshTarget(currentTab, lastRefreshableTab)');
    expect(source).toContain('function handleSelectDetailTab(tab: MonitorDetailConsoleTabKey) {');
    expect(source).toContain("if (tab !== 'grafana') {");
    expect(source).toContain('setLastRefreshableTab(tab);');
    expect(source).toContain('setVisibleRealtimeMetricCount(MONITOR_DETAIL_REALTIME_PAGE_SIZE);');
    expect(source).toContain('resetRealtimeInvestigationSelection();');
    expect(source).toContain('setMetricReloadToken(prev => prev + 1);');
    expect(source).toContain('grafanaRefreshFallbackTab={lastRefreshableTab}');
    expect(consoleSource).toContain("data-monitor-detail-grafana-refresh-target={currentTab === 'grafana' ? grafanaRefreshFallbackTab : undefined}");
    expect(source).toContain('setCurrentTab(lastRefreshableTab);');
    expect(source).toContain('[currentTab, grafanaState.enabled, lastRefreshableTab]');
    expect(consoleSource).toContain('data-monitor-detail-grafana-fallback-tab="angular-previous-data-tab"');
    expect(sectionsSource).toContain('data-monitor-detail-grafana-action-contract="angular-edit-config-delete-dashboard"');
    expect(sectionsSource).toContain('data-monitor-detail-grafana-config-action="monitor-edit-grafana"');
    expect(sectionsSource).toContain('data-monitor-detail-grafana-delete-action="delete-dashboard"');
    expect(sectionsSource).toContain('data-monitor-detail-grafana-delete-teardown="angular-hide-tab"');
    expect(source).toContain('await deleteMonitorGrafanaDashboardFromFacade(api.monitors.deleteGrafanaDashboard, monitor.id);');
    expect(source).toContain('setGrafanaState({ enabled: false });');
  });

  it('keeps favorite add/remove feedback aligned with Angular monitor copy', () => {
    expect(source).toContain("import { api } from '@/lib/monitor-api-facade';");
    expect(source).toContain('api.monitors.favoriteMetrics(monitor.id)');
    expect(source).toContain('addMonitorFavoriteFromFacade(api.monitors.addFavoriteMetric, monitor.id, metricName)');
    expect(source).toContain('removeMonitorFavoriteFromFacade(api.monitors.removeFavoriteMetric, monitor.id, metricName)');
    expect(source).toContain('removeMonitorFavoriteFromFacade(api.monitors.removeFavoriteMetric, monitor.id, favoriteToken)');
    expect(source).toContain('addMonitorFavoriteFromFacade(api.monitors.addFavoriteMetric, monitor.id, nextToken)');
    expect(source).toContain('api.monitors.grafanaDashboard<GrafanaDashboard | null>(monitor.id)');
    expect(source).not.toContain('loadMonitorFavoriteMetrics(apiMessageGet as any, String(monitor.id))');
    expect(source).not.toContain('apiMessageGet<GrafanaDashboard | null>(buildMonitorGrafanaUrl(String(monitor.id)))');
    expect(source).not.toContain('addMonitorFavorite(apiMessagePost');
    expect(source).not.toContain('removeMonitorFavorite(apiMessageDelete');
    expect(source).toContain('normalizeMonitorFavoriteNames');
    expect(source).toContain('useState<string[]>(() => normalizeMonitorFavoriteNames(favoriteMetrics))');
    expect(source).toContain('setFavoriteNames(normalizeMonitorFavoriteNames(favoriteMetrics));');
    expect(source).toContain('setFavoriteNames(normalizeMonitorFavoriteNames(result || []));');
    expect(source).toContain('setFavoriteNames(prev => normalizeMonitorFavoriteNames([...prev, metricName]));');
    expect(source).toContain('setFavoriteNames(prev => normalizeMonitorFavoriteNames([...prev, nextToken]));');
    expect(sectionsSource).toContain('data-monitor-detail-favorite-set-semantics="angular-set"');
    expect(source).toContain("setFavoriteMessage(t(favorited ? 'monitor.favorite.remove.success' : 'monitor.favorite.add.success'))");
    expect(source).toContain("setFavoriteError(error instanceof Error ? error.message : t(favorited ? 'monitor.favorite.remove.failed' : 'monitor.favorite.add.failed'))");
    expect(source).toContain("setFavoriteMessage(t(favoriteToken ? 'monitor.favorite.remove.success' : 'monitor.favorite.add.success'))");
    expect(source).toContain("setFavoriteMessage(t('monitor.favorite.remove.success'))");
    expect(source).toContain("setFavoriteError(error instanceof Error ? error.message : t('monitor.favorite.remove.failed'))");
    expect(sectionsSource).toContain('data-monitor-detail-favorite-feedback-copy="angular-favorite-copy"');
    expect(source).not.toContain("setFavoriteMessage(t('common.save-success'))");
    expect(source).not.toContain("setFavoriteError(error instanceof Error ? error.message : t('common.save-failed'))");
  });

  it('keeps favorite removal fallback scoped to the active Angular subselector', () => {
    expect(source).toContain('setSelectedFavoriteKey(prev => resolveActiveFavoriteRow(favoriteJumpRows, prev, favoriteSurfaceMode)?.key ?? null);');
    expect(source).toContain('if (!selectedFavoriteKey) return;');
    expect(source).toContain('const row = resolveActiveFavoriteRow(favoriteJumpRows, selectedFavoriteKey, favoriteSurfaceMode);');
    expect(source).toContain("setFavoriteSurfaceMode(current => resolveFavoriteSurfaceMode(current, favoriteJumpRows, selectedFavoriteKey));");
    expect(sectionsSource).toContain('data-monitor-detail-favorite-active-fallback="angular-subselector-sticky"');
  });

  it('keeps favorite empty states scoped like Angular empty-favorite panes without sentinels', () => {
    expect(sectionsSource).toContain('data-monitor-detail-favorite-empty-contract="angular-subselector-empty"');
    expect(sectionsSource).toContain('data-monitor-detail-favorite-empty-teardown="angular-empty-no-sentinel"');
    expect(sectionsSource).toContain('data-monitor-detail-empty-scope="favorite-realtime"');
    expect(sectionsSource).toContain('data-monitor-detail-empty-scope="favorite-history"');
    expect(sectionsSource).toContain("favoriteMetricRows.length > 0 ? (");
    expect(sectionsSource).toContain("favoriteHistoryChartItems.length > 0 ? (");
    expect(sectionsSource).toContain("title={t('monitor.detail.favorite.surface.empty.realtime.title')}");
    expect(sectionsSource).toContain("title={t('monitor.detail.favorite.surface.empty.history.title')}");
    expect(sectionsSource).not.toContain('data-monitor-detail-favorite-empty="realtime"');
    expect(sectionsSource).not.toContain('data-monitor-detail-favorite-empty="history"');
  });

  it('keeps monitor history refresh manual by default to avoid overlapping chart reloads', () => {
    expect(source).toContain("const DEFAULT_HISTORY_TIME_CONTEXT: TimeContext = {");
    expect(source).toContain("live: 'false'");
    expect(source).toContain("from: 'now-1h'");
    expect(source).toContain("to: 'now'");
    expect(source).toContain("if (context.refresh) {");
    expect(source).toContain('delete nextFallback.live;');
  });

  it('writes persistent monitor refresh changes back to the platform time route context', () => {
    expect(source).toContain('timeContextRefreshIntervalToContext');
    expect(source).not.toContain('function monitorDetailRefreshIntervalToContextValue(');
    expect(source).not.toContain('function monitorDetailRefreshIntervalToLiveValue(');
    expect(source).toContain('function handleSelectRefreshInterval(value: number) {');
    expect(source).toContain('setRefreshCountdown(value > 0 ? value : -1);');
    expect(source).toContain('const nextRefreshContext = timeContextRefreshIntervalToContext(value);');
    expect(source).toContain('{ ...historyTimeContext, ...nextRefreshContext }');
    expect(source).toContain('replaceMonitorHistoryTimeRoute(applied);');
    expect(source).toContain('onSelectRefreshInterval={handleSelectRefreshInterval}');
    expect(source).not.toContain('onSelectRefreshInterval={setRefreshInterval}');
  });

  it('clears stale paused refresh state when applying a positive history refresh interval', () => {
    expect(source).toContain('function resolveMonitorHistoryTimeContextFallback(');
    expect(source).toContain("Object.prototype.hasOwnProperty.call(context, 'live')");
    expect(source).toContain("Object.prototype.hasOwnProperty.call(context, 'refresh')");
    expect(source).toContain('if (context.refresh) {');
    expect(source).toContain('delete nextFallback.live;');
    expect(source).toContain("if (context.live === 'false') {");
    expect(source).toContain('delete nextFallback.refresh;');
  });

  it('does not reintroduce the old pre-tab context card stack at route level', () => {
    expect(source).not.toContain('contextContent=');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('WorkbenchPanel');
  });

  it('does not pass monitor signal handoff links into the detail toolbar', () => {
    expect(source).not.toContain('buildMonitorSignalHandoffLinks');
    expect(source).not.toContain('const signalHandoffLinks = buildMonitorSignalHandoffLinks(');
    expect(source).not.toContain('signalHandoffLinks={signalHandoffLinks}');
    expect(source).not.toContain('data-monitor-signal-fake-card');
    expect(source).not.toContain('data-monitor-signal-fake-count');
  });

  it('keeps monitor detail free of toolbar-level signal handoff links', () => {
    expect(consoleSource).toContain('HzMonitorRefreshToolbar');
    expect(consoleSource).not.toContain('signalHandoffLinks');
    expect(consoleSource).not.toContain("id: 'metrics'");
    expect(consoleSource).not.toContain("id: 'logs'");
    expect(consoleSource).not.toContain("id: 'traces'");
    expect(consoleSource).toContain('HzIconLink');
    expect(consoleSource).toContain('data-monitor-detail-tab-extra-contract="angular-refresh-help"');
    expect(consoleSource).toContain('data-monitor-detail-help-action="angular-docs-help"');
    expect(consoleSource).toContain('data-monitor-detail-help-owner="hertzbeat-ui-icon-link"');
  });

  it('exposes a monitor-to-entity draft action without showing it inside entity context', () => {
    expect(source).toContain('function buildMonitorEntityDraftHref(monitorId: string | number, currentHref: string)');
    expect(source).toContain('function buildMonitorBoundEntityHref(entityId: string | number, monitorId: string | number, currentHref: string)');
    expect(source).toContain('function findAlreadyBoundEntityCandidate(candidates: EntityMonitorBindingCandidate[] | null)');
    expect(source).toContain("params.set('source', 'telemetry');");
    expect(source).toContain("params.set('monitorId', String(monitorId));");
    expect(source).toContain("params.set('returnTo', currentHref);");
    expect(source).toContain('const currentMonitorHref = searchParamString');
    expect(source).toContain('api.entities.monitorCandidates(monitor.id)');
    expect(source).toContain('const alreadyBoundEntity = findAlreadyBoundEntityCandidate(entityBindingCandidates);');
    expect(source).toContain('const entityBindingLoading = !navigationContext.entityId && entityBindingCandidates == null;');
    expect(source).toContain('const navigationEntityHref = navigationContext.entityId != null');
    expect(source).toContain('const entityBoundHref = alreadyBoundEntity?.entityId != null');
    expect(source).toContain('const entityBoundName = alreadyBoundEntity?.entityName ?? navigationEntityName;');
    expect(source).toContain('const monitorEntityDraftHref = navigationContext.entityId || entityBindingLoading || entityBoundHref');
    expect(source).toContain('entityDraftHref={monitorEntityDraftHref}');
    expect(source).toContain('entityBoundHref={entityBoundHref}');
    expect(source).toContain('entityBoundName={entityBoundName}');
    expect(consoleSource).toContain('entityDraftHref?: string | null;');
    expect(consoleSource).toContain('entityBoundHref?: string | null;');
    expect(consoleSource).toContain('entityId?: string | number | null;');
    expect(consoleSource).toContain('entityName?: string | null;');
    expect(consoleSource).toContain('data-monitor-detail-entity-context-mark="breadcrumb"');
    expect(consoleSource).toContain("t('monitor.detail.entity-context', { entity: breadcrumbEntityLabel })");
    expect(consoleSource).toContain('data-monitor-detail-entity-bound-action="open-bound-entity"');
    expect(consoleSource).toContain('data-monitor-detail-entity-draft-action="telemetry-monitor-seed"');
    expect(consoleSource).toContain('data-monitor-detail-entity-draft-owner="hertzbeat-ui-labeled-action-link"');
    expect(consoleSource).toContain('data-monitor-detail-entity-draft-visibility="visible-label"');
  });

  it('keeps monitor detail breadcrumb context owned by shared underline text instead of chip chrome', () => {
    expect(consoleSource).toContain('HzInlineContextMark');
    expect(consoleSource).toContain('data-monitor-detail-context-mark="breadcrumb"');
    expect(consoleSource).toContain('data-monitor-detail-context-mark-owner="hertzbeat-ui-inline-context-mark"');
    expect(consoleSource).toContain('data-monitor-detail-list-return="angular-app-filter"');
    expect(consoleSource).toContain('data-monitor-detail-list-return-target={backHref}');
    expect(consoleSource).toContain('data-monitor-detail-app-definition-link="angular-monitor-app"');
    expect(consoleSource).toContain('data-monitor-detail-app-definition-target={appHref}');
    expect(source).toContain('function resolveMonitorDetailAppContext(monitor: Monitor, navigationContext: { app?: string | null })');
    expect(source).toContain("const scrapeApp = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : null;");
    expect(source).toContain('return scrapeApp || navigationContext.app || monitor.app || null;');
    expect(source).toContain('const appDefinitionKey = resolveMonitorDetailAppContext(monitor, navigationContext);');
    expect(source).toContain('const detailNavigationContext = appDefinitionKey ? { ...navigationContext, app: appDefinitionKey } : navigationContext;');
    expect(source).toContain('const backHref = buildMonitorListReturnHref({ ...navigationContext, app: appDefinitionKey });');
    expect(source).toContain('navigationContext={detailNavigationContext}');
    expect(source).not.toContain('const backHref = buildMonitorListReturnHref(navigationContext);');
    expect(source).toContain('appHref={appDefinitionKey ? `/setting/define?app=${encodeURIComponent(appDefinitionKey)}` : null}');
    expect(source).not.toContain("appHref={navigationContext.app ? `/setting/define?app=${encodeURIComponent(navigationContext.app)}` : null}");
    expect(consoleSource).not.toContain('HzBreadcrumbChip');
    expect(consoleSource).not.toContain('data-monitor-detail-app-chip="breadcrumb"');
    expect(consoleSource).not.toContain('data-monitor-detail-app-chip-owner="hertzbeat-ui-breadcrumb-chip"');
    expect(consoleSource).not.toContain('ObservabilityControlChip');
  });

  it('keeps monitor detail tabs owned by shared @hertzbeat/ui chrome', () => {
    expect(consoleSource).toContain('HzMonitorDetailTabs');
    expect(consoleSource).toContain('data-monitor-detail-tabs-owner="hertzbeat-ui-monitor-detail-tabs"');
    expect(consoleSource).toContain('HzMonitorDetailWorkbenchFrame');
    expect(uiSource).toContain('data-monitor-detail-tabset-type="bottom-underline-switch"');
    expect(consoleSource).not.toContain('data-monitor-detail-tabset-type="left-accent-card-switch"');
    expect(consoleSource).not.toContain('ObservabilityTabStrip');
  });

  it('keeps monitor detail transient states owned by shared @hertzbeat/ui primitives', () => {
    expect(sectionsSource).toContain('HzLoadingState');
    expect(sectionsSource).toContain('HzStateNotice');
    expect(sectionsSource).toContain('HzEmptyState');
    expect(sectionsSource).toContain('data-monitor-detail-state-owner="hertzbeat-ui-loading-state"');
    expect(sectionsSource).toContain('data-monitor-detail-state-owner="hertzbeat-ui-state-notice"');
    expect(sectionsSource).toContain('data-monitor-detail-empty-owner="hertzbeat-ui-empty-state"');
    expect(sectionsSource).not.toContain('data-monitor-detail-favorite-empty="realtime"');
    expect(sectionsSource).not.toContain('data-monitor-detail-favorite-empty="history"');
    expect(sectionsSource).not.toContain(
      'rounded-[3px] border border-dashed border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-5 py-10'
    );
  });

  it('keeps monitor detail load failures in the Angular-style detail route-state surface', () => {
    expect(source).toContain('renderLoading={visible =>');
    expect(source).toContain('renderError={(message, retry) =>');
    expect(source).toContain('data-monitor-detail-loading-state="angular-route-state"');
    expect(source).toContain('data-monitor-detail-error-state="angular-route-state"');
    expect(source).toContain('data-monitor-detail-route-state-owner="hertzbeat-ui-loading-state"');
    expect(source).toContain('data-monitor-detail-route-state-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-monitor-detail-route-state-feedback="error"');
    expect(source).toContain('data-monitor-detail-route-state-retry-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-monitor-detail-route-state-list-return-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-monitor-detail-route-state-list-return-target={routeListReturnHref}');
    expect(source).toContain('onClick={() => router.push(routeListReturnHref)}');
    expect(source).toContain("t('monitor.route-state.loading.title')");
    expect(source).toContain("t('monitor.route-state.error.title')");
    expect(source).toContain("t('monitor.route-state.action.retry')");
    expect(source).toContain("t('monitor.detail.back')");
  });

  it('keeps monitor detail refresh interval selection on shared @hertzbeat/ui chrome', () => {
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(consoleSource).toContain('HzMonitorRefreshToolbar');
    expect(consoleSource).not.toContain('HzSelect');
    expect(uiSource).toContain('HzSelect');
    expect(uiSource).toContain('data-monitor-refresh-select-owner="hertzbeat-ui-select"');
    expect(uiSource).toContain('data-monitor-refresh-select="true"');
    expect(consoleSource).not.toContain("import { Select } from '../ui/select'");
    expect(consoleSource).not.toContain('<Select');
  });

  it('keeps monitor detail refresh toolbar badge and action on shared @hertzbeat/ui primitives', () => {
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(consoleSource).toContain('HzMonitorRefreshToolbar');
    expect(consoleSource).not.toContain('HzStatusBadge');
    expect(consoleSource).not.toContain('HzButton');
    expect(uiSource).toContain('HzStatusBadge');
    expect(uiSource).toContain('HzButton');
    expect(uiSource).toContain('data-monitor-refresh-toolbar-owner="hertzbeat-ui-refresh-toolbar"');
    expect(uiSource).toContain('data-monitor-refresh-badge-owner="hertzbeat-ui-status-badge"');
    expect(uiSource).toContain('data-monitor-refresh-action-owner="hertzbeat-ui-button"');
    expect(consoleSource).not.toContain('ObservabilityBadge');
  });
});
