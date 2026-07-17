# HertzBeat React agent guide

This directory contains the active HertzBeat 2.0 frontend: Vite, React 19,
Refine 5, Ant Design 5, TanStack Query 5, and React Router 7. Do not restore
Next.js or Angular conventions and do not create another frontend project.

Use the former Angular `web-app` as a HertzBeat organization reference: keep
API access out of UI, routes explicit, models discoverable, shared components
central, and i18n unified. Translate those responsibilities into the React
feature layers in `architecture.md`; do not copy Angular modules, RxJS
subscription code, global service growth, `any` DTOs, or oversized components.

Before editing source, read `architecture.md` completely and inspect
`git status --short`. Preserve every existing staged, unstaged, and untracked
change. Do not use reset, stash, clean, or checkout-based rollback.

For every non-trivial change, read the current path end to end before writing:
route/page -> controller -> model/API -> backend response contract -> rendered
consumer. Current source and the live backend are authoritative; comments,
plans, screenshots, Angular, and Horizon are references. If a new local pattern
seems necessary, first confirm the surrounding feature does not already own it.

Work one vertical slice at a time:

1. place transport and runtime schemas in `features/<domain>/api`;
2. place pure domain and URL state in `model`;
3. place React/Refine/TanStack orchestration in `controller`;
4. keep `pages` thin and `components` presentational;
5. expose cross-feature use only through the feature `index.ts`;
6. write the smallest failing test before implementation;
7. run focused verification before broader verification;
8. update the ignored root `progress.md` after each milestone.

Do not declare a wire or visible workflow complete from green TypeScript and
unit tests alone. Run it against the real HertzBeat backend and inspect the
actual request, response, route transition, and rendered state. If the backend
or required data is unavailable, record that proof as a blocker; never invent
a payload, fake healthy data, or silently substitute a mock.

Use Node 22 and pnpm 10. Run:

```shell
pnpm architecture
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm i18n:check
pnpm budget
pnpm dead-code
```

Visible UI work additionally requires a production build, real backend, and
in-app Browser verification at a fixed viewport. Keep screenshots and reports
under `.tmp`; never commit them, `progress.md`, `dist`, coverage, logs, test
databases, or local proof data.

When an upstream context changes (time range, service, environment, Collector,
language, framework, or method), clear dependent evidence before loading the
new scope and show an explicit loading state. Never leave stale values visible
under a spinner. Every link or programmatic navigation must resolve through the
central route registry, and route parameters consumed on mount need a test for
the direct-entry path as well as in-app navigation.

Use HertzBeat's rendered shell and global `--hb-*` tokens as the visual source
of truth. Horizon informs density, hierarchy, and interaction discipline; it
does not authorize copying its Vue structure, branding, or OAP-specific rules.
Comments document only a public contract or a non-obvious invariant. Do not
paraphrase control flow or leave implementation history in source comments.

Instrumentation is an onboarding workflow. It consumes the Collector v1
catalog/render/detect contract and renders structured guidance. Never copy,
rename, download, or package a language SDK or Agent binary into HertzBeat.
Token values remain in the minimum in-memory state and never enter URLs, local
storage, logs, analytics, snapshots, or persisted progress.
