# HertzBeat React engineering constitution

This document is the implementation contract for the HertzBeat 2.0 React
frontend. It applies to the Vite application under `web-app`. The retired
Next.js and Angular frontends are migration references only; neither defines
the runtime architecture of this application.

The structure combines feature-oriented React practices from Bulletproof React
with the isolation and public-API rules of Feature-Sliced Design. Refine,
Ant Design, TanStack Query, and Zod are implementation tools inside these
boundaries. They do not replace the boundaries.

## What we retain from the Angular frontend

The established Angular frontend is an explicit HertzBeat engineering
reference. Its most useful property is navigability: HTTP calls live under
`app/service`, backend records under `app/pojo`, route trees in routing modules,
shared UI under `app/shared`, and localized text under `assets/i18n`. React keeps
that clarity with feature-local ownership instead of returning to one global
folder per file type.

| Angular responsibility        | React destination                                       |
| ----------------------------- | ------------------------------------------------------- |
| `app/service/*-service.ts`    | `features/<domain>/api` transport and schemas           |
| `app/pojo/*`                  | `features/<domain>/model` or an explicitly shared model |
| routing modules               | `app/routes` and the central route registry             |
| component class orchestration | `features/<domain>/controller`                          |
| component template            | `features/<domain>/components` and a thin page          |
| `app/shared`                  | a named slice under `shared`                            |
| `assets/i18n`                 | `assets/i18n`                                           |

The React implementation does not copy the Angular frontend's known debt:
global services that grow across unrelated workflows, `any` response bodies,
manual subscription ownership, API error handling inside components, or large
component classes containing transport, state, navigation, and presentation at
once. Refine and TanStack Query replace that lifecycle machinery; Zod adds the
runtime contract validation that TypeScript interfaces alone cannot provide.

## Non-negotiable outcomes

- An operator workflow is implemented as a vertical feature slice, not as a
  collection of route-local files.
- A maintainer can determine a file's responsibility from its path.
- Runtime input is parsed once at the API boundary. Components never inspect an
  untyped backend object.
- Server state has one owner and one Query Key factory per feature.
- Pages compose; controllers orchestrate; models decide; APIs communicate;
  components render.
- Missing, empty, unsupported, unavailable, and failed data remain distinct.
- Token or secret material remains in the minimum in-memory state and never
  enters a URL, storage, logs, analytics, screenshots, or persisted progress.
- No language SDK or Agent binary is bundled into HertzBeat. Instrumentation is
  an onboarding workflow that renders backend-provided guidance.

## Evidence-first work contract

The current code and the running product are the sources of truth. Before a
non-trivial edit, read the complete path that will change: route and page,
controller, model and API, backend contract, then every rendered consumer. A
plan, issue, comment, screenshot, Angular implementation, or Horizon reference
can explain intent, but it cannot override the code or wire behavior currently
on disk.

The required loop is:

1. read the end-to-end path and the closest established feature pattern;
2. write the smallest failing proof at the owning boundary;
3. implement without inventing a parallel pattern;
4. run focused checks, then the full gate when shared code is affected;
5. validate actual requests, responses, navigation, and visible states against
   a real HertzBeat backend in the production frontend;
6. record honest limitations when backend access or representative data is
   unavailable.

Types and unit tests prove code contracts, not operator behavior. Mock data may
support a test, but it is never release evidence and may not be used to claim a
wire integration, health state, query result, or workflow complete.

## Source map

```text
src/
  app/                 bootstrap, providers, route registry, Refine registration
    refine/
    routes/
    providers/
    theme/
  core/                framework-independent platform services
    auth/
    http/
    i18n/
    permissions/
  layout/              application shell, navigation, and header
  features/
    <domain>/
      api/              endpoints, transport calls, wire schemas, DTO mapping
      model/            domain types, pure rules, URL/query state
      controller/       React hooks and Refine/TanStack orchestration
      pages/            thin route entry points
      components/       domain presentation with typed props
      index.ts          the only public entry point for another feature
  shared/               reusable product concepts, not a miscellaneous drawer
    data-state/
    forms/
    observability/
    query-context/
    time/
  assets/i18n/          all localized user-facing copy
```

Do not add `compat`, `legacy`, `deprecated`, `view-models`, `controllers`, or a
generic feature-level `hooks` directory. A React hook is placed according to its
responsibility: orchestration in `controller`, reusable product behavior in a
named `shared` slice, and UI-only behavior beside the owning component.

