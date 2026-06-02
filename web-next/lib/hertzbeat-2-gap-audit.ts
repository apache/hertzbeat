import { buildLegacyFrontendParityAudit } from './legacy-frontend-parity';

export type HertzBeat2GapArea =
  | 'frontend-parity'
  | 'topology'
  | 'incidents'
  | 'greptime-otlp'
  | 'entity-evidence'
  | 'ui-i18n';

export type BackendApiStatus = 'available' | 'partial' | 'missing' | 'not-applicable';

export type HertzBeat2Gap = {
  code: string;
  area: HertzBeat2GapArea;
  owner: string;
  page: string;
  route?: string;
  backendApiStatus: BackendApiStatus;
  releaseBlocking: boolean;
  currentState: string;
  requiredClosure: string[];
  evidence: string[];
  sourceFiles: string[];
  nextStep: string;
};

export type HertzBeat2GapAudit = {
  milestone: 'M0';
  releaseBlocked: boolean;
  gaps: HertzBeat2Gap[];
  releaseBlockingGapCount: number;
};

export type HertzBeat2ReleaseGateIssue = {
  code: string;
  message: string;
  affected: string[];
};

export type HertzBeat2ReleaseGateResult = {
  valid: boolean;
  issues: HertzBeat2ReleaseGateIssue[];
};

const routeGapOwners: Record<string, string> = {
  '/log/manage': 'M2 Legacy Frontend Parity Gate',
  '/trace/manage': 'M2 Legacy Frontend Parity Gate',
  '/monitors/[monitorId]': 'M1 Monitor Time Range and M2 Legacy Frontend Parity Gate',
  '/passport/login': 'M2 Legacy Frontend Parity Gate',
  '/incidents': 'M6 Incident Workbench MVP',
  '/actions': 'M2 Legacy Frontend Parity Gate',
  '/explorer': 'M2 Legacy Frontend Parity Gate'
};

function routeGap(route: string, status: 'hold' | 'placeholder'): HertzBeat2Gap {
  return {
    code: `frontend-route-${status}:${route}`,
    area: 'frontend-parity',
    owner: routeGapOwners[route] ?? 'M2 Legacy Frontend Parity Gate',
    page: route,
    route,
    backendApiStatus: route === '/incidents' ? 'missing' : 'partial',
    releaseBlocking: true,
    currentState:
      status === 'hold'
        ? 'Route is marked hold and still needs action-level browser or API proof.'
        : 'Route is marked placeholder and cannot count as feature complete.',
    requiredClosure: [
      'Remove the route from hold or placeholder only after product behavior is implemented.',
      'Attach browser or API evidence for the original Angular workflow where applicable.'
    ],
    evidence: [
      `routeCatalog.cutoverStatus=${status}`,
      'legacy frontend parity audit marks release closure as blocked'
    ],
    sourceFiles: ['web-next/lib/nav.ts', 'web-next/lib/legacy-frontend-parity.ts'],
    nextStep: 'Close the route-specific parity checklist or keep the route explicitly blocked.'
  };
}

