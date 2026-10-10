# HertzBeat Community Alpha Preview

This document is for the GitHub community alpha preview branch. It is not a
stable Apache HertzBeat release checklist. Use it to try the new entity-centered
observability and Vite React frontend, report issues, and help harden the project
toward a beta.

## What Is In Scope

- Entity-centered observability read models for metrics, logs, traces, topology,
  alerts, owners, runbooks, and handoff context.
- Vite React `web-app` workflows for the operational shell, entity management,
  topology, instrumentation, and the three-signal query workspace.
- OTLP trace/log/metric query paths backed by the existing warehouse and
  Greptime integrations.
- Local demo topology relation seeding for the small Checkout API -> Payment API
  -> Orders DB example when the `local` Spring profile is active.

## Local Source Quickstart

Use Java 25, Node.js 22 and pnpm 10. Build the production frontend before a
source release package; a development server is not release evidence. See the
[installation guide](../home/docs/start/package-deploy.md) for first-run Setup
and the [upgrade guide](../home/docs/start/upgrade.md) before reusing data.

1. Start the backend from `hertzbeat-startup` with Java 25.

   Keep the Arrow JVM open option when running locally:

   ```shell
   --add-opens=java.base/java.nio=ALL-UNNAMED
   ```

   The local backend listens on `http://127.0.0.1:1157` by default.

2. Start the Vite React frontend:

   ```shell
   cd web-app
   corepack pnpm@10.9.0 install --frozen-lockfile
   corepack pnpm@10.9.0 dev
   ```

   The preview frontend listens on `http://127.0.0.1:4200`.

3. Open `http://127.0.0.1:4200`. For a fresh installation, complete Setup using
   the installation-local unlock credential and create an administrator. For an
   existing installation, use its configured account. Do not assume a built-in
   default password. Keep Setup credentials and tokens out of issue reports.

See the [Explore and saved-query guide](../home/docs/help/explore_saved_queries.md)
for three-signal query, recovery, Live, sharing and conflict workflows, and the
[Dashboard guide](../home/docs/help/perses_dashboard.md) for the supported document
subset. These describe alpha capabilities, not full parity with another product.

## Alpha Validation Checklist

Before opening an alpha issue or pull request, run the smallest check that
matches the area you changed.

Backend entity, topology, observability, and Greptime query changes:

```shell
./mvnw -pl hertzbeat-manager,hertzbeat-observability,hertzbeat-warehouse \
  -Dtest=EntityDetailObservabilityReadModelServiceTest,EntityTopologyQueryServiceTest,EntityWorkspaceAccessServiceTest,EntityWorkspaceQueryServiceTest,TraceCallTopologyQueryServiceTest,LocalTopologyDemoRelationSeederTest,LogQueryControllerTest,EntityObservabilityGatewayImplTest,EntityTraceQueryServiceImplTest,GreptimeTraceQueryRepositoryTest,GreptimeDbDataStorageTest \
  test -DskipITs -Dsurefire.failIfNoSpecifiedTests=false -DfailIfNoTests=false
```

Startup source package proof:

```shell
./mvnw -pl hertzbeat-startup -am -Prelease -DskipTests package
```

Topology, entity, observability, shell, session, and shared UI changes:

```shell
cd web-app
corepack pnpm@10.9.0 test -- \
  src/features/entity src/features/topology src/features/instrumentation \
  src/features/explore
```

Complete frontend release gate:

```shell
cd web-app
corepack pnpm@10.9.0 verify
```

Visible changes also require a production build, a real backend, and a Browser
check of the affected workflow. Do not use mocked topology or signal data as
release evidence.

## Delivered Operator Workflows

The alpha uses Greptime's query organization, Perses' document model and mature
APM service drilldowns as design references. It does not claim feature parity
with those products, SigNoz, SkyWalking or Datadog.

- **First use:** distinguish Agentless target monitoring from application OTLP
  instrumentation. The intake catalog declares each recipe's signal support.
  The real reference paths are an Agentless MySQL target and an application
  using the official OpenTelemetry Java agent. Other catalog entries are not
  automatically covered by this acceptance.
- **Daily entry:** Start links to real monitors, unresolved alerts, registered
  services and saved queries. Each query reports its own loading, empty or
  failure state; an empty Entity catalog does not establish that no telemetry
  exists.
