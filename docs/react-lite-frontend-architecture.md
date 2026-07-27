<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements. See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License. You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# Lightweight React Frontend Architecture

## Status And Reference Baselines

This document is the implementation contract for the maintainable React
single-page application that replaces the deprecated Next.js frontend.

- Implementation baseline: `2.0.0` at `2de48d2caa43fa58fd93e71b0e22e7d4f431c9d5`.
- Angular behavior and release reference: `apache/master` at
  `9bd2796119b558cff2834dd35e3d21f2eb4a53a4`.
- Transitional signal reference: `feature/angular-three-signals` at
  `5d523ddce322ad82ab1bcb65b3dbe516b0a1b97d`.

The branches have materially diverged. `apache/master` is a behavior and
packaging reference, not a merge source. Relevant fixes are selected and
reimplemented; the branch is never merged wholesale into `2.0.0`.

## Sources Of Truth

Use the following precedence for implementation decisions:

1. `apache/master` defines established operator workflows, stable URLs,
   monitor hierarchy behavior, translations, and the external `web-app/dist`
   release layout.
2. `2.0.0` defines entity, topology, OTLP signals, workspace and token scope,
   GreptimeDB integration, and the current HttpOnly UI session boundary.
3. The Angular three-signal transition defines the simple onboarding and
   query workflow that does not require a user to understand storage internals.
4. The removed Next.js implementation supplied only proven DTOs and pure
   algorithms. Its page structure, private UI framework, BFF, compatibility
   scaffolding, and implementation-detail tests were not migration sources.

## Scope Allowlist

### Established Workflows

- Session, lock, logout, permissions, locale, theme, shell notifications, and
  account actions.
- Dashboard and Overview as aliases for one implementation, Bulletin, and the
  public status page.
- Monitor list, create, edit, copy, detect, bulk operations, detail, realtime,
  history, and favorite metrics.
- Alert center, thresholds, groups, inhibition, silence, notice, and integration.
- Collector, monitor definitions, labels, plugins, status, system configuration,
  and message server settings.
- Dynamic monitor categories loaded from `/apps/hierarchy`.

### Approved 2.0 Extensions

- Entity list, create, edit, detail, import, discovery, and definition.
- Topology query, graph inspection, table drilldown, and detail interaction.
- Unified OTLP integration plus Metrics, Logs, and Traces workbenches.
- Object store and token settings required by observability workflows.
- Workspace, token scope, GreptimeDB, performance protection, and cross-signal
  navigation context.

### Excluded From The New Frontend

- Actions, Incidents, Explorer, the standalone Events experiment, AI Chat UI,
  MCP settings UI, and the signal dashboard draft/composition editor.
- The production UI Lab, parity framework, source-string ownership assertions,
  generated demo states, in-memory fallbacks, and permanent compatibility pages.
- Next.js route handlers, the standalone Node server, the dedicated Next image,
  and the Next-specific gateway split.

Deleted routes use the common not-found page. Compatibility URLs are explicit
redirects in the route registry and never duplicate a page implementation.

## Target Stack And Production Shape

- React 19 with Vite and React Router declarative routing.
- TanStack Query as the only server-state lifecycle.
- Ant Design React as the primitive component system. HertzBeat only owns
  domain composites such as the time toolbar, signal workbench, data state,
  attribute table, and topology canvas.
- i18next with locale JSON resources based on the five `apache/master` locales.
- CSS Modules and Ant Design theme tokens; no Tailwind utility layer.
- ECharts, G6, CodeMirror, and the log virtualizer load only in their owning
  features.
- Vitest, React Testing Library, MSW, and Playwright for behavior-level tests.
- Node 22 and pnpm 10 for development and CI. Release assemblies run only the
  JVM and never ship a Node runtime or a separate frontend service.

Vite emits `web-app/dist`. Release assemblies copy that directory to the
external distribution `dist/`, matching `apache/master`. Spring serves the SPA
and `/api` from one origin. The frontend is not embedded into the startup jar,
and no Maven frontend plugin is introduced.

## Source Ownership

```text
web-app/src/
  app/          bootstrap, providers, route registry, startup
  core/         API client, session, errors, i18n, permissions
  layout/       basic, passport, and blank layouts
  features/     domain-owned routes, API, model, hooks, pages, components
  shared/       domain-neutral composites, forms, time, and query context
  assets/i18n/  locale JSON resources
```

Each feature owns its route, API, types, hooks, pages, components, and tests.
`core` and `shared` cannot depend on a feature. Features cannot import another
feature's internals. Cross-feature behavior is exposed through a small explicit
feature entry.

Pages orchestrate route state and feature hooks. API modules perform requests
and response mapping. Hooks own TanStack Query lifecycles. Models contain domain
types and pure transformations. Components render visible behavior. A
controller or view model is introduced only when it removes real complexity;
parameter forwarding is not an abstraction.

The typed route registry is the only static source for routes, navigation,
breadcrumbs, permissions, canonical URLs, and redirects. Dynamic monitor
categories are appended after startup and are not duplicated in static source.

## Session And Routing Boundaries

The React migration must not copy the Angular local-storage token boundary.
Spring exposes UI session create, read, refresh, and delete endpoints backed by
the existing account service. Access and refresh tokens remain HttpOnly
cookies. A filter before Sureness adapts the UI access cookie to an internal
Bearer header only when the request has no explicit `Authorization` header.
Existing API tokens, OTLP Bearer authentication, workspace claims, and token
scope remain unchanged.

Cookie-authenticated mutations require same-origin and CSRF validation. Query
requests may refresh through one single-flight request and retry once.
Mutations are never replayed automatically. Same-origin SSE uses the same
session filter and reconnects with bounded backoff.

SPA fallback accepts only `GET` or `HEAD` HTML navigation for registered UI
prefixes. API, actuator, Swagger, H2, OTLP, SSE, and missing static resources
must retain their own non-HTML errors.

## Maintainability Gates

- Page orchestration files: at most 300 lines.
- Ordinary components, hooks, API modules, and models: at most 400 lines.
- Every production file: at most 600 lines.
- Feature public entries: at most 100 lines.
- Functions: at most 100 lines and cyclomatic complexity at most 12.
- No page or component calls `fetch` directly.
- No production mock, in-memory fallback, permanent `compat`, `legacy`, or
  `deprecated` implementation directory.
- No tests that read production source and assert source strings.
- Knip and an explicit dependency-boundary check run in CI.
- Production frontend target: no more than 80,000 lines; hard limit 100,000.
- The final migration must delete at least 40 percent of the previous
  production frontend source and must not retain the deprecated Next.js tree.
- Initial shell JavaScript: at most 450 KiB gzip. ECharts, G6, and CodeMirror
  are forbidden from the shell chunk.

The budgets are architecture limits, not encouragement to split cohesive code
into one-line wrappers. Any temporary exception must name an owner, reason, and
expiry milestone and must be removed before cutover.

## Delivery Gates

Implementation proceeds in vertical milestones: foundation; session and
release; established shell and dashboard; monitors, alerts, and settings;
entities and topology; OTLP signals; then cutover and deletion. Each milestone
must pass focused tests, production build, and its real-backend browser flow
before the next milestone starts.

The final release must contain one JVM runtime, external hashed SPA assets,
working deep links, JSON API 404 responses, authenticated SSE, explicit Bearer
precedence, and no Node runtime or Next-specific gateway.
