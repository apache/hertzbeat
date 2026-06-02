# HertzBeat Community Alpha Preview

This document is for the GitHub community alpha preview branch. It is not a
stable Apache HertzBeat release checklist. Use it to try the new entity-centered
observability and Next.js frontend work, report issues, and help harden the
project toward a beta.

## What Is In Scope

- Entity-centered observability read models for metrics, logs, traces, topology,
  alerts, owners, runbooks, and handoff context.
- Next.js `web-next` frontend work for the new shell, entity detail, topology,
  and UI Lab surfaces.
- OTLP trace/log/metric query paths backed by the existing warehouse and
  Greptime integrations.
- Local demo topology relation seeding for the small Checkout API -> Payment API
  -> Orders DB example when the `local` Spring profile is active.

## Local Source Quickstart

1. Start the backend from `hertzbeat-startup` with Java 21.

   Keep the Arrow JVM open option when running locally:

   ```shell
   --add-opens=java.base/java.nio=ALL-UNNAMED
   ```

   The local backend listens on `http://127.0.0.1:1157` by default.

2. Start the Next.js frontend:

   ```shell
   cd web-next
   npm install
   npm run dev
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

Next.js topology, entity detail, shell, session, and shared UI changes:

```shell
cd web-next
npm exec -- vitest run app/topology/page.test.tsx app/ui-lab/page.test.tsx packages/hertzbeat-ui/src/index.test.tsx packages/hertzbeat-ui/src/topology-g6.test.tsx packages/hertzbeat-ui/src/topology-companion.interaction.test.tsx packages/hertzbeat-ui/src/topology-metric-table.interaction.test.tsx components/pages/entity-detail-surface.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/auth-recovery.chrome.test.ts lib/app-frame-state.test.ts lib/entity-contract.test.ts lib/entity-detail/view-model.test.ts lib/hertzbeat-2-gap-audit.test.ts lib/topology-surface/controller.test.ts lib/topology-surface/query-state.test.ts lib/topology-surface/view-model.test.ts --config vitest.config.ts --pool=forks --maxWorkers=1 --minWorkers=1 --testTimeout=120000 --hookTimeout=120000
```

Focused frontend lint for touched alpha files:

```shell
cd web-next
ESLINT_USE_FLAT_CONFIG=false npm exec -- eslint app components lib packages/hertzbeat-ui/src scripts/topology-g6-browser-smoke.spec.ts test --ext .ts,.tsx
```

## Optional Local Smoke

The topology G6 browser smoke is intentionally opt-in. It skips unless the
route and credentials are supplied by the developer:

```shell
cd web-next
TOPOLOGY_G6_BROWSER_USERNAME=admin \
TOPOLOGY_G6_BROWSER_PASSWORD=hertzbeat \
TOPOLOGY_G6_BROWSER_ROUTE='/topology?environment=prod&timeRange=last-1h&viewMode=service-call&sourceKind=otlp-trace-call&depth=2&groupBy=source-kind' \
npm exec -- playwright test scripts/topology-g6-browser-smoke.spec.ts
```

Optional strict assertions can be added with:

- `TOPOLOGY_G6_BROWSER_EXPECTED_NODES`
- `TOPOLOGY_G6_BROWSER_EXPECTED_EDGES`
- `TOPOLOGY_G6_BROWSER_FOCUS_NODE_ID`
- `TOPOLOGY_G6_BROWSER_EXPECTED_RUNTIME_VERSION`
- `TOPOLOGY_G6_BROWSER_EXPECTED_INITIAL_FIT_STRATEGY`
- `TOPOLOGY_G6_BROWSER_EXPECTED_WIDE_ZOOM`
- `TOPOLOGY_G6_BROWSER_EXPECTED_OPERATOR_BOUNDS`

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

- The Next.js frontend is still an alpha preview and may not yet match every
  legacy Angular workflow.
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