- **Explore:** metrics, logs and traces share service, namespace, environment,
  filters and a fixed absolute investigation window when navigating. Trace
  newest/duration sorting runs before pagination. Coverage identifies a complete
  query window or a bounded fallback; missing or ambiguous roots have unknown
  root duration and sort after valid durations. Live data can change between
  requests; pagination is not a snapshot isolation guarantee.
  Query controls sit above the results, with log/trace filters in a companion
  column. A collapsible **Workflow guide** explains each signal’s query and
  inspection steps. Metrics keep an inspectable catalog and chart/sample-table
  switch; selecting a metric changes the draft until **Query** is applied.
  A base metric query names one stored metric; a typed composition can combine
  up to four source queries and four bounded arithmetic formulas. Supported
  controls include aggregation, grouping, label filters, rate/increase/delta,
  fixed time shifts, rollup and nested time aggregation, not arbitrary PromQL.
  Aggregation preserves protected service and entity scope. Count means
  contributing series, not requests. Histogram bucket queries retain `le`;
  bucket values are not latency percentiles. Invalid filter clauses or grouping
  labels fail rather than silently widening the query. The trend precedes the
  sampled summary; concise legends do not remove complete labels from it.
  Apply a draft with **Query**; open a result to inspect its evidence and
  use **Back to results** to retain the original time window and filters.
  Log severity categories use the OTel numeric bands (for example Error is
  17–20 and includes Java `SEVERE`). **Original severity text** remains an
  independent exact filter; both conditions combine with AND. Category-filtered
  queries can be saved and reopened, but the restricted Dashboard and AI
  handoff contracts currently reject that filter rather than omit it.
  Historical Logs also offer bounded Patterns, identity-based Transactions and
  sampled calculated fields. Their disclosed sample or identity boundary is
  part of the result; a sampled calculation is not a full-window aggregate.
  Traces offer a typed two-span structural query plus bounded structural
  Patterns and a source-backed Request Flow Map. The map does not infer missing
  parent spans or services, and a missing correlated log does not establish a
  request outcome.
- **Services:** registered service Entities provide source, environment, last
  observed Trace time, service-wide RED and observed root operations. Greptime
  Flow aggregates SERVER requests into minute buckets; P95 is approximate and
  can be unavailable, and sampling completeness is unknown. Ingestion audit
  counts are separate from business request RED. Existing registered relations
  and monitor-linked alerts are evidence, not complete inferred dependencies.
  An operation can lead to matching Traces and then associated Logs while
  retaining the investigation context. Direct service Logs do not imply an
  operation filter. The detail heading identifies the canonical service and
  environment; **Service information** exposes the catalog alias, source,
  historical freshness and bounded associations. Identity metadata can remain
  visible during refresh while signal values retain loading or failure states.
  The **Performance** directory compares observed requests, errors, error rate
  and P95 across matching services. Choose a window, optionally narrow by search
  or environment, run Query, then sort and open a service to inspect its trends
  and root operations. Both return actions preserve the directory view, filters,
  order, page and exact investigation window. **Registered** remains a separate
  metadata view when request evidence is unavailable.
  The server ranks all matching authorized services before pagination, bounded
  by 500 candidates and a 24-hour window. A larger scope requires narrower
  filters and returns no partial ranking. Missing observations remain unavailable
  values, not zero errors or healthy services; a storage failure returns no
  ranking. Catalog and telemetry reads do not share a snapshot, so late data can
  change order on refresh. This is not a health score, anomaly detector or
  complete resource catalog.
  Metrics API operation predicates match real metric labels
  and can correctly return no matching data.
- **Saved queries:** save applied conditions, reopen, update, save as and delete
  installation-shared assets under existing role permissions. Relative or exact
  time mode survives restart; reopening starts on the first page. The versioned
  query document is authoritative. Convertible legacy records open without an
  automatic write; unsupported records remain available for raw export.
- **Dashboards:** create, edit, copy, delete, import/export, adjust layout, save
  or cancel and add a panel from Explore. Standard Perses Dashboard JSON is
  accepted only within the HertzBeat subset: seven visual plugins, controlled query
  plugins, one Grid and service/namespace/environment variables. Metrics can use
  TimeSeries, Stat, Gauge or Table; the restricted Logs, Trace table and fixed
  Trace waterfall panels remain available. Panels load
  and fail independently. Shared runtime time and Explore return context remain
  explicit; fixed Trace waterfalls stay pinned when a service variable changes.
  Native revisions reject stale updates or deletes with HTTP 409. Cancel does
  not persist a draft. See the [Dashboard guide](../home/docs/help/perses_dashboard.md).
- **AI investigation:** bounded read-only tools, durable transcript replay,
  refusal, no-data, timeout, Stop/Retry and redaction are exercised with actual
  application data and a labeled local protocol provider. This establishes
  transport and policy behavior, not external model quality. See the
  [AI guide](../home/docs/help/ai_agent.md).