## Dependency direction

The permitted source-layer direction is:

```text
app -> layout -> features -> shared -> core
```

An outer layer may depend on an inner layer. An inner layer never imports an
outer layer. `assets` may be consumed where required.

- `core` does not import `app`, `layout`, `features`, or `shared`.
- `shared` may import `core`, but not `app`, `layout`, or `features`.
- `features` may import `shared` and `core`, but not `app` or `layout`.
- `layout` may import feature public APIs, `shared`, and `core`, but not feature
  internals.
- `app` wires providers, routes, layout, and feature public APIs. Business rules
  do not live in `app`.
- One feature may import another feature only through `@/features/<name>`.
  Imports into another feature's `api`, `model`, `controller`, `pages`, or
  `components` are forbidden.

Within a feature, dependencies move toward the domain and transport boundaries:

```text
pages -> components/controller -> model/api -> core
```

- `api` owns endpoint paths, transport, Zod wire schemas, and wire-to-domain
  mapping. It contains no JSX and does not import controllers or pages.
- `model` owns pure domain decisions and URL state. It contains no React hooks,
  Refine hooks, network calls, notifications, or JSX.
- `controller` owns async orchestration and exposes a small typed page model.
  It may use feature API/model modules and shared product modules.
- `components` receive typed state and actions. They do not call transport,
  parse backend payloads, create Query Keys, or own route navigation policy.
- `pages` select controllers and compose components. They do not contain API
  calls, schema parsing, substantial domain logic, or large form handlers.

Refine data providers are adapters. A feature-specific provider is implemented
inside that feature and registered by `app/refine`; feature code must never
import an adapter back out of `app`.

## API and schema rules

- All network access goes through `core/http`. Direct `fetch`, `EventSource`, or
  ad-hoc credential/header handling outside `core/http` is forbidden.
- Backend `unknown` input is validated with a maintained schema library at the
  API boundary. Do not write local `object`, `integer`, `text`, or `stringArray`
  parser families.
- Wire DTOs and domain models are different when their responsibilities differ.
  Convert once in the API layer; do not duplicate equivalent DTO interfaces.
- Endpoint paths are named exports in the owning API module. Controllers and
  components do not assemble endpoint strings.
- Errors use stable codes and typed categories. Do not infer unavailable,
  unsupported, empty, or healthy from a generic exception.
- Pagination defaults and limits are named domain constants shared by URL state,
  API requests, and table controls. Numeric literals are not repeated locally.

## Server state and routing

- Each feature exposes a Query Key factory. Query functions include every input
  that can change their result; callers do not write inline key arrays.
- TanStack Query owns remote state. Do not mirror successful query data in local
  component state.
- Refine resource hooks are preferred for conventional list/create/update/delete
  resources. Custom observability workflows may use TanStack Query directly,
  but the exception belongs in the feature controller and keeps the same state
  and error contracts.
- The route registry owns route paths. Feature models own typed parsing and
  serialization of their query context. Pages and components do not concatenate
  navigation strings.
- Token and secret values are explicitly excluded from route/query models.
- An upstream context change clears its dependent result before the next
  request begins. The new scope shows an explicit loading state; stale values
  never remain visible under a spinner where an operator could trust them as
  current evidence.
- Every navigation target is declared in the central route registry. Tests
  cover both in-app navigation and direct entry for query/path parameters that
  trigger initial loading.

## Presentation and design tokens

- Ant Design is the component system. Shared wrappers are created only when
  HertzBeat adds stable product behavior, accessibility, or semantics.
- Horizon is a visual and interaction reference, not a source-code template.
  HertzBeat keeps its own brand, information architecture, and operator terms.
- Color, spacing, shell dimensions, typography, focus, selection, and semantic
  status values come from `app/theme` or global `--hb-*` tokens. Feature CSS does
  not introduce raw colors.
- Operational pages use one clear work surface. Avoid nested card grids,
  marketing headings, gradients, decorative statistics, and oversized empty
  space.
- Loading, empty, unavailable, unsupported, error, and ready states must be
  visible and testable. A missing response is never rendered as a fake zero or
  healthy state.
- User-facing copy is referenced through i18n keys. CJK text is permitted only
  in locale resources and documentation.
