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

3. Open `http://127.0.0.1:4200` and sign in with the local development account
   configured for your environment.

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
./mvnw -pl hertzbeat-startup -am -DskipTests package
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

## Three-Signal SigNoz-Alignment Alpha Cutoff

HertzBeat 2.0 treats SigNoz as a product-shape reference for the alpha
observability workspace, not as a full parity claim. The alpha cutoff is the
operator workflow where metrics, logs, and traces can stay attached to the same
HertzBeat entity context, be saved as reusable views, be composed into
dashboards, and drill from service or operation metrics into related traces and
logs.

This alpha scope includes:

- OTLP metrics, logs, and traces carrying HertzBeat entity context through
  `entityId`, `entityType`, `entityName`, service, namespace, environment,
  collector, template, and source query parameters.
- Saved query views, dashboard panel drafts, dashboard variables, and persisted
  dashboards for metrics, logs, and traces.
- A service overview dashboard with RED-style metrics, Apdex, database calls,
  external calls, key operations, logs, log errors, traces, trace errors,
  exceptions, exception messages, and firing alerts.
- An operation drilldown dashboard from `operationName` context, with metrics
  filtered by `operation`, logs filtered by `http.route`, traces filtered by
  `operationName`, and exceptions grouped by `exception.type`.
- Runtime dashboard evidence flows from metric/log/trace points into related
  signal handoffs, evidence panel drafts, and breakout panel drafts.
- Stable entity binding from OpenTelemetry resource identity such as
  `service.name`, host, and Kubernetes pod attributes.

This alpha scope does not claim full SigNoz parity. In particular, it does not
claim public dashboard sharing, Terraform-managed dashboards, a prebuilt
dashboard template marketplace, a ClickHouse SQL dashboard builder, a log
pipeline builder, cost-meter dashboards, full flamegraph parity, or automatic
APM RED metric derivation from traces beyond the explicit telemetry/query data
seeded or stored in the current HertzBeat runtime.

Runtime signal dimensions such as `trace_id`, `span.name`, `http.route`,
`operation`, `operationName`, `exception.type`, and `exception.message` are
filter, group-by, handoff, and drilldown dimensions. They must not be promoted
into long-lived `ObserveEntity` identities unless a later design explicitly
adds an endpoint or operation entity model.

The focused live proof for this cutoff is:

```shell
TRACE_ID=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b bash script/dev/run-three-signal-live-proof.sh
```

That proof starts a non-persistent H2 backend, seeds OTLP metrics/logs/traces,
verifies entity binding and signal query breakouts, starts `web-app`, and checks
that the active React routes are served. Product-level browser acceptance remains
a separate real-backend validation step.

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
- Three-signal work is scoped to the alpha cutoff above. Do not describe it as
  full SigNoz parity unless a later release adds and proves the omitted product
  capabilities.
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
