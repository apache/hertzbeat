# Time Context Visual Brief

Local design-gate notes for release-readiness work. Do not commit or upload unless explicitly requested.

## OTLP Ingest RED Time Window Readback Boundary - 2026-05-12

- Hierarchy: keep OTLP ingest RED as a backend evidence summary feeding existing workbench surfaces; this slice only makes durable readback honor explicit start/end query boundaries.
- Density: do not add time chips, range banners, explanatory helper copy, or synthetic empty-state panels while tightening the query contract.
- Anti-AI-slop: do not interpret missing rows as healthy zero traffic or fake success; RED counts must come from real Greptime or in-memory audit events inside the requested window.
- Operator workflow clarity: operators should be able to ask for a closed time window and get the same bounded evidence semantics from durable readback and fallback memory.
- Context visibility: workspace id, start/end millis, bounded limit, signal/protocol/outcome/status, and latest observed time remain covered by service/controller contracts.

## Entity Definition Document Node Boundary - 2026-05-10

- Hierarchy: keep definition import/edit, type resolution, metadata, spec profile, telemetry, relations, add-ons, and HertzBeat evidence in one draft-to-catalog flow; this slice only moves raw `spec` and `telemetry` document-node selection behind the document-field boundary.
- Density: do not add schema previews, telemetry badges, fallback chips, import banners, helper copy, or route chrome while preserving compact submitted definition evidence.
- Anti-AI-slop: do not infer spec or telemetry maps from entity names, route context, app names, labels, or templates; only explicit submitted document nodes should shape canonical spec and telemetry envelopes.
- Operator workflow clarity: root `spec` selection and nested `telemetry` selection should stay deterministic so operators can trace imports back to the submitted document.
- Context visibility: spec-map extraction, telemetry-map extraction, string-key normalization, null-key suppression, and non-object suppression remain covered by service contracts.

## Entity Definition HertzBeat Evidence Envelope Boundary - 2026-05-10

- Hierarchy: keep definition import/edit, spec profile, telemetry identities, relations, integrations, extensions, and HertzBeat evidence in one draft-to-catalog flow; this slice only moves HertzBeat evidence envelope attachment behind the evidence boundary.
- Density: do not add saved-query previews, pipeline cards, performance tag chips, code-location panels, helper copy, or route chrome while preserving compact declared evidence.
- Anti-AI-slop: do not synthesize logs, events, code locations, pipeline fingerprints, performance tags, or release evidence from entity names, routes, labels, or template context; only submitted evidence nodes and explicit legacy fingerprints should attach.
- Operator workflow clarity: root-vs-spec `hertzbeat` selection and legacy pipeline fallback should stay deterministic so operators can trace imported evidence back to the submitted definition document.
- Context visibility: HertzBeat root/spec selection, legacy fingerprint fallback, empty-block suppression, and definition attachment remain covered by service contracts.

## Entity Definition Add-on Envelope Boundary - 2026-05-10

- Hierarchy: keep definition import/edit, spec profile, telemetry identities, relations, integrations, extensions, and HertzBeat evidence in one draft-to-catalog flow; this slice only moves integration/extension envelope attachment behind the add-on boundary.
- Density: do not add integration previews, extension cards, provider badges, helper copy, or route chrome while preserving compact declared add-on evidence.
- Anti-AI-slop: do not synthesize integrations, extensions, providers, plugin hints, saved views, or add-on status from entity names, routes, labels, or template context; only submitted object nodes should attach add-ons.
- Operator workflow clarity: root-vs-spec fallback for `integrations` and `extensions` should stay deterministic so operators can trace imported add-on evidence back to the submitted definition document.
- Context visibility: integration/extension root/spec selection, non-object suppression, string-key normalization, and definition attachment remain covered by service contracts.

## Entity Definition Relation Envelope Boundary - 2026-05-10

- Hierarchy: keep definition import/edit, spec profile, telemetry identities, relations, dependency references, integrations, extensions, and HertzBeat evidence in one draft-to-catalog flow; this slice only moves relation envelope assembly behind the relation boundary.
- Density: do not add topology previews, dependency cards, relation badges, compatibility banners, helper copy, or route chrome while preserving compact declared relation evidence.
- Anti-AI-slop: do not synthesize relations, dependency references, target entities, scores, statuses, or topology hints from names, routes, labels, or template context; only declared relation/dependency nodes should drive relation evidence.
- Operator workflow clarity: `relations`, legacy `dependencies`, and `dependsOn` should resolve deterministically so operators can trace topology evidence back to the submitted definition.
- Context visibility: relation extraction, dependency fallback, dedupe, entity-id reference projection, and spec relation/dependsOn attachment remain covered by service contracts.

## Entity Definition Telemetry Envelope Boundary - 2026-05-10

- Hierarchy: keep definition import/edit, spec profile, telemetry identities, monitor binds, relations, integrations, extensions, and HertzBeat evidence in the same draft-to-catalog flow; this slice only moves telemetry envelope assembly behind the telemetry boundary.
- Density: do not add identity panels, monitor-bind previews, evidence badges, route banners, or helper copy while preserving compact declared telemetry evidence.
- Anti-AI-slop: do not synthesize identities, monitor binds, bind status, scores, or match context from route names, entity names, labels, or template hints; only declared telemetry nodes should attach a telemetry block.
- Operator workflow clarity: empty telemetry should stay absent so operators can distinguish missing evidence from declared zero-count evidence when reviewing imports.
- Context visibility: identity extraction, monitor bind extraction, empty-envelope suppression, and spec telemetry attachment remain covered by service contracts.

## Entity Definition Document Field Boundary - 2026-05-10

- Hierarchy: keep definition import/edit as one draft-to-catalog flow; this slice only moves root/spec field fallback, object-map shaping, and api-version alias resolution behind a small document-field boundary.
- Density: do not add import previews, schema banners, fallback chips, migration notices, or helper copy while preserving compact definition evidence.
- Anti-AI-slop: do not infer api versions, spec maps, telemetry blocks, integrations, extensions, or HertzBeat evidence from routes, titles, or template names; only declared document fields should drive canonicalization.
- Operator workflow clarity: apiVersion/schema-version/schema_version precedence and root-vs-spec fallback should remain deterministic evidence operators can trace back to the submitted definition.
- Context visibility: object-map key normalization, null-key suppression, first-non-null fallback, text trimming, and default api-version behavior remain covered by service contracts.

## Entity Definition Extension Normalizer Boundary - 2026-05-10

- Hierarchy: keep definition import/edit, spec, telemetry, relation, integration, extension, and HertzBeat evidence in the same draft-to-catalog flow; this slice only moves object-node add-on parsing behind a narrow boundary.
- Density: do not add integration cards, extension previews, add-on badges, helper copy, or route banners while preserving compact declared add-on evidence.
- Anti-AI-slop: do not synthesize integrations, extensions, providers, saved views, or plugin hints from app names, routes, labels, or template context; only declared definition object nodes should be retained.
- Operator workflow clarity: root/spec fallback for `integrations` and `extensions` should remain deterministic import evidence operators can trace back to the definition document.
- Context visibility: integrations, extensions, root-vs-spec fallback precedence, non-object suppression, and string-key normalization remain covered by service contracts.

## Entity Definition Spec Normalizer Boundary - 2026-05-10

- Hierarchy: keep definition import/edit, metadata, telemetry, relation, and HertzBeat evidence blocks in the same draft-to-catalog flow; this slice only moves spec profile field normalization behind a narrow boundary.
- Density: do not add spec preview panels, component badges, API interface cards, language chips, or helper copy while preserving compact declared spec evidence.
- Anti-AI-slop: do not synthesize systems, components, owners, languages, API schemas, or lifecycle tiers from route context or template names; only declared definition fields should shape the spec profile.
- Operator workflow clarity: source, owner, environment, system/component, interface, and language fields should stay deterministic import evidence operators can trace back to the definition document.
- Context visibility: root/spec fallback aliases, legacy `componentOf` system derivation, API interface schema/file refs, language lists, and manual source defaults remain covered by service contracts.

## Entity Definition Metadata Normalizer Boundary - 2026-05-10

- Hierarchy: keep definition import/edit as a single draft-to-catalog flow; this slice only moves metadata, owner, contact, link, label, tag, and runbook normalization behind a narrow boundary.
- Density: do not add owner panels, contact cards, metadata preview rails, compatibility badges, or helper copy while preserving compact definition metadata evidence.
- Anti-AI-slop: do not synthesize owners, labels, contacts, runbooks, repository context, or team aliases from surrounding route or template hints; only declared definition fields should shape metadata.
- Operator workflow clarity: labels, tags, contacts, owner refs, runbook links, and display fields should stay deterministic import evidence operators can trace back to the definition document.
- Context visibility: metadata/spec/root fallbacks, root label/tag legacy fallback, runbook link promotion, contact aliases, and additional owner refs remain covered by service contracts.

## Old Monitor Export Authorization Boundary - 2026-05-10

- Hierarchy: keep the monitor list, export action, export-all action, and existing response download path unchanged; this slice only tightens shipped route authorization templates for export routes.
- Density: do not add UI warnings, duplicate export controls, or compatibility badges while preserving the existing monitor operations surface.
- Anti-AI-slop: do not infer export permission from list visibility, selected rows, monitor labels, or broad read access; explicit admin-scoped route rules remain the evidence.
- Operator workflow clarity: operators with admin rights keep the same export endpoints, while guest/list-only access stays limited to monitor visibility rather than config extraction.
- Context visibility: `/api/monitors/export`, `/api/monitors/export/all`, root monitor list reads, wildcard monitor reads, and admin-only batch mutations remain visible in the route authorization matrix.

## Entity Detail Observability Workspace Boundary - 2026-05-10

- Hierarchy: keep entity detail status, evidence summary, monitor/log/trace handoffs, noise-control summary, and activity timeline in their existing positions; this slice only moves request-workspace lookup out of the detail assembly orchestrator.
- Density: do not add workspace chips, banners, extra evidence rails, or explanatory copy while preserving request-scoped status, silence/inhibit, and activity evidence.
- Anti-AI-slop: do not synthesize entity health, alert suppression, monitor evidence, or activity records from route context; each panel remains backed by its existing query/read-model boundary.
- Operator workflow clarity: entity detail should remain a single evidence bundle, with workspace scoping resolved where status, noise-control, and activity evidence are actually read.
- Context visibility: entity id, owner, monitor bindings, active alerts, response handoffs, and request workspace scope stay visible through existing data-backed DTOs and routes.

## Monitor Label Equals Filter Compatibility Boundary - 2026-05-10

- Hierarchy: keep the monitor list filters, label rail handoff, entity-return context, and dense table unchanged; this slice only normalizes backend label query parsing for existing route parameters.
- Density: do not add visible helper copy, duplicate label chips, or migration banners while supporting both `key:value` and `key=value` label filters.
- Anti-AI-slop: label filtering must remain explicit and data-backed; do not infer monitor labels from entity names, owners, search text, or surrounding route context.
- Operator workflow clarity: label links coming from entity, label-management, or legacy monitor surfaces should narrow the same monitor list instead of silently falling back to a broad text match.
- Context visibility: app/search/status/page/entity/return route state stays unchanged, and the backend continues matching persisted monitor labels as JSON key/value evidence.

## Old Monitor Legacy Comma Id Compatibility Boundary - 2026-05-10

- Hierarchy: keep the monitor list, selected-row batch actions, manage toggles, and export flow unchanged; this slice only preserves legacy singular `id` query lists for old monitor batch callers.
- Density: do not add compatibility notices, explanatory labels, or alternate controls while accepting comma-separated legacy ids behind the existing API contract.
- Anti-AI-slop: do not infer monitor selections from names, hosts, filters, or table state; explicit numeric ids remain the only compatibility source.
- Operator workflow clarity: old clients that submit selected monitors as `id=1,2` should reach the same service path as newer `ids=1,2` callers.
- Context visibility: monitor ids, search/app filters, manage/delete/export intent, and response handling stay owned by the current controller/service boundary.

## Old Monitor Update Query-Id Compatibility Boundary - 2026-05-10

- Hierarchy: keep the existing monitor edit form, detect action, save action, and monitor list return flow unchanged; this slice only preserves the legacy `PUT /api/monitor?id=...` API entry.
- Density: do not add compatibility banners, helper text, duplicate edit controls, or route explanation chrome while maintaining the backend alias.
- Anti-AI-slop: do not infer monitor identity from labels, names, list filters, or route context; the explicit query `id` remains the authoritative legacy update target.
- Operator workflow clarity: old singular monitor callers using query id should reach the same validation and modify service path as the existing root body update and path-id alias.
- Context visibility: monitor id, app, instance, params, collector, dashboard payload, and validation result stay owned by the existing monitor DTO/service contract.

## ClientWorkbench Loading Copy Boundary - 2026-05-09

- Hierarchy: keep `ClientWorkbench` as the shared pending/error/data shell for route islands; this slice only aligns its default pending body copy with the global workbench loading message.
- Density: preserve the single spinner, one title line, and one body line without adding progress bars, skeleton panels, route badges, or explanatory onboarding text.
- Anti-AI-slop: do not imply backend readiness, ingestion progress, cache freshness, AI preparation, or successful resource discovery while a route island is still loading.
- Operator workflow clarity: routes with domain-specific loading copy remain authoritative, and routes without custom copy should use the same localized workbench-loading body as global route loading.
- Context visibility: cache keys, settled TTL forwarding, auth redirect handling, error rendering, and caller-provided loading title/copy remain unchanged.

## Shell Sidebar Helper Boundary - 2026-05-09

- Hierarchy: keep the global sidebar section order, item grouping, active-route semantics, and icon mapping unchanged; this slice only moves the sidebar regression to shared locale helper messages.
- Density: preserve the compact navigation rail rhythm without adding section descriptions, route badges, workflow hints, or new product copy.
- Anti-AI-slop: do not infer ingestion readiness, alert state, topology availability, setup progress, or tenant posture from translated navigation labels.
- Operator workflow clarity: sidebar labels should resolve through the same locale bundle as runtime so operators see stable route names across AppFrame, shell tests, and parity smoke.
- Context visibility: ingestion, objects, observability, alerting, dashboards, settings, hidden incident/action/status routes, and active alert-setting ancestry remain covered without changing destinations.

## AppFrame Setup Summary Helper Boundary - 2026-05-09

- Hierarchy: keep setup progress as a compact first-screen header utility beside the existing global actions; this slice only moves setup-summary regression copy onto shared helper messages.
- Density: preserve short progress assertions for the baseline percent and empty live state without adding setup rails, onboarding cards, or extra header prose.
- Anti-AI-slop: do not invent platform readiness, setup health, AI assistance, live ingestion, or resource availability while replacing local test translators.
- Operator workflow clarity: route-specific setup baselines should resolve through the same runtime catalog operators see, so progress text cannot drift behind a private `key:percent` test formatter.
- Context visibility: overview, dashboard, entity creation/import/discovery/definition, log stream, OTLP intake, and dark-ops compatibility baseline routes remain covered by the same AppFrame source contract.

## Entity List Surface Helper Boundary - 2026-05-09

- Hierarchy: keep the object catalog header, metrics strip, search toolbar, dense table, health affordance, and row actions unchanged; only move the regression test copy to the shared helper catalog.
- Density: preserve the compact full-width catalog rhythm without adding right rails, owner panels, explanatory helper copy, or extra action groups.
- Anti-AI-slop: do not invent entity health, ownership completeness, alert evidence, monitor coverage, relation readiness, or fake list results while replacing the test translator.
- Operator workflow clarity: create, discovery, import, refresh, reset, owner, log, and trace handoffs remain the same operator actions and route destinations.
- Context visibility: search/type/status filters, row health, owner fallback, evidence counts, range copy, and row next-action labels remain visible through locale-owned messages.

## Workspace Navigation Label Helper Boundary - 2026-05-09

- Hierarchy: keep entity, OTLP intake, metrics, monitor, log, and trace workspace tabs in the existing order and route positions; only make the label regression use shared runtime/helper messages.
- Density: preserve the compact tab-strip rhythm without adding route chips, extra labels, helper prose, or side navigation.
- Anti-AI-slop: do not infer entity health, signal readiness, monitor status, trace availability, or ingestion state from localized navigation labels.
- Operator workflow clarity: tabs remain handoffs between existing evidence workbenches and do not introduce new workflow states or fake destinations.
- Context visibility: entity id/name, service namespace, trace/span filters, log view, metrics query, return path, and monitor context stay unchanged while labels resolve from locale-owned copy.

## Monitor Manage Query Owner Boundary - 2026-05-09

- Hierarchy: keep the monitor center title, summary metrics, filter row, dense monitor list, selected monitor rail, label rail, import/export controls, and entity-return action unchanged; only route query parsing and display-label canonicalization move out of the client island.
- Density: preserve the compact monitor operations surface without adding route-state chips, entity banners, extra filters, or explanatory helper copy.
- Anti-AI-slop: do not invent monitor health, scrape freshness, entity linkage, collection status, alert state, or fake fallback results while normalizing URL filters.
- Operator workflow clarity: entity-origin monitor handoffs still default to down monitors until status is explicit, and unsafe return URLs still resolve to internal entity routes.
- Context visibility: search/app/labels/status/page filters, entity id/name, return route, cache key, fallback-to-all behavior, and mutation reload state remain visible and unchanged.

## Entity Detail Inherited Context Query Boundary - 2026-05-09

- Hierarchy: keep the entity detail header, compact counts, context panel, related-signal panel, next-action panel, drilldown entries, and destructive-action flow unchanged; only inherited route context parsing moves out of the client island.
- Density: preserve the full-width detail workbench rhythm without adding context chips, banners, extra filter rows, or route-state explanatory copy.
- Anti-AI-slop: do not infer health, alert evidence, monitor coverage, topology readiness, trace linkage, or fake status from query parameters.
- Operator workflow clarity: inherited monitor/time/source context remains an input to the existing detail evidence and handoff rows, supplied by the server wrapper before render.
- Context visibility: monitor id/name/app/instance, time range, trace/span, source, collector, template, cache key, refresh invalidation, and delete navigation remain visible and unchanged.

## Entity New Telemetry Seed Query Boundary - 2026-05-09

- Hierarchy: keep the entity editor shell, starter draft, catalog suggestions, form sections, preview, and save controls unchanged; only the telemetry seed query handoff moves out of the client island.
- Density: preserve the existing authoring workflow without adding seed banners, handoff badges, or explanatory route-state panels.
- Anti-AI-slop: do not invent monitor details, entity identities, telemetry readiness, catalog suggestions, or fake draft content while normalizing the seed query.
- Operator workflow clarity: telemetry handoff still seeds from `source=telemetry` plus `monitorId`, and incomplete handoffs still fall back to the manual draft.
- Context visibility: editor mode, draft source, monitor bind evidence, catalog suggestions, cache key, and save/preview flow remain visible and unchanged.

## Entity Catalog Query Owner Boundary - 2026-05-09

- Hierarchy: keep the entity catalog header, compact metrics, search row, dense table, row actions, and evidence handoffs unchanged; only route query ownership moves out of the visible client island.
- Density: preserve the current filtered-list rhythm without adding route-state badges, extra filter panels, or explanatory helper copy.
- Anti-AI-slop: do not infer entity health, alert counts, monitor bindings, topology readiness, or fake query results while normalizing URL filters.
- Operator workflow clarity: search, type, and status filters remain the same operator controls, with initial route state supplied by the server wrapper before the island renders.
- Context visibility: active query state, cache key, refresh invalidation, row evidence counts, and entity/log/trace next-step links remain visible and unchanged.

## Log Manage Query Placeholder Boundary - 2026-05-09

- Hierarchy: keep the log workbench header, stream/history switch, query row, trend band, dense list, selected evidence, entity context, and cross-signal handoffs unchanged; only the service-query example placeholder moves behind runtime/helper ownership.
- Density: preserve the compact query-row rhythm without adding helper text, query builders, syntax panels, saved views, or extra filter chrome.
- Anti-AI-slop: do not invent log availability, parser health, collector readiness, trace coverage, alert evidence, or fake query progress from a placeholder example.
- Operator workflow clarity: the placeholder remains a small service-attribute query example and does not change search semantics, route state, stream/list modes, or run/reset actions.
- Context visibility: current query state, time context, cache key, stream/history mode, selected log evidence, and log-to-trace/entity/alert handoffs remain unchanged.

## Log Manage Query Owner Boundary - 2026-05-09

- Hierarchy: keep the log workbench header, live/history switch, query row, trend band, dense list, selected evidence drawer, entity context, and cross-signal handoffs in the existing client island; only raw route parsing moves to the log query owner.
- Density: preserve the compact workbench rhythm without adding route chips, banners, side rails, query explanations, or synthetic stream status blocks.
- Anti-AI-slop: do not invent log freshness, parser health, trace coverage, entity readiness, alert causality, or backend availability while normalizing URL state.
- Operator workflow clarity: initial query, live/history mode, route context, display-label cleanup, run/reset/view/time-control navigation, and evidence handoffs keep the same behavior with typed route state supplied before render.
- Context visibility: search/content filters, trace/span, severity, entity/service/environment/source, return link, absolute time bounds, cache key, and EventSource routing remain visible to the existing log workbench tests.

## Trace Manage Route Loading Copy Boundary - 2026-05-09

- Hierarchy: keep the trace workbench header, query row, trend band, trace list, detail drawer, entity context, and cross-signal handoffs unchanged; only the route loading copy is asserted through shared runtime/helper ownership.
- Density: preserve the compact client-workbench loading boundary without adding trace skeleton tables, service health banners, latency summaries, or extra navigation chrome.
- Anti-AI-slop: do not invent trace availability, span readiness, entity attribution, log linkage, alert evidence, or fake query progress while wiring loading-copy parity.
- Operator workflow clarity: the route still loads trace overview and list data from the current trace/service/time filters before rendering the existing trace workbench.
- Context visibility: query state, time context, cache key, detail drawer, attribution diagnostics, and cross-signal return links remain unchanged.

## Public Status Route Loading Copy Boundary - 2026-05-09

- Hierarchy: keep the public status shell, organization brand, component history, incident feed, and locale controls unchanged; only the route loading copy is asserted through shared runtime/helper ownership.
- Density: preserve the compact client-workbench loading boundary without adding public uptime summaries, incident skeleton feeds, component health rails, or extra navigation chrome.
- Anti-AI-slop: do not invent component readiness, incident freshness, uptime proof, organization health, or fake refresh progress while wiring loading-copy parity.
- Operator workflow clarity: the route still loads public org, component, and incident data before the existing public status surface renders for visitors.
- Context visibility: server wrapper, client island, cache key, incident year query, reload token, and public status shell handoffs remain unchanged.

## Public Status Page Helper Regression Boundary - 2026-05-09

- Hierarchy: keep the public status route regression on the existing status shell, organization brand block, component/incident counts, footer attribution, refresh action, and client-workbench loader; only align test-owned labels with the shared helper catalog.
- Density: preserve the compact public board and route loading marker without adding summary rails, uptime proof panels, banners, skeleton tables, or extra date captions.
- Anti-AI-slop: do not invent incidents, component health, uptime, hosted status-page packaging, SaaS positioning, or validation progress while replacing page-local label assumptions.
- Operator workflow clarity: the route regression should assert helper-owned loading, powered-by, and refresh labels while leaving the controller-backed load path and public status shell props unchanged.
- Context visibility: organization payload, component/incident counts, public mode, settled cache markers, refresh control, and controller call remain data-backed and unchanged.

## Setting Status Route Loading Copy Boundary - 2026-05-09

- Hierarchy: keep the status settings surface, organization profile, component list, incident list, and public status handoff unchanged; only the route loading copy is asserted through shared runtime/helper ownership.
- Density: preserve the compact client-workbench loading boundary without adding status summaries, incident health banners, component skeleton tables, or extra navigation chrome.
- Anti-AI-slop: do not invent public uptime, incident freshness, component readiness, delivery state, or fake validation progress while wiring loading-copy parity.
- Operator workflow clarity: the route still loads org, component, and incident management data, then lets operators edit status page configuration through the existing surface.
- Context visibility: server wrapper, client island, cache key, refresh invalidation, incident query state, and public status link remain unchanged.

## Setting Status Page Helper Regression Boundary - 2026-05-09

- Hierarchy: keep the status settings route regression on the existing client-workbench loader and cold status settings surface; only make the mocked provider's locale and loading copy ownership explicit.
- Density: preserve the compact admin layout marker without adding summary rails, incident skeletons, component health panels, route banners, or nested cards.
- Anti-AI-slop: do not invent public uptime, incident freshness, publishing state, component readiness, tenant posture, or validation progress while replacing implicit test helper assumptions.
- Operator workflow clarity: the regression should assert helper-owned status-settings loading copy while the controller-backed org/component/incident load path and public status handoff stay unchanged.
- Context visibility: server wrapper, client island, status settings surface marker, cache/loading marker, incident query defaults, and public `/status` link remain data-backed and unchanged.

## Setting Server Route Loading Copy Boundary - 2026-05-09

- Hierarchy: keep the settings console title, email/SMS summary rows, configure dialogs, and save feedback unchanged; only the route loading copy is asserted through shared runtime/helper ownership.
- Density: preserve the compact client-workbench loading boundary without adding message-server health banners, delivery-state panels, provider summaries, or nested cards.
- Anti-AI-slop: do not invent notification delivery status, provider readiness, queue depth, tenant posture, or fake validation progress while wiring loading-copy parity.
- Operator workflow clarity: the route still loads `/config/email` and `/config/sms`, then lets operators configure mail and SMS through the existing summary/dialog flow.
- Context visibility: server wrapper, client island, cache key, email/SMS save invalidation, provider fields, and settings-console context remain unchanged.

## Monitor Manage Route Loading Boundary - 2026-05-09

- Hierarchy: keep monitor management loading feedback in the existing `ClientWorkbench` route island before the dense monitor workbench renders.
- Density: add only runtime-owned loading-copy parity; do not add monitor health banners, summary rails, skeleton tables, or extra navigation chrome.
- Anti-AI-slop: do not invent monitor readiness, collection health, entity coverage, alert state, or topology evidence while fixing loading-copy ownership.
- Operator workflow clarity: the monitor route still loads the filtered monitor list and preserves entity-return, new/edit/detail, import/export, and mutation flows.
- Context visibility: search filters, entity context, cache key, reload invalidation, selected monitor, and settled TTL remain unchanged.

## Log Manage Route Loading Boundary - 2026-05-09

- Hierarchy: keep log workbench loading feedback in the existing `ClientWorkbench` route island before the live/history log surface renders.
- Density: add only runtime-owned loading-copy parity; do not add skeleton tables, stream status banners, route chrome, or extra query controls.
- Anti-AI-slop: do not invent log availability, stream health, collector status, ingestion freshness, trace coverage, or alert evidence while fixing copy ownership.
- Operator workflow clarity: the log route still loads overview, list, trend, coverage, and query state from the current route context.
- Context visibility: live/history mode, entity/time/trace context, cache key, settled TTL, and log workbench handoffs remain unchanged.

## Safe Automation Next-Hop Navigation Copy Boundary - 2026-05-09

- Hierarchy: keep overview, entity, and monitor next hops as the existing compact navigation affordances, without adding a secondary nav rail or action routing panel.
- Density: preserve the current entry/action surface rhythm; only the visible next-hop labels move to locale-owned runtime copy.
- Anti-AI-slop: do not infer route availability, entity readiness, monitor health, execution readiness, adapter status, or approval progress from localized next-hop labels.
- Operator workflow clarity: next-hop labels are plain navigation targets and do not introduce a new action workflow state.
- Context visibility: hrefs, variants, entity/monitor destinations, overview destination, snapshot data, and adapter-pending boundary remain unchanged.

## Safe Automation Surface Chrome Copy Boundary - 2026-05-09

- Hierarchy: keep the action surface kicker, handoff rows, checklist rows, and lane summaries in their existing compact positions, without adding a navigation rail, approval panel, or execution status summary.
- Density: preserve the catalog/run/approval/checklist/handoff rhythm; only the visible chrome copy moves to locale-owned Chinese/English messages.
- Anti-AI-slop: do not infer live execution state, adapter readiness, queue freshness, approval routing, action success, or notification delivery from localized surface labels.
- Operator workflow clarity: surface, handoff, checklist, and lane labels describe the existing roadmap-demo boundary and do not introduce a new workflow state.
- Context visibility: catalog entries, run rows, approval rows, snapshot markers, handoff destinations, and adapter-pending boundary remain unchanged.

## Safe Automation Snapshot Status Label Boundary - 2026-05-09

- Hierarchy: keep run and approval statuses inside the existing compact snapshot meta lines, without adding live execution badges, approval rails, or incident-workflow panels.
- Density: preserve the catalog card, run row, approval row, and snapshot marker rhythm so the static action plane stays scannable.
- Anti-AI-slop: do not infer live execution state, approval routing, adapter readiness, queue freshness, action success, or notification delivery from localized status labels.
- Operator workflow clarity: status enum values remain data while English and Chinese display labels are locale-owned runtime copy.
- Context visibility: run id, approval id, started-at time, target, actor, owner, evidence, snapshot marker, and adapter-pending boundary remain unchanged.

## Safe Automation Suggested Action Risk Label Boundary - 2026-05-09

- Hierarchy: keep risk in the existing tiny suggested-action meta line beside the catalog label, without adding a risk legend, approval rail, or execution-status chip.
- Density: preserve the compact three-card suggestion grid and the meta/title/copy/evidence/action/posture stack.
- Anti-AI-slop: do not infer execution readiness, approval state, live run history, queue health, automation success, or adapter availability from localized risk labels.
- Operator workflow clarity: English and Chinese labels are locale-owned runtime copy; risk enum values remain data for governance and tests.
- Context visibility: catalog label, action id, risk enum, source handoff, evidence URL, confirmation mode, and adapter-pending boundary remain unchanged.

## Safe Automation Suggested Action Target Label Boundary - 2026-05-09

- Hierarchy: keep the suggested action target in the existing title line, without adding an entity-id badge, resolver panel, or catalog drawer.
- Density: preserve the tiny meta, title, copy, evidence, evidence link, disabled human-confirm button, and posture line in each suggested action card.
- Anti-AI-slop: do not infer entity display names, service readiness, automation safety, execution availability, approval state, or evidence completeness from an entity id route token.
- Operator workflow clarity: serviceName and entityName remain the preferred human labels; entityId-only handoffs render localized fallback copy that preserves the raw id for diagnosis.
- Context visibility: target label, source, signal, trace id, alert group id, evidence URL params, risk, confirmation mode, and adapter-pending boundary remain unchanged beyond the visible fallback label.

## Safe Automation Suggested Action Evidence Value Boundary - 2026-05-09

- Hierarchy: keep source and signal evidence inside the existing compact evidence line in each suggested action card, without adding a source taxonomy panel or signal legend.
- Density: preserve the tiny meta, title, copy, evidence, evidence link, disabled human-confirm button, and posture line.
- Anti-AI-slop: do not infer evidence completeness, source trust, signal health, action readiness, approval state, adapter availability, or execution history while replacing visible route slugs.
- Operator workflow clarity: known source/signal values render operator labels; unknown non-empty values render localized fallback copy that preserves the original route token.
- Context visibility: source, signal, trace id, alert group id, return URL, evidence URL params, action id, risk, confirmation mode, and adapter-pending boundary remain unchanged.

## Safe Automation Suggested Action Catalog Meta Boundary - 2026-05-09

- Hierarchy: keep suggested action catalog context in the existing tiny meta line above each suggestion title, without adding a catalog drawer or execution panel.
- Density: preserve the three-card suggestion grid, evidence link, disabled human-confirm button, and posture line.
- Anti-AI-slop: do not invent action readiness, execution history, approval state, queue health, automation success, or adapter availability while replacing visible catalog slugs.
- Operator workflow clarity: display the localized catalog name beside the localized risk label; retain catalog ids as data, not as the visible operator label.
- Context visibility: source handoff, alert evidence URL, confirmation mode, risk value, action id, evidence copy, and adapter-pending boundary remain unchanged.

## Entity Definition Backend Feedback Boundary - 2026-05-09

- Hierarchy: keep unknown backend feedback inside the existing inline entity definition message slot, without adding a banner, retry rail, or diagnostic drawer.
- Density: preserve the compact editor/action/context panel rhythm in both import and definition modes.
- Anti-AI-slop: do not infer backend health, validation quality, parser readiness, telemetry freshness, or entity existence from an unknown backend message.
- Operator workflow clarity: known backend messages keep their existing localized mapping; unknown non-empty messages get localized fallback copy while preserving the original server reason.
- Context visibility: message tone, load-error placement, entity id, editor content, format, preview/import/save actions, templates, activities, and entry links remain unchanged.

## Entity Definition Format Option Boundary - 2026-05-09

- Hierarchy: keep format option labels inside the existing compact editor toolbar select, without adding helper copy or a separate format panel.
- Density: preserve the current toolbar rhythm, action row, editor height, template panel, activity panel, and import/definition modes.
- Anti-AI-slop: do not infer parser support, import readiness, backend availability, telemetry freshness, or template validity from the visible option labels.
- Operator workflow clarity: format options remain the same YAML/JSON/cURL choices, with their display labels resolved from runtime messages.
- Context visibility: selected format, editor language, starter draft, placeholders, preview/import/save actions, and surrounding entity definition evidence stay unchanged.

## Entity Import Unknown Format Boundary - 2026-05-09

- Hierarchy: keep definition format labels in the existing import metric and row meta positions, without adding parser warnings or format guidance panels.
- Density: preserve the current import metric, template row, activity row, preview, and queue rhythm.
- Anti-AI-slop: do not infer parser support, import success, backend readiness, telemetry freshness, or template trust from an unknown format token.
- Operator workflow clarity: known YAML/JSON/cURL values keep their compact labels, while unknown non-empty backend tokens render localized fallback copy that preserves the original value.
- Context visibility: import format, activity status, template source, activity detail, preview validation, and attribution evidence remain owned by the existing import workbench model.

## Entity Import Unknown Kind Source Boundary - 2026-05-09

- Hierarchy: keep entity type and source labels inside the existing import preview row, without adding a source taxonomy panel or import warning rail.
- Density: preserve the current preview row title, subtitle, type, source, telemetry, validation, and attribution evidence rhythm.
- Anti-AI-slop: do not infer entity classification, source trust, telemetry readiness, ownership quality, or backend freshness from unknown type/source tokens.
- Operator workflow clarity: known values keep their current labels, while unknown non-empty backend tokens render localized fallback copy that preserves the original value.
- Context visibility: entity name, display name, type, source, telemetry binding, gaps, attribution rows, and import validation remain owned by the existing import preview model.

## Entity Import Unknown Activity Boundary - 2026-05-09

- Hierarchy: keep unknown activity status and template source tokens inside the existing import activity/template row meta, without adding warning panels or status explanations.
- Density: preserve the current import preview, template list, activity list, queue groups, and compact meta rhythm.
- Anti-AI-slop: do not infer import success, template trust, telemetry freshness, ownership quality, or backend readiness from an unknown token.
- Operator workflow clarity: known statuses and sources stay localized, unknown non-empty tokens get localized fallback copy that preserves the original backend value.
- Context visibility: import format, template source, activity status, activity detail, validation labels, and attribution evidence remain owned by the existing entity import workbench.

## Entity Discovery Governance Card Context Boundary - 2026-05-09

- Hierarchy: keep monitor meta, draft subtitle, and candidate context as compact lines inside existing discovery governance cards; do not add a context panel or missing-field explanation.
- Density: preserve the existing card rhythm, candidate label, completeness, risk, next action, and action row.
- Anti-AI-slop: do not infer ownership quality, entity readiness, merge correctness, service health, backend freshness, or remediation from missing context fields.
- Operator workflow clarity: real monitor id/app/instance and owner/system/environment values stay visible, while absent values use the localized empty marker already used by discovery rows.
- Context visibility: monitor id, app, instance, owner, system, environment, candidate label, state, and handoff links remain unchanged.

## Entity Discovery Service Name Boundary - 2026-05-09

- Hierarchy: keep fallback service names inside the existing discovery table attribution copy and governance card title/candidate label; do not add a naming panel or merge explanation.
- Density: preserve the compact discovery table, candidate card, draft title, completeness, and action rhythm.
- Anti-AI-slop: do not infer entity confidence, ownership quality, service health, backend freshness, merge correctness, or remediation from a fallback service name.
- Operator workflow clarity: existing preset names remain authoritative, while fallback service names localize only the product suffix and keep the raw monitor app/name visible.
- Context visibility: monitor id, app, instance, candidate action, draft title, attribution state, owner/system/environment, and return links remain unchanged.

## Entity Discovery Unknown Status Boundary - 2026-05-09

- Hierarchy: keep unknown monitor status inside the existing discovery table status chip; do not add an explanation panel or secondary health row.
- Density: preserve the compact clue, instance, status, owner, system, environment, attribution, and action columns.
- Anti-AI-slop: do not infer monitor health, ownership quality, entity confidence, backend freshness, or remediation from an unknown status token.
- Operator workflow clarity: known monitor statuses keep their localized labels, while unknown tokens use a localized fallback that still exposes the original value for diagnosis.
- Context visibility: monitor id, app, instance, attribution state, candidate action, and governance context remain unchanged.

## Alert Evidence Source Fallback Boundary - 2026-05-09

- Hierarchy: keep unknown alert evidence source copy inside the existing inherited source context row; do not add a source warning panel or routing explanation.
- Density: preserve the compact time, monitor, source, and trace evidence row stack so alert evidence remains quick to scan.
- Anti-AI-slop: do not infer source health, topology confidence, collector state, ingestion freshness, or alert causality from an unknown source route token.
- Operator workflow clarity: known sources keep their localized labels, while unknown source tokens use a localized fallback that still exposes the original token.
- Context visibility: raw source, time, monitor, trace/span, return context, and evidence handoffs remain owned by the existing alert inherited-context pipeline.

## Alert Entity Context Severity Fallback Boundary - 2026-05-09

- Hierarchy: keep routed alert severity inside the existing compact entity-context summary strip; do not add a severity explanation card or secondary alert health panel.
- Density: preserve the inline status, severity, and search summary tokens so the alert center header remains quick to scan.
- Anti-AI-slop: do not invent severity normalization, incident state, health, ownership, or backend freshness for unknown severity route tokens.
- Operator workflow clarity: known severities keep their localized labels, while unknown routed severities use a localized fallback that still exposes the original token.
- Context visibility: entity id/name, return link, status, search, and raw route context remain owned by the existing alert entity context pipeline.

## Passport Login Session Copy Locale Boundary - 2026-05-08

- Hierarchy: keep the login session notice as the existing compact post-login context line, not a new security banner or onboarding panel.
- Density: preserve the current login card rhythm and one-line notice without adding helper rails, token diagrams, or extra form states.
- Anti-AI-slop: correct locale ownership without claiming HttpOnly/session redesign or completed token-boundary work ahead of Milestone 4.
- Operator workflow clarity: the notice remains a simple statement that the workspace session resumes and token refresh may be attempted.
- Context visibility: username/password flow, default-password warning, redirect handling, and session notice remain separate and readable.

## Passport Login Redirect Query Boundary - 2026-05-09

- Hierarchy: keep the Angular-style passport shell, credential card, hidden field labels, remember checkbox, default-password warning, and submit flow unchanged; only the redirect query owner moves from the form to the route/controller.
- Density: preserve the single compact auth panel without adding redirect badges, route explanation text, guard banners, or helper rows.
- Anti-AI-slop: do not claim new session security, HttpOnly cookies, MFA, tenant policy, workspace identity, or token-boundary completion while normalizing the post-login redirect.
- Operator workflow clarity: unsafe or auth-loop redirects still fall back to `/overview`, and valid internal targets are supplied to the form before submit without reading raw URL state in the client card.
- Context visibility: login alias cleanup, post-login redirect target, token persistence, bootstrap call, password visibility, locale controls, and passport shell markers remain visible to existing auth tests.

## Exception Recovery English Locale Copy Boundary - 2026-05-08

- Hierarchy: keep recovery rail rows as compact handoff options below the existing exception diagnostics, not a new incident or runbook panel.
- Density: preserve the three-row overview/logs/traces rhythm and button labels without adding helper prose, badges, or new cards.
- Anti-AI-slop: correct the English locale copy without inventing recovery automation, fake backend status, or SaaS-style troubleshooting language.
- Operator workflow clarity: each row remains a simple handoff to the existing overview, log, or trace workspace.
- Context visibility: route targets, row titles, row copy, and action labels stay locale-owned while preserving current exception type context.
- Helper parity update: keep exception chrome, filters, query controls, table labels, and recovery handoffs on the existing surface while using the shared test translator; do not add retry banners, fake exception health, backend status claims, or new recovery UI.

## Exception Center Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the exception title, facts, filter rail, query bar, table, recovery rail, and route-specific boundary copy in the existing exception center surface; do not add recovery banners or a second shell.
- Density: preserve the dense filter sidebar, one-line query controls, compact exception table, and three-row recovery rail.
- Anti-AI-slop: do not invent backend health, exception freshness, RCA, incident state, retry automation, or SaaS-style troubleshooting copy while moving the regression onto shared helper messages.
- Operator workflow clarity: focused exception center tests should exercise the same shared translator helper used by other surfaces instead of a page-local message map.
- Context visibility: exception type, normalized copy, filter labels, recovery handoffs, and row detail links remain unchanged.

## Incident Snapshot Checklist Meta Labels - 2026-05-08

- Hierarchy: keep checklist meta as compact status text on the existing incident adapter checklist, not a new progress tracker or readiness panel.
- Density: preserve the three-row checklist and short meta rhythm beside title/copy rows without adding badges, counters, or helper rails.
- Anti-AI-slop: translate sample meta labels without implying live adapter readiness, workflow completion, or real drilldown delivery.
- Operator workflow clarity: meta stays static snapshot display copy under the adapter boundary until incident workflow adapters land.
- Context visibility: shell ready, adapter next, and drilldown reserved states remain visible while display labels become runtime-localized.

## Incident Snapshot Model Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the incident domain-model regression on the existing title, metrics, cards, timeline, ownership, checklist, and handoff payloads; do not add an incident desk shell or adapter preview.
- Density: preserve the compact domain-model assertions without snapshot dumps or extra helper-only rows.
- Anti-AI-slop: do not invent live incident states, escalation policy, notification readiness, RCA, ownership schedules, or adapter health while moving the test onto shared messages.
- Operator workflow clarity: model tests should use the same shared translator helper as runtime surfaces instead of a private incident-message map.
- Context visibility: incident titles, owners, blast radius, timeline copy, ownership lanes, checklist meta, and navigation labels remain tied to the same model payload.

## Incident Entry Chrome Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the incident kicker, title, subtitle, overview/entity handoffs, and shell explainer in the existing cold entry header and left panel; do not add incident summaries or a live response desk.
- Density: preserve the compact header/action row, cold shell panel, checklist rail, and empty adapter state.
- Anti-AI-slop: do not invent incident counts, paging state, escalation policy, on-call readiness, AI RCA, or adapter availability while cataloging entry chrome copy.
- Operator workflow clarity: the entry chrome should resolve through shared runtime/helper catalogs so route and view-model regressions do not depend on page-local maps.
- Context visibility: route wrapper, client island, cold-ops visual baseline, response checklist, empty adapter boundary, and overview/entity exits remain unchanged.

## Incident Snapshot Title Boundary - 2026-05-08

- Hierarchy: keep the incident surface title as the compact domain-model header consumed by the existing surface; do not add a second hero, status banner, or live incident desk.
- Density: preserve the current facts, tags, incident cards, timeline, ownership lanes, and handoff rows without adding summary rails or decorative response copy.
- Anti-AI-slop: localize the title without implying real incident adapters, notification routing, escalation policy, or completed closure workflow.
- Operator workflow clarity: the title remains snapshot display copy under the adapter boundary while real incident response workflows stay in later milestones.
- Context visibility: title, focus, tags, metrics, incidents, timeline, ownership, checklist, and next hops stay stable while the remaining source-local title becomes runtime-localized.

## Incident Snapshot Ownership Labels - 2026-05-08

- Hierarchy: keep ownership lanes as compact responder rows under the incident snapshot, not as a live on-call schedule, escalation tree, or notification router.
- Density: preserve owner, queue, copy, and meta rhythm so the lanes remain scannable beside incident cards and timeline rows.
- Anti-AI-slop: translate sample ownership copy without implying real paging, SLA timers, on-call rotation, or completed notification delivery.
- Operator workflow clarity: ownership rows stay static adapter-boundary evidence until incident response ownership and escalation workflow lands.
- Context visibility: checkout, observability, and edge responder context plus active handoff/review meta stay visible while display copy becomes runtime-localized.

## Incident Snapshot Timeline Labels - 2026-05-08

- Hierarchy: keep the response timeline as the compact three-row snapshot under the incident surface model; do not promote it into a live incident chronology or audit log.
- Density: preserve short title, copy, and meta rhythm so timeline rows stay scannable beside incident cards and ownership lanes.
- Anti-AI-slop: translate sample timeline text without implying real incident freshness, notification delivery, rollback execution, or completed incident adapters.
- Operator workflow clarity: timeline rows remain static adapter-boundary context until incident response workflow lands.
- Context visibility: mitigation, replay, escalation, alert evidence, trace/log handoff, and incident meta labels stay visible while row copy becomes runtime-localized.

## Incident Snapshot Row Labels - 2026-05-08

- Hierarchy: keep incident cards as compact snapshot rows under the incident surface model; do not introduce a live incident table, timeline expansion, or notification workflow.
- Density: preserve title, service/owner copy, severity/blast-radius eyebrow, and opened-at meta rhythm without adding new status chips.
- Anti-AI-slop: translate sample incident titles and row copy without implying real incident freshness, alert routing, or notification delivery.
- Operator workflow clarity: incident rows remain static snapshot context until later workflow adapters land.
- Context visibility: incident ids, severity, stage, opened-at timestamps, service, owner, and blast-radius evidence stay stable while display labels become runtime-localized.

## Incident Snapshot Tag Labels - 2026-05-08

- Hierarchy: keep incident tags as compact domain context for the shared Signals fact, not as a new incident taxonomy strip or notification workflow panel.
- Density: preserve the existing Signals count rhythm so the incident entry remains aligned with other cold workbench entries.
- Anti-AI-slop: translate tag labels without implying live incident ownership, notification routing, or response automation has landed.
- Operator workflow clarity: tags stay high-level snapshot context; adapter and notification workflow truth remains explicit in later milestones.
- Context visibility: workspace, focus, entry mode, Signals count, and incident tag data stay stable while tag copy becomes runtime-localized.

## Incident Snapshot Metric Labels - 2026-05-08

- Hierarchy: keep incident snapshot metrics as the compact count row owned by the incident domain model, without adding a new incident dashboard or status summary.
- Density: preserve the four short metric labels and current count rhythm so they remain scan-friendly beside incident, timeline, and ownership rows.
- Anti-AI-slop: translate labels without implying live incident adapters, fake incident freshness, or completed notification/ownership workflow.
- Operator workflow clarity: metric labels remain snapshot display copy under the incident adapter boundary; real closure, routing, and notification workflow still belongs to later milestones.
- Context visibility: open count, critical count, mitigating count, and ownership queue count stay visible while display labels become runtime-localized.

## Safe Automation Surface Tag Labels - 2026-05-08

- Hierarchy: keep automation tags as domain context for the existing Signals fact, not as a new badge row or action taxonomy panel.
- Density: preserve the compact Signals count rhythm so the actions entry stays aligned with other workbench facts.
- Anti-AI-slop: translate tag labels without implying live automation domains, execution readiness, or SaaS-style packaging.
- Operator workflow clarity: tags remain high-level page context only; adapter boundary and suggested-action caveats continue to carry execution truth.
- Context visibility: workspace, focus, entry mode, Signals count, and tag data stay stable while tag copy becomes runtime-localized.

## Safe Automation Snapshot Title Boundary - 2026-05-08

- Hierarchy: keep the automation surface title as the compact domain-model header consumed by the existing action control plane; do not add a second hero, approval dashboard, or live execution desk.
- Density: preserve the current facts, tags, catalog cards, run history, approval rows, checklist, and handoff rows without adding summary rails or decorative automation copy.
- Anti-AI-slop: localize the title without implying live execution adapters, real approval routing, workflow automation, or self-service actions have landed.
- Operator workflow clarity: the title remains snapshot display copy under the adapter boundary while real safe automation workflows stay in later milestones.
- Context visibility: title, focus, tags, metrics, catalog, runs, approvals, adapter-boundary caveat, checklist, and next hops stay stable while the remaining source-local title becomes runtime-localized.

## Safe Automation Checklist Meta Labels - 2026-05-08

- Hierarchy: keep checklist meta as compact status text on the existing action-catalog readiness checklist, not as execution readiness or a new approval tracker.
- Density: preserve the three-row checklist and short meta rhythm beside title/copy rows without adding badges, counters, or helper rails.
- Anti-AI-slop: translate sample meta labels without implying live execution adapters, completed workflow automation, or real context continuity.
- Operator workflow clarity: meta stays static adapter-boundary display copy until automation catalog, run history, and approval adapters land.
- Context visibility: entry ready, adapters next, and context continuity reserved states remain visible while display labels become runtime-localized.

## Safe Automation Snapshot Catalog Recency Labels - 2026-05-08

- Hierarchy: keep catalog card recency inside the existing risk/last-run/snapshot meta line, not as a new timeline or execution-history panel.
- Density: preserve the short three-part meta rhythm so catalog cards remain compact beside run and approval snapshots.
- Anti-AI-slop: translate the sample recency labels without implying live adapter freshness, execution telemetry, SLA age, or real automation state.
- Operator workflow clarity: recency remains static snapshot display copy under the adapter boundary, separate from real run timestamps and approval state.
- Context visibility: action ids, risk levels, posture, snapshot marker, and adapter caveat stay stable while visible last-run copy becomes locale-owned.

## Safe Automation Snapshot Approval Labels - 2026-05-08

- Hierarchy: keep approval summary, owner, evidence, status, id, and snapshot marker in the existing compact approval rows, without adding a live-approval rail or execution-adapter claim.
- Density: preserve one-line approval copy and meta rhythm so pending and approved samples remain scannable beside catalog and run history.
- Anti-AI-slop: avoid hardcoded English approval examples, fake approval truth, invented escalation state, or copied incident-workflow language while moving only display labels behind runtime messages.
- Operator workflow clarity: localized approval rows must remain explicitly sample snapshot data under the adapter boundary, not workflow records from a live approval adapter.
- Context visibility: approval ids, status enums, snapshot state, adapter caveat, and suggested-action handoffs stay stable while visible approval copy becomes locale-owned.

## Safe Automation Adapter Roadmap Labels - 2026-05-08

- Hierarchy: keep the adapter-boundary roadmap chips under the existing execution-boundary copy, not as a new action catalog or workflow section.
- Density: preserve the current compact chip row and avoid adding helper rails, status blocks, or extra approval controls.
- Anti-AI-slop: translate the roadmap-domain labels without pretending the automation workflow/app-builder/script adapters are live.
- Operator workflow clarity: the panel must still read as an explicit adapter boundary with alert-context suggestions as handoff-only.
- Context visibility: raw adapter ids can remain model/governance data, but visible chips should use runtime labels so operators are not shown implementation slugs.

## Safe Automation Snapshot Metric Labels - 2026-05-08

- Hierarchy: keep the action-domain snapshot metric row as compact summary metadata for the existing automation surface.
- Density: preserve the four short metric labels without adding new charts, totals, readiness widgets, or execution status claims.
- Anti-AI-slop: externalize metric labels while keeping catalog/runs/approvals explicitly marked as sample snapshots until adapters land.
- Operator workflow clarity: metric labels should be translated display copy; counts still come from the static snapshot data and do not imply live execution state.
- Context visibility: risk, approval, catalog, and recent-run counts stay visible as snapshot context while runtime labels avoid hardcoded English in the model.

## Bulletin Center Tab Navigation Aria Copy Boundary - 2026-05-07

- Hierarchy: keep bulletin tabs directly above the metrics desk inside the existing bulletin center panel.
- Density: preserve the current compact tab strip and toolbar layout without adding secondary nav, helper text, or summary rails.
- Anti-AI-slop: do not invent bulletin health, delivery status, or copied status-page navigation while moving only the tab-strip accessibility label behind runtime messages.
- Operator workflow clarity: tab selection, selected bulletin id, refresh countdown, metrics reload, and delete/edit actions remain unchanged.
- Context visibility: the tab strip continues to expose the current bulletin list context to assistive navigation without changing visible row or metrics content.

## Bulletin Center Surface Helper Regression Boundary - 2026-05-09

- Hierarchy: keep the bulletin fact strip, toolbar, board tabs, metrics table, manage dialog, and delete flows in their current positions; only align the component regression with shared zh-CN helper copy.
- Density: preserve the compact list-and-metrics operations layout without adding status summaries, helper rails, nested cards, or extra board navigation.
- Anti-AI-slop: do not invent bulletin health, delivery readiness, monitor reachability, metrics freshness, or dashboard availability while replacing English default test copy.
- Operator workflow clarity: refresh, new-board creation, tab navigation, selected-board evidence, and metrics reload should resolve through the same runtime/helper catalog operators see.
- Context visibility: board names, active selection, metrics table handoff, dialog wiring, batch delete controls, and reload callback behavior remain unchanged.

## Bulletin Center Row Fallback Boundary - 2026-05-09

- Hierarchy: keep bulletin list rows, selected-bulletin summary, metrics table, toolbar actions, and delete modal in the existing bulletin center surface.
- Density: preserve terse inline fallbacks without adding status cards, missing-field banners, or secondary evidence rails.
- Anti-AI-slop: do not invent bulletin app names, creators, monitor ownership, delivery health, or status evidence while moving absent facts into the shared fallback.
- Operator workflow clarity: payload-provided bulletin names, apps, creators, monitor ids, and metric JSON remain authoritative; only blank row/current facts use localized fallback copy.
- Context visibility: refresh, create/edit/delete actions, selected-bulletin context, metrics table, dialog state, and controller-backed data remain unchanged.

## Alert Notice Receiver Webhook Auth Option Copy Boundary - 2026-05-07

- Hierarchy: keep webhook auth options inside the existing aligned receiver form row for `hookAuthType`.
- Density: preserve the compact native option list and current cold select wrapper without adding helper rails, descriptions, or a second auth selector.
- Anti-AI-slop: avoid invented webhook security behavior, fake token validation, or copied notification SaaS copy while moving only option labels behind runtime messages.
- Operator workflow clarity: None, Basic, and Bearer labels must continue to map to the same submitted values and required-field behavior.
- Context visibility: translated copy can vary, but `hookAuthType` field visibility, option values, placeholder, draft update path, and receiver channel field rules remain unchanged.

## Shared Signal Route Context Copy Boundary - 2026-05-06

- Hierarchy: keep the compact inherited-context rows for entity, monitor, service, environment, trace, time, and source evidence unchanged; this slice only moves shared row labels, source labels, source meta, live/refresh text, and collector/template prefixes behind runtime messages.
- Density: preserve the same short row stack and dot-separated meta rhythm without adding context rails, summary cards, or explanatory onboarding.
- Anti-AI-slop: do not invent source confidence, fake collection health, or cross-signal recommendations while externalizing shared context copy.
- Operator workflow clarity: machine route tokens, trace/span ids, monitor ids, collector/template evidence, time bounds, refresh, live state, and source handoff values must remain readable in every consuming workbench.
- Context visibility: `buildSignalEntityContextRows`, source row construction, and signal handoff URLs remain the shared owner for inherited context labels and meta copy across entity, topology, alert, log, trace, and metrics surfaces.

## Shared Signal Route Context Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep inherited-context rows as the same compact evidence stack across entity, topology, alert, log, trace, and metrics surfaces; changing fallback locale order must not add context rails, side panels, or extra summaries.
- Density: preserve the short label/value/meta row rhythm and dot-separated time/source meta.
- Anti-AI-slop: do not invent source confidence, collection health, handoff recommendations, topology certainty, or monitor readiness while correcting fallback order.
- Operator workflow clarity: default context copy resolves from runtime messages with an English fallback when no caller locale is available; route tokens, trace/span ids, monitor ids, collector/template values, time bounds, refresh, live state, and source handoff values stay machine-owned.
- Context visibility: `buildSignalEntityContextRows`, `buildSourceContextRow`, source meta mapping, and signal handoff URLs remain the shared owner for all inherited context rows.

## Topology Surface Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep topology product identity, source chips, view-mode chips, selected-edge evidence, and inherited fault-context rows in the existing dense graph support model; fallback ordering must not add explanation panels or new topology modes.
- Density: preserve compact label/copy pairs for sources and views, short evidence rows, and the existing selected-edge evidence payload.
- Anti-AI-slop: do not invent dependency confidence, blast radius, auto-discovery state, RCA readiness, or fake graph health while correcting fallback order.
- Operator workflow clarity: default topology model copy should resolve from runtime messages with an English fallback when no caller locale is available; graph ids, entity ids, source kinds, edge ids, route params, and handoff URLs stay machine-owned.
- Context visibility: fault context, selected-edge evidence, source filtering, view filtering, and signal/entity/alert handoffs remain visible through the existing `buildTopologyServiceMap` data contract.

## Entity Detail View-Model Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep entity facts, overview rows, related signals, health model, next actions, handoff links, inherited context, alerts, relationships, collection source, and attribution rows in the existing detail-page data contract.
- Density: preserve compact title/copy/meta rows and the current lightweight health model; fallback ordering must not add summary rails, status blocks, or duplicated context.
- Anti-AI-slop: do not invent health, ownership, monitor readiness, attribution quality, or relationship certainty while correcting fallback order.
- Operator workflow clarity: default entity-detail view-model copy should resolve from runtime messages with an English fallback when no caller translator is available; ids, statuses, route params, alert labels, identity keys, monitor/template values, and handoff URLs stay machine-owned.
- Context visibility: entity, service, environment, time, monitor, trace/span, source, collector, template, alert, relationship, and attribution evidence remain visible through the existing view-model builders.

## Entity Detail Surface Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep the cold full-width entity detail surface, compact header, count strip, command row, context center, related signal panels, health model, source/attribution panels, delete modal, and route handoff buttons exactly where they are.
- Density: preserve compact copy density and existing title/copy/meta rows; fallback ordering must not add a side rail, onboarding prose, summary cards, or extra status decoration.
- Anti-AI-slop: do not invent entity health, evidence counts, ownership, attribution state, monitor readiness, or alert closure state while correcting fallback order.
- Operator workflow clarity: default surface chrome should resolve from runtime messages with an English fallback when no locale provider is present; entity ids, hrefs, route context, metrics counts, alert counts, monitor values, and mutation callbacks stay machine-owned.
- Context visibility: header posture, count strip, inherited time/monitor/source context, action rows, alert/relationship/source evidence, attribution states, and delete confirmation remain visible through the existing `EntityDetailSurface` contract.

## Trace Workbench Route Chrome Copy Boundary - 2026-05-06

- Hierarchy: keep the trace workbench header, query bar, trend band, dense trace table, detail evidence panel, entity context, and cross-signal handoffs in the existing client island; this slice only moves route chrome/status copy behind runtime i18n.
- Density: preserve the compact cold-matte table-first layout, tight action row, small evidence cards, and narrow time rail without adding summary rails, nested cards, or decorative onboarding.
- Anti-AI-slop: do not invent root-cause text, AI explanations, demo spans, fake trace health, or copied external APM navigation while externalizing labels.
- Operator workflow clarity: service/trace/span/status filters, run/reset actions, selected-trace facts, disabled entity/log handoffs, and alert/log/metric/entity/catalog links must remain explicit.
- Context visibility: trace id, span id, service namespace, entity id, environment, time range, source, attribution diagnostics, and current selection context must remain visible through evidence rows and handoff URLs.
- Settled-cache boundary update: trace manage route remounts may reuse just-settled overview/list resources briefly while preserving trace/span/service/error filters, waterfall evidence, selected trace facts, entity context, and log/metric/alert handoffs; do not add freshness chrome, fake trace health, fake span coverage, or copied trace-console wording.

## Topology Route Boundary - 2026-05-05

- Hierarchy: keep the entity-centered topology canvas, relationship source strip, selected-edge evidence, alert-impact handoff, and current-entity signal links in the existing topology surface; do not add another visual shell.
- Density: preserve the compact canvas-plus-evidence-aside posture and small evidence rows, with no new cards, gutters, or decorative status summaries.
- Anti-AI-slop: copy cleanup only externalizes existing evidence language; do not invent fake blast-radius analysis, root-cause claims, or copied service-map chrome.
- Operator workflow clarity: selected-edge evidence must still show collected source, endpoint entities, alert impact, and drilldowns to entity/metrics/logs/traces/alerts without hiding the roadmap boundary.
- Context visibility: entity, service, environment, time, topology view/source, selected edge, trace/span, collector, and template context must continue flowing through topology evidence and handoff links.
- Copy boundary update: keep topology selected-edge source evidence, row labels, alert-impact state, collector labels, roadmap boundary, and alert-impact helper text behind runtime i18n messages while preserving the existing evidence hierarchy and roadmap caveat.
- Source/view copy boundary update: keep topology product identity, relationship source labels/copy, view-mode labels/copy, edge labels, and monitor-template node label behind runtime i18n messages while preserving the source-strip hierarchy, canvas density, and no-fake-analysis operator posture.
- Shared health-affordance copy boundary update: keep the compact node health score, collection-health copy, alert/anomaly meta, and tone behavior unchanged while moving only lightweight health labels behind runtime messages; do not add fake SLO status, readiness scoring, or expanded health panels.

## Entity Detail Route Boundary - 2026-05-04

- Hierarchy: keep the entity profile, evidence summary, related signals, and next actions inside the existing entity detail surface; the server wrapper must not add another visual shell.
- Density: preserve the current compact full-width workbench density and source-strip rhythm, with no new empty gutters or nested cards.
- Anti-AI-slop: route migration is infrastructure only; avoid explanatory product prose or decorative status blocks.
- Operator workflow clarity: refresh, edit, delete confirmation, definition entry, and signal handoff stay in the client island where state and route context are available.
- Context visibility: inherited time, monitor, entity, service, environment, trace, and topology context must continue flowing into the evidence links.
- Cache-key boundary update: entity detail loads should resolve the entity id at the server wrapper and use an explicit resource-derived workbench cache key for `/entities/{id}/detail` plus reload invalidation, preserving profile/evidence hierarchy, inherited route context, refresh/delete flows, and signal handoffs without adding fake health or status panels.
- Settled-cache boundary update: entity detail route remounts can reuse just-settled profile/evidence data briefly, while Refresh continues to bump `reloadNonce` and `router.refresh()`; do not add freshness chrome, fake entity health, fake signal counts, extra navigation rails, or copied service-catalog investigation language.
- Delete-copy boundary update: keep the destructive confirmation as the existing compact cold modal with title, kicker, body, cancel/confirm actions, and entity id evidence; only move the modal copy behind runtime messages without adding approval steps, fake safety scoring, or extra evidence rails.
- Attribution-state copy boundary update: keep the compact attribution badges, ready/review/missing color semantics, row density, and source-template binding visibility unchanged while moving only the badge labels behind runtime messages.
- Header/action copy boundary update: keep the compact entity hero, count strip, refresh/edit/delete command row, and inline operation-error slot unchanged while moving only title fallbacks, dynamic subtitle variants, count labels, and command labels behind runtime messages; do not add fake health summaries, new navigation rails, or decorative investigation prose.
- Panel-copy boundary update: keep the existing two-column detail grid, overview/context/health/alerts/next/related/relationships/source/drilldown panels, and final disposition note unchanged while moving only panel titles and helper copy behind runtime messages; do not add fake SLO health, root-cause text, extra cards, or copied incident-detail IA.
- Fact/context-row copy boundary update: keep the compact profile fact strip and inherited context rows unchanged while moving only fact labels and inherited-context label comparisons behind runtime i18n messages; preserve entity/service/environment/time/source visibility without adding fake navigation, fake health, or explanatory onboarding.
- Overview/status copy boundary update: keep the compact overview row stack and current status semantics unchanged while moving only overview row labels and status fallback labels behind runtime i18n messages; do not add fake health summaries, new state badges, or onboarding copy.
- Related-summary copy boundary update: keep the compact related-signal row stack and metrics/logs/traces evidence counts unchanged while moving only summary titles, count units, and empty states behind runtime i18n messages; do not add fake signal counts, synthetic health, or extra drilldown panels.
- Handoff-row copy boundary update: keep the existing signal/alert/monitor/topology/template handoff row order, URLs, and inherited route context unchanged while moving only row titles and destination labels behind runtime i18n messages; do not add fake navigation, new shortcut panels, or copied APM side rails.
- Health-model copy boundary update: keep the lightweight health score, availability, error-rate, latency, alert, anomaly, and collector evidence rows unchanged while moving only row labels, fallback states, and count templates behind runtime i18n messages; do not introduce SLO authoring, fake health claims, or expanded root-cause panels.
- Next-action/drilldown copy boundary update: keep the server guidance row order, fallback drilldown links, and next/deep entry panel density unchanged while moving only server-action translations, fallback labels, route titles, and route meta behind runtime i18n messages; do not add fake recommendations, AI triage, or new navigation panels.
- Current-alert row copy boundary update: keep the active alert row stack, alert id evidence, label summary meta, and empty alert fallback unchanged while moving only alert row titles, empty-state copy, count meta, and pending fallback copy behind runtime i18n messages; do not add fake incident status, AI triage, or extra closure controls.
- Relationship-row copy boundary update: keep the existing upstream/downstream row stack, relation type evidence, target entity evidence, and empty relationship fallback unchanged while moving only empty-state labels, topology-wait meta, unknown-target fallback, and default relation meta behind runtime i18n messages; do not add fake topology health, impact scoring, or copied service-map analysis.
- Attribution/source-row copy boundary update: keep the source-template binding panel, attribution row states, monitor/identity evidence counts, source labels, and diagnostic missing-part evidence unchanged while moving only row titles, count templates, fallback copy, and diagnostic meta behind runtime i18n messages; do not add fake ownership scoring, fake resource health, or copied catalog governance panels.

## Entity New Route Boundary - 2026-05-04

- Hierarchy: keep telemetry handoff, source/monitor prefill, catalog suggestions, identity/ownership/signal/relation authoring, preview, and save feedback inside the existing entity editor surface; the server wrapper must not add another shell.
- Density: preserve the cold editor's compact field groups and definition preview rhythm, with no new gutters, nested cards, or fake status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative workflow cards, or copied competitor IA.
- Operator workflow clarity: `source` and `monitorId` query-state prefill, catalog suggestions, validation, save, and editor stage state stay in the client island where router and form state are available.
- Context visibility: telemetry/monitor handoff must continue feeding the new-draft loader so entity identity and monitor bind context are visible before save.
- Cache-key boundary update: entity new loads should use an explicit workbench cache key derived from the catalog suggestions endpoint and telemetry seed source/monitor context, preserving prefilled identity/monitor-bind visibility, editor validation, and save feedback without adding decorative authoring summaries or fake status panels.
- Settled-cache boundary update: new-entity route remounts can reuse just-settled catalog suggestions and seed draft context briefly while preserving `source`/`monitorId` prefill, identity/monitor-bind visibility, validation, save flow, and editor stage state; do not add freshness chrome, fake entity readiness, fake catalog coverage, extra navigation rails, or copied service-catalog authoring language.
- Editor-copy boundary update: keep the compact stage strip, route-tab affordance, submit state, and telemetry/monitor seed visibility unchanged while moving only stage/tab/action copy behind runtime messages; do not add helper prose, fake completion scoring, or extra summary rails.
- Editor-attribution copy boundary update: keep the compact telemetry attribution check, ready/review/missing state colors, identity/monitor/owner/system evidence rows, and discovery return link unchanged while moving only row titles, count templates, fallback meta, missing copy, and state labels behind runtime messages; do not add fake readiness scoring or extra onboarding panels.
- Editor-shell copy boundary update: keep the compact header, entity type grid, entry-source pills, preview toggle, definition footer, and cold field rhythm unchanged while moving only title/subtitle, type/source labels, preview/footer copy, and summary badges behind runtime messages; do not add onboarding prose, extra cards, or fake metadata health.
- Editor-field copy boundary update: keep the active-stage body, basic/ownership/signal/relation field rhythm, contact/link editors, JSON object rows, and definition preview unchanged while moving only field labels, placeholders, add labels, and preview aria copy behind runtime messages; do not add helper prose, new validation flows, or fake evidence fields.
- Editor-telemetry guide copy boundary update: keep telemetry handoff, monitor/identity evidence chips, attribution-check density, and stage completion posture unchanged while moving only telemetry handoff title/copy/counts, attribution-check title, and stage guide fallback copy behind runtime messages; do not add fake telemetry status, onboarding rails, or extra discovery panels.
- Editor-placeholder copy boundary update: keep the basic active-stage grid, field order, compact label/input rhythm, and telemetry-seeded draft behavior unchanged while moving only remaining example placeholders behind runtime messages; do not add helper prose, validation hints, fake readiness scoring, or extra onboarding rails.

## Entity Edit Route Boundary - 2026-05-04

- Hierarchy: keep loaded entity detail, catalog suggestions, edit validation, ownership/identity/relation authoring, definition preview, and save feedback inside the existing entity editor surface; the server wrapper must not add another shell.
- Density: preserve the full editor's compact stage posture and complete-context relation state, with no new gutters, nested cards, or fake status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative edit summaries, or copied competitor IA.
- Operator workflow clarity: entity-id params, detail fallback, catalog fallback, edit mode, save, and editor stage state stay in the client island where router and form state are available.
- Context visibility: the requested entity id and loaded entity context must remain visible to the shared editor surface and edit API path.
- Loading-copy i18n update: keep entity edit loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake edit readiness, catalog coverage placeholders, ownership scorecards, or extra editor navigation chrome.
- Cache-key boundary update: entity edit loads should resolve entity id in the server wrapper and use an explicit resource-derived workbench cache key for `/entities/{id}` plus catalog suggestions, preserving loaded entity context, fallback behavior, relation state, validation, and save feedback without adding decorative edit summaries or fake status panels.
- Settled-cache boundary update: entity edit route remounts can reuse just-settled entity detail and catalog suggestion data briefly while preserving entity id, loaded context, fallback draft behavior, edit validation, save feedback, and editor stage state; do not add freshness chrome, fake edit readiness, fake catalog coverage, extra navigation rails, or copied resource-editor language.
- Editor-copy boundary update: keep the complete-context stage posture, route-tab affordance, submit state, and entity-id visibility unchanged while moving only stage/tab/action copy behind runtime messages; do not add helper prose, fake edit-readiness scoring, or extra summary rails.
- Editor-attribution copy boundary update: keep the compact telemetry attribution check, ready/review/missing state colors, identity/monitor/owner/system evidence rows, and discovery return link unchanged while moving only row titles, count templates, fallback meta, missing copy, and state labels behind runtime messages; do not add fake readiness scoring or extra ownership panels.
- Editor-shell copy boundary update: keep the compact header, entity type grid, entry-source pills, preview toggle, definition footer, definition handoff, and cold field rhythm unchanged while moving only title/subtitle, type/source labels, preview/footer copy, and summary badges behind runtime messages; do not add edit-readiness prose, extra cards, or fake metadata health.
- Editor-field copy boundary update: keep the complete-context active-stage body, basic/ownership/signal/relation field rhythm, contact/link editors, JSON object rows, and definition preview unchanged while moving only field labels, placeholders, add labels, and preview aria copy behind runtime messages; do not add edit-readiness prose, new validation flows, or fake evidence fields.
- Editor-telemetry guide copy boundary update: keep telemetry handoff, monitor/identity evidence chips, attribution-check density, and complete-context stage posture unchanged while moving only telemetry handoff title/copy/counts, attribution-check title, and stage guide fallback copy behind runtime messages; do not add fake telemetry status, edit-readiness rails, or extra discovery panels.
- Editor-placeholder copy boundary update: keep the basic active-stage grid, field order, compact label/input rhythm, and complete-context draft behavior unchanged while moving only remaining example placeholders behind runtime messages; do not add helper prose, validation hints, fake readiness scoring, or extra edit-readiness rails.

## Entity Definition Route Boundary - 2026-05-04

- Hierarchy: keep definition loading, code editing, template/activity context, validation feedback, and save/delete actions inside the existing definition workspace surface; the server wrapper must not add another shell.
- Density: preserve the cold definition editor's compact full-width workbench rhythm, with no extra gutters, nested cards, or fake status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative definition summaries, or copied competitor IA.
- Operator workflow clarity: entity-id params, workspace data loading, format state, definition update, and recoverable load messages stay in the client island where route and form state are available.
- Context visibility: the requested entity id, templates, activities, and load diagnostics must remain visible to the definition workspace and update API path.
- Loading-copy helper update: keep entity definition loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake parser readiness, template-health counters, entity-summary placeholders, or explanatory authoring panels.
- Cache-key boundary update: entity definition loads should resolve the entity id in the server wrapper and use an explicit resource-derived workbench cache key for the definition, activity, and template endpoints, preserving editor density, recoverable fallback messages, save/delete feedback, and context visibility without adding decorative definition summaries or fake health panels.
- Settled-cache boundary update: entity definition route remounts can reuse just-settled definition, template, and activity data briefly while preserving entity id, YAML format state, recoverable load messages, editor density, preview/save actions, and update API context; do not add freshness chrome, fake parser health, fake definition readiness, extra navigation rails, or copied template-authoring language.
- Workspace-shell copy boundary update: preserve the definition loading, code editor, template/activity context, preview/save actions, recoverable feedback, and compact context-panel density while moving only shell/action copy behind runtime messages; do not add decorative summaries, fake parser health, or extra guidance rails.

## Entity Import Route Boundary - 2026-05-04

- Hierarchy: keep bundle import editing, template guidance, activity context, preview/create actions, and validation feedback inside the existing import surface; the server wrapper must not add another shell.
- Density: preserve the cold import workspace's compact full-width editor and context-panel rhythm, with no new gutters, nested cards, or fake status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative import summaries, or copied competitor IA.
- Operator workflow clarity: template/activity loading, starter draft state, format switching, parse/create actions, and recoverable helper-endpoint fallbacks stay in the client island where form state is available.
- Context visibility: templates, recent activities, import diagnostics, and batch results must remain visible to the shared import and definition workspace surfaces.
- Loading-copy helper update: keep entity import loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake parser health, import-readiness counters, catalog-status placeholders, or explanatory onboarding panels.
- Cache-key boundary update: entity import loads should use an explicit resource-derived workbench cache key for the shared template and activity endpoints, preserving starter draft state, preview/create actions, helper-endpoint fallback context, and batch result visibility without adding decorative import summaries or fake catalog status.
- Settled-cache boundary update: import route remounts can reuse just-settled template and activity data briefly while preserving starter draft state, format switching, parse/create actions, helper-endpoint fallback context, and batch result visibility; do not add freshness chrome, fake parser health, fake import readiness, extra navigation rails, or copied catalog-import language.
- Workspace-shell copy boundary update: preserve the starter draft, format selector, preview/create actions, attribution preview, validation feedback, and minimal import context-panel density while moving only import title/subtitle/helper copy behind runtime messages; do not add decorative import summaries, fake parser health, or competitor-style onboarding rails.

## Entity List Route Boundary - 2026-05-04

- Hierarchy: keep catalog search, entity counts, table rows, creation/import/discovery entries, and per-row evidence actions inside the existing list surface; the server wrapper must not add another visual shell.
- Density: preserve the compact full-width entity catalog posture, with no new gutters, nested cards, rail panels, or fake status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative summaries, or copied competitor IA.
- Operator workflow clarity: query-state filters, refresh/reset actions, page loading, and entity navigation stay in the client island where router-derived state is available.
- Context visibility: entity ids, health affordances, monitor counts, alert counts, relation counts, and list diagnostics must remain visible to the current surface and handoff links.
- Loading-copy helper update: keep entity list loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake catalog counts, entity-health placeholders, onboarding copy, or extra navigation rails.
- Cache-key boundary update: entity list loads should use an explicit query-derived workbench cache key that preserves catalog hierarchy, dense row evidence, filter clarity, creation/import/discovery entries, and context visibility without adding UI layers or fake entity status.
- Health-affordance copy boundary update: keep the compact table health score, collection-health copy, alert/anomaly meta, and tone behavior unchanged while moving only lightweight health labels behind runtime messages; do not add fake SLO status, readiness scoring, or expanded health panels.

## Entity Discovery Route Boundary - 2026-05-04

- Hierarchy: keep telemetry discovery search, candidate attribution, policy strip, source chips, and create/import handoff actions inside the existing discovery surface; the server wrapper must not add another shell.
- Density: preserve the compact full-width discovery console and dense table posture, with no new gutters, rail panels, nested cards, or fake guidance blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative workflow summaries, or copied competitor IA.
- Operator workflow clarity: discovery loading, monitor search, selected scope, candidate review, and entity draft handoff stay in the client island where client state is available.
- Context visibility: presets, recent activities, catalog owners/systems/environments, attribution state, and create-ready diagnostics must remain visible to the existing discovery surface and handoff links.
- Loading-copy boundary update: definition, import, and discovery loading states keep the same compact entity workspace hierarchy, density, operator flow, and diagnostics while their visible loading copy moves behind runtime i18n keys; do not add loaders, shells, fake entity health, or explanatory product prose.
- Loading-copy helper update: keep telemetry discovery loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake candidate counts, catalog-health placeholders, service-map hints, or explanatory discovery panels.
- Cache-key boundary update: entity discovery loads should use an explicit resource-derived workbench cache key for governance preset, governance activity, and catalog suggestion endpoints, preserving monitor search state, candidate attribution, selected scope, and entity draft handoff visibility without adding fake guidance/status panels.
- Settled-cache boundary update: discovery route remounts can reuse just-settled governance preset, activity, and catalog suggestion data briefly while preserving telemetry search, candidate attribution, selected scope, and entity draft handoff visibility; do not add freshness chrome, fake discovery readiness, fake catalog health, extra navigation rails, or copied service-catalog language.
- Workspace-shell copy boundary update: preserve the telemetry search, candidate table, policy strip, compact count strip, source chips, create/import/catalog handoffs, and attribution evidence density while moving only discovery shell/table/policy copy behind runtime messages; do not add fake discovery health, onboarding rails, decorative summaries, or competitor-style guidance.

## Monitor Editor Route Boundary - 2026-05-04

- Hierarchy: keep app/template context, monitor identity fields, scrape/schedule/collector settings, label/annotation editing, detect/save actions, and return context inside the existing monitor editor surface; the route wrappers must not add another shell.
- Density: preserve the compact authoring surface and shared ops-token rhythm, with no new gutters, nested cards, rail panels, or fake status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative setup summaries, or copied competitor IA.
- Operator workflow clarity: new/edit params, query-state return context, draft loading, scrape draft refresh, validation, create/update, detect, and return navigation stay in the client islands where router and form state are available.
- Context visibility: app, monitor id, entity handoff, labels, pagination return state, collectors, param definitions, scrape params, and Grafana dashboard context must remain visible to the editor surface and save path.
- Cache-key boundary update: monitor editor loads should use explicit resource-derived workbench cache keys for collector/app-param resources on new routes and monitor detail/collector resources on edit routes, preserving app/template context, return navigation, validation, detect/save flows, and editor density without adding decorative setup summaries or fake monitor status.
- Settled-cache boundary update: new-monitor route remounts can reuse just-settled collector and app-param resources briefly while preserving app/template context, entity return handoff, validation, detect/save flows, scrape refresh, and compact editor density; do not add freshness chrome, fake monitor readiness, fake collector coverage, extra navigation rails, or copied setup-wizard language.
- Settled-cache boundary update: edit-monitor route remounts can reuse just-settled monitor detail and collector resources briefly while preserving monitor identity, app/template context, entity return handoff, validation, detect/update flows, scrape refresh, and compact editor density; do not add freshness chrome, fake monitor readiness, fake collector coverage, extra navigation rails, or copied setup-wizard language.
- Metadata fallback update: preserve the compact shell facts, payload review rows, detect/save/cancel actions, and app/scrape/name/collector visibility while moving only absent app/name/collector markers into the shared localized fallback; do not add wizard prose, fake readiness, or extra summary rails.

## Monitor Detail Cache-Key Boundary - 2026-05-06

- Hierarchy: keep realtime metrics, history charts, favorites, Grafana fallback, compact console tabs, and signal handoff links inside the existing monitor detail client island; this slice only resolves the route id at the server boundary and keys the first-screen loader.
- Density: preserve the current dense monitor console, chart/table rhythm, and compact toolbar without adding summary cards, rails, or decorative performance panels.
- Anti-AI-slop: avoid fake monitor health, fake Grafana readiness, copied resource-detail IA, or product prose while deriving the cache key from real monitor detail, Grafana, and favorite-metric resources.
- Operator workflow clarity: refresh cadence, tab fallback, history time context, favorite edits, Grafana delete, and signal handoffs stay unchanged while the initial bundle load can be deduped safely.
- Context visibility: monitor id, detail endpoint, Grafana endpoint, favorite-metric endpoint, time context, entity return, and signal links remain visible to source and route contracts.

## Monitor Manage Route Boundary - 2026-05-04

- Hierarchy: keep search filters, list rows, selected monitor rail, batch controls, import/export, delete confirmation, and entity return context inside the existing monitor manage workbench; the route wrapper must not add another shell.
- Density: preserve the compact monitor inventory table and right-rail operation density, with no new gutters, nested cards, rail panels, or fake status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative resource summaries, or copied competitor IA.
- Operator workflow clarity: query-state canonicalization, entity down-first fallback, selection, pagination, import/export, enable/pause/copy/delete, and detail/edit/new handoffs stay in the client island where router, file input, and modal state are available.
- Context visibility: app, labels, status, page state, selected monitor, entity id/name, safe return URL, and monitor navigation context must remain visible to the workbench and route builders.
- Cache-key boundary update: list loads should use an explicit query-derived workbench cache key that preserves entity down-first fallback semantics, table density, batch controls, import/export, and return-context visibility without adding UI layers.
- Copy boundary update: keep the selected-monitor delete confirmation title, body, confirm action, cancel action, and selected-count evidence behind runtime i18n keys while preserving the cold modal density, batch-selection context, and entity/alert cleanup warning; do not add fake impact analysis or copied confirmation prose.

## Setting Status Route Boundary - 2026-05-04

- Hierarchy: keep organization profile, component list, incident list, validation, public status link, and admin controls inside the existing status setting surface; the route wrapper must not add another shell.
- Density: preserve the compact full-width admin list and tab/table posture, with no new gutters, nested cards, summary rails, or fake uptime/status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative health claims, or copied competitor status-page IA.
- Operator workflow clarity: organization editing, component create/edit/delete, incident search/pagination/create/edit/delete, refresh tick, and save feedback stay in the client island where local form state is available.
- Context visibility: organization id/name, component health, incident state, public status URL, validation feedback, and localized save/delete messages must remain visible to the existing surface and controller calls.
- Cache-key boundary update: status setting loads should use an explicit query-derived workbench cache key that preserves organization/component/incident editing, incident search and pagination context, save/delete refresh invalidation, and public status link visibility without adding summary rails, fake uptime claims, or decorative health panels.
- Copy boundary update: keep the organization profile form, component and incident tables, public status link, empty table state, and delete confirmation modal intact while moving remaining surface-local copy behind runtime i18n keys; do not add uptime/SLA claims, decorative health summaries, or copied status-page SaaS language.

## Setting Labels Route Boundary - 2026-05-05

- Hierarchy: keep label search, full-width list, copy/edit/delete actions, create/edit dialog, and save/delete feedback inside the existing label management surface; the route wrapper must not add another shell.
- Density: preserve the compact cold admin-list posture, with no summary rail, nested cards, or decorative label overview blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake label health/status claims, or copied tag-management IA.
- Operator workflow clarity: search query state, refresh version, draft modal state, add/edit mode, clipboard copy, delete, and save calls stay in the client island where browser and mutation state are available.
- Context visibility: label name/value/type/description, current search, modal add/edit mode, and localized loading copy must remain visible to the existing surface and controller calls.
- Cache-key boundary update: label list loads should use an explicit query-derived workbench cache key that preserves search clarity, refresh invalidation, dense admin-list posture, dialog state, and mutation feedback without adding summary rails, fake health, or decorative tag overviews.
- Copy boundary update: keep the same hierarchy, density, label type chips, table headers, empty state, and create/edit dialog context while moving the remaining surface-local copy behind runtime i18n keys; do not add tag-cloud summaries, fake governance status, or marketplace-style language.
- Loading-copy helper update: keep label loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add tag-cloud placeholders, fake label health, governance status, or decorative loading panels.

## Setting Plugins Route Boundary - 2026-05-05

- Hierarchy: keep plugin search, full-width plugin table, selection, enable/delete actions, upload/edit dialog, and save feedback inside the existing plugin management surface; the route wrapper must not add another shell.
- Density: preserve the compact cold admin-list posture, with no summary rail, nested cards, decorative plugin overview, or fake marketplace/status block.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake plugin health claims, fake extension domains, or copied plugin-marketplace IA.
- Operator workflow clarity: search query state, refresh version, selected ids, upload draft modal state, enable toggle, delete, and save calls stay in the client island where browser and mutation state are available.
- Context visibility: plugin name, enable status, item type/count, selected ids, current search, draft upload fields, and localized loading copy must remain visible to the existing surface and controller calls.
- Cache-key boundary update: plugin list loads should use an explicit query-derived workbench cache key that preserves search clarity, refresh invalidation, selected ids, upload/edit dialog state, enable/delete feedback, and dense admin-list context without adding marketplace rails or fake plugin health.
- Copy boundary update: keep the same hierarchy, density, selected-count affordance, enable-state labels, params column, and empty table state while moving the remaining surface-local copy behind runtime i18n keys; do not add plugin marketplace language, fake health, or extension-domain prose.
- Settled-cache boundary update: keep plugin search, dense full-width table, selected ids, upload/edit dialog, enable/delete actions, and save/delete feedback inside the existing plugin management surface; short route-remount reuse must not add freshness chrome, marketplace rails, fake extension health, or plugin-domain summary panels. Search still invalidates through the query-derived plugin URL, and Refresh, enable, delete, selected delete, and save continue to bump `reloadVersion`.
- Loading-copy helper update: keep plugin loading feedback as runtime-owned copy attached to the existing `ClientWorkbench` route island; do not add loading skeletons, marketplace pitch text, fake plugin health, or extension readiness claims.

## Setting Collector Route Boundary - 2026-05-05

- Hierarchy: keep collector search, dense cluster table, refresh/deploy/online/offline/delete controls, row operations, and collector health evidence inside the existing collector management surface; the route wrapper must not add another shell.
- Density: preserve the compact cold admin-list posture, with no summary rail, nested cards, decorative cluster overview, or fake collector health/status block.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake collector capacity claims, fake topology entries, or copied cluster-console IA.
- Operator workflow clarity: search query state, refresh query bump, batch controls, row controls, and formatted timestamps stay in the client island where browser and mutation state are available.
- Context visibility: collector name, ip, mode, version, status, pinned/dispatched monitor counts, current search, and localized loading copy must remain visible to the existing surface and controller calls.
- Cache-key boundary update: collector list loads should use an explicit query-derived workbench cache key that preserves search clarity, refresh invalidation, dense cluster rows, batch controls, row operations, and collector health evidence without adding summary rails, fake capacity, or topology decoration.
- Copy boundary update: keep the same hierarchy, density, cluster health strip, row operation buttons, collector status/mode labels, and empty table state while moving remaining surface-local copy behind runtime i18n keys; do not add fake capacity claims, topology shortcuts, or copied cluster-console prose.
- Loading-copy helper update: keep collector loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add decorative cluster placeholders, fake collector health, capacity claims, or topology entries.

## Setting Define Route Boundary - 2026-05-05

- Hierarchy: keep monitoring-template search, dense definition list, YAML editor, preview panel, datasource status, and create/edit/preview/save/delete actions inside the existing definition surface; the route wrapper must not add another shell.
- Density: preserve the compact cold admin-list and editor posture, with no summary rail, nested cards, decorative template overview, or fake marketplace/status block.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake template health claims, fake domain entries, or copied template-marketplace IA.
- Operator workflow clarity: search query state, selected definition, editor draft, dark-mode toggle, preview result, save state, and mutation feedback stay in the client island where browser and form state are available.
- Context visibility: definition name/type/datasource/expression, datasource status, current YAML label, current search, preview diagnostics, and localized loading copy must remain visible to the existing surface and controller calls.
- Cache-key boundary update: definition list loads should use an explicit query-derived workbench cache key that preserves template search, selected definition context, YAML editor state, datasource status, preview diagnostics, and save/delete feedback without adding summary rails, marketplace framing, or fake template health.
- Copy boundary update: keep the dense definition list, YAML editor, dark-mode toggle, preview panel, datasource status, row type/status/meta, and empty/empty-selected states intact while moving remaining surface and view-model copy behind runtime i18n keys; do not add template marketplace prose, fake definition health, or copied SaaS rule-builder language.
- Loading-copy helper update: keep definition-center loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add marketplace placeholders, fake template health, generated domain entries, or decorative rule-builder loading panels.

## Setting System Config Route Boundary - 2026-05-05

- Hierarchy: keep locale, timezone, theme selectors, validation, save feedback, and theme/locale side effects inside the existing system config form; the route wrapper must not add another settings shell.
- Density: preserve the compact full-width cold settings form, with no summary rail, nested cards, decorative configuration overview, or fake system-health block.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake runtime status, fake deployment domains, or copied admin-console IA.
- Operator workflow clarity: draft state, save state, locale setter, theme application, and reload behavior stay in the client island where browser and mutation state are available.
- Context visibility: current locale, timezone options, theme options, save feedback, and localized field labels must remain visible to the existing settings form and controller calls.
- Cache-key boundary update: system config loads should use an explicit resource-derived workbench cache key for the system config and timezone endpoints, preserving selector hierarchy, compact form density, save feedback, locale/theme side effects, and context visibility without adding summary rails or fake runtime-health panels.
- Fact fallback boundary update: keep locale, timezone, theme selectors and save feedback intact while moving only missing fact values into the shared localized fallback; unknown payload values remain visible instead of being hidden or invented.
- Form label copy update: keep locale, timezone, theme, locale-option, theme-option, and submit copy runtime-owned inside the existing compact selector form; do not add runtime health claims, deployment setup prose, summary rails, or copied admin-console IA.

## Setting Object Store Route Boundary - 2026-05-05

- Hierarchy: keep provider selection, OBS credential fields, validation, save feedback, and storage-controller calls inside the existing object-store settings form; the route wrapper must not add another settings shell.
- Density: preserve the compact full-width cold settings form, with no summary rail, nested cards, decorative storage overview, or fake capacity/health block.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake bucket status, fake archive metrics, fake cloud domains, or copied cloud-console IA.
- Operator workflow clarity: draft state, save state, secret fields, validation, and mutation feedback stay in the client island where browser and form state are available.
- Context visibility: provider, endpoint, bucket, save path, credential placeholders, validation feedback, localized labels, and load diagnostics must remain visible to the existing settings form and controller calls.
- Cache-key boundary update: object-store loads should use an explicit resource-derived workbench cache key for the `/config/oss` endpoint, preserving provider/credential context, compact form density, mutation feedback, and diagnostics without adding summary rails, fake capacity panels, or invented bucket health.
- Copy boundary update: keep object-store workspace facts, provider type, bucket, and endpoint evidence behind runtime i18n keys while preserving the compact settings form and validation posture; do not add fake capacity, archive-health, or copied cloud-console prose.
- Fact fallback boundary update: keep absent provider type, bucket, and endpoint as terse localized empty facts in the existing evidence list; do not infer storage health, object capacity, archive status, or cloud-console setup progress.
- Provider option copy update: keep the existing DATABASE/FILE/OBS values as backend payloads while provider option labels are runtime-owned localized copy in the compact select; do not add cloud-console setup guidance, fake capacity, or archive-health claims.
- OBS placeholder copy update: keep access key, secret key, bucket, endpoint, and save path placeholders attached to the existing OBS credential fields and owned by runtime i18n; do not add cloud setup walkthroughs, fake archival readiness, or provider-health claims.
- Form label copy update: keep the object-store page title, provider label, OBS field labels, and submit action as runtime-owned settings copy while preserving the compact form; do not add capacity summaries, archive policy chrome, or cloud-console onboarding prose.
- Loading-copy helper update: keep object-store loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add bucket-health placeholders, capacity summaries, archive-policy chrome, or cloud-console loading panels.

## Setting Message Server Route Boundary - 2026-05-05

- Hierarchy: keep email and SMS summary rows, provider-specific dialog fields, validation, save feedback, and message-server controller calls inside the existing message-server settings surface; the route wrapper must not add another settings shell.
- Density: preserve the compact full-width cold summary list and focused dialogs, with no summary rail, nested cards, decorative notification overview, or fake delivery health block.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake SMTP/SMS status, fake provider domains, fake delivery metrics, or copied notification-console IA.
- Operator workflow clarity: email draft state, SMS draft/snapshot restore, provider switching, toggles, number-stepper port editing, and mutation feedback stay in the client island where browser and form state are available.
- Context visibility: mail host/port/user, SMS provider fields, enable states, localized labels, validation feedback, and load diagnostics must remain visible to the existing summary list, dialogs, and controller calls.
- Cache-key boundary update: message-server loads should use an explicit resource-derived workbench cache key for the email and SMS config endpoints, preserving summary density, dialog editing flow, provider-specific fields, mutation feedback, and diagnostics without adding status panels or invented delivery metrics.
- Copy boundary update: keep UniSMS auth-mode option labels behind runtime i18n keys while preserving provider-specific dialog density, required-field clarity, SMS snapshot restore, and validation behavior; do not add provider education copy, fake delivery status, or SaaS notification-console prose.
- Summary fallback boundary update: absent email host/user/port and provider-specific SMS fields stay as terse localized summary facts; do not infer SMTP health, delivery readiness, provider reachability, or notification routing state.
- Summary action context update: keep the visible configure action compact and unchanged while repeated email/SMS summary buttons receive row-specific accessible names; do not add fake provider readiness, delivery health, or extra notification workflow chrome.
- Dialog field copy update: keep email/SMS provider labels, credential fields, and provider option names as runtime-owned settings copy inside the existing compact dialogs; do not add onboarding prose, delivery analytics, fake provider health, or copied notification-console IA.
- Dialog action copy update: keep configure/cancel/save/saving and enable yes/no states as compact shared runtime copy in the existing summary rows and dialog footers; do not add extra confirmation rails, fake delivery impact, or provider-health status.

## Setting Token Route Boundary - 2026-05-05

- Hierarchy: keep token counts, generate action, dense token table, expiry state, token masks, and delete actions inside the existing token management surface; the route wrapper must not add another settings shell.
- Density: preserve the compact full-width admin table and inline count strip, with no summary rail, nested cards, decorative API-key overview, or fake token health block.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake token scopes, fake usage metrics, fake rotation status, or copied API-key console IA.
- Operator workflow clarity: token loading, count derivation, expiry checks, generate/delete button affordances, and date formatting stay in the client island where browser and state are available.
- Context visibility: token name/mask/creator/create-time/expire-time/last-used, empty state, localized labels, and load diagnostics must remain visible to the existing table and controller calls.
- Loading-copy boundary update: system config, object store, message server, and token loading states keep the same full-width settings hierarchy and compact density while their visible loading copy moves behind runtime i18n keys; do not add loaders, fake health/status summaries, or explanatory admin prose.
- Cache-key boundary update: token loads should use an explicit resource-derived workbench cache key for the `/account/token` endpoint, preserving token counts, dense table evidence, empty state, generate/delete affordances, expiry context, and diagnostics without adding fake token scopes, usage metrics, or health panels.
- Copy boundary update: keep token counts, row lifecycle state, creator attribution, expiry options, and empty-state evidence behind runtime i18n keys; do not add fake scope labels, rotation advice, or copied API-key console prose.
- Row fact fallback boundary update: absent token masks and creators stay as terse localized row facts; do not infer token scope, rotation posture, usage metrics, owner/team, or API-key health.
- Table-cell fallback update: keep token name, mask, creator, create-time, expire-time, and last-used columns in the dense admin table while moving blank table cells to shared `common.none`; do not add fake token scopes, usage counters, rotation guidance, or SaaS API-key console patterns.
- Row action context update: keep the visible delete button compact and unchanged while the repeated destructive action receives a token-specific accessible name; do not add fake revocation state, scope chips, rotation guidance, or a delete workflow that is not implemented.
- Console/table copy update: keep the compact title, count strip, generate action, table headers, empty row, and row delete copy runtime-owned inside the existing dense token management surface; do not add token scope claims, usage analytics, rotation guidance, or copied API-key console IA.

## Bulletin Center Route Boundary - 2026-05-05

- Hierarchy: keep bulletin list, action toolbar, metrics table, refresh behavior, create/edit/delete dialog flows, and controller-backed load path inside the existing bulletin center surface; the route wrapper must not add another shell.
- Density: preserve the compact public-ops bulletin table posture, with no summary rail, nested cards, decorative announcement overview, or fake delivery/status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake bulletin health, fake usage counters, fake product domains, or copied incident/status-center IA.
- Operator workflow clarity: refresh tick, reload callback, client workbench load, dialog mutation state, and metrics JSON editing stay in the client island where browser and state are available.
- Context visibility: bulletin name, app, monitor ids, creator, metric payload, localized loading copy, and controller diagnostics must remain visible to the existing surface and route contract.
- Loading-copy i18n update: keep bulletin loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake delivery health, announcement readiness placeholders, marketing prose, or extra bulletin-navigation chrome.
- Cache-key boundary update: bulletin list loads should use an explicit resource-derived workbench cache key for the `/bulletin?pageIndex=0&pageSize=8` list endpoint plus refresh invalidation, preserving compact table evidence, metrics drilldown, mutation dialogs, and reload clarity without adding fake health/status or delivery analytics.
- Delete-copy boundary update: keep the current-bulletin destructive confirmation as the existing compact cold modal with selected bulletin name evidence and two action buttons; only move the modal title, body, cancel, and confirm copy behind runtime messages without adding extra approval rails or fake delivery-impact scoring.

## Bulletin Page Helper Regression Boundary - 2026-05-09

- Hierarchy: keep the bulletin route regression on the existing client-workbench loader and shared bulletin center surface; only make the mocked provider's locale and loading-copy ownership explicit.
- Density: preserve the compact bulletin route marker without adding summary rails, announcement skeletons, delivery status panels, route banners, or nested cards.
- Anti-AI-slop: do not invent bulletin delivery state, publish readiness, monitor count health, usage analytics, or notification-center product prose while replacing implicit helper assumptions.
- Operator workflow clarity: the regression should assert helper-owned bulletin loading copy while the controller-backed load path, refresh tick, and surface handoff remain unchanged.
- Context visibility: controller list payload, loading marker, surface marker, refresh invalidation contract, and `Ops board` row evidence stay data-backed and unchanged.

## Public Status Route Boundary - 2026-05-05

- Hierarchy: keep organization brand, component health history, incident feed, mode switch, locale picker, year filter, and powered-by footer inside the existing public status shell; the route wrapper must not add another shell.
- Density: preserve the compact public status page posture, with no summary rail, nested cards, fake SLA widgets, fake uptime claims, or extra marketing hero.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake health/status, fake incident counts, fake domains, or copied status-page SaaS IA.
- Operator workflow clarity: incident year state, reload token, incident feed loading/error state, locale switching, and public-controller calls stay in the client island where browser and effects are available.
- Context visibility: org title/copy/logo/color, component cards, incident cards, current year, selected mode, localized labels, and controller diagnostics must remain visible to the existing public status shell.
- Cache-key boundary update: the initial public status load should use an explicit resource-derived workbench cache key for `/status/page/public/org`, `/status/page/public/component`, and the current-year public incident URL, preserving the component/incident mode switch, locale controls, year filter, incident reload state, and powered-by context without adding fake SLA or uptime widgets.
- Incident posture English locale update: keep the incident history posture as a compact public-status locale line without adding status marketing copy, fake reliability claims, public incident counters, or copied status-page SaaS wording.

## Overview Route Boundary - 2026-05-05

- Hierarchy: keep status grid, setup/support panels, summary cards, impacted entities, timeline, checklist/guidance rail, quick entries, and detail/problem-focus dialogs inside the existing overview console; the route wrapper must not add another shell.
- Density: preserve compact three-signal desk density, with no nested cards, hero/marketing layer, fake zero-health panels, fake readiness claims, or extra gutters.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake incidents, fake setup progress, fake product domains, or copied SaaS dashboard IA.
- Operator workflow clarity: refresh nonce, problem-focus dialog, selected summary/impacted-entity dialogs, overview load, alert-derived route handoffs, and setup/healthy placeholder decisions stay in the client island.
- Context visibility: summary apps, alert list, top-alert context, status items, guidance links, quick-entry routes, localized labels, and support/checklist context must remain visible to the existing overview shell and controller/view-model calls.
- Cache-key boundary update: overview loads should use an explicit refresh-aware workbench cache key for `/summary` and the latest-alert list URL, preserving status grid hierarchy, problem-focus dialogs, guidance rail density, quick entries, and alert-derived handoffs without adding fake readiness or health panels.
- Dashboard alias boundary update: `/dashboard` remains a compatibility entry into overview and should redirect through the shared compatibility query normalizer, preserving machine context while stripping display-only return labels; do not render a second overview shell or add alias-specific copy, rails, fake dashboard widgets, or copied SaaS dashboard IA.

## OTLP Center Route Boundary - 2026-05-05

- Hierarchy: keep source selection, protocol/setup stepper, live signal ribbons, readiness/self-check rows, collection-loop links, source catalog, filter rail, entity return, and three-signal handoffs inside the existing OTLP center console; the route wrapper must not add another shell.
- Density: preserve the cold matte catalog density, fixed rail width, compact source cards, and restrained signal counts, with no nested cards, marketing hero, extra gutter, or fake zero/status panels.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, fake source domains, fake readiness claims, copied SaaS catalog IA, or pretending competitor capabilities are implemented features.
- Operator workflow clarity: source search state, route query context, entity return link, backend-backed readiness/self-check data, and source-card filtering stay in the client island where browser and workbench state are available.
- Context visibility: incoming entity/return context, signal counts, readiness rows, self-check rows, collection-loop entries, source sections, search tokens, and localized loading copy must remain visible to the existing OTLP center surface and controller/view-model calls.

## Exception Center Copy Boundary - 2026-05-05

- Hierarchy: keep the existing exception filter rail, query bar, dense exception table, recovery links, and status/title facts; this slice only moves visible copy behind runtime i18n keys.
- Density: preserve the compact error explorer posture, fixed sidebar, tight toolbar, and table-first layout with no extra cards, summary rails, or explanatory gutters.
- Anti-AI-slop: avoid fake incident evidence, fake exception analytics, copied external error-explorer IA, and new product prose while localizing the existing labels and facts.
- Operator workflow clarity: type-specific 403/404/500 facts, filters, query controls, table labels, and recovery handoffs stay readable and map directly to the current exception workflow.
- Context visibility: route type, exception group count, time range, filter groups, error rows, and log/trace/overview recovery context remain visible to the current surface and source contracts.

## Exception Recovery Handoff Boundary - 2026-05-08

- Hierarchy: keep the three recovery links in the existing bottom summary strip, without adding a handoff panel, side rail, or incident-style action list.
- Density: preserve compact pill links beside the exception group count and subtitle so the table remains the primary operator surface.
- Anti-AI-slop: avoid component-local href-to-label guesses, fake recovery automation, copied error-explorer navigation semantics, or translated-string branching while moving handoff labels into recovery row data.
- Operator workflow clarity: overview, log, and trace handoffs must follow the same recovery row payload so the current exception route type, table, filters, and summary stay unchanged.
- Context visibility: route type, recovery href, recovery label, exception group count, subtitle, and log/trace/overview context stay aligned with the same exception view-model rows.

## Exception Row Detail Href Boundary - 2026-05-08

- Hierarchy: keep exception detail navigation on the existing exception-type table link, without adding a detail action column, drawer, or extra row controls.
- Density: preserve the dense exception table rhythm so type, message, count, timestamps, and application remain the primary scan path.
- Anti-AI-slop: avoid component-local detail href construction, fake stacktrace drilldowns, copied error-explorer route semantics, or query-string logic in the surface while moving detail href ownership into exception row data.
- Operator workflow clarity: row clicks must follow the same exception row payload as type, message, count, timestamps, and application, so filters, type-specific route context, and recovery links remain unchanged.
- Context visibility: route type, row key, encoded detail href, exception type, error message, and application stay aligned with the same exception view-model row.

## Exception Subtitle Fallback Boundary - 2026-05-08

- Hierarchy: keep the existing bottom summary strip subtitle beside group count and recovery pills; do not add banners, empty panels, or helper copy.
- Density: preserve the compact table-first exception surface while moving only missing-subtitle fallback ownership into the view model.
- Anti-AI-slop: avoid surface-local translation-key probing, fake exception analytics, copied error-explorer prose, or fallback copy that implies nonexistent evidence.
- Operator workflow clarity: route type, copy title, facts, filters, table rows, detail links, and recovery handoffs remain unchanged while subtitle fallback becomes part of the copy payload.
- Context visibility: type-specific subtitle, default subtitle, group count, row detail hrefs, and recovery context stay aligned through the same exception view-model data.

## Exception Row Meta Copy Boundary - 2026-05-08

- Hierarchy: keep boundary and next-step meta as the existing compact row eyebrow inside the 403/404/500 exception copy stack, without adding a new status rail, incident panel, or diagnostic legend.
- Density: preserve two rows per exception type so title, copy, facts, table, filters, and recovery pills remain the primary scan path.
- Anti-AI-slop: avoid hardcoded English meta labels, fake recovery state, copied error-console lifecycle wording, or metadata that implies backend automation evidence.
- Operator workflow clarity: access, routing, runtime, and operator-action meta labels must stay static row descriptors tied to the same exception type payload.
- Context visibility: exception type, row title/copy, facts, table rows, detail hrefs, and recovery context remain unchanged while row meta display becomes runtime-localized.

## Incident Surface Copy Boundary - 2026-05-05

- Hierarchy: keep the current cold-matte incident entry, overview/entity actions, shell panel, launch checklist, and adapter empty state; this slice only moves visible copy behind runtime i18n keys.
- Density: preserve the compact entry posture with the existing two-column shell/rail and full-width empty state, with no new cards, summary rails, fake incident counters, or explanatory gutters.
- Anti-AI-slop: avoid fake incident feeds, fake health/readiness, copied external incident-desk IA, or new product prose while localizing the current route labels and handoff copy.
- Operator workflow clarity: overview/entity entry actions, response-timeline checklist, responsibility hints, and future adapter boundary stay recognizable and map directly to the current incident route.
- Context visibility: incident title/subtitle, shell copy, checklist rows, chips, empty-state copy, and log/trace/overview handoff labels remain visible to the existing cold-ops surface and source contracts.

## Action Surface Copy Boundary - 2026-05-05

- Hierarchy: keep the current cold-matte automation entry, overview/entity actions, shell panel, launch checklist, adapter boundary, suggested-action panel, and empty state; this slice only moves visible copy behind runtime i18n keys and shrinks the route wrapper.
- Density: preserve the compact two-column entry posture, adapter boundary panel, and suggested action cards with no new summary rails, fake run consoles, extra approval widgets, or explanatory gutters.
- Anti-AI-slop: avoid fake automation execution, fake success states, copied app-builder/runbook IA, or product prose while localizing the current manual-confirmation labels and roadmap snapshot guardrails.
- Operator workflow clarity: suggested actions remain evidence-linked, disabled for auto-execution, and explicitly manual-confirmed; overview/entity links and adapter boundary stay readable.
- Context visibility: incoming alert/entity/trace context, evidence hrefs, action risk, confirmation mode, snapshot labels, checklist rows, and no-auto-execute markers remain visible to the current route and tests.
- Suggested-action meta boundary update: keep the compact card eyebrow line in the same position while moving translated risk/catalog display meta into suggested-action row data; do not add execution controls, fake status, approval widgets, or copied automation-console phrasing.

## Log Manage Route Chrome Copy Boundary - 2026-05-06

- Hierarchy: keep the cold log workbench header, query bar, trend summary, dense log table, detail panel, selected evidence, entity-context, and handoff actions in the existing client island; this slice only moves route chrome, evidence, and handoff labels behind runtime messages.
- Density: preserve compact query controls, summary cards, dense table headers, and the right-side detail panel without extra cards, rails, or explanatory gutters.
- Anti-AI-slop: do not add fake log quality, AI log summaries, new stream surfaces, copied SaaS observability prose, or synthetic evidence.
- Operator workflow clarity: run/reset, severity filter, trace/span/body inputs, selected log inspection, and trace/metrics/entity/alert handoffs keep their current behavior and machine route context.
- Context visibility: selected log evidence, entity context rows, trace/span/service/time/source context, and disabled handoff reasons remain visible without inventing data.
- Settled-cache boundary update: log manage route remounts can reuse just-settled overview, list, trend, and trace-coverage resources briefly while preserving stream/history mode, query filters, selected log evidence, entity context, and trace/metrics/entity/alert handoffs; do not add freshness chrome, fake log readiness, fake stream health, side rails, or copied log-console wording.

## Log Trend Count English Locale Copy - 2026-05-08

- Hierarchy: keep trend row count text inside the existing compact log trend summary, without adding a log-volume legend, quality badge, side rail, or explanatory chart copy.
- Density: preserve the hour/count/meta rhythm so query controls, summary cards, log table, and selected-log evidence remain one-scan.
- Anti-AI-slop: avoid English locale catalogs leaking Chinese count text, fake live log volume, copied log-product phrasing, or translated-string branching while changing only the locale-owned count label.
- Operator workflow clarity: trend rows still reflect the same hourly stats payload; live/history toggles, filters, selected log inspection, and handoff links stay unchanged.
- Context visibility: hour buckets, count values, trend meta, selected log context, trace/span/entity handoffs, and disabled reasons remain stable while the English count copy becomes locale-owned.

## Log Stream Compatibility Route Boundary - 2026-05-05

- Hierarchy: keep the compatibility URL as a thin entry into the canonical live log workbench; the wrapper must not add another shell, toolbar, fake stream surface, or static legacy panel.
- Density: preserve the dense EventSource-backed virtualized stream posture from `LogManagePage`, with forced stream view and hidden view toggle.
- Anti-AI-slop: route migration is infrastructure only; avoid fake connected states, fake zero-log panels, fake filters, copied Angular chrome, or new explanatory product prose.
- Operator workflow clarity: live stream state, filters, EventSource lifecycle, virtualized rows, query state, and time/context handoffs stay in `log-manage-page.tsx`.
- Context visibility: compatibility route marker, forced stream mode, hidden view toggle, and canonical log workbench owner must remain visible to route/source contracts.
- Related trace preview copy update: keep the log-detail-first drilldown, preview drawer hierarchy, compact loading/empty states, and disabled full-trace handoff unchanged while moving the drawer title, badge, labels, loading, empty, error, and full-trace action copy behind runtime i18n keys.
- Live stream chrome copy update: keep the view switch, live stream header, status chips, pause/clear/reconnect controls, empty stream state, selected-log rail, and log/trace/code/metric handoffs in the existing dense workbench hierarchy while moving visible chrome copy behind runtime i18n keys. Preserve the EventSource-backed stream posture, compact row density, and selected-context visibility without adding fake connected states, fake logs, new explanatory rails, or copied external log-product IA.

## Explorer Route Boundary - 2026-05-05

- Hierarchy: keep the query bar, quick filters, trend band, result table, and detail panel inside the existing cold explorer surface; the server wrapper must not add another shell or summary layer.
- Density: preserve the compact cross-signal workbench density, fixed filter rail, dense table rows, and restrained detail panel with no nested cards or extra gutters.
- Anti-AI-slop: route migration is infrastructure only; avoid fake query execution, fake saved views, fake zero panels, copied external explorer IA, or new explanatory product prose.
- Operator workflow clarity: query inputs, run affordance, saved-view/alert/dashboard actions, and trace/log/metric/entity handoffs stay in `explorer-page.tsx`.
- Context visibility: cold workbench route markers, Chinese copy, cross-signal result rows, and handoff URLs must remain visible to route/parity/source contracts.
- Copy boundary update: keep the same hierarchy, density, handoff clarity, and cold-workbench context while moving visible labels, row copy, filters, and table/detail labels behind runtime i18n keys; do not add new UI, fake query behavior, or generic explanatory copy.
- Helper parity update: keep the query header, action row, query controls, quick filters, trend band, result table, detail panel, and handoff links unchanged while mirroring runtime-owned `explorer.*` copy into shared test helpers; do not add saved-view state, fake query execution, dashboard status, or adapter readiness.

## Passport Lock Route Boundary - 2026-05-05

- Hierarchy: keep the shared passport shell, brand lockup, unlock panel, password field, validation message, and locale affordance inside the existing auth surface; the server wrapper must not add another shell or security summary.
- Density: preserve the Angular-parity wide panel, compact password form, and restrained status message with no nested cards, marketing copy, or fake security-status blocks.
- Anti-AI-slop: route migration is infrastructure only; avoid fake session claims, fake SSO/security controls, copied SaaS auth IA, or new explanatory product prose.
- Operator workflow clarity: password state, validation, translated copy, and router redirect stay in `passport-lock-page.tsx`.
- Context visibility: passport shell markers, angular-wide panel marker, lock form marker, shared ops colors, and failure state ownership must remain visible to auth/parity/source contracts.

## Alert Center Route Boundary - 2026-05-04

- Hierarchy: keep the alert list, evidence filters, selected alert details, and acknowledge/recover/silence/inhibit/close actions inside the existing alert center surface; the server wrapper must not add another shell.
- Density: preserve the compact operations table, filter row, and closure-action density with no extra card layer, fake status block, or empty gutter.
- Anti-AI-slop: route migration is infrastructure only; avoid new explanatory product copy or copied competitor page hierarchy.
- Operator workflow clarity: query-state filters, URL cleanup, mutation feedback, and closure actions stay in the client island where router and alert state are available.
- Context visibility: entity, topology edge, OTLP signal, trace/span, monitor, and time context must continue flowing into alert evidence and handoff links.
- Loading-copy i18n update: keep alert center loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake alert counts, incident-health placeholders, explanatory response rails, or extra navigation chrome.
- Alerts alias boundary update: `/alerts` remains a compatibility entry into the canonical alert center and should redirect through the shared alert query-state normalizer, preserving search/status/severity and entity/topology/signal context while stripping display-only labels; do not render a duplicate alert center shell or add alias-specific rails, copy, fake alert status, or copied SaaS alert IA.
- Alert alias search-param owner update: `/alerts` and `/alert/center` should stay thin route aliases that delegate raw Next search params to `lib/alert-manage/query-state.ts`; the generic compatibility reader belongs inside the alert query owner so both aliases normalize context consistently without route-local plumbing.
- Inherited-context copy boundary update: keep the selected-alert evidence context rows, source row semantics, time/monitor/trace evidence, and return-link machine context unchanged while moving only inherited context titles/copy/meta/status text behind runtime messages; do not add fake alert health, new evidence rails, AI triage, or copied incident-console prose.
- Entity-context severity copy boundary update: keep the alert entity-context summary as a compact status/severity/search strip and move only fallback severity labels behind runtime messages; do not add new severity taxonomies, fake prioritization, or copied incident-console naming.
- Evidence closure panel chrome copy boundary update: keep the existing evidence-closure panel header, evidence/action summary chips, evidence rows, operation rows, inherited context, and closure actions in place while moving only panel chrome and summary labels behind runtime messages; do not add new evidence lanes, fake root-cause claims, AI triage, or copied incident-console phrasing.
- Row identity fallback boundary update: keep alert list rows, selected-alert details, status/severity labels, fingerprint/creator evidence, and closure actions in the current compact surface while moving only missing identity/fingerprint/creator facts into the shared localized fallback.
- Empty selection meta fallback update: keep the unselected-detail prompt, alert list, filters, and closure action affordances unchanged while moving only the empty selected-alert meta marker into the shared localized fallback.
- Alert-center query-owner update: preserve alert filters, grouped alert rows, selected evidence, closure operations, compatibility URL cleanup, and cross-signal/entity/topology/time context inside the existing client island; parse raw route params in `lib/alert-manage/query-state.ts` before render. Do not add alert health panels, incident-state claims, route-state badges, copied incident-console IA, or fake evidence readiness while moving query ownership.

## Alert Setting Route Boundary - 2026-05-04

- Hierarchy: keep threshold rule search, rule table, enable/edit/delete actions, and create/edit dialog state inside the existing alert setting surface; the server wrapper must not add another shell.
- Density: preserve the compact threshold-rule authoring and dense table posture, with no extra cards, fake status panels, or explanatory gutters.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative health claims, or copied competitor page hierarchy.
- Operator workflow clarity: query-state source filters, validation, notification/template context, mutation feedback, and delete confirmation stay in the client island where router and rule state are available.
- Context visibility: incoming entity, monitor, signal, trace/span, service, environment, and time context must continue reaching the rule creation workflow and return links.
- Loading-copy i18n update: keep alert setting loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake rule counts, datasource-health placeholders, explanatory threshold rails, or extra alert-navigation chrome.
- Row fallback boundary update: keep rule name, type, expression, template, labels, enable state, updated time, and row actions in the existing dense table while moving only missing expression/template facts into the shared localized fallback.
- Evidence and label fallback boundary update: preserve the threshold rule search, dense rule table, evidence prefill strip, create/edit/delete actions, and datasource context while moving only absent evidence-label and empty row-label markers into the shared localized fallback.
- Evidence query-owner boundary update: keep signal/entity/time evidence visible in the existing prefill strip and create dialog, but parse raw route params in a typed alert-setting query owner before the client island renders. Do not add alert-health claims, extra context rails, fake rule recommendations, or copied incident-console IA.

## Alert Notice Route Boundary - 2026-05-04

- Hierarchy: keep receiver, rule, and template tab workspaces plus evidence prefill inside the existing alert notice console; the server wrapper must not add another shell.
- Density: preserve the compact cold notification table/editing density, with no extra cards, fake status panels, or explanatory gutters.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative health claims, or copied competitor page hierarchy.
- Operator workflow clarity: receiver/rule/template pagination, search, CRUD dialogs, validation, delete confirmation, and receiver tests stay in the client island where router and notice state are available.
- Context visibility: incoming entity, signal, trace/span, service, environment, and time context must continue reaching rule prefill, evidence rows, and return links.
- Cache-key boundary update: receiver/rule list loads should use an explicit query-derived workbench cache key without changing the tab hierarchy, table density, modal authoring flow, loading copy, or signal evidence visibility.
- Rule receiver-empty copy boundary update: keep the aligned modal form, required receiver row, hidden CSV input, and compact cold multi-select container unchanged while moving only the empty-receiver prompt behind runtime messages; do not add setup guidance, fake receiver health, or extra channel recommendation rails.
- Loading-copy helper update: keep alert notice loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add receiver-health placeholders, fake delivery readiness, product prose, or extra notification workflow chrome.
- Evidence query-owner boundary update: preserve the same receiver/rule/template tabs, rule prefill, modal authoring state, evidence rows, and return action, but parse raw signal route params in the alert-notice query owner before the client island renders. Do not add notification-health scores, fake delivery readiness, extra evidence rails, or copied incident-console IA.

## Alert Silence Route Boundary - 2026-05-04

- Hierarchy: keep silence search, selected rule state, create/edit dialog, delete confirmation, and incoming alert evidence context inside the existing silence surface; the server wrapper must not add another shell.
- Density: preserve the compact cold silence table and authoring density, with no extra cards, fake status panels, or explanatory gutters.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative health claims, or copied competitor page hierarchy.
- Operator workflow clarity: query-state filters, label options, create/edit/delete flows, validation, and mutation feedback stay in the client island where router and silence state are available.
- Context visibility: incoming entity, topology, monitor, signal, trace/span, service, environment, and time context must continue reaching silence prefill, return links, and evidence rows.
- Loading-copy i18n update: keep alert silence loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake mute coverage, incident-health placeholders, explanatory maintenance-window rails, or extra alert-navigation chrome.
- Day fallback boundary update: keep silence rule name, match strategy, label count, days evidence, selected-rule detail, and row actions in the existing compact silence table while moving only missing day facts into the shared localized fallback.
- Empty selection meta fallback update: preserve silence search, selected-rule detail prompt, create/edit/delete/batch actions, label option loading, and evidence prefill while moving only the empty selected-rule meta marker into the shared localized fallback.
- Evidence label fallback update: preserve silence evidence strip hierarchy, return action, row grid density, and signal/time/entity context visibility while moving only the absent prefill-label marker into the shared localized fallback.
- Evidence query-owner boundary update: preserve the same silence table, editor state, delete confirmation, evidence strip, and return action, but parse raw alert/signal route params in the alert-silence query owner before the client island renders. Do not add mute-health scores, fake matching coverage, extra evidence rails, or copied incident-console IA.

## Alert Silence Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep silence search, selected rule state, create/edit dialog, delete confirmation, batch selection, enable toggle, label options, and incoming alert/topology/signal context inside the existing silence surface; cache reuse must not add freshness chrome, fake mute coverage, or incident-console rails.
- Density: preserve the compact cold silence table and authoring rhythm so filters, selected ids, checked ids, editor state, validation, and mutation feedback remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent maintenance-window readiness, fake matching coverage, or copy SaaS incident-silencing language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled silence data briefly, while Refresh, save, enable toggle, single delete, and batch delete continue to bump `refreshTick`; search still invalidates through the query-derived silence URL.
- Context visibility: silence list URL, refresh tick, checked ids, selected rule, draft state, return context, evidence prefill, label options, and localized loading copy remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Alert Inhibit Route Boundary - 2026-05-04

- Hierarchy: keep inhibit search, selected rule state, create/edit dialog, delete confirmation, and incoming alert evidence context inside the existing inhibit surface; the server wrapper must not add another shell.
- Density: preserve the compact cold inhibit table and authoring density, with no extra cards, fake status panels, or explanatory gutters.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative health claims, or copied competitor page hierarchy.
- Operator workflow clarity: query-state filters, label options, create/edit/delete flows, validation, mutation feedback, and batch delete stay in the client island where router and inhibit state are available.
- Context visibility: incoming entity, topology, monitor, signal, trace/span, service, environment, and time context must continue reaching inhibit prefill, return links, and evidence rows.
- Loading-copy i18n update: keep alert inhibit loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake suppression coverage, matching-readiness placeholders, explanatory incident rails, or extra inhibit-navigation chrome.
- Equal-label fallback boundary update: keep inhibit rule name, source/target counts, equal-label evidence, timers, selected-rule detail, and row actions in the existing compact inhibit table while moving only missing equal-label facts into the shared localized fallback.
- Empty selection meta fallback update: preserve inhibit search, selected-rule detail prompt, create/edit/delete/batch actions, label option loading, and evidence prefill while moving only the empty selected-rule meta marker into the shared localized fallback.
- Evidence label fallback update: preserve the source/target/equal evidence strip, return action, row grid density, and signal/time/entity context visibility while moving only absent source/target/equal prefill-label markers into the shared localized fallback.
- Evidence query-owner boundary update: preserve the same inhibit table, selected-rule state, batch delete, editor state, source/target/equal evidence strip, and return action, but parse raw alert/signal route params in the alert-inhibit query owner before the client island renders. Do not add suppression-health scores, fake matching readiness, extra evidence rails, or copied incident-console IA.

## Alert Inhibit Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep inhibit search, selected rule state, create/edit dialog, delete confirmation, batch selection, enable toggle, label options, and incoming alert/topology/signal context inside the existing inhibit surface; cache reuse must not add freshness chrome, fake suppression coverage, or incident-console rails.
- Density: preserve the compact cold inhibit table and authoring rhythm so filters, selected ids, checked ids, editor state, validation, and mutation feedback remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent suppression readiness, fake matching coverage, or copy SaaS incident-suppression language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled inhibit data briefly, while Refresh, save, enable toggle, single delete, and batch delete continue to bump `refreshTick`; search still invalidates through the query-derived inhibit URL.
- Context visibility: inhibit list URL, refresh tick, checked ids, selected rule, draft state, return context, evidence prefill, label options, and localized loading copy remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Alert Group Route Boundary - 2026-05-04

- Hierarchy: keep group search, selected group state, create/edit dialog, delete confirmation, and incoming alert evidence context inside the existing group surface; the server wrapper must not add another shell.
- Density: preserve the compact cold grouping table and authoring density, with no extra cards, fake status panels, or explanatory gutters.
- Anti-AI-slop: route migration is infrastructure only; avoid new product prose, decorative health claims, or copied competitor page hierarchy.
- Operator workflow clarity: query-state filters, label options, create/edit/delete flows, validation, mutation feedback, and batch delete stay in the client island where router and group state are available.
- Context visibility: incoming entity, topology, monitor, signal, trace/span, service, environment, and time context must continue reaching group prefill, return links, and evidence rows.
- Loading-copy i18n update: keep alert group loading feedback runtime-owned on the existing `ClientWorkbench` route island; do not add fake grouping coverage, deduplication-readiness placeholders, explanatory incident rails, or extra group-navigation chrome.
- Label fallback boundary update: keep group rule name, enable state, grouping labels, timers, selected-rule detail, and row actions in the existing dense grouping table while moving only missing grouping-label facts into the shared localized fallback.
- Empty selection meta fallback update: preserve group search, selected-rule detail prompt, create/edit/delete/batch actions, label option loading, and evidence prefill while moving only the empty selected-rule meta marker into the shared localized fallback.
- Evidence label fallback update: preserve the grouping evidence strip, return action, row grid density, and signal/time/entity context visibility while moving only the absent prefill-label marker into the shared localized fallback.
- Evidence query-owner boundary update: preserve the same group table, selected-rule state, batch delete, editor state, grouping evidence strip, and return action, but parse raw signal route params in the alert-group query owner before the client island renders. Do not add grouping-health scores, fake deduplication readiness, extra evidence rails, or copied incident-console IA.

## Alert Group Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep group search, selected group state, create/edit dialog, delete confirmation, batch selection, enable toggle, label options, and incoming alert/topology/signal context inside the existing group surface; cache reuse must not add freshness chrome, fake grouping coverage, or incident-console rails.
- Density: preserve the compact cold grouping table and authoring rhythm so filters, selected ids, checked ids, editor state, validation, and mutation feedback remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent grouping readiness, fake deduplication quality, or copy SaaS incident-grouping language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled group data briefly, while Refresh, save, enable toggle, single delete, and batch delete continue to bump `refreshTick`; search still invalidates through the query-derived group URL.
- Context visibility: group list URL, refresh tick, checked ids, selected group, draft state, evidence prefill, label options, and localized loading copy remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Alert Evidence Closure Copy Boundary - 2026-05-05

- Hierarchy: keep the selected-alert evidence chain in the alert center view-model as five compact rows: entity, metrics, logs, traces, and topology; only move row titles, fallbacks, and helper meta copy behind runtime messages.
- Density: preserve the current concise operation row list for acknowledge, recover, threshold, notice, grouping, silence, inhibit, automation, and close; do not introduce a new action drawer, summary rail, or fake remediation checklist.
- Anti-AI-slop: avoid fake alert causality, fake runbook automation, copied incident-desk IA, or generic workflow prose while localizing the existing alert closure evidence copy.
- Operator workflow clarity: evidence links must still carry entity, service, environment, trace/span, monitor, topology, and time context into the destination workbenches, and automation remains suggestion-only with human confirmation.
- Context visibility: selected alert group, active count, target entity/service, trace context, and topology return context remain visible through the current rows and href contracts.

## Alert Integration Source Copy Boundary - 2026-05-05

- Hierarchy: keep the existing integration source rail, selected-source document panel, and token-management header action; this slice only moves static chrome/source labels behind runtime messages.
- Density: preserve the compact cold source-list posture, narrow rail, markdown document surface, and restrained header actions without adding setup cards, readiness summaries, or fake delivery analytics.
- Anti-AI-slop: avoid new product prose, copied SaaS integration catalog IA, fake provider health, or decorative onboarding claims while localizing the existing labels and fallback copy.
- Operator workflow clarity: selected integration source, token-management entry, doc fallback behavior, source navigation, and markdown rendering stay unchanged and continue to map to existing alert integration assets.
- Context visibility: source id, provider name, icon, doc panel, fallback-guide state, and token route remain visible to the existing page contract and operator handoff.
- Mermaid render-state copy update: keep the embedded diagram host as a restrained markdown artifact inside the document panel, with only pending/error render-state copy moved behind runtime messages. Do not add diagram summaries, fake provider topology, copied setup wizards, or extra health/readiness claims; source id, provider document context, and the original Mermaid SVG host stay visible.

## Alert Integration Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep the same source rail, fact rows, posture rows, markdown document panel, and token-management handoff; changing fallback locale order must not add onboarding cards, readiness panels, or setup wizards.
- Density: preserve the compact provider list and three-row fact/posture summaries so operators can scan source, document status, and token path without extra chrome.
- Anti-AI-slop: do not invent delivery health, provider readiness, validation success, copied SaaS integration catalog copy, or fake alert pipeline state while correcting fallback order.
- Operator workflow clarity: default integration copy resolves from runtime messages with an English fallback when no caller locale is available; selected source ids, document-loaded/fallback state, and token-management route stay data-driven.
- Context visibility: source id, provider name key, icon path, doc fallback flag, source navigation, and markdown rendering context remain visible to the existing page and view-model contracts.

## Global Loading Copy Boundary - 2026-05-05

- Hierarchy: keep the global route loading shell as one centered status surface with spinner, title, and short copy; this slice only moves the title/copy into runtime messages.
- Density: preserve the compact cold matte loading panel, status semantics, fixed spinner, and no-fetch behavior without adding progress steps, skeleton dashboards, or fake readiness.
- Anti-AI-slop: avoid invented loading stages, product claims, animated dashboards, or generic onboarding prose while localizing the existing wait state.
- Operator workflow clarity: loading remains a plain route transition state that says data is being prepared and does not imply background health checks or successful collection.
- Context visibility: `role=status`, `aria-busy`, `aria-live`, loading marker, and no external API/http references remain visible to the existing SSR test.

## Global Loading Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep the global route loading shell as the same centered status surface; changing fallback locale order must not add progress steps, skeleton dashboards, health summaries, or a second loading layer.
- Density: preserve the compact spinner/title/copy rhythm and the existing cold matte panel so route transitions remain quiet and quick to parse.
- Anti-AI-slop: do not invent loading stages, readiness claims, collection status, product onboarding prose, or animated dashboard decoration while correcting fallback order.
- Operator workflow clarity: shared loading title/copy resolves from runtime messages with an English fallback when no caller locale is available; the state still only means page data is being prepared.
- Context visibility: `role=status`, `aria-busy`, `aria-live`, `data-app-route-loading`, spinner marker, and no-fetch/no-http behavior stay unchanged.

## Quiet Route Pending Boundary - 2026-05-14

- Hierarchy: root `app/loading.tsx` should be a quiet route-pending affordance inside the existing shell, not a second workbench panel competing with the actual page.
- Density: use a single thin pending line and reserved content area; do not show centered cards, large spinners, title/copy blocks, skeleton dashboards, or product explanation while a segment compiles or streams.
- Anti-AI-slop: do not claim page data is being prepared, backend health is being checked, or collection state is known from a framework route pending fallback.
- Operator workflow clarity: real page/client workbench loaders can still expose route-owned copy if a resource load is genuinely slow; the framework fallback should stay visually quiet so short dev/prod route waits do not read as product latency.
- Context visibility: `role=status`, `aria-busy`, route loading marker, and an explicit pending indicator remain available to the app loading contract without external API/http references.

## Client Workbench Deferred Loading Boundary - 2026-05-14

- Hierarchy: keep the shared `ClientWorkbench` loading shell for genuinely slow route islands, but do not replace the page with a centered spinner/title/copy during fast route hops or immediately resolved settled-cache reads.
- Density: preserve a quiet reserved pending area first, then reveal the existing compact spinner only after the defer window; do not add skeleton dashboards, progress steppers, route-health panels, or explanatory product prose.
- Anti-AI-slop: do not imply backend health, collection success, freshness, or readiness from the deferred state; short waits should feel like navigation latency, not a product claim.
- Operator workflow clarity: cached or fast workbench payloads should settle into their real page before users can read "Loading workspace"; real slow loads still expose `role=status`, `aria-busy`, and route-owned loading copy after the delay.
- Context visibility: cache keys, settled TTL forwarding, error/login redirect behavior, caller-provided loading copy, and the existing global spinner markers remain visible to focused component contracts.

## Shared Confirm Dialog Copy Boundary - 2026-05-05

- Hierarchy: keep `ColdConfirmDialog` as the shared compact confirmation modal with existing title, body copy, warning icon, and footer actions; this slice only moves the default kicker and pending label behind runtime messages.
- Density: preserve the small modal width, two-button footer, pending disable behavior, and no extra evidence rail or summary layer.
- Anti-AI-slop: avoid invented confirmation steps, generic safety prose, fake approval metadata, or new alert-specific wording in the shared component.
- Operator workflow clarity: alert silence/inhibit/group/notice/setting consumers keep their own concrete title/body/actions while the shared modal supplies only neutral operation/pending chrome.
- Context visibility: `data-cold-confirm-dialog`, footer actions, caller-provided labels, and pending state remain visible to source and component tests.

## Shared Label Record Input Copy Boundary - 2026-05-05

- Hierarchy: keep `LabelRecordInput` as the compact inline key/value label selector with existing equal-width key/value fields, suggestion popovers, hidden input, and row actions; this slice only moves default placeholders and add/remove labels behind runtime messages.
- Density: preserve the single-row grid, 76px action column, fixed anchored popovers, and no chip-list regression or extra form helper text.
- Anti-AI-slop: avoid adding explanatory label-management prose, fake label validation summaries, or alert-specific wording to the shared control.
- Operator workflow clarity: alert silence/inhibit/notice/setting consumers can still pass caller-owned labels while the shared component supplies neutral defaults for generic tag editing.
- Context visibility: `data-cold-label-selector-*` markers, hidden form value, key/value inputs, add/remove buttons, and suggestion popovers remain visible to source and component tests.

## LabelRecordInput Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep `LabelRecordInput` as the same compact key/value label selector; changing fallback locale order must not add helper text, validation panels, chip metadata, or a second action row.
- Density: preserve the equal-width key/value grid, 76px add/remove action column, and anchored suggestion popovers so alert and settings forms stay scan-friendly.
- Anti-AI-slop: do not invent label taxonomy, fake validation summaries, suggestion counts, or copied label-management prose while correcting the fallback catalog order.
- Operator workflow clarity: shared placeholder/add/remove copy resolves from runtime messages with an English fallback when no caller locale is available; caller-provided labels and label options remain authoritative.
- Context visibility: hidden input ownership, row update/remove behavior, draft commit behavior, popover positioning, and `data-cold-label-selector-*` markers stay unchanged.

## Shared Tag Input Copy Boundary - 2026-05-05

- Hierarchy: keep `TagInput` as the compact chip-based tag editor with removable chips, inline draft input, hidden form value, and fixed anchored suggestion popover; this slice only moves the add-tag placeholder and remove aria label behind runtime messages.
- Density: preserve the small chip rhythm, single inline input, popover dimensions, and no select/datalist fallback or helper-copy expansion.
- Anti-AI-slop: avoid adding tag-management prose, validation summaries, fake suggestion counts, or alert-specific semantics to the shared control.
- Operator workflow clarity: alert grouping/inhibit consumers keep searchable tag suggestions and caller-provided placeholder copy while the shared component supplies neutral defaults once tags are present.
- Context visibility: `data-cold-tag-*` markers, hidden value, removable chip buttons, draft input, suggestion popover, and fixed-position owner remain visible to source and component tests.

## Shared Number Stepper Copy Boundary - 2026-05-05

- Hierarchy: keep `NumberStepper` as the compact inline numeric control with one text input and two icon-only step buttons; this slice only moves default decrement/increment screen-reader labels behind runtime messages.
- Density: preserve the 8px-high control rhythm, narrow action column, border separators, and no helper text, label row, slider, or stepper-card expansion.
- Anti-AI-slop: avoid adding numeric-range explanations, fake validation summaries, or settings-specific wording to the shared control.
- Operator workflow clarity: settings/server consumers can still pass caller-owned labels while the shared component supplies neutral accessible defaults for generic numeric editing.
- Context visibility: `data-cold-number-stepper-*` markers, input value, decrement/increment actions, min/max/step behavior, and screen-reader labels remain visible to source and component tests.

## Alert Notice Template Type Copy Boundary - 2026-05-05

- Hierarchy: keep the alert notice template editor as the existing aligned modal form with name, type selector, preset pill, and code editor; this slice only moves template type and preset labels behind runtime messages.
- Density: preserve the 132px label column, single full-width select, readonly preset pill, and 220px code editor without adding setup cards, channel descriptions, or helper rails.
- Anti-AI-slop: avoid invented delivery-channel guidance, fake provider health, copied SaaS catalog copy, or new onboarding prose while localizing the existing template channel labels.
- Operator workflow clarity: operators still choose the same notice channel values and retain the same custom `typeOptions` escape hatch for controller-provided labels.
- Context visibility: `data-alert-notice-template-*` markers, option values, preset state, readonly state, and code-editor language switching remain visible to source and component tests.

## Observability Waterfall Copy Boundary - 2026-05-05

- Hierarchy: keep `ObservabilityWaterfall` as the compact trace/event timing visualization with the same overview row, span rows, event badges, and timeline marks; this slice only moves overview/count copy behind runtime or caller-provided labels.
- Density: preserve the fixed-height lane rhythm, minimap, compact span rows, event markers, and full-width stacked axis without adding a summary rail or explanation block.
- Anti-AI-slop: avoid invented trace analysis prose, fake root-cause claims, copied trace-product IA, or decorative event storytelling while localizing the existing timeline/count labels.
- Operator workflow clarity: span duration, event count, timeline axis, and event attribute drilldown remain visible without changing row ordering, selection semantics, or detail behavior.
- Context visibility: `data-waterfall-*` markers, supplied `spanLabel`/`durationLabel`/`timelineLabel`, overview counts, row event counts, selected event state, and minimap lanes remain visible to component and source contracts.

## Trace Attribution Diagnostics Copy Boundary - 2026-05-06

- Hierarchy: keep attribution diagnostics as a compact evidence block inside the trace workbench detail rail and waterfall drawer; this slice only moves the block title, accessibility label, and present/missing state text behind runtime i18n keys.
- Density: preserve the two-column diagnostic rows and `hertzbeat.*` badge without adding explanatory rails, new cards, or fake attribution health summaries.
- Anti-AI-slop: avoid invented root-cause copy, external trace-product language, or simulated attribution success while localizing only the existing diagnostic chrome.
- Operator workflow clarity: operators must still see which `hertzbeat.entity_id`, collector, template, workspace, and entity-name attributes are present or missing before opening entity/log/metric handoffs.
- Context visibility: `data-trace-manage-attribution-diagnostics`, row state markers, `hertzbeat.*` labels, and row meta/value evidence remain visible to the source and page tests.

## Trace Waterfall Drawer Copy Boundary - 2026-05-06

- Hierarchy: keep the waterfall drawer as the trace-detail drilldown layer with the same header, stats, waterfall, attribution, event-detail, and handoff order; this slice only moves drawer chrome and status copy behind runtime i18n keys.
- Density: preserve compact stats and waterfall labels so span count, error count, events, links, selected event, and selected span evidence remain scan-first.
- Anti-AI-slop: avoid generated root-cause summaries, AI explanations, demo spans, external APM terminology, or new onboarding copy while localizing the drawer.
- Operator workflow clarity: logs, metrics, and entity handoffs remain explicit, and disabled states stay tied to actual missing trace/entity identifiers.
- Context visibility: event-vs-span copy, selected event facts, timeline labels, and `hertzbeat.*` attribution diagnostics stay visible inside the drawer.

## OTLP Center Cache-Key Boundary - 2026-05-06

- Hierarchy: keep the OTLP intake catalog, readiness/self-check rows, source search, entity return, and signal handoffs inside the existing client island; this slice only makes the loader cache key explicit.
- Density: preserve the current cold catalog rail, compact source cards, readiness strips, and signal ribbons without adding summary rails, nested cards, or decorative setup panels.
- Anti-AI-slop: avoid fake ingestion readiness, copied external catalog IA, or product prose while deriving the cache key from the actual overview/guide/bindings resources.
- Operator workflow clarity: cached first-screen loads must still reflect the same OTLP overview, setup guide, entity binding, search, and route-context handoff behavior.
- Context visibility: `/ingestion/otlp/overview`, `/ingestion/otlp/guide`, `/ingestion/otlp/bindings`, entity return parameters, and signal links remain visible to source and page contracts.

## Events Alias Compatibility Boundary - 2026-05-06

- Hierarchy: keep `/events` as a thin compatibility entry into the canonical log workbench, not a second rendered log shell or a new events console.
- Density: preserve the existing dense log explorer table, query row, trend band, and detail panel after redirect; do not add compatibility banners, summary cards, or explanatory rails.
- Anti-AI-slop: avoid copied external log-explorer IA, fake event timelines, or marketing prose while moving the alias onto the shared route normalizer.
- Operator workflow clarity: legacy filters, content search, severity, trace/span, time context, entity context, and return path should all be normalized before landing on `/log/manage?view=list`.
- Context visibility: the alias must strip display-only labels while preserving machine context so the canonical log workbench still owns evidence handoff, cache keys, and operator navigation.
- Events alias search-param owner update: `/events` should delegate raw Next search params to `lib/log-manage/query-state.ts`; the generic compatibility reader belongs inside the log query owner so route aliases stay thin and log context normalization remains consistent with the canonical workbench.

## AppFrame Header Cache Boundary - 2026-05-06

- Hierarchy: keep setup progress, notification bell, quick settings, locale menu, and user menu in the current compact header; this slice only extends shared header-resource reuse.
- Density: preserve the 64px header rhythm and compact dropdowns without adding a summary rail, setup card, or duplicate alert widget.
- Anti-AI-slop: avoid fake freshness, readiness, or status claims; cache only recently loaded real monitor, collector, entity, definition, governance, and alert resources.
- Operator workflow clarity: route changes can still recompute route-specific setup baseline locally while reusing the same just-loaded header summary resources.
- Context visibility: locale remains the cache dimension for translated header copy, while the actual backend resource endpoints stay owned by AppFrame and visible to source contracts.

## Settings Compatibility Redirect Boundary - 2026-05-06

- Hierarchy: keep `/setting` and `/setting/settings` as thin compatibility entries into the existing system-config console, not duplicate settings shells.
- Density: preserve the current compact settings header, left menu, and config form after redirect without adding compatibility banners, setup cards, or routing explanation text.
- Anti-AI-slop: avoid fake admin domains, copied SaaS settings IA, or new product prose while moving the redirect target into one shared owner.
- Operator workflow clarity: both legacy entries should preserve machine query context such as tab, focus, returnTo, and audit mode before landing on `/setting/settings/config`.
- Context visibility: return labels and timestamp params continue to be normalized by the shared compatibility search-param helper while the settings layout owns the visible navigation.

## Login Compatibility Redirect Boundary - 2026-05-06

- Hierarchy: keep `/login` as a thin compatibility entry into the existing passport login shell, not a second auth screen.
- Density: preserve the current centered passport surface, locale affordance, login form, and footer after redirect without banners, onboarding panels, or explanatory auth copy.
- Anti-AI-slop: avoid fake security claims, SaaS sign-in patterns, or new marketing prose while moving the alias target into the passport login controller.
- Operator workflow clarity: guard source and post-auth redirect context should survive the alias so operators land back on the intended workbench after authentication.
- Context visibility: return-label cleanup remains in the shared compatibility search-param helper, while the passport controller owns the login entrypoint and post-login redirect behavior.

## Public Status Compatibility Redirect Boundary - 2026-05-06

- Hierarchy: keep `/status/public` as a thin compatibility entry into the existing public status page, not a second status surface.
- Density: preserve the current public status shell, component health history, incident feed, locale switcher, and footer after redirect without banners or explanation rails.
- Anti-AI-slop: avoid fake uptime, fake incident health, SaaS-style status branding, or new marketing copy while moving the alias target into the status-center controller.
- Operator workflow clarity: component, status, year, and return context should survive the alias so shared public status filters and incident history remain the canonical workflow.
- Context visibility: query normalization stays in the shared compatibility search-param helper, while status-center owns public org/component/incident data and visible page behavior.

## Settings MCP Alias Compatibility Boundary - 2026-05-06

- Hierarchy: keep `/setting/settings/mcp-server` as a thin legacy settings entry into the existing system-config console, not a separate MCP settings screen or navigation branch.
- Density: preserve the current settings layout, config form, and left-menu rhythm after redirect without compatibility banners, explanatory panels, or duplicate admin controls.
- Anti-AI-slop: avoid fake MCP readiness, copied integration-center IA, or new settings prose while keeping the alias target owned by the settings layout navigation helper.
- Operator workflow clarity: tab, focus, return, and audit query context should survive the alias so operators land in the canonical config workflow with their original intent intact.
- Context visibility: search-param normalization stays in the shared compatibility helper while `lib/setting-settings-layout/navigation.ts` remains the single owner of the config redirect target.

## Monitor Catch-All Compatibility Boundary - 2026-05-06

- Hierarchy: keep unknown `/monitors/*` routes and the monitor not-found boundary as thin returns to the canonical monitor list, not a separate fallback screen.
- Density: preserve the existing dense monitor workbench, selected-row rail, batch actions, and entity return context after redirect without banners, empty shells, or explanatory detours.
- Anti-AI-slop: avoid fake monitor status, copied inventory IA, or new product prose while routing malformed monitor paths through the same monitor navigation owner.
- Operator workflow clarity: legacy query context such as app, entity, labels, time range, return path, and pagination should survive catch-all redirects when the route has search params.
- Context visibility: the monitor-manage navigation helper remains the single owner for `/monitors` compatibility targets while the list workbench continues to own visible monitor evidence and actions.

## Entity Catch-All Compatibility Boundary - 2026-05-06

- Hierarchy: keep unknown `/entities/*` routes and the entity not-found boundary as thin returns to the canonical entity catalog, not a separate fallback screen.
- Density: preserve the existing catalog search, status/type filters, entity counts, create/import/discovery entries, and per-row evidence actions after redirect without banners or explanatory shells.
- Anti-AI-slop: avoid fake entity health, copied resource-catalog IA, or new product prose while routing malformed entity paths through the shared entity query owner.
- Operator workflow clarity: legacy search, type, status, time, source, and return context should survive catch-all redirects when the route has search params.
- Context visibility: `lib/entity-manage/query-state.ts` remains the single owner for `/entities` compatibility targets while the entity list workbench continues to own visible catalog evidence and handoffs.

## Root Overview Compatibility Boundary - 2026-05-06

- Hierarchy: keep `/` as a thin product-entry redirect into the existing overview console, not a duplicate landing page, dashboard shell, or marketing hero.
- Density: preserve the current overview status grid, setup/support panels, summary cards, impacted entities, alert timeline, and quick entries after redirect without compatibility banners or explanatory rails.
- Anti-AI-slop: avoid fake readiness, fake health, copied SaaS home IA, or product-positioning prose while moving the redirect target into a shared overview navigation owner.
- Operator workflow clarity: query context such as source, return path, entity, service, environment, and time filters should survive the root entry so operators land in the same overview workflow with their machine context intact.
- Context visibility: `lib/overview/navigation.ts` remains the single owner for the `/overview` compatibility target while the overview client island continues to own visible evidence, alert-derived handoffs, and cache keys.

## Dashboard Alias Overview Owner Boundary - 2026-05-06

- Hierarchy: keep `/dashboard` as a legacy alias into the same overview console target owned by `lib/overview/navigation.ts`, not a second dashboard IA branch.
- Density: preserve the current overview console after redirect without adding dashboard-only banners, summary rails, shell wrappers, or route explanation text.
- Anti-AI-slop: avoid fake dashboard widgets, copied SaaS dashboard naming, or product-positioning copy while removing the duplicate `/overview` literal from the dashboard alias helper.
- Operator workflow clarity: legacy dashboard query context should pass through the same overview compatibility normalizer as `/`, so return path, entity, service, environment, and time context behave consistently.
- Context visibility: overview navigation remains the single compatibility target owner while `lib/dashboard/navigation.ts` is only a named alias delegate for old links.
- Dashboard alias search-param type owner update: the `/dashboard` route should import both the redirect helper and raw Next search-param type from `lib/dashboard/navigation.ts`, keeping route-boundary typing and query ownership behind the dashboard alias delegate instead of reaching back into the generic compatibility helper.

## Alert Topology Context Panel Copy Boundary - 2026-05-06

- Hierarchy: keep the existing compact topology context panel inside alert center, with the same service/entity title, source pills, edge id, time context, and topology return action.
- Density: preserve the current single-panel treatment and pill row; do not add a topology summary rail, route explanation, or extra impact cards.
- Anti-AI-slop: avoid fake blast-radius claims, copied topology-console phrasing, or invented dependency evidence while moving only visible panel labels behind runtime messages.
- Operator workflow clarity: alert-to-topology context must remain obvious through the same `data-alert-topology-context` contract, source kind chip, edge id chip, and sanitized return href.
- Context visibility: source labels should be translated at render time while machine context such as `viewMode`, `sourceKind`, `edgeId`, environment, and time range remains unchanged.

## Alert Severity Filter Copy Boundary - 2026-05-06

- Hierarchy: keep the existing compact alert-center severity selector inside the single query row; this slice only moves fallback option labels behind runtime messages.
- Density: preserve the current select size, option order, and filter grouping without adding severity badges, helper text, or another filter panel.
- Anti-AI-slop: avoid invented severity taxonomy or copied incident-console terms; use the existing HertzBeat warning/critical/emergency/error/info/unknown vocabulary.
- Operator workflow clarity: the severity filter must keep the same query-state values so alert filtering, entity context summaries, and compatibility URLs remain stable.
- Context visibility: translated labels can change per locale, but the machine values `critical`, `error`, `warning`, `info`, and `unknown` remain unchanged.

## Entity List Surface Copy Boundary - 2026-05-06

- Hierarchy: keep the cold entity catalog as a dense object-first list with the compact header, command row, metrics strip, query row, table, and row actions in the same order.
- Density: preserve the current full-width table rhythm and equal-width command buttons without adding summary rails, onboarding copy, nested cards, or fake catalog health panels.
- Anti-AI-slop: avoid invented entity-readiness claims, copied SaaS resource-catalog language, AI triage wording, or decorative status summaries while moving only visible labels behind runtime messages.
- Operator workflow clarity: create, discovery, import, owner, log, trace, evidence, status, and row progress labels must stay tied to real entity rows and existing route handoffs.
- Context visibility: translated copy can vary by locale, but entity hrefs, row status values, monitor/alert/relation counts, updated time, search state, and `data-entity-list-*` contracts remain unchanged.

## Settings Governance Surface Copy Boundary - 2026-05-06

- Hierarchy: keep the settings overview as the existing compact WorkbenchPage with current-route governance rows under the platform governance section.
- Density: preserve the current RowList treatment without adding future-domain navigation, roadmap cards, health blocks, or explanatory rails.
- Anti-AI-slop: avoid fake governance domains, copied SaaS admin taxonomy, AI foundation claims, or visible routes that are not implemented.
- Operator workflow clarity: API access, notifications, templates/plugins, login/lock, config, and MCP alias rows must stay tied to current implemented routes or clearly marked foundation-only routes.
- Context visibility: translated row titles/copy can change, but route arrays, roadmap-only docs, forbidden future app routes, and current-route-only navigation policy remain unchanged.

## Alert Notice Product Copy Boundary - 2026-05-06

- Hierarchy: keep the notification workbench as the existing receiver/rule/template tabbed console with metrics, lane rows, dense tables, and edit dialogs in the same structure.
- Density: preserve current compact metric cards, lane row summaries, status copy, row fallbacks, and editor placeholders without adding explanatory rails or new delivery health panels.
- Anti-AI-slop: avoid fake delivery guarantees, copied incident-routing product language, or invented notification channels while moving visible product copy behind runtime messages.
- Operator workflow clarity: receiver targets, template previews, rule delivery state, enabled/disabled state, and placeholder examples must remain tied to real form fields and current backend resources.
- Context visibility: translated copy can vary by locale, but receiver/rule/template IDs, selected rows, channel type keys, route query state, and evidence-return context remain unchanged.
- Receiver target fallback update: preserve the receiver table's channel type, target cell, timestamps, row actions, selected state, and tab density while moving only missing target facts into the shared localized fallback.
- Template preview fallback update: preserve plain-text preview normalization, raw-template redaction, preset/custom metadata, and dense template rows while moving only empty preview fallback text into the shared localized fallback.
- Rule receiver fallback update: preserve the rule table's policy name, receiver column, template column, switches, row actions, and evidence-triggered rule tab while moving only empty receiver lists into the existing localized no-receiver state.
- Evidence labels fallback update: preserve the signal-route evidence strip, return link, context rows, and prefill attribute visibility while moving only empty generated label text into the shared localized fallback.
- Type badge fallback update: preserve receiver/template type badge placement, receiver-option labels, template rows, channel names, and dense tab rhythm while moving only absent type facts into the shared localized fallback.

## Alert Silence Authoring Field Copy Boundary - 2026-05-06

- Hierarchy: keep the silence authoring modal as the existing compact field grid with match labels, time bounds, selected alert evidence, and validation feedback in place.
- Density: preserve the current label-record input and time field rhythm without adding helper rails, preview cards, or extra silence guidance.
- Anti-AI-slop: avoid fake suppression intelligence, invented silence taxonomy, or copied incident-routing prose while moving only placeholder/start/end labels behind runtime messages.
- Operator workflow clarity: label key/value placeholders and start/end time labels must stay attached to the actual label matcher and time inputs used by create/edit silence rules.
- Context visibility: translated copy can vary, but matcher structure, field names, rule payload, incoming alert context, and selected-label evidence remain unchanged.

## Alert Inhibit Authoring Field Copy Boundary - 2026-05-06

- Hierarchy: keep the inhibit authoring form as the existing single-column source/target/equal-label rule builder with shortcut pills, preview labels, and validation feedback in place.
- Density: preserve the current label-record inputs and compact equal-label tag input without adding helper rails, comparison cards, or extra inhibit guidance.
- Anti-AI-slop: avoid fake suppression intelligence, invented inhibit policy taxonomy, or copied incident-routing prose while moving only field placeholder examples behind runtime messages.
- Operator workflow clarity: source label, target label, and equal-label placeholders must remain attached to the actual inputs that shape create/edit inhibit rule payloads.
- Context visibility: translated copy can vary, but matcher structure, source/target/equal field names, shortcut behavior, incoming alert context, and selected-label evidence remain unchanged.

## Alert Group Authoring Field Copy Boundary - 2026-05-06

- Hierarchy: keep the group authoring form as the existing single-column grouping rule builder with enable state, group-label selector, wait, interval, and repeat cadence controls.
- Density: preserve the compact tag input and numeric cadence controls without adding helper rails, grouping previews, or extra policy guidance.
- Anti-AI-slop: avoid fake grouping intelligence, invented notification taxonomy, or copied incident-routing prose while moving only the group-label placeholder example behind runtime messages.
- Operator workflow clarity: the grouping-label placeholder must remain attached to the actual tag input that shapes create/edit group rule payloads.
- Context visibility: translated copy can vary, but field names, label-key suggestions, cadence values, route context, and rule edit/create structure remain unchanged.

## Alert Notice Rule Label Field Copy Boundary - 2026-05-06

- Hierarchy: keep the notification rule authoring modal as the existing aligned receiver, template, filter, label matcher, schedule, time, and enable-state field stack.
- Density: preserve the compact searchable label-record input without adding helper rails, routing previews, or extra notification guidance.
- Anti-AI-slop: avoid fake routing intelligence, invented receiver taxonomy, or copied incident-routing prose while moving only the label value placeholder behind runtime messages.
- Operator workflow clarity: the label key example and value placeholder must stay attached to the label matcher that shapes create/edit notice rule payloads.
- Context visibility: translated copy can vary, but label options, receiver/template filtering, schedule values, evidence-return context, and rule edit/create structure remain unchanged.

## Status Setting Dialog Field Copy Boundary - 2026-05-06

- Hierarchy: keep the status settings console as the existing org form, component table, incident table, and compact create/edit dialogs.
- Density: preserve the current two-column dialog grids and dense admin table rhythm without helper rails, summary cards, or extra status explanations.
- Anti-AI-slop: avoid fake uptime claims, invented public-status taxonomy, or copied SaaS status-page prose while moving only placeholder examples behind runtime messages.
- Operator workflow clarity: method, state, label, and component-id placeholders must remain attached to the actual fields that shape component and incident payloads.
- Context visibility: translated copy can vary, but numeric state/method conventions, labels, incident component ids, public status href, and save/delete behavior remain unchanged.

## Status Setting Evidence View Model Copy Boundary - 2026-05-07

- Hierarchy: keep status facts, component rows, incident rows, and organization overview rows in the existing status settings console evidence stack.
- Density: preserve compact label/value facts and row meta strings without adding health summaries, uptime claims, or secondary evidence rails.
- Anti-AI-slop: avoid fake public-status readiness, invented incident confidence, copied status-page product prose, or synthetic component health while moving only evidence labels/state copy behind runtime messages.
- Operator workflow clarity: state labels, workspace labels, and feedback labels must remain tied to real component/org/incident payload values and existing row placement.
- Context visibility: translated copy can vary, but component count, incident count, row keys, timestamps, org links, selected mode, and save/delete control flow remain unchanged.

## Status Setting Component Evidence Fallback Boundary - 2026-05-09

- Hierarchy: keep component rows and selectable component evidence rows in the existing status settings console evidence stack.
- Density: preserve the compact title, copy, and state/time meta rhythm without adding description warnings, helper rails, or empty-detail badges.
- Anti-AI-slop: do not invent component descriptions, ownership, uptime, endpoints, or health when description data is absent.
- Operator workflow clarity: real component descriptions remain authoritative; blank descriptions use the shared runtime empty marker in the existing copy slot.
- Context visibility: component names, states, timestamps, row keys, incident rows, org overview, and save/delete control flow remain unchanged.

## Status Setting Org Link Fallback Boundary - 2026-05-09

- Hierarchy: keep organization profile and feedback links in the existing org overview row instead of creating a secondary contact panel.
- Density: preserve the compact title, copy, and state/time meta rhythm without adding helper text, badges, or fake support channels.
- Anti-AI-slop: do not invent home URLs, feedback addresses, ownership, uptime, public support routes, or synthetic contact guidance when org links are absent.
- Operator workflow clarity: real home and feedback values remain authoritative; blank or whitespace-only links use the shared runtime empty marker in the existing copy slot.
- Context visibility: organization name, description, state, timestamps, component rows, incident rows, public status handoff, and save/delete control flow remain unchanged.

## Status Setting Empty Row Meta Fallback Boundary - 2026-05-09

- Hierarchy: keep empty component and incident rows in the existing status settings evidence list rather than adding a separate empty-state panel.
- Density: preserve the compact title, copy, and meta rhythm without adding badges, helper rails, or fake readiness summaries.
- Anti-AI-slop: do not invent component health, incident status, timestamps, ownership, uptime, or public-support context when the backend returns no rows.
- Operator workflow clarity: empty component/incident title and copy remain translated by their existing keys; the meta slot uses the shared runtime empty marker.
- Context visibility: selected mode, org overview, component/incident tables, public status handoff, and save/delete control flow remain unchanged.

## Status Setting Incident Title Fallback Boundary - 2026-05-09

- Hierarchy: keep incident list rows and selectable incident evidence rows in the existing status settings evidence stack.
- Density: preserve the compact title, copy, and state/component/time meta rhythm without adding incident cards, confidence badges, or helper rails.
- Anti-AI-slop: do not invent incident names, ids, ownership, impact, uptime, or remediation context when incident identity data is absent.
- Operator workflow clarity: real incident names and ids remain authoritative; absent id markers use the shared runtime empty marker inside the existing fallback title.
- Context visibility: latest incident messages, state labels, component counts, timestamps, row keys, org overview, component rows, and save/delete flow remain unchanged.

## Status Setting Component Description Placeholder Boundary - 2026-05-09

- Hierarchy: keep the component description field in the existing create/edit component dialog as the full-width field under component identity and state controls.
- Density: preserve the compact two-column dialog rhythm and single full-width description row without adding helper rails, preview cards, or extra status-page guidance.
- Anti-AI-slop: do not invent component taxonomy, endpoints, uptime, owners, or example domains while moving only the description placeholder behind a dedicated runtime key.
- Operator workflow clarity: the description placeholder must describe the component description payload, not reuse the component name hint.
- Context visibility: component name, method, state, labels, save/cancel behavior, validation, table rows, and public status handoff remain unchanged.

## Bulletin Manage Dialog Field Copy Boundary - 2026-05-06

- Hierarchy: keep the bulletin manage dialog as the existing name, monitor type, monitor ids, and metrics JSON authoring stack.
- Density: preserve the current two-column field rhythm and full-width JSON editor without helper rails, sample cards, or extra bulletin guidance.
- Anti-AI-slop: avoid fake bulletin analytics, invented monitor selection semantics, or copied status-board prose while moving only the monitor-id placeholder behind runtime messages.
- Operator workflow clarity: the monitor-id example must remain attached to the field that shapes bulletin monitor bindings.
- Context visibility: translated copy can vary, but monitor id parsing, app type, metrics JSON editor, save/cancel behavior, and bulletin dialog chrome remain unchanged.

## Entity Editor Relation Placeholder Boundary - 2026-05-06

- Hierarchy: keep the relation stage inside the existing entity editor body, after signals and before the definition preview path.
- Density: preserve the compact two-column relation fields and inline label editor without helper rails, topology previews, or extra relationship guidance.
- Anti-AI-slop: avoid fake dependency inference, invented service-map copy, or copied topology product language while moving only placeholder examples behind runtime messages.
- Operator workflow clarity: component, implementation, and language placeholder examples must stay attached to the fields that shape entity relation arrays.
- Context visibility: translated copy can vary, but component arrays, implemented-by arrays, language arrays, labels, and save payload behavior remain unchanged.

## Entity Editor Attribution Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep telemetry attribution rows inside the existing entity editor attribution panel; changing fallback locale order must not add ownership scorecards, source rails, topology previews, or save blockers.
- Density: preserve the compact five-row attribution rhythm for identity, monitor binding, owner, system/environment, and discovery return.
- Anti-AI-slop: do not invent identity confidence, monitor readiness, owner policy, telemetry health, or copied service-catalog governance prose while correcting fallback order.
- Operator workflow clarity: default attribution copy resolves from runtime messages with an English fallback when no caller locale is available; row state still derives from real identities, monitor binds, owner/system/environment fields, and discovery href.
- Context visibility: row keys, state values, meta evidence, discovery return URL, preview payload, and save payload behavior remain unchanged.

## Passport Shell Language Toggle Copy Boundary - 2026-05-06

- Hierarchy: keep the locale toggle in the existing passport shell header, above the same brand lockup and auth panel alignment.
- Density: preserve the single icon button and compact locale popover without adding helper text, auth guidance, or extra controls.
- Anti-AI-slop: avoid fake security claims, copied SaaS auth language, or decorative locale explanations while moving only the aria label behind runtime messages.
- Operator workflow clarity: the language affordance must remain attached to the current globe trigger and locale option list.
- Context visibility: translated copy can vary, but locale state, locale list, icon trigger markers, shell spacing, and panel layout remain unchanged.

## Alert Integration Mermaid Canvas Aria Boundary - 2026-05-07

- Hierarchy: keep the Mermaid canvas inside the existing alert-integration documentation figure, with pending/error render messages below the same SVG host.
- Density: preserve the single SVG host and compact render-state text without adding diagram toolbars, legends, or helper rails.
- Anti-AI-slop: avoid fake integration topology, copied diagram-product language, or invented remediation text while moving only the canvas aria label behind runtime messages.
- Operator workflow clarity: the accessible canvas label must remain attached to the real Mermaid SVG host rendered from existing integration markdown.
- Context visibility: translated copy can vary, but source markdown, render status markers, SVG host data marker, strict Mermaid rendering, and fallback behavior remain unchanged.

## Entity Definition Attribution Preview Copy Boundary - 2026-05-07

- Hierarchy: keep the attribution preview inside the current definition/import preview stack, below parsed definition rows and above the existing context rail.
- Density: preserve the compact attribution heading and row grid without adding validation summaries, relationship cards, or helper rails.
- Anti-AI-slop: avoid fake entity resolution, invented telemetry confidence copy, or copied catalog-validation language while moving only the attribution preview title behind runtime messages.
- Operator workflow clarity: the attribution title must stay attached to the actual parsed preview rows and row-level attribution state evidence.
- Context visibility: translated copy can vary, but preview row filtering, attribution state markers, row titles, and import/save payload behavior remain unchanged.

## Entity Definition Attribution State Badge Copy Boundary - 2026-05-07

- Hierarchy: keep attribution state badges inline with each parsed attribution row inside the existing preview evidence grid.
- Density: preserve the three compact state labels without adding score legends, validation summaries, or helper copy.
- Anti-AI-slop: avoid fake entity resolution confidence, invented governance scoring, or copied catalog-readiness language while moving only badge labels behind runtime messages.
- Operator workflow clarity: ready, missing, and unknown labels must remain tied to the real `attribute.state` values and existing badge tone classes.
- Context visibility: translated copy can vary, but `data-entity-import-attribution-state`, row evidence, preview filtering, and save/import payload behavior remain unchanged.

## Entity Definition Preview Metric Copy Boundary - 2026-05-07

- Hierarchy: keep the three preview metrics in the existing right context panel above definition queues, templates, and attribution evidence.
- Density: preserve the current compact inline-count rhythm without adding summary cards, helper rails, or fake readiness narratives.
- Anti-AI-slop: avoid invented import quality claims, copied catalog scoring language, or fake telemetry coverage while moving only the metric labels behind runtime messages.
- Operator workflow clarity: ready, attention, and telemetry-gap counts must stay tied to the actual parsed preview rows and gap keys.
- Context visibility: translated copy can vary, but ready-count, attention-count, telemetry-gap-count, icon choice, preview scoping, and import/save behavior remain unchanged.

## Entity Definition Fact Label Boundary - 2026-05-08

- Hierarchy: keep definition facts as compact route, format, activity, and template metadata owned by the view model; do not reintroduce the fact strip into the current surface or add a new summary layer.
- Density: preserve the short label/value rhythm so facts remain scannable if the workbench exposes them again.
- Anti-AI-slop: do not invent parser readiness, template health, import quality, or telemetry coverage while externalizing fixed labels.
- Operator workflow clarity: the fact values still come from entity id, selected format, activity count, and template count; only fixed label text moves behind runtime keys.
- Context visibility: definition editing, preview parsing, templates, activities, and save/import behavior remain unchanged.

## Entity Definition Current Preview Title Boundary - 2026-05-07

- Hierarchy: keep the current-definition title directly above the parsed preview queue rows in both definition and import modes.
- Density: preserve the compact section heading without adding status banners, helper text, or nested summary panels.
- Anti-AI-slop: avoid fake definition validation claims or invented catalog-health copy while moving only the section title behind runtime messages.
- Operator workflow clarity: the title must continue to label the real parsed preview rows and attribution preview that operators can scope by queue state.
- Context visibility: translated copy can vary, but preview-row grouping, row list rendering, attribution preview placement, and save/import behavior remain unchanged.

## Entity Definition Template Panel Copy Boundary - 2026-05-07

- Hierarchy: keep the custom-template panel in the existing right context rail below the parsed-preview metrics and feedback message.
- Density: preserve the compact title, error helper, and empty row-list rhythm without adding a template marketplace, readiness rail, or nested status card.
- Anti-AI-slop: avoid fake reusable-template health, invented catalog claims, or copied template-library positioning while moving only the template panel copy behind runtime messages.
- Operator workflow clarity: the panel title, recoverable-load helper, and empty state must stay attached to the real template rows and definition-error branch.
- Context visibility: translated copy can vary, but template list length, `buildTemplateRows(templates)`, recoverable error state, and save/import behavior remain unchanged.

## Entity Definition Batch Panel Copy Boundary - 2026-05-07

- Hierarchy: keep the template-and-batch panel directly after the custom-template panel in the right context rail.
- Density: preserve the compact title/helper/expand affordance without adding a second editor mode, workflow rail, or fake batch preview.
- Anti-AI-slop: avoid invented automation capabilities, fake template catalog status, or copied bulk-editor positioning while moving only the panel chrome copy behind runtime messages.
- Operator workflow clarity: the batch panel must remain a lightweight entry for templates, draft source, and optional actions without changing preview/save/import controls.
- Context visibility: translated copy can vary, but `data-entity-definition-batch-panel`, panel placement, definition-error behavior, and existing editor state remain unchanged.

## Entity Definition Activity Panel Copy Boundary - 2026-05-07

- Hierarchy: keep the recent-activity panel after parsed preview evidence and before entity entry links in the definition context rail.
- Density: preserve the compact heading and RowList empty state without adding timelines, audit summaries, or fake activity counts.
- Anti-AI-slop: avoid invented import activity, fake workflow progress, or copied audit-feed language while moving only panel title and empty-state copy behind runtime messages.
- Operator workflow clarity: real activity rows must still come from `buildActivityRows(activities, t)`, and the empty state should only explain where preview/import activity will appear.
- Context visibility: translated copy can vary, but definition-error hiding, activity row mapping, row metadata, and save/import behavior remain unchanged.
- Empty-row meta update: keep template and activity empty states in the same compact RowList slots while moving their metadata marker to shared `common.none`; do not add helper badges, fake activity health, or a second template summary.

## Entity Definition Entry Panel Copy Boundary - 2026-05-07

- Hierarchy: keep the entity entry panel as the final compact navigation block in the definition context rail after activity evidence.
- Density: preserve the two-link entry rhythm without adding breadcrumbs, route summaries, or explanatory navigation prose.
- Anti-AI-slop: avoid fake catalog status, copied navigation IA, or invented next-step guidance while moving only the panel title and link labels behind runtime messages.
- Operator workflow clarity: links must still route to the entity detail when an entity id exists and to the entity list/form fallback otherwise.
- Context visibility: translated copy can vary, but link hrefs, entry placement, definition-error behavior, and save/import state remain unchanged.

## Entity Definition Feedback Message Copy Boundary - 2026-05-07

- Hierarchy: keep validation, preview, save, import, and recoverable load feedback in the existing compact inline message slot above the definition context rail.
- Density: preserve one concise feedback line without adding status banners, toast stacks, helper rails, or fake parser-health summaries.
- Anti-AI-slop: avoid invented import confidence, fake catalog readiness, copied onboarding prose, or AI triage wording while moving only feedback/status copy behind runtime messages.
- Operator workflow clarity: empty-draft, preview count, blocked import, update, import, backend error mapping, and parse/load failures must remain tied to the existing preview/save/import control flow.
- Context visibility: translated copy can vary, but `messageTone`, `previewRows`, `definitionErrorState`, entity-id guards, and save/import payload behavior remain unchanged.

## Settings Console Layout Client Boundary - 2026-05-07

- Hierarchy: keep the existing cold settings console header, left settings menu, and content pane unchanged while shrinking only the route layout hydration boundary.
- Density: preserve the compact 260px navigation rail and single content panel without adding summary rails, nested cards, or extra settings descriptions.
- Anti-AI-slop: avoid fake system health, fake deployment status, copied admin-console IA, or invented settings domains while moving only the pathname/i18n shell into a client island.
- Operator workflow clarity: active menu state must still come from the real current pathname and menu labels from runtime messages.
- Context visibility: translated header copy, active route, menu hrefs, child route content, and `SettingsConsoleShell` markers remain unchanged.

## Bulletin Metrics Table Static Copy Boundary - 2026-05-07

- Hierarchy: keep App and Host as the first two fixed columns in the existing metrics desk table before dynamic metric groups.
- Density: preserve the compact two-row table header and per-cell badge treatment without adding summaries, helper rails, or fake metric status.
- Anti-AI-slop: avoid invented uptime/health claims, synthetic metric availability, copied dashboard language, or future-only bulletin evidence while moving only static header and no-data badge copy behind runtime messages.
- Operator workflow clarity: static labels must remain tied to the same monitor link column, host column, dynamic metric columns, and NO_DATA badge branch.
- Context visibility: translated copy can vary, but monitor links, host values, metric/field translation lookup, unit badges, and empty/error/loading states remain unchanged.

## Bulletin Metrics Empty Value Boundary - 2026-05-09

- Hierarchy: keep empty metric cells inside the existing metrics desk table cell rather than adding a secondary empty-state row or metric summary.
- Density: preserve the compact per-cell rhythm and NO_DATA badge treatment without helper rails, warnings, or fake health chips.
- Anti-AI-slop: do not invent metric readings, uptime, health, or synthetic availability when a monitor row lacks a metric/field value.
- Operator workflow clarity: absent metric values use the shared runtime empty marker while real NO_DATA fields keep their existing no-data badge branch.
- Context visibility: monitor links, host values, metric/field translation lookup, unit badges, loading/error/empty table states, and bulletin selection remain unchanged.

## Bulletin Validation And Metrics State Copy Boundary - 2026-05-09

- Hierarchy: keep bulletin form validation in the existing manage dialog and metrics empty/error feedback in the existing metrics panel.
- Density: preserve the compact bulletin management rhythm without secondary empty-state cards, helper rails, or notification-style health banners.
- Anti-AI-slop: do not infer metrics freshness, monitor reachability, app health, bulletin publish state, or backend recovery from localized empty/error copy.
- Operator workflow clarity: copy only distinguishes missing required inputs, empty metrics, and failed metrics loads; create/edit/delete, refresh, and tab selection stay unchanged.
- Context visibility: selected bulletin, app, monitor ids, metrics JSON, reload action, and current tab remain owned by the existing bulletin center surface.

## Bulletin Search All Label Boundary - 2026-05-09

- Hierarchy: keep the all-bulletins label inside the existing current-query/search summary, not as a new filter chip or helper row.
- Density: preserve the compact search and selected-board rhythm; only the locale-owned fallback label changes.
- Anti-AI-slop: do not infer bulletin count, search freshness, monitor health, or metrics availability from an empty query label.
- Operator workflow clarity: blank search still means all bulletin boards, while non-empty query text remains the raw operator-entered query.
- Context visibility: search text, selected id, tab state, refresh countdown, and metrics panel ownership remain unchanged.

## Bulletin Monitor Count Label Boundary - 2026-05-09

- Hierarchy: keep monitor counts inside the existing row and selected-summary copy line rather than promoting them to a separate metric card.
- Density: preserve the compact app-plus-monitor-count rhythm; only the locale-owned noun label changes.
- Anti-AI-slop: do not imply monitor health, freshness, binding quality, or availability from the count label.
- Operator workflow clarity: the count remains the raw bound-monitor id length while app identity and empty-value handling stay unchanged.
- Context visibility: selected id, tabs, fields count, metrics table ownership, refresh cadence, and delete/edit actions remain unchanged.

## Bulletin Row Meta Label Boundary - 2026-05-09

- Hierarchy: keep creator and fields labels in the existing row meta and selected-summary title slots.
- Density: preserve the compact two-line row and selected-summary rhythm without adding label chips or helper copy.
- Anti-AI-slop: do not infer ownership, field health, dashboard quality, or metrics readiness from localized meta labels.
- Operator workflow clarity: creator text remains the backend creator value and fields count remains the selected bulletin field-key count.
- Context visibility: row title, app, monitor count, selected id, refresh state, metrics table, and edit/delete actions remain unchanged.

## Bulletin Metrics Identity Fallback Boundary - 2026-05-09

- Hierarchy: keep missing monitor and host identity inside the first two fixed metrics table columns, before dynamic metric groups.
- Density: preserve the compact monitor-link and host-cell rhythm without adding identity warning badges, helper rows, or secondary diagnostics.
- Anti-AI-slop: do not invent monitor names, host names, service labels, ownership, or availability when bulletin metrics identity data is absent.
- Operator workflow clarity: real monitor and host values remain authoritative; blank identity values use the shared runtime empty marker in the existing cells.
- Context visibility: monitor ids, monitor detail links, metric/field columns, unit badges, NO_DATA badges, empty metric cells, loading/error/empty table states, and bulletin selection remain unchanged.

## Bulletin Row Title Fallback Boundary - 2026-05-09

- Hierarchy: keep bulletin identity in the existing row title and selected-summary title slots rather than creating a separate missing-name state.
- Density: preserve the compact bulletin list and selected-detail rows without adding warning chips, helper copy, or secondary identity rails.
- Anti-AI-slop: do not invent bulletin names, monitor groups, ownership, health, or dashboard intent when a bulletin name is absent.
- Operator workflow clarity: real bulletin names remain authoritative; blank row and selected titles use the shared runtime empty marker in the existing title slots.
- Context visibility: row keys, app facts, monitor counts, creator/update meta, selected fields summary, delete dialog name fallback, metrics table, and refresh behavior remain unchanged.

## Bulletin Current Name Fallback Boundary - 2026-05-09

- Hierarchy: keep the current bulletin name in the existing fact strip and delete-confirmation modal title context.
- Density: preserve the compact fact strip and cold delete modal without adding missing-name warnings, helper rails, or secondary identity summaries.
- Anti-AI-slop: do not invent bulletin names, monitor groups, ownership, dashboard intent, or safe-delete claims when the current bulletin name is absent.
- Operator workflow clarity: real current bulletin names remain authoritative; blank and whitespace-only names use the shared runtime empty marker before deletion or selected-fact display.
- Context visibility: selected id, row keys, delete action, batch delete state, metrics reload, refresh controls, tabs, and bulletin payload behavior remain unchanged.

## Bulletin Delete Confirmation Copy Boundary - 2026-05-09

- Hierarchy: keep destructive bulletin copy inside the existing cold modal title, body, and primary action slots.
- Density: preserve the compact confirmation modal without adding secondary warnings, helper panels, or duplicate delete summaries.
- Anti-AI-slop: do not claim safe deletion, automatic recovery, monitor health, or metrics preservation beyond the existing selected-bulletin context.
- Operator workflow clarity: delete copy identifies removal from the current workspace and the need to reselect metrics context; cancel/delete actions remain unchanged.
- Context visibility: current bulletin name fallback, selected id, batch state, refresh behavior, metrics table, and manage dialog ownership remain unchanged.

## Entity Definition Editor Placeholder Copy Boundary - 2026-05-07

- Hierarchy: keep the format-specific placeholder inside the existing cold code editor, below the format selector and helper copy.
- Density: preserve one concise editor hint per YAML, JSON, and cURL mode without adding parser examples, helper rails, or onboarding prose.
- Anti-AI-slop: avoid invented schema guarantees, fake automation intelligence, copied import-product language, or future-only editor affordances while moving only placeholder hints behind runtime messages.
- Operator workflow clarity: placeholder copy must stay tied to the selected import/definition format and cannot change draft starter replacement, preview, save, or import control flow.
- Context visibility: translated copy can vary, but editor language resolution, placeholder placement, starter draft sync, format selector behavior, and parse payload format remain unchanged.

## Log Stream Detail Attribution Diagnostics Copy Boundary - 2026-05-07

- Hierarchy: keep attribution diagnostics inside the existing log detail drawer after facts and before row evidence.
- Density: preserve the compact hertzbeat.* diagnostic strip and two state badges without adding summary cards, helper rails, or extra triage copy.
- Anti-AI-slop: avoid fake entity resolution confidence, invented collection health, copied observability-product prose, or synthetic trace/entity evidence while moving only diagnostic chrome and state labels behind runtime messages.
- Operator workflow clarity: present and missing labels must stay tied to each diagnostic row's real state and existing tone classes.
- Context visibility: translated copy can vary, but trace id, selection state, fact rows, diagnostic row values/meta, toolbar badges, actions, row list, and JSON payload rendering remain unchanged.

## Log Related Trace Event Detail Copy Boundary - 2026-05-07

- Hierarchy: keep event facts inside the existing related-trace drawer, with the selected event header above the same RowList evidence stack.
- Density: preserve the compact waterfall-plus-300px-evidence layout without adding event summaries, helper rails, or trace triage prose.
- Anti-AI-slop: avoid fake root-cause language, invented span confidence, copied APM product copy, or synthetic trace evidence while moving only drawer/event labels behind runtime messages.
- Operator workflow clarity: event detail copy must remain tied to real span-event selection and the existing action that clears event selection back to the owning span.
- Context visibility: translated copy can vary, but selected span key, event key, offset, attributes, stage facts, toolbar badges, waterfall ticks, and row selection callbacks remain unchanged.

## Alert Notice Rule Field Chrome Copy Boundary - 2026-05-07

- Hierarchy: keep the notification rule form as the existing aligned label/control stack, with receiver, template, filter, label, period, weekday, time, and enable rows in the current order.
- Density: preserve the compact cold multi-select, switch, weekday checkbox, label-record, and shared time-range controls without adding helper rails or secondary summaries.
- Anti-AI-slop: avoid fake delivery guarantees, invented policy scoring, copied notification-SaaS language, or synthetic receiver/template explanations while moving only field chrome labels and weekday labels behind runtime messages.
- Operator workflow clarity: labels must remain tied to the same form rows, selected receiver/template filtering, filter-all switch, weekday selection, and time-range payload names.
- Context visibility: translated copy can vary, but draft state, receiver/template options, label matcher values, hidden inputs, switch markers, and `data-alert-notice-rule-*` markers remain unchanged.

## Entity Discovery Table Row Copy Boundary - 2026-05-07

- Hierarchy: keep discovery table rows inside the existing cold discovery table below the search row and policy strip, with clue, instance, status, owner, system, environment, attribution, and action columns unchanged.
- Density: preserve compact status and attribution chips without adding row summaries, confidence panels, or secondary action rails.
- Anti-AI-slop: avoid fake merge confidence, invented ownership scoring, copied service-catalog language, or synthetic entity evidence while moving only row status/activity/attribution/action copy behind runtime messages.
- Operator workflow clarity: row labels must remain tied to the real preset/search result branch, candidate merge/enrich/create/resolved state, and existing row href action target.
- Context visibility: translated copy can vary, but monitor ids, preset ids, candidate names, owner/system/environment values, attribution state markers, status tone, and row action hrefs remain unchanged.
- Empty-governance update: keep missing owner/system/environment/instance cells in the same table columns while moving blank-cell markers to shared `common.none`; matched/create metrics must derive from attribution state, not localized empty-cell text.

## Entity Import Attribution Activity Copy Boundary - 2026-05-07

- Hierarchy: keep attribution preview rows, template rows, and recent activity rows in the existing definition/import workspace context panels without changing their order or surrounding editor controls.
- Density: preserve compact state badges, activity metadata, and row summaries without adding import scorecards, confidence rails, or onboarding copy.
- Anti-AI-slop: avoid fake import confidence, invented catalog scoring, copied service-catalog language, or synthetic telemetry evidence while moving only attribution/activity/source labels behind runtime messages.
- Operator workflow clarity: labels must remain tied to real attribution state, template source, activity status, and activity summary replacements from the import controller payload.
- Context visibility: translated copy can vary, but entity ids, monitor binds, source metadata, activity detail values, preview/import/save payload paths, and existing row placement remain unchanged.
- Preview queue copy boundary update: keep import metrics, gap labels, readiness state, telemetry-binding labels, and ready/attention/telemetry queue grouping in the existing import view-model while moving only remaining fallback copy behind runtime messages; do not add import scorecards, fake readiness, copied catalog-import wording, or new summary rails.
- Empty-value fallback update: keep missing template copy/format/source, activity title/detail/status/format, and preview entity title as compact row metadata inside the existing import workspace while moving empty markers to shared `common.none`; do not add helper legends, fake import health, or new navigation.

## Entity Detail Fallback Copy Boundary - 2026-05-07

- Hierarchy: keep the recoverable fallback detail data inside the existing entity detail workbench, feeding the same header, description, and next-action panels as a real detail response.
- Density: preserve one temporary description and one definition next action without adding fake health, fake evidence, or extra recovery panels.
- Anti-AI-slop: avoid synthetic status claims, invented monitor/log/trace evidence, or copied service-catalog recovery prose while moving only fallback display/description/action copy behind runtime messages.
- Operator workflow clarity: fallback copy must remain tied to recoverable missing-detail responses and the real definition workspace handoff.
- Context visibility: translated copy can vary, but entity id normalization, fallback owner/system/environment/source fields, zero evidence summaries, and recoverable-error behavior remain unchanged.

## Collector Health Evidence Copy Boundary - 2026-05-07

- Hierarchy: keep collector health evidence as the compact shared strip in collector management and the existing collection-health row inside entity detail.
- Density: preserve one title, one copy line, one meta badge, and one freshness badge without adding health dashboards, scorecards, or synthetic collector diagnostics.
- Anti-AI-slop: avoid fake collection readiness, invented task status, copied infra-health prose, or future-only collector claims while moving only shared health evidence copy behind runtime messages.
- Operator workflow clarity: cluster evidence must remain tied to real collector counts and task counts; monitor fallback evidence must remain tied to bound-monitor health when collector counts are missing.
- Context visibility: translated copy can vary, but tone calculation, count clamping, last-seen/evidence fallback, and collector/entity surface placement remain unchanged.

## Collector Health Evidence Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep collector health evidence as the same compact title/copy/meta/freshness strip in collector management and entity detail; changing fallback locale order must not add dashboards, scorecards, health cards, or topology panels.
- Density: preserve the one-line evidence rhythm and badge count density so collector and entity surfaces stay scan-friendly.
- Anti-AI-slop: do not invent collection readiness, task diagnostics, synthetic monitor health, future collector states, or copied infra-console wording while correcting fallback order.
- Operator workflow clarity: shared health copy resolves from runtime messages with an English fallback when no caller locale is available; cluster evidence still derives only from collector/task counts and monitor fallback evidence still derives only from bound-monitor health.
- Context visibility: tone calculation, count clamping, last-seen/evidence fallback, translator injection, and collector/entity surface placement stay unchanged.

## Log Manage Selected Attribution Diagnostics Copy Boundary - 2026-05-07

- Hierarchy: keep selected-log attribution diagnostics inside the existing selected log evidence rail, below facts and before JSON/related evidence controls.
- Density: preserve the compact hertzbeat.* diagnostic strip and state badge rhythm without adding attribution summary cards, helper rails, or fake entity-resolution confidence.
- Anti-AI-slop: avoid invented entity resolution, fake collector health, copied observability product prose, or synthetic trace/entity evidence while moving only panel aria/title/state labels behind runtime messages.
- Operator workflow clarity: present/missing labels must stay tied to each diagnostic row's real state and existing tone classes.
- Context visibility: translated copy can vary, but row keys, values, meta, selected log facts, actions, trace/entity handoffs, and stream/history selection state remain unchanged.

## Trace Event And Link Evidence Copy Boundary - 2026-05-07

- Hierarchy: keep trace event markers inside the existing waterfall and selected-span event/link rows inside the current drawer evidence stack.
- Density: preserve compact event dots, selected-span facts, and five-row evidence limits without adding root-cause summaries, confidence rails, or extra trace triage copy.
- Anti-AI-slop: avoid invented span meaning, fake causality, copied APM prose, or synthetic event attributes while moving only fallback event/link/attribute labels behind runtime messages.
- Operator workflow clarity: unnamed-event, related-link, empty-attributes, overflow-count, and object-attribute labels must stay tied to the real span event/link payloads.
- Context visibility: translated copy can vary, but span ids, trace ids, event offsets, attributes, selected event callbacks, waterfall geometry, and handoff links remain unchanged.

## Exception Center Kubernetes Filter Copy Boundary - 2026-05-07

- Hierarchy: keep Kubernetes deployment and pod filters in the existing left filter rail beside service, host, cluster, and namespace filters.
- Density: preserve compact empty-filter rows without adding Kubernetes summaries, helper copy, or decorative infrastructure panels.
- Anti-AI-slop: avoid fake K8s discovery status, synthetic cluster evidence, copied APM filter prose, or future-only workload claims while moving only filter labels behind runtime messages.
- Operator workflow clarity: deployment and pod labels must remain simple filter dimensions tied to the same exception query sidebar and empty-filter affordance.
- Context visibility: translated copy can vary, but filter order, values, empty-state row behavior, and exception table/query context remain unchanged.

## Trace Attribution Diagnostic Row Copy Boundary - 2026-05-07

- Hierarchy: keep hertzbeat.entity_id, entity_name, workspace_id, collector, and template diagnostics inside the existing trace attribution panel.
- Density: preserve one compact meta line per diagnostic row without adding confidence scores, RCA summaries, or helper rails.
- Anti-AI-slop: avoid fake entity resolution, invented collector status, copied APM product language, or synthetic source evidence while moving only row meta copy behind runtime messages.
- Operator workflow clarity: present and missing meta must stay tied to the same real attribute lookup and the existing present/missing badge state.
- Context visibility: translated copy can vary, but diagnostic keys, route-context fallback order, values, state tones, and trace/span evidence remain unchanged.

## Entity Discovery Governance Card Copy Boundary - 2026-05-07

- Hierarchy: keep governance cards, scope filters, queue groups, and bulk override chips as the existing discovery view-model outputs without adding a new discovery page surface.
- Density: preserve compact risk, next-action, candidate, queue, and bulk override labels without adding confidence scorecards, helper rails, or service-catalog prose.
- Anti-AI-slop: avoid fake merge certainty, invented ownership scoring, copied service-catalog language, or synthetic governance evidence while moving only visible governance card/queue labels behind runtime messages.
- Operator workflow clarity: labels must remain tied to the real resolved/merge/enrich/create state machine, candidate preset matching, scope counts, and existing action hrefs.
- Context visibility: translated copy can vary, but monitor ids, candidate names, owner/system/environment context, sample titles, card keys, selected bulk payload, and action kinds remain unchanged.

## Entity Discovery Facts Metrics Catalog Copy Boundary - 2026-05-07

- Hierarchy: keep discovery facts, metrics, and catalog rows as compact view-model evidence that can be reused by the existing discovery workspace without adding panels or navigation.
- Density: preserve four facts, four metrics, and three catalog rows with the current count/value rhythm and no helper rails, confidence scorecards, or onboarding prose.
- Anti-AI-slop: avoid fake catalog health, invented governance completion, copied service-catalog language, or synthetic discovery readiness while moving only labels, ready/empty state copy, count meta, and empty copy behind runtime messages.
- Operator workflow clarity: labels must remain tied to the real preset, activity, owner, system, and environment counts already computed by the view model.
- Context visibility: translated copy can vary, but row order, count math, preset-coverage tone, workspace value, catalog list values, and catalog empty fallback behavior remain unchanged.

## Monitor Manage Row Scrape Meta Copy Boundary - 2026-05-07

- Hierarchy: keep the monitor scrape metadata inside the existing row evidence extra line beside app/status, not as a new column, filter, or helper panel.
- Density: preserve the compact `app · collection-mode value` rhythm in the list row and do not add secondary descriptions or monitor-template onboarding copy.
- Anti-AI-slop: avoid fake collection health, invented scrape explanations, copied infrastructure inventory language, or synthetic monitor evidence while moving only the visible scrape label behind runtime messages.
- Operator workflow clarity: the label must stay tied to the real `item.scrape` value already returned by the monitor list payload and must not change selection, detail navigation, batch actions, or export/import flows.
- Context visibility: translated copy can vary, but monitor id, app, instance fallback, status badge, row checkbox, selected-id behavior, and detail href remain unchanged.
- Identity fallback update: preserve monitor search, dense list rows, selected rail, row status tone, row selection, and detail handoff while moving only absent app/instance/scrape row markers into the shared localized fallback; do not add fake monitor readiness, collector coverage summaries, or extra rails.
- Empty-label rail update: preserve the selected monitor rail and label evidence slot even when no labels exist, using the shared localized fallback for the empty meta marker without changing selected monitor JSON, controls, or row density.
- Empty-selected rail update: preserve selected-monitor rail placement, no-selection copy, controls, and route handoffs while moving only the no-selection meta marker into the shared localized fallback; do not add fake monitor status, helper panels, or new navigation.
- Selected-identity rail update: preserve selected monitor name, status meta, label count, controls, JSON preview, and detail/edit/new handoffs while moving only absent selected app/instance facts into the shared localized fallback; do not add fake inventory health or rail summaries.

## Monitor Manage Transfer Failure Feedback Copy Boundary - 2026-05-07

- Hierarchy: keep export/import transfer errors inside the existing monitor manage controls feedback area, not a new modal, toast rail, or diagnostics panel.
- Density: preserve one concise failure line with the HTTP status value and no extra recovery prose or backend speculation.
- Anti-AI-slop: avoid fake import/export completion, invented network diagnosis, copied backup-product language, or synthetic monitor state while moving only HTTP failure copy behind runtime messages.
- Operator workflow clarity: feedback must remain tied to the same export/import fetch response branch, selected/all export actions, file-import action, and `actionError` rendering path.
- Context visibility: translated copy can vary, but HTTP status, Authorization/Accept-Language headers, file payload, reload behavior, success messages, fallback filenames, and existing control placement remain unchanged.

## Setting Message Server Apply Feedback Copy Boundary - 2026-05-07

- Hierarchy: keep email/SMS save feedback as the existing compact message line below the settings summary, not a toast stack, modal alert, or new status rail.
- Density: preserve one success/error line and the current `messageTone` treatment without adding delivery diagnostics, provider health summaries, or troubleshooting prose.
- Anti-AI-slop: avoid fake notification delivery guarantees, invented provider state, copied SaaS settings language, or synthetic receiver status while adding only local runtime copy for the existing apply feedback keys.
- Operator workflow clarity: feedback must stay tied to `saveEmail`, `saveSms`, the same `apiMessagePost` controller calls, dialog close behavior, and fallback error handling.
- Context visibility: translated copy can vary, but email/SMS drafts, SMS snapshot restore, disabled save conditions, summary rows, and settings console placement remain unchanged.

## Entity List Status Tone Boundary - 2026-05-07

- Hierarchy: keep status tone inside the existing dense entity table status badge and fallback progress line, without adding a new health legend, scorecard, or side rail.
- Density: preserve the compact badge treatment and 40%/20% incomplete-progress fallback rhythm without adding explanation copy.
- Anti-AI-slop: avoid fake entity health, invented catalog confidence, copied service-catalog language, or translated-string business logic while moving status tone to stable view-model data.
- Operator workflow clarity: status color and fallback progress must derive from the raw entity status, not localized labels, so search, refresh, links, health affordance, and evidence rows remain unchanged.
- Context visibility: translated status text can vary by locale, but `statusTone`, row hrefs, monitor/alert/relation evidence, health affordance, and table placement remain stable.

## Entity Detail Row Tone Boundary - 2026-05-07

- Hierarchy: keep tone only on the existing entity detail row meta chips inside overview, health, alert, related, relationship, source, and next-action panels.
- Density: preserve the compact row stack and existing badge dimensions without adding a health legend, severity sidebar, scorecard, or explanatory copy.
- Anti-AI-slop: avoid fake health, invented severity, copied APM language, or localized-string status logic while moving tone decisions to stable view-model data.
- Operator workflow clarity: row tone must derive from raw entity status and evidence counts so inherited context, handoff links, delete/refresh actions, and panel order remain unchanged.
- Context visibility: translated labels can vary, but row title/copy/meta placement, collector freshness, hrefs, alert evidence, relationship evidence, and context handoffs remain stable.

## Entity Health Affordance Status Boundary - 2026-05-07

- Hierarchy: keep the lightweight health affordance in the existing entity list and topology node health locations without adding a new health panel or severity legend.
- Density: preserve the compact score, collected-health copy, and alert/anomaly meta line; no additional remediation copy or score explanation.
- Anti-AI-slop: avoid fake entity health, translated-label business logic, invented SLO semantics, or copied service-catalog scoring while normalizing raw status aliases in the shared helper.
- Operator workflow clarity: status penalty must use stable raw status values so entity list rows and topology nodes score consistently across locales.
- Context visibility: translated health copy can vary, but score math, monitor/alert/trace/log inputs, tone thresholds, entity links, and topology placement remain unchanged.

## Entity Health Affordance Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep the lightweight score/copy/meta affordance exactly where entity list rows and topology nodes already render it; changing fallback locale order must not add health panels, legends, scorecards, or remediation rails.
- Density: preserve one score label, one collected/waiting line, and one alert/anomaly meta line without expanding the row height or topology node chrome.
- Anti-AI-slop: do not invent health status, SLO semantics, remediation advice, fake monitor data, or copied service-catalog wording while correcting the fallback order.
- Operator workflow clarity: default health copy resolves from runtime messages with an English fallback when no caller locale is available; score math remains derived only from raw monitor, alert, trace, log, and status inputs.
- Context visibility: score, scoreText, tone, monitor counts, alert/anomaly counts, status penalties, entity links, and topology placement remain unchanged.

## Collector Status Tone Boundary - 2026-05-07

- Hierarchy: keep collector online/offline status as the existing compact table badge next to row health and last-seen evidence, without adding summary rails or secondary status blocks.
- Density: preserve the dense cluster table, fixed columns, and icon row actions so collector operations remain one-scan and batch-friendly.
- Anti-AI-slop: avoid translated-label business logic, fake collector health states, invented cluster semantics, or copied inventory-console status treatments.
- Operator workflow clarity: badge tone must come from raw collector status/online data so localized online/offline labels can change without changing row color or next action.
- Context visibility: translated status copy can vary, but row mutation controls, health evidence, freshness, and cluster-level context stay aligned with the same collector payload.

## Public Status Badge Tone Boundary - 2026-05-07

- Hierarchy: keep component and incident state tone on the existing public status badges, without adding a status legend, summary rail, or marketing-style health claim.
- Density: preserve the compact component rows, incident summary rows, and incident timeline badges so public operators can scan state without extra explanatory copy.
- Anti-AI-slop: avoid component-local status interpretation, translated-string business logic, fake uptime/incident health, or copied SaaS status-page semantics while moving only tone ownership to the status-center view model.
- Operator workflow clarity: badge tone must come from normalized component and incident state data so localized labels, public colors, and UI shell rendering remain stable across locales.
- Context visibility: translated labels and admin-provided colors can vary, but component history, incident card, timeline content, and public status shell placement must stay aligned with the same status-center payload.

## Status Setting Admin Tag Tone Boundary - 2026-05-07

- Hierarchy: keep component and incident state tone inside the existing dense admin tables, without adding summary rails, legends, or public-status preview cards.
- Density: preserve compact Tag badges, fixed table columns, icon row actions, search, and dialog rhythm so status administration remains one-scan and form-first.
- Anti-AI-slop: avoid component-local state interpretation, fake service health, invented incident lifecycle claims, or copied status-page admin semantics while moving only tone buckets to the setting-status view model.
- Operator workflow clarity: admin badge tone must derive from normalized component/incident states so localized labels and table rendering remain stable when state copy changes.
- Context visibility: labels, timestamps, row actions, component bindings, incident messages, and public-status handoff stay in the same table positions while tone becomes data-layer output.

## Trace Route Status Tone Boundary - 2026-05-07

- Hierarchy: keep trace status tone on the existing dense trace-list badge, without adding a severity legend, trace-health rail, or extra evidence panel.
- Density: preserve one compact status badge per row and the current table rhythm so operators can scan errors, services, durations, and trace IDs together.
- Anti-AI-slop: avoid page-local status parsing, fake trace health, invented lifecycle states, copied APM severity semantics, or translated-string status logic while moving tone ownership to trace view-model data.
- Operator workflow clarity: badge tone must derive from normalized trace status values so filtering, detail-drawer opening, selected-trace context, and cross-signal handoffs remain unchanged.
- Context visibility: translated headers and status text can vary, but row identity, service/root-span/duration columns, selected detail panel, and trace status color stay aligned with the same trace-list payload.

## Log Severity Tone Boundary - 2026-05-07

- Hierarchy: keep severity tone on the existing live-stream and history-list badges, without adding a severity legend, intake-quality panel, or alert-style status rail.
- Density: preserve compact row badges in the virtualized stream and dense history table so severity, service, timestamp, body, trace ID, and row actions remain one-scan.
- Anti-AI-slop: avoid page-local severity parsing, fake log health, invented severity lifecycle states, copied log-explorer semantics, or translated-string status logic while moving tone ownership to shared log display mapping and row model data.
- Operator workflow clarity: badge tone must derive from normalized log severity text/number so stream selection, detail dialog, trace preview, entity handoff, and history row navigation remain unchanged.
- Context visibility: translated headers and severity labels can vary, but stream row identity, retention/window markers, history row keys, trace/span handoffs, selected evidence, and badge color stay aligned with the same log payload.

## Overview Impacted Severity Tone Boundary - 2026-05-07

- Hierarchy: keep impacted-entity severity tone on the existing overview affected-items row badge, without adding a legend, health rail, or second status column.
- Density: preserve the compact two-column row with entity, owner, severity, and status in one scan; no new explanatory copy or extra badges.
- Anti-AI-slop: avoid component-local severity parsing, fake entity health, invented impact states, copied APM status language, or translated-string business logic while moving tone ownership into overview view-model data.
- Operator workflow clarity: row color must derive from normalized alert/degradation severity so drawer-first opening, entity links, browse-all action, and healthy filtering remain unchanged.
- Context visibility: translated severity/status labels can vary, but row identity, owner, last issue, status label, action target, and badge color stay aligned with the same overview payload.

## Overview Problem Focus Badge Tone Boundary - 2026-05-07

- Hierarchy: keep current-issue severity tone on the existing StageSection action badge, without adding a second alert header, severity legend, or status rail.
- Density: preserve one compact badge beside the current focus title so title, summary, entity, owner, and actions remain one-scan.
- Anti-AI-slop: avoid page-local severity parsing, fake current-issue health, invented incident lifecycle states, copied APM badge semantics, or translated-string business logic while moving tone ownership into overview view-model data.
- Operator workflow clarity: badge color must derive from normalized problem-focus severity so the drawer-first Details action, alert handoff, refresh flow, and healthy placeholder branch remain unchanged.
- Context visibility: translated severity labels can vary, but focus title, entity, owner, summary, StageSection placement, and badge color stay aligned with the same alert payload.

## Overview Detail Dialog Badge Tone Boundary - 2026-05-07

- Hierarchy: keep impacted-entity drawer status tone on the existing detail-dialog badge, without adding a secondary header, legend, or alert rail.
- Density: preserve one compact badge beside the drawer subtitle and description so owner/status sections stay scannable.
- Anti-AI-slop: avoid dialog-local severity parsing, fake health, invented impact lifecycle states, copied incident-management badge semantics, or translated-string business logic while passing tone from view-model data.
- Operator workflow clarity: badge color must follow selected impacted entity `severityTone` so row click, drawer title, last issue, owner/status sections, and close action remain unchanged.
- Context visibility: translated severity/status labels can vary, but selected entity identity, last issue, owner, status label, dialog placement, and badge color stay aligned with the same overview payload.

## Monitor Manage Status Badge Tone Boundary - 2026-05-07

- Hierarchy: keep monitor status tone on the existing row badge inside the manage list, without adding a new status column, legend, or summary rail.
- Density: preserve the compact row extra line with status badge, app, scrape value, and checkbox so batch operations remain one-scan.
- Anti-AI-slop: avoid page-local numeric status parsing, fake monitor health, invented lifecycle states, copied inventory-console semantics, or translated-string business logic while moving badge tone into monitor display mapping.
- Operator workflow clarity: badge color must derive from the raw monitor status number so selection, detail navigation, export/import, enable/pause/delete actions, and status labels remain unchanged.
- Context visibility: translated status labels can vary, but monitor id, app, scrape, status badge placement, checkbox selection, and detail href stay aligned with the same monitor row payload.

## Safe Automation Snapshot Catalog Labels - 2026-05-08

- Hierarchy: keep action catalog card name, category, scope, owner, and posture inside the existing compact snapshot cards, without adding a live-execution rail or extra governance copy.
- Density: preserve the three-card catalog rhythm so operators can scan action intent, target scope, owner, risk, last run, and roadmap-demo state without extra explanatory rows.
- Anti-AI-slop: avoid hardcoded English demo labels, fake live adapter status, invented execution confidence, or copied automation-product wording while moving only display labels behind runtime messages.
- Operator workflow clarity: localized catalog labels must still read as sample snapshot data under the adapter boundary, so users do not mistake roadmap examples for executable actions.
- Context visibility: raw ids, risk values, last-run timestamps, snapshot state, suggested-action handoffs, and adapter-boundary caveats stay stable while visible catalog copy becomes locale-owned.

## Safe Automation Snapshot Run Labels - 2026-05-08

- Hierarchy: keep run history name, target, actor, status, started time, duration, and snapshot marker in the existing compact rows, without adding a live-run rail or execution-adapter claim.
- Density: preserve one-line run copy and meta rhythm so operators can scan recent action outcomes beside the catalog and approval sections.
- Anti-AI-slop: avoid hardcoded English run examples, fake execution truth, invented success confidence, or copied automation-console language while moving only display labels behind runtime messages.
- Operator workflow clarity: localized run rows must remain explicitly sample snapshot data under the adapter boundary, not executable history from a live adapter.
- Context visibility: run ids, status enums, started timestamps, snapshot state, adapter caveat, and suggested-action handoffs stay stable while visible run copy becomes locale-owned.

## Explorer Signal Tone Boundary - 2026-05-07

- Hierarchy: keep signal color on the existing dense explorer signal badge in the result table, without adding a legend, filter rail copy, or secondary signal column.
- Density: preserve the compact trace/log/metric table rhythm so service, operation, status, duration, and timestamp remain one-scan.
- Anti-AI-slop: avoid page-local signal-key color decisions, fake cross-signal health, copied query-console styling semantics, or translated-label logic while moving signal tone ownership into explorer row data.
- Operator workflow clarity: badge color must follow stable signal row data so query controls, result rows, detail panel, and trace/log/metric/entity handoffs remain unchanged.
- Context visibility: translated signal labels can vary, but row identity, signal key, operation href, active detail row, and signal badge color stay aligned with the same explorer payload.

## Explorer Checklist Meta Labels - 2026-05-08

- Hierarchy: keep Explorer checklist meta as compact status text inside the existing cold workbench readiness list, not as a query progress tracker or adapter health panel.
- Density: preserve the three-row checklist and short meta rhythm beside title/copy rows without adding badges, counters, or helper rails.
- Anti-AI-slop: translate sample meta labels without implying live query adapters, completed cross-signal search, or real signal-link delivery.
- Operator workflow clarity: meta stays static convergence copy until backend-backed Explorer adapters and query persistence land.
- Context visibility: route entry ready, adapters next, and signal links reserved states remain visible while display labels become runtime-localized.

## Shell Navigation Runtime Labels - 2026-05-08

- Hierarchy: keep the sidebar IA exactly on the existing section and item rhythm, with labels resolved from route label keys rather than catalog fallback text.
- Density: preserve compact one-line section headings and nav rows without adding helper copy, badges, or route metadata in the rail.
- Anti-AI-slop: avoid English fallback labels leaking into localized navigation, stale alias wording, or copied SaaS navigation buckets while keeping route catalog metadata machine-readable.
- Operator workflow clarity: active route highlighting, icon mapping, and visible href order stay unchanged while display text remains runtime-localized.
- Context visibility: section keys, item keys, hrefs, and active state remain stable so navigation context stays visible across dashboard, ingestion, observability, alerting, objects, and settings.

## Setting Define Skeleton Seed Copy - 2026-05-08

- Hierarchy: keep the new-definition seed inside the existing YAML editor flow, with no extra onboarding panel, helper rail, or fake template marketplace state.
- Density: preserve one draft seed name and one summary annotation so the list, editor, preview, and datasource evidence remain compact.
- Anti-AI-slop: avoid "next migration" wording, generic placeholder copy, or migration-era implementation language leaking into operator-created alert definitions.
- Operator workflow clarity: the New action still creates an editable PromQL realtime-metric draft with stable period, threshold, labels, and enabled state.
- Context visibility: datasource, expression, severity label, preview route, save behavior, and selected draft state remain unchanged while visible seed copy becomes runtime-localized.

## Setting Define Skeleton Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the seed-name and summary assertion inside the existing controller regression; do not add a surface-only seed preview or template marketplace panel.
- Density: preserve the single controller test setup and compact skeleton payload assertions.
- Anti-AI-slop: do not invent new default alert templates, datasource readiness, preview status, or migration copy while moving the test onto the shared translator helper.
- Operator workflow clarity: controller tests should consume the same runtime/helper catalog keys as the setting-define page instead of maintaining a local seed-copy map.
- Context visibility: seed name, PromQL datasource, realtime metric type, expression, warning label, summary annotation, and save payload remain unchanged.

## Setting Define Current Fallback Copy - 2026-05-08

- Hierarchy: keep the current YAML filename chip and delete feedback inside the existing compact definition editor flow, without adding helper copy, a new empty panel, or a template status rail.
- Density: preserve the single filename label and one mutation message so search, list selection, editor content, preview, and datasource evidence remain one-scan.
- Anti-AI-slop: avoid hardcoded English fallback text leaking into localized operation, generic "current" copy that hides what object is being acted on, or fake default-definition status.
- Operator workflow clarity: fallback labels only cover missing datasource/name data and must not change selection, edit, preview, save, or delete feedback behavior.
- Context visibility: datasource/name still win when available, while the fallback filename and delete target become runtime-localized and stay tied to the same active definition payload.

## Entity List English Identity Label Boundary - 2026-05-08

- Hierarchy: keep entity type, local environment, and unknown status as compact row/table labels inside the existing entity catalog, without adding a legend, rail, or explanatory product copy.
- Density: preserve one-line row identity and table cells so service, owner, environment, health, counts, and evidence actions remain scannable.
- Anti-AI-slop: avoid English locale catalogs leaking Chinese fallback labels, fake status semantics, copied external inventory wording, or translated-string business logic.
- Operator workflow clarity: labels should change by locale only; search, filtering, row navigation, health affordance, and evidence handoffs stay bound to the same entity payload.
- Context visibility: entity id/name, raw type/status/environment values, status tone, health model, and row href remain stable while visible identity labels become locale-owned.
- Owner fallback update: keep the row identity rhythm `type · owner · environment` inside the existing table/list row while moving only absent owner markers into the shared localized fallback; do not add ownership helper panels, fake owner state, or new row actions.

## Overview Log Lane English Recommendation Copy - 2026-05-08

- Hierarchy: keep the log lane recommendation stat inside the existing overview investigation-lane row, without adding a new signal priority rail, legend, or helper panel.
- Density: preserve the compact lane title, eyebrow, copy, stat, and action rhythm so entities, logs, traces, metrics, and dashboard entries remain one-scan.
- Anti-AI-slop: avoid English locale catalogs leaking Chinese recommendation copy, fake signal priority, copied incident-console language, or translated-string routing logic.
- Operator workflow clarity: the stat still follows `topAlertHasTraceId`; only the visible English wording changes when logs are secondary to trace-first investigation.
- Context visibility: alert trace context, log href, trace href, lane order, and action labels remain stable while the log-lane stat becomes locale-owned.

## Entity List English Evidence Summary Copy - 2026-05-08

- Hierarchy: keep page metric cards, row meta, and selected-entity rail labels as compact evidence summaries inside the existing entity catalog, without adding legends, side rails, or explanatory product copy.
- Density: preserve one-line count and evidence text so entity identity, owner, environment, health, monitor counts, alert counts, relation counts, and handoff actions remain scannable.
- Anti-AI-slop: avoid English locale catalogs leaking Chinese fallback text, fake health semantics, copied inventory-console wording, or translated-string branching while moving only display text into locale-owned messages.
- Operator workflow clarity: evidence summary labels must change by locale only; search, filtering, selection, row navigation, and cross-signal handoffs stay bound to the same entity payload.
- Context visibility: entity id/name, raw counts, last-evidence time, selected rail identity/monitor/relation numbers, and definition activity state remain stable while visible evidence summaries become English-owned.
- Unselected rail update: preserve entity list filters, dense table, inline row actions, selected rail placement, and cross-signal handoffs while moving only the no-selection title/copy/meta marker into runtime messages; do not add fake entity health, helper panels, or onboarding prose.

## Entity List Abnormal Metric Data Boundary - 2026-05-08

- Hierarchy: keep the abnormal-object metric in the existing compact count strip, without adding a status legend, extra badge rail, or explanatory health panel.
- Density: preserve the four-metric row and dense entity table rhythm so total, abnormal, alerting, and linked counts remain one-scan above the list.
- Anti-AI-slop: avoid translated-label business logic, fake health semantics, or locale-specific status string comparisons while moving the abnormal count back to raw entity status data.
- Operator workflow clarity: healthy rows must remain healthy across English and Chinese labels; search, filtering, table rows, health affordance, and evidence handoffs stay bound to the same entity payload.
- Context visibility: translated status labels and status badge tone can vary, but the abnormal metric must follow raw entity status so page-level evidence does not drift from row-level context.

## Entity Display Mapping Fallback Copy - 2026-05-08

- Hierarchy: keep type and status labels as compact row/table identity text in the entity catalog, without adding a fallback legend, locale helper, or explanatory product copy.
- Density: preserve one-line entity identity and status cells so object, owner, environment, health, counts, and next actions remain scannable.
- Anti-AI-slop: avoid locale-specific fallback literals, translated-string business logic, fake status semantics, or copied inventory-console labels while making missing-key fallbacks neutral and English-owned.
- Operator workflow clarity: runtime messages still own localized Chinese and English labels; fallback copy only covers missing keys and must not alter filtering, row navigation, status tone, or health affordance behavior.
- Context visibility: raw type/status values, runtime translation keys, row hrefs, and evidence handoffs stay stable while the emergency fallback layer stops leaking Chinese into English operation.
- Missing-token update: keep missing type/environment/status as compact identity cells in the existing entity catalog while moving empty values to shared `common.none`; do not add legends, helper rows, fake status, or route changes.

## Alert Evidence Locale Detection Boundary - 2026-05-08

- Hierarchy: keep alert inherited time/source/trace context rows in the existing compact evidence strip, without adding a locale chip, helper row, or route-level settings panel.
- Density: preserve the same row count and short meta rhythm so alert filters, selected evidence, closure actions, and cross-signal handoffs remain one-scan.
- Anti-AI-slop: avoid visible translated-label comparisons, copied locale heuristics, fake alert state, or fallback text that changes behavior when runtime copy changes.
- Operator workflow clarity: date formatting should follow an explicit locale-code message, not the current wording for Refresh or Alert Center, so translators can revise labels without changing alert evidence behavior.
- Context visibility: time bounds, refresh cadence, live/paused state, timezone, monitor/source/trace rows, and handoff hrefs remain stable while locale detection moves to a non-visible data boundary.

## Shared Date-Time Range Label Boundary - 2026-05-08

- Hierarchy: keep the cold date/time picker as the same inline two-trigger control with a compact portal panel, without adding helper text, locale chips, or a separate action row.
- Density: preserve the fixed calendar/time-column geometry, short clear/confirm footer, and reserved action-space alignment used by alert authoring forms.
- Anti-AI-slop: avoid hardcoded Chinese chrome inside the reusable control, generic browser-native pickers, copied date-picker product copy, or hidden locale assumptions in shared UI.
- Operator workflow clarity: alert notice and silence forms should supply localized empty/hour/minute/month/action labels through runtime i18n while preserving draft edits, clear, confirm, and hidden-input behavior.
- Context visibility: start/end labels, selected time values, silence/notice rule context, and portal positioning remain stable while shared picker chrome becomes caller-owned locale copy.

## Shared Date-Time Range Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep the cold date/time range control as the same inline two-trigger widget with fixed body portal and clear/confirm footer; fallback ordering must not add helper text, locale chips, or a second action row.
- Density: preserve the two-value row, arrow separator, compact trigger labels, 392px calendar/time panel, 220px time-only panel, and current reserved action-space grid.
- Anti-AI-slop: correct the deterministic fallback locale without inventing time intelligence, fake freshness, browser-native replacement controls, copied SaaS date picker language, or hidden locale state.
- Operator workflow clarity: default control copy resolves from runtime messages with an English fallback when no caller label is provided; alert silence and notice rule forms can still pass caller-owned localized labels.
- Context visibility: start/end labels, selected values, hidden input names, date/time parsing, portal positioning, month navigation labels, hour/minute columns, clear/confirm actions, and rule-authoring context remain visible through the existing `DateTimeRange` contract.

## Overview Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep the overview first screen on the existing status grid, guidance rail, impacted entities, and quick entries; cache reuse must not add a loading rail, recap card, or summary panel.
- Density: preserve the compact overview layout and short global loading copy while allowing only a short settled-cache window for route remounts.
- Anti-AI-slop: do not mask backend errors, fake freshness, invent live readiness data, or copy external incident-console behavior; manual refresh must remain the explicit reload action.
- Operator workflow clarity: route hops back to overview can reuse just-settled summary/alert data briefly, while refresh still bumps the nonce and reloads `/summary` plus the alert list.
- Context visibility: top-alert route context, setup guidance, affected entities, and alert-derived signal handoffs stay visible with the same data shape while the first-screen cache boundary becomes explicit.

## Entity List Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep the entity catalog on the existing compact count strip, filter row, dense table, and inline row actions; cache reuse must not add a status rail, loading recap, or fake entity-health panel.
- Density: preserve the one-screen catalog rhythm so entity identity, owner, environment, status, alert counts, monitor counts, relation counts, and evidence actions remain scannable after route hops.
- Anti-AI-slop: do not invent freshness labels, cache status badges, fake health, or copied inventory-console affordances while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled list data briefly, but explicit Refresh must bump a separate nonce so operators can force a reload for the current query.
- Context visibility: search/type/status query state, row handoff hrefs, abnormal-count raw-status logic, and entity evidence summaries stay bound to the same backend list payload while the first-screen cache boundary becomes explicit.

## Alert Center Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep alert filters, grouped alert rows, selected evidence, closure operations, and cross-signal context in the existing alert center surface; cache reuse must not add a freshness badge, status rail, or fake incident panel.
- Density: preserve the dense alert investigation rhythm so severity, status, entity context, topology/source return context, and action affordances remain one-scan after route remounts.
- Anti-AI-slop: do not mask backend errors, invent resolved state, fake alert counts, or copy external incident-console language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled alert data briefly, while explicit Refresh and successful closure mutations must bump a cache nonce for the current post-operation query.
- Context visibility: entity/topology/OTLP return context, signal filters, closure feedback, and URL cleanup stay bound to the same query-controller payload while the first-screen cache boundary becomes explicit.

## Alert Setting Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep threshold-rule search, dense rule table, create/edit authoring dialog, enable toggles, delete confirmation, datasource status, and incoming signal/entity/time evidence inside the existing alert setting surface; cache reuse must not add freshness chrome, fake rule health, or incident-console rails.
- Density: preserve the compact rule-management rhythm so filters, selected ids, datasource evidence, rule rows, create/edit/delete state, and mutation feedback remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent rule readiness, fake notification coverage, or copy external alert-policy console language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled alert-rule data briefly, while Refresh, create/update, delete/batch delete, and enable toggles continue to bump `refreshKey`; search still invalidates through the query-derived define URL.
- Context visibility: alert define list URL, refresh key, checked ids, create draft/mode, delete request state, datasource status, route evidence context, and localized loading copy remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Alert Notice Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep receiver/rule/template tabs, dense policy tables, modal authoring, delete confirmation, receiver tests, and incoming signal/entity/time evidence inside the existing notice console; cache reuse must not add freshness chrome, fake delivery health, or notification-center rails.
- Density: preserve the compact notice-management rhythm so searches, pagination, selected ids, template filtering, switch state, validation feedback, and mutation messages stay scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent receiver readiness, fake template coverage, or copy SaaS notification-console language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled receiver/rule/template data briefly, while Refresh, receiver/rule/template create-update-delete, and rule switches continue to bump `refreshTick`; receiver/rule search still invalidates through query-derived notice URLs.
- Context visibility: receiver/rule list URLs, refresh tick, selected tab, selected receiver/rule/template ids, modal draft state, evidence prefill, label options, and localized loading copy remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Alert Notice Validation Copy Boundary - 2026-05-09

- Hierarchy: keep receiver/template/rule validation feedback in the existing modal field flow; do not add notification-health banners, validation summary cards, or extra status rails.
- Density: preserve the compact authoring rhythm for dense alert-notice operations; only locale ownership for required-input/default-row labels changes.
- Anti-AI-slop: do not infer receiver reachability, template validity, rule delivery health, notification success, or backend readiness from localized validation labels.
- Operator workflow clarity: validation labels describe missing input only, while save/test/delete flows, selected tab, and mutation feedback remain unchanged.
- Context visibility: receiver ids, rule ids, template ids, evidence prefill, label options, and modal draft state remain owned by the existing alert notice controller and client island.

## Monitor Manage Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep monitor filters, dense list rows, selected monitor rail, batch controls, import/export, delete confirmation, and entity return context in the existing monitor manage surface; cache reuse must not add freshness chrome, inventory rails, or fake monitor health.
- Density: preserve the one-screen monitor operations rhythm so status, scrape mode, selection, pagination, import/export controls, and row evidence remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent live state, fake monitor counts, or copy external inventory-console language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled monitor data briefly, while existing reload-key mutations for import, copy, enable, pause, and delete continue to force a fresh load.
- Context visibility: query state, entity fallback context, selected monitor evidence, batch selection, and mutation feedback remain bound to the same backend list payload while the first-screen cache boundary becomes explicit.

## Bulletin Center Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep bulletin list, action toolbar, metrics table, refresh behavior, and create/edit/delete dialogs in the existing bulletin center surface; cache reuse must not add freshness chrome, delivery analytics, or fake bulletin status.
- Density: preserve the compact bulletin operations rhythm so list rows, metrics JSON, tab navigation, dialog state, and reload affordance remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent publish state, fake metrics availability, or copy external notification-center language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled bulletin data briefly, while the existing reload tick keeps explicit refresh and surface mutations as fresh-load boundaries.
- Context visibility: controller-backed list payload, metrics drilldown, selected bulletin state, dialog flows, and reload feedback remain owned by the same surface while the first-screen cache boundary becomes explicit.

## Public Status Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep organization brand, component health history, incident feed, mode switch, locale picker, year filter, and powered-by footer in the existing public status shell; cache reuse must not add freshness chrome, SLA rails, fake uptime, or marketing panels.
- Density: preserve the compact public status rhythm so component rows, history cells, incident entries, locale/year controls, and mode state remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent reliability claims, fake incident state, or copy hosted status-page/SaaS wording while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled public status data briefly, while incident year/reload token changes continue to force the relevant fresh incident feed load.
- Context visibility: public org/component payloads, incident year context, locale switching, mode selection, and powered-by context remain bound to the same controller payload while the first-screen cache boundary becomes explicit.

## Status Setting Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep organization profile, component table, incident table, validation, public status link, and admin actions inside the existing status setting surface; cache reuse must not add freshness chrome, summary rails, fake SLA, or decorative status panels.
- Density: preserve the compact admin editing rhythm so org fields, component rows, incident search/pagination, create/edit dialogs, and save/delete feedback remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent public uptime claims, fake component health, or copy hosted status-page console language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled status-management data briefly, while org/component/incident mutations and search reset/commit continue to bump the refresh tick for a fresh load.
- Context visibility: org payload, component payload, incident query, public status link, refresh tick, and localized mutation feedback stay bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Label Management Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep label search, dense full-width list, copy/edit/delete actions, create/edit dialog, and save/delete feedback inside the existing label management surface; cache reuse must not add freshness chrome, summary rails, tag clouds, or governance panels.
- Density: preserve the compact admin-list rhythm so label name, value, type, description, dialog mode, and row actions remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent label health, fake governance status, or copy tag-management marketplace language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled label data briefly, while Refresh, delete, and save continue to bump `reloadVersion`; search still invalidates through the query-derived label URL.
- Context visibility: current search, label list URL, reload version, modal add/edit state, and localized loading/mutation feedback remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Collector Management Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep collector search, dense cluster table, refresh/deploy/online/offline/delete controls, row operations, health evidence, and timestamp context inside the existing collector management surface; cache reuse must not add freshness chrome, topology rails, fake cluster health, or inventory summary panels.
- Density: preserve the compact admin-list rhythm so collector name, IP, mode, version, status, pinned/dispatched counts, and row actions remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent collector readiness, fake dispatch capacity, or copy cluster-console/inventory language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled collector data briefly, while Refresh continues to bump `reloadVersion`; search still invalidates through the query-derived collector URL.
- Context visibility: current search, collector list URL, reload version, health evidence, batch actions, row operations, timestamps, and localized loading copy remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Collector Management Fact Label Boundary - 2026-05-08

- Hierarchy: keep the collector fact strip as compact route/count/health metadata under the existing collector management model; moving the workspace label behind runtime i18n must not add a new summary panel, navigation rail, or fake inventory state.
- Density: preserve the short fact-label rhythm so workspace, total, current page count, health evidence, pinned, and dispatched counts stay quickly scannable.
- Anti-AI-slop: do not invent collector readiness, dispatch capacity, topology scope, or SaaS-style fleet wording while externalizing the fixed label.
- Operator workflow clarity: the workspace fact continues to identify the `setting/collector` surface while localized copy stays owned by the shared runtime catalog.
- Context visibility: route ownership, cluster health evidence, batch actions, and table rows stay in the same collector workbench context; only the remaining fixed label moves out of source-local copy.

## Collector Management Row Fallback Boundary - 2026-05-09

- Hierarchy: keep collector name, IP, mode, version, status, tasks, health evidence, timestamps, and row actions in the existing dense cluster table.
- Density: preserve terse inline missing-value fallback text without adding inventory cards, readiness summaries, or topology rails.
- Anti-AI-slop: do not invent collector IP addresses, versions, readiness, dispatch capacity, or fleet topology while moving absent row facts into the shared fallback.
- Operator workflow clarity: payload-provided IP and version values remain authoritative; only missing or blank row facts use localized fallback copy.
- Context visibility: search, refresh, deploy/online/offline/delete controls, health evidence, status tone, mutation affordances, and controller-backed collector data remain unchanged.

## Setting Define Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep monitoring-template search, dense definition list, YAML editor, preview panel, datasource status, draft state, and create/edit/preview/save/delete actions inside the existing definition surface; cache reuse must not add freshness chrome, marketplace rails, fake template health, or rule-builder summary panels.
- Density: preserve the compact editor rhythm so definition name/type/datasource/expression, current YAML label, datasource status, preview diagnostics, dark mode, and save feedback remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent definition readiness, fake datasource health, or copy SaaS rule-builder/marketplace language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled definition data briefly, while successful saves bump `reloadVersion`; search still invalidates through the query-derived definition URL.
- Context visibility: current search, definition list URL, reload version, selected definition, editor draft, preview result, save state, and localized loading/mutation feedback remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Setting Config Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep locale, timezone, theme selectors, validation, save feedback, locale/theme side effects, and reload behavior inside the existing system config form; cache reuse must not add freshness chrome, deployment rails, fake system-health blocks, or profile-summary panels.
- Density: preserve the compact settings-form rhythm so current config, draft values, timezone options, save state, and field labels remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent deployment readiness, fake tenant state, or copy SaaS account-settings language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled config data briefly, while successful saves bump `reloadVersion`; locale/theme side effects and browser reload remain controlled by the existing form.
- Context visibility: system config URL, timezone URL, reload version, draft locale/timezone/theme, save state, validation, and localized loading/mutation feedback remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Setting Object Store Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep provider selection, OBS credential fields, validation, save feedback, and storage-controller calls inside the existing object-store settings form; cache reuse must not add freshness chrome, summary rails, fake bucket-health blocks, or cloud-console panels.
- Density: preserve the compact settings-form rhythm so provider, OBS access key, secret key, bucket, endpoint, save path, validation, and save state remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent object-storage capacity, fake archive readiness, or copy cloud-provider console language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled object-store data briefly, while successful saves bump `reloadVersion`; provider switching and secret-field editing remain controlled by the existing form.
- Context visibility: object-store config URL, reload version, draft provider/OBS fields, save state, validation, and localized loading/mutation feedback remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Setting Message Server Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep email and SMS summary rows, provider-specific dialogs, validation, save feedback, toggles, and message-server controller calls inside the existing settings surface; cache reuse must not add freshness chrome, delivery-health cards, fake provider status, or notification-center rails.
- Density: preserve the compact summary/dialog rhythm so email host/port/user, SMS provider fields, auth mode, toggles, save state, and mutation feedback remain scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent delivery metrics, fake channel readiness, or copy SaaS notification-center language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled message-server data briefly, while successful email and SMS saves both bump `reloadVersion`; dialog cancel/snapshot behavior remains controlled by the existing form.
- Context visibility: email config URL, SMS config URL, reload version, email draft, SMS draft/snapshot, open dialog, save state, validation, and localized loading/mutation feedback remain bound to the same controller-backed surface while the first-screen cache boundary becomes explicit.

## Setting Token Workbench Settled Cache Boundary - 2026-05-08

- Hierarchy: keep the token counts strip, dense admin table, masked token values, creator/time columns, and existing generate/delete affordances inside the settings owner; cache reuse must not add freshness chrome, API-key marketing cards, fake scope badges, or token-health panels.
- Density: preserve the compact admin rhythm so total/active/expired counts, token names, masks, creator, create/expire/last-used times, and row actions stay scannable after route hops.
- Anti-AI-slop: do not mask backend errors, invent token scopes, fake revocation state, fake last-use freshness, or copy SaaS API-key console language while adding a short settled-cache window.
- Operator workflow clarity: route remounts can reuse just-settled token list data briefly; because token create/delete mutations are not implemented in this surface yet, this slice must not invent mutation invalidation or pretend those actions are wired.
- Context visibility: token list URL, localized loading copy, counts, expiry calculation, masked values, and empty state remain bound to the same controller-backed payload while the first-screen cache boundary becomes explicit.

## Settings Governance Review Label Boundary - 2026-05-08

- Hierarchy: keep governance review data as route/current-capability metadata feeding the existing settings surface; moving group names to runtime keys must not add a governance dashboard, menu branch, or future-domain cards.
- Density: preserve the compact group/route mapping so users, API access, notifications, templates/plugins, and MCP/AI foundations remain scan-friendly without expanding roadmap-only domains into app navigation.
- Anti-AI-slop: do not invent shipped governance modules, SaaS admin packaging, fake security posture, or future product identity while removing source-local group labels.
- Operator workflow clarity: review records continue to expose implemented routes and foundation-only entries; label ownership simply follows the same runtime message catalog already used by the governance rows.
- Context visibility: current route candidates, future roadmap-only docs, navigation policy, and no-fake-future-route boundaries stay unchanged.

## Platform Footer License Copy Boundary - 2026-05-08

- Hierarchy: keep the footer as a quiet shared legal line below the app frame and passport shell; moving the license sentence behind runtime i18n must not add a branded footer band, marketing claim, or extra navigation.
- Density: preserve the compact two-line footer rhythm so product name, version, copyright, site link, and license remain readable without competing with operator workflows.
- Anti-AI-slop: do not rewrite Apache/HertzBeat identity, invent commercial packaging, or add SaaS-style trust badges while externalizing the fixed license copy.
- Operator workflow clarity: app and auth shells pass the same translated license copy into the shared footer, preserving one source of footer layout and legal posture.
- Context visibility: version, current year, project link, passport shell context, and app-frame context remain unchanged; only the fixed visible license sentence moves to the runtime catalog.

## AppFrame Utility Icon Label Boundary - 2026-05-08

- Hierarchy: keep the top-left menu and GitHub icon buttons as compact utility triggers in the existing header; moving accessible labels behind runtime i18n must not add text buttons, extra nav items, or a second header layer.
- Density: preserve the icon-only rhythm so menu, GitHub, setup, notification, mute, lock, settings, and user affordances remain a single scannable utility cluster.
- Anti-AI-slop: do not rename GitHub, add SaaS help text, invent repository status, or change header information architecture while externalizing labels.
- Operator workflow clarity: aria labels and screen-reader text resolve from the same runtime catalog used by the rest of AppFrame chrome, without changing trigger behavior or links.
- Context visibility: app navigation, setup progress, GitHub href, menu trigger marker, and route content remain unchanged; only hardcoded accessible copy leaves the component source.
- Notification-time fallback update: keep alert title, status, and active-time metadata in the same notification rows while moving missing timestamp markers to shared `common.none`; do not add fake alert recency, unread status, or notification-health summaries.
- Mute-label consistency update: keep mute/unmute as the same compact notification control while sharing one action label between aria text and screen-reader text; do not add visible header text, unread state, or notification-health chrome.

## AppFrame User Menu Label Boundary - 2026-05-08

- Hierarchy: keep the avatar as the same compact header utility trigger; moving its accessible wrapper label behind runtime i18n must not add account rails, profile panels, or extra header text.
- Density: preserve the icon-only utility cluster rhythm so setup, notification, mute, lock, settings, and user controls remain a single scan path.
- Anti-AI-slop: do not invent user profile data, tenant badges, SaaS account packaging, security posture, or identity-management claims while localizing the wrapper label.
- Operator workflow clarity: only the user menu control label is localized; the current username remains data passed into the label and the settings/about/logout menu stays unchanged.
- Context visibility: user dropdown links, avatar marker, route context, and shared AppFrame chrome stay in the existing positions while the hardcoded accessible copy leaves the component source.

## Overlay Dialog Close Label Boundary - 2026-05-08

- Hierarchy: keep `OverlayDialog` as the shared modal/drawer shell for existing detail, authoring, and confirmation workflows; moving the close label behind messages must not change titles, kickers, footer actions, or placement.
- Density: preserve the compact square close affordance and current header spacing so dense operator dialogs do not grow extra chrome.
- Anti-AI-slop: do not add generic modal prose, helper text, SaaS account language, fake workflow hints, or copied design-system branding while externalizing the close aria copy.
- Operator workflow clarity: close behavior remains owned by each caller's `onClose`; this slice only removes the English source-local accessible label from the shared shell.
- Context visibility: dialog title-based aria context, side-drawer click-away behavior, centered-dialog behavior, and data markers stay unchanged.

## DataTable Empty State Boundary - 2026-05-08

- Hierarchy: keep `DataTable` as the shared dense evidence table primitive; moving its default empty text behind messages must not change headers, rows, row actions, or table layout.
- Density: preserve the single-row empty state so empty monitor, detail, and evidence tables stay compact instead of gaining cards, icons, or helper panels.
- Anti-AI-slop: do not invent fake data, guidance prose, no-data reasons, onboarding copy, or vendor-like empty-state decoration while externalizing the fallback label.
- Operator workflow clarity: caller-provided `emptyState` remains authoritative for domain-specific table copy; only the shared fallback uses the runtime message catalog.
- Context visibility: ops token classes, row attributes, row click behavior, column rendering, and table options stay unchanged.

## SearchRow Default Action Label Boundary - 2026-05-08

- Hierarchy: keep `SearchRow` as the compact shared filter/search primitive; default labels must not add helper text, secondary headers, or new chrome around the direct input and detached action buttons.
- Density: preserve the fixed-width input, inline filter slot, and small icon+text buttons so repeated admin tables and evidence lists stay scan-friendly.
- Anti-AI-slop: do not invent search guidance, placeholder prose, empty-state explanations, SaaS query language, or fake filter coverage while providing safe default labels.
- Operator workflow clarity: caller-provided `searchLabel` and `clearLabel` remain authoritative for domain-specific copy; the shared fallback only prevents unlabeled search/clear actions when a caller omits labels.
- Context visibility: data markers, submit/clear behavior, trailing actions, filter slot order, and controlled input ownership stay unchanged.

## WorkspaceTabStrip Default Navigation Label Boundary - 2026-05-08

- Hierarchy: keep `WorkspaceTabStrip` as a quiet inline tab navigation primitive below existing page headers; externalizing the default aria label must not add visible headings, helper text, or a second navigation band.
- Density: preserve the compact default/card tab treatments, badge chip rhythm, and flex-wrap behavior so dense workbench headers keep their current scan path.
- Anti-AI-slop: do not invent workspace names, fake tabs, onboarding prose, or product-positioning copy while moving the shared accessible fallback into runtime messages.
- Operator workflow clarity: caller-provided `ariaLabel` remains authoritative for domain-specific tabs; the shared default only gives unlabeled workspace tab groups a catalog-backed accessible name.
- Context visibility: tab labels, href/button behavior, active/disabled state, badge content, data markers, and workbench/shell placement remain unchanged.

## Log Related Trace Dialog Default Chrome Boundary - 2026-05-08

- Hierarchy: keep the right-side trace preview drawer, compact stage meta strip, waterfall/list body, selected evidence facts, and event detail area unchanged while moving only fallback loading/empty/timeline labels into runtime messages.
- Density: preserve the narrow 300px evidence rail, compact status states, and caller-owned header/action content so log-to-trace drilldown remains a quick inspection surface.
- Anti-AI-slop: do not invent trace data, fake spans/events, fake full-trace navigation, or vendor-style trace storytelling while externalizing default labels.
- Operator workflow clarity: page-provided localized labels remain authoritative; shared dialog defaults only cover direct/reused rendering when a caller omits loading, empty, or waterfall labels.
- Context visibility: selected span/event state, stage facts, badges, meta items, trace waterfall ticks, and event-to-span return action remain visible and data-backed.

## ObservabilityTimeline Empty State Boundary - 2026-05-08

- Hierarchy: keep `ObservabilityTimeline` as the compact chronological evidence primitive; moving the default empty text behind messages must not add headers, helper copy, icons, or a separate empty-state card.
- Density: preserve the single raised empty row and existing timeline item spacing so activity feeds and operator side panels remain compact.
- Anti-AI-slop: do not invent events, fake timestamps, onboarding guidance, SaaS activity prose, or decorative timeline states while externalizing the shared fallback label.
- Operator workflow clarity: caller-provided `emptyText` remains authoritative for domain-specific timelines; the shared fallback only covers direct/reused rendering when a caller omits copy.
- Context visibility: item title/detail/timestamp rendering, tone dots, connecting rail, ops token classes, and stable list keys remain unchanged.

## OverviewGuidancePanel Default Label Boundary - 2026-05-08

- Hierarchy: keep the overview guidance rail as one compact next-step panel with headline, description, reasons, and follow-up links; moving default section labels behind messages must not add a second guidance header, summary rail, or marketing copy.
- Density: preserve the compact/default density switches, pill-row reason mode, and current reason/link spacing so the overview rail remains scannable beside status, issue, and setup panels.
- Anti-AI-slop: do not invent next steps, fake recommendations, onboarding prose, or copied SaaS dashboard packaging while externalizing only the shared fallback labels.
- Operator workflow clarity: overview page-provided localized labels remain authoritative; shared defaults only cover direct/reused rendering when a caller omits start/reasons/next labels.
- Context visibility: headline, description, primary/secondary actions, reason values, next-link hrefs, density markers, and data attributes stay unchanged.

## OverviewChecklist Status Label Boundary - 2026-05-08

- Hierarchy: keep the overview checklist as the compact next-step readiness list below the existing guidance/status surfaces; externalizing ready/pending labels must not add badges, icons, helper copy, or a new setup panel.
- Density: preserve compact and default row spacing, small status text, and two-column layout so the healthy next-steps rail remains scannable.
- Anti-AI-slop: do not invent readiness scores, fake checks, onboarding prose, or SaaS setup packaging while moving only the shared status words into runtime messages.
- Operator workflow clarity: checklist item labels remain caller-owned; the shared primitive only owns the fallback ready/pending words derived from the boolean `ready` field.
- Context visibility: item keys, item labels, readiness booleans, density markers, ops token classes, and row ordering stay unchanged.

## Login Form Credential Chrome Boundary - 2026-05-08

- Hierarchy: keep the Angular-style gray passport card, hidden field labels, credential icon row, remember checkbox, warning notice, and single submit action unchanged while moving small credential chrome labels into runtime messages.
- Density: preserve the compact four-row form rhythm and eye icon button placement so authentication remains a quick operator entry point.
- Anti-AI-slop: do not add onboarding prose, fake security posture, SaaS hero language, or new password policy hints while externalizing only show/hide and remember labels.
- Operator workflow clarity: the password visibility toggle must keep its stateful accessible name, and the remember checkbox must retain the same default checked behavior and cold checkbox owner markers.
- Context visibility: login heading, username/password placeholders, default-password notice logic, redirect/session bootstrap, panel markers, and passport shell locale controls remain unchanged.

## Login Form Component Locale Helper Boundary - 2026-05-09

- Hierarchy: keep the passport shell hero, gray credential card, hidden labels, field icons, remember checkbox, password visibility control, submit button, notice slot, and footer unchanged; only align the regression with the declared zh-CN provider locale.
- Density: preserve the compact credential-card rhythm without adding security banners, policy panels, onboarding text, or extra auth status rows.
- Anti-AI-slop: do not invent MFA, token health, workspace policy, tenant readiness, SaaS hosting, or AI login assistance while replacing English default test copy.
- Operator workflow clarity: when the mocked provider declares `locale: 'zh-CN'`, the login regression should assert the same zh-CN passport intro, field prompts, remember/password controls, submit action, and footer copy operators see.
- Context visibility: redirect target ownership, default-password notice logic, session bootstrap, token persistence, password visibility state, panel markers, and locale controls remain unchanged.

## Public Status Display Fallback Boundary - 2026-05-08

- Hierarchy: keep the public status brand block, component history rows, incident cards, footer attribution, and component/incident navigation as-is while moving shared English fallback labels behind runtime messages.
- Density: preserve the compact public board labels and incident timeline rows; do not add summary rails, badges, helper prose, or extra date captions.
- Anti-AI-slop: do not invent public incidents, fake uptime, fake component health, commercial status-page packaging, or copied SaaS public-status copy while correcting fallback ownership.
- Operator workflow clarity: status translators remain authoritative; English constants only cover missing translation keys so component history, incident range, start/update, and footer labels stay deterministic.
- Context visibility: org state, home/feedback links, year/history/uptime labels, component history blocks, incident ranges, navigation labels, and timestamp formatting remain data-backed and unchanged.

## Public Status Footer Navigation Fallback Boundary - 2026-05-09

- Hierarchy: keep the public status footer attribution, component/incident navigation links, and incident start/update labels in their current public board positions while moving only fallback label ownership into runtime messages.
- Density: preserve the terse footer/link/date-label copy; do not add extra timestamp captions, breadcrumbs, or status-page marketing language.
- Anti-AI-slop: do not invent public incidents, uptime claims, external SaaS positioning, or fake navigation while aligning missing-key fallbacks with the runtime catalog.
- Operator workflow clarity: translated labels still win; English constants only cover missing keys for footer attribution, status/incident navigation, and incident start/update labels.
- Context visibility: home/feedback links, status view mode, incident range rows, update timestamps, footer brand attribution, and public status route markers remain unchanged.

## Public Status Brand Link Fallback Boundary - 2026-05-09

- Hierarchy: keep the public status brand header, home/feedback affordances, year selector, history labels, uptime rows, update stamp, and 30-day summary in their current board positions while moving fallback ownership into runtime messages.
- Density: preserve the compact public-board word labels; do not add helper text, breadcrumbs, uptime claims, or extra date captions.
- Anti-AI-slop: do not invent component health, public incidents, fake uptime, commercial status-page packaging, or copied SaaS public-status language while externalizing only deterministic missing-key fallbacks.
- Operator workflow clarity: translators remain authoritative; English constants only cover missing keys for brand links, timeline labels, uptime/update labels, and the today/30-day row chrome.
- Context visibility: organization state, home and feedback URLs, year values, history blocks, uptime percentages, update timestamps, and public status route markers remain data-backed and unchanged.

## Status Center Admin Label Fallback Boundary - 2026-05-09

- Hierarchy: keep the public status page title, settings page title, organization facts, component/incident counters, state field, and current-view fact in their existing admin/public positions while moving fallback ownership into runtime messages.
- Density: preserve the terse fact labels and metric labels; do not add summary rails, helper text, badges, breadcrumbs, or public-status marketing copy.
- Anti-AI-slop: do not invent health, incidents, org ownership, uptime, or SaaS status-page packaging while externalizing only deterministic missing-key fallbacks.
- Operator workflow clarity: setting-specific translation keys remain authoritative, status-center shared keys remain secondary, and English constants only cover missing translations.
- Context visibility: workspace, organization name/fallback, component count, incident count, org state, current view, and org copy remain derived from real payloads and unchanged.

## Status Center State Label Fallback Boundary - 2026-05-09

- Hierarchy: keep component state badges, incident state rows, organization state summaries, status facts, and public board posture in their current positions while moving only state-word fallback ownership into runtime messages.
- Density: preserve the compact Normal/Abnormal/Unknown and incident-state wording; do not add legend blocks, helper descriptions, extra badges, or copied status-page posture prose.
- Anti-AI-slop: do not invent health, uptime, incidents, maintenance states, or fake operational status while externalizing deterministic state fallback labels.
- Operator workflow clarity: numeric/string normalization and tone mapping remain unchanged; translators remain authoritative and English constants only cover missing translation keys.
- Context visibility: component state, incident state, organization state, badge tones, state colors, timestamps, and payload-derived rows remain data-backed and unchanged.

## Status Center Component Row Fallback Boundary - 2026-05-09

- Hierarchy: keep component-mode admin rows in the existing status-center list; missing component copy must not add secondary details, banners, or status panels.
- Density: preserve title, copy, and state/time meta as the compact scan path.
- Anti-AI-slop: do not invent descriptions, endpoints, uptime, ownership, or health when component rows lack summary data.
- Operator workflow clarity: real description/endpoint copy remains authoritative; absent copy uses the shared runtime empty marker.
- Context visibility: active component/incident mode, component state labels, incident rows, org rows, and status page navigation remain unchanged.

## Status Center Incident Title Fallback Boundary - 2026-05-09

- Hierarchy: keep incident fallback titles inside the same incident list/card rows; missing ids must not create helper banners, synthetic incident names, or extra status blocks.
- Density: preserve the compact incident title, latest-message copy, state/time meta, and public incident card rhythm.
- Anti-AI-slop: do not invent incident ids, incident names, recovery state, impact, or freshness when payload titles/names/ids are absent.
- Operator workflow clarity: real incident title/name/id remains authoritative; absent ids use the shared runtime empty marker in the existing fallback title.
- Context visibility: incident state, timeline contents, component context, mode switch, and timestamp evidence remain unchanged.

## Status Center Empty Row Meta Boundary - 2026-05-09

- Hierarchy: keep empty component/incident rows in the same status-center list position; missing meta must not create empty-state banners, counters, or summary rails.
- Density: preserve the compact title/copy/meta row shape for empty component and incident modes.
- Anti-AI-slop: do not invent timestamps, health, incident freshness, uptime, or recovery status when the row is representing filtered/empty data.
- Operator workflow clarity: empty row titles/copy stay translator-owned and absent meta uses the shared runtime empty marker.
- Context visibility: active mode, component/incident tabs, public shell, org facts, and real payload rows remain unchanged.

## Observability TabStrip Navigation Label Boundary - 2026-05-09

- Hierarchy: keep shared tab strips as the compact navigation row already used by monitor and workbench panels while moving only the default tablist aria label into runtime messages.
- Density: preserve tab item labels, selected indicators, card/line variants, and extra action slots; do not add visible helper copy, captions, rails, or nested card chrome.
- Anti-AI-slop: do not invent workflow states, fake tab destinations, SaaS-style navigation prose, or decorative status labels while externalizing the shared accessibility label.
- Operator workflow clarity: caller-provided tab labels and optional aria labels remain authoritative; the shared default only covers direct rendering and missing caller labels.
- Context visibility: selected tab key, panel id prefix, keyboard navigation, tone/variant styling, and extra controls remain unchanged.

## Monitor Manage Status Label Fallback Boundary - 2026-05-09

- Hierarchy: keep monitor status badges and row status labels in the existing dense monitor table while moving only no-translator fallback words into runtime messages.
- Density: preserve the compact Running/Abnormal/Paused badge rhythm; do not add status legends, helper text, summary rails, or fake health panels.
- Anti-AI-slop: do not invent monitor health, uptime, collector evidence, SaaS status wording, or new color semantics while correcting fallback ownership.
- Operator workflow clarity: localized `t(...)` labels still win; fallback labels are only for direct view-model/helper usage without a translator.
- Context visibility: raw monitor status numbers, badge tone mapping, selection, detail/edit navigation, and row evidence remain unchanged.

## Label Management Metric Label Boundary - 2026-05-09

- Hierarchy: keep label management metrics as compact current-page counters; moving label text behind runtime messages must not add a new summary rail or change the dense label table hierarchy.
- Density: preserve the three short auto/user/preset counters and their existing tones; do not add helper prose, legends, badges, or label taxonomy explanations.
- Anti-AI-slop: do not invent label usage, tenant policy, governance status, or copied SaaS label-management copy while externalizing deterministic metric labels.
- Operator workflow clarity: translated metric labels come from the existing label management translator, while raw label type counts and tone mapping remain data-driven.
- Context visibility: label type numbers, current page scope, total facts, search state, row actions, and monitor handoff links remain unchanged.

## Plugin Management Metric Label Boundary - 2026-05-09

- Hierarchy: keep plugin management metrics as compact current-page counters; moving labels behind runtime messages must not add a marketplace summary rail or change the dense plugin table hierarchy.
- Density: preserve the three short enabled/disabled/params counters and their existing tones; do not add helper prose, legends, usage cards, or plugin-category explanations.
- Anti-AI-slop: do not invent marketplace health, plugin usage, SaaS packaging, tenant policy, or fake execution status while externalizing deterministic metric labels.
- Operator workflow clarity: translated metric labels come from the plugin management translator, while enabled/disabled counts, parameter counts, and tone mapping stay data-driven.
- Context visibility: plugin enable state, parameter counts, current page scope, selected ids, upload/edit/delete actions, and table row handoffs remain unchanged.

## Shared Select Empty Trigger Fallback Boundary - 2026-05-09

- Hierarchy: keep `Select` as the shared compact cold dropdown trigger used by dense settings and workbench forms.
- Density: preserve the single trigger label and chevron; do not add helper text, placeholder badges, empty-menu panels, or extra select chrome.
- Anti-AI-slop: do not invent a selected option, default domain, form value, or fake configuration state when no option is available.
- Operator workflow clarity: caller-provided options and selected values remain authoritative; only the no-option trigger fallback uses the shared localized empty value.
- Context visibility: hidden native select, hidden form input, listbox geometry, keyboard navigation, portal ownership, and selected option markers remain unchanged.

## Setting Define Empty Fact Fallback Boundary - 2026-05-09

- Hierarchy: keep the definition list, YAML editor, preview rows, and datasource status panel in the existing two-column definition workspace.
- Density: preserve terse inline fallbacks in row copy and preview metadata; do not add badges, helper rows, empty panels, or secondary validation chrome.
- Anti-AI-slop: do not invent datasource names, expression text, alert types, backend health, or template readiness while localizing missing definition facts.
- Operator workflow clarity: payload-provided type, datasource, expression, enable state, and selected definition names remain authoritative; only absent facts use the shared localized fallback.
- Context visibility: search, selected row, editor title, current YAML chip, preview action, dark-mode toggle, datasource JSON, and save/delete actions remain unchanged.

## Setting Define Editor Subtitle Fallback Boundary - 2026-05-09

- Hierarchy: keep editor title/subtitle inside the existing YAML editor header beside the current YAML chip and dark-mode toggle.
- Density: preserve the single compact subtitle line; do not add helper cards, badges, warnings, or definition-readiness chrome.
- Anti-AI-slop: do not invent datasource, alert type, expression, health, or template readiness when preview metadata is absent.
- Operator workflow clarity: preview metadata from the selected definition remains authoritative; only an absent preview meta row uses the shared localized fallback.
- Context visibility: definition list, selected row, editor title, current YAML chip, preview action, datasource JSON, and save/delete actions remain unchanged.

## Status Setting Table Empty-Cell Fallback Boundary - 2026-05-09

- Hierarchy: keep organization profile, component table, incident table, public status link, and delete confirmations in the existing status settings console.
- Density: preserve single-cell fallbacks inside dense rows; do not add empty badges, helper rows, summary rails, or public-status health panels.
- Anti-AI-slop: do not invent component names, labels, incident messages, affected components, uptime, recovery state, or fake status evidence while localizing empty cells.
- Operator workflow clarity: payload-provided component names, labels, incident messages, and affected component chips remain authoritative; only absent row facts use the shared localized fallback.
- Context visibility: component/incident tabs, search, row actions, state/method tags, timestamps, create/edit dialogs, and delete modal context remain unchanged.

## Label Management Dialog Preview Fallback Boundary - 2026-05-09

- Hierarchy: keep the label authoring preview as the small side preview inside the existing dialog, not a separate card or wizard step.
- Density: preserve the single preview pill; do not add helper prose, validation banners, governance hints, or extra preview rows for empty drafts.
- Anti-AI-slop: do not invent label names, values, descriptions, ownership, or usage evidence while moving the empty preview fallback into runtime messages.
- Operator workflow clarity: typed name/tag value still controls the preview immediately; only an empty display name uses the shared localized fallback.
- Context visibility: search, table rows, type badges, description fallback, edit actions, dialog fields, and save/cancel controls remain unchanged.

## Label Management Unknown Type Boundary - 2026-05-09

- Hierarchy: keep unknown label-type evidence in the existing type badge cell beside name, description, edit time, and row actions.
- Density: preserve one compact badge label for unknown type values; do not add helper panels, warning rows, or governance explanation copy.
- Anti-AI-slop: do not invent label taxonomy, ownership, policy state, or usage counts while moving only the unknown-type fallback into runtime messages.
- Operator workflow clarity: known auto/user/preset labels keep their existing localized mappings; only unrecognized numeric types use the catalog-owned fallback.
- Context visibility: search, display-name links, descriptions, edit-time formatting, copy/edit/delete actions, and dialog preview remain unchanged.

## Label Management Description Fallback Boundary - 2026-05-09

- Hierarchy: keep label name, type, description, edit time, and row actions in the existing dense table without adding a label summary rail or secondary empty panel.
- Density: preserve the single-cell description fallback; do not add helper paragraphs, status chips, placeholder cards, or extra authoring hints.
- Anti-AI-slop: do not invent label descriptions, ownership, usage counts, fake governance state, or SaaS taxonomy copy while moving the blank-description fallback into runtime messages.
- Operator workflow clarity: real label descriptions remain payload-owned; only blank descriptions use the shared localized fallback.
- Context visibility: label search, display-name links, type badges, copy/edit/delete actions, dialog preview, and table layout remain unchanged.

## Plugin Management Type Fallback Boundary - 2026-05-09

- Hierarchy: keep plugin type evidence in the existing table cell and preserve row identity, status, parameter count, and actions around it.
- Density: preserve the single compact fallback chip/text when no execution type is present; do not add an empty-state card, helper text, marketplace rail, or secondary status block.
- Anti-AI-slop: do not invent plugin execution types, plugin health, marketplace availability, or telemetry evidence while moving the no-type fallback into runtime messages.
- Operator workflow clarity: raw plugin item type labels remain payload-driven and translated through the existing type-label helper; only the empty type-cell fallback becomes catalog-owned.
- Context visibility: selected ids, enable toggles, edit/delete actions, param counts, upload dialog, and table layout remain unchanged.

## Plugin Management Row Copy Boundary - 2026-05-09

- Hierarchy: keep plugin identity, execution type chips, enabled state, parameter count, and row operations in the existing dense table without adding marketplace or health layers.
- Density: preserve the compact row/meta copy rhythm; do not add helper paragraphs, summary rails, nested cards, or new plugin-domain prose.
- Anti-AI-slop: do not invent plugin usage, SaaS marketplace status, fake health, fake telemetry, or future-only plugin types while moving row copy ownership into runtime messages.
- Operator workflow clarity: row fallback/type/status/parameter text becomes localized, while enable toggles, selected ids, upload/edit/delete actions, and param editing behavior remain data-driven.
- Context visibility: current page scope, selected rows, table handoff data, raw plugin item types, and existing action labels remain visible and unchanged.

## API Message Error Fallback Boundary - 2026-05-09

- Hierarchy: keep API client errors as shared data-layer failures that downstream loading/error states can display without adding page-local recovery panels.
- Density: preserve the single-line non-zero response fallback; do not add helper paragraphs, status legends, stack traces, or workflow hints in shared client code.
- Anti-AI-slop: do not invent backend state, request health, retry advice, fake observability evidence, or SaaS error copy while moving fallback ownership into runtime messages.
- Operator workflow clarity: backend `msg` values remain authoritative; the runtime fallback only covers non-zero `ApiResponse` payloads without a message.
- Context visibility: auth refresh, token clearing, request methods, response payload handling, and caller-specific error rendering remain unchanged.

## API Request Status Error Fallback Boundary - 2026-05-09

- Hierarchy: keep failed HTTP responses as shared API-client failures that existing workbench loading/error states can surface without adding route-local recovery UI.
- Density: preserve the compact status-only fallback; do not add retry guidance, helper paragraphs, stack traces, legends, or new alert chrome in the shared client.
- Anti-AI-slop: do not invent backend outage state, fake health, remediation advice, SaaS incident language, or observability evidence while moving deterministic fallback copy into runtime messages.
- Operator workflow clarity: HTTP status remains the only data in this fallback; non-zero `ApiResponse` message handling and backend-provided messages stay on their existing path.
- Context visibility: path normalization, auth headers, Accept-Language, refresh-on-401, token clearing, cache mode, and caller-owned error rendering remain unchanged.

## Alert Group Mutation Id Error Boundary - 2026-05-09

- Hierarchy: keep invalid alert-group mutation ids as a controller-level validation failure that existing alert action feedback can surface without adding new panels or route-local recovery UI.
- Density: preserve the terse single-line validation message; do not add helper prose, legends, summaries, or extra close/ack/recover chrome.
- Anti-AI-slop: do not invent alert status, closure outcome, health, retry advice, fake incident state, or remediation evidence while moving deterministic fallback copy into runtime messages.
- Operator workflow clarity: valid group-alert ids still build the same acknowledge/recover/reopen/delete endpoints; the fallback only covers empty or invalid id input before mutation.
- Context visibility: closure action mapping, query refresh behavior, selected alert evidence, entity/topology/time return context, and caller-owned feedback rendering remain unchanged.

## Alert Rule Note Query Copy Boundary - 2026-05-09

- Hierarchy: keep group, inhibit, and silence query notes as the small existing note rows inside their current alert rule workbenches.
- Density: preserve the two-row group/inhibit notes and the silence count/query note without adding helper rails, query builders, sort panels, or status badges.
- Anti-AI-slop: do not invent rule freshness, search success, backend health, alert volume, grouping quality, or silence/inhibit effectiveness while localizing the note copy.
- Operator workflow clarity: note rows still describe the preserved search/sort behavior only; rule table filtering, mutations, and selected-rule context stay unchanged.
- Context visibility: route wrappers, client islands, evidence context, selected rows, and mutation feedback remain owned by the existing alert rule pages.

## Alert Rule Selected Id Meta Boundary - 2026-05-09

- Hierarchy: keep the selected rule id as the terse meta line on the existing selected group, inhibit, and silence rule rows.
- Density: preserve the selected-rule row count and layout without adding id badges, rule detail panels, helper labels, or status summaries.
- Anti-AI-slop: do not invent rule health, validation state, ownership, freshness, grouping quality, silence coverage, or inhibit effectiveness while localizing the id meta.
- Operator workflow clarity: the id remains only a stable selected-rule identifier; enable state, label counts, timers, and mutation behavior stay unchanged.
- Context visibility: route wrappers, client islands, evidence context, selected rows, and mutation feedback remain owned by the existing alert rule pages.

## Alert Silence Selected Type Meta Boundary - 2026-05-09

- Hierarchy: keep the silence selected-rule type as the small meta text on the existing strategy row.
- Density: preserve the selected-rule row count and compact labels without adding type badges, scheduling panels, helper text, or status summaries.
- Anti-AI-slop: do not invent silence coverage, match quality, rule health, active alert count, schedule validation, or backend freshness while localizing the type meta.
- Operator workflow clarity: the type meta still reflects only the selected silence rule type; strategy copy, labels, days, and mutation behavior stay unchanged.
- Context visibility: route wrapper, client island, evidence context, selected rows, and mutation feedback remain owned by the existing alert silence page.

## Alert Silence Match-All Boolean Boundary - 2026-05-09

- Hierarchy: keep the match-all boolean as inline copy in the existing silence table row summary.
- Density: preserve the single compact row summary without adding boolean badges, explanatory text, schedule panels, or secondary status rows.
- Anti-AI-slop: do not invent silence coverage, rule correctness, active alert volume, matcher confidence, or backend freshness while localizing the boolean token.
- Operator workflow clarity: the boolean still reports only the stored `matchAll` value; enable state, label count, selected rows, and mutations stay unchanged.
- Context visibility: route wrapper, client island, evidence context, row list, and mutation feedback remain owned by the existing alert silence page.

## Alert Group Timer Unit Boundary - 2026-05-09

- Hierarchy: keep group wait, interval, and repeat durations in the existing row meta and selected timer row.
- Density: preserve the compact timer strings without adding unit badges, duration pickers, helper prose, or secondary timing panels.
- Anti-AI-slop: do not invent grouping latency, rule health, notification volume, backend freshness, or timer validation while localizing the seconds unit.
- Operator workflow clarity: values still reflect only stored group timers; enable state, labels, selected id, query notes, and mutations stay unchanged.
- Context visibility: route wrapper, client island, evidence context, group row list, selected rows, and mutation feedback remain owned by the existing alert group page.

## Alert Center Evidence Id Meta Boundary - 2026-05-09

- Hierarchy: keep monitor id and span id as terse meta tokens inside the existing inherited evidence context rows.
- Density: preserve the compact context row count without adding id badges, trace panels, monitor detail cards, or helper prose.
- Anti-AI-slop: do not invent monitor health, trace status, alert causality, backend freshness, or correlation confidence while localizing id meta labels.
- Operator workflow clarity: ids still reflect only the inherited query context; time, source, monitor, trace, closure, and evidence handoff behavior stay unchanged.
- Context visibility: alert center route wrapper, client island, evidence context rows, topology/time return context, and closure feedback remain owned by the existing alert center page.

## Public Status Incident Load Failure Boundary - 2026-05-09

- Hierarchy: keep public status incident feed failures as controller-level partial-load state while preserving the existing public brand, component list, incident list, and footer hierarchy.
- Density: preserve the single incidents error string and empty incident list fallback; do not add retry panels, legends, summary rails, marketing status copy, or route-local recovery UI.
- Anti-AI-slop: do not invent uptime, incident health, recovery state, fake component status, SaaS outage language, or remediation advice while moving deterministic fallback copy into runtime messages.
- Operator workflow clarity: thrown backend messages remain authoritative; the runtime fallback only covers missing or blank incident-feed error messages.
- Context visibility: org fallback handling, component normalization, incident normalization, selected year/range query, and caller-owned public status rendering remain unchanged.

## Public Status Incident Refresh Failure Boundary - 2026-05-09

- Hierarchy: keep year-switch and manual-refresh incident failures in the same public incident slot that already renders initial partial-load errors.
- Density: preserve the one-line incident error and existing loading/empty states; do not add retry panels, legends, banners, summary rails, or marketing public-status prose.
- Anti-AI-slop: do not invent component health, uptime, incident recovery progress, SaaS outage language, or remediation advice while sharing the controller-owned fallback.
- Operator workflow clarity: backend error messages still win; blank refresh errors fall back to the same runtime-message key used by initial incident loading.
- Context visibility: selected year, reload token, incident query range, current feed, locale-specific labels, and caller-owned public status rendering remain unchanged.

## Public Status Incident Content Fallback Boundary - 2026-05-09

- Hierarchy: keep incident timeline content inside the existing public incident card; missing content state labels should stay in the same compact timeline row.
- Density: preserve timestamp, state, and message as the only row facts; do not add badges, summaries, retry controls, or incident-health chrome for absent content state.
- Anti-AI-slop: do not invent incident state, uptime, recovery progress, cause, or remediation text when a timeline content item omits state data.
- Operator workflow clarity: known content states still use status-center state labels and tones, while absent content state uses the shared runtime empty marker.
- Context visibility: incident card title, copy, state color, range labels, selected year, component context, and public navigation remain unchanged.

## Public Status Component Uptime Fallback Boundary - 2026-05-09

- Hierarchy: keep component history uptime in the same public component history rows and block tooltips; missing uptime should not create a new health summary.
- Density: preserve compact component name, description, state, latest time, latest uptime, and history blocks as the only visible facts.
- Anti-AI-slop: do not invent uptime percentages, health, SLA, availability claims, or remediation copy when history payloads omit uptime data.
- Operator workflow clarity: real uptime percentages still render as percentages; absent uptime uses the shared runtime empty marker consistently across the latest value and history block title.
- Context visibility: public brand, component state, history colors, selected year, incident feed, and footer navigation remain unchanged.

## Public Status Component Description Fallback Boundary - 2026-05-09

- Hierarchy: keep component description/endpoint copy inside each existing public component row; missing summary text must not create a secondary detail panel.
- Density: preserve component title, copy, state, latest time, uptime, and history blocks as the compact scan path for public status readers.
- Anti-AI-slop: do not invent component descriptions, endpoints, ownership, uptime, SLA, health, or remediation copy when the backend payload omits description and endpoint.
- Operator workflow clarity: real component descriptions and endpoints remain authoritative; absent copy uses the shared runtime empty marker.
- Context visibility: public brand, component state, history colors, incident feed, year filter, and footer navigation remain unchanged.

## Exception Center Filter Refresh Boundary - 2026-05-09

- Hierarchy: keep the refresh control as the small icon action in the existing exception filter sidebar header.
- Density: preserve the compact sidebar title and single icon button; do not add helper text, status chips, retry banners, or a secondary filter toolbar.
- Anti-AI-slop: do not invent exception freshness, query success, backend health, or remediation state while adding the missing accessible label.
- Operator workflow clarity: the icon remains a filter-refresh affordance and only its assistive label moves to runtime messages.
- Context visibility: exception type, query bar, filter groups, table rows, recovery rail, detail hrefs, and existing route wrapper stay unchanged.

## Exception Center Route Type Boundary - 2026-05-09

- Hierarchy: keep unknown exception routes in the existing exception center surface, normalized to the 404 evidence model instead of showing unsupported route types.
- Density: preserve the single exception explorer surface without adding redirect banners, unknown-route cards, or extra recovery rails.
- Anti-AI-slop: do not invent exception categories, route health, backend status, or remediation state for unsupported route params.
- Operator workflow clarity: supported 403/404/500 routes keep their current evidence; unsupported params use the 404 route boundary before rendering.
- Context visibility: route wrapper, surface markers, query bar, filter groups, table rows, detail hrefs, and recovery handoffs stay unchanged.

## Alert Topology Context View Mode Boundary - 2026-05-09

- Hierarchy: keep topology view mode as the first compact context pill in the existing alert topology context panel.
- Density: preserve the single-line pill stack without adding mode selectors, route explainers, badges, or side panels.
- Anti-AI-slop: do not invent topology health, graph confidence, blast radius, relation freshness, or fake dependency evidence while localizing the visible mode label.
- Operator workflow clarity: machine route context and return links keep the original view-mode slug; only the human-readable pill label moves to runtime topology messages.
- Context visibility: topology source kind, edge id, environment, time range, selected service/entity, and alert evidence closure remain unchanged.

## Alert Center Selected Trigger Count Boundary - 2026-05-09

- Hierarchy: keep the trigger count inside the existing selected-alert active-window summary row.
- Density: preserve the compact count plus timestamp text; do not add count badges, helper prose, side panels, or incident workflow state.
- Anti-AI-slop: do not invent alert volume trends, recurrence quality, incident severity, health, ownership, or backend freshness while localizing the count phrase.
- Operator workflow clarity: selected alert identity, fingerprint, creator, active window, end time, row order, and closure actions remain unchanged.
- Context visibility: alert center selected rows, evidence context, mutation feedback, and return-link handoffs remain owned by the existing alert center page.

## Alert Center Refresh Unit Boundary - 2026-05-09

- Hierarchy: keep refresh cadence as inline meta in the existing alert evidence time-context row.
- Density: preserve the compact inherited time row without adding refresh badges, time pickers, helper prose, or status panels.
- Anti-AI-slop: do not invent refresh health, polling freshness, backend latency, live state, or time-range validity while localizing the seconds unit.
- Operator workflow clarity: refresh still reflects only inherited query cadence; time bounds, live/paused state, timezone, source, monitor, trace, closure, and evidence handoff behavior stay unchanged.
- Context visibility: alert center route wrapper, client island, time context row, topology/time return context, and closure feedback remain owned by the existing alert center page.

## Alert Center Filter And Time Chrome Copy Boundary - 2026-05-09

- Hierarchy: keep search, status filter, group action, and alert time labels inside the existing alert center filter row and grouped alert cards.
- Density: preserve the compact search/select controls and inline time/trigger summaries; do not add helper banners, extra status rails, or duplicate timestamps.
- Anti-AI-slop: do not invent alert freshness, incident state, SLA posture, backend health, or polling success while cataloging these labels.
- Operator workflow clarity: search/filter placeholders, delete action, last/end time labels, and trigger-count tooltip should resolve through runtime/helper catalogs instead of raw `alert.center.*` keys.
- Context visibility: alert filters, grouped cards, evidence context, topology/time return context, and closure feedback remain unchanged.

## Alert Center Status Chrome Supplemental Boundary - 2026-05-09

- Hierarchy: keep status labels in the existing alert center filter options, entity-context summary, grouped alert cards, and selected evidence rows.
- Density: preserve the three lifecycle labels only; do not add incident states, status badges, legends, or explanatory status panels.
- Anti-AI-slop: do not invent incident state, ownership, freshness, automation posture, or remediation confidence while making these labels available at first paint.
- Operator workflow clarity: firing, acknowledged, and resolved status copy should be available in web-next runtime/helper supplemental catalogs, not only after Angular locale bundle hydration.
- Context visibility: raw route status tokens, query-state parsing, filter values, grouped-card evidence, and closure feedback stay unchanged.

## Alert Entity Context Status Fallback Boundary - 2026-05-09

- Hierarchy: keep routed alert entity status inside the existing compact entity-context summary strip; do not add a status explanation card or secondary alert health panel.
- Density: preserve the inline status, severity, and search summary tokens so the alert center header remains quick to scan.
- Anti-AI-slop: do not invent alert lifecycle state, incident state, health, ownership, or backend freshness for unknown status route tokens.
- Operator workflow clarity: known alert statuses keep their localized labels, while unknown routed statuses use a localized fallback that still exposes the original token.
- Context visibility: entity id/name, return link, severity, search, and raw route context remain owned by the existing alert entity context pipeline.

## Alert Topology View Mode Fallback Boundary - 2026-05-09

- Hierarchy: keep view mode as the first compact topology context pill; do not add a route diagnostics panel or topology explanation block.
- Density: preserve the current one-line pill cluster, edge id, environment, time range, and return action.
- Anti-AI-slop: do not invent graph health, topology confidence, blast radius, relation freshness, or fake evidence for unknown view-mode slugs.
- Operator workflow clarity: known view modes keep their existing localized topology labels, while unknown modes use a localized fallback that still exposes the original route token for troubleshooting.
- Context visibility: data attributes, return links, selected service/entity, source kind, edge id, environment, and time range continue to carry the raw view-mode context.

## Alert Topology Source Kind Fallback Boundary - 2026-05-09

- Hierarchy: keep source kind as the second compact topology context pill beside the view-mode pill; do not add a new alert/topology explanation panel.
- Density: preserve the existing one-line context row, edge id, environment, and return action without expanding the alert center header.
- Anti-AI-slop: do not invent relation confidence, graph freshness, topology health, blast radius, or fake dependency evidence for unknown source-kind slugs.
- Operator workflow clarity: known relation sources keep their localized labels, while unknown slugs use a localized fallback that still exposes the original route token for troubleshooting.
- Context visibility: data attributes, return links, selected service/entity, edge id, environment, and time range continue to carry the raw source-kind context.

## Overview Investigation Lane Copy Boundary - 2026-05-09

- Hierarchy: keep investigation lane copy inside the existing overview lane cards for entity, logs, traces, and OTLP metrics.
- Density: preserve the compact lane title, eyebrow, copy, stat, and action rhythm without adding explanatory banners, onboarding panels, or route-choice summaries.
- Anti-AI-slop: do not invent SaaS-style workspace health, fake ingest readiness, fake trace coverage, fake entity quality, or marketing claims while filling missing runtime keys.
- Operator workflow clarity: lane copy should explain the next investigation step and keep entity-first triage plus three-signal handoff clear.
- Context visibility: lane hrefs, top-alert trace decision, entity count, app count, guidance next-link projection, and overview client island ownership remain unchanged.

## Bulletin Action And Empty-State Copy Boundary - 2026-05-09

- Hierarchy: keep bulletin action, editor, empty-selection, and validation copy in the existing toolbar/menu/dialog/view-model slots.
- Density: preserve the compact action menu, manage dialog, selected-summary rows, and validation message path without adding helper panels or duplicate explanations.
- Anti-AI-slop: do not invent bulletin health, metric safety, deletion recovery, workspace readiness, or SaaS-style dashboard promises while filling missing runtime keys.
- Operator workflow clarity: batch delete, new/edit dialog labels, no-selection guidance, and invalid JSON validation should read as concrete workbench actions, not raw translation keys.
- Context visibility: active selection, metrics table, refresh state, manage dialog ownership, current delete confirmation, and batch checkbox behavior remain unchanged.

## Settings Console Content Label Boundary - 2026-05-09

- Hierarchy: keep the right-side settings content pane as the single destination region for the selected settings route.
- Density: add only an accessible content-region label; do not add visible headings, cards, breadcrumbs, or extra route chrome.
- Anti-AI-slop: do not invent system health, policy readiness, token posture, or governance summaries while labeling the existing content pane.
- Operator workflow clarity: the label should identify the implemented settings content area while each child route keeps owning its form, table, and mutation workflow.
- Context visibility: active navigation state, compact header, left menu, route content, and row actions remain unchanged while the content label moves into runtime messages.

## Settings Console Navigation Label Boundary - 2026-05-09

- Hierarchy: keep the existing left settings menu as the only settings-console navigation surface.
- Density: add only an accessible navigation label; do not add visible headings, secondary rails, badges, or menu grouping.
- Anti-AI-slop: do not invent new settings sections, governance readiness, route health, or SaaS-style admin domains while labeling the existing navigation.
- Operator workflow clarity: the navigation label should describe the implemented system/message/object-store/token settings menu, with no change to route targets or active-route state.
- Context visibility: active route, menu labels, compact header, content pane, and row actions remain unchanged while the navigation label moves into runtime messages.

## Settings Console Header Copy Boundary - 2026-05-09

- Hierarchy: keep the compact settings console kicker, title, and supporting copy above the existing left navigation/content grid.
- Density: preserve the current single compact header without adding a summary rail, landing hero, or secondary admin explainer.
- Anti-AI-slop: do not invent governance readiness, token scope health, SaaS-style control-plane claims, or extra settings domains while localizing the header chrome.
- Operator workflow clarity: the header should orient operators to system, message, object-storage, and token settings, while each actual route remains the source of its form workflow.
- Context visibility: active route highlighting, settings menu labels, row actions, and content pane ownership remain unchanged while header copy moves into runtime messages.

## Settings Console Open Action Boundary - 2026-05-09

- Hierarchy: keep the open action as the small text link inside each settings console row.
- Density: preserve the existing four-row settings layout and compact row action without adding a toolbar, action column, or secondary navigation block.
- Anti-AI-slop: do not invent settings readiness, route health, permissions, or workspace policy while localizing the shared open label.
- Operator workflow clarity: each settings row still opens its implemented route; only the reusable action label moves into runtime messages.
- Context visibility: active route highlighting, row titles, row copy, route meta, and settings console wrapper ownership remain unchanged.

## Settings Console Open Action Context Boundary - 2026-05-09

- Hierarchy: keep the visible row action as the same small translated open link, with row-specific context only in the accessible name.
- Density: preserve the compact four-row menu and avoid adding visible helper text, extra route captions, or action buttons.
- Anti-AI-slop: do not invent settings readiness, permissions, route health, or workflow status while improving the repeated action label.
- Operator workflow clarity: screen-reader users should hear which concrete settings route the repeated open action targets.
- Context visibility: row title, route href, visible open label, active-route ownership, and settings shell layout remain unchanged.

## Settings Surface Overview Copy Boundary - 2026-05-09

- Hierarchy: keep the settings overview title and copy in the existing first `SurfaceSection`.
- Density: preserve the current two-section settings console rhythm without adding a summary rail, dashboard card, or governance explainer.
- Anti-AI-slop: do not invent settings health, workspace policy, setup progress, tenant posture, or future governance app status while moving section copy into runtime messages.
- Operator workflow clarity: the settings landing surface should continue to expose only implemented configuration entry points and roadmap-only governance notes.
- Context visibility: caller-provided page title/subtitle, facts, settings rows, governance rows, and route handoffs remain unchanged.

## Entity New Route Boundary - 2026-05-09

- Hierarchy: keep entity creation loading feedback in the existing `ClientWorkbench` route island before the shared editor surface appears.
- Density: add only route-owned loading-copy parity; do not add a setup banner, catalog summary rail, skeleton wizard, or extra authoring chrome.
- Anti-AI-slop: do not invent entity readiness, discovery confidence, owner coverage, health, or telemetry status while fixing loading-copy ownership.
- Operator workflow clarity: the create route still loads the draft plus catalog suggestions, preserving manual and telemetry handoff paths.
- Context visibility: source, monitor id, cache key, catalog suggestions, editor mode, and shared entity editor surface behavior remain unchanged.

## Settings Governance Future Meta Boundary - 2026-05-09

- Hierarchy: keep the future-governance marker as the compact meta line on the existing roadmap-boundary row.
- Density: localize the short meta text only; do not add a warning banner, badge stack, explanatory paragraph, or future-domain navigation.
- Anti-AI-slop: do not invent readiness, release dates, tenant policy, security posture, or SaaS-style roadmap packaging while fixing the zh-CN label.
- Operator workflow clarity: the row must still say future domains are planning-only and must not look like implemented app entries.
- Context visibility: current routes, forbidden future routes, roadmap docs, governance section title/copy, and route handoff behavior remain unchanged.

## Settings Governance Future Domain Boundary - 2026-05-09

- Hierarchy: keep future domains as inline text inside the existing roadmap-boundary row copy.
- Density: localize only the domain names in zh-CN; do not split them into chips, cards, tabs, or a future-domain navigation list.
- Anti-AI-slop: do not invent future app pages, readiness state, vendor benchmarks, launch dates, or commercial governance taxonomy while translating planning labels.
- Operator workflow clarity: translated domain names must still be framed as roadmap-only planning and must not imply implemented settings modules.
- Context visibility: current route rows, roadmap doc paths, forbidden future routes, section chrome, and governance review contracts remain unchanged.

## Passport Login Loading/Error Copy Boundary - 2026-05-09

- Hierarchy: keep loading and error feedback inside the existing credential card button and `StatusState` slot.
- Density: preserve the compact passport card, two fields, remember checkbox, notice slot, and single submit action without adding banners, policy panels, or auth health summaries.
- Anti-AI-slop: do not invent MFA state, account posture, workspace policy, token health, or security guarantees while moving loading and failure copy into runtime messages.
- Operator workflow clarity: failed authentication should keep the operator on the same login surface with backend error text when present and localized fallback text when not.
- Context visibility: redirect target ownership, session bootstrap, token persistence, password visibility, remember checkbox, and passport shell layout remain unchanged.

## Log Integration Source Alias Boundary - 2026-05-09

- Hierarchy: keep legacy log integration/source URLs as thin redirects into the existing OTLP intake entry.
- Density: preserve a redirect-only compatibility route; do not add a source picker, intake summary, legacy panel, or intermediate route shell.
- Anti-AI-slop: do not invent source-specific setup state, log filters, collector status, validation results, or fake ingestion health from the URL slug.
- Operator workflow clarity: source aliases carry only shared signal context into `/ingestion/otlp?signal=logs`; discarded log search/content filters stay discarded.
- Context visibility: time, entity, monitor, return, service, environment, trace/span, source, collector, and template route context ownership remains with `signal-route-context`.

## Log Integration Redirect Shell Helper Boundary - 2026-05-09

- Hierarchy: keep the legacy log integration placeholder as a thin redirect shell with one header, one placeholder panel, and two CTAs; do not add a setup wizard or intake dashboard.
- Density: preserve the compact compatibility route surface without source cards, status chips, validation rails, or extra explanatory rows.
- Anti-AI-slop: do not infer ingestion health, collector readiness, source validation, log freshness, or OTLP success from localized redirect copy.
- Operator workflow clarity: the redirect shell CTAs should resolve through the same zh-CN helper/legacy catalog as production while still pointing operators to unified intake and the logs workbench.
- Context visibility: auto-navigation to the ingestion route, manage-route fallback, placeholder shell markers, and source alias ownership remain unchanged.

## Settings Governance Roadmap Copy Boundary - 2026-05-09

- Hierarchy: keep the governance section as a compact boundary list under the settings surface; do not add a roadmap panel, badge rail, or future-domain navigation.
- Density: preserve the existing row list and short section copy while making zh-CN roadmap wording fully localized for quick scanning.
- Anti-AI-slop: do not invent future app availability, governance readiness, SaaS packaging, or competitor-style product claims while clarifying copy ownership.
- Operator workflow clarity: current routes remain the only actionable settings entries; future domains stay document-only planning with localized wording.
- Context visibility: implemented route groups, future-domain labels, roadmap doc links, and the no-`/security` navigation guard remain unchanged.

## Setting Config Route Loading Copy Boundary - 2026-05-09

- Hierarchy: keep the settings console title, locale/timezone/theme form, save feedback, and action row unchanged; only the route loading copy is asserted through shared runtime/helper ownership.
- Density: preserve the single compact client-workbench loading boundary without adding summary rails, helper banners, deployment health panels, or nested cards.
- Anti-AI-slop: do not invent system health, configuration drift, tenant posture, rollout status, or fake validation progress while wiring loading-copy parity.
- Operator workflow clarity: the route still loads `/config/system` and `/config/timezones`, then lets operators edit locale, timezone, and theme through the existing form.
- Context visibility: server wrapper, client island, cache key, save invalidation, locale/theme side effects, and settings-console context remain unchanged.

## Overview Route Loading Copy Boundary - 2026-05-09

- Hierarchy: keep the overview shell, rail, status grid, issue focus, guidance, and signal handoff surfaces unchanged; only route loading copy ownership moves into shared runtime messages.
- Density: preserve the compact first-screen loading boundary without adding banners, helper panels, duplicated recap cards, or synthetic setup status.
- Anti-AI-slop: do not invent overview readiness, fake health, fake signal availability, fake alert status, or SaaS-style onboarding copy while externalizing the loading label.
- Operator workflow clarity: the overview route still loads summary plus recent alerts through the existing client island and settled cache; the loading text simply names the current console while data resolves.
- Context visibility: refresh invalidation, cache key, overview route wrapper, client workbench boundary, and cross-signal handoff context remain unchanged.

## Topology Route Context Query Owner Boundary - 2026-05-09

- Hierarchy: keep topology as the existing entity relationship surface; only move route-context parsing out of the visible client island.
- Density: preserve the header, source strip, controls, canvas, edge evidence panel, and side rail without adding query summaries or debug chips.
- Anti-AI-slop: do not invent dependency discovery, root-cause analysis, blast radius, edge freshness, or live topology guarantees while changing the URL parsing owner.
- Operator workflow clarity: incoming entity, service, time, source, edge, view-mode, and signal context still focus the graph and drilldown links, but raw URL normalization belongs to a typed route contract.
- Context visibility: sourceKind, viewMode, edgeId, entity, service, environment, returnTo, trace, collector, and template params stay available to the topology view model.

## Actions Suggestion Query Owner Boundary - 2026-05-09

- Hierarchy: keep the safe-automation entry surface visually unchanged; only the URL context normalization owner moves out of the client island.
- Density: preserve the cold entry header, checklist, adapter-boundary panel, and suggested-action cards without adding query debug rows or new context badges.
- Anti-AI-slop: do not invent live execution state, adapter readiness, automation history, or auto-run capability while moving route params into a typed query contract.
- Operator workflow clarity: alert/entity/topology handoffs should still produce human-confirmed suggestions with evidence links, but the server route should own raw URL parsing before the client renders.
- Context visibility: entity, service, time, returnTo, source, signal, alert group, topology edge, collector, and template params stay available as typed suggestion context.

## Root Metadata Product IA Boundary - 2026-05-09

- Hierarchy: keep root metadata as a quiet browser/document identity layer; it should name the release workbench without adding page chrome or changing route ownership.
- Density: keep the title and description short enough for tabs, bookmarks, and snapshots; do not add marketing claims, SaaS packaging, or migration prose.
- Anti-AI-slop: remove pilot/Next.js implementation framing from the product surface and do not invent readiness guarantees, health posture, or cloud positioning.
- Operator workflow clarity: metadata should reinforce HertzBeat as the private-deployable observability workbench operators are actually using across monitors, OTLP signals, alerts, topology, and safe automation.
- Context visibility: root layout, AppFrame provider ownership, icons, default locale, and route compatibility redirects remain unchanged.

## Monitor Edit Return Context Boundary - 2026-05-09

- Hierarchy: keep the edit-monitor flow in the same editor shell as create; inherited list/entity/time context should be resolved by the route wrapper before the client island edits the monitor payload.
- Density: preserve the compact edit facts, parameter sections, save/detect/cancel controls, and existing return behavior without adding a second context panel.
- Anti-AI-slop: do not invent monitor health, save readiness, collector state, entity ownership, or validation progress while moving return-context parsing out of the client island.
- Operator workflow clarity: editing from a filtered monitor list, entity handoff, or time-scoped investigation must keep cancel/save return navigation consistent through one typed route-state contract.
- Context visibility: labels, pagination, entity id/name, time window, refresh, timezone, and safe internal return target remain available to the navigation helper without `useSearchParams` in the visible island.

## Monitor New Setup Query Boundary - 2026-05-09

- Hierarchy: keep the new-monitor setup flow in the existing editor shell; query app selection and return context should be resolved before the client island renders the form.
- Density: preserve the compact editor facts, base fields, parameter sections, and save/detect/cancel actions without adding a handoff banner or duplicate route summary.
- Anti-AI-slop: do not invent monitor health, collector readiness, parameter validation state, entity ownership, or setup progress while moving URL parsing out of the visible island.
- Operator workflow clarity: monitor type, entity return, list filters, and preserved time context should arrive as typed route state so create/cancel/save use the same navigation contract.
- Context visibility: app, labels, pagination, entity id/name, time window, refresh, timezone, and safe internal return target stay visible to navigation helpers instead of being re-read from `useSearchParams`.

## Trace Manage Query Owner Boundary - 2026-05-09

- Hierarchy: keep the trace workbench header, time rail, query row, trend band, dense trace table, selected evidence panel, attribution diagnostics, waterfall drawer, entity context, and cross-signal handoffs exactly where they are; only raw route parsing moves to the trace query owner.
- Density: do not add URL-state chips, route banners, query explanation rails, copied trace-explorer controls, or fake trace-health panels while passing typed route state into the client island.
- Anti-AI-slop: do not invent trace availability, service topology, sampling posture, error causality, entity readiness, collector state, backend health, or incident linkage from URL params.
- Operator workflow clarity: traceId, spanId, service, error-only filters, return links, absolute time cleanup, run/reset/time-control actions, detail drawer selection, and log/metric/entity/alert handoffs must behave the same with server-owned route state.
- Context visibility: inherited entity, service namespace, environment, source, returnTo, time bounds, refresh/live/tz, and code navigation hints remain visible through existing context rows, diagnostics, and handoff URLs.

## Ops Surface Route Posture Label Boundary - 2026-05-09

- Hierarchy: keep the safe-automation/ops route posture label inside the existing right rail status block, without adding a new readiness panel or explanatory banner.
- Density: preserve the compact rail card with mode label, entry-shell title, focus copy, and overview handoff; only the label owner changes.
- Anti-AI-slop: do not infer execution readiness, adapter health, approval state, queue freshness, or automation success from the route-posture label.
- Operator workflow clarity: the route posture label should describe the current entry-shell mode through ops runtime copy instead of a generic shared `common.mode` fallback.
- Context visibility: title, subtitle, tags, focus, checklist, status rows, and overview navigation stay visible and unchanged.

## Ops Surface Overview Handoff Copy Boundary - 2026-05-09

- Hierarchy: keep the overview handoff as the single compact button inside the route-posture rail, without adding a second navigation row or explanatory banner.
- Density: preserve the same right-rail card rhythm; only the handoff copy key moves from an English-only alias to the shared localized navigation key.
- Anti-AI-slop: do not infer overview readiness, automation execution status, approval posture, or evidence freshness from the navigation label.
- Operator workflow clarity: the handoff should read as the same overview action used by the rest of the workbench, not a route-local English-only special case.
- Context visibility: title, subtitle, tags, focus, checklist, route posture mode, and overview href stay unchanged.

## Ops Surface Entity Handoff Copy Boundary - 2026-05-09

- Hierarchy: keep the default header entity handoff beside the overview action, without adding a new entry strip, entity banner, or duplicated navigation row.
- Density: preserve the existing two-action header fallback; only the entity action copy key changes to the shared localized entity-center label.
- Anti-AI-slop: do not imply entity readiness, catalog completeness, topology coverage, or monitor binding state from this navigation label.
- Operator workflow clarity: the entity handoff should match the shared entity-center navigation vocabulary used by actions and shell navigation, not a route-local browse key.
- Context visibility: overview action, entity href, title, subtitle, facts, route posture rail, and checklist stay unchanged.

## Ops Surface Chrome Copy Catalog Boundary - 2026-05-09

- Hierarchy: keep the operator-surface kicker, route-contract panel, launch checklist, route-posture rail title, and entry-shell title in their current slots.
- Density: preserve the compact shell and rail text rhythm; only runtime/helper catalog ownership changes.
- Anti-AI-slop: do not add readiness claims, adapter status, fake route checks, or inferred automation health while cataloging chrome copy.
- Operator workflow clarity: shared ops-surface chrome should render localized operator vocabulary instead of raw `ops.surface.*` keys when a route uses the default shell.
- Context visibility: facts, status rows, header actions, route posture mode, overview/entity handoffs, and checklist rows remain unchanged.

## Ops Surface Page Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the ops-surface page regression on the existing shell, rail, status rows, and default overview/entity handoffs; do not add a helper-only route state panel.
- Density: preserve the compact mocked workbench shell and three focused assertions without adding broad snapshot checks.
- Anti-AI-slop: do not invent route readiness, adapter health, automation execution, topology coverage, or entity catalog status while moving the test onto shared messages.
- Operator workflow clarity: the page regression should exercise the same shared translator helper as runtime surfaces instead of carrying a private `ops.surface.*` and `menu.*` map.
- Context visibility: cold-workbench route tokens, primitive ownership, default handoff labels, and operator-shell source checks remain unchanged.

## AppFrame AI Prompt Chrome Copy Boundary - 2026-05-09

- Hierarchy: keep the compact AI prompt field inside the existing AppFrame header, between setup progress and utility actions.
- Density: preserve the single-line input plus icon-only submit button; only runtime/helper catalog ownership changes.
- Anti-AI-slop: do not imply AI RCA availability, automation execution, agent connectivity, or guaranteed remediation from the prompt placeholder.
- Operator workflow clarity: the placeholder and submit label should resolve through shared runtime catalogs instead of raw `ai.chat.*` keys.
- Context visibility: setup state, alert notification controls, mute/lock/settings/user actions, and main content shell remain unchanged.

## Monitor Editor Locale Copy Boundary - 2026-05-09

- Hierarchy: keep monitor editor label/annotation controls and validation feedback inside the existing editor form, without adding helper panels, banners, or duplicate validation summaries.
- Density: preserve the compact key/value editors, base settings grid, detect/save/cancel row, and single-line action feedback; only locale-owned copy changes.
- Anti-AI-slop: do not invent monitor health, collector readiness, validation progress, save guarantees, entity ownership, or setup wizard state while localizing helper and validation text.
- Operator workflow clarity: add/remove label and annotation actions plus app/name/interval/cron/required-field validation must read as concrete monitor-authoring controls, not raw English fallback strings in zh-CN.
- Context visibility: monitor app, scrape mode, schedule type, params, labels, annotations, return context, and save/detect behavior stay unchanged while display copy moves to the runtime/helper catalogs.

## Monitor New Page Locale Helper Boundary - 2026-05-09

- Hierarchy: keep the new-monitor route inside the existing monitor editor surface with the same shell kicker, title, facts, main form, side payload, detect/save/cancel actions, and return context; only align the page regression with a zh-CN helper.
- Density: preserve the compact editor grid, key/value rows, action row, and client-workbench cache markers without adding setup summaries, health panels, or extra validation rails.
- Anti-AI-slop: do not invent monitor readiness, collector probes, entity ownership, template recommendations, fake save state, or hosted onboarding copy while replacing English assertions.
- Operator workflow clarity: the new route should assert localized authoring chrome such as the new-monitor title and save action while the draft loader and handoff app context remain unchanged.
- Context visibility: app/template context, cache key, settled TTL, return context, param loading path, and monitor-editor client island ownership remain visible and unchanged.

## Monitor Edit Page Locale Helper Boundary - 2026-05-09

- Hierarchy: keep the edit-monitor route inside the existing monitor editor surface with the existing monitor name as the title, unchanged facts, main form, side payload, detect/save/cancel actions, and return context; only align the page regression with a zh-CN helper.
- Density: preserve the compact editor grid, key/value rows, action row, and client-workbench cache markers without adding setup summaries, migration warnings, health panels, or extra validation rails.
- Anti-AI-slop: do not invent monitor health, collector readiness, save guarantees, ownership hints, template recommendations, or hosted onboarding copy while replacing English action assertions.
- Operator workflow clarity: the edit route should assert localized authoring chrome such as the save action while the real monitor name, draft loader, and return-context handoff remain unchanged.
- Context visibility: monitor id, app/template context, cache key, settled TTL, return context, collector/detail load path, and monitor-editor client island ownership remain visible and unchanged.

## Alert Integration Canonical Source Boundary - 2026-05-09

- Hierarchy: keep the alert integration source page on the existing source rail and markdown document shell, but canonicalize unknown URL slugs before rendering fallback content.
- Density: preserve the compact source rail, token action, and document panel; do not add unknown-source banners, empty shells, selector summaries, or fake validation cards.
- Anti-AI-slop: do not invent provider setup state, source health, collector status, validation results, or provider-specific evidence for unknown source params.
- Operator workflow clarity: known sources render their existing document workflow; unknown source params redirect to the canonical default source route instead of showing default Webhook under a misleading URL.
- Context visibility: selected source id/name, rail selection, token management handoff, document loading, and fallback guide behavior remain owned by the alert integration source model.

## Passport Lock Fact Copy Boundary - 2026-05-09

- Hierarchy: keep lock-page facts in the small passport lock view-model payload; do not add a visible status banner, account detail panel, or unlock workflow summary.
- Density: preserve the existing compact unlock card, password field, submit action, and validation error slot.
- Anti-AI-slop: do not invent session health, account identity, token state, MFA posture, workspace policy, or unlock guarantees while moving fact values into runtime messages.
- Operator workflow clarity: the unlock form still validates only a non-empty password and returns to overview; only fact copy ownership moves out of source literals.
- Context visibility: route wrapper, client island, passport shell, unlock marker, validation copy, and shared i18n provider remain unchanged.

## Passport Lock Form Action Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the unlock title, password placeholder, and submit label inside the existing compact lock card; do not add a secondary auth panel, session summary, or security banner.
- Density: preserve the wide passport panel, centered avatar, single password input, right-aligned action, and inline validation state.
- Anti-AI-slop: do not invent MFA, account identity, token status, workspace policy, or unlock guarantees while cataloging the form action copy.
- Operator workflow clarity: lock title/action and placeholder should resolve through shared runtime/helper catalogs before the Angular locale bundle fallback is needed.
- Context visibility: passport shell, language switch, product intro, route wrapper, client island, and return-to-overview behavior remain unchanged.

## Passport Lock Page Locale Helper Boundary - 2026-05-09

- Hierarchy: keep the same passport shell, wide dark unlock panel, avatar, single password field, submit button, and inline failure slot; only align the page regression with its declared zh-CN provider locale.
- Density: preserve the compact lock-card rhythm without adding account details, security banners, MFA prompts, or policy copy.
- Anti-AI-slop: do not invent session risk, token health, workspace policy, tenant state, unlock guarantees, or hosted-service posture while replacing English test assertions.
- Operator workflow clarity: when the mocked provider declares `locale: 'zh-CN'`, the lock page regression should assert the same zh-CN unlock title/action and placeholder operators see.
- Context visibility: route wrapper, client island, passport shell markers, background asset, overview redirect, validation path, and language controls remain unchanged.

## Passport Lock Failure Title Helper Parity Boundary - 2026-05-09

- Hierarchy: keep failed-unlock feedback in the existing inline status state under the password form; do not add a banner, modal, retry wizard, or account policy panel.
- Density: preserve one password input, one submit action, and one compact failure title/copy block.
- Anti-AI-slop: do not invent account lockout, MFA, session risk, token posture, workspace policy, or security guarantees while cataloging the failure title.
- Operator workflow clarity: the failed validation title should resolve through shared runtime/helper catalogs while the validation copy stays owned by the lock view-model.
- Context visibility: passport shell, unlock form, route wrapper, client island, validation path, and overview redirect remain unchanged.

## Passport Shell About Points Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the six product-truth bullets in the existing passport hero list; do not add a marketing hero, secondary proof panel, or SaaS positioning layer.
- Density: preserve the single-column desktop bullet list, separators, brand lockup, auth panel, and footer spacing.
- Anti-AI-slop: do not invent uptime, AI RCA readiness, commercial packaging, hosted-service claims, or copied competitor positioning while cataloging helper copy.
- Operator workflow clarity: the passport hero should describe HertzBeat's collectors, templates, entities, telemetry, alerts, notification, and private deployment scope through shared message catalogs.
- Context visibility: language switch, login panel, brand asset, background treatment, and localized footer remain unchanged.

## Passport Shell Product Intro Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the passport description and two-line hero headline in the current brand lockup and desktop intro area; do not add a new marketing hero or proof panel.
- Density: preserve the compact logo, one-line description, two-line headline, separators, bullet list, auth panel, and footer rhythm.
- Anti-AI-slop: do not invent hosted SaaS claims, commercial packaging, uptime promises, AI readiness, or copied competitor language while cataloging the helper copy.
- Operator workflow clarity: the intro should state HertzBeat's open-source private-deployable operations observability scope and its collectors/templates/entities/telemetry/alert closure coverage through shared catalogs.
- Context visibility: language switch, login panel, product bullets, background treatment, brand asset, and localized footer remain unchanged.

## Passport Shell Component Locale Helper Boundary - 2026-05-09

- Hierarchy: keep `PassportShell` as the shared auth shell with brand lockup, desktop intro, product bullets, language control, panel, and footer; only align the component regression with the declared zh-CN locale.
- Density: preserve the current compact auth composition, single-column intro list, separators, lowered logo, and footer spacing without adding proof cards, marketing rails, or account-state panels.
- Anti-AI-slop: do not invent login readiness, tenant posture, SaaS hosting, uptime, AI assistance, or security guarantees while replacing the default English test translator.
- Operator workflow clarity: when the mocked provider declares `locale: 'zh-CN'`, the shell regression should assert the same zh-CN intro, about points, language switch, and footer copy that production operators see.
- Context visibility: background asset, locale dropdown wiring, auth panel structure, product intro, about bullets, and Apache license footer remain unchanged.

## Passport Login Credential Action Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the credential tab, missing-field feedback, and submit action inside the existing passport login card; do not add a new security banner, MFA panel, or auth-summary rail.
- Density: preserve the single credential panel, username/password fields, remember-me row, submit button, and inline validation slots.
- Anti-AI-slop: do not invent session health, token posture, workspace policy, SaaS security claims, or hosted login flows while cataloging helper copy.
- Operator workflow clarity: credential tab, submit label, and missing account/password feedback should resolve through shared runtime/helper catalogs so login regressions cannot hide raw keys.
- Context visibility: redirect target, session notice, password visibility controls, shell intro, language switch, footer, and submit flow remain unchanged.

## Settings Surface Fact Label Boundary - 2026-05-09

- Hierarchy: keep settings facts in the existing `SettingsSurfacePage` header fact row; do not add a governance card, helper banner, or secondary status panel.
- Density: preserve the compact workspace, mode, and focus facts already passed into the shared workbench page.
- Anti-AI-slop: do not invent settings health, setup progress, governance status, tenancy, or permission state while localizing the fact labels.
- Operator workflow clarity: settings entries still receive the caller-provided title and next-step focus; only mode/focus label/value ownership moves into settings runtime keys.
- Context visibility: settings route wrappers, surface rows, governance rows, and current route handoffs stay unchanged.

## Settings Surface Row Meta Boundary - 2026-05-09

- Hierarchy: keep the two settings overview rows inside the existing flat surface section; the row meta should name the route/API contract role without adding a status badge or extra summary rail.
- Density: replace the generic `stable` meta with short runtime-owned labels so the row remains scannable in the compact list.
- Anti-AI-slop: do not invent readiness scores, configuration health, tenant posture, or future settings domains while clarifying the row meta copy.
- Operator workflow clarity: route navigation and operations configuration remain the two existing rows; only their meta labels become specific to the operator contract they describe.
- Context visibility: settings surface title/copy, governance rows, route handoffs, and caller-provided next-step focus stay unchanged.

## Ops Surface Fact Copy Boundary - 2026-05-09

- Hierarchy: keep the shared safe-automation/ops entry facts and status rows in the existing compact entry surface.
- Density: preserve workspace, focus, mode, signal count, and the two status rows without adding setup panels, workflow summaries, or fake run-state badges.
- Anti-AI-slop: do not invent automation readiness, execution health, approvals, queue depth, or signal health while localizing fact labels and row titles.
- Operator workflow clarity: caller-provided focus and tag count remain authoritative; only shared ops surface label/title/mode copy moves into runtime messages.
- Context visibility: route wrapper, client island, safe automation entry payload, and existing row copy remain unchanged.

## Safe Automation Entry Chrome Helper Parity Boundary - 2026-05-09

- Hierarchy: keep the safe automation kicker, title, subtitle, overview/entity handoffs, and shell explainer in the existing cold entry header and left panel; do not add a new automation summary rail.
- Density: preserve the compact header/action row, cold shell panel, roadmap panel, checklist rail, and empty adapter state.
- Anti-AI-slop: do not invent executable automation state, approval counts, queue health, AI action readiness, or future adapter availability while cataloging entry chrome copy.
- Operator workflow clarity: the entry header and first two navigation actions should resolve through shared runtime/helper catalogs rather than page-local test maps.
- Context visibility: route wrapper, client island, suggestion context, adapter-boundary copy, suggested-action cards, and empty adapter state remain unchanged.

## AppSidebar Component Helper Boundary - 2026-05-09

- Hierarchy: keep `AppSidebar` as the bounded, sectioned navigation component backed by shared sidebar sections; this slice only aligns its component regression with runtime/helper labels.
- Density: preserve compact section headers, flat rows, icon sizing, and bounded scroll without adding cards, footer panels, operator badges, or extra route descriptions.
- Anti-AI-slop: do not invent new navigation groups, fake status/public/action routes, onboarding copy, AI routes, or SaaS-style product hierarchy while replacing placeholder labels.
- Operator workflow clarity: component-level sidebar tests should assert the same zh-CN labels operators see for ingestion, objects, observability, alerting, dashboards, settings, MCP server, and help center.
- Context visibility: active route state, hidden incident/action/status-public entries, help/MCP links, flat row styling, and scroll ownership remain unchanged.

## AppFrame Utility Chrome Helper Boundary - 2026-05-09

- Hierarchy: keep `AppFrame` utility controls as the existing icon-only header cluster with screen-reader labels and the compact AI prompt.
- Density: preserve the current trigger count, footer, setup card, and prompt footprint without adding helper text, command palettes, onboarding prose, or secondary nav.
- Anti-AI-slop: do not imply AI execution readiness, notification health, GitHub sync, account state, or setup completion while moving the regression to shared helper labels.
- Operator workflow clarity: visible and assistive shell labels should resolve through the shared helper/runtime catalogs so language switching, utility actions, and AI prompt chrome cannot drift into private test strings.
- Context visibility: setup progress, footer license, help launcher, notification mute state, lock/settings/user controls, and child content rendering remain unchanged.

## Locale Option List Helper Boundary - 2026-05-09

- Hierarchy: keep locale switching as a compact shell utility list; this slice only aligns the regression labels with runtime/helper catalogs.
- Density: preserve the short option rows with flag abbreviation, localized label, and active marker without adding helper prose, banners, or a settings preview.
- Anti-AI-slop: do not invent locale availability, translation completeness, browser-language detection, or SaaS-style account preferences while removing the private test map.
- Operator workflow clarity: the visible language labels should resolve through the same shared helper as production so shell language switching does not drift from settings locale copy.
- Context visibility: locale code ownership, `onSelect`, active-row rendering, class hooks, and the existing active check marker remain unchanged.

## Safe Automation Page Regression Helper Boundary - 2026-05-09

- Hierarchy: keep the safe automation page regression focused on the same cold entry shell, adapter boundary, checklist rail, and human-confirmed suggestion cards.
- Density: preserve compact assertions for entry copy, roadmap chips, localized suggestion meta, and evidence links without adding new page scaffolding.
- Anti-AI-slop: do not invent live automation runs, execution readiness, adapter health, approval counts, or AI action availability while moving the page test to the shared helper.
- Operator workflow clarity: the page regression should use the same shared translator helper as runtime-facing tests so suggestion and adapter-boundary labels do not drift in a private map.
- Context visibility: route wrapper, client island, query-state suggestion context, sanitized return URL, and manual-confirmation guardrails stay unchanged.

## Safe Automation Domain Model Helper Boundary - 2026-05-09

- Hierarchy: keep the domain model regression focused on catalog entries, recent runs, approvals, adapter boundary, checklist, and next hops without adding a live execution dashboard.
- Density: preserve compact domain assertions for labels, owners, posture, run duration, approval evidence, metrics, and roadmap-only adapter labels.
- Anti-AI-slop: do not invent execution adapter health, queue depth, approval SLA, AI action confidence, live run status, or automation readiness while moving domain copy to the shared helper.
- Operator workflow clarity: catalog, run, approval, and manual-confirmation copy should resolve through the shared helper so tests mirror runtime text ownership instead of a model-local map.
- Context visibility: alert/entity suggestion context, evidence URL preservation, adapter-pending boundary, roadmap-demo snapshot state, and no-auto-execute guardrails stay unchanged.

## Safe Automation View Model Helper Boundary - 2026-05-09

- Hierarchy: keep the surface view-model regression on placeholder shell, catalog cards, run rows, approval rows, status tones, handoff rows, and next hops without adding a second automation console.
- Density: preserve compact row/card assertions for snapshot labels, risk tones, run/approval status tones, handoff copy, and ops fact labels.
- Anti-AI-slop: do not invent live run progress, execution health, approval SLA, queue depth, AI confidence, or adapter availability while moving view-model copy to the shared helper.
- Operator workflow clarity: surface chrome, handoffs, status tones, and snapshot markers should resolve through shared helper messages so the page and model regressions cannot drift.
- Context visibility: alert/entity suggestion context, manual-confirmation posture, evidence URLs, adapter-pending boundary, and roadmap-demo snapshot state remain unchanged.

## Incident Entry Page Regression Helper Boundary - 2026-05-09

- Hierarchy: keep the incident page regression on the existing cold entry header, shell panel, checklist rail, and adapter-waiting empty state.
- Density: preserve compact assertions for entry copy, chips, checklist rows, and empty adapter copy without adding incident tables, metrics, or a response desk shell.
- Anti-AI-slop: do not invent live incident counts, escalation state, RCA readiness, ownership schedules, or adapter availability while moving the page test to the shared helper.
- Operator workflow clarity: the page regression should use the shared translator helper so entry chips, checklist rows, and empty adapter labels do not drift in a private map.
- Context visibility: route wrapper, client island, overview/entity handoffs, placeholder guardrails, and no-fake-incident assertions remain unchanged.

## Incident View Model Helper Boundary - 2026-05-09

- Hierarchy: keep the incident view-model regression focused on entry shell, incident cards, timeline rows, ownership rows, checklist, handoff rows, and compact ops facts.
- Density: preserve card/row assertions for severity, stage, blast radius, timeline meta, owner queues, and handoff destinations without adding an incident desk redesign.
- Anti-AI-slop: do not invent live incident totals, escalation timers, RCA state, on-call schedule health, fake ownership, or adapter readiness while moving view-model copy to the shared helper.
- Operator workflow clarity: surface chrome, row labels, ownership copy, and handoff labels should resolve through shared helper messages so page, model, and view-model regressions cannot drift.
- Context visibility: route wrapper, client island, overview/entity actions, log/trace/overview handoffs, and no-fake-incident guardrails stay unchanged.

## ColdConfirm Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep `ColdConfirmDialog` as the shared destructive/confirmation shell; changing fallback locale order must not alter caller-provided titles, body copy, action labels, or footer ownership.
- Density: preserve the compact warning icon, kicker, body, and two-action footer so alert and setting dialogs remain quick to scan.
- Anti-AI-slop: do not add risk prose, extra confirmation steps, fake safety scores, SaaS-style destructive-action packaging, or new workflow hints while correcting the fallback catalog order.
- Operator workflow clarity: shared chrome copy resolves from the runtime catalog with a deterministic English fallback when no caller locale is available; domain-specific labels still come from each caller.
- Context visibility: pending-state disablement, `onCancel`/`onConfirm`, `OverlayDialog` close behavior, data markers, and destructive confirmation context remain unchanged.

## TagInput Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep `TagInput` as the shared compact chip editor; changing fallback locale order must not add helper text, chip metadata, or a separate suggestion panel.
- Density: preserve the chip row, tiny remove button, hidden input, and anchored suggestion popover so labels and filters remain quick to scan in dense admin forms.
- Anti-AI-slop: do not invent tag taxonomy, validation prose, search guidance, fake suggestions, or copied SaaS label-management language while correcting the fallback catalog order.
- Operator workflow clarity: shared placeholder/remove copy resolves from runtime messages with an English fallback when no caller locale is available; caller placeholders and suggestion lists remain authoritative.
- Context visibility: hidden field ownership, draft input behavior, suggestion filtering, popover positioning, chip removal, and data markers stay unchanged.

## NumberStepper Default Locale Fallback Boundary - 2026-05-08

- Hierarchy: keep `NumberStepper` as the compact numeric input primitive; changing fallback locale order must not add helper text, validation prose, or a separate stepper toolbar.
- Density: preserve the single-line input, narrow icon buttons, and screen-reader-only action labels so dense forms keep their current scan rhythm.
- Anti-AI-slop: do not invent numeric policy copy, fake validation state, SaaS settings language, or decorative status chrome while correcting the fallback catalog order.
- Operator workflow clarity: shared decrement/increment copy resolves from runtime messages with an English fallback when no caller locale is available; caller-provided labels remain authoritative.
- Context visibility: min/max/step clamping, disabled behavior, input ownership, action markers, and icon affordances stay unchanged.

## Entity Detail Route Manifest Locale Parity Boundary - 2026-05-08

- Hierarchy: keep the entity detail parity route focused on the cold full-width entity detail surface, compact header, count strip, signal grid, related/next/drilldown panels, footer, help launcher, and action row.
- Density: preserve the existing selector-heavy smoke path and short text/action snippets without adding extra parity targets, screenshot modes, or synthetic wait states.
- Anti-AI-slop: update only expected locale snippets for the real default entity detail surface; do not add fake health/status text, fake navigation, or product prose.
- Operator workflow clarity: route parity must assert the same visible fallback copy operators see after the entity detail surface moved to English default runtime messages.
- Context visibility: surface markers, header/action/count selectors, footer/help anchors, entity detail copy, and command row labels remain covered by the route manifest.

## Entity Definition Draft Workspace Boundary - 2026-05-10

- Hierarchy: keep definition import/edit as the same single draft-to-catalog flow; this slice only moves request-workspace lookup to the mapping boundary that owns relation resolution.
- Density: do not add import banners, workspace chips, explanatory cards, or extra authoring chrome while preserving definition parsing and relation evidence.
- Anti-AI-slop: do not synthesize relation targets, fake catalog matches, inferred workspace ownership, or import success evidence from route context.
- Operator workflow clarity: default definition parsing should remain one action, with workspace-scoped relation resolution happening where entity DTO mapping and relation lookup already meet.
- Context visibility: entity id, relation target ref/id, bundle order, explicit workspace overloads, and request-scoped catalog boundaries stay visible through existing DTOs and tests.

## Entity List Catalog Workspace Boundary - 2026-05-10

- Hierarchy: keep the entity list as the same catalog-summary surface; this slice only moves default request-workspace lookup to the catalog query boundary that owns page predicates.
- Density: do not add workspace badges, filter chrome, warnings, or empty-state copy while preserving compact list summaries and runtime evidence.
- Anti-AI-slop: do not infer catalog rows from route context, synthesize hidden entities, fake total counts, or turn workspace scoping into decorative UI copy.
- Operator workflow clarity: default entity list requests should remain a single list action, with request-scoped filtering happening where catalog page query and persisted rows meet.
- Context visibility: explicit workspace overloads, page totals, scoped row filtering, latest definition activity, and runtime status evidence stay covered by existing DTO and service contracts.

## Entity Detail Access Workspace Boundary - 2026-05-10

- Hierarchy: keep entity detail as the same single catalog detail surface; this slice only moves default request-workspace lookup to the workspace access boundary that owns entity accessibility.
- Density: do not add detail banners, workspace chips, filtered-state copy, or extra evidence rows while preserving identity, monitor bind, and relation child evidence.
- Anti-AI-slop: do not synthesize accessible entities, fake missing-detail fallbacks, inferred workspace ownership, or hidden cross-tenant evidence when default detail access is scoped.
- Operator workflow clarity: default detail requests should remain one load action, with request-scoped entity acceptance happening before child-evidence assembly.
- Context visibility: explicit workspace overloads, entity id, accepted entity row, identities, monitor binds, relations, and missing-entity behavior stay covered by service contracts.

## Entity Identity Candidate Workspace Boundary - 2026-05-10

- Hierarchy: keep monitor-to-entity binding candidates as the existing suggestion evidence, not a new catalog or topology surface; this slice only moves default request-workspace lookup to the access boundary.
- Density: do not add candidate badges, workspace hints, empty-state copy, or extra operator chrome while preserving direct/suggested recommendations and matched identity evidence.
- Anti-AI-slop: do not synthesize candidate entities, fake identity matches, inferred ownership, or cross-workspace rows when monitor identity hints are scoped.
- Operator workflow clarity: default binding suggestions should remain one request, with workspace filtering applied before candidate scoring is exposed to the operator.
- Context visibility: explicit workspace overloads, matched identity keys, already-bound evidence, candidate score, and hidden cross-tenant rows stay covered by service contracts.

## Entity Catalog Suggestions Request Workspace Boundary - 2026-05-10

- Hierarchy: keep catalog suggestions as quiet editor/read-model assistance, not a separate catalog browser; this slice only moves default request-workspace lookup to the access boundary.
- Density: do not add workspace chips, suggestion explanations, empty-state banners, or additional editor chrome while preserving compact owner, namespace, environment, system, lifecycle, tier, reference, language, and link-provider suggestions.
- Anti-AI-slop: do not synthesize suggestion values, infer ownership, invent catalog rows, or expose cross-workspace profile hints when default suggestions are scoped.
- Operator workflow clarity: default suggestions should remain a single lookup, with request-scoped entity filtering applied before profile fields are aggregated.
- Context visibility: explicit workspace overloads, sort order, suggestion limit, entity refs, inherited refs, and scoped row filtering stay covered by service contracts.

## Entity Relation Replacement Request Workspace Boundary - 2026-05-10

- Hierarchy: keep relation replacement as part of the definition/catalog mutation workflow; this slice only moves default request-workspace lookup behind the access boundary used by target resolution.
- Density: do not add relation badges, workspace chips, warnings, topology previews, or extra mutation chrome while preserving normalized unique relation rows.
- Anti-AI-slop: do not synthesize target entities, infer relation edges, invent cross-workspace matches, or turn unresolved refs into fake topology evidence.
- Operator workflow clarity: default relation replacement should remain one mutation step, with request-scoped direct-id and typed-reference target checks happening before persistence.
- Context visibility: explicit workspace overloads, source id checks, target refs, dedupe keys, direct-id compatibility, and normalized relation rows stay covered by service contracts.

## Entity Definition Type Resolver Boundary - 2026-05-10

- Hierarchy: keep definition import/edit as the same draft-to-catalog flow; this slice only moves kind/entity-type/subtype normalization into a narrow resolver boundary.
- Density: do not add definition UI chrome, import hints, taxonomy badges, or explanatory copy while preserving canonical kind/type output.
- Anti-AI-slop: do not invent entity types, synthetic subtypes, hidden catalog matches, or SaaS-style taxonomy labels while resolving aliases like `Entity`, `datastore`, and `api`.
- Operator workflow clarity: definition parsing should still feel like one import action; type resolution becomes a stable domain rule that normalization calls before DTO mapping.
- Context visibility: raw `kind`, `entityType`, `entity_type`, `type`, Datadog service aliases, explicit subtype keys, and legacy default service fallback stay covered by service contracts.

## Entity Definition Telemetry Normalizer Boundary - 2026-05-10

- Hierarchy: keep definition import/edit as one draft-to-catalog flow; this slice only moves telemetry identity and monitor-bind extraction into a narrow normalization boundary.
- Density: do not add import warnings, telemetry panels, match-score badges, or authoring chrome while preserving compact identity and monitor-bind evidence in the definition model.
- Anti-AI-slop: do not synthesize identities, fake monitor ids, inferred binding scores, or hidden match context while extracting declared telemetry evidence.
- Operator workflow clarity: telemetry blocks should remain declarative import evidence, with malformed rows quietly ignored instead of becoming fake suggestions or UI state.
- Context visibility: identity key/value/source/priority/primary, monitor id aliases, bind source/type/status, score, and match context stay covered by service contracts.

## Entity Definition Relation Normalizer Boundary - 2026-05-10

- Hierarchy: keep definition import/edit as one draft-to-catalog flow; this slice only moves relation and dependency extraction into a narrow normalization boundary.
- Density: do not add topology previews, dependency badges, relation warnings, or import chrome while preserving compact declared relation evidence in the definition model.
- Anti-AI-slop: do not synthesize target entities, fake topology edges, hidden relation scores, or inferred dependency refs while extracting declared relation blocks.
- Operator workflow clarity: relation and dependsOn declarations should remain deterministic import evidence, with malformed rows quietly ignored rather than becoming fake graph state.
- Context visibility: relation type/source/status, target id/ref, attributes, dependsOn strings, dedupe signatures, and catalog reference fallback stay covered by service contracts.

## Entity Definition HertzBeat Evidence Normalizer Boundary - 2026-05-10

- Hierarchy: keep definition import/edit as one draft-to-catalog flow; this slice only moves HertzBeat-specific evidence block extraction into a narrow normalization boundary.
- Density: do not add code-location panels, saved-query previews, pipeline chips, performance badges, or import chrome while preserving compact declared evidence in the definition model.
- Anti-AI-slop: do not synthesize repositories, fake saved queries, inferred performance tags, or invented pipeline fingerprints while extracting HertzBeat evidence blocks.
- Operator workflow clarity: code locations, events, logs, performance tags, and pipeline fingerprints should stay deterministic import evidence, with malformed rows quietly ignored.
- Context visibility: repositoryURL aliases, code paths, event/log queries, performance tags, canonical pipelines, and legacy `ci-pipeline-fingerprints` fallback stay covered by service contracts.

## Explorer Row Handoff Href Boundary - 2026-05-07

- Hierarchy: keep the operation link in the existing result-table operation column, without adding a handoff rail, new action column, or extra route chooser.
- Density: preserve the compact table rhythm so signal, service, operation, status, duration, and timestamp stay readable in one scan.
- Anti-AI-slop: avoid page-local signal routing, fake navigation, copied query-console route semantics, or translated-label logic while moving operation href ownership into explorer row data.
- Operator workflow clarity: operation clicks must follow the same row payload as the signal badge, so query controls, result rows, detail panel, and trace/log/metric/entity handoffs remain unchanged.
- Context visibility: translated signal labels can vary, but row identity, signal key, operation text, operation href, active detail row, and signal badge color stay aligned with the same explorer payload.
