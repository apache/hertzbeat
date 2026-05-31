import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const i18nState = vi.hoisted(() => ({
  locale: 'zh-CN' as 'zh-CN' | 'en-US'
}));

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    locale: i18nState.locale,
    ready: true,
    locales: [],
    setLocale: vi.fn(async () => {}),
    t: createTranslatorMock({ locale: i18nState.locale })
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

describe('topology page', () => {
  beforeEach(() => {
    i18nState.locale = 'zh-CN';
  });

  function buildApiTopologyFixture() {
    return {
      apiBacked: true,
      focusEntityId: 'service:commerce/checkout',
      depth: 2,
      sourceKinds: ['entity-relation', 'monitor-bind', 'otlp-trace-call'],
      nodes: [
        {
          id: 'app-commerce',
          entityId: 'application:commerce',
          entityName: 'commerce',
          entityType: 'application',
          namespace: 'commerce',
          environment: 'prod',
          health: 'warning',
          evidenceBadges: ['entity-relation', 'manual']
        },
        {
          id: 'svc-frontend',
          entityId: 'service:commerce/frontend',
          entityName: 'frontend',
          entityType: 'service',
          namespace: 'commerce',
          environment: 'prod',
          health: 'healthy',
          evidenceBadges: ['entity-relation', 'otlp-trace-call']
        },
        {
          id: 'svc-checkout',
          entityId: 'service:commerce/checkout',
          entityName: 'checkout-api',
          entityType: 'service',
          namespace: 'commerce',
          environment: 'prod',
          health: 'warning',
          evidenceBadges: ['entity-relation', 'otlp-trace-call']
        },
        {
          id: 'monitor-checkout',
          entityId: 'monitor:commerce/checkout-http',
          entityName: 'HTTP template',
          entityType: 'monitor',
          namespace: 'commerce',
          environment: 'prod',
          health: 'healthy',
          evidenceBadges: ['entity-relation', 'monitor-bind']
        },
        {
          id: 'k8s-checkout-workload',
          entityId: 'k8s:commerce/deployment/checkout',
          entityName: 'checkout deploy',
          entityType: 'k8s-workload',
          namespace: 'commerce',
          environment: 'prod',
          health: 'healthy',
          evidenceBadges: ['entity-relation', 'k8s-workload']
        },
        {
          id: 'res-orders-db',
          entityId: 'database:commerce/orders',
          entityName: 'orders-db',
          entityType: 'database',
          namespace: 'commerce',
          environment: 'prod',
          health: 'critical',
          evidenceBadges: ['entity-relation', 'database-middleware-connection']
        },
        {
          id: 'res-redis',
          entityId: 'middleware:commerce/redis-cart',
          entityName: 'redis',
          entityType: 'middleware',
          namespace: 'commerce',
          environment: 'prod',
          health: 'warning',
          evidenceBadges: ['entity-relation', 'template-dependency']
        }
      ],
      edges: [
        {
          sourceNodeId: 'app-commerce',
          targetNodeId: 'svc-frontend',
          relationType: 'application ownership',
          relationSource: 'cmdb-manual-label',
          status: 'confirmed',
          score: 92,
          evidenceBadges: ['entity-relation', 'manual']
        },
        {
          sourceNodeId: 'app-commerce',
          targetNodeId: 'svc-checkout',
          relationType: 'application ownership',
          relationSource: 'cmdb-manual-label',
          status: 'warning',
          score: 78,
          evidenceBadges: ['entity-relation', 'manual']
        },
        {
          sourceNodeId: 'svc-frontend',
          targetNodeId: 'svc-checkout',
          relationType: 'HTTP call',
          relationSource: 'otlp-trace-call',
          status: 'active',
          score: 96,
          evidenceBadges: ['entity-relation', 'otlp-trace-call'],
          redMetrics: {
            requestRatePerSecond: 7.25,
            errorRate: 0.021,
            latencyP95Ms: 123
          }
        },
        {
          sourceNodeId: 'monitor-checkout',
          targetNodeId: 'svc-checkout',
          relationType: 'monitor ownership',
          relationSource: 'monitor-bind',
          status: 'confirmed',
          score: 92,
          evidenceBadges: ['entity-relation', 'monitor-bind']
        },
        {
          sourceNodeId: 'k8s-checkout-workload',
          targetNodeId: 'svc-checkout',
          relationType: 'k8s ownership',
          relationSource: 'k8s-workload',
          status: 'confirmed',
          score: 90,
          evidenceBadges: ['entity-relation', 'k8s-workload']
        },
        {
          sourceNodeId: 'svc-checkout',
          targetNodeId: 'res-orders-db',
          relationType: 'database connection',
          relationSource: 'database-middleware-connection',
          status: 'critical',
          score: 48,
          evidenceBadges: ['entity-relation', 'database-middleware-connection']
        },
        {
          sourceNodeId: 'svc-checkout',
          targetNodeId: 'res-redis',
          relationType: 'template dependency',
          relationSource: 'template-dependency',
          status: 'warning',
          score: 76,
          evidenceBadges: ['entity-relation', 'template-dependency']
        }
      ]
    };
  }

  it('keeps topology on the HertzBeat entity relationship surface instead of copied service-map chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/topology/topology-page.tsx'), 'utf8');

    expect(source).toContain('loadTopologyGraph');
    expect(source).toContain('resolveTopologyApiTimeoutMs');
    expect(source).toContain('const TRACE_CALL_TOPOLOGY_API_TIMEOUT_MS = 60000;');
    expect(source).toContain('const DEFAULT_TOPOLOGY_API_TIMEOUT_MS = 30000;');
    expect(source).toContain('return TRACE_CALL_TOPOLOGY_API_TIMEOUT_MS;');
    expect(source).toContain('return DEFAULT_TOPOLOGY_API_TIMEOUT_MS;');
    expect(source).not.toContain('return 8000');
    expect(source).toContain('{ timeoutMs: resolveTopologyApiTimeoutMs(routeContext) }');
    expect(source).toContain('buildTopologyServiceMapFromApiGraph');
    expect(source).toContain('HzTopologyWorkbenchFrame');
    expect(source).toContain('HzTopologyWorkbenchHeader');
    expect(source).toContain('HzTopologyWorkbenchGrid');
    expect(source).toContain('HzTopologyWorkbenchSlot');
    expect(source).toContain('HzTopologyCanvas');
    expect(source).toContain('HzTopologyCanvasAnnotation');
    expect(source).toContain('HzTopologyG6Canvas');
    expect(source).toContain("from '@hertzbeat/ui/topology-g6'");
    expect(source).toContain("selectedFocusLabel={t('topology.view.focus-selected')}");
    expect(source).toContain('HzTopologyFocusTrail');
    expect(source).toContain('HzTopologyScopeBar');
    expect(source).toContain('HzTopologyToolbar');
    expect(source).toContain('HzTopologyCompanionRail');
    expect(source).toContain('HzTopologyHoverTooltip');
    expect(source).toContain('HzTopologyLegend');
    expect(source).toContain('HzTopologyDetailDrawer');
    expect(source).toContain('HzTopologyEvidenceList');
    expect(source).toContain('HzTopologyFilterStrip');
    expect(source).toContain('HzTopologyActionLink');
    expect(source).not.toContain("from '../../components/ui/input'");
    expect(source).not.toContain("from '../../components/ui/select'");
    expect(source).not.toContain('className="relative min-h-[680px] overflow-hidden bg-[#08090c]"');
    expect(source).not.toContain('nodeToneClass');
    expect(source).not.toContain('nodeFocusClass');
    expect(source).not.toContain('const edgeColor');
    expect(source).not.toContain('edgeColor[');
    expect(source).toContain('data-topology-data-source=');
    expect(source).toContain('data-topology-route="hertzbeat-entity-topology"');
    expect(source).toContain('data-topology-workbench-frame-owner="hertzbeat-ui-workbench-frame"');
    expect(source).toContain('data-topology-workbench-frame-boundary-owner="hertzbeat-ui-workbench-frame-boundary"');
    expect(source).toContain('data-topology-workbench-header-owner="hertzbeat-ui-workbench-header"');
    expect(source).toContain('density="operational-compact"');
    expect(source).toContain('copyVisibility="assistive"');
    expect(source).not.toContain('data-topology-header-density="concise-operational"');
    expect(source).toContain('data-topology-workbench-grid-owner="hertzbeat-ui-workbench-grid"');
    expect(source).toContain('layout="canvas-only"');
    expect(source).toContain('data-topology-canvas-slot-owner="hertzbeat-ui-workbench-slot"');
    expect(source).toContain('data-topology-companion-slot-owner="hertzbeat-ui-workbench-slot"');
    expect(source).toContain('data-topology-companion-rail-visibility="hidden-from-layout"');
    expect(source).toContain('kind="canvas"');
    expect(source).toContain('kind="companion"');
    expect(source).toContain('surface="content"');
    expect(source).toContain('data-topology-scope-bar-owner="hertzbeat-ui-scope-bar"');
    expect(source).toContain('data-topology-scope-bar-boundary-owner="hertzbeat-ui-scope-bar-boundary"');
    expect(source).toContain('data-topology-focus-trail-owner="hertzbeat-ui-focus-trail"');
    expect(source).toContain('data-topology-focus-trail-boundary-owner="hertzbeat-ui-focus-trail-boundary"');
    expect(source).toContain('focusMode={topologyFocusTrailMode}');
    expect(source).toContain('focusDepth={String(topologyFocusTrailDepth)}');
    expect(source).toContain('focusEntityId={topologyFocusTrailEntityId}');
    expect(source).toContain('topologyFocusExitHref');
    expect(source).toContain("t('topology.focus-trail.label')");
    expect(source).toContain("t('topology.focus-trail.exit')");
    expect(source).toContain("t('topology.focus-trail.hidden-count'");
    expect(source).toContain('boundary="none"');
    expect(source).toContain('data-topology-refresh-action="refresh"');
    expect(source).toContain('data-topology-controls="hertzbeat-topology-controls"');
    expect(source).toContain('data-topology-toolbar-boundary-owner="hertzbeat-ui-toolbar-boundary"');
    expect(source).toContain('data-topology-toolbar-state-owner="hertzbeat-ui-toolbar-state"');
    expect(source).toContain('density="graph-first"');
    expect(source).toContain('boundary="none"');
    expect(source).toContain("'data-topology-focus-state':");
    expect(source).toContain("'data-topology-depth-state':");
    expect(source).toContain("'data-topology-group-state': map.filterContext.groupBy");
    expect(source).toContain('sourceKindLabel={t');
    expect(source).toContain('sourceKindValue={map.filterContext.sourceKind ??');
    expect(source).toContain('sourceKindOptions={[');
    expect(source).not.toContain('sourceSlot={');
    expect(source).not.toContain('data-topology-source-strip="relationship-source-contract"');
    expect(source).not.toContain('data-topology-source-strip-owner="hertzbeat-ui-filter-strip"');
    expect(source).not.toContain("'data-topology-source-control': 'relationship-source'");
    expect(source).toContain('data-topology-view-mode-strip-owner="hertzbeat-ui-filter-strip"');
    expect(source).toContain('data-topology-companion-rail-owner="hertzbeat-ui-companion-rail"');
    expect(source).toContain('data-topology-companion-rail-boundary-owner="hertzbeat-ui-companion-rail-boundary"');
    expect(source).toContain('data-topology-companion-rail-scope="legend-metrics-timeline-detail"');
    expect(source).toContain('boundary="side"');
    expect(source).toContain('data-topology-canvas="hertzbeat-topology-canvas"');
    expect(source).toContain('data-topology-canvas-annotation-owner="hertzbeat-ui-canvas-annotation"');
    expect(source).toContain('data-topology-g6-canvas-owner="hertzbeat-ui-g6-canvas"');
    expect(source).toContain('data-topology-renderer="antv-g6"');
    expect(source).not.toContain('data-topology-graph-layer-owner="hertzbeat-ui-graph-layer"');
    expect(source).not.toContain('<svg className="absolute inset-0 h-full w-full"');
    expect(source).toContain('data-topology-canvas-interaction-owner="hertzbeat-ui-canvas-interaction"');
    expect(source).toContain('data-topology-canvas-interaction-scope-owner="hertzbeat-ui-canvas-interaction-scope"');
    expect(source).toContain('interactionScope="hover-group"');
    expect(source).toContain('data-topology-canvas-boundary-owner="hertzbeat-ui-canvas-boundary"');
    expect(source).toContain('boundary="none"');
    expect(source).not.toContain('className="group"');
    expect(source).toContain('hoverMode="neighbor-highlight"');
    expect(source).toContain('drawerMode={topologyCanvasDrawerMode}');
    expect(source).toContain('focusDepth={topologyCanvasFocusDepth}');
    expect(source).toContain('const map = React.useMemo(');
    expect(source).toContain('buildTopologyServiceMapFromApiGraph(loadedApiGraph ?? apiOwnedEmptyGraph, routeContext, t)');
    expect(source).toContain('const topologyG6Graph = React.useMemo<HzTopologyG6GraphInput>(() => ({');
    expect(source).toContain('focus: node.focus');
    expect(source).not.toContain('topologyCanvasFocusNodeId');
    expect(source).toContain('topologyG6Graph');
    expect(source).toContain('graph={topologyG6Graph}');
    expect(source).toContain('legendSlot={');
    expect(source).toContain('data-topology-g6-legend-owner="hertzbeat-ui-g6-legend-dock"');
    expect(source).toContain('density="canvas-dock"');
    expect(source).toContain('selectedNodeId={topologyTraceCallMissingEdges ? undefined : primaryNode?.id}');
    expect(source).toContain('selectedEdgeId={topologyCanvasSelectedEdgeId}');
    expect(source).toContain('hoveredNodeId={topologyG6HoveredNodeId}');
    expect(source).toContain('hoveredEdgeId={topologyG6HoveredEdgeId}');
    expect(source).toContain('onNodeHover={handleTopologyG6NodeHover}');
    expect(source).toContain('onEdgeHover={handleTopologyG6EdgeHover}');
    expect(source).toContain('onHoverClear={handleTopologyG6HoverClear}');
    expect(source).toContain('overlayMode="non-occluding"');
    expect(source).toContain('const topologyLiveHoverEdge = topologyHoveredDetailEdge;');
    expect(source).toContain('topologyHoveredDetailEdge ?? topologyDetailEdge');
    expect(source).toContain("const topologyToolbarSearchQuery = topologySearchQuery ?? '';");
    expect(source).toContain('const topologyG6SearchQuery = topologyToolbarSearchQuery;');
    expect(source).toContain('searchQuery={topologyG6SearchQuery}');
    expect(source).toContain('topologyNodeIds');
    expect(source).not.toContain('const topologyNodeHrefById');
    expect(source).toContain('topologyNodeFocusHrefById');
    expect(source).toContain('handleTopologyG6NodeSelect');
    expect(source).toContain('handleTopologyG6NodeFocus');
    expect(source).toContain('handleTopologyG6EdgeSelect');
    expect(source).toContain('data-topology-selection-behavior="in-page-drawer"');
    expect(source).toContain('onNodeSelect={handleTopologyG6NodeSelect}');
    expect(source).toContain('onNodeFocus={handleTopologyG6NodeFocus}');
    expect(source).toContain('onEdgeSelect={handleTopologyG6EdgeSelect}');
    expect(source).toContain('data-topology-hover-tooltip-owner="hertzbeat-ui-hover-tooltip"');
    expect(source).toContain('data-topology-hover-edge={topologyLiveHoverEdge.id}');
    expect(source).toContain('trigger="live-edge-hover"');
    expect(source).toContain('topologyG6HoverAnchor');
    expect(source).toContain('setTopologyG6HoverAnchor(anchor)');
    expect(source).toContain("placement={topologyG6HoverAnchor ? 'canvas-anchor' : 'canvas-right-under-toolbar'}");
    expect(source).toContain('anchor={topologyG6HoverAnchor}');
    expect(source).toContain("size={topologyG6HoverAnchor ? 'compact' : 'standard'}");
    expect(source).toContain('data-topology-legend-owner="hertzbeat-ui-legend"');
    expect(source).toContain('data-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"');
    expect(source).toContain('data-topology-metric-table-boundary-owner="hertzbeat-ui-metric-table-boundary"');
    expect(source).toContain('data-topology-metric-table-interaction-owner="hertzbeat-ui-metric-table-interaction"');
    expect(source).toContain('data-topology-metric-table-selection-clear-owner="hertzbeat-ui-g6-hover-clear"');
    expect(source).toContain('density="graph-first"');
    expect(source).toContain('clearTopologyG6Hover');
    expect(source).toContain('clearTopologyG6Hover();');
    expect(source).toContain("rowAction: t('topology.metric-table.row-action')");
    expect(source).toContain('data-topology-detail-drawer-owner="hertzbeat-ui-detail-drawer"');
    expect(source).toContain("'data-topology-detail-boundary-owner': 'hertzbeat-ui-detail-boundary'");
    expect(source).toContain('data-topology-edge-evidence-panel=');
    expect(source).toContain('data-topology-current-entity-panel-owner="hertzbeat-ui-detail-drawer"');
    expect(source).toContain("'data-topology-current-entity-boundary-owner': 'hertzbeat-ui-detail-boundary'");
    expect(source).toContain('data-topology-incoming-context=');
    expect(source).toContain('data-topology-alert-impact-link="alert-center"');
    expect(source).toContain('data-topology-alert-impact-link-owner="hertzbeat-ui-action-link"');
    expect(source).toContain('data-topology-fault-context-owner="hertzbeat-ui-evidence-list"');
    expect(source).toContain('data-topology-fault-context-boundary-owner="hertzbeat-ui-evidence-list-boundary"');
    expect(source).toContain('data-topology-impact-timeline-owner="hertzbeat-ui-evidence-list"');
    expect(source).toContain('data-topology-impact-timeline-boundary-owner="hertzbeat-ui-evidence-list-boundary"');
    expect(source).not.toContain('className="mt-3 block rounded-[4px] border border-[#31405c] bg-[#182238] px-3 py-2 text-[12px] font-semibold text-[#d8e4ff]"');
    expect(source).not.toContain('className="flex flex-wrap items-center justify-end gap-2 text-[12px] text-[#d6d9e2]"');
    expect(source).not.toContain('className="border-b border-[#252832] bg-[#0b0c0f] px-4 py-3"');
    expect(source).not.toContain('className="min-h-[calc(100vh-56px)] bg-[#08090c] text-[#f1f3f7]"');
    expect(source).not.toContain('className="border-b border-[#252832] bg-[#0b0c0f] px-4 py-4"');
    expect(source).not.toContain('className="grid min-h-[760px] bg-[#08090c] xl:grid-cols-[minmax(0,1fr)_320px]"');
    expect(source).not.toContain('className="mt-5 rounded-[4px] border border-[#252832] bg-[#101217] p-3"');
    expect(source).not.toContain('className="absolute right-4 top-4 z-10 w-[300px]"');
    expect(source).not.toContain('className="text-[12px] font-semibold tracking-[0.12em] text-[#7e8494]"');
    expect(source).toContain('boundary="framed"');
    expect(source).toContain('boundary="toolbar-context"');
    expect(source).not.toContain('className="mt-5"');
    expect(source).not.toContain('className="mt-3"');
    expect(source).toContain('HzTopologySectionLabel');
    expect(source).toContain('useI18n');
    expect(source).toContain("t('topology.search.placeholder')");
    expect(source).not.toContain('搜索实体、服务、资源或标签');
    expect(source).not.toContain('OpsSurfacePage');
    expect(source).not.toContain('buildTopologySurfaceConfig');
    expect(source).not.toContain('Monitor center');
    expect(source).not.toContain('signoz-service-map');
    expect(source).not.toContain('Service Map');
    expect(source).not.toContain('Select Environment/s');
  });

  it('keeps G6 single-click node and edge selection inside the topology page drawer', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/topology/topology-page.tsx'), 'utf8');

    expect(source).toContain("import { useRouter } from 'next/navigation';");
    expect(source).toContain('const topologyRouter = useRouter();');
    expect(source).toContain("type TopologyLocalSelectionSource = 'none' | 'node-click' | 'edge-click' | 'table-row-click';");
    expect(source).toContain('const [topologyLocalSelection, setTopologyLocalSelection]');
    expect(source).toContain('const topologyNodeIds = React.useMemo');
    expect(source).toContain('if (!topologyNodeIds.has(nodeId)) return;');
    expect(source).toContain("setTopologyLocalSelection({ nodeId, edgeId: undefined, source: 'node-click' })");
    expect(source).toContain("setTopologyLocalSelection({ nodeId: undefined, edgeId, source: 'edge-click' })");
    expect(source).toContain("setTopologyLocalSelection({ nodeId: undefined, edgeId: row.id, source: 'table-row-click' })");
    expect(source).toContain('const topologyDetailEdge = topologyLocalSelection.nodeId ? undefined : topologyLocalSelectedEdge ?? pickTopologyDetailEdge(map);');
    expect(source).toContain('const topologyCanvasSelectedEdgeId = topologyLocalSelection.nodeId');
    expect(source).toContain("? undefined");
    expect(source).toContain(': topologyLocalSelectedEdge?.id ?? map.selectedEdgeId ?? topologyDetailEdge?.id;');
    expect(source).toContain('const topologyMetricSelectedRowId = topologyLocalSelection.nodeId');
    expect(source).toContain('selectedRowId={topologyMetricSelectedRowId}');
    expect(source).toContain('data-topology-selection-behavior="in-page-drawer"');
    expect(source).toContain('data-topology-selection-source={topologyLocalSelection.source}');
    expect(source).toContain("data-topology-selection-node-id={topologyLocalSelection.nodeId ?? 'none'}");
    expect(source).toContain("data-topology-selection-edge-id={topologyLocalSelection.edgeId ?? 'none'}");
    expect(source).toContain('data-topology-g6-mount-lifecycle-browser-regression="selection-preserve-viewport"');
    expect(source).toContain('data-topology-g6-mount-lifecycle-browser-regression-owner="hertzbeat-ui-g6-mount-lifecycle"');
    expect(source).toContain('data-topology-g6-mount-lifecycle-selection-policy="node-edge-table-drawer-only"');
    expect(source).toContain('data-topology-g6-mount-lifecycle-url-policy="preserve-current-url-on-selection"');
    expect(source).toContain('data-topology-g6-mount-lifecycle-redraw-policy="shared-setData-draw-preserve-viewport"');
    expect(source).toContain('data-topology-focus-navigation="explicit-soft-route"');
    expect(source).toContain('data-topology-focus-navigation-owner="hertzbeat-ui-g6-focus-entry"');
    expect(source).toContain('data-topology-focus-navigation-trigger="double-click-node"');
    expect(source).toContain('data-topology-focus-route-preservation="previous-graph-until-api-resolves"');
    expect(source).toContain('data-topology-focus-route-preservation-owner="hertzbeat-ui-g6-focus-entry"');
    expect(source).toContain('data-topology-focus-route-preservation-source="loaded-api-graph-state"');
    expect(source).toContain('buildTopologyServiceMapFromApiGraph(loadedApiGraph ?? apiOwnedEmptyGraph, routeContext, t)');
    expect(source).toContain('navigateTopologyFocus(topologyNodeFocusHrefById.get(nodeId), topologyRouter.push);');
    expect(source).toContain('const handleTopologyFocusExit = React.useCallback');
    expect(source).toContain('event.preventDefault();');
    expect(source).toContain('navigateTopologyFocus(topologyFocusExitHref, topologyRouter.push);');
    expect(source).toContain('onClick: handleTopologyFocusExit');
    expect(source).not.toContain('setLoadedApiGraph(undefined);');
    expect(source).not.toContain('window.location.href = href;');
    expect(source).not.toContain('const topologyNodeHrefById');
    expect(source).not.toContain('[topologyNodeHrefById]');
    expect(source).not.toContain('navigateTopologySelection(topologyNodeHrefById.get(nodeId));');
    expect(source).not.toContain('navigateTopologySelection(topologyEdgeHrefById.get(edgeId));');
    expect(source).not.toContain('navigateTopologySelection(topologyEdgeHrefById.get(row.id));');
  });

  it('routes toolbar scope controls through soft navigation without clearing the G6 graph', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/topology/topology-page.tsx'), 'utf8');

    expect(source).toContain("type TopologyLayoutMode = 'layered-service' | 'force' | 'grid-table';");
    expect(source).toContain("const [topologyLayout] = React.useState<TopologyLayoutMode>('layered-service');");
    expect(source).toContain('const topologyG6Layout = topologyLayout ===');
    expect(source).not.toContain('const handleTopologyLayoutChange = React.useCallback');
    expect(source).not.toContain('setTopologyLayout(value as TopologyLayoutMode);');
    expect(source).toContain('const [topologySearchQuery, setTopologySearchQuery] = React.useState<string | undefined>(undefined);');
    expect(source).toContain('const topologyEffectiveSearchQuery = topologySearchQuery ?? map.filterContext.search;');
    expect(source).toContain("const topologyToolbarSearchQuery = topologySearchQuery ?? '';");
    expect(source).toContain('const topologyG6SearchQuery = topologyToolbarSearchQuery;');
    expect(source).toContain('const handleTopologySearchChange = React.useCallback');
    expect(source).toContain('setTopologySearchQuery(event.currentTarget.value);');
    expect(source).toContain('data-topology-layout-navigation="in-page-g6-layout"');
    expect(source).toContain('data-topology-layout-navigation-owner="hertzbeat-ui-toolbar-layout-control"');
    expect(source).toContain('data-topology-layout-navigation-url-policy="preserve-current-url"');
    expect(source).toContain('data-topology-search-navigation="in-page-g6-search"');
    expect(source).toContain('data-topology-search-navigation-owner="hertzbeat-ui-toolbar-search-control"');
    expect(source).toContain('data-topology-search-navigation-url-policy="preserve-current-url"');
    expect(source).toContain('function buildTopologyScopeHref');
    expect(source).toContain('const handleTopologyEnvironmentChange = React.useCallback');
    expect(source).toContain("buildTopologyScopeHref(topologyG6ResetParams, { environment: value })");
    expect(source).toContain('const handleTopologyDepthChange = React.useCallback');
    expect(source).toContain("buildTopologyScopeHref(topologyG6ResetParams, { depth: value })");
    expect(source).toContain('const handleTopologySourceKindChange = React.useCallback');
    expect(source).toContain("buildTopologyScopeHref(topologyG6ResetParams, { sourceKind: value === 'all' ? undefined : value })");
    expect(source).toContain('const handleTopologyGroupByChange = React.useCallback');
    expect(source).toContain("buildTopologyScopeHref(topologyG6ResetParams, { groupBy: value })");
    expect(source).toMatch(
      /const topologyG6ResetParams = React\.useMemo\(\(\) => \{[\s\S]*if \(map\.filterContext\.groupBy !== 'none'\) params\.set\('groupBy', map\.filterContext\.groupBy\);/
    );
    expect(source).toContain('const handleTopologyResetScope = React.useCallback');
    expect(source).toContain('event.preventDefault();');
    expect(source).toContain("navigateTopologyFocus('/topology', topologyRouter.push);");
    expect(source).toContain('data-topology-scope-navigation="explicit-soft-route"');
    expect(source).toContain('data-topology-scope-navigation-owner="hertzbeat-ui-toolbar-scope-controls"');
    expect(source).toContain('data-topology-scope-navigation-preservation="previous-graph-until-api-resolves"');
    expect(source).toContain('onEnvironmentChange={handleTopologyEnvironmentChange}');
    expect(source).toContain('onSourceKindChange={handleTopologySourceKindChange}');
    expect(source).toContain('onDepthChange={handleTopologyDepthChange}');
    expect(source).not.toContain('onLayoutChange={handleTopologyLayoutChange}');
    expect(source).toContain('onGroupByChange={handleTopologyGroupByChange}');
    expect(source).toContain('onSearchChange={handleTopologySearchChange}');
    expect(source).toContain('onReset={handleTopologyResetScope}');
    expect(source).not.toContain('layoutValue={topologyLayout}');
    expect(source).toContain('searchValue={topologyToolbarSearchQuery}');
    expect(source).toContain("layout={topologyLayout}");
    expect(source).toContain("layout={topologyG6Layout}");
    expect(source).toContain('searchQuery={topologyG6SearchQuery}');
    expect(source).toContain("if (topologyToolbarSearchQuery) topologyG6SearchParams.set('search', topologyToolbarSearchQuery);");
    expect(source).not.toContain('setLoadedApiGraph(undefined);');
  });

  it('exposes initial in-page selection source markers for real topology browser checks', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage apiGraph={buildApiTopologyFixture()} />);

    expect(html).toContain('data-topology-selection-behavior="in-page-drawer"');
    expect(html).toContain('data-topology-selection-source="none"');
    expect(html).toContain('data-topology-selection-node-id="none"');
    expect(html).toContain('data-topology-selection-edge-id="none"');
    expect(html).toContain('data-topology-g6-mount-lifecycle-browser-regression="selection-preserve-viewport"');
    expect(html).toContain('data-topology-g6-mount-lifecycle-browser-regression-owner="hertzbeat-ui-g6-mount-lifecycle"');
    expect(html).toContain('data-topology-g6-mount-lifecycle-selection-policy="node-edge-table-drawer-only"');
    expect(html).toContain('data-topology-g6-mount-lifecycle-url-policy="preserve-current-url-on-selection"');
    expect(html).toContain('data-topology-g6-mount-lifecycle-redraw-policy="shared-setData-draw-preserve-viewport"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-policy="structure-layout-height-only"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-redraw-policy="setData-draw-preserve-viewport"');
    expect(html).toContain('data-topology-focus-navigation="explicit-soft-route"');
    expect(html).toContain('data-topology-focus-navigation-owner="hertzbeat-ui-g6-focus-entry"');
    expect(html).toContain('data-topology-focus-navigation-trigger="double-click-node"');
    expect(html).toContain('data-topology-focus-route-preservation="previous-graph-until-api-resolves"');
    expect(html).toContain('data-topology-focus-route-preservation-owner="hertzbeat-ui-g6-focus-entry"');
    expect(html).toContain('data-topology-focus-route-preservation-source="loaded-api-graph-state"');
    expect(html).toContain('data-topology-scope-navigation="explicit-soft-route"');
    expect(html).toContain('data-topology-scope-navigation-owner="hertzbeat-ui-toolbar-scope-controls"');
    expect(html).toContain('data-topology-scope-navigation-preservation="previous-graph-until-api-resolves"');
    expect(html).toContain('data-topology-layout-navigation="in-page-g6-layout"');
    expect(html).toContain('data-topology-layout-navigation-owner="hertzbeat-ui-toolbar-layout-control"');
    expect(html).toContain('data-topology-layout-navigation-url-policy="preserve-current-url"');
    expect(html).toContain('data-topology-search-navigation="in-page-g6-search"');
    expect(html).toContain('data-topology-search-navigation-owner="hertzbeat-ui-toolbar-search-control"');
    expect(html).toContain('data-topology-search-navigation-url-policy="preserve-current-url"');
  }, 120000);

  it('renders HertzBeat topology sources, graph nodes, and operations closure actions', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage apiGraph={buildApiTopologyFixture()} />);

    expect(html).toContain('data-topology-route="hertzbeat-entity-topology"');
    expect(html).toContain('data-topology-data-source="api"');
    expect(html).toContain('data-topology-workbench-frame-owner="hertzbeat-ui-workbench-frame"');
    expect(html).toContain('data-topology-workbench-frame-boundary-owner="hertzbeat-ui-workbench-frame-boundary"');
    expect(html).toContain('data-hz-ui="topology-workbench-frame"');
    expect(html).toContain('data-hz-topology-primitive="workbench-frame"');
    expect(html).toContain('data-hz-topology-workbench-boundary="route"');
    expect(html).toContain('data-hz-topology-workbench-frame-boundary-owner="hertzbeat-ui-workbench-frame-boundary"');
    expect(html).toContain('data-topology-workbench-header-owner="hertzbeat-ui-workbench-header"');
    expect(html).toContain('data-hz-ui="topology-workbench-header"');
    expect(html).toContain('data-hz-topology-primitive="workbench-header"');
    expect(html).toContain('data-hz-topology-workbench-header-owner="hertzbeat-ui-workbench-header"');
    expect(html).toContain('data-hz-topology-workbench-eyebrow-owner="hertzbeat-ui-workbench-eyebrow"');
    expect(html).toContain('data-hz-topology-workbench-title-owner="hertzbeat-ui-workbench-title"');
    expect(html).toContain('data-hz-topology-workbench-header-density="operational-compact"');
    expect(html).toContain('data-hz-topology-workbench-header-density-owner="hertzbeat-ui-workbench-header-density"');
    expect(html).toContain('data-hz-topology-workbench-header-boundary="none"');
    expect(html).toContain('data-hz-topology-workbench-header-boundary-owner="hertzbeat-ui-workbench-header-boundary"');
    expect(html).toContain('data-hz-topology-workbench-header-alignment="shared-control-grid"');
    expect(html).toContain('data-hz-topology-workbench-header-inset="16px"');
    expect(html).toContain('data-hz-topology-workbench-header-control-height="28px"');
    expect(html).toContain('data-hz-topology-workbench-copy-visibility="assistive"');
    expect(html).toContain('data-hz-topology-workbench-scope-slot-owner="hertzbeat-ui-workbench-scope-slot"');
    expect(html).not.toContain('data-hz-topology-workbench-source-slot-owner="hertzbeat-ui-workbench-source-slot"');
    expect(html).toContain('data-topology-workbench-grid-owner="hertzbeat-ui-workbench-grid"');
    expect(html).toContain('data-hz-ui="topology-workbench-grid"');
    expect(html).toContain('data-hz-topology-workbench-grid-owner="hertzbeat-ui-workbench-grid"');
    expect(html).toContain('data-hz-topology-workbench-grid-layout="canvas-only"');
    expect(html).toContain('data-topology-scope-bar-owner="hertzbeat-ui-scope-bar"');
    expect(html).toContain('data-topology-scope-bar-boundary-owner="hertzbeat-ui-scope-bar-boundary"');
    expect(html).toContain('data-hz-ui="topology-scope-bar"');
    expect(html).toContain('data-hz-topology-primitive="scope-bar"');
    expect(html).toContain('data-hz-topology-scope-bar-boundary="none"');
    expect(html).toContain('data-hz-topology-scope-bar-boundary-owner="hertzbeat-ui-scope-bar-boundary"');
    expect(html).toContain('data-hz-topology-scope-summary-visibility="assistive"');
    expect(html).toContain('data-hz-topology-scope-summary-deduped-by="topology-toolbar"');
    expect(html).toContain('data-hz-topology-scope-item-visibility="assistive"');
    expect(html).toContain('data-hz-topology-scope-item="environment"');
    expect(html).toContain('data-hz-topology-scope-item-owner="hertzbeat-ui-scope-item"');
    expect(html).toContain('data-hz-topology-scope-item-value-owner="hertzbeat-ui-scope-item-value"');
    expect(html).toContain('data-hz-topology-scope-item="time-range"');
    expect(html).toContain('data-hz-topology-scope-action="refresh"');
    expect(html).toContain('data-hz-topology-scope-action-owner="hertzbeat-ui-scope-action"');
    expect(html).toContain('data-topology-focus-trail="focused-context"');
    expect(html).toContain('data-topology-focus-trail-owner="hertzbeat-ui-focus-trail"');
    expect(html).toContain('data-topology-focus-trail-boundary-owner="hertzbeat-ui-focus-trail-boundary"');
    expect(html).toContain('data-hz-ui="topology-focus-trail"');
    expect(html).toContain('data-hz-topology-primitive="focus-trail"');
    expect(html).toContain('data-hz-topology-focus-trail-mode="focused"');
    expect(html).toContain('data-hz-topology-focus-trail-mode-owner="hertzbeat-ui-focus-trail-mode"');
    expect(html).toContain('data-hz-topology-focus-trail-depth="2"');
    expect(html).toContain('data-hz-topology-focus-trail-depth-owner="hertzbeat-ui-focus-trail-depth"');
    expect(html).toContain('data-hz-topology-focus-trail-entity="svc-checkout"');
    expect(html).toContain('data-hz-topology-focus-trail-entity-owner="hertzbeat-ui-focus-trail-entity"');
    expect(html).toContain('data-hz-topology-focus-trail-density="graph-dock"');
    expect(html).toContain('data-hz-topology-focus-trail-layout="single-line-nowrap"');
    expect(html).toContain('data-hz-topology-focus-trail-height-contract="one-compact-row"');
    expect(html).toContain('data-hz-topology-focus-trail-occlusion="none"');
    expect(html).toContain('data-hz-topology-focus-trail-position-contract="document-flow"');
    expect(html).toContain('data-hz-topology-focus-trail-priority="canvas"');
    expect(html).toContain('data-hz-topology-focus-trail-alignment="shared-control-grid"');
    expect(html).toContain('data-hz-topology-focus-trail-inset="0px"');
    expect(html).toContain('data-hz-topology-focus-trail-control-height="28px"');
    expect(html).toContain('data-hz-topology-focus-trail-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-focus-trail-visual-weight-owner="hertzbeat-ui-focus-trail-visual-weight"');
    expect(html).toContain('data-hz-topology-focus-filter-visibility="assistive"');
    expect(html).toContain('data-hz-topology-focus-filter-visibility-owner="hertzbeat-ui-focus-trail-filter-visibility"');
    expect(html).toContain('data-hz-topology-focus-filter-deduped-by="topology-toolbar"');
    expect(html).toContain('data-hz-topology-focus-trail-chrome="frameless"');
    expect(html).toContain('data-hz-topology-focus-trail-frame="none"');
    expect(html).toContain('data-topology-focus-trail-compactness="graph-dock"');
    expect(html).toContain('data-hz-topology-focus-trail-boundary="none"');
    expect(html).toContain('data-hz-topology-focus-trail-boundary-owner="hertzbeat-ui-focus-trail-boundary"');
    expect(html).toContain('data-hz-topology-focus-trail-label-owner="hertzbeat-ui-focus-trail-label"');
    expect(html).toContain('data-hz-topology-focus-crumbs-owner="hertzbeat-ui-focus-trail-crumbs"');
    expect(html).toContain('data-hz-topology-focus-crumb="all"');
    expect(html).toContain('data-hz-topology-focus-crumb-owner="hertzbeat-ui-focus-trail-crumb"');
    expect(html).toContain('data-hz-topology-focus-crumb="active-entity"');
    expect(html).toContain('data-hz-topology-focus-crumb-active="true"');
    expect(html).toContain('data-hz-topology-focus-crumb-label-owner="hertzbeat-ui-focus-trail-crumb-label"');
    expect(html).toContain('data-hz-topology-focus-crumb-value-owner="hertzbeat-ui-focus-trail-crumb-value"');
    expect(html).toContain('data-hz-topology-focus-filters-owner="hertzbeat-ui-focus-trail-filters"');
    expect(html).toContain('data-hz-topology-focus-filter="environment"');
    expect(html).toContain('data-hz-topology-focus-filter="time-range"');
    expect(html).toContain('data-hz-topology-focus-filter="source"');
    expect(html).toContain('data-hz-topology-focus-filter="view"');
    expect(html).toContain('data-hz-topology-focus-hidden-count-owner="hertzbeat-ui-focus-trail-hidden-count"');
    expect(html).toContain('data-topology-focus-trail-hidden-count-owner="hertzbeat-ui-focus-trail-hidden-count"');
    expect(html).toContain('data-hz-topology-focus-exit-owner="hertzbeat-ui-focus-trail-exit"');
    expect(html).toContain('data-topology-focus-trail-exit-owner="hertzbeat-ui-focus-trail-exit"');
    expect(html).toMatch(
      /data-hz-topology-focus-exit-href="\/topology\?[^"]*environment=prod[^"]*timeRange=last-1h[^"]*depth=2/
    );
    expect(html).toContain('data-hz-topology-focus-exit-href-owner="hertzbeat-ui-focus-trail-exit-href"');
    expect(html).toContain('data-topology-group-panel="large-graph-grouping"');
    expect(html).toContain('data-topology-group-panel-owner="hertzbeat-ui-group-panel"');
    expect(html).toContain('data-topology-group-panel-boundary-owner="hertzbeat-ui-group-panel-boundary"');
    expect(html).toContain('data-hz-ui="topology-group-panel"');
    expect(html).toContain('data-hz-topology-primitive="group-panel"');
    expect(html).toContain('data-hz-topology-group-panel-boundary="framed"');
    expect(html).toContain('data-hz-topology-group-panel-item="entity-type"');
    expect(html).toContain('data-hz-topology-group-panel-item="environment"');
    expect(html).toContain('data-hz-topology-group-panel-item="source-kind"');
    expect(html).toContain('data-hz-topology-group-panel-item-active="true"');
    expect(html).toContain('data-hz-topology-group-panel-item-collapsed-count="');
    expect(html).toContain('data-hz-topology-group-panel-action="clear-group"');
    expect(html).toContain('data-topology-path-summary="selected-edge-context"');
    expect(html).toContain('data-topology-path-summary-owner="hertzbeat-ui-path-summary"');
    expect(html).toContain('data-topology-path-summary-boundary-owner="hertzbeat-ui-path-summary-boundary"');
    expect(html).toContain('data-hz-ui="topology-path-summary"');
    expect(html).toContain('data-hz-topology-primitive="path-summary"');
    expect(html).toContain('data-hz-topology-path-summary-boundary="section"');
    expect(html).toContain('data-hz-topology-path-interaction-owner="hertzbeat-ui-path-summary-interaction"');
    expect(html).toContain('data-hz-topology-path-selected-edge="svc-frontend--svc-checkout"');
    expect(html).toContain('data-hz-topology-path-hovered-edge="svc-frontend--svc-checkout"');
    expect(html).toContain('data-hz-topology-path-source-id="svc-frontend"');
    expect(html).toContain('data-hz-topology-path-target-id="svc-checkout"');
    expect(html).toContain('data-hz-topology-path-relation-type="trace-call"');
    expect(html).toContain('data-hz-topology-path-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-path-endpoint="source"');
    expect(html).toContain('data-hz-topology-path-endpoint="target"');
    expect(html).toContain('data-hz-topology-path-relation-owner="hertzbeat-ui-path-summary-relation"');
    expect(html).toContain('data-hz-topology-path-metric="request-rate"');
    expect(html).toContain('data-hz-topology-path-action="focus-path"');
    expect(html).toContain('data-hz-topology-path-action="open-trace"');
    expect(html).toContain('data-topology-controls="hertzbeat-topology-controls"');
    expect(html).toContain('data-topology-controls-owner="hertzbeat-ui-toolbar"');
    expect(html).toContain('data-topology-toolbar-boundary-owner="hertzbeat-ui-toolbar-boundary"');
    expect(html).toContain('data-hz-ui="topology-toolbar"');
    expect(html).toContain('data-hz-topology-primitive="toolbar"');
    expect(html).toContain('data-hz-topology-toolbar-density="graph-first"');
    expect(html).toContain('data-hz-topology-toolbar-density-owner="hertzbeat-ui-toolbar-density"');
    expect(html).toContain('data-hz-topology-toolbar-first-viewport-priority="canvas"');
    expect(html).toContain('data-hz-topology-toolbar-first-viewport-owner="hertzbeat-ui-toolbar-first-viewport"');
    expect(html).toContain('data-hz-topology-toolbar-row-contract="single-row-overflow"');
    expect(html).toContain('data-hz-topology-toolbar-row-contract-owner="hertzbeat-ui-toolbar-row-contract"');
    expect(html).toContain('data-hz-topology-toolbar-alignment="flush-control-grid"');
    expect(html).toContain('data-hz-topology-toolbar-inset="0px"');
    expect(html).toContain('data-hz-topology-toolbar-control-height="28px"');
    expect(html).toContain('data-hz-topology-toolbar-select-padding="compact-flush"');
    expect(html).toContain('data-hz-topology-toolbar-row-separator="none"');
    expect(html).toContain('data-hz-topology-toolbar-control-gap="6px"');
    expect(html).not.toContain('overflow-x-auto px-4 py-1');
    expect(html).toContain('overflow-x-auto px-0 py-1');
    expect(html).toContain('h-7 !gap-1.5 !pl-1 !pr-1.5');
    expect(html).not.toContain('h-7 !pl-2 !pr-1.5');
    expect(html).toContain('data-hz-topology-toolbar-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-toolbar-visual-weight-owner="hertzbeat-ui-toolbar-visual-weight"');
    expect(html).toContain('data-hz-topology-toolbar-secondary-visibility="assistive"');
    expect(html).toContain('data-hz-topology-toolbar-secondary-visibility-owner="hertzbeat-ui-toolbar-secondary-visibility"');
    expect(html).toContain('data-hz-topology-toolbar-boundary="none"');
    expect(html).toContain('data-hz-topology-toolbar-boundary-owner="hertzbeat-ui-toolbar-boundary"');
    expect(html).toContain('data-hz-topology-toolbar-action-policy="scope-controls-only"');
    expect(html).toContain('data-hz-topology-toolbar-canvas-action-policy="in-canvas-g6-toolbar"');
    expect(html).toContain('data-hz-topology-toolbar-chrome="frameless"');
    expect(html).toContain('data-hz-topology-toolbar-frame="none"');
    expect(html).toContain('data-hz-topology-control="environment"');
    expect(html).toContain('data-hz-topology-control-owner="hertzbeat-ui-toolbar-control"');
    expect(html).toContain('data-hz-topology-control="search"');
    expect(html).toContain('data-hz-topology-control="source-kind"');
    expect(html).toContain('data-hz-topology-control-source-kind-owner="hertzbeat-ui-toolbar-source-kind-control"');
    expect(html).toContain('data-hz-topology-control-source-kind-value="');
    expect(html).not.toContain('data-hz-topology-control="fit-view"');
    expect(html).not.toContain('data-hz-topology-control="locate-entity"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip="source-depth-group-reset"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip-owner="hertzbeat-ui-toolbar-control-strip"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip-layout="inline-overflow"');
    expect(html).toContain('data-hz-topology-toolbar-control-strip-layout-owner="hertzbeat-ui-toolbar-control-strip-layout"');
    expect(html).toContain('data-hz-topology-control="depth"');
    expect(html).toContain('data-hz-topology-control-depth-owner="hertzbeat-ui-toolbar-depth-control"');
    expect(html).toContain('data-hz-topology-control-depth-value="2"');
    expect(html).not.toContain('data-hz-topology-control="layout"');
    expect(html).toContain('data-hz-topology-control="group-by"');
    expect(html).toContain('data-hz-topology-control-group-owner="hertzbeat-ui-toolbar-group-control"');
    expect(html).toContain('data-hz-topology-control-group-value="none"');
    expect(html).toContain('data-hz-topology-control="reset-scope"');
    expect(html).toContain('data-hz-topology-control-reset-owner="hertzbeat-ui-toolbar-reset-control"');
    expect(html).toContain('data-hz-topology-toolbar-summary-owner="hertzbeat-ui-toolbar-summary"');
    expect(html).toContain('data-hz-topology-toolbar-summary-visibility="assistive"');
    expect(html).toContain('data-hz-topology-toolbar-summary-label-owner="hertzbeat-ui-toolbar-summary-label"');
    expect(html).toContain('data-hz-topology-summary-item-owner="hertzbeat-ui-toolbar-summary-item"');
    expect(html).toContain('data-topology-toolbar-state-owner="hertzbeat-ui-toolbar-state"');
    expect(html).toContain('data-hz-topology-toolbar-state="focus-depth-group"');
    expect(html).toContain('data-hz-topology-toolbar-state-visibility="assistive"');
    expect(html).toContain('data-hz-topology-toolbar-state-owner="hertzbeat-ui-toolbar-state"');
    expect(html).toContain('data-hz-topology-state-label-owner="hertzbeat-ui-toolbar-state-label"');
    expect(html).toContain('data-hz-topology-state-item="focus"');
    expect(html).toContain('data-hz-topology-state-item-owner="hertzbeat-ui-toolbar-state-item"');
    expect(html).toContain('data-hz-topology-state-indicator-owner="hertzbeat-ui-toolbar-state-indicator"');
    expect(html).toContain('data-hz-topology-state-item-label-owner="hertzbeat-ui-toolbar-state-item-label"');
    expect(html).toContain('data-hz-topology-state-item-value-owner="hertzbeat-ui-toolbar-state-item-value"');
    expect(html).toContain('data-hz-topology-state-item="depth"');
    expect(html).not.toContain('data-hz-topology-state-item="layout"');
    expect(html).toContain('data-hz-topology-state-item="group"');
    expect(html).toContain('data-topology-focus-state="svc-checkout"');
    expect(html).toContain('data-topology-depth-state="2"');
    expect(html).toContain('data-topology-group-state="none"');
    expect(html).not.toContain('data-topology-source-strip="relationship-source-contract"');
    expect(html).not.toContain('data-topology-source-control="relationship-source"');
    expect(html).toContain('data-topology-view-mode-strip-owner="hertzbeat-ui-filter-strip"');
    expect(html).toContain('data-hz-topology-filter-strip-variant="view-list"');
    expect(html).toContain('data-hz-topology-filter-strip-copy-visibility="assistive"');
    expect(html).toContain('data-hz-topology-filter-strip-copy-visibility-owner="hertzbeat-ui-filter-strip-copy-visibility"');
    expect(html).toContain('data-topology-view-mode-strip-boundary-owner="hertzbeat-ui-filter-strip-boundary"');
    expect(html).toContain('data-hz-topology-filter-item="service-call"');
    expect(html).toContain('data-hz-topology-filter-item-label-owner="hertzbeat-ui-filter-strip-label"');
    expect(html).toContain('data-hz-topology-filter-item-copy-owner="hertzbeat-ui-filter-strip-copy"');
    expect(html).toContain('sr-only');
    expect(html).toContain('data-topology-companion-rail-owner="hertzbeat-ui-companion-rail"');
    expect(html).toContain('data-topology-companion-rail-boundary-owner="hertzbeat-ui-companion-rail-boundary"');
    expect(html).toContain('data-topology-companion-rail-scope="legend-metrics-timeline-detail"');
    expect(html).toContain('data-topology-companion-rail-visibility="hidden-from-layout"');
    expect(html).toContain('data-topology-companion-rail-priority="graph-first"');
    expect(html).toContain('data-hz-ui="topology-companion-rail"');
    expect(html).toContain('data-hz-topology-primitive="companion-rail"');
    expect(html).toContain('data-hz-topology-companion-priority="graph-first"');
    expect(html).toContain('data-hz-topology-companion-priority-owner="hertzbeat-ui-companion-rail-priority"');
    expect(html).toContain('data-hz-topology-companion-scroll="contained"');
    expect(html).toContain('data-hz-topology-companion-scroll-owner="hertzbeat-ui-companion-rail-scroll"');
    expect(html).toContain('data-hz-topology-companion-viewport-contract="graph-height"');
    expect(html).toContain('data-hz-topology-companion-sticky-context="jump-list"');
    expect(html).toContain('data-hz-topology-companion-sticky-context-owner="hertzbeat-ui-companion-rail-sticky-context"');
    expect(html).toContain('data-hz-topology-companion-sticky-target="topology-companion-jump-list"');
    expect(html).toContain('data-hz-topology-companion-sticky-target-owner="hertzbeat-ui-companion-rail-sticky-target"');
    expect(html).toContain('data-topology-companion-jump-list-owner="hertzbeat-ui-companion-jump-list"');
    expect(html).toContain('data-hz-ui="topology-companion-jump-list"');
    expect(html).toContain('data-hz-topology-primitive="companion-jump-list"');
    expect(html).toContain('data-hz-topology-companion-jump-list-owner="hertzbeat-ui-companion-jump-list"');
    expect(html).toContain('data-hz-topology-companion-jump-list-density="graph-first"');
    expect(html).toContain('data-hz-topology-companion-jump-list-interaction="anchor-jump"');
    expect(html).toContain('data-hz-topology-companion-jump-list-sticky="top"');
    expect(html).toContain('data-hz-topology-companion-jump-list-scroll-scope="contained-rail"');
    expect(html).toContain('data-hz-topology-companion-jump-list-scroll-scope-owner="hertzbeat-ui-companion-jump-list-scroll-scope"');
    expect(html).toContain('data-hz-topology-companion-jump-list-active-mode="contained-rail-scroll"');
    expect(html).toContain('data-hz-topology-companion-jump-list-active-mode-owner="hertzbeat-ui-companion-jump-list-active-mode"');
    expect(html).toContain('data-hz-topology-companion-jump-item="view-mode"');
    expect(html).toContain('data-hz-topology-companion-jump-href="#topology-companion-view-mode"');
    expect(html).toContain('data-hz-topology-companion-jump-scroll-owner="hertzbeat-ui-companion-jump-scroll"');
    expect(html).toContain('data-hz-topology-companion-jump-active-source="manual"');
    expect(html).toContain('data-hz-topology-companion-jump-item="edge-red"');
    expect(html).toContain('data-hz-topology-companion-jump-href="#topology-companion-edge-red"');
    expect(html).toContain('data-topology-companion-section="legend"');
    expect(html).toContain('data-topology-companion-section="edge-red"');
    expect(html).toContain('data-topology-companion-section="current-node"');
    expect(html).toContain('data-hz-ui="topology-companion-section"');
    expect(html).toContain('data-hz-topology-primitive="companion-section"');
    expect(html).toContain('data-hz-topology-companion-section-owner="hertzbeat-ui-companion-section"');
    expect(html).toContain('data-hz-topology-companion-section-anchor-owner="hertzbeat-ui-companion-section-anchor"');
    expect(html).toContain('data-topology-companion-section-collapsible="edge-red"');
    expect(html).toContain('data-hz-topology-companion-section-collapsible="true"');
    expect(html).toContain('data-hz-topology-companion-section-toggle-owner="hertzbeat-ui-companion-section-toggle"');
    expect(html).toContain('data-hz-topology-companion-section-body-owner="hertzbeat-ui-companion-section-body"');
    expect(html).toContain('data-hz-topology-companion-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-companion-visual-weight-owner="hertzbeat-ui-companion-rail-visual-weight"');
    expect(html).toContain('data-hz-topology-companion-spacing="shared-stack"');
    expect(html).toContain('data-hz-topology-companion-spacing-owner="hertzbeat-ui-companion-rail-spacing"');
    expect(html).toContain('data-hz-topology-companion-boundary="side"');
    expect(html).toContain('data-hz-topology-companion-boundary-owner="hertzbeat-ui-companion-rail-boundary"');
    expect(html).toContain('data-hz-topology-companion-content-owner="hertzbeat-ui-companion-rail-content"');
    expect(html).toContain('data-topology-view-mode-label-owner="hertzbeat-ui-section-label"');
    expect(html).toContain('data-hz-ui="topology-section-label"');
    expect(html).toContain('data-hz-topology-primitive="section-label"');
    expect(html).toContain('data-hz-topology-section-label-density="compact"');
    expect(html).toContain('data-hz-topology-section-label-owner="hertzbeat-ui-section-label"');
    expect(html).toContain('data-hz-topology-section-label-text-owner="hertzbeat-ui-section-label-text"');
    expect(html).toContain('data-topology-canvas="hertzbeat-topology-canvas"');
    expect(html).toContain('data-topology-canvas-owner="hertzbeat-ui-canvas"');
    expect(html).toContain('data-topology-canvas-slot-owner="hertzbeat-ui-workbench-slot"');
    expect(html).toContain('data-topology-companion-slot-owner="hertzbeat-ui-workbench-slot"');
    expect(html).toContain('data-hz-ui="topology-workbench-slot"');
    expect(html).toContain('data-hz-topology-primitive="workbench-slot"');
    expect(html).toContain('data-hz-topology-workbench-slot-owner="hertzbeat-ui-workbench-slot"');
    expect(html).toContain('data-hz-topology-workbench-slot-kind="canvas"');
    expect(html).toContain('data-hz-topology-workbench-slot-kind="companion"');
    expect(html).toContain('data-hz-topology-workbench-slot-surface="content"');
    expect(html).toContain('data-hz-topology-workbench-grid-canvas-stickiness="none"');
    expect(html).toContain('data-hz-topology-workbench-grid-canvas-stickiness-owner="hertzbeat-ui-workbench-grid-canvas-stickiness"');
    expect(html).toContain('data-hz-ui="topology-canvas"');
    expect(html).toContain('data-hz-topology-primitive="canvas"');
    expect(html).toContain('data-hz-topology-canvas-layout="layered-service"');
    expect(html).toContain('data-hz-topology-canvas-layout-owner="hertzbeat-ui-canvas-layout"');
    expect(html).toContain('data-hz-topology-canvas-interaction-mode="inspect"');
    expect(html).toContain('data-topology-canvas-interaction-owner="hertzbeat-ui-canvas-interaction"');
    expect(html).toContain('data-hz-topology-canvas-interaction-owner="hertzbeat-ui-canvas-interaction"');
    expect(html).toContain('data-topology-canvas-interaction-scope-owner="hertzbeat-ui-canvas-interaction-scope"');
    expect(html).toContain('data-hz-topology-canvas-interaction-scope-owner="hertzbeat-ui-canvas-interaction-scope"');
    expect(html).toContain('data-hz-topology-canvas-interaction-scope="hover-group"');
    expect(html).toContain('data-topology-canvas-boundary-owner="hertzbeat-ui-canvas-boundary"');
    expect(html).toContain('data-hz-topology-canvas-boundary="none"');
    expect(html).toContain('data-hz-topology-canvas-boundary-owner="hertzbeat-ui-canvas-boundary"');
    expect(html).toContain('data-hz-topology-canvas-min-height-owner="hertzbeat-ui-canvas-min-height"');
    expect(html).toContain('data-hz-topology-canvas-hover-mode="neighbor-highlight"');
    expect(html).toContain('data-hz-topology-canvas-drawer-mode="node-edge"');
    expect(html).toContain('data-hz-topology-canvas-focus-depth="2-hop"');
    expect(html).toContain('data-topology-canvas-annotation-owner="hertzbeat-ui-canvas-annotation"');
    expect(html).toContain('data-hz-ui="topology-canvas-annotation"');
    expect(html).toContain('data-hz-topology-primitive="canvas-annotation"');
    expect(html).toContain('data-hz-topology-canvas-annotation-placement="top-left"');
    expect(html).toContain('data-hz-topology-canvas-annotation-owner="hertzbeat-ui-canvas-annotation"');
    expect(html).toContain('data-hz-topology-canvas-annotation-visibility="assistive"');
    expect(html).toContain('data-hz-topology-canvas-annotation-occlusion="none"');
    expect(html).toContain('data-hz-topology-canvas-annotation-hit-test="pass-through"');
    expect(html).toContain('data-hz-topology-canvas-annotation-title-owner="hertzbeat-ui-canvas-annotation-title"');
    expect(html).toContain('data-hz-topology-canvas-annotation-copy-owner="hertzbeat-ui-canvas-annotation-copy"');
    expect(html).toContain('data-topology-renderer="antv-g6"');
    expect(html).toContain('data-topology-g6-canvas-owner="hertzbeat-ui-g6-canvas"');
    expect(html).toContain('data-hz-ui="topology-g6-canvas"');
    expect(html).toContain('data-hz-topology-primitive="g6-canvas"');
    expect(html).toContain('data-hz-topology-g6-engine="antv-g6"');
    expect(html).toContain('data-hz-topology-g6-interaction-owner="hertzbeat-ui-g6-interaction"');
    expect(html).toContain('data-hz-topology-g6-auto-fit="initial-only"');
    expect(html).toContain('data-hz-topology-g6-auto-fit-owner="hertzbeat-ui-g6-auto-fit"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry="live"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-owner="hertzbeat-ui-g6-viewport-telemetry"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-timing="after-action-settled"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-timing-owner="hertzbeat-ui-g6-viewport-telemetry-timing"');
    expect(html).toContain('data-hz-topology-g6-viewport-alias-owner="hertzbeat-ui-g6-viewport-telemetry-alias"');
    expect(html).toContain('data-hz-topology-g6-viewport-zoom="unknown"');
    expect(html).toContain('data-hz-topology-g6-viewport-position="unknown"');
    expect(html).toContain('data-hz-topology-g6-command-bridge="custom-event"');
    expect(html).toContain('data-hz-topology-g6-command-bridge-owner="hertzbeat-ui-g6-command-bridge"');
    expect(html).toContain('data-hz-topology-g6-command-event="hz-topology-g6-viewport-command"');
    expect(html).toContain('data-hz-topology-g6-command-request="idle"');
    expect(html).toContain('data-hz-topology-g6-command-request-owner="hertzbeat-ui-g6-command-request"');
    expect(html).toContain('data-hz-topology-g6-wheel-mode="manual-clamped-g6-zoom"');
    expect(html).toContain('data-hz-topology-g6-wheel-owner="hertzbeat-ui-g6-wheel"');
    expect(html).toContain('data-hz-topology-g6-wheel-listener-passive="false-control"');
    expect(html).toContain('data-hz-topology-g6-wheel-origin="pointer-clamped"');
    expect(html).toContain('data-hz-topology-g6-wheel-zoom-bounds="0.18-4.8"');
    expect(html).toContain('data-hz-topology-g6-keyboard-shortcuts="plus-minus-zero-fit"');
    expect(html).toContain('data-hz-topology-g6-keyboard-shortcuts-owner="hertzbeat-ui-g6-keyboard"');
    expect(html).toContain('data-hz-topology-g6-keyboard-actions="zoom-in zoom-out reset-view fit-view"');
    expect(html).toContain(
      'data-topology-g6-render-window-priority-contract="search-only-no-selection-reorder"'
    );
    expect(html).toContain(
      'data-topology-g6-render-window-priority-owner="hertzbeat-ui-g6-render-window-priority"'
    );
    expect(html).toContain(
      'data-hz-topology-g6-render-window-priority-behavior="search-only-no-selection-reorder"'
    );
    expect(html).toContain('data-hz-topology-g6-render-window-priority-node-ids="none"');
    expect(html).toContain('data-hz-topology-g6-minimap="viewport-overview"');
    expect(html).toContain('data-hz-topology-g6-minimap-owner="hertzbeat-ui-g6-minimap"');
    expect(html).toContain('data-hz-topology-g6-minimap-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-minimap-occlusion="none"');
    expect(html).toContain('data-hz-topology-g6-minimap-node-count="7"');
    expect(html).toContain('data-hz-topology-g6-minimap-edge-count="7"');
    expect(html).toContain('data-hz-topology-g6-minimap-viewport-source="initial"');
    expect(html).toContain('data-hz-topology-g6-node-selection="drawer-sync"');
    expect(html).toContain('data-hz-topology-g6-edge-selection="drawer-sync"');
    expect(html).toContain('data-hz-topology-g6-hover-owner="hertzbeat-ui-g6-hover"');
    expect(html).toContain('data-hz-topology-g6-hover-source="selection"');
    expect(html).toContain('data-hz-topology-g6-hovered-node="none"');
    expect(html).toContain('data-hz-topology-g6-hovered-edge="none"');
    expect(html).toContain('data-hz-topology-g6-active-focus-source="selection"');
    expect(html).toContain('data-hz-topology-g6-search-owner="hertzbeat-ui-g6-search"');
    expect(html).toContain('data-hz-topology-g6-search-query="none"');
    expect(html).toContain('data-hz-topology-g6-search-match-count="0"');
    expect(html).toContain('data-hz-topology-g6-search-first-match="none"');
    expect(html).toContain('data-hz-topology-g6-selected-focus-owner="hertzbeat-ui-g6-selected-focus"');
    expect(html).toContain('data-hz-topology-g6-selected-focus-target="svc-checkout"');
    expect(html).toContain('data-hz-topology-g6-selected-focus-status="ready"');
    expect(html).toContain('data-hz-topology-g6-action="focus-selected-node"');
    expect(html).toContain('data-hz-topology-g6-neighbor-focus-owner="hertzbeat-ui-g6-neighbor-focus"');
    expect(html).toContain('data-hz-topology-g6-focused-node="svc-checkout"');
    expect(html).toContain('data-hz-topology-g6-upstream-node-count="4"');
    expect(html).toContain('data-hz-topology-g6-downstream-node-count="2"');
    expect(html).toContain('data-hz-topology-g6-node-neighbor-owner="hertzbeat-ui-g6-node-neighbor"');
    expect(html).toContain('data-hz-topology-g6-edge-neighbor-owner="hertzbeat-ui-g6-edge-neighbor"');
    expect(html).toContain('data-hz-topology-g6-stage="antv-g6-stage"');
    expect(html).toContain('data-hz-topology-g6-action="fit-view"');
    expect(html).toContain('data-hz-topology-g6-action="reset-view"');
    expect(html).toContain('data-hz-topology-g6-filter-owner="hertzbeat-ui-g6-filter"');
    expect(html).toContain('data-hz-topology-g6-filter-environment="prod"');
    expect(html).toContain('data-hz-topology-g6-filter-source-kind="all"');
    expect(html).toContain('data-hz-topology-g6-filter-search-query="none"');
    expect(html).toContain('data-hz-topology-g6-filter-group-by="none"');
    expect(html).toContain('data-hz-topology-g6-filter-visible-node-count="7"');
    expect(html).toContain('data-hz-topology-g6-filter-visible-edge-count="7"');
    expect(html).toContain('data-hz-topology-g6-filter-source-match="true"');
    expect(html).toContain('data-hz-topology-g6-filter-control-owner="hertzbeat-ui-g6-filter-control"');
    expect(html).toContain('data-hz-topology-g6-filter-control-count="4"');
    expect(html).toContain('data-hz-topology-g6-filter-control="source-kind"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="source-kind"');
    expect(html).toContain('data-hz-topology-g6-filter-control-value="all"');
    expect(html).toContain('data-hz-topology-g6-filter-control="group-by"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="group-by"');
    expect(html).toContain('data-hz-topology-g6-filter-control-value="none"');
    expect(html).toContain('data-hz-topology-g6-filter-control="search"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="search"');
    expect(html).not.toContain('data-hz-topology-g6-filter-control-value="checkout-api"');
    expect(html).not.toContain('value="checkout-api"');
    expect(html).toContain('data-hz-topology-g6-filter-control="reset"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="reset"');
    expect(html).toContain('data-hz-topology-g6-overlay-mode="non-occluding"');
    expect(html).toContain('data-hz-topology-g6-summary-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-filter-control-surface-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-toolbar-visibility="visible"');
    expect(html.indexOf('data-topology-canvas="hertzbeat-topology-canvas"')).toBeLessThan(
      html.indexOf('data-topology-group-panel="large-graph-grouping"')
    );
    expect(html.indexOf('data-topology-canvas="hertzbeat-topology-canvas"')).toBeLessThan(
      html.indexOf('data-topology-path-summary="selected-edge-context"')
    );
    expect(html).toContain('data-topology-node="service-node"');
    expect(html).toContain('data-topology-node-owner="hertzbeat-ui-node"');
    expect(html).toContain('data-hz-ui="topology-node"');
    expect(html).toContain('data-hz-topology-primitive="node"');
    expect(html).toContain('data-hz-topology-node-owner="hertzbeat-ui-node"');
    expect(html).toContain('data-hz-topology-node-focus="active"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="focus"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="upstream"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="downstream"');
    expect(html).toContain('data-hz-topology-node-label-owner="hertzbeat-ui-node-label"');
    expect(html).toContain('data-hz-topology-node-health-owner="hertzbeat-ui-node-health"');
    expect(html).toContain('data-hz-topology-node-health-label-owner="hertzbeat-ui-node-health-label"');
    expect(html).toContain('data-hz-topology-node-red-owner="hertzbeat-ui-node-red"');
    expect(html).toContain('data-hz-topology-node-red-metric-owner="hertzbeat-ui-node-red-metric"');
    expect(html).toContain('data-hz-topology-node-badge-list-owner="hertzbeat-ui-node-badge-list"');
    expect(html).toContain('data-hz-topology-node-badge-owner="hertzbeat-ui-node-badge"');
    expect(html).toContain('data-topology-node-health-affordance="lightweight-service-health"');
    expect(html).toContain('data-topology-node-health-copy="lightweight-service-health"');
    expect(html).toContain('data-topology-edge="service-edge"');
    expect(html).toContain('data-topology-edge-owner="hertzbeat-ui-edge"');
    expect(html).toContain('data-hz-ui="topology-edge"');
    expect(html).toContain('data-hz-topology-primitive="edge"');
    expect(html).toContain('data-hz-topology-edge-owner="hertzbeat-ui-edge"');
    expect(html).toContain('data-hz-topology-edge-variant="line"');
    expect(html).toContain('data-hz-topology-edge-line-owner="hertzbeat-ui-edge-line"');
    expect(html).toContain('data-hz-topology-edge-path-owner="hertzbeat-ui-edge-path"');
    expect(html).toContain('data-hz-topology-edge-arrow-owner="hertzbeat-ui-edge-arrow"');
    expect(html).toContain('data-hz-topology-edge-variant="drilldown"');
    expect(html).toContain('data-hz-topology-edge-drilldown-owner="hertzbeat-ui-edge-drilldown"');
    expect(html).toContain('data-hz-topology-edge-hit-target-owner="hertzbeat-ui-edge-hit-target"');
    expect(html).toContain('data-hz-topology-edge-red-owner="hertzbeat-ui-edge-red"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="incoming"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="outgoing"');
    expect(html).toContain('data-hz-topology-edge-badge-owner="hertzbeat-ui-edge-badge"');
    expect(html).not.toContain('data-topology-hover-tooltip-owner="hertzbeat-ui-hover-tooltip"');
    expect(html).toContain('data-topology-legend-owner="hertzbeat-ui-legend"');
    expect(html).toContain('data-topology-g6-legend-owner="hertzbeat-ui-g6-legend-dock"');
    expect(html).toContain('data-hz-topology-g6-legend-dock="in-canvas"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-owner="hertzbeat-ui-g6-legend-dock"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-placement="canvas-bottom-left"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-occlusion="inside-canvas-low-interruption"');
    expect(html).toContain('data-hz-topology-legend-density="canvas-dock"');
    expect(html).toContain('data-hz-topology-legend-layout="inline-g6-dock"');
    expect(html).toContain('data-hz-topology-legend-occlusion="low"');
    expect(html).toContain('data-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"');
    expect(html).toContain('data-hz-ui="topology-legend"');
    expect(html).toContain('data-hz-topology-primitive="legend"');
    expect(html).toContain('data-hz-topology-legend-boundary="framed"');
    expect(html).toContain('data-hz-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"');
    expect(html).toContain('data-hz-topology-legend-header-owner="hertzbeat-ui-legend-header"');
    expect(html).toContain('data-hz-topology-legend-title-owner="hertzbeat-ui-legend-title"');
    expect(html).toContain('data-hz-topology-legend-summary-owner="hertzbeat-ui-legend-summary"');
	    expect(html).toContain('data-hz-topology-legend-section="status"');
	    expect(html).toContain('data-hz-topology-legend-section-owner="hertzbeat-ui-legend-section"');
	    expect(html).toContain('data-hz-topology-legend-section-label-owner="hertzbeat-ui-legend-section-label"');
	    expect(html).toContain('data-hz-topology-legend-section="node-type"');
	    expect(html).toContain('data-hz-topology-legend-section="interaction"');
	    expect(html).not.toContain('data-hz-topology-legend-section="source-kind"');
	    expect(html).not.toContain('data-hz-topology-legend-section="confidence"');
	    expect(html).toContain('data-hz-topology-legend-item="node-type-service"');
	    expect(html).toContain('data-hz-topology-legend-item="node-type-database"');
	    expect(html).not.toContain('data-hz-topology-legend-item="node-type-alert"');
	    expect(html).not.toContain('data-hz-topology-legend-item="node-type-resource"');
	    expect(html).toContain('data-hz-topology-legend-icon-library="lucide-react"');
	    expect(html).toContain('data-hz-topology-legend-icon-source="entity-type-catalog"');
	    expect(html).toContain('data-hz-topology-legend-icon-name="component"');
	    expect(html).toContain('data-hz-topology-legend-icon-name="database"');
	    expect(html).toContain('data-hz-topology-legend-icon-no-handdrawn="true"');
	    expect(html).toContain('data-hz-topology-legend-item="healthy-node"');
	    expect(html).toContain('data-hz-topology-legend-item="warning-node"');
	    expect(html).toContain('data-hz-topology-legend-item="critical-node"');
    expect(html).toContain('data-hz-topology-legend-item="selected-node"');
    expect(html).toContain('data-hz-topology-legend-item="directional-edge"');
    expect(html).toContain('data-hz-topology-legend-item="dimmed-edge"');
	    expect(html).toContain('data-hz-topology-legend-color="#22c55e"');
	    expect(html).toContain('data-hz-topology-legend-color="#f59e0b"');
	    expect(html).toContain('data-hz-topology-legend-color="#ef4444"');
	    expect(html).toContain('data-hz-topology-legend-visual-mode="source-backed-text"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="lucide-react"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="hertzbeat-status-token"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="hertzbeat-interaction-token"');
	    expect(html).toContain('data-hz-topology-legend-visual-source="hertzbeat-edge-token"');
	    expect(html).toContain('data-hz-topology-legend-no-handdrawn-icon="true"');
	    expect(html).not.toContain('data-hz-topology-legend-swatch-owner=');
	    expect(html).not.toContain('data-hz-topology-legend-swatch-shape=');
	    expect(html).not.toContain('data-hz-topology-legend-swatch-shape="node-ring"');
	    expect(html).not.toContain('data-hz-topology-legend-swatch-shape="selected-ring"');
	    expect(html).toContain('data-hz-topology-legend-item-owner="hertzbeat-ui-legend-item"');
	    expect(html).toContain('data-hz-topology-legend-item-label-owner="hertzbeat-ui-legend-item-label"');
    expect(html).toContain('data-hz-topology-legend-item-value-owner="hertzbeat-ui-legend-item-value"');
    expect(html).not.toContain('data-hz-topology-legend-pattern="dashed"');
    expect(html).toContain('data-topology-detail-drawer-owner="hertzbeat-ui-detail-drawer"');
    expect(html).toContain('data-topology-detail-drawer-surface-owner="hertzbeat-ui-detail-surface"');
    expect(html).toContain('data-hz-ui="topology-detail-drawer"');
    expect(html).toContain('data-hz-topology-primitive="detail-drawer"');
    expect(html).toContain('data-hz-topology-detail-kind="edge"');
    expect(html).toContain('data-hz-topology-detail-surface="framed"');
    expect(html).toContain('data-hz-topology-detail-surface-owner="hertzbeat-ui-detail-surface"');
    expect(html).toContain('data-hz-topology-detail-identity-owner="hertzbeat-ui-detail-identity"');
    expect(html).toContain('data-hz-topology-detail-subject-id="svc-frontend--svc-checkout"');
    expect(html).toContain('data-hz-topology-detail-source-id="svc-frontend"');
    expect(html).toContain('data-hz-topology-detail-target-id="svc-checkout"');
    expect(html).toContain('data-hz-topology-detail-relation-type="trace-call"');
    expect(html).toContain('data-hz-topology-detail-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-detail-header-owner="hertzbeat-ui-detail-header"');
    expect(html).toContain('data-hz-topology-detail-eyebrow-owner="hertzbeat-ui-detail-eyebrow"');
    expect(html).toContain('data-hz-topology-detail-title-owner="hertzbeat-ui-detail-title"');
    expect(html).toContain('data-hz-topology-detail-subtitle-owner="hertzbeat-ui-detail-subtitle"');
    expect(html).toContain('data-hz-topology-detail-boundary="context"');
    expect(html).toContain('data-hz-topology-detail-boundary-owner="hertzbeat-ui-detail-boundary"');
    expect(html).toContain('data-topology-detail-boundary-owner="hertzbeat-ui-detail-boundary"');
    expect(html).toContain('data-hz-topology-detail-boundary-copy-owner="hertzbeat-ui-detail-boundary-copy"');
    expect(html).toContain('data-hz-topology-detail-fact-group-owner="hertzbeat-ui-detail-fact-group"');
    expect(html).toContain('data-hz-topology-detail-fact-owner="hertzbeat-ui-detail-fact"');
    expect(html).toContain('data-hz-topology-detail-fact-label-owner="hertzbeat-ui-detail-fact-label"');
    expect(html).toContain('data-hz-topology-detail-fact-value-owner="hertzbeat-ui-detail-fact-value"');
    expect(html).toContain('data-hz-topology-detail-fact-meta-owner="hertzbeat-ui-detail-fact-meta"');
    expect(html).toContain('data-hz-topology-detail-fact="source-entity"');
    expect(html).toContain('data-hz-topology-detail-fact="request-rate"');
    expect(html).toContain('data-hz-topology-detail-action-group-owner="hertzbeat-ui-detail-action-group"');
    expect(html).toContain('data-hz-topology-detail-action-link-owner="hertzbeat-ui-detail-action-link"');
    expect(html).toContain('data-hz-topology-detail-action-label-owner="hertzbeat-ui-detail-action-label"');
    expect(html).toContain('data-hz-topology-detail-action="alert-impact"');
    expect(html).toContain('data-hz-topology-detail-action-copy-owner="hertzbeat-ui-detail-action-copy"');
    expect(html).toContain('data-hz-topology-detail-signal-action-group-owner="hertzbeat-ui-detail-signal-action-group"');
    expect(html).toContain('data-hz-topology-detail-signal-label-owner="hertzbeat-ui-detail-signal-label"');
    expect(html).toContain('data-hz-topology-detail-signal-action-link-owner="hertzbeat-ui-detail-signal-action-link"');
    expect(html).toContain('data-hz-topology-detail-signal-action-label-owner="hertzbeat-ui-detail-signal-action-label"');
    expect(html).toContain('data-hz-topology-detail-signal-action="traces"');
    expect(html).toContain('data-topology-current-entity-panel-owner="hertzbeat-ui-detail-drawer"');
    expect(html).toContain('data-topology-current-entity-panel-surface-owner="hertzbeat-ui-detail-surface"');
    expect(html).toContain('data-topology-current-entity-panel="svc-checkout"');
    expect(html).toContain('data-hz-topology-detail-kind="node"');
    expect(html).toContain('data-hz-topology-detail-surface="framed"');
    expect(html).toContain('data-hz-topology-detail-surface-owner="hertzbeat-ui-detail-surface"');
    expect(html).toContain('data-hz-topology-detail-subject-id="svc-checkout"');
    expect(html).toContain('data-hz-topology-detail-entity-type="service"');
    expect(html).toContain('data-hz-topology-detail-header-owner="hertzbeat-ui-detail-header"');
    expect(html).toContain('data-hz-topology-detail-eyebrow-owner="hertzbeat-ui-detail-eyebrow"');
    expect(html).toContain('data-hz-topology-detail-title-owner="hertzbeat-ui-detail-title"');
    expect(html).toContain('data-hz-topology-detail-subtitle-owner="hertzbeat-ui-detail-subtitle"');
    expect(html).toContain('data-hz-topology-detail-boundary-owner="hertzbeat-ui-detail-boundary"');
    expect(html).toContain('data-topology-current-entity-boundary-owner="hertzbeat-ui-detail-boundary"');
    expect(html).toContain('data-hz-topology-detail-boundary-copy-owner="hertzbeat-ui-detail-boundary-copy"');
    expect(html).toContain('data-hz-topology-detail-fact-group-owner="hertzbeat-ui-detail-fact-group"');
    expect(html).toContain('data-hz-topology-detail-fact-owner="hertzbeat-ui-detail-fact"');
    expect(html).toContain('data-hz-topology-detail-fact-label-owner="hertzbeat-ui-detail-fact-label"');
    expect(html).toContain('data-hz-topology-detail-fact-value-owner="hertzbeat-ui-detail-fact-value"');
    expect(html).toContain('data-hz-topology-detail-fact-meta-owner="hertzbeat-ui-detail-fact-meta"');
    expect(html).toContain('data-hz-topology-detail-fact="health"');
    expect(html).toContain('data-hz-topology-detail-action-group-owner="hertzbeat-ui-detail-action-group"');
    expect(html).toContain('data-hz-topology-detail-action-link-owner="hertzbeat-ui-detail-action-link"');
    expect(html).toContain('data-hz-topology-detail-action-label-owner="hertzbeat-ui-detail-action-label"');
    expect(html).toContain('data-hz-topology-detail-action="entity"');
    expect(html).toContain('data-hz-topology-detail-signal-action-group-owner="hertzbeat-ui-detail-signal-action-group"');
    expect(html).toContain('data-hz-topology-detail-signal-label="signals"');
    expect(html).toContain('data-hz-topology-detail-signal-label-owner="hertzbeat-ui-detail-signal-label"');
    expect(html).toContain('data-hz-topology-detail-signal-action-link-owner="hertzbeat-ui-detail-signal-action-link"');
    expect(html).toContain('data-hz-topology-detail-signal-action-label-owner="hertzbeat-ui-detail-signal-action-label"');
    expect(html).toContain('data-hz-topology-detail-signal-action="metrics"');
    expect(html).toContain('运维拓扑');
    expect(html).not.toContain('HertzBeat 企业运维拓扑');
    expect(html).toContain('应用拓扑');
    expect(html).toContain('服务调用');
    expect(html).toContain('资源依赖');
    expect(html).toContain('告警影响面');
    expect(html).toContain('OTLP 调用关系');
    expect(html).toContain('监控对象归属');
    expect(html).toContain('模板依赖');
    expect(html).toContain('K8s 工作负载');
    expect(html).toContain('数据库 / 中间件连接');
    expect(html).toContain('CMDB / 手工标签');
    expect(html).toContain('checkout-api');
    expect(html).toContain('redis');
    expect(html).toContain('刷新拓扑');
    expect(html).toContain('适配视图');
    expect(html).toContain('data-topology-alert-impact-link="alert-center"');
    expect(html).toContain('data-topology-alert-impact-link-owner="hertzbeat-ui-action-link"');
    expect(html).toContain('data-topology-alert-impact-link-spacing-owner="hertzbeat-ui-action-link-spacing"');
    expect(html).toContain('data-hz-ui="topology-action-link"');
    expect(html).toContain('data-hz-topology-primitive="action-link"');
    expect(html).toContain('data-hz-topology-action-link="alert-impact"');
    expect(html).toContain('data-hz-topology-action-link-emphasis="primary"');
    expect(html).toContain('data-hz-topology-action-link-spacing="none"');
    expect(html).toContain('data-hz-topology-action-link-spacing-owner="hertzbeat-ui-action-link-spacing"');
    expect(html).toContain('data-hz-topology-action-link-label-owner="hertzbeat-ui-action-link-label"');
    expect(html).toContain('data-hz-topology-action-link-copy-owner="hertzbeat-ui-action-link-copy"');
    expect(html).toContain('查看实体详情');
    expect(html).toContain('打开三信号');
    expect(html).toContain('data-topology-node-select-href="/topology?');
    expect(html).toContain('data-topology-node-entity-href="/entities/service%3Acommerce%2Fcheckout?');
    expect(html).toContain('data-topology-context-link="entity"');
    expect(html).toContain('data-topology-context-link="metrics"');
    expect(html).toContain('data-topology-context-link="logs"');
    expect(html).toContain('data-topology-context-link="traces"');
    expect(html).toContain('data-topology-node-id="svc-checkout"');
    expect(html).toContain('checkout-api');
    expect(html).toContain('健康评分 82');
    expect(html).toContain('/ingestion/otlp/metrics?');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('/trace/manage?');
    expect(html).toContain('entityId=service%3Acommerce%2Fcheckout');
    expect(html).toContain('serviceName=checkout-api');
    expect(html).toContain('serviceNamespace=commerce');
    expect(html).toContain('environment=prod');
    expect(html).toContain('timeRange=last-1h');
    expect(html).not.toContain('Service Map');
    expect(html).not.toContain('Select Environment/s');
    expect(html).not.toContain('entry surface');
    expect(html).not.toContain('Monitor center');
  }, 90000);

  it('keeps the first viewport concise so topology controls and the graph lead the experience', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage apiGraph={buildApiTopologyFixture()} />);
    const headerStart = html.indexOf('data-topology-workbench-header-owner="hertzbeat-ui-workbench-header"');
    const headerEnd = html.indexOf('data-topology-focus-trail="focused-context"', headerStart);
    const headerHtml = html.slice(headerStart, headerEnd);

    expect(headerHtml).toContain('data-hz-topology-workbench-header-density="operational-compact"');
    expect(headerHtml).toContain('data-hz-topology-workbench-copy-visibility="assistive"');
    expect(headerHtml).not.toContain('data-hz-topology-workbench-source-slot-owner="hertzbeat-ui-workbench-source-slot"');
    expect(headerHtml).not.toContain('data-topology-source-strip-density="label-only"');
    expect(headerHtml).not.toContain('data-topology-source-strip-compactness="single-line-wrap"');
    expect(headerHtml).not.toContain('data-hz-topology-filter-strip-variant="source-rail"');
    expect(headerHtml).toContain('运维拓扑');
    expect(headerHtml).not.toContain('OTLP 调用关系');
    expect(headerHtml).not.toContain('CMDB / 手工标签');
    expect(headerHtml).not.toContain('data-hz-topology-workbench-copy-owner="hertzbeat-ui-workbench-copy"');
    expect(headerHtml).not.toContain('以实体中心为锚点');
    expect(headerHtml).not.toContain('从 trace span 归并服务调用边');
    expect(headerHtml).not.toContain('从 HertzBeat 监控对象绑定实体');
    expect(headerHtml).not.toContain('从 CMDB 导入和手工标签补齐归属');
  });

  it('renders API-backed topology graph data when the topology read API returns nodes and edges', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{ entityId: '501', environment: 'prod', timeRange: 'last-30m' }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: 501,
          depth: 2,
          sourceKinds: ['otlp-trace-call'],
          nodes: [
            {
              id: '501',
              entityId: 501,
              entityName: 'api-checkout',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'warning',
              focus: true,
              evidenceBadges: ['entity-relation', 'otlp']
            },
            {
              id: '502',
              entityId: 502,
              entityName: 'api-orders',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'healthy',
              focus: false,
              evidenceBadges: ['entity-relation', 'otlp']
            }
          ],
          edges: [
            {
              id: '700',
              relationId: 700,
              sourceEntityId: 501,
              targetEntityId: 502,
              relationType: 'trace-call',
              relationSource: 'otlp-trace-call',
              sampleTraceId: 'trace-701',
              sampleSpanId: 'span-701',
              firstSeen: '2026-05-20T03:01:00Z',
              lastSeen: '2026-05-20T03:08:00Z',
              status: 'active',
              score: 96,
              evidenceBadges: ['entity-relation', 'otlp-trace-call']
            }
          ]
        }}
      />
    );

    expect(html).toContain('data-topology-data-source="api"');
    expect(html).toContain('data-topology-node-id="entity-501"');
    expect(html).toContain('data-topology-node-id="entity-502"');
    expect(html).toContain('api-checkout');
    expect(html).toContain('api-orders');
    expect(html).toContain('data-topology-edge-id="relation-700"');
    expect(html).not.toContain('data-topology-node-id="svc-checkout"');
    expect(html).not.toContain('checkout-api');
  }, 30000);

  it('maps focused 1-hop routes into shared FocusTrail handoff metadata and scoped exit hrefs', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          entityId: 'service:commerce/checkout',
          entityName: 'checkout-api',
          serviceName: 'checkout-api',
          serviceNamespace: 'commerce',
          environment: 'prod',
          timeRange: 'last-30m',
          sourceKind: 'cmdb-manual-label',
          groupBy: 'source-kind',
          viewMode: 'application',
          edgeId: 'svc-frontend--svc-checkout',
          depth: '1'
        }}
        apiGraph={buildApiTopologyFixture()}
      />
    );

    expect(html).toContain('data-hz-topology-focus-trail-mode="focused"');
    expect(html).toContain('data-hz-topology-focus-trail-depth="1"');
    expect(html).toContain('data-hz-topology-focus-trail-entity="svc-checkout"');
    expect(html).toContain('data-hz-topology-focus-crumb-active="true"');
    expect(html).toContain('data-hz-topology-focus-filter="source"');
    expect(html).toContain('data-topology-focus-filter-source="cmdb-manual-label"');
    expect(html).toMatch(
      /<a(?=[^>]*data-hz-topology-focus-exit-owner="hertzbeat-ui-focus-trail-exit")(?=[^>]*data-hz-topology-focus-exit-href="\/topology\?[^"]*environment=prod)(?=[^>]*data-hz-topology-focus-exit-href="\/topology\?[^"]*timeRange=last-30m)(?=[^>]*data-hz-topology-focus-exit-href="\/topology\?[^"]*sourceKind=cmdb-manual-label)(?=[^>]*data-hz-topology-focus-exit-href="\/topology\?[^"]*groupBy=source-kind)(?=[^>]*data-hz-topology-focus-exit-href="\/topology\?[^"]*depth=2)(?=[^>]*data-hz-topology-focus-exit-href="\/topology\?[^"]*edgeId=svc-frontend--svc-checkout)[^>]*>/
    );
    expect(html).not.toMatch(/data-hz-topology-focus-exit-href="[^"]*entityId=/);
    expect(html).not.toMatch(/data-hz-topology-focus-exit-href="[^"]*serviceName=/);
  }, 30000);

  it('forwards groupBy route scope into the shared G6 grouping metadata and controls', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          entityId: '501',
          environment: 'prod',
          timeRange: 'last-30m',
          sourceKind: 'otlp-trace-call',
          groupBy: 'source-kind'
        }}
        apiGraph={buildApiTopologyFixture()}
      />
    );

    expect(html).toContain('data-hz-topology-g6-filter-group-by="source-kind"');
    expect(html).toMatch(/data-hz-topology-g6-filter-group-count="[1-9]\d*"/);
    expect(html).toContain('data-hz-topology-g6-group-owner="hertzbeat-ui-g6-group"');
    expect(html).toContain('data-hz-topology-g6-group-by="source-kind"');
    expect(html).toContain('data-hz-topology-g6-group-active="true"');
    expect(html).toMatch(/data-hz-topology-g6-group-item-count="[1-9]\d*"/);
    expect(html).toContain('data-hz-topology-g6-group-surface-owner="hertzbeat-ui-g6-group-surface"');
    expect(html).toContain('data-hz-topology-g6-group-surface-visibility="assistive"');
    expect(html).not.toContain('absolute left-3 top-12 flex');
    expect(html).toContain('data-hz-topology-g6-group-item="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-g6-group-item-action-owner="hertzbeat-ui-g6-group-item-action"');
    expect(html).toMatch(
      /<a(?=[^>]*data-hz-topology-g6-group-item="otlp-trace-call")(?=[^>]*href="\/topology\?[^"]*sourceKind=otlp-trace-call)(?=[^>]*href="\/topology\?[^"]*groupBy=source-kind)[^>]*>/
    );
    expect(html).toContain('data-hz-topology-g6-filter-control="group-by"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="group-by"');
    expect(html).toContain('data-hz-topology-g6-filter-control-value="source-kind"');
    expect(html).toContain('data-hz-topology-g6-filter-control-active-state="true"');
    expect(html).toMatch(
      /<a(?=[^>]*data-hz-topology-g6-filter-control="reset")(?=[^>]*href="\/topology\?[^"]*sourceKind=otlp-trace-call)[^>]*>/
    );
    expect(html).not.toMatch(
      /<a(?=[^>]*data-hz-topology-g6-filter-control="reset")(?=[^>]*href="\/topology\?[^"]*groupBy=source-kind)[^>]*>/
    );
    expect(html).toContain('data-hz-topology-control="source-kind"');
    expect(html).toContain('data-hz-topology-control-source-kind-owner="hertzbeat-ui-toolbar-source-kind-control"');
    expect(html).toContain('data-hz-topology-control-source-kind-value="otlp-trace-call"');
    expect(html).not.toContain('data-topology-source-control="relationship-source"');
    expect(html).toMatch(
      /<a(?=[^>]*data-topology-view-mode="resource-dependency")(?=[^>]*href="\/topology\?[^"]*viewMode=resource-dependency)(?=[^>]*href="\/topology\?[^"]*groupBy=source-kind)[^>]*>/
    );
    expect(html).toMatch(
      /<button(?=[^>]*data-topology-node-id="svc-frontend")(?=[^>]*data-hz-topology-g6-metadata-role="selection-button")(?=[^>]*data-topology-node-select-href="\/topology\?[^"]*groupBy=source-kind)[^>]*>/
    );
    expect(html).toContain('data-hz-topology-g6-focus-entry="double-click-node"');
    expect(html).toContain('data-hz-topology-g6-focus-depth-target="1-hop"');
    expect(html).toMatch(
      /<button(?=[^>]*data-topology-node-id="svc-frontend")(?=[^>]*data-topology-node-select-href="\/topology\?[^"]*depth=2)(?=[^>]*data-topology-node-focus-href="\/topology\?[^"]*depth=1)[^>]*>/
    );
    expect(html).toMatch(
      /data-topology-current-entity-panel="svc-checkout"[^>]*data-topology-current-entity-group-by="source-kind"[^>]*data-topology-current-entity-source-kind="otlp-trace-call"[^>]*data-topology-current-entity-view-mode="application"/
    );
  }, 30000);

  it('exposes focused API graph depth, relationship type, health, and evidence badges for browser verification', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{ entityId: '501', environment: 'prod', timeRange: 'last-30m' }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: 501,
          depth: 2,
          sourceKinds: ['otlp-trace-call', 'database-middleware-connection'],
          nodes: [
            {
              id: '501',
              entityId: 501,
              entityName: 'api-checkout',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'warning',
              focus: true,
              evidenceBadges: ['entity-relation', 'otlp-trace-call', 'health:warning']
            },
            {
              id: '502',
              entityId: 502,
              entityName: 'api-orders',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'healthy',
              evidenceBadges: ['entity-relation', 'otlp-trace-call', 'one-hop']
            },
            {
              id: '503',
              entityId: 503,
              entityName: 'api-postgres',
              entityType: 'database',
              namespace: 'commerce',
              environment: 'prod',
              health: 'critical',
              evidenceBadges: ['entity-relation', 'database-middleware-connection', 'two-hop']
            }
          ],
          edges: [
            {
              id: '701',
              relationId: 701,
              sourceEntityId: 501,
              targetEntityId: 502,
              relationType: 'trace-call',
              relationSource: 'otlp-trace-call',
              sampleTraceId: 'trace-701',
              sampleSpanId: 'span-701',
              firstSeen: '2026-05-20T03:01:00Z',
              lastSeen: '2026-05-20T03:08:00Z',
              status: 'active',
              score: 96,
              evidenceBadges: ['entity-relation', 'otlp-trace-call', 'one-hop']
            },
            {
              id: '702',
              relationId: 702,
              sourceEntityId: 502,
              targetEntityId: 503,
              relationType: 'database connection',
              relationSource: 'database-middleware-connection',
              status: 'critical',
              score: 42,
              evidenceBadges: ['entity-relation', 'database-middleware-connection', 'two-hop']
            }
          ]
        }}
      />
    );

    expect(html).toContain('data-topology-api-depth="2"');
    expect(html).toMatch(/data-topology-node-id="entity-501"[^>]+data-topology-node-health="warning"[^>]+data-topology-node-evidence-badges="entity-relation otlp-trace-call health:warning"/);
    expect(html).toMatch(/data-topology-node-id="entity-503"[^>]+data-topology-node-health="critical"[^>]+data-topology-node-evidence-badges="entity-relation database-middleware-connection two-hop"/);
    expect(html).toMatch(/data-topology-edge-id="relation-701"[^>]+data-topology-edge-relationship-type="trace-call"[^>]+data-topology-edge-evidence-badges="entity-relation otlp-trace-call one-hop"/);
    expect(html).toMatch(/data-topology-edge-id="relation-702"[^>]+data-topology-edge-relationship-type="database-connection"[^>]+data-topology-edge-evidence-badges="entity-relation database-middleware-connection two-hop"/);
  }, 30000);

  it('exposes trace-derived service graph RED metrics on nodes, edges, and selected evidence', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          entityId: '501',
          edgeId: 'relation-701',
          environment: 'prod',
          timeRange: 'last-30m',
          viewMode: 'service-call'
        }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: 501,
          depth: 2,
          sourceKinds: ['otlp-trace-call'],
          nodes: [
            {
              id: '501',
              entityId: 501,
              entityName: 'api-checkout',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'warning',
              focus: true,
              evidenceBadges: ['entity-relation', 'otlp-trace-call'],
              redMetrics: {
                requestRatePerSecond: 12.34,
                errorRate: 0.042,
                latencyP95Ms: 180
              }
            },
            {
              id: '502',
              entityId: 502,
              entityName: 'api-orders',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'healthy',
              evidenceBadges: ['entity-relation', 'otlp-trace-call'],
              redMetrics: {
                requestRatePerSecond: 9.5,
                errorRate: 0.01,
                latencyP95Ms: 95
              }
            }
          ],
          edges: [
            {
              id: '701',
              relationId: 701,
              sourceEntityId: 501,
              targetEntityId: 502,
              relationType: 'trace-call',
              relationSource: 'otlp-trace-call',
              sampleTraceId: 'trace-701',
              sampleSpanId: 'span-701',
              firstSeen: '2026-05-20T03:01:00Z',
              lastSeen: '2026-05-20T03:08:00Z',
              status: 'active',
              score: 96,
              evidenceBadges: ['entity-relation', 'otlp-trace-call', 'service-graph'],
              redMetrics: {
                requestRatePerSecond: 7.25,
                errorRate: 0.021,
                latencyP95Ms: 123
              }
            }
          ]
        }}
      />
    );

    expect(html).toContain('data-topology-node-id="entity-501"');
    expect(html).toContain('data-topology-node-request-rate="12.34"');
    expect(html).toContain('data-topology-node-error-rate="0.042"');
    expect(html).toContain('data-topology-node-latency-p95-ms="180"');
    expect(html).toContain('data-topology-edge-id="relation-701"');
    expect(html).toContain('data-topology-trace-call-proof-owner="hertzbeat-ui-workbench-frame"');
    expect(html).toContain('data-topology-trace-call-edge-count="1"');
    expect(html).toContain('data-topology-trace-call-red-edge-count="1"');
    expect(html).toContain('data-topology-trace-call-window-edge-count="1"');
    expect(html).toContain('data-topology-trace-call-sample-edge-count="1"');
    expect(html).toContain('data-topology-trace-call-red-state="ready"');
    expect(html).toContain('data-topology-edge-request-rate="7.25"');
    expect(html).toContain('data-topology-edge-error-rate="0.021"');
    expect(html).toContain('data-topology-edge-latency-p95-ms="123"');
    expect(html).toContain('data-topology-current-entity-red-metric="request-rate"');
    expect(html).toContain('data-topology-current-entity-panel-owner="hertzbeat-ui-detail-drawer"');
    expect(html).toContain('data-hz-topology-detail-fact="request-rate"');
    expect(html).toContain('data-hz-topology-detail-action="entity"');
    expect(html).toContain('12.34/s');
    expect(html).toContain('4.2%');
    expect(html).toContain('180 ms');
    expect(html).toContain('data-topology-edge-evidence-panel="relation-701"');
    expect(html).toContain('data-topology-edge-evidence-window-owner="hertzbeat-ui-detail-drawer"');
    expect(html).toContain('data-topology-edge-evidence-first-seen="2026-05-20T03:01:00Z"');
    expect(html).toContain('data-topology-edge-evidence-last-seen="2026-05-20T03:08:00Z"');
    expect(html).toContain('data-topology-edge-evidence-sample-trace-id="trace-701"');
    expect(html).toContain('data-topology-edge-evidence-sample-span-id="span-701"');
    expect(html).toContain('data-hz-topology-detail-fact="sample-trace"');
    expect(html).toContain('trace-701');
    expect(html).toContain('span-701');
    expect(html).toContain('data-hz-topology-detail-fact="first-seen"');
    expect(html).toContain('2026-05-20T03:01:00Z');
    expect(html).toContain('2026-05-20T03:08:00Z');
    expect(html).toContain('data-topology-edge-red-metric="request-rate"');
    expect(html).toContain('7.25/s');
    expect(html).toContain('2.1%');
    expect(html).toContain('123 ms');
    expect(html).toContain('data-topology-metric-table-owner="hertzbeat-ui"');
    expect(html).toContain('data-topology-metric-table-boundary-owner="hertzbeat-ui-metric-table-boundary"');
    expect(html).toContain('data-topology-metric-table-interaction-owner="hertzbeat-ui-metric-table-interaction"');
    expect(html).toContain('data-hz-ui="topology-metric-table"');
    expect(html).toContain('data-hz-topology-metric-table-boundary="framed"');
    expect(html).toContain('data-hz-topology-metric-table-density="graph-first"');
    expect(html).toContain('data-hz-topology-metric-table-density-owner="hertzbeat-ui-metric-table-density"');
    expect(html).toContain('data-hz-topology-metric-table-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-metric-table-row-density="compressed-red"');
    expect(html).toContain('data-hz-topology-metric-table-boundary-owner="hertzbeat-ui-metric-table-boundary"');
    expect(html).toContain('data-hz-topology-metric-table-header-owner="hertzbeat-ui-metric-table-header"');
    expect(html).toContain('data-hz-topology-metric-rows="1"');
    expect(html).toContain('data-hz-topology-metric-table-interaction="row-select-detail"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-owner="hertzbeat-ui-metric-table-render-window"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-mode="direct"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-node-companion="inactive"');
    expect(html).toContain('data-hz-topology-metric-table-priority-node-ids="none"');
    expect(html).toContain('data-hz-topology-metric-table-visible-row-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-partial-row-count="0"');
    expect(html).toContain('data-hz-topology-metric-table-hidden-row-count="0"');
    expect(html).toContain('data-hz-topology-metric-table-unknown-row-count="0"');
    expect(html).toContain('data-topology-metric-table-filter-behavior="in-page-no-route-change"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-filter-owner="hertzbeat-ui-metric-table-render-window-filter"');
    expect(html).toContain('data-hz-topology-metric-table-render-window-filter="all"');
    expect(html).toContain('data-hz-topology-metric-table-filtered-row-count="1"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control-owner="hertzbeat-ui-metric-table-filter-control"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="visible"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="partial"');
    expect(html).toContain('data-hz-topology-metric-table-filter-control="hidden"');
    expect(html).toContain('data-hz-topology-edge-row-render-window-visibility="visible"');
    expect(html).toContain('data-hz-topology-edge-row-source-node-id="entity-501"');
    expect(html).toContain('data-hz-topology-edge-row-target-node-id="entity-502"');
    expect(html).toContain('data-hz-topology-edge-row-source-visible="true"');
    expect(html).toContain('data-hz-topology-edge-row-target-visible="true"');
    expect(html).toContain('data-topology-metric-table-selection-clear-owner="hertzbeat-ui-g6-hover-clear"');
    expect(html).toContain('data-hz-topology-metric-table-row-owner="hertzbeat-ui-metric-table-row"');
    expect(html).toContain('data-hz-topology-edge-row="relation-701"');
    expect(html).toContain('data-hz-topology-edge-selected="true"');
    expect(html).toContain('data-hz-topology-metric-table-route-owner="hertzbeat-ui-metric-table-route"');
    expect(html).toContain('data-hz-topology-metric-table-badge-owner="hertzbeat-ui-metric-table-badge"');
    expect(html).toContain('data-hz-topology-metric-table-cell-owner="hertzbeat-ui-metric-table-cell"');
    expect(html).toContain('data-hz-topology-metric-table-value-owner="hertzbeat-ui-metric-table-value"');
    expect(html).toContain('data-hz-topology-metric-table-label-owner="hertzbeat-ui-metric-table-label"');
    expect(html).toContain('data-hz-topology-edge-action="relation-701"');
    expect(html).toContain('data-hz-topology-metric-table-action-owner="hertzbeat-ui-metric-table-action"');
    expect(html).toContain('data-hz-topology-request-rate="7.25"');
    expect(html).toContain('data-hz-topology-error-rate="0.021"');
    expect(html).toContain('data-hz-topology-latency-p95-ms="123"');
    expect(html).toContain('边指标排行');
  }, 60000);

  it('renders API-backed impact timeline evidence when topology returns change events', async () => {
    i18nState.locale = 'en-US';
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{ entityId: '501', environment: 'prod', timeRange: 'last-1h' }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: 501,
          depth: 1,
          sourceKinds: ['entity-relation'],
          nodes: [
            {
              id: '501',
              entityId: 501,
              entityName: 'api-checkout',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'warning',
              focus: true,
              evidenceBadges: ['entity-relation']
            },
            {
              id: '502',
              entityId: 502,
              entityName: 'api-orders',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'healthy',
              evidenceBadges: ['entity-relation']
            }
          ],
          edges: [
            {
              id: '101',
              relationId: 101,
              sourceEntityId: 501,
              targetEntityId: 502,
              relationType: 'depends_on',
              relationSource: 'manual',
              status: 'confirmed',
              score: 92,
              evidenceBadges: ['entity-relation', 'manual']
            }
          ],
          impactTimeline: [
            {
              id: 'activity:901',
              entityId: 501,
              sourceKind: 'cmdb-manual-label',
              eventType: 'entity-definition',
              title: 'Definition updated',
              detail: 'owner changed',
              actor: 'alice',
              occurredAt: '2026-05-19T11:12:00'
            },
            {
              id: 'relation:101',
              edgeId: '101',
              sourceKind: 'cmdb-manual-label',
              eventType: 'relation-updated',
              title: 'depends_on updated',
              detail: 'manual',
              actor: 'system',
              occurredAt: '2026-05-19T11:10:00'
            }
          ]
        }}
      />
    );

    expect(html).toContain('data-topology-impact-timeline="api-evidence"');
    expect(html).toContain('data-topology-impact-timeline-owner="hertzbeat-ui-evidence-list"');
    expect(html).toContain('data-topology-impact-timeline-boundary-owner="hertzbeat-ui-evidence-list-boundary"');
    expect(html).toContain('data-hz-topology-evidence-list-kind="impact-timeline"');
    expect(html).toContain('data-hz-topology-evidence-list-boundary="companion-timeline"');
    expect(html).toContain('data-hz-topology-evidence-list-boundary-owner="hertzbeat-ui-evidence-list-boundary"');
    expect(html).toContain('data-hz-topology-evidence-header-owner="hertzbeat-ui-evidence-list-header"');
    expect(html).toContain('data-hz-topology-evidence-title-owner="hertzbeat-ui-evidence-list-title"');
    expect(html).toContain('data-hz-topology-evidence-copy-owner="hertzbeat-ui-evidence-list-copy"');
    expect(html).toContain('data-hz-topology-evidence-count-owner="hertzbeat-ui-evidence-list-count"');
    expect(html).toContain('data-topology-impact-timeline-event="activity:901"');
    expect(html).toContain('data-hz-topology-evidence-item-owner="hertzbeat-ui-evidence-list-item"');
    expect(html).toContain('data-hz-topology-evidence-item-label-owner="hertzbeat-ui-evidence-list-item-label"');
    expect(html).toContain('data-hz-topology-evidence-item-value-owner="hertzbeat-ui-evidence-list-item-value"');
    expect(html).toContain('data-hz-topology-evidence-item-meta-owner="hertzbeat-ui-evidence-list-item-meta"');
    expect(html).toContain('data-topology-impact-timeline-event="relation:101"');
    expect(html).toContain('Impact timeline');
    expect(html).toContain('Definition updated');
    expect(html).toContain('owner changed');
    expect(html).toContain('alice');
    expect(html).toContain('depends_on updated');
    expect(html).not.toContain('topology.timeline.');
  }, 30000);

  it('renders API-backed empty topology without the old static seed graph', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          entityId: 'service:commerce/checkout',
          environment: 'prod',
          timeRange: 'last-1h',
          sourceKind: 'otlp-trace-call',
          relationType: 'trace-call'
        }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: null,
          depth: 2,
          sourceKinds: ['entity-relation', 'otlp-trace-call'],
          nodes: [],
          edges: []
        }}
      />
    );

    expect(html).toContain('data-topology-data-source="api"');
    expect(html).toContain('data-topology-empty-state="trace-call-missing"');
    expect(html).toContain('data-topology-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(html).toContain('data-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"');
    expect(html).toContain('data-hz-ui="topology-empty-state"');
    expect(html).toContain('data-hz-topology-primitive="empty-state"');
    expect(html).toContain('data-hz-topology-empty-boundary="canvas"');
    expect(html).toContain('data-hz-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"');
    expect(html).toContain('data-hz-topology-empty-kind="filtered-empty"');
    expect(html).toContain('data-hz-topology-empty-source="Greptime trace graph"');
    expect(html).toContain('data-hz-topology-empty-time-scope="last-1h"');
    expect(html).toContain('data-hz-topology-empty-scope-owner="hertzbeat-ui-empty-scope"');
    expect(html).toContain('data-hz-topology-empty-environment="prod"');
    expect(html).toContain('data-hz-topology-empty-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-empty-relation-type="trace-call"');
    expect(html).toContain('data-hz-topology-empty-focus-entity-id="service:commerce/checkout"');
    expect(html).toContain('data-hz-topology-empty-depth="2"');
    expect(html).toContain('data-hz-topology-empty-result-count="0"');
    expect(html).toContain('data-hz-topology-empty-evidence-sources="otlp-trace-call greptime trace"');
    expect(html).toContain('暂无 trace 调用拓扑证据');
    expect(html).toContain('data-hz-topology-empty-title-owner="hertzbeat-ui-empty-title"');
    expect(html).toContain('data-hz-topology-empty-copy-owner="hertzbeat-ui-empty-copy"');
    expect(html).toContain('data-hz-topology-empty-meta-owner="hertzbeat-ui-empty-meta"');
    expect(html).toContain('data-hz-topology-empty-source-owner="hertzbeat-ui-empty-source"');
    expect(html).toContain('data-hz-topology-empty-time-scope-owner="hertzbeat-ui-empty-time-scope"');
    expect(html).not.toContain('data-topology-g6-legend-owner="hertzbeat-ui-g6-legend-dock"');
    expect(html).not.toContain('data-hz-ui="topology-legend"');
    expect(html).not.toContain('data-hz-topology-legend-section=');
    expect(html).not.toContain('data-topology-node-id="svc-checkout"');
    expect(html).not.toContain('checkout-api');
    expect(html).not.toContain('redis');
  }, 30000);

  it('shows explicit missing trace-call evidence instead of a node-only trace graph', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          environment: 'prod',
          timeRange: 'last-1h',
          sourceKind: 'otlp-trace-call',
          relationType: 'trace-call'
        }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: null,
          depth: 2,
          sourceKinds: ['otlp-trace-call'],
          nodes: [
            {
              id: '501',
              entityId: 501,
              entityName: 'Payment API',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'warning',
              evidenceBadges: ['entity-relation', 'manual']
            },
            {
              id: '502',
              entityId: 502,
              entityName: 'Orders DB',
              entityType: 'database',
              namespace: 'commerce',
              environment: 'prod',
              health: 'healthy',
              evidenceBadges: ['entity-relation', 'manual']
            }
          ],
          edges: []
        }}
      />
    );

    expect(html).toContain('data-topology-data-source="api"');
    expect(html).toContain('data-topology-trace-call-state="missing-edges"');
    expect(html).toContain('data-topology-empty-state="trace-call-missing"');
    expect(html).toContain('data-hz-topology-empty-kind="filtered-empty"');
    expect(html).toContain('data-hz-topology-empty-source="Greptime trace graph"');
    expect(html).toContain('data-hz-topology-empty-source-kind="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-empty-relation-type="trace-call"');
    expect(html).toContain('data-hz-topology-empty-result-count="0"');
    expect(html).toContain('data-hz-topology-empty-evidence-sources="otlp-trace-call greptime trace"');
    expect(html).toContain('暂无 trace 调用拓扑证据');
    expect(html).toContain('data-hz-topology-g6-node-count="0"');
    expect(html).toContain('data-hz-topology-g6-edge-count="0"');
  }, 15000);

  it('exposes the resolved topology API scope for Browser release-gate checks', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          environment: 'prod',
          timeRange: 'last-1h',
          sourceKind: 'otlp-trace-call',
          viewMode: 'service-call',
          depth: '2',
          groupBy: 'source-kind'
        }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: null,
          depth: 2,
          sourceKinds: ['otlp-trace-call'],
          nodes: [],
          edges: []
        }}
      />
    );

    expect(html).toContain('data-topology-api-scope-owner="hertzbeat-ui-workbench-frame"');
    expect(html).toContain('data-topology-api-request-path="/topology?depth=2&amp;environment=prod&amp;sourceKind=otlp-trace-call&amp;relationType=trace-call"');
    expect(html).toContain('data-topology-api-scope-source-kind="otlp-trace-call"');
    expect(html).toContain('data-topology-api-scope-relation-type="trace-call"');
    expect(html).toContain('data-topology-api-scope-view-mode="service-call"');
    expect(html).toContain('data-topology-api-timeout-ms="60000"');
    expect(html).toContain('data-hz-topology-empty-relation-type="trace-call"');
  }, 15000);

  it('keeps the default topology route API-owned while the client API is pending or unavailable', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const pendingHtml = renderToStaticMarkup(<TopologyPage routeContext={{ environment: 'prod', timeRange: 'last-1h' }} />);
    const pendingTraceCallHtml = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          environment: 'prod',
          timeRange: 'last-1h',
          sourceKind: 'otlp-trace-call',
          relationType: 'trace-call'
        }}
      />
    );
    const unavailableHtml = renderToStaticMarkup(
      <TopologyPage routeContext={{ environment: 'prod', timeRange: 'last-1h' }} apiGraph={null} />
    );
    const traceCallUnavailableHtml = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          environment: 'prod',
          timeRange: 'last-1h',
          sourceKind: 'otlp-trace-call',
          relationType: 'trace-call'
        }}
        apiGraph={null}
      />
    );

    expect(pendingHtml).toContain('data-topology-data-source="api"');
    expect(pendingHtml).toContain('data-topology-loading-state="api-pending"');
    expect(pendingHtml).toContain('data-topology-loading-state-owner="hertzbeat-ui-loading-state"');
    expect(pendingHtml).toContain('data-hz-ui="topology-loading-state"');
    expect(pendingHtml).toContain('data-hz-topology-primitive="loading-state"');
    expect(pendingHtml).toContain('data-hz-topology-loading-boundary="canvas"');
    expect(pendingHtml).toContain('data-hz-topology-loading-source="API"');
    expect(pendingHtml).toContain('data-hz-topology-loading-time-scope="last-1h"');
    expect(pendingHtml).toContain('data-hz-topology-loading-evidence-sources="api greptime trace relation"');
    expect(pendingHtml).toContain('正在加载拓扑证据');
    expect(pendingHtml).not.toContain('data-topology-empty-state="api-empty"');
    expect(pendingTraceCallHtml).toContain('data-topology-trace-call-state="pending"');
    expect(pendingTraceCallHtml).toContain('data-topology-trace-call-red-state="pending"');

    [pendingHtml, unavailableHtml].forEach(html => {
      expect(html).toContain('data-topology-data-source="api"');
      expect(html).not.toContain('data-topology-node-id="svc-checkout"');
      expect(html).not.toContain('checkout-api');
      expect(html).not.toContain('orders-db');
      expect(html).not.toContain('redis');
    });
    expect(unavailableHtml).toContain('data-topology-empty-state="degraded"');
    expect(unavailableHtml).toContain('data-topology-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(unavailableHtml).toContain('data-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"');
    expect(unavailableHtml).toContain('data-hz-ui="topology-empty-state"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-boundary="canvas"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-title-owner="hertzbeat-ui-empty-title"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-copy-owner="hertzbeat-ui-empty-copy"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-meta-owner="hertzbeat-ui-empty-meta"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-kind="degraded"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-source="拓扑 API 不可用"');
    expect(unavailableHtml).toContain('data-hz-topology-empty-evidence-sources="api unavailable"');
    expect(unavailableHtml).toContain('拓扑 API 不可用');
    expect(traceCallUnavailableHtml).toContain('data-topology-trace-call-state="degraded"');
    expect(traceCallUnavailableHtml).toContain('data-topology-empty-state="trace-call-degraded"');
    expect(traceCallUnavailableHtml).toContain('data-hz-topology-empty-source="Greptime trace graph"');
    expect(traceCallUnavailableHtml).toContain('data-hz-topology-empty-source-kind="otlp-trace-call"');
    expect(traceCallUnavailableHtml).toContain('data-hz-topology-empty-relation-type="trace-call"');
    expect(traceCallUnavailableHtml).toContain('data-hz-topology-empty-evidence-sources="otlp-trace-call greptime trace unavailable"');
  }, 30000);

  it('uses incoming entity context to seed filters, active topology node, and current signal links', async () => {
    const routeContext = {
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-30m'
    };

    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage routeContext={routeContext} apiGraph={buildApiTopologyFixture()} />);

    expect(html).toContain('data-topology-incoming-context="entity-filter"');
    expect(html).toContain('data-topology-active-node-id="svc-checkout"');
    expect(html).toContain('data-topology-filter-environment="prod"');
    expect(html).toContain('data-topology-filter-time-range="last-30m"');
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[^>]+data-topology-node-focus="active"/);
    expect(html).toMatch(/data-topology-edge-source="database-middleware-connection"[^>]+data-topology-edge-focus="active-path"/);
    expect(html).toContain('data-topology-view-mode-active="service-call"');
    expect(html).not.toContain('value="checkout-api"');
    expect(html).toContain('last-30m');
    expect(html).toContain('timeRange=last-30m');
    expect(html).toContain('当前筛选');
  }, 15000);

  it('uses view mode and source query params to narrow topology and expose alert-impact closure', async () => {
    const routeContext = {
      viewMode: 'alert-impact',
      sourceKind: 'alert-impact',
      environment: 'prod',
      timeRange: 'last-1h'
    };

    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage routeContext={routeContext} apiGraph={buildApiTopologyFixture()} />);

    expect(html).toContain('data-topology-active-view-mode="alert-impact"');
    expect(html).toContain('data-topology-active-source-kind="alert-impact"');
    expect(html).toContain('data-topology-view-mode-active="alert-impact"');
    expect(html).toContain('data-hz-topology-control-source-kind-value="alert-impact"');
    expect(html).not.toContain('data-topology-source-active="alert-impact"');
    expect(html).toContain('data-topology-edge-focus="active-path"');
    expect(html).toContain('data-topology-edge-focus="context-muted"');
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[^>]+data-topology-node-focus="active"/);
    expect(html).toContain('data-topology-alert-impact-link="alert-center"');
    expect(html).toContain('data-topology-alert-impact-link-owner="hertzbeat-ui-action-link"');
    expect(html).toContain('data-hz-topology-action-link-label-owner="hertzbeat-ui-action-link-label"');
    expect(html).toContain('data-hz-topology-action-link-copy-owner="hertzbeat-ui-action-link-copy"');
    expect(html).toContain('/alert/center?');
    expect(html).toContain('source=topology');
    expect(html).toContain('viewMode=alert-impact');
    expect(html).toContain('sourceKind=alert-impact');
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[^>]+data-topology-node-select-href="\/topology\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-node-id="svc-checkout"[^>]+data-topology-node-entity-href="\/entities\/service%3Acommerce%2Fcheckout\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="entity"[^>]+href="\/entities\/service%3Acommerce%2Fcheckout\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="metrics"[^>]+href="\/ingestion\/otlp\/metrics\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="logs"[^>]+href="\/log\/manage\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
    expect(html).toMatch(/data-topology-context-link="traces"[^>]+href="\/trace\/manage\?[^"]*viewMode=alert-impact[^"]*sourceKind=alert-impact/);
  }, 15000);

  it('renders selected edge evidence and drilldown links with retained topology context', async () => {
    const routeContext = {
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      environment: 'prod',
      timeRange: 'last-1h'
    };

    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage routeContext={routeContext} apiGraph={buildApiTopologyFixture()} />);

    expect(html).toContain('data-topology-active-edge-id="svc-checkout--res-orders-db"');
    expect(html).toContain('data-topology-edge-selected="true"');
    expect(html).toMatch(/data-topology-edge-id="svc-checkout--res-orders-db"[^>]+data-topology-edge-focus="active-path"/);
    expect(html).toContain('data-topology-edge-evidence-panel="svc-checkout--res-orders-db"');
    expect(html).toContain('关系证据');
    expect(html).toContain('data-hz-topology-detail-density="graph-first"');
    expect(html).toContain('data-hz-topology-detail-density-owner="hertzbeat-ui-detail-density"');
    expect(html).toContain('data-hz-topology-detail-visual-weight="low-interruption"');
    expect(html).toContain('data-hz-topology-detail-fact-density="compressed"');
    expect(html).toContain('database connection');
    expect(html).toContain('数据库 / 中间件连接');
    expect(html).toContain('采集证据');
    expect(html).toContain('checkout-api');
    expect(html).toContain('orders-db');
    expect(html).toContain('data-topology-edge-evidence-boundary="roadmap-boundary"');
    expect(html).toContain('当前边仅基于已采集的关系证据；依赖自动发现和根因分析仍是 roadmap 能力。');
    expect(html).toContain('data-topology-edge-link-copy="alert-impact"');
    expect(html).toContain('带当前边、实体和三信号上下文进入告警影响面。');
    expect(html).toMatch(/data-topology-edge-link="metrics"[^>]+href="\/ingestion\/otlp\/metrics\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
    expect(html).toMatch(/data-topology-edge-link="logs"[^>]+href="\/log\/manage\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
    expect(html).toMatch(/data-topology-edge-link="traces"[^>]+href="\/trace\/manage\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
    expect(html).toMatch(/data-topology-edge-link="alert-impact"[^>]+href="\/alert\/center\?[^"]*viewMode=resource-dependency[^"]*sourceKind=database-middleware-connection[^"]*edgeId=svc-checkout--res-orders-db/);
  }, 15000);

  it('renders current node drawer upstream and downstream dependency evidence', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          entityId: 'service:commerce/checkout',
          environment: 'prod',
          timeRange: 'last-1h',
          sourceKind: 'otlp-trace-call',
          groupBy: 'source-kind'
        }}
        apiGraph={buildApiTopologyFixture()}
      />
    );

    expect(html).toContain('data-topology-current-entity-panel="svc-checkout"');
    expect(html).toContain('data-topology-current-entity-neighbor-owner="hertzbeat-ui-detail-neighbor-evidence"');
    expect(html).toContain('data-topology-current-entity-upstream-count="4"');
    expect(html).toContain('data-topology-current-entity-downstream-count="2"');
    expect(html).toContain('data-topology-current-entity-upstream-node-ids="app-commerce svc-frontend monitor-checkout k8s-checkout-workload"');
    expect(html).toContain('data-topology-current-entity-downstream-node-ids="res-orders-db res-redis"');
    expect(html).toContain('data-hz-topology-detail-fact="upstream-dependencies"');
    expect(html).toContain('data-hz-topology-detail-fact="downstream-dependencies"');
    expect(html).toContain('data-topology-current-entity-neighbor-evidence="upstream"');
    expect(html).toContain('data-topology-current-entity-neighbor-evidence="downstream"');
    expect(html).toContain('commerce, frontend, HTTP template, checkout deploy');
    expect(html).toContain('orders-db, redis');
  }, 15000);

  it('keeps current node signal handoffs scoped to the selected G6 node context', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          entityId: 'service:commerce/checkout',
          environment: 'prod',
          timeRange: 'last-1h',
          viewMode: 'service-call',
          sourceKind: 'otlp-trace-call',
          groupBy: 'source-kind',
          depth: '2'
        }}
        apiGraph={buildApiTopologyFixture()}
      />
    );

    expect(html).toContain('data-topology-current-entity-panel="svc-checkout"');
    expect(html).toMatch(/data-topology-context-link="entity"[^>]+data-topology-current-entity-handoff-owner="hertzbeat-ui-current-node-handoff"/);
    expect(html).toMatch(/data-topology-context-link="metrics"[^>]+data-topology-current-entity-handoff-owner="hertzbeat-ui-current-node-handoff"/);
    expect(html).toMatch(/data-topology-context-link="logs"[^>]+data-topology-current-entity-handoff-owner="hertzbeat-ui-current-node-handoff"/);
    expect(html).toMatch(/data-topology-context-link="traces"[^>]+data-topology-current-entity-handoff-owner="hertzbeat-ui-current-node-handoff"/);
    expect(html).toMatch(/data-topology-context-link="metrics"[^>]+data-topology-current-entity-handoff-target="metrics"[^>]+data-topology-current-entity-handoff-node-id="svc-checkout"[^>]+data-topology-current-entity-handoff-entity-id="service:commerce\/checkout"/);
    expect(html).toMatch(/data-topology-context-link="traces"[^>]+data-topology-current-entity-handoff-source-kind="otlp-trace-call"[^>]+data-topology-current-entity-handoff-group-by="source-kind"[^>]+data-topology-current-entity-handoff-view-mode="service-call"/);
    expect(html).toMatch(/data-topology-context-link="logs"[^>]+data-topology-current-entity-handoff-environment="prod"[^>]+data-topology-current-entity-handoff-time-range="last-1h"[^>]+data-topology-current-entity-handoff-depth="2"/);
    expect(html).toContain('href="/ingestion/otlp/metrics?');
    expect(html).toContain('href="/log/manage?');
    expect(html).toContain('href="/trace/manage?');
  }, 15000);

  it('keeps trace-call G6 edge drilldowns scoped to the default RED edge before an edgeId is in the URL', async () => {
    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(
      <TopologyPage
        routeContext={{
          environment: 'prod',
          timeRange: 'last-30m',
          viewMode: 'service-call',
          sourceKind: 'otlp-trace-call'
        }}
        apiGraph={{
          apiBacked: true,
          focusEntityId: 501,
          depth: 2,
          sourceKinds: ['otlp-trace-call'],
          nodes: [
            {
              id: '501',
              entityId: 501,
              entityName: 'payment-api',
              entityType: 'service',
              namespace: 'commerce',
              environment: 'prod',
              health: 'warning',
              focus: true,
              evidenceBadges: ['entity-relation', 'otlp-trace-call']
            },
            {
              id: '502',
              entityId: 502,
              entityName: 'orders-db',
              entityType: 'database',
              namespace: 'commerce',
              environment: 'prod',
              health: 'critical',
              evidenceBadges: ['entity-relation', 'otlp-trace-call']
            }
          ],
          edges: [
            {
              id: 'trace-call:501:502:trace-701',
              sourceEntityId: 501,
              targetEntityId: 502,
              relationType: 'trace-call',
              relationSource: 'otlp-trace-call',
              sampleTraceId: 'trace-701',
              sampleSpanId: 'span-701',
              status: 'critical',
              score: 44,
              evidenceBadges: ['entity-relation', 'otlp-trace-call', 'service-graph'],
              redMetrics: {
                requestRatePerSecond: 7.25,
                errorRate: 0.21,
                latencyP95Ms: 123
              }
            }
          ]
        }}
      />
    );

    const edgeId = 'relation-trace-call:501:502:trace-701';
    const encodedEdgeId = 'relation-trace-call%3A501%3A502%3Atrace-701';
    expect(html).toContain(`data-topology-edge-evidence-panel="${edgeId}"`);
    expect(html).toContain(`data-topology-edge-id="${edgeId}"`);
    expect(html).toMatch(
      new RegExp(`href="\\/topology\\?[^"]*viewMode=service-call[^"]*sourceKind=otlp-trace-call[^"]*edgeId=${encodedEdgeId}`)
    );
    expect(html).toMatch(
      new RegExp(`data-topology-edge-link="metrics"[^>]+href="\\/ingestion\\/otlp\\/metrics\\?[^"]*viewMode=service-call[^"]*sourceKind=otlp-trace-call[^"]*edgeId=${encodedEdgeId}`)
    );
    expect(html).toMatch(
      new RegExp(`data-topology-edge-link="logs"[^>]+href="\\/log\\/manage\\?[^"]*viewMode=service-call[^"]*sourceKind=otlp-trace-call[^"]*edgeId=${encodedEdgeId}`)
    );
    expect(html).toMatch(
      new RegExp(`data-topology-edge-link="traces"[^>]+href="\\/trace\\/manage\\?[^"]*viewMode=service-call[^"]*sourceKind=otlp-trace-call[^"]*edgeId=${encodedEdgeId}`)
    );
    expect(html).toMatch(
      /data-topology-edge-link="logs"[^>]+href="\/log\/manage\?[^"]*traceId=trace-701[^"]*spanId=span-701/
    );
    expect(html).toMatch(
      /data-topology-edge-link="traces"[^>]+href="\/trace\/manage\?[^"]*traceId=trace-701[^"]*spanId=span-701/
    );
    expect(html).toMatch(
      /data-topology-edge-link="traces"[^>]+href="\/trace\/manage\?[^"]*returnTo=[^"]*traceId%3Dtrace-701[^"]*spanId%3Dspan-701/
    );
    expect(html).toContain('trace-701');
    expect(html).toContain('span-701');
  }, 15000);

  it('renders incoming fault evidence context without fake future analysis panels', async () => {
    const routeContext = {
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db'
    };

    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage routeContext={routeContext} apiGraph={buildApiTopologyFixture()} />);

    expect(html).toContain('data-topology-fault-context="incoming-evidence"');
    expect(html.indexOf('data-topology-canvas="hertzbeat-topology-canvas"')).toBeLessThan(
      html.indexOf('data-topology-fault-context="incoming-evidence"')
    );
    expect(html).toContain('data-topology-fault-context-owner="hertzbeat-ui-evidence-list"');
    expect(html).toContain('data-topology-fault-context-boundary-owner="hertzbeat-ui-evidence-list-boundary"');
    expect(html).toContain('data-hz-ui="topology-evidence-list"');
    expect(html).toContain('data-hz-topology-primitive="evidence-list"');
    expect(html).toContain('data-hz-topology-evidence-list-kind="fault-context"');
    expect(html).toContain('data-hz-topology-evidence-list-boundary="toolbar-context"');
    expect(html).toContain('data-hz-topology-evidence-list-boundary-owner="hertzbeat-ui-evidence-list-boundary"');
    expect(html).toContain('data-hz-topology-evidence-header-owner="hertzbeat-ui-evidence-list-header"');
    expect(html).toContain('data-hz-topology-evidence-title-owner="hertzbeat-ui-evidence-list-title"');
    expect(html).toContain('data-hz-topology-evidence-copy-owner="hertzbeat-ui-evidence-list-copy"');
    expect(html).toContain('data-hz-topology-evidence-count-owner="hertzbeat-ui-evidence-list-count"');
    expect(html).toContain('data-topology-fault-context-row="当前实体"');
    expect(html).toContain('data-hz-topology-evidence-item-owner="hertzbeat-ui-evidence-list-item"');
    expect(html).toContain('data-hz-topology-evidence-item-label-owner="hertzbeat-ui-evidence-list-item-label"');
    expect(html).toContain('data-hz-topology-evidence-item-value-owner="hertzbeat-ui-evidence-list-item-value"');
    expect(html).toContain('data-hz-topology-evidence-item-meta-owner="hertzbeat-ui-evidence-list-item-meta"');
    expect(html).toContain('entityId service:commerce/checkout');
    expect(html).toContain('data-topology-fault-context-row="当前服务"');
    expect(html).toContain('checkout-api');
    expect(html).toContain('data-topology-fault-context-row="链路上下文"');
    expect(html).toContain('trace-123');
    expect(html).toContain('spanId span-456');
    expect(html).toContain('data-topology-fault-context-row="采集来源"');
    expect(html).toContain('采集器 edge-collector-a · 模板 java-service');
    expect(html).toContain('data-topology-active-node-id="svc-checkout"');
    expect(html).toContain('data-topology-active-edge-id="svc-checkout--res-orders-db"');
    expect(html).toContain('trace-123');
    expect(html).not.toContain('data-topology-root-cause-panel');
    expect(html).not.toContain('data-topology-change-timeline');
    expect(html).not.toContain('data-topology-dependency-discovery');
  });

  it('renders localized topology chrome in en-US without closeout Chinese or raw keys', async () => {
    i18nState.locale = 'en-US';
    const routeContext = {
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db'
    };

    const { default: TopologyPage } = await import('./topology-page');
    const html = renderToStaticMarkup(<TopologyPage routeContext={routeContext} apiGraph={buildApiTopologyFixture()} />);

    expect(html).toContain('Topology');
    expect(html).toContain('Operations topology');
    expect(html).not.toContain('Topology and impact');
    expect(html).not.toContain('HertzBeat operations topology');
    expect(html).toContain('Refresh topology');
    expect(html).toContain('Search entities, services, resources, or labels');
    expect(html).toContain('Fault context');
    expect(html).toContain('Relationship evidence');
    expect(html).toContain('Metrics evidence');
    expect(html).toContain('Current entity');
    expect(html).toContain('Open alert impact');
    expect(html).toContain('Current service');
    expect(html).toContain('Trace context');
    expect(html).toContain('Source');
    expect(html).not.toMatch(/[一-龥]/);
    expect(html).not.toContain('topology.');
    expect(html).not.toContain('signal.context.');
  });
});
