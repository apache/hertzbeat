# HertzBeat Topology Product And UX Baseline

Local-only baseline for HertzBeat 2.0 topology work. This file captures the product and interaction direction for M5 so future implementation does not invent an isolated diagram. Keep it as the reference before changing `/topology`, topology APIs, or topology-related UI primitives.

## 2026-05-19 Reference Scan

Primary references checked:

- Datadog Service Map: https://docs.datadoghq.com/tracing/services/services_map/
- Datadog Service Page dependency map: https://docs.datadoghq.com/tracing/services/service_page/
- Datadog Device Topology Map: https://docs.datadoghq.com/network_monitoring/devices/topology/
- Datadog Network Map: https://docs.datadoghq.com/network_monitoring/cloud_network_monitoring/network_map/
- Grafana Cloud Application Observability service map: https://grafana.com/docs/grafana-cloud/monitor-applications/application-observability/map/
- Grafana Tempo Service Graph: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- Grafana Node graph panel: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/

Shared pattern from these products:

- Topology is evidence-first. The graph is built from observed traces, APM/RUM, network discovery, monitor state, or catalog metadata, not from a static product drawing.
- Nodes and edges are operational objects. A node is a service, resource, device, or entity; an edge is an observed call, physical dependency, VPN tunnel, monitor bind, or explicit relation.
- A useful service graph carries RED facts directly on the graph: request rate, error rate, and latency or response time.
- The map is scoped by time, environment, tags/facets, service, team/application, and resource type. Changing scope can legitimately produce a different graph.
- Hover and click are investigation actions: hover highlights traffic direction/neighbors; click isolates or opens details for upstream/downstream, traces, logs, metrics, incidents, owners, and related pages.
- Large graphs need grouping, clustering, filtering, search, alternate layouts, and table/detail companions. A canvas alone is not enough.

## HertzBeat Product Rule

HertzBeat topology must answer three operator questions:

1. What is connected to this service/entity/device right now?
2. Which dependency is unhealthy, slow, noisy, or incident-related in the selected time range?
3. Where can I drill next without losing the current time, environment, workspace, and evidence context?

Therefore `/topology` should be a compact observability workbench, not a marketing diagram or static architecture map.

## UI Lab Reuse Bottom Line

All topology frontend UI is release-blocking until it is owned by `@hertzbeat/ui` and demonstrated in `/ui-lab`. This is stricter than avoiding copied vendor visuals: the real `/topology` route should compose shared HertzBeat primitives, not invent page-local toolbar, canvas, node, edge, drawer, legend, table, filter, empty, loading, or action styling.

If the real topology page does not visually match the compact dark primitive language shown in `/ui-lab`, treat the page as incomplete even when the API data is real. Add or adjust the shared primitive and its `/ui-lab` demo first, then reuse it in `/topology`.

## Data Construction Contract

- Default source: real topology API data. Never render seeded demo services when the API is pending, empty, or failing.
- Service-call topology: derive edges from OTLP traces in Greptime using parent-child spans, `service.name`, peer service/database/messaging attributes, status, duration, and entity/workspace attribution.
- RED aggregation must be pushed toward Greptime queries or Greptime flow tables: `requestCount`, `requestRatePerSecond`, `errorCount`, `errorRate`, `latencyP95Ms`, `latencyAvgMs`, `lastSeen`, and an example trace/span id for drilldown.
- Scope filters must be first-class in API/query contracts: workspace, time range, environment, service/entity focus, source kind, relation type, depth, pagination/windowing, and hide-internal controls.
- Entity topology should merge evidence from `EntityRelation`, monitor binds, trace calls, alert impact, incident association, and topology timeline events into one read model. Each edge should carry `sourceKind`, confidence, status, and evidence badges.
- Nodes should age out or visually mark stale evidence when no selected-window signal exists. Do not present stale topology as current truth without a timestamp.
- Missing traces, missing root spans, or insufficient discovery data must produce explicit empty/degraded states, not fake continuity.

## Frontend Interaction Contract