Service identity matching requires meaningful service-name or instance evidence;
namespace/environment alone cannot bind an unrelated service. Unresolved
identity does not prevent direct signal queries. The correction affects new
intake; previously stored identity attributes are not rewritten automatically.
Runtime dimensions such as Trace ID, operation and HTTP route are query context,
not new long-lived Entity identities.

The bounded intake check observes a fixed 120-second window. Previously received
signals are historical evidence, not continuing emitter liveness. Start a fresh
check after stopping an emitter, and inspect exporter authentication errors
separately. See the [instrumentation contract](instrumentation-api.md).

## Installation, Recovery and Acceptance Boundary

The local candidate was built from a frozen source snapshot with a fresh
production frontend and Java 25 startup package. Installed API and Browser
checks used the same archive. The reference environment covered H2, MySQL 8.4
and PostgreSQL 17 management persistence, separate GreptimeDB 1.1.4 telemetry,
restart, native metadata backup/restore, and a stopped single-node Greptime data
copy and restore. Preserve management data, telemetry, configuration and secrets
as separate backup responsibilities. This is not an online or distributed
backup guarantee. Do not copy a running database directory.

The real alert check raised MySQL connection count, observed firing notification
receipts, released the connections and observed recovery receipts. Repeated
firing notifications are possible; the proof does not establish exactly-once
delivery. AI protocol tests use a local controlled provider with explicit test
timeout/retry settings, not new product defaults.

Release evidence must record the source revision and uncommitted snapshot,
lockfiles, toolchain, archive digest, test commands and limits. Keep credentials,
runtime databases, screenshots and local evidence out of public commits. The
[release checklist](alpha-release-checklist.md) separates local acceptance from
publication. Source changes after an accepted archive require a new build and
appropriate revalidation.

## Local Scale Proof Data

Large topology scale proof data is not seeded by default. The local demo seeder
only creates the small demo relation repair during normal `local` profile
startup.

To explicitly seed the local mixed scale proof entity catalog, start the backend
with:

```shell
--hertzbeat.topology.local-scale-proof-seed=true
```

This is intended for local performance investigation only. Do not treat it as
required alpha setup.

## Known Alpha Limitations

- The Vite React frontend is still an alpha preview. Parity claims require
  route, action, API read/write, refresh, context-handoff, and Browser evidence.
- Background tabs suspend manager-event connections and reread current state
  when shown again; alert notification connections remain active. For many
  simultaneously open tabs, use an HTTP/2-capable HTTPS proxy: browser HTTP/1
  per-origin connection limits still apply to long-lived alert streams. See the
  [browser SSE connection limit](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
- Services do not yet provide a complete operation RED inventory, Apdex, a
  database/external-call product, causal root-cause analysis or complete inferred
  service dependencies. Trace duration distributions are deferred.
- Dashboard import/export is limited to the HertzBeat Perses subset. No
  standalone Perses service, arbitrary SQL, external data-source plugins, public
  sharing or plugin marketplace is included. Saved-query updates and deletes
  use revisions and reject stale writes; resolve conflicts or save a copy.
- Three-signal exploration does not provide Datadog's full query grammar,
  function and widget catalogs, prediction/anomaly algorithms, archive search,
  Watchdog/Findings, natural-language queries, public or scheduled dashboards,
  standalone resource pages, or direct metric-point-to-trace correlation.
  Patterns and calculated fields are bounded sampled views; structural Trace
  Patterns and Flow Map use a bounded observed-span population.
- Earlier alpha snapshots with a different V200 migration checksum require a
  fresh database for this preview. Do not repair the checksum or assume an
  automatic in-place upgrade. Historical PostgreSQL saved-query OID strings
  are not automatically converted into valid query documents.
- Topology large-graph behavior is optimized for inspection with render
  windows, table drilldown, and optional browser smoke. Continue filing cases
  where real data feels confusing or slow.
- Runtime verification may depend on local H2 or Greptime data shape. Greptime
  scale proof fixtures are local-only and should not be committed as generated
  proof artifacts.
- Source package rebuilds are expected to pass for the alpha candidate. If a
  local module or dependency warning blocks packaging, include the focused
  Maven command and output with the issue report.

## Reporting Issues

When filing alpha feedback, include:

- The route or API endpoint.
- The storage mode, for example H2-only or Greptime-backed traces.
- The browser viewport and whether the in-app refresh was used.
- Expected versus actual node, edge, table, or handoff behavior.
- Any focused test, Maven, Vitest, ESLint, or browser-smoke command that
  reproduces the issue.
