# Product Design User Validation Loop

This runbook makes Product Design part of the HertzBeat 2.0 user-layer
validation loop. It is not a screenshot-only audit pass and it is not a visual
polish layer. Use it to close product experience loops around real operator
workflows, honest state feedback, data lifecycle clarity, and repeatable
actions.

## Product Context

Start every Product Design workflow from saved context:

- Product Design state: `$CODEX_HOME/state/plugins/product-design/user-context.md`
- Local screenshot/reference assets:
  `$CODEX_HOME/state/plugins/product-design/assets/`
- Repo guidance: `AGENTS.md` and the latest active slice in `progress.md`
- Frontend implementation: `web-next/app`, `web-next/components`,
  `web-next/lib`, and `web-next/packages/hertzbeat-ui`
- Theme and UI constraints: `web-next/app/globals.css`, shared
  `@hertzbeat/ui` primitives, `lucide-react` icons, and runtime i18n catalogs

Saved context should include the HertzBeat product position, operator audience,
competitive references, design preferences, code paths, screenshots, design
system constraints, and mainstream observability console expectations. Future
audits, ideation, prototypes, and implementation work must prefer that context
unless the user explicitly asks for a different direction.

## Required Workflow Selection

Use the smallest workflow that matches the problem.

Small issue:

```text
audit -> small fix -> focused test -> Browser verification -> progress.md
```

Use this for a concrete user-visible problem in one flow, such as confusing
error copy, an unclear button, an empty state that hides the data lifecycle, a
broken cancel path, or a refresh/status mismatch.

Systemic issue:

```text
user-context/get-context -> research -> audit -> ideate -> prototype -> design-qa -> small implementation slice -> progress.md
```

Use this when the issue exposes a broader product pattern, such as monitor
authoring confusion, entity lifecycle ambiguity, alert rule authoring friction,
or settings forms that repeatedly fail to explain required state and side
effects.

Do not skip `audit` or `research` before broad UI changes. Do not use Product
Design to decorate an existing screen while leaving the real workflow,
state feedback, error explanation, or data lifecycle unresolved.

## Design Brief Gate

Before any design judgment, experience redesign, prototype exploration, or UI
implementation, confirm a brief through Product Design `get-context`.

The brief must identify:

- Target user and operating context.
- Workflow problem being solved.
- Existing route, screenshot, design system, or component reference.
- Required interaction fidelity.
- Backend/data lifecycle states that must stay honest.
- Acceptance evidence expected before implementation is considered done.

If the brief is missing or under-specified, stop and ask for only the missing
context. Do not edit UI from an unconfirmed brief.

## Research Gate

For systemic problems, perform product and user research before designing a
direction. Cover:

- Operator mental model and repeated-use pressure.
- Comparable observability platform patterns, especially Grafana, Datadog,
  SigNoz, and OpenTelemetry ecosystem consoles where relevant.
- State, error, loading, empty, and recovery language.
- Help affordance density and progressive disclosure.
- Safe authoring, save/cancel, detect/test, refresh, and status convergence.

Prioritize monitor, entity, alert, and settings workflows because these are
high-frequency operator surfaces.

## Real Flow Audit

Audits must use current product evidence:

- Production frontend build.
- Real HertzBeat backend, using H2/Greptime/warehouse data honestly.
- In-app Browser screenshots for the current route state.
- Step notes tied to every screenshot and finding.
- Theme preflight before accepting screenshots: record `html[data-theme]`,
  `body[data-theme]`, `--background`, `--card`, and `--ops-background`.
  HertzBeat's default audit baseline is `dark-ops` (`--background: 220 11%
  5%`, `--ops-background: #0b0c0e`). If an existing Browser origin has
  persisted `light-ops`, do not use those screenshots as dark-baseline
  evidence; use an isolated localhost port/origin or explicitly document that
  the slice is auditing light theme.

Audit at least the relevant parts of:

- Login and guarded deep-link return.
- Navigation and retained query/context parameters.
- Create, edit, save, cancel, detect/test, refresh, and route revisit.
- Status convergence without browser reload when the UI promises refresh.
- Empty, loading, unavailable, failed, and recovered states.
- Help question marks, button labels, destructive confirmations, and action
  meaning.
- Card hierarchy, table density, form grouping, text overflow, responsive
  behavior, keyboard/focus semantics, and visible accessibility risks.

Findings must cite screenshot names and step numbers. Do not evaluate from
memory.

## Ideation Gate

When audit and research show a systemic UX problem, do not immediately rewrite
product code. Generate two or three different directions first. Useful default
directions for HertzBeat include:

- Dense operations console: fastest scanning and repeat actions.
- Diagnosis-first evidence chain: status, raw backend reason, metric evidence,
  history availability, and recovery steps.
- Guided authoring: lower misoperation risk for complex create/edit/test flows.

Choose a direction before prototyping or implementing.

## Prototype Gate

For high-impact flows, build a local interactive prototype before production
implementation. Prototype only the smallest slice needed to validate interaction
and information architecture. Good candidates include:

- Monitor create, detect, detail refresh, and history chart availability.
- Alert rule authoring, preview/test, save/cancel, and template selection.
- Entity create/edit/detail and definition import/edit handoff.
- Settings forms with required fields, disabled save, cancel, and no-write
  guarantees.

The prototype is evidence for product decisions. It does not replace
production code, tests, or Browser verification.

## Implementation Gate

Use Product Design `image-to-code` or production UI implementation only after
there is a confirmed brief plus a concrete visual or interaction target:
screenshot, selected visual direction, prototype, Figma frame, or mockup.

Implementation must preserve:

- Existing HertzBeat route/controller/view-model patterns.
- Shared `@hertzbeat/ui` primitives and source-backed icons.
- Dense operational layouts and stable dimensions.
- Clear data lifecycle and backend-state honesty.
- Runtime i18n rules and no hardcoded localized UI copy outside approved
  locale resources.

Do not introduce marketing-page composition, decorative chrome, fake zero
states, fake healthy states, broad refactors, or untested UI rewrites.

## Design QA Gate

After implementation, run design QA against the target evidence:

- Original audit screenshot(s).
- Selected direction or prototype.
- Actual production page rendered through the in-app Browser.
- Focused automated tests and the smallest relevant Browser proof.

Check layout, hierarchy, density, text overflow, responsive behavior, control
states, focus/keyboard semantics, empty/error/loading states, and visible
accessibility risks. P0, P1, and P2 design issues must be fixed before the
slice is treated as passing.

## Artifact And Progress Policy

Persist Product Design evidence locally. Use clear names that can be understood
without opening the file.

Recommended local artifact layout:

```text
.tmp/product-design/
  <slice-id>/
    screenshots/
    audit.md
    research.md
    directions.md
    prototype-notes.md
    design-qa.md
```

Do not commit `.tmp/`, screenshots, reports, runtime logs, local proof data, or
generated artifacts unless maintainers explicitly ask. The active slice in
`progress.md` must record:

- Saved Product Design context used.
- Research sources or research scope.
- Audit route, backend, screenshots, and steps.
- Theme preflight evidence and whether the screenshot baseline is `dark-ops`
  or an intentional alternate theme.
- Findings by severity and user impact.
- Selected direction and prototype target, when applicable.
- Implementation files changed.
- Focused tests and Browser verification.
- Remaining risks and next slice.

The release gate is not complete until Product Design evidence supports the
actual operator workflow, not just a single screenshot or isolated component.