- Top toolbar: one compact row with time range, environment/source filters, search, group-by, depth, layout, refresh/live state, and reset/apply actions. It should stay visually aligned with the monitor time toolbar.
- Canvas default: use a left-to-right layered service layout for call graphs because it makes upstream/downstream flow readable. Use force layout only for dense exploratory maps, and grid/table mode for very large result sets.
- Node visual language:
  - Shape/icon shows type: service, database, cache, queue, endpoint, host/device, monitor/entity.
  - Border or arc shows health/error ratio.
  - Main stat shows latency or health-critical value; secondary stat shows request rate or evidence count.
  - Badges show source kinds such as trace, monitor, relation, alert, incident, or stale.
- Edge visual language:
  - Direction arrow is always visible.
  - Thickness maps to request rate or traffic volume.
  - Color maps to error/health state.
  - Dashed/low-opacity edges indicate low confidence, stale evidence, or non-live/manual relations.
  - Hover tooltip shows source, target, relation type, request rate, error rate, p95, last seen, and sample trace.
- Hover behavior: highlight the hovered node/edge, immediate neighbors, and traffic direction while dimming unrelated graph elements.
- Click behavior:
  - Node click opens a right-side detail drawer with identity, RED/USE summary, upstream/downstream lists, alerts/incidents, recent traces/logs, monitors, owners, and timeline.
  - Edge click opens a relationship drawer with source/target, RED metrics, evidence badges, sample traces, logs, alerts, first/last seen, and actions to open focused traces/logs.
  - Double-click or explicit action switches the page into focused 1-hop inspect mode; 2-hop expansion is an explicit toggle.
- Focus mode: show breadcrumb, current focus entity/service, depth, active filters, hidden/clustered count, and a clear exit action.
- Large graph behavior: support search/facet filtering, group-by team/application/environment/type, collapse clusters with count and worst health, and offer a metric-ranked table companion.
- Empty/degraded states: name the missing evidence source and selected time scope. Do not suggest the topology is complete when Greptime/trace data is unavailable.
- All visible copy must use I18N. UI primitives must live in `@hertzbeat/ui`, be demonstrated in `/ui-lab`, and then be reused in `/topology`; page-local topology UI styling is a release-blocking gap.

## HertzBeat-Specific UI Primitive Direction

Topology work should converge on shared primitives rather than page-local canvas chrome:

- `HzTopologyToolbar`: compact time/source/search/group/depth/layout controls.
- `HzTopologyCanvas`: graph surface with pan, zoom, layout mode, keyboard focus, and empty/degraded states.
- `HzTopologyNode`: typed node rendering with health arc, primary/secondary stats, badges, and focus state.
- `HzTopologyEdge`: directional relationship rendering with traffic/error encoding and hover target.
- `HzTopologyDetailDrawer`: node/edge evidence drawer with stable sections and cross-signal handoffs.
- `HzTopologyLegend`: compact legend for health, source kind, edge confidence, and stale evidence.
- `HzTopologyMetricTable`: RED-ranked companion table for dense graphs and keyboard access.

Names above are HertzBeat-owned direction, not copied from Datadog or Grafana. Do not copy vendor code, assets, styles, or component names. The product benchmark is behavior and clarity, not visual cloning.

## Release Gate For M5

M5 real topology is not complete until all of the following are true:

- `/topology` default and focused routes consume real topology APIs only.
- Trace-derived service-call graph exposes node and edge RED metrics from Greptime-backed data, not fixture-only frontend fields.
- Entity relations, monitor binds, alert/incident impact, and timeline events appear as typed evidence, not separate page-local guesses.
- Browser verification can demonstrate default graph, focused 1-hop, focused 2-hop, node drawer, edge drawer, filters, time range, and empty/degraded states.
- `/ui-lab` demonstrates every topology primitive used by `/topology` with compact dark styling and no copied vendor naming, and the real page visually follows that primitive language.
- I18N/no-hardcoded-Chinese and no-static-fallback audits pass.
