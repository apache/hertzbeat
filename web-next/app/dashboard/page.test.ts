import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en-US',
    t: (key: string) => key
  })
}));

describe('dashboard panel draft workspace route', () => {
  it('renders a real dashboard workspace instead of redirecting to overview', async () => {
    const { default: DashboardPage } = await import('./page');

    const element = await DashboardPage({
      searchParams: Promise.resolve({
        source: 'explorer',
        entityId: '7',
        serviceName: 'checkout',
        start: '100',
        end: '200',
        refresh: '30',
        live: 'true'
      })
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('data-dashboard-workspace="signal-panel-drafts"');
    expect(html).toContain('data-dashboard-panel-draft-source="hertzbeat-api"');
    expect(html).toContain('data-dashboard-composition-source="hertzbeat-api"');
    expect(html).toContain('data-dashboard-panel-drafts-context-source="explorer"');
    expect(html).toContain('data-dashboard-panel-drafts-state="loading"');
    expect(html).toContain('data-dashboard-composition-state="loading"');
    expect(html).toContain('data-hz-ui="explorer-frame"');
    expect(html).toContain('app.frame.skip-to-workbench');
    expect(html).not.toContain('Skip to workbench');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-dashboard-composition-target-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-dashboard-composition-target-key="signals-overview"');
    expect(html).toContain('data-dashboard-composition-title-input="true"');
    expect(html).toContain('data-dashboard-composition-description-input="true"');
    expect(html).toContain('data-dashboard-composition-key-input="true"');
    expect(html).toContain('data-dashboard-composition-preview-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-dashboard-composition-preview-key="signals-overview"');
    expect(html).toContain('data-dashboard-composition-preview-panels="0"');
    expect(html).toContain('data-dashboard-composition-time-range-mode="absolute"');
    expect(html).toContain('data-dashboard-composition-time-range-start="100"');
    expect(html).toContain('data-dashboard-composition-time-range-end="200"');
    expect(html).toContain('data-dashboard-composition-time-range-execution-start="100"');
    expect(html).toContain('data-dashboard-composition-time-range-execution-end="200"');
    expect(html).toContain('data-dashboard-composition-refresh-mode="auto"');
    expect(html).toContain('data-dashboard-composition-refresh-interval="30"');
    expect(html).toContain('data-dashboard-composition-refresh-tick="0"');
    expect(html).toContain('data-dashboard-composition-refresh-live="true"');
    expect(html).toContain('data-dashboard-composition-runtime-sync-timestamp=""');
    expect(html).toContain('data-dashboard-composition-runtime-sync-hover-timestamp=""');
    expect(html).toContain('data-dashboard-composition-runtime-sync-pinned-timestamp=""');
    expect(html).toContain('data-dashboard-composition-runtime-sync-state="idle"');
    expect(html).toContain('data-dashboard-composition-runtime-sync-pin-state="idle"');
    expect(html).toContain('data-dashboard-composition-runtime-sync-tooltip-state="idle"');
    expect(html).toContain('data-dashboard-composition-runtime-sync-tooltip-rows="0"');
    expect(html).toContain('data-dashboard-composition-runtime-sync-action="clear-pin"');
    expect(html).toContain('data-dashboard-composition-runtime-sync-action-state="disabled"');
    expect(html).toContain('data-dashboard-composition-filter-toolbar="true"');
    expect(html).toContain('data-dashboard-composition-filter-toolbar-state="no-selection"');
    expect(html).toContain('data-dashboard-composition-filter-toolbar-variables="0"');
    expect(html).toContain('data-dashboard-composition-filter-toolbar-options="0"');
    expect(html).toContain('data-dashboard-composition-time-range-control="true"');
    expect(html).toContain('data-dashboard-composition-preview-empty-state="no-selection"');
    expect(html).toContain('data-dashboard-composition-variables-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-dashboard-composition-variables-count="0"');
    expect(html).toContain('data-dashboard-composition-variable-options-count="0"');
    expect(html).toContain('data-dashboard-composition-variables-state="no-selection"');
    expect(html).toContain('data-dashboard-composition-variables-empty-state="no-selection"');
    expect(html).toContain('data-dashboard-save-layout-action="signal-dashboard"');
    expect(html).toContain('data-dashboard-composition-list-owner="hertzbeat-ui-panel-surface"');
  });

  it('uses the dashboard query key as the selected dashboard draft for deep links', async () => {
    const { default: DashboardPage } = await import('./page');

    const element = await DashboardPage({
      searchParams: Promise.resolve({
        dashboard: 'checkout-latency',
        timeRange: 'last-1h'
      })
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('data-dashboard-composition-target-key="checkout-latency"');
    expect(html).toContain('data-dashboard-composition-preview-key="checkout-latency"');
    expect(html).toContain('data-dashboard-composition-time-range-mode="relative"');
    expect(html).toContain('data-dashboard-composition-time-range-preset="last-1h"');
  });

  it('localizes only the built-in default dashboard display text', async () => {
    const { resolveDashboardDisplayText } = await import('./dashboard-draft-workspace');
    const localizedDefaults = {
      title: 'Signal Uebersicht',
      description: 'Lokalisierte Standardbeschreibung'
    };

    expect(resolveDashboardDisplayText({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Dashboard composed from logs, traces, and metrics panel drafts.'
    }, localizedDefaults)).toEqual(localizedDefaults);
    expect(resolveDashboardDisplayText({
      dashboardKey: 'signals-overview',
      title: 'Checkout SLO dashboard',
      description: 'Team-owned dashboard'
    }, localizedDefaults)).toEqual({
      title: 'Checkout SLO dashboard',
      description: 'Team-owned dashboard'
    });
  });

  it('keeps dashboard route ownership as a primary page in the route catalog', () => {
    const navSource = readFileSync(resolve(process.cwd(), '../web-next/lib/nav.ts'), 'utf8');

    expect(navSource).toContain("key: 'dashboard'");
    expect(navSource).toContain("href: '/dashboard'");
    expect(navSource).toContain("routeKind: 'primary'");
    expect(navSource).not.toContain("key: 'dashboard',\n    labelKey: 'menu.overview'");
    expect(navSource).not.toContain("redirectTo: '/overview'\n  },\n  {\n    key: 'otlp'");
  });

  it('loads and manages server-backed signal panel drafts from the client workspace', () => {
    const pageSource = readFileSync(resolve(process.cwd(), '../web-next/app/dashboard/page.tsx'), 'utf8');
    const workspaceSource = readFileSync(resolve(process.cwd(), '../web-next/app/dashboard/dashboard-draft-workspace.tsx'), 'utf8');

    expect(pageSource).not.toContain('redirect(');
    expect(pageSource).toContain('DashboardDraftWorkspace');
    expect(workspaceSource).toContain('loadAllSignalDashboardPanelDrafts');
    expect(workspaceSource).toContain('loadAllSignalSavedQueryViewsWithDiagnostics');
    expect(workspaceSource).toContain("type SavedViewLoadState = DraftLoadState | 'partial'");
    expect(workspaceSource).toContain('setSavedViewFailedSignals(failedSignals)');
    expect(workspaceSource).toContain("setSavedViewLoadState(failedSignals.length > 0 && nextSavedViews.length > 0 ? 'partial'");
    expect(workspaceSource).toContain('data-dashboard-saved-views-failed-signals={savedViewFailedSignals.join');
    expect(workspaceSource).toContain("dashboard.saved-views.status.partial");
    expect(workspaceSource).toContain('createSignalDashboardPanelDraftFromSavedView');
    expect(workspaceSource).toContain('saveSignalSavedQueryView');
    expect(workspaceSource).toContain('deleteSignalSavedQueryView');
    expect(workspaceSource).toContain('saveSignalDashboardPanelDraft');
    expect(workspaceSource).toContain('deleteSignalDashboardPanelDraft');
    expect(workspaceSource).toContain('duplicateSignalDashboardPanelDraft');
    expect(workspaceSource).toContain('loadSignalDashboards');
    expect(workspaceSource).toContain('saveSignalDashboard');
    expect(workspaceSource).toContain('deleteSignalDashboard');
    expect(workspaceSource).toContain('buildSignalOperationDrilldownDashboard');
    expect(workspaceSource).toContain('buildSignalServiceOverviewDashboard');
    expect(workspaceSource).toContain('const serviceOverviewContext = useMemo(');
    expect(workspaceSource).toContain('const serviceName = firstParamValue(initialContext.serviceName)?.trim()');
    expect(workspaceSource).toContain('const operationDrilldownContext = useMemo(');
    expect(workspaceSource).toContain('const operationName = firstParamValue(initialContext.operationName)?.trim()');
    expect(workspaceSource).toContain('const saveServiceOverviewDashboard = async () =>');
    expect(workspaceSource).toContain('buildSignalServiceOverviewDashboard({');
    expect(workspaceSource).toContain('const saveOperationDrilldownDashboard = async () =>');
    expect(workspaceSource).toContain('buildSignalOperationDrilldownDashboard({');
    expect(workspaceSource).toContain('data-dashboard-service-overview-context');
    expect(workspaceSource).toContain('data-dashboard-service-overview-service');
    expect(workspaceSource).toContain('data-dashboard-service-overview-action="save"');
    expect(workspaceSource).toContain('data-dashboard-service-overview-action-state');
    expect(workspaceSource).toContain('dashboard.composition.action.save-service-overview');
    expect(workspaceSource).toContain('data-dashboard-operation-drilldown-context');
    expect(workspaceSource).toContain('data-dashboard-operation-drilldown-operation');
    expect(workspaceSource).toContain('data-dashboard-operation-drilldown-action="save"');
    expect(workspaceSource).toContain('data-dashboard-operation-drilldown-action-state');
    expect(workspaceSource).toContain('dashboard.composition.action.save-operation-drilldown');
    expect(workspaceSource).toContain('normalizeSignalDashboardKey');
    expect(workspaceSource).toContain('buildDashboardVariableDeepLinkHref');
    expect(workspaceSource).toContain('buildDashboardTimeRangeDeepLinkHref');
    expect(workspaceSource).toContain('buildDashboardReturnHref');
    expect(workspaceSource).toContain('readDashboardVariableUrlOverrides');
    expect(workspaceSource).toContain('function replaceDashboardDeepLink(dashboardKey: string)');
    expect(workspaceSource).toContain('buildDashboardDeepLinkHref(window.location.href, dashboardKey)');
    expect(workspaceSource).toContain('function replaceDashboardVariableDeepLink(variableName: string, value: string)');
    expect(workspaceSource).toContain('buildDashboardVariableDeepLinkHref(window.location.href, variableName, value)');
    expect(workspaceSource).toContain('function replaceDashboardTimeRangeDeepLink(timeRange: SignalDashboardTimeRange)');
    expect(workspaceSource).toContain('buildDashboardTimeRangeDeepLinkHref(window.location.href, timeRange)');
    expect(workspaceSource).toContain('function applyVariableUrlOverridesToDashboards(');
    expect(workspaceSource).toContain('const initialVariableUrlOverrides = useMemo(');
    expect(workspaceSource).toContain('applyVariableUrlOverridesToDashboards(nextDashboards, initialVariableUrlOverrides)');
    expect(workspaceSource).toContain('const requestedDashboardParam = firstParamValue(initialContext.dashboard)');
    expect(workspaceSource).toContain('const requestedDashboardKey = normalizeSignalDashboardKey(requestedDashboardParam || \'signals-overview\')');
    expect(workspaceSource).toContain('const requestedDashboard = nextDashboardsWithUrlVariables.find(dashboard => dashboard.dashboardKey === requestedDashboardKey)');
    expect(workspaceSource).toContain('const initialDashboard = requestedDashboard || firstDashboard');
    expect(workspaceSource).toContain('!hasRequestedDashboardKey && current === requestedDashboardKey ? initialDashboard.dashboardKey : current');
    expect(workspaceSource).toContain('const selectedDashboardKey = selectedDashboard?.dashboardKey || \'\'');
    expect(workspaceSource).toContain('if (!selectedDashboardKey || !selectedDashboardTitle) return;');
    expect(workspaceSource).toContain('setDashboardTitleDraft(selectedDashboardTitle)');
    expect(workspaceSource).toContain('buildDashboardReturnHref({');
    expect(workspaceSource).toContain('dashboardKey: selectedDashboard.dashboardKey');
    expect(workspaceSource).toContain('variables: dashboardVariables');
    expect(workspaceSource).toContain('replaceDashboardTimeRangeDeepLink(dashboardTimeRange)');
    expect(workspaceSource).toContain('replaceDashboardDeepLink(saved.dashboardKey)');
    expect(workspaceSource).toContain('replaceDashboardDeepLink(dashboard.dashboardKey)');
    expect(workspaceSource).toContain('replaceDashboardDeepLink(nextDashboardKey)');
    expect(workspaceSource).toContain('replaceDashboardVariableDeepLink(nextVariable.name, nextVariable.value)');
    expect(workspaceSource).toContain("replaceDashboardVariableDeepLink(name, '')");
    expect(workspaceSource).toContain('buildSignalDashboardRuntimeEvidenceSourceHandoff(rowExecutionPlan?.resolvedRoute, row');
    expect(workspaceSource).toContain('buildSignalDashboardExecutionPlans');
    expect(workspaceSource).toContain('mergeSignalDashboardDraftsIntoComposition');
    expect(workspaceSource).toContain('buildSignalDashboardPanelRuntimeRenderDescriptor');
    expect(workspaceSource).toContain('buildSignalDashboardRuntimeEvidenceSourceHandoff');
    expect(workspaceSource).toContain('buildSignalDashboardRuntimeEvidenceFilters');
    expect(workspaceSource).toContain('buildSignalDashboardRuntimeEvidenceFilterSuggestions');
    expect(workspaceSource).toContain('buildSignalDashboardRuntimeMetricsTooltip');
    expect(workspaceSource).toContain('buildSignalDashboardRuntimeSyncTooltip');
    expect(workspaceSource).toContain('createSignalDashboardPanelDraftFromRuntimeEvidence');
    expect(workspaceSource).toContain('createSignalDashboardPanelDraftsFromFilterSelection');
    expect(workspaceSource).toContain('returnTo: dashboardReturnHref');
    expect(workspaceSource).toContain('buildSignalDashboardRuntimeSyncCrosshair');
    expect(workspaceSource).toContain('buildSignalDashboardVariableOptions');
    expect(workspaceSource).toContain('readSignalDashboardWidgetPanelEditMetadata');
    expect(workspaceSource).toContain('buildSignalDashboardPanelEditHref');
    expect(workspaceSource).toContain('executionPlanByPanelId');
    expect(workspaceSource).toContain('filterSignalDashboardVariableOptions');
    expect(workspaceSource).toContain('executeSignalDashboardPanelPlan');
    expect(workspaceSource).toContain('summarizeSignalDashboardPanelRuntime');
    expect(workspaceSource).toContain('resolveSignalDashboardPreviewPanels');
    expect(workspaceSource).toContain('resolveSignalDashboardTimeRange');
    expect(workspaceSource).toContain('resolveSignalDashboardRefreshState');
    expect(workspaceSource).toContain('setRefreshTick');
    expect(workspaceSource).toContain('setRuntimeSyncHoverTimestamp');
    expect(workspaceSource).toContain('setRuntimePinnedSyncTimestamp');
    expect(workspaceSource).toContain('pinRuntimeSyncTimestamp');
    expect(workspaceSource).toContain('selectSignalDashboardVariableOption');
    expect(workspaceSource).toContain('selectVariableOption');
    expect(workspaceSource).toContain('addEvidenceFilterVariable');
    expect(workspaceSource).toContain('parseSignalDashboardVariables');
    expect(workspaceSource).toContain('updateSignalDashboardVariables');
    expect(workspaceSource).toContain('updateSignalDashboardPanelLayout');
    expect(workspaceSource).toContain('buildSignalDashboardCompositionFromDrafts');
    expect(workspaceSource).toContain('SignalDashboardTimeRange');
    expect(workspaceSource).toContain('DashboardRuntimePanelRenderer');
    expect(workspaceSource).toContain('DashboardRuntimeTable');
    expect(workspaceSource).toContain('DashboardRuntimeBarChart');
    expect(workspaceSource).toContain('DashboardRuntimeMetricsChart');
    expect(workspaceSource).toContain('DashboardRuntimeTraceOverview');
    expect(workspaceSource).toContain('DashboardRuntimeTraceWaterfall');
    expect(workspaceSource).toContain('DashboardRuntimeStatePanel');
    expect(workspaceSource).toContain('runtimeRenderer.tableRows');
    expect(workspaceSource).toContain('runtimeRenderer.traceWaterfallRows');
    expect(workspaceSource).toContain('runtimeRenderer.metricsChart');
    expect(workspaceSource).toContain('dashboard.runtime.table.time');
    expect(workspaceSource).toContain('data-dashboard-panel-draft-row');
    expect(workspaceSource).toContain('data-dashboard-panel-draft-signal');
    expect(workspaceSource).toContain('data-dashboard-panel-draft-visualization');
    expect(workspaceSource).toContain('data-dashboard-panel-draft-route');
    expect(workspaceSource).toContain('readPanelDraftSourceSummary');
    expect(workspaceSource).toContain('data-dashboard-panel-draft-source-summary');
    expect(workspaceSource).toContain('data-dashboard-panel-draft-action="duplicate"');
    expect(workspaceSource).toContain('dashboard.add-panel.action.duplicate-draft');
    expect(workspaceSource).toContain('dashboard.add-panel.duplicate-title-suffix');
    expect(workspaceSource).toContain('data-dashboard-saved-view-row');
    expect(workspaceSource).toContain('data-dashboard-saved-view-label');
    expect(workspaceSource).toContain('data-dashboard-saved-view-description');
    expect(workspaceSource).toContain('data-dashboard-saved-view-signal');
    expect(workspaceSource).toContain('data-dashboard-saved-view-route');
    expect(workspaceSource).toContain('data-dashboard-saved-view-label-input');
    expect(workspaceSource).toContain('data-dashboard-saved-view-description-input');
    expect(workspaceSource).toContain('data-dashboard-saved-view-action="update"');
    expect(workspaceSource).toContain('data-dashboard-saved-view-action="add-panel"');
    expect(workspaceSource).toContain('data-dashboard-saved-view-action="delete"');
    expect(workspaceSource).toContain('data-dashboard-saved-views-state');
    expect(workspaceSource).toContain('dashboard.saved-views.title');
    expect(workspaceSource).toContain('dashboard.saved-views.action.update');
    expect(workspaceSource).toContain('dashboard.saved-views.action.add-panel');
    expect(workspaceSource).toContain('dashboard.saved-views.action.delete');
    expect(workspaceSource).toContain('function DashboardExplorerHandoffActions');
    expect(workspaceSource).toContain("actions={savedViewLoadState === 'empty'");
    expect(workspaceSource).toContain("actions={loadState === 'empty'");
    expect(workspaceSource).toContain("href: '/log/manage'");
    expect(workspaceSource).toContain("href: '/trace/manage'");
    expect(workspaceSource).toContain("href: '/ingestion/otlp/metrics'");
    expect(workspaceSource).toContain('data-dashboard-empty-action={action.key}');
    expect(workspaceSource).toContain('data-dashboard-empty-action-scope={scope}');
    expect(workspaceSource).toContain('data-dashboard-composition-row');
    expect(workspaceSource).toContain('data-dashboard-composition-action="select"');
    expect(workspaceSource).toContain('data-dashboard-composition-action="delete"');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-mode');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-start');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-end');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-preset');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-execution-start');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-execution-end');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-control');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-control-execution-start');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-control-execution-end');
    expect(workspaceSource).toContain('data-dashboard-composition-refresh-mode');
    expect(workspaceSource).toContain('data-dashboard-composition-refresh-interval');
    expect(workspaceSource).toContain('data-dashboard-composition-refresh-tick');
    expect(workspaceSource).toContain('data-dashboard-composition-refresh-live');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-toolbar');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-toolbar-state');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-toolbar-variables');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-toolbar-options');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-list');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable=');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-current');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-visible-options');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-search');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-selectable');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-search');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-search-value');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-search-results');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-select');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-select-value');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-select-options');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-option-source');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-option-selected');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-option-action="select"');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-action="add-panel-draft"');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-action-templates');
    expect(workspaceSource).toContain('data-dashboard-composition-filter-variable-action-compose');
    expect(workspaceSource).toContain('dashboard.composition.filter-toolbar.add-panel-draft');
    expect(workspaceSource).toContain('dashboard.composition.filter-toolbar.panel-title-prefix');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-input="start"');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-input="end"');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-input="preset"');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-input="refresh"');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-input="live"');
    expect(workspaceSource).toContain('data-dashboard-composition-time-range-action="refresh"');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-grid');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-panel');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-draft={panel.widget.draftKey || \'\'}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-raw-route');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-query');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-edit-href');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-edit-intent="edit-panel"');
    expect(workspaceSource).toContain('const panelEditMetadata = readSignalDashboardWidgetPanelEditMetadata(panel.widget)');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-edit-source={panelEditMetadata?.intent || \'none\'}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-edit-source-dashboard={panelEditMetadata?.dashboardKey || \'\'}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-edit-source-panel={panelEditMetadata?.panelId || \'\'}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-edit-source-draft={panelEditMetadata?.draftKey || \'\'}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-edit-source-return={panelEditMetadata?.returnTo || \'\'}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action="edit-source"');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action-intent="edit-panel"');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action-panel={panel.widget.id}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action-draft={panel.widget.draftKey}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action-dashboard={selectedDashboard.dashboardKey}');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action-return={dashboardReturnHref}');
    expect(workspaceSource).toContain("t('dashboard.composition.action.edit-panel')");
    expect(workspaceSource).toContain('data-dashboard-composition-execution-state');
    expect(workspaceSource).toContain('data-dashboard-composition-execution-primary-url');
    expect(workspaceSource).toContain('data-dashboard-composition-execution-endpoints');
    expect(workspaceSource).toContain('data-dashboard-composition-execution-result-state');
    expect(workspaceSource).toContain('data-dashboard-composition-execution-result-url');
    expect(workspaceSource).toContain('data-dashboard-composition-execution-result-error');
    expect(workspaceSource).toContain('data-dashboard-composition-execution-data-ready');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-summary-kind');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-summary-items');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-summary-series');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-summary-samples');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-timestamp');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-hover-timestamp');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-pinned-timestamp');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-state');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-pin-state');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-state');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-rows');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-source');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-handoff');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-handoff-state');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-handoff-kind');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-handoff-trace');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-handoff-span');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-related-signal');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-related-handoff');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-related-handoff-state');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-filter-candidates');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-filter-suggestions');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action="apply-filter"');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action="add-filter-variable"');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action="add-panel-draft"');
    expect(workspaceSource).toContain('dashboard.runtime.sync.add-panel-draft');
    expect(workspaceSource).toContain('dashboard.runtime.sync.evidence-panel-title-prefix');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action-variable');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action-value');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action-filter-source');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action-variable-type');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action="open-related"');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action-signal');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action="open-source"');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action-panel');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-tooltip-row-action-href');
    expect(workspaceSource).not.toContain("rowExecutionPlan?.primaryUrl || rowExecutionPlan?.resolvedRoute");
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-crosshair-state');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-crosshair-panels');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-crosshair-points');
    expect(workspaceSource).toContain('data-dashboard-runtime-sync-publisher');
    expect(workspaceSource).toContain('data-dashboard-runtime-sync-timestamp');
    expect(workspaceSource).toContain('data-dashboard-runtime-sync-selected');
    expect(workspaceSource).toContain('data-dashboard-runtime-sync-pinned');
    expect(workspaceSource).toContain('data-dashboard-runtime-sync-pin-action="toggle"');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-action="clear-pin"');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-sync-action-state');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-renderer');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-renderer-mode');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-renderer-items');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-preview-mode');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-preview-rows');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-preview-bars');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-preview-bar');
    expect(workspaceSource).toContain('data-dashboard-composition-runtime-preview-row');
    expect(workspaceSource).toContain('data-dashboard-runtime-logs-table');
    expect(workspaceSource).toContain('data-dashboard-runtime-trace-table');
    expect(workspaceSource).toContain('data-dashboard-runtime-log-trend-chart');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-series-count');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-sample-count');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-x-min');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-x-max');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-y-min');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-y-max');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-plot');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-svg');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-line');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-line-path');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-crosshair-layer');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-crosshair-state');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-crosshair-points');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-crosshair-x');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-crosshair-timestamp');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-series');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-point');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-axis-labels');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-axis-x-min-label');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-axis-x-max-label');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-axis-y-min-label');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-axis-y-max-label');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-tooltip');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-tooltip-state');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-tooltip-timestamp');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-tooltip-rows');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-tooltip-row');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-floating-tooltip');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-floating-tooltip-state');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-floating-tooltip-align');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-floating-tooltip-timestamp');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-floating-tooltip-rows');
    expect(workspaceSource).toContain('data-dashboard-runtime-metrics-chart-floating-tooltip-row');
    expect(workspaceSource).toContain('data-dashboard-runtime-trace-overview');
    expect(workspaceSource).toContain('data-dashboard-runtime-state-panel');
    expect(workspaceSource).toContain('data-dashboard-runtime-table-fields');
    expect(workspaceSource).toContain('data-dashboard-runtime-table-row-observed-at');
    expect(workspaceSource).toContain('data-dashboard-runtime-table-row-service');
    expect(workspaceSource).toContain('data-dashboard-runtime-table-row-status');
    expect(workspaceSource).toContain('data-dashboard-runtime-table-row-trace');
    expect(workspaceSource).toContain('data-dashboard-runtime-trace-waterfall');
    expect(workspaceSource).toContain('data-dashboard-runtime-trace-waterfall-source');
    expect(workspaceSource).toContain('data-dashboard-runtime-trace-waterfall-row-depth');
    expect(workspaceSource).toContain('data-dashboard-runtime-trace-waterfall-bar-width');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action="save-layout"');
    expect(workspaceSource).toContain('data-dashboard-composition-preview-action="open-source"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="move-left"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="move-right"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="move-up"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="move-down"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="wider"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="narrower"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="taller"');
    expect(workspaceSource).toContain('data-dashboard-composition-layout-action="shorter"');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-editor');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-input="name"');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-input="type"');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-input="value"');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-options-count');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-runtime-options-count');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-static-options-count');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-options');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-option-source');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-option-count');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-option-selected');
    expect(workspaceSource).toContain('data-dashboard-composition-variable-option-action="select"');
    expect(workspaceSource).toContain('data-dashboard-composition-variables-action="save"');
    expect(workspaceSource).toContain('data-dashboard-composition-variables-action="add"');
    expect(workspaceSource).toContain('data-dashboard-composition-variables-action="delete"');
  });
});