const functionalGaps: HertzBeat2Gap[] = [
  {
    code: 'topology-real-data-api',
    area: 'topology',
    owner: 'M5 Topology Real Data',
    page: '/topology',
    route: '/topology',
    backendApiStatus: 'verified',
    releaseBlocking: false,
    currentState: 'A focused entity topology API exists and the frontend consumes relation, monitor-bind, Greptime trace-call, impact timeline, and trace-derived service graph RED evidence. Default API graphs are seeded from the accessible entity catalog instead of static UI data, sourceKind filters isolate backend evidence sources, empty API-backed results stay API-owned, Browser verification confirms the default /topology route no longer shows the old static seed graph, and focused API graphs expose depth, relation, health, evidence badge, request rate, error rate, p95 latency, first-seen, and last-seen metadata for UI verification. Backend topology DTOs carry RED metrics and first/last-seen evidence on service-call edges and service nodes, the trace-call service consumes Greptime-side service graph RED aggregation with seed service scope pushed into SQL before falling back to raw span rows, slow or failing Greptime service-graph aggregation no longer blocks the fallback, edge signal drilldowns prefer selected trace-call edge sample trace/span context for log/trace handoff links, and live local Greptime hzb_traces data now browser-verifies a real Checkout API to Payment API service-call graph.',
    requiredClosure: [
      'Keep live Greptime trace-call RED graph browser evidence in the release regression set.'
    ],
    evidence: [
      'Live Greptime hzb_traces data now browser-verifies /topology service-call RED graph with Checkout API to Payment API, G6 nodeCount=2, edgeCount=1, traceState=ready, and traceRedState=partial',
      'TopologyController exposes /api/topology for focused relation-backed graphs',
      'EntityTopologyQueryService builds one-hop or two-hop graph DTOs from EntityRelation and EntityMonitorBind evidence',
      'TraceCallTopologyQueryService derives otlp-trace-call edges from Greptime trace rows',
      'Trace-call topology forwards URL start/end into Greptime timestamp predicates and skips trace discovery for non-trace source filters',
      'Default /api/topology graphs are seeded from accessible entity catalog rows instead of static UI data',
      'Topology sourceKind filters now isolate monitor ownership, trace-call, and relation-backed graph evidence',
      'API-backed topology graphs expose impact timeline events from entity activities, relations, and monitor binds',
      'loadTopologyGraph reads /api/topology for the frontend topology surface',
      'loadTopologyGraph degrades stalled topology API reads with a bounded timeout instead of leaving /topology in api-pending',
      'loadTopologyGraph aborts stalled topology API fetches after timeout so trace-call degradation does not leave dangling backend work',
      'loadTopologyGraph deduplicates identical in-flight topology API reads so React dev hydration does not double-query slow Greptime topology scope',
      'Trace-call topology uses a 60s bounded frontend timeout so slow relation-scoped Greptime graphs can render real API evidence or missing-evidence instead of premature degradation',
      'buildTopologyApiUrl forwards numeric start/end context into the topology API query',
      'API-backed empty topology graphs render an API empty state instead of the static fallback seed graph',
      'Browser verification: /topology renders data-topology-data-source=api with api-empty and without checkout-api/orders-db/redis seed nodes when the API has no default evidence',
      'Browser verification: /topology focused missing-entity route renders API-owned cmdb empty state with no static seed graph, no old explanatory header, and zero G6 nodes or edges',
      'Browser verification: /topology service-call trace scope exposes time range, source kind, view mode, relationType=trace-call, trace-call-missing empty state, and zero G6 graph counts when local trace edges are absent',
      'Focused API topology DOM exposes graph depth, node health, node evidence badges, edge relationship type, and edge evidence badges',
      'Focused API topology DOM exposes trace-derived service graph request rate, error rate, and p95 latency on nodes, edges, and selected-edge evidence',
      'Focused API topology DOM exposes trace-derived service graph first-seen and last-seen evidence on selected trace-call edges',
      'Focused API topology selected edge drawer exposes browser-verifiable first/last seen and sample trace/span evidence window attributes',
      'Focused API topology route exposes browser-verifiable trace-call edge, RED, evidence-window, and sample counts',
      'EntityTopologyGraphInfo carries RED metrics on topology nodes and edges from TraceCallTopologyQueryService aggregation',
      'GreptimeTraceQueryRepository builds service-to-service trace graph RED SQL with parent-child span joins, timestamp and environment predicates, seed service source/target scope, internal service filtering, request/error counts, avg latency, p95 sketch, and sample drilldown columns',
      'GreptimeTraceQueryRepository selects first_seen and last_seen service graph timestamps and EntityTopologyGraphInfo carries them into topology edge evidence',
      'TraceCallTopologyQueryService consumes Greptime service graph aggregation rows with seed service names pushed into storage before falling back to bounded raw trace-row topology discovery',
      'TraceCallTopologyQueryService bounds Greptime service graph aggregation latency and falls back to raw trace-row topology discovery when aggregation fails or times out',
      '/topology marks trace-call API degradation as Greptime trace graph unavailable instead of generic topology API empty evidence',
      'Topology edge signal drilldowns prefer the selected trace-call edge sample trace/span context and preserve it in returnTo links',
      'buildTopologyApiUrl forwards depth, relation type, hide-internal, and pagination scope into the topology API query',
      'buildTopologyApiUrl defaults service-call reads to relationType=trace-call while keeping application OTLP source filters on the mixed graph read',
      '/topology exposes Browser-readable topology API request scope metadata including resolved relationType=trace-call for service-call routes',
      '/topology passes resolved relationType=trace-call into shared loading and empty states for inferred service-call routes',
      'TopologyController and EntityTopologyQueryService accept backend relation type, hide-internal, and edge pagination scope for API-backed topology graphs',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyWorkbenchFrame, HzTopologyWorkbenchHeader, and HzTopologyWorkbenchGrid for the route shell, title/scope/source header, and canvas/companion layout',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyWorkbenchFrame boundary variants for route and section topology shells',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyWorkbenchSlot for canvas and companion grid ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyWorkbench shell header, slot, grid, and boundary ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyWorkbenchHeader operational-compact density with assistive copy so topology starts as a tool, not an explanation page',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCanvas for compact topology graph surfaces with layout and interaction markers',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCanvas interaction state for hover neighbor highlighting, focused depth, and drawer affordance',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCanvas boundary and interaction-scope variants for route and section graph surfaces',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCanvasAnnotation for canvas layout and depth status overlays',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCanvasAnnotation assistive non-occluding mode so canvas status does not cover G6 graph interactions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas for AntV G6 topology rendering with compact dark RED styling',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas drawer-sync node and edge selection metadata with hover neighbor highlighting',
      '@hertzbeat/ui widens HzTopologyG6Canvas edge pointer hit targets so real mouse hover and click can open relationship evidence drawers',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas neighbor focus semantics for upstream, downstream, selected, and dimmed graph elements',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas pointer hover state for node and edge neighbor highlighting',
      '@hertzbeat/ui exposes HzTopologyG6Canvas hover callbacks so /topology can drive live hover evidence tooltips from real G6 pointer state',
      '@hertzbeat/ui clears HzTopologyG6Canvas live hover state at the canvas boundary so edge evidence does not stick after pointer exit',
      '@hertzbeat/ui centers HzTopologyG6Canvas after fit and reset controls so the real graph returns to a readable viewport',
      '@hertzbeat/ui preserves HzTopologyG6Canvas wheel and pan zoom while hover or selection styling redraws graph data without auto-fit',
      '@hertzbeat/ui preserves HzTopologyG6Canvas zoom and position around same-structure hover and selection redraws',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas live viewport telemetry for Browser zoom and pan verification',
      '@hertzbeat/ui exposes HzTopologyG6Canvas short viewport zoom and position aliases for Browser interaction regression checks',
      '@hertzbeat/ui and /ui-lab publish HzTopologyG6Canvas zoom, fit, and reset telemetry after viewport actions settle',
      '@hertzbeat/ui and /ui-lab expose HzTopologyG6Canvas viewport command bridge for Browser-verifiable zoom and reset actions',
      '@hertzbeat/ui and /ui-lab route HzTopologyG6Canvas wheel zoom through manual clamped G6 zoomTo control so wheel input cannot over-shrink and drift',
      '@hertzbeat/ui skips identical HzTopologyG6Canvas render keys and treats blank canvas hover-clear as a no-op without active hover evidence',
      '@hertzbeat/ui and /ui-lab expose HzTopologyG6Canvas keyboard viewport shortcuts for zoom, fit, and reset when pointer hit testing is blocked',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas non-occluding viewport overview/minimap metadata for scale and zoom orientation',
      '@hertzbeat/ui keeps HzTopologyG6Canvas live hover metadata out of G6 data redraws so real mouse hover cannot trigger setData/draw viewport resets',
      '@hertzbeat/ui disables G6 hover-activate state mutation so node border hover cannot move a zoomed viewport',
      '@hertzbeat/ui makes HzTopologyG6Canvas selected-node viewport focusing explicit-action-only so continuous mouse paths across canvas blank space cannot refocus an operator-zoomed graph',
      '@hertzbeat/ui guards HzTopologyG6Canvas search-node auto-focus after operator zoom so hover clear cannot refocus and reset an adjusted viewport',
      '@hertzbeat/ui keeps HzTopologyG6Canvas live hover callbacks out of the G6 mount lifecycle so node border hover cannot remount and refit the graph',
      '@hertzbeat/ui cancels HzTopologyG6Canvas delayed initial fit when an operator starts wheel zooming or panning',
      '@hertzbeat/ui disables continuous AntV G6 autoFit after the initial fit pass so wheel zoom is not reset by redraws',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas 50/200/500 node scale fixtures and scale-tier metadata',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas large-graph grouping, filtering, and table-companion strategy metadata',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas render-window budgeting so stress graphs cap primary G6 render data and require table companions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas render-window priority nodes for search only so ordinary node, edge, and table selection cannot reorder stress graph windows',
      '@hertzbeat/ui and /ui-lab expose HzTopologyG6Canvas mount-lifecycle metadata so Browser can verify dense graph selection redraws do not remount or refit the canvas',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas search-to-focus controls for graph result highlighting',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas selected-node focus controls for retained drawer context',
      '/ui-lab demonstrates HzTopologyG6Canvas visible node and edge click selection as in-page state so Browser can verify no URL navigation or remount on synthetic graphs',
      '/ui-lab exposes a 500-node G6 scale Browser regression anchor for zoom, hover, selection, and table-companion stability checks',
      '/ui-lab Browser-verifies the 500-node G6 scale anchor keeps URL, render window, zoom, and viewport position stable while table filters and hidden-edge row selection update in-page state',
      '/ui-lab wires the 500-node render-window metric table rows to actual scale graph edge ids so Browser table selection can inspect partial and hidden graph edges without route changes',
      '@hertzbeat/ui exposes HzTopologyG6Canvas toolbar action owner, state, target, and behavior metadata for zoom, fit, reset, and focus controls',
      '@hertzbeat/ui clears HzTopologyG6Canvas live hover state before search or selected-node focus controls recenter the graph',
      '@hertzbeat/ui and /ui-lab publish HzTopologyG6Canvas explicit focus-action telemetry so Browser can distinguish intentional search or selected-node recentering from hover or selection drift',
      '@hertzbeat/ui clears HzTopologyG6Canvas live hover state before node or edge drawer selection callbacks run',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas filter-scope metadata for environment, source kind, search, grouping, and visible graph counts',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas filter controls for source, grouping, search, and reset scope actions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas visual group summary for active group-by scopes',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas non-occluding overlay mode so graph summaries, groups, and filters do not cover the real graph',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas actionable group-summary chips for source-kind scope changes',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyG6Canvas node double-click focus entry for focused 1-hop inspect mode',
      '/topology reuses HzTopologyG6Canvas as the primary graph renderer instead of hand-rolled SVG/DOM nodes and edges',
      '/topology wires HzTopologyG6Canvas node and edge clicks into in-page drawer selection state without URL navigation or route remounts',
      '/topology exposes node-click, edge-click, and table-row-click selection source markers so Browser can distinguish real in-page inspection from route initial state',
      '/topology clears fallback selected-edge context during node-click inspection so the G6 canvas and drawer do not retain stale edge state after ordinary node selection',
      '/topology Browser-verifies real G6 edge click opens the relationship drawer in-page without URL navigation, remount, zoom reset, or viewport drift',
      '/topology durable Playwright smoke verifies real G6 node inspection after wheel zoom keeps URL, zoom, position, render key, and drawer state in-page',
      '/topology durable Playwright smoke verifies compact service-call graphs open at 1x in a 2048px fresh browser viewport instead of filling the canvas with oversized nodes',
      '/topology Browser-verifies the final M5 route matrix across default, focused, service-call, and empty routes with API-owned graph or empty states and no static fallback',
      '/topology forwards topology search context into HzTopologyG6Canvas search focus metadata',
      '/topology forwards environment, source, search, and group scope into HzTopologyG6Canvas filter-scope metadata',
      '/topology reuses HzTopologyG6Canvas filter controls for source, grouping, search, and reset scope actions',
      '/topology forwards groupBy route scope into HzTopologyG6Canvas grouping metadata and controls',
      '/topology reuses HzTopologyG6Canvas visual group summary for groupBy route scopes',
      '/topology uses HzTopologyG6Canvas non-occluding overlay mode so summary, grouping, and filter surfaces stay assistive while zoom controls remain visible',
      '/topology reuses HzTopologyG6Canvas actionable group-summary chips while preserving groupBy route scope',
      '/topology preserves groupBy route scope across source and view mode filter strips',
      '/topology exposes selected node drawer group/source/view context for G6 node click verification',
      '/topology drives hover tooltip and path summary from live HzTopologyG6Canvas edge hover state before falling back to selected edge evidence',
      '/topology renders the fixed hover evidence tooltip only for live G6 edge hover so default selected edges do not cover canvas controls',
      '/topology relies on shared HzTopologyG6Canvas boundary hover clear callbacks before falling back to selected edge evidence',
      '/topology relies on shared HzTopologyG6Canvas viewport preservation so real graph wheel zoom is not immediately reset by hover or selection updates',
      '/topology relies on shared HzTopologyG6Canvas zoom-position redraw preservation so mouse hover does not reset an operator-adjusted graph',
      '/topology relies on shared HzTopologyG6Canvas hover highlight-only viewport behavior so node hover does not recenter an operator-zoomed graph',
      '/topology relies on shared HzTopologyG6Canvas metadata-only hover updates so real node hover cannot redraw and reset an operator-zoomed graph',
      '/topology relies on shared HzTopologyG6Canvas explicit selected-node focus actions so hover-clear canvas transitions do not recenter an operator-zoomed graph',
      '/topology relies on shared HzTopologyG6Canvas search auto-focus guard so entity/search focus does not recenter after an operator zooms then hovers a node',
      '/topology relies on shared HzTopologyG6Canvas stable hover callback refs so node border hover cannot remount and refit an operator-zoomed graph',
      '/topology exposes shared HzTopologyG6Canvas live viewport telemetry so Browser checks can read zoom and position directly',
      '/topology relies on shared HzTopologyG6Canvas post-action viewport telemetry timing for zoom verification',
      '/topology exposes shared HzTopologyG6Canvas viewport command bridge so Browser can verify zoom without relying on flaky pointer dispatch',
      '/topology routes wheel zoom through shared HzTopologyG6Canvas manual clamped G6 zoomTo control instead of page-local wheel handlers',
      '/topology relies on shared HzTopologyG6Canvas identical-render-key redraw skip and blank hover-clear no-op behavior so canvas boundary movement cannot drift a zoomed graph',
      '/topology exposes the shared HzTopologyG6Canvas render-window no-selection-reorder contract so ordinary node, edge, and table selection cannot reorder dense graph windows',
      '/topology memoizes the HzTopologyG6Canvas graph input so live hover state does not recreate graph data and redraw the G6 viewport',
      '/topology reuses shared HzTopologyG6Canvas keyboard viewport shortcuts for zoom, fit, and reset without page-local handlers',
      '/topology exposes shared HzTopologyG6Canvas non-occluding viewport overview/minimap metadata without covering graph controls',
      '/topology relies on shared HzTopologyG6Canvas initial-fit cancellation so first wheel zoom is not pulled back by delayed fit',
      '/topology exposes shared HzTopologyG6Canvas initial-only auto-fit metadata for Browser wheel-zoom verification',
      '/topology exposes shared HzTopologyG6Canvas mount-lifecycle Browser regression markers so node, edge, and table selection can be verified without URL changes or remounts',
      '/topology reuses HzTopologyG6Canvas selected-node focus action for retained investigation context',
      '/topology routes HzTopologyG6Canvas double-click focus entry through a soft explicit focus navigation path so ordinary inspection cannot trigger full-page reloads',
      '/topology keeps the previous API-backed G6 graph mounted during explicit soft focus route transitions until the focused API read resolves',
      '/topology maps HzTopologyG6Canvas node double-click focus entry to a depth=1 focused graph URL while preserving normal click drawer selection',
      '/topology routes focus-trail exit through the same soft route path so leaving 1-hop focus does not blank the G6 canvas',
      '/topology focus exit preserves the selected edgeId so relationship drawer context survives leaving 1-hop mode',
      '/topology routes toolbar environment, depth, group, and reset scope changes through soft navigation while preserving the previous G6 graph during API reads',
      '/topology Browser-verifies toolbar depth and group scope changes keep the previous G6 graph mounted during soft route reads while preserving timeRange and sourceKind context',
      '/topology keeps toolbar layout changes inside the G6 canvas without URL navigation or API graph clearing',
      '/topology keeps toolbar search changes inside the G6 canvas without URL navigation or API graph clearing',
      '/topology clears live G6 hover evidence before RED metric table row selection navigates to edge detail',
      '/topology shows shared missing-evidence state when otlp-trace-call has no real trace edges instead of presenting a node-only graph',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyGraphLayer for SVG edge layers inside topology canvases',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCanvas layout, interaction, boundary, annotation, and graph-layer ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEmptyState for API-empty/degraded topology evidence states',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEmptyState boundary variants for companion and canvas empty states',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEmptyState title, copy, source, time-scope, meta, and boundary ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEmptyState scope identity for environment, source kind, relation type, focus entity, depth, result count, and evidence sources',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEmptyState degraded topology API state without page-local fallback chrome',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyLoadingState for API-pending topology evidence states',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable as a RED-ranked topology companion table for large graph investigation',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable row-select detail affordance for keyboard/open-edge investigation',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable boundary variants for companion and framed topology surfaces',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable header, row, route, RED cell, badge, and action ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable graph-first density so RED rankings stay low-interruption beside the G6 graph',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable render-window companion metadata so hidden stress-graph nodes stay reachable through RED table investigation',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable row-level render-window visibility for visible, partial, and hidden large-graph relationships',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable render-window row count summaries for visible, partial, hidden, and unknown relationship filters',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyMetricTable in-page render-window filters for visible, partial, hidden, and unknown relationship slices',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyToolbar for compact topology filters, search, actions, and scope summary',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyToolbar boundary variants for route and section toolbars',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyToolbar state strip for focus, depth, layout, and grouping context',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyToolbar control, summary, and state-item ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyToolbar graph-first density with assistive secondary summary/state rows so the G6 canvas leads the first viewport',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionRail for shared legend, metric table, timeline, and detail drawer layout spacing',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionRail boundary variants for side and stacked companion surfaces',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionRail boundary, spacing, and content ownership for companion surfaces',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionRail graph-first priority so companion evidence stays low-interruption beside the G6 graph',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionRail contained scroll so long companion evidence stays within the graph-height viewport',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionRail sticky first-section context so contained companion evidence keeps orientation while scrolling',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionRail jump-list sticky context so quick jumps own contained companion orientation',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionSection anchor ownership for legend, RED table, timeline, and drawer blocks',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionSection collapsible companion sections for long graph-first right rails',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionJumpList anchor navigation for graph-first right-rail evidence sections',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionJumpList contained-rail scroll handoff so anchor jumps do not move the page',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyCompanionJumpList active-section highlighting from contained rail scrolling',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologySectionLabel for compact topology companion section headings',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologySectionLabel label and text ownership for companion headings',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyNode for typed health/focus/evidence topology nodes',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyNode label, health, RED metric, and evidence badge ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEdge for directional RED/evidence relationship rendering',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEdge line, arrow, drilldown, hit-target, RED, and badge ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyHoverTooltip for edge hover source/target/RED/last-seen/sample-trace evidence',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyHoverTooltip placement and sizing for canvas hover evidence',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyHoverTooltip live-edge-hover trigger ownership so hover evidence is not a fixed canvas overlay',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyHoverTooltip toolbar-safe canvas placement so hover evidence does not cover G6 controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyHoverTooltip cursor-anchored placement from G6 pointer events so hover evidence stays near the edge instead of fixed over controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyHoverTooltip canvas-clamped cursor anchors so hover evidence cannot overflow or cover edge toolbar controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyHoverTooltip header, fact, metric, and badge ownership for investigation hover evidence',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyLegend for health, source-kind, confidence, and stale evidence semantics',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyLegend boundary variants for companion and framed topology surfaces',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyLegend header, section, item, swatch, and boundary ownership for topology semantics',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer for node/edge evidence drawers and cross-signal handoffs',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer surface variants for companion and framed topology drawers',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer surface ownership for drawer border and padding chrome',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer header ownership for eyebrow/title/subtitle hierarchy',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer boundary context markers for roadmap/evidence copy',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer boundary ownership for retained context copy',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer boundary copy ownership for retained context text',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer fact group ownership for RED and identity facts',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer fact item ownership for compact RED and identity rows',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer fact label, value, and meta ownership',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer graph-first density so node and edge drawers stay compact beside the G6 graph',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer action group ownership for entity/alert and signal handoffs',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer action link and label ownership for entity/alert handoffs',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer signal action link and label ownership for cross-signal handoffs',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer action copy ownership for retained context helper text',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer signal label ownership for cross-signal handoff headings',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyDetailDrawer identity ownership for selected edge and current node drawer context',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEvidenceList for compact fault context and impact timeline evidence',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEvidenceList boundary variants for toolbar context and companion timeline surfaces',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEvidenceList boundary ownership for fault context and impact timeline surfaces',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEvidenceList header and item ownership for compact evidence rows',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyEvidenceList title, copy, count, item label, value, and meta ownership for compact evidence rows',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFilterStrip for compact source and focus filter controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFilterStrip boundary variants for section and companion filter strips',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFilterStrip boundary and item ownership for compact filter controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFilterStrip label and copy ownership for source and view controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFilterStrip assistive copy visibility for compact view controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyActionLink for standalone topology investigation actions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyActionLink spacing variants for companion and inset topology actions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyActionLink label, copy, and spacing ownership for topology investigation actions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFocusTrail for focused graph breadcrumbs, active filters, hidden counts, and exit-focus actions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyGroupPanel for group-by summaries, collapsed cluster counts, worst health, and large graph actions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyPathSummary for selected edge direction, RED facts, evidence badges, and drilldown actions',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyPathSummary interaction identity for selected edge, hovered edge, source, target, relation type, and source kind',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyScopeBar for compact time, environment, and refresh scope controls',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyScopeBar boundary variants for header and section scope rows',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyScopeBar item, value, action, and boundary ownership for scope rows',
      '/topology reuses HzTopologyWorkbenchFrame, HzTopologyWorkbenchHeader, and HzTopologyWorkbenchGrid instead of page-local route shell and grid chrome',
      '/topology reuses HzTopologyWorkbenchFrame boundary variants instead of page-local route shell borders',
      '/topology reuses HzTopologyWorkbenchSlot instead of page-local workbench grid child wrappers',
      '/topology reuses HzTopologyWorkbench shell header, slot, grid, and boundary ownership for the topology workbench',
      '/topology uses shared HzTopologyWorkbenchHeader operational-compact density and assistive copy instead of page-local explanatory header chrome',
      '/topology uses a concise operational header with label-only source controls so the graph leads the first viewport instead of explanatory copy',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyToolbar graph-first single-row overflow layout so scope controls do not push the G6 graph down',
      '/topology reuses HzTopologyToolbar graph-first single-row overflow layout for environment, search, depth, layout, group, fit, locate, and reset controls',
      '/topology reuses the shared HzTopologyFilterStrip source-rail variant so source controls prefer one compact row above the G6 graph',
      '/topology reuses the shared HzTopologyFocusTrail rail density so focused context stays compact above the G6 graph',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFocusTrail graph-dock density with document-flow, low-interruption, non-occluding focus context',
      '/topology reuses HzTopologyFocusTrail graph-dock density so focused breadcrumbs and exit affordance stay visible without covering the G6 graph',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyFocusTrail mode, depth, entity, and scoped exit href metadata for focused 1-hop graph handoffs',
      '/topology maps focused 1-hop G6 routes into HzTopologyFocusTrail metadata and exits focus without losing environment/time/source/group scope',
      '/topology reuses HzTopologyMetricTable beside the graph for I18N-backed RED edge ranking and selected-edge alignment',
      '/topology reuses HzTopologyMetricTable row action affordance for selected-edge detail alignment',
      '/topology reuses HzTopologyMetricTable boundary variants instead of page-local metric table border chrome',
      '/topology reuses HzTopologyMetricTable header, row, route, RED cell, badge, and action ownership for edge ranking',
      '/topology reuses HzTopologyMetricTable graph-first density for compact companion RED ranking',
      '/topology wires HzTopologyMetricTable render-window companion metadata from the same G6 graph so hidden nodes keep table investigation context',
      '/topology exposes windowed API graph RED rankings as a graph-bottom HzTopologyMetricTable so hidden render-window edges stay inspectable after the right rail is removed',
      '/topology marks HzTopologyMetricTable rows with source and target visibility from the current G6 render window instead of losing hidden-edge context',
      '/topology exposes HzTopologyMetricTable render-window row count summaries for future visible, partial, and hidden relationship filters',
      '/topology reuses HzTopologyMetricTable in-page render-window filters so ordinary RED table filtering does not navigate or remount the G6 canvas',
      '/topology reuses HzTopologyEmptyState for API-owned empty graph states instead of page-local empty chrome',
      '/topology reuses HzTopologyEmptyState boundary variants instead of page-local canvas empty-state border chrome',
      '/topology reuses HzTopologyEmptyState title, copy, source, time-scope, meta, and boundary ownership for API empty states',
      '/topology passes API empty topology scope identity into HzTopologyEmptyState for empty/degraded browser verification',
      '/topology renders API unavailable topology as degraded shared HzTopologyEmptyState instead of ordinary empty results',
      '/topology renders API pending topology as shared HzTopologyLoadingState instead of ordinary empty results',
      '/topology reuses HzTopologyToolbar instead of page-local Input/Select/button toolbar chrome',
      '/topology reuses HzTopologyToolbar boundary variants instead of page-local toolbar borders',
      '/topology reuses HzTopologyToolbar state strip for focus/depth/layout/grouping instead of page-local state chips',
      '/topology reuses HzTopologyToolbar control, summary, and state-item ownership for topology filtering',
      '/topology reuses HzTopologyToolbar graph-first density so secondary toolbar context does not push the real G6 graph below the fold',
      '@hertzbeat/ui and /ui-lab demonstrate HzTopologyToolbar depth, layout, group-by, and reset controls as shared scope controls',
      '/topology reuses HzTopologyToolbar depth, layout, group-by, and reset controls for topology scope changes',
      '/topology reuses HzTopologyCompanionRail for table/detail companion layout instead of page-local margin wrappers',
      '/topology reuses HzTopologyCompanionRail boundary variants instead of page-local companion borders',
      '/topology reuses HzTopologyCompanionRail boundary, spacing, and content ownership for the legend, metrics, timeline, and detail rail',
      '/topology reuses HzTopologyCompanionRail graph-first priority so the real G6 graph remains the primary first-viewport surface',
      '/topology reuses HzTopologyCompanionRail contained scroll so the right rail no longer stretches the whole page below the G6 graph',
      '/topology reuses HzTopologyCompanionRail sticky first-section context so the right rail keeps orientation during internal scroll',
      '/topology reuses HzTopologyCompanionRail jump-list sticky context with HzTopologyCompanionJumpList as the top orientation control',
      '/topology reuses HzTopologyCompanionSection anchors for legend, RED table, timeline, and drawer blocks instead of page-local section wrappers',
      '/topology reuses HzTopologyCompanionSection collapsible controls so long RED/timeline/drawer evidence stays compact',
      '/topology reuses HzTopologyCompanionJumpList for compact right-rail evidence jumps instead of page-local anchor chips',
      '/topology reuses HzTopologyCompanionJumpList contained-rail scroll handoff so right-rail jumps keep the G6 canvas fixed',
      '/topology reuses HzTopologyCompanionJumpList active-section highlighting so the right rail shows the current evidence section',
      '/topology reuses HzTopologySectionLabel for companion section headings instead of page-local label typography',
      '/topology reuses HzTopologySectionLabel label and text ownership for companion headings',
      '/topology reuses HzTopologyCanvas instead of page-local canvas surface chrome',
      '/topology reuses HzTopologyCanvas interaction state for hover/focus/drawer affordances instead of page-local interaction hints',
      '/topology reuses HzTopologyCanvas boundary and interaction-scope variants instead of page-local border or hover group classes',
      '/topology reuses HzTopologyCanvasAnnotation instead of page-local canvas annotation chrome',
      '/topology renders HzTopologyCanvasAnnotation in assistive non-occluding mode so the G6 graph remains visually and interactively clear',
      '/topology reuses HzTopologyCanvas layout, interaction, boundary, annotation, and graph-layer ownership for the topology graph surface',
      '/topology reuses HzTopologyGraphLayer instead of page-local SVG graph layer chrome',
      '/topology reuses HzTopologyNode instead of page-local node tone/focus chrome',
      '/topology reuses HzTopologyNode label, health, RED metric, and evidence badge ownership for graph nodes',
      '/topology reuses HzTopologyEdge instead of page-local edge color and drilldown-dot chrome',
      '/topology reuses HzTopologyEdge line, arrow, drilldown, hit-target, RED, and badge ownership for relationships',
      '/topology reuses HzTopologyHoverTooltip for hover evidence instead of page-local tooltip or title attributes',
      '/topology reuses HzTopologyHoverTooltip placement and sizing instead of page-local absolute tooltip chrome',
      '/topology passes HzTopologyHoverTooltip live-edge-hover trigger only from live G6 edge hover state',
      '/topology positions HzTopologyHoverTooltip below the G6 toolbar controls to keep fit, zoom, and focus actions visible during hover',
      '/topology anchors live HzTopologyHoverTooltip placement from HzTopologyG6Canvas pointer coordinates instead of fixed page-local hover chrome',
      '/topology relies on shared HzTopologyHoverTooltip canvas-clamped cursor anchors for live G6 hover evidence',
      '/topology reuses HzTopologyHoverTooltip header, fact, metric, and badge ownership for edge hover evidence',
      '/topology reuses HzTopologyLegend instead of page-local legend/source semantics',
      '/topology reuses HzTopologyLegend boundary variants instead of page-local legend border chrome',
      '/topology reuses HzTopologyLegend boundary owner for framed health/source/confidence semantics',
      '/topology reuses HzTopologyLegend header, section, item, swatch, and boundary ownership for health/source/confidence semantics',
      '/topology reuses HzTopologyDetailDrawer for selected edge evidence instead of page-local evidence panel chrome',
      '/topology reuses HzTopologyDetailDrawer for current entity evidence instead of page-local current entity panel chrome',
      '/topology reuses HzTopologyDetailDrawer surface variants instead of page-local drawer border chrome',
      '/topology reuses HzTopologyDetailDrawer surface ownership for selected-edge and current-entity drawer chrome',
      '/topology reuses HzTopologyDetailDrawer header ownership for edge and current-entity hierarchy',
      '/topology reuses HzTopologyDetailDrawer boundary owner for edge and current-entity context copy',
      '/topology reuses HzTopologyDetailDrawer boundary ownership for edge and current-entity context copy',
      '/topology reuses HzTopologyDetailDrawer boundary copy ownership for edge and current-entity context text',
      '/topology reuses HzTopologyDetailDrawer fact group ownership for edge and current-entity RED facts',
      '/topology reuses HzTopologyDetailDrawer fact item ownership for edge and current-entity RED facts',
      '/topology reuses HzTopologyDetailDrawer fact label, value, and meta ownership for edge and current-entity facts',
      '/topology reuses HzTopologyDetailDrawer graph-first density for selected-edge and current-node evidence drawers',
      '/topology reuses HzTopologyDetailDrawer action group ownership for edge and current-entity handoffs',
      '/topology reuses HzTopologyDetailDrawer action link and label ownership for edge and current-entity handoffs',
      '/topology reuses HzTopologyDetailDrawer signal action link and label ownership for edge and current-entity handoffs',
      '/topology reuses HzTopologyDetailDrawer action copy ownership for selected-edge retained-context helper text',
      '/topology reuses HzTopologyDetailDrawer signal label ownership for current-entity cross-signal headings',
      '/topology passes selected edge and current node identity into HzTopologyDetailDrawer for drawer verification',
      '/topology passes current node upstream and downstream dependency evidence into HzTopologyDetailDrawer for node-click investigation',
      '/topology annotates current node entity and signal handoffs with selected G6 node context for retained evidence drilldowns',
      '/topology reuses HzTopologyEvidenceList for incoming fault context and API impact timeline panels',
      '/topology reuses HzTopologyEvidenceList boundary variants instead of page-local fault context border and padding chrome',
      '/topology reuses HzTopologyEvidenceList companion timeline boundary for API impact timeline panels',
      '/topology reuses HzTopologyEvidenceList boundary ownership for incoming fault context and API impact timeline panels',
      '/topology reuses HzTopologyEvidenceList header and item ownership for incoming fault context and API impact timeline rows',
      '/topology reuses HzTopologyEvidenceList title, copy, count, item label, value, and meta ownership for incoming fault context and API impact timeline rows',
      '/topology reuses HzTopologyFilterStrip for source and view-mode controls instead of page-local filter cards',
      '/topology reuses HzTopologyFilterStrip boundary variants instead of page-local filter strip borders and padding',
      '/topology reuses HzTopologyFilterStrip boundary and item ownership for source and view-mode controls',
      '/topology reuses HzTopologyFilterStrip label and copy ownership for source and view-mode controls',
      '/topology uses shared HzTopologyFilterStrip assistive copy visibility for view-mode controls so companion options stay label-first',
      '/topology reuses HzTopologyActionLink for alert-impact closure instead of page-local action link chrome',
      '/topology reuses HzTopologyActionLink spacing variants instead of page-local action margins',
      '/topology reuses HzTopologyActionLink label, copy, and spacing ownership for alert-impact closure',
      '/topology reuses HzTopologyFocusTrail for focused context instead of toolbar-only local state chips',
      '/topology reuses HzTopologyGroupPanel for large graph grouping context instead of page-local group chips',
      '/topology reuses HzTopologyPathSummary for selected path context instead of page-local hover-only edge hints',
      '/topology passes selected path interaction identity into HzTopologyPathSummary for edge hover, source/target, relation type, and source kind evidence',
      '/topology reuses HzTopologyScopeBar for header scope controls instead of page-local chips and refresh chrome',
      '/topology reuses HzTopologyScopeBar boundary variants instead of page-local scope borders and padding',
      '/topology reuses HzTopologyScopeBar item, value, action, and boundary ownership for header scope controls',
      'buildTopologyServiceMapFromApiGraph maps monitor-bind node endpoints without dropping non-entity topology edges',
      'buildTopologyServiceMap remains only as a direct static fixture/view-model fallback, not the default topology route fallback'
    ],
    sourceFiles: [
      'hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/controller/TopologyController.java',
      'hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/entity/EntityTopologyQueryService.java',
      'hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/entity/TraceCallTopologyQueryService.java',
      'hertzbeat-warehouse/src/main/java/org/apache/hertzbeat/warehouse/repository/TraceQueryRepository.java',
      'hertzbeat-warehouse/src/main/java/org/apache/hertzbeat/warehouse/repository/GreptimeTraceQueryRepository.java',
      'web-next/packages/hertzbeat-ui/src/index.tsx',
      'web-next/packages/hertzbeat-ui/src/topology-g6.tsx',
      'web-next/app/ui-lab/page.tsx',
      'web-next/lib/topology-surface/controller.ts',
      'web-next/lib/topology-surface/view-model.ts',
      'web-next/app/topology/topology-page.tsx',
      'web-next/scripts/topology-g6-browser-smoke.spec.ts'
    ],
    nextStep: 'Keep the live Greptime RED graph and topology G6 browser smoke available for release regression runs while finishing the remaining cross-domain release gaps.'
  },
  {
    code: 'incident-workbench-domain',
    area: 'incidents',
    owner: 'M6 Incident Workbench MVP',
    page: '/incidents',
    route: '/incidents',
    backendApiStatus: 'available',
    releaseBlocking: false,
    currentState:
      '/incidents now reuses the shared HzIncidentWorkbench from @hertzbeat/ui, has a /ui-lab demo, reads the authenticated status-page incident list and selected detail APIs, and Browser-verifies the shared status transition PUT loop.',
    requiredClosure: [
      'Keep the list/detail/transition Browser proof in the release regression set.',
      'Fold richer incident CRUD and public-status administration parity into the M10 public-status area.'
    ],
    evidence: [
      '@hertzbeat/ui and /ui-lab demonstrate HzIncidentWorkbench with operator-compact density and cold-matte-hard-edge styling',
      '/incidents reuses HzIncidentWorkbench instead of page-local placeholder chrome',
      '/incidents reads GET /status/page/incident?pageIndex=0&pageSize=8 through the local BFF list adapter',
      '/incidents reads selected incident detail from GET /status/page/incident/{id} when list data exists',
      '/incidents writes status transitions through PUT /status/page/incident and refreshes list/detail after success',
      'Browser verification: /ui-lab and /incidents expose the same hertzbeat-ui-incident-workbench and hertzbeat-ui-incident-transition-actions ownership markers',
      'Browser verification: local empty /incidents renders API-backed empty state with no placeholder copy, total=0, detail not-requested, and transition actions disabled',
      'Browser verification: seeded local incident transitioned from Identified to Monitoring through the shared state-2 action, detail state refreshed to state=2 with a new timeline entry, and temporary data was deleted afterwards'
    ],
    sourceFiles: [
      'web-next/packages/hertzbeat-ui/src/index.tsx',
      'web-next/app/ui-lab/page.tsx',
      'web-next/lib/incidents-surface/controller.ts',
      'web-next/lib/incidents-surface/view-model.ts',
      'web-next/app/incidents/incidents-page.tsx'
    ],
    nextStep: 'Move remaining status-page incident CRUD breadth into the M10 public-status parity checklist while keeping /incidents API smoke evidence fresh.'
  },
  {
    code: 'greptime-otlp-query-pushdown',
    area: 'greptime-otlp',
    owner: 'M3 Greptime OTLP Query Productionization',
    page: '/trace/manage and /log/manage',
    backendApiStatus: 'partial',
    releaseBlocking: true,
    currentState: 'Greptime trace and log reads exist, the topology trace-call path has timestamp, environment, seed service scope, and internal-service SQL predicates plus service graph RED aggregation, and trace list reads now pass time, service namespace, environment, workspace, canonical entity identity scope, grouping, total count, limit, and offset into the Greptime trace repository before Java fallback filtering. Trace overview now uses Greptime-side trace grouping for total/error/latest activity counts when available instead of counting a bounded trace-list sample, and explicit trace-id overview also uses a Greptime trace-id aggregate before falling back to span-row reads. Entity trace summary/hints now use Greptime-side entity trace summary aggregation with latest trace id when available, scoped by 24h lookback, service identity, namespace, environment, workspace, and canonical entity identity. Trace-id list/detail reads now have a Greptime trace-row overload that pushes route/detail filters into SQL when context is present, and entity-scoped trace detail passes canonical entity identity into that path. Log list reads now push workspace scope, noise service filters, search, count, pagination, and timestamp-desc sorting into Greptime SQL when the backend supports the workspace-aware log query overload; log overview severity buckets, trace coverage, and hourly trend now also push workspace scope, search, and noise filters into Greptime aggregate SQL before Java fallback aggregation. Non-Greptime fallback paths still depend on bounded recent samples.',
    requiredClosure: [
      'Push time, workspace, entity, service, environment, trace id, pagination, and sorting into Greptime SQL.',
      'Promote frequently filtered OTLP attributes to queryable columns or tags where benchmarks require it.'
    ],
    evidence: [
      'EntityTraceQueryServiceImpl builds entity trace summary/hints from storage-owned recent rows scoped by lookback time, workspace, and canonical entity identity',
      'GreptimeTraceQueryRepository owns service, service namespace, environment, workspace, entity identity, internal, and timestamp predicates for recent trace rows',
      'GreptimeTraceQueryRepository owns service-to-service trace graph RED SQL aggregation with seed service source/target scope for topology',
      'GreptimeTraceQueryRepository owns grouped trace-list SQL with total_count, LIMIT, and OFFSET for paged list views',
      'GreptimeTraceQueryRepository owns trace overview total/error/latest activity aggregate SQL with workspace, entity, service, environment, and internal-service filters',
      'GreptimeTraceQueryRepository owns explicit trace-id overview total/error/latest aggregate SQL with trace id, workspace, entity, service, environment, and internal-service filters',
      'GreptimeTraceQueryRepository owns entity trace summary total/error/latest/latest-trace aggregate SQL with workspace, entity, service, environment, and internal-service filters',
      'GreptimeTraceQueryRepository owns trace-id row SQL with time, service, environment, workspace, entity identity, and internal-service filters when route/detail context is present',
      'EntityTraceQueryServiceImpl pushes canonical entity identity into trace detail row reads before Java span aggregation',
      'EntityTraceQueryServiceImpl consumes storage-owned trace-list pages before falling back to bounded Java samples',
      'GreptimeDbDataStorage owns workspace-scoped log list count/page SQL with search, noise filters, LIMIT/OFFSET, and timestamp-desc sorting',
      'GreptimeDbDataStorage owns workspace-scoped log overview severity-bucket aggregate SQL with search and noise filters',
      'GreptimeDbDataStorage owns workspace-scoped log trace-coverage and hourly-trend aggregate SQL with search and noise filters'
    ],
    sourceFiles: [
      'hertzbeat-observability/src/main/java/org/apache/hertzbeat/observability/traces/service/impl/EntityTraceQueryServiceImpl.java',
      'hertzbeat-observability/src/main/java/org/apache/hertzbeat/observability/logs/service/impl/LogQueryServiceImpl.java',
      'hertzbeat-warehouse/src/main/java/org/apache/hertzbeat/warehouse/repository/GreptimeTraceQueryRepository.java',
      'hertzbeat-warehouse/src/main/java/org/apache/hertzbeat/warehouse/store/history/tsdb/greptime/GreptimeDbDataStorage.java'
    ],
    nextStep: 'Move remaining non-Greptime fallback semantics away from bounded Java samples where feasible, then re-run live trace list/detail smoke after the warehouse compile blocker is cleared.'
  },
  {
    code: 'entity-evidence-read-model',
    area: 'entity-evidence',
    owner: 'M4 Entity Evidence Read Model',
    page: '/entities/[entityId]',
    route: '/entities/[entityId]',
    backendApiStatus: 'partial',
    releaseBlocking: true,
    currentState: 'Entity relations and detail APIs exist, entity detail now builds and returns a shared signal evidence bundle for response handoffs instead of threading log, trace, and metric evidence as separate route-context fragments, and the entity detail frontend plus unified entity contract prefer that bundle when rendering signal summaries, RED evidence, page context, and log/trace handoff context. Topology, incident, and the remaining signal workspaces still need to consume the same evidence contract.',
    requiredClosure: [
      'Return metrics, logs, traces, alerts, relations, and handoffs through one entity evidence read model.',
      'Make signal workspaces consume that contract instead of rebuilding route context locally.'
    ],
    evidence: [
      'EntityRelation has DAO and service coverage',
      'EntitySignalEvidenceBundle carries log summary, trace summary, metric evidence, log evidence, trace evidence, log hints, trace hints, unified evidence, and triage recommendation through one shared signal evidence response',
      'EntityDetailDto exposes EntitySignalEvidenceBundle so entity detail clients can consume the shared evidence response directly',
      'EntityDetailObservabilityReadModelService passes EntitySignalEvidenceBundle into EntityResponseHandoffReadModelService for response handoff assembly',
      'EntityObservabilityGatewayImpl prefers EntityResponseHandoffsRequest.signalEvidence when deriving log and trace handoff context',
      'Entity detail frontend view-model prefers EntitySignalEvidenceBundle for log summary, trace summary, unified RED evidence, and trace handoff IDs before falling back to scattered fields',
      'EntityDetailSurface subtitle and buildEntityContractFromDetail now prefer EntitySignalEvidenceBundle for signal presence/count/last-seen context',
      'signal workspaces still keep page-specific query and handoff builders'
    ],
    sourceFiles: [
      'hertzbeat-common-spring/src/main/java/org/apache/hertzbeat/common/entity/manager/EntityRelation.java',
      'hertzbeat-common-spring/src/main/java/org/apache/hertzbeat/common/observability/dto/entity/EntitySignalEvidenceBundle.java',
      'hertzbeat-common-spring/src/main/java/org/apache/hertzbeat/common/observability/dto/handoff/EntityResponseHandoffsRequest.java',
      'hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/controller/EntityController.java',
      'hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/pojo/dto/EntityDetailDto.java',
      'hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDetailObservabilityReadModelService.java',
      'hertzbeat-manager/src/main/java/org/apache/hertzbeat/manager/service/entity/EntityResponseHandoffReadModelService.java',
      'hertzbeat-observability/src/main/java/org/apache/hertzbeat/observability/shared/service/impl/EntityObservabilityGatewayImpl.java',
      'web-next/components/pages/entity-detail-surface.tsx',
      'web-next/lib/entity-contract.ts',
      'web-next/lib/entity-detail/view-model.ts',
      'web-next/lib/signal-route-context.ts'
    ],
    nextStep: 'Migrate topology, incident, and the remaining signal workbench handoffs to consume EntitySignalEvidenceBundle instead of rebuilding page-local query context.'
  },
  {
    code: 'ui-i18n-reuse-sweep',
    area: 'ui-i18n',
    owner: 'M7 UI Reuse and I18N Release Sweep',
    page: 'monitor, OTLP, entity, log, trace, topology, and incident pages',
    backendApiStatus: 'not-applicable',
    releaseBlocking: true,
    currentState: 'The frontend convergence contract now guards the M10 observability workbench surfaces against drifting off UI Lab backed shared components, and the log/trace signal workbench query controls and trace query/search field/query token/status select/action group/time-control stacks, trace query search field icon sizing, trace query action icon sizing, trace header handoff action icon sizing, trace detail-footer handoff action icon sizing, trace time-range narrow-rail alignment, log view-switch, log stream-stage split, log stream selected-detail aside rail/body stack, trace shell/header copy/time-toolbar/chart/table/detail workbench layouts, header action rows, log stream top controls, log stream/history view toggle, log/trace table row detail controls, trace table row action button density, trace disabled action shells, trace drawer event-detail text roles, trace drawer compact stage stat density, trace table/detail panel clipping, trace query panel padding, trace header panel padding, trace chart panel padding, trace query search input inset, trace header/drawer action-group full-end layout, log/trace event-detail controls, log/trace header, query, chart, table, and detail panel shells, log/trace table and detail panel header bars, log stream view switch and stream stage panel shells, log stream stage and selected-log section headers, log stream pause/helper notices, log/trace summary stat tiles, log/trace dialog stage stat strip cells/layout, log dialog and trace drawer metadata chip groups, trace drawer metadata items, log dialog and trace drawer action groups, log dialog and trace drawer body layouts, log related trace subtitle context marks, log stream detail warning notices, log/trace event-detail header notices, log/trace signal trend bars, log/trace detail facts, selected evidence rows, entity context rows, dialog selected facts, log/trace empty states and trace table empty-state density, log/trace result table chrome, log/trace table status badges, trace table count badge, trace table cell typography, log stream severity badges, log stream status/count/live badges, log/trace attribution diagnostic badges and diagnostic containers, log stream dialog attribution diagnostics, log/trace detail handoff hint surfaces, log stream detail actions, and log/trace history/detail handoff actions have been moved to UI Lab backed HzInput, HzSearchFieldFrame, HzSearchFieldIcon, HzQueryTokenField, HzQueryStatusSelect, HzQueryActionGroup, HzButtonIcon, HzSelect, HzButton, HzButtonLink, HzTableRowActionButton, HzDisabledActionShell, HzActionGroup, HzChipGroup, HzControlStack, TimeRangeControl, HzDetailAside, HzDetailBodyStack, HzSignalWorkbenchShell, HzWorkbenchHeaderCopy, HzWorkbenchLayout, HzDialogBodyLayout, HzDialogEventNotice, HzDialogEventText, HzDialogMetaItem, HzStatStrip, HzStatusBadge, HzInlineContextMark, HzStateNotice, HzStatCell, HzSignalTrendBars, HzDetailRows, HzAttributeDiagnostics, HzEmptyState, HzDataCellText, HzDataTable, HzPanelSurface, and HzPanelHeader primitives. The same contract now also blocks old page-local actionClass/disabledActionClass/primaryActionClass button-style tokens from returning to log/trace manage pages. Broader monitor, OTLP, entity, log, trace, and settings surfaces still need the same strict scan for hardcoded localized copy, page-local controls, and non-shared UI primitives.',
    requiredClosure: [
      'Move user-facing copy through I18N dictionaries.',
      'Move reusable controls to @hertzbeat/ui with UI Lab coverage before page reuse.'
    ],
    evidence: [
      'frontend-convergence-contract enforces UI Lab backed @hertzbeat/ui ownership for actions, explorer, incidents, and topology workbench surfaces',
      'frontend-convergence-contract enforces UI Lab backed HzInput, HzSelect, HzButton, and HzControlStack ownership for /log/manage and /trace/manage query controls',
      'frontend-convergence-contract enforces UI Lab backed HzControlStack ownership for /trace/manage time-control rail',
      'frontend-convergence-contract enforces UI Lab backed TimeRangeControl narrow-rail alignment ownership for /trace/manage time control',
      'frontend-convergence-contract enforces UI Lab backed HzControlStack ownership for /log/manage detail action stacks',
      'frontend-convergence-contract enforces UI Lab backed HzScrollViewport ownership for /log/manage stream viewport',
      'frontend-convergence-contract enforces UI Lab backed HzLogStreamLiveRow ownership for /log/manage stream rows',
      'frontend-convergence-contract enforces UI Lab backed HzDetailAside ownership for /log/manage selected-detail aside rail',
      'frontend-convergence-contract enforces UI Lab backed HzDetailBodyStack ownership for /log/manage selected-detail body spacing',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout and HzActionGroup ownership for /log/manage stream/history view switch layout',
      'frontend-convergence-contract enforces Link-compatible HzButtonLink ownership for /log/manage and /trace/manage header action rows',
      'frontend-convergence-contract enforces HzButton ownership for /log/manage stream reconnect, pause, and clear controls',
      'frontend-convergence-contract enforces HzButton ownership for /log/manage stream/history view toggle controls',
      'frontend-convergence-contract enforces HzButton ownership for /log/manage and /trace/manage table row detail controls',
      'frontend-convergence-contract enforces UI Lab backed HzTableRowActionButton ownership for /trace/manage root-span row action density',
      'frontend-convergence-contract enforces UI Lab backed HzDisabledActionShell ownership for /trace/manage disabled handoff action wrappers',
      'frontend-convergence-contract enforces UI Lab backed HzDialogEventText ownership for /trace/manage event-detail copy and meta text roles',
      'frontend-convergence-contract enforces UI Lab backed HzStatCell compact density ownership for /trace/manage drawer stage stats',
      'frontend-convergence-contract enforces HzButton ownership for /log/manage and /trace/manage event-detail view-span controls',
      'frontend-convergence-contract enforces UI Lab backed HzActionGroup full-end layout ownership for /trace/manage header and drawer action rows',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface ownership for /log/manage and /trace/manage header and query panel shells',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface ownership for /log/manage and /trace/manage chart panel shells',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface ownership for /log/manage and /trace/manage table panel shells',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface clip ownership for /trace/manage table/detail panel overflow',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface query padding ownership for /trace/manage query panel density',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface header padding ownership for /trace/manage header panel density',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface chart padding ownership for /trace/manage chart panel density',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface ownership for /log/manage and /trace/manage detail panel shells',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout ownership for /trace/manage header layout',
      'frontend-convergence-contract enforces UI Lab backed HzSignalWorkbenchShell ownership for /trace/manage page shell and content width',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchHeaderCopy ownership for /trace/manage header copy typography',
      'frontend-convergence-contract enforces UI Lab backed HzSearchFieldFrame ownership for /trace/manage query search field',
      'frontend-convergence-contract enforces UI Lab backed HzSearchFieldIcon ownership for /trace/manage query search field icon',
      'frontend-convergence-contract enforces UI Lab backed HzInput search-icon inset ownership for /trace/manage query search input',
      'frontend-convergence-contract enforces UI Lab backed HzQueryTokenField ownership for /trace/manage trace/span token inputs',
      'frontend-convergence-contract enforces UI Lab backed HzQueryStatusSelect ownership for /trace/manage status select control',
      'frontend-convergence-contract enforces UI Lab backed HzQueryActionGroup ownership for /trace/manage run/reset query actions',
      'frontend-convergence-contract enforces UI Lab backed HzButtonIcon ownership for /trace/manage run/reset query action icons',
      'frontend-convergence-contract enforces UI Lab backed HzButtonIcon ownership for /trace/manage header handoff action icons',
      'frontend-convergence-contract enforces UI Lab backed HzButtonIcon ownership for /trace/manage detail-footer handoff action icons',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout ownership for /trace/manage time-toolbar layout',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout ownership for /trace/manage chart summary/trend layout',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout ownership for /trace/manage table/detail layout',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout ownership for /trace/manage detail body layout',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout ownership for /trace/manage detail footer layout',
      'frontend-convergence-contract enforces UI Lab backed HzPanelHeader ownership for /log/manage and /trace/manage table panel header bars',
      'frontend-convergence-contract enforces UI Lab backed HzPanelHeader ownership for /log/manage and /trace/manage detail panel header bars',
      'frontend-convergence-contract enforces UI Lab backed HzPanelSurface ownership for /log/manage stream view switch and stream stage panel shells',
      'frontend-convergence-contract enforces UI Lab backed HzWorkbenchLayout ownership for /log/manage stream-stage split layout',
      'frontend-convergence-contract enforces UI Lab backed HzPanelHeader ownership for /log/manage stream stage and selected-log section headers',
      'frontend-convergence-contract enforces UI Lab backed HzStateNotice ownership for /log/manage stream pause and selected-log helper notices',
      'frontend-convergence-contract blocks page-local actionClass button-style tokens from /log/manage and /trace/manage',
      'frontend-convergence-contract enforces UI Lab backed HzStatCell ownership for /log/manage and /trace/manage summary stat tiles',
      'frontend-convergence-contract enforces UI Lab backed HzStatStrip and HzStatCell ownership for log related trace and trace waterfall drawer stage stat strips',
      'frontend-convergence-contract enforces UI Lab backed HzSignalTrendBars ownership for /log/manage and /trace/manage signal trend bars',
      'frontend-convergence-contract enforces UI Lab backed HzDetailRows ownership for /log/manage and /trace/manage detail facts, selected evidence, and entity context rows',
      'frontend-convergence-contract enforces UI Lab backed HzDetailRows ownership for log stream detail, related trace preview, and trace waterfall drawer selected facts',
      'frontend-convergence-contract enforces UI Lab backed HzAttributeDiagnostics ownership for /log/manage and /trace/manage attribution diagnostic containers',
      'frontend-convergence-contract enforces UI Lab backed HzAttributeDiagnostics ownership for log stream detail dialog attribution diagnostics',
      'frontend-convergence-contract enforces UI Lab backed HzEmptyState ownership for /log/manage stream/list and /trace/manage table empty states',
      'frontend-convergence-contract enforces UI Lab backed HzEmptyState table-panel layout for /trace/manage table empty-state density',
      'frontend-convergence-contract enforces UI Lab backed HzDataTable ownership for /log/manage and /trace/manage result table chrome',
      'frontend-convergence-contract enforces UI Lab backed HzDataCellText ownership for /trace/manage table cell typography',
      'frontend-convergence-contract enforces UI Lab backed HzStatusBadge ownership for /log/manage and /trace/manage table status chips',
      'frontend-convergence-contract enforces UI Lab backed HzStatusBadge ownership for /trace/manage table count chip',
      'frontend-convergence-contract enforces UI Lab backed HzStatusBadge ownership for /log/manage stream severity chips',
      'frontend-convergence-contract enforces UI Lab backed HzStatusBadge ownership for /log/manage stream status, count, and live chips',
      'frontend-convergence-contract enforces UI Lab backed HzChipGroup ownership for log dialog toolbar and trace drawer metadata chip groups',
      'frontend-convergence-contract enforces UI Lab backed HzDialogMetaItem ownership for trace waterfall drawer metadata item sizing',
      'frontend-convergence-contract enforces UI Lab backed HzActionGroup ownership for log dialog, trace route header, and trace drawer action groups',
      'frontend-convergence-contract enforces UI Lab backed HzDialogBodyLayout ownership for log dialog and trace waterfall drawer body layouts',
      'frontend-convergence-contract enforces UI Lab backed HzInlineContextMark ownership for log related trace subtitle context marks',
      'frontend-convergence-contract enforces UI Lab backed HzStateNotice ownership for log stream detail warning notices',
      'frontend-convergence-contract enforces UI Lab backed HzStateNotice and HzDialogEventNotice ownership for log related trace and trace waterfall event-detail header notices',
      'frontend-convergence-contract enforces UI Lab backed HzStatusBadge ownership for /log/manage and /trace/manage attribution diagnostic status chips',
      'frontend-convergence-contract enforces UI Lab backed HzStateNotice hint ownership for /log/manage and /trace/manage detail handoff hints',
      'frontend-convergence-contract enforces HzButton and HzButtonLink ownership for /log/manage stream detail view-log, view-trace, and entity actions',
      'frontend-convergence-contract enforces HzButton and HzButtonLink ownership for /log/manage and /trace/manage history/detail handoff actions',
      'OTLP, topology, or incident surfaces still have local view-model copy or local surface structure',
      'strict UI reuse remains an active monitor and observability migration requirement'
    ],
    sourceFiles: [
      'web-next/scripts/frontend-convergence-contract.test.ts',
      'web-next/packages/hertzbeat-ui/src/index.tsx',
      'web-next/app/ui-lab/page.tsx',
      'web-next/app/log/manage/log-manage-page.tsx',
      'web-next/app/trace/manage/trace-manage-page.tsx',
      'web-next/components/log-manage/log-stream-detail-dialog.tsx',
      'web-next/components/log-manage/log-related-trace-dialog.tsx',
      'web-next/lib/otlp-center/controller.ts',
      'web-next/app/topology/topology-page.tsx'
    ],
    nextStep: 'Continue the log/trace signal workbench cleanup by auditing interaction parity and any remaining local non-interactive chips through @hertzbeat/ui and /ui-lab before removing the route holds.'
  }
];