- The rendered HertzBeat shell is the visual source of truth. Horizon provides
  reference behavior for dense operations layouts, evidence hierarchy,
  cascade-clear loading, and template-driven dashboards; its branding,
  framework structure, and OAP-specific behavior are not copied.
- Comments are reserved for exported contracts and non-obvious invariants such
  as security, timing, scope, or upstream compatibility. Comments do not
  narrate obvious control flow or preserve refactoring history.

## Size and readability limits

Limits are guardrails, not targets:

- page: 150 non-comment lines;
- component: 200 non-comment lines;
- controller: 200 non-comment lines;
- API or model module: 250 non-comment lines;
- function: 60 non-comment lines;
- feature `index.ts`: 100 lines.

If a module reaches a limit, split it by responsibility. Do not evade a limit
with compressed one-line JSX, chained ternaries, anonymous Promise chains, or a
new catch-all utility file.

`scripts/check-architecture.mjs` enforces the module limits above for every
production file under `features/**`: pages use 150, components and controllers
use 200, API and model modules use 250, and a feature-root `index.ts` uses 100.
It counts non-empty, non-comment lines using lexical comment scanning for
TypeScript/TSX and block-comment removal for CSS. Test and spec files are not
production debt. The same gate rejects primitive wire-parser families in
feature API modules, inline Query Key arrays anywhere in a feature, and raw
hex/RGB/HSL colors in feature CSS. TypeScript rules inspect function and
property AST nodes rather than matching source text; CSS colors are checked
only after block comments are removed with line boundaries preserved.

The same gate enforces the 60-line function limit with TypeScript AST nodes and
stable declaration identities. Existing function debt is recorded per exact
source path and function identity in `scripts/function-debt-baseline.json`.
Growth, reduction, removal, a new oversized sibling, wildcard identity, and a
stale ceiling all fail; maintainers must lower or remove the exact entry as the
owning function is repaired. Regex-based function sizing and file-wide function
exemptions are forbidden.

The same feature gate rejects new files under generic `hooks` directories,
presentation or model imports from feature API internals, and cross-feature
imports that bypass the target feature's `index.ts`. Existing exact dependency
and hooks debt is listed in `scripts/feature-debt-baseline.json`; it cannot
authorize a new path or target. Dependency Cruiser separately prevents React,
Refine, and Ant Design runtime dependencies from API directories throughout the
current feature tree.

## Testing contract

Every behavior change starts with the smallest failing proof at the owning
boundary:

- API schema and mapping tests use real contract-shaped fixtures.
- Model tests are pure and cover invalid, missing, and boundary values.
- Controller tests prove state transitions, query identity, retries, and safe
  handoffs.
- Component/page tests prove operator interaction and honest visible states.
- Visible work uses a production build, real backend, fixed-viewport Browser
  screenshots, and comparison against the selected reference.

`pnpm verify` is the local release gate. Architecture, i18n, lint, typecheck,
tests, production build, bundle budget, dead-code analysis, CJK scan, and
`git diff --check` must be green before a slice is offered for review.

## Existing debt policy

Existing committed violations are not examples to copy. A machine-readable
debt baseline may temporarily name an exact existing violation while recovery
is underway. It must obey all of these rules:

1. the entry identifies the rule and exact path;
2. new violations fail;
3. a stale entry fails after the violation is fixed;
4. touched feature slices remove their own entries before completion;
5. no wildcard or directory-wide exemption is allowed.

The instrumentation pilot is the reference slice. It receives no debt
exemptions when the pilot is declared complete.

The repository baseline is `scripts/feature-debt-baseline.json`. Every entry is
an exact `{ rule, path, allowedMax }` tuple: paths must name an existing file
under `features/` and may not contain wildcards, parent traversal, backslashes,
or absolute paths. `allowedMax` is the current violation count or module size,
not a tolerance target. New paths and new rules fail, growth beyond the exact
ceiling fails, and a fully repaired entry becomes stale and fails until it is
removed. Partial reductions also fail until the exact ceiling is lowered;
baseline values must never increase.

Generic feature `hooks` files and existing presentation/model dependencies on
feature API modules use the same exact-path policy; dependency entries also name
the exact resolved target as `identity`. New dependency targets and cross-feature
internal imports fail instead of inheriting an exemption from another edge.