export function buildHertzBeat2GapAudit(): HertzBeat2GapAudit {
  const legacyAudit = buildLegacyFrontendParityAudit();
  const gaps = [
    ...legacyAudit.routeCoverage.primaryHoldRoutes.map(route => routeGap(route, 'hold')),
    ...legacyAudit.routeCoverage.primaryPlaceholderRoutes.map(route => routeGap(route, 'placeholder')),
    ...functionalGaps
  ];

  return {
    milestone: 'M0',
    gaps,
    releaseBlocked: gaps.some(gap => gap.releaseBlocking),
    releaseBlockingGapCount: gaps.filter(gap => gap.releaseBlocking).length
  };
}

export function validateHertzBeat2ReleaseGate(audit: HertzBeat2GapAudit = buildHertzBeat2GapAudit()): HertzBeat2ReleaseGateResult {
  const issues: HertzBeat2ReleaseGateIssue[] = [];
  const releaseBlockingGaps = audit.gaps.filter(gap => gap.releaseBlocking);

  if (releaseBlockingGaps.length > 0) {
    issues.push({
      code: 'release-blocked-gaps',
      message: 'HertzBeat 2.0 release closure is blocked until every tracked release-blocking gap is closed.',
      affected: releaseBlockingGaps.map(gap => gap.code)
    });
  }

  for (const gap of audit.gaps) {
    const missingMetadata = [
      gap.owner ? null : 'owner',
      gap.page ? null : 'page',
      gap.backendApiStatus ? null : 'backendApiStatus',
      gap.currentState ? null : 'currentState',
      gap.requiredClosure.length > 0 ? null : 'requiredClosure',
      gap.nextStep ? null : 'nextStep'
    ].filter(Boolean) as string[];

    if (missingMetadata.length > 0) {
      issues.push({
        code: 'gap-metadata-incomplete',
        message: `Gap ${gap.code} is missing release audit metadata.`,
        affected: missingMetadata
      });
    }
  }

  for (const gap of releaseBlockingGaps) {
    if (['topology-real-data-api', 'incident-workbench-domain', 'greptime-otlp-query-pushdown'].includes(gap.code)) {
      issues.push({
        code: gap.code,
        message: gap.currentState,
        affected: gap.requiredClosure
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
