# Session Security Boundary Brief

Local-only parity note for milestone 4.

## 2026-05-10 Session BFF Route Ownership Fix

- Hierarchy: browser-facing `/api/*` traffic must enter the Next BFF route layer first, where HttpOnly UI cookies are converted into backend `Authorization`; `next.config.mjs` must not rewrite `/api/:path*` directly to the backend.
- Density: do not add login prompts, auth banners, duplicate session cards, or token copy into the workbench; keep the authenticated workflow silent when authorized calls succeed.
- Anti-AI-slop: never expose access or refresh tokens back to browser localStorage or visible UI to patch missing auth context.
- Operator workflow clarity: after successful login, protected pages should load normal data through same-origin BFF cookies, and only genuinely unauthenticated sessions should redirect to `/passport/login`.
- Context visibility: session cookies, refresh cookie fallback, BFF proxy handoff, backend Authorization header, and 401/403 recovery stay covered by session security contracts and live smoke.

## 2026-05-10 Old Monitor Delete Row Cleanup Boundary

- Hierarchy: old monitor deletion should keep service-discovery expansion, cleanup sequencing, scheduler cancellation, and event publication in `MonitorServiceImpl`, while accepted monitor row lookup plus delete live behind an old-monitor catalog write-model boundary.
- Density: do not add UI copy, cleanup summaries, duplicate delete controls, route aliases, helper banners, synthetic rows, or response fields while moving raw row deletion ownership.
- Anti-AI-slop: never infer deleted monitor rows from entity, telemetry, alert evidence, topology, labels, or selection display state; delete only persisted rows accepted from the expanded old monitor id set.
- Operator workflow clarity: deletion must keep existing no-op semantics, cleanup order, scheduler cancellation, and delete-event emission for the same persisted monitor rows.
- Context visibility: submitted ids, expanded monitor ids, accepted monitor rows, row-delete boundary, cleanup ids, scheduler cancellation, and events stay visible through source and behavior contracts.

## 2026-05-10 Old Monitor Row Save Boundary

- Hierarchy: old monitor create/edit should keep validation, scheduling, dashboard, collector-bind, and parameter orchestration in `MonitorServiceImpl`, while the final monitor row save lives behind an old-monitor catalog write-model boundary.
- Density: do not add UI copy, save summaries, duplicate forms, route aliases, helper banners, synthetic monitor rows, or new response fields while moving raw monitor-row persistence.
- Anti-AI-slop: never synthesize monitor rows from entity, telemetry, topology, alert evidence, or rendered form state; only persist the submitted and scheduled old monitor row.
- Operator workflow clarity: create/edit must keep monitor-id assignment timing, job-id assignment, dashboard side effects, rollback cancellation, and existing error behavior.
- Context visibility: submitted monitor row, generated monitor id, scheduler job id, dashboard action, parameter save, and final row-save boundary stay visible through source and behavior contracts.

## 2026-05-10 Old Monitor Template Job-Id Write Boundary

- Hierarchy: old monitor template refresh keeps app-definition assembly and scheduler update orchestration in `MonitorServiceImpl`, while the persisted monitor job-id save belongs behind the old-monitor write-model boundary.
- Density: do not add UI copy, refresh summaries, duplicate template refresh controls, route aliases, synthetic monitor rows, or new response fields while moving job-id persistence ownership.
- Anti-AI-slop: never invent job ids from entity, telemetry, topology, alert evidence, or displayed scheduler state; only persist the scheduler-returned job id on an actual monitor row.
- Operator workflow clarity: template refresh should keep existing active-monitor filtering, collector lookup, param defaults, per-monitor error isolation, and continue-on-error semantics.
- Context visibility: app name, active monitor rows, prior job id, scheduler-returned job id, collector evidence, and final persistence boundary stay visible through source and behavior contracts.

## 2026-05-10 Old Monitor Manage Status Write Boundary

- Hierarchy: old monitor pause/resume selection and persisted status/job-id saves should sit behind a write-model boundary, while `MonitorServiceImpl` keeps scheduling side effects and legacy service API orchestration.
- Density: do not add alternate pause/resume panels, duplicate counters, synthetic monitor rows, generated health text, or new route wrappers while moving persistence ownership.
- Anti-AI-slop: pause/resume can only act on persisted monitor rows expanded from explicit service-discovery binds; never infer target monitors from telemetry labels, entity hints, alert evidence, topology context, or generated examples.
- Operator workflow clarity: existing pause/resume callers keep the same accepted ids, service-discovery expansion, cancellation, job creation, detect attempt, event publication, and no-op semantics.
- Context visibility: submitted ids, expanded monitor ids, selected persisted rows, status transitions, scheduler calls, and final save boundary stay visible through source and behavior contracts.

## 2026-05-10 Old Monitor Catalog Query Boundary

- Hierarchy: old monitor catalog lookups and app status counts should sit behind a query boundary, while `MonitorServiceImpl` keeps route-compatible orchestration and job refresh semantics.
- Density: do not add UI copy, count explanations, extra filters, helper banners, route aliases, or response fields while moving raw monitor catalog reads.
- Anti-AI-slop: never infer monitor rows or app counts from entity, telemetry, alert, collector, or rendered navigation state; use only persisted monitor rows and counts.
- Operator workflow clarity: app monitor lists, app count summaries, single monitor lookup, and template refresh should continue using the same submitted app/id evidence without changing legacy APIs.
- Context visibility: monitor id, app name, raw app status rows, active monitor rows, collector evidence, and scheduler refresh remain visible through service/source contracts.

## 2026-05-10 Old Monitor Param Query Boundary

- Hierarchy: old monitor detail, resume, template refresh, and copy flows keep their orchestration roles, while persisted submitted-parameter reads move behind a dedicated old-monitor query boundary.
- Density: do not add UI copy, parameter previews, helper banners, route aliases, response fields, or duplicate read affordances while moving raw parameter queries.
- Anti-AI-slop: never synthesize parameter values from entity, telemetry, collector, labels, or dashboard context; only persisted monitor parameters may feed legacy jobs and DTOs.
- Operator workflow clarity: detail, resume, template refresh, and copy should continue using the same monitor ids and parameter evidence without changing legacy route behavior or job config semantics.
- Context visibility: monitor id, persisted parameter rows, runtime configmap construction, copied params, scheduler update, and DTO evidence remain visible through service/source contracts.

## 2026-05-10 Old Monitor Param Delete Cleanup Boundary

- Hierarchy: old monitor deletion keeps accepted monitor-row selection, scheduler cancellation, and event publishing, while monitor-owned parameter cleanup lives behind the old-monitor parameter write-model boundary.
- Density: do not add UI copy, cleanup summaries, helper banners, duplicate delete controls, or response fields while moving raw parameter deletes.
- Anti-AI-slop: never infer parameter cleanup ids from entity, telemetry, collector, label, or selection display state; delete params only for monitor rows accepted for deletion.
- Operator workflow clarity: parent service-discovery deletes should continue cleaning params for the final expanded monitor set without changing legacy delete behavior or response shape.
- Context visibility: submitted ids, expanded monitor ids, accepted monitor rows, parameter cleanup ids, scheduler cancellation, and delete events remain visible through service/source contracts.

## 2026-05-10 Old Monitor Param Save Boundary

- Hierarchy: old monitor create/edit keeps job assembly, monitor persistence, and rollback sequencing, while submitted parameter row persistence lives behind a dedicated old-monitor write-model boundary.
- Density: do not add UI copy, parameter summaries, helper banners, duplicate form hints, or response fields while moving raw parameter saves.
- Anti-AI-slop: never synthesize parameter rows from entity, telemetry, collector, labels, or rendered forms; only submitted monitor params may be persisted.
- Operator workflow clarity: create/edit should keep existing parameter normalization and monitor-id assignment timing, then delegate the final submitted-param save without changing legacy errors or rollback behavior.
- Context visibility: submitted params, monitor id assignment, scheduler job config, monitor save, parameter save, and rollback cancellation remain visible through service/source contracts without changing route or response shape.

## 2026-05-10 Old Monitor Label Write Boundary

- Hierarchy: old monitor create/edit keeps monitor assembly, validation, scheduling, and persistence sequencing, while shared label row creation lives behind a dedicated old-monitor write-model boundary.
- Density: do not add UI copy, label summaries, duplicate label settings links, helper banners, or response fields while moving raw label persistence.
- Anti-AI-slop: never synthesize labels from entity, alert, telemetry, collector, or display context; only submitted monitor labels may create persisted label rows.
- Operator workflow clarity: create/edit should continue normalizing absent labels to an empty map, then persist only genuinely new submitted labels before monitor save.
- Context visibility: submitted labels, normalized empty labels, new-label detection, and label persistence remain visible through service/source contracts without changing route or response shape.

## 2026-05-10 Old Monitor Service-Discovery Null Child Boundary

- Hierarchy: old monitor service-discovery expansion should keep submitted parent ids and valid child monitor ids, while suppressing incomplete bind rows before monitor lookup.
- Density: do not add UI warnings, response fields, cleanup summaries, helper banners, duplicate routes, or confirmation affordances for dirty bind rows.
- Anti-AI-slop: never invent replacement child ids from entity, telemetry, alert, host, or labels when a persisted monitor-bind row has no child monitor id.
- Operator workflow clarity: delete, pause, and resume should remain deterministic even when legacy service-discovery bind evidence is partially missing.
- Context visibility: submitted ids, valid expanded child ids, ignored null child ids, monitor lookup ids, and downstream side effects remain visible through service contracts without changing route or response shape.

## 2026-05-10 Old Monitor Service-Discovery Expansion Helper Boundary

- Hierarchy: old monitor delete, pause, and resume should share one service-discovery child expansion helper before acting on monitor rows.
- Density: do not add UI copy, response fields, helper banners, duplicate routes, or confirmation affordances while reducing duplicated service code.
- Anti-AI-slop: never infer child monitor ids from entity, telemetry, alert, host, or selection context; only expand from persisted monitor-bind evidence.
- Operator workflow clarity: automation clients get consistent parent-plus-child behavior across delete, pause, and resume, while submitted ids remain request evidence.
- Context visibility: submitted ids, expanded ids, monitor row lookup, cleanup, status changes, and scheduler effects remain visible through existing service/source contracts without changing route or response shape.

## 2026-05-10 Old Monitor Manage Expanded Id Immutability Boundary

- Hierarchy: old monitor pause/resume should expand service-discovery child monitors into a local accepted action set, leaving submitted request ids as input evidence.
- Density: do not add UI copy, response fields, helper banners, duplicate manage routes, or new confirmation affordances while tightening the service boundary.
- Anti-AI-slop: never infer child monitor ids from entity, telemetry, alert, host, or selection context; only use monitor-bind expansion returned by the monitor service boundary.
- Operator workflow clarity: automation clients may pass immutable id sets, and pause/resume must still apply to parent plus child monitors without mutating caller-owned request evidence.
- Context visibility: submitted ids, expanded monitor ids, status changes, scheduler side effects, and saved rows remain visible through service contracts without changing route or response shape.

## 2026-05-10 Old Monitor Deletion Expanded Param Cleanup Boundary

- Hierarchy: old monitor deletion should expand service-discovery child monitors once, then use that accepted deletion set for monitor rows and all monitor-owned cleanup rows.
- Density: do not add UI copy, cleanup summaries, response fields, helper banners, duplicate delete routes, or confirmation affordances while tightening cleanup.
- Anti-AI-slop: never infer child monitor ids from entity, telemetry, alerts, host labels, or displayed selections; only use the monitor-bind expansion returned by the monitor service boundary.
- Operator workflow clarity: deleting a parent monitor should delete params for every actual monitor row removed, so re-created monitors do not inherit stale parameter evidence.
- Context visibility: submitted ids, expanded monitor ids, param cleanup ids, and downstream delete side effects remain visible through the service contract without changing route or response shape.

## 2026-05-10 Old Monitor Deletion Entity-Bind Cleanup Boundary

- Hierarchy: old monitor deletion owns monitor, param, alert-bind, collector-bind, favorite, scheduler, and delete-event cleanup, while entity monitor-bind rows stay behind the entity monitor-bind write boundary.
- Density: do not add UI copy, cleanup summaries, extra response fields, duplicate delete actions, or confirmation affordances while moving cleanup ownership.
- Anti-AI-slop: never infer entity bind cleanup from host, entity detail, telemetry, alert, or selection context; delete only the monitor ids confirmed by the monitor service.
- Operator workflow clarity: deleting old monitors should remove entity bind evidence through the entity boundary so entity catalog read models never keep stale monitor evidence after a real deletion.
- Context visibility: monitor ids, downstream entity-bind cleanup call, and raw DAO ownership remain visible through source and service contracts without changing monitor delete response shape.

## 2026-05-10 Old Monitor Manage Route Authorization Boundary

- Hierarchy: exact `/api/monitors/manage` method rules should sit beside the old monitor compatibility routes, before broad `/api/monitors/**` wildcards.
- Density: do not add UI affordances, helper copy, duplicate navigation entries, or new endpoint surfaces; this is a shipped config contract only.
- Anti-AI-slop: never rely on broad wildcard permissions to imply mutation safety; exact method rules should name the supported legacy GET, safe POST/PUT aliases, and DELETE pause path.
- Operator workflow clarity: legacy GET enable keeps its old readable method behavior, while POST/PUT enable and DELETE pause remain visible as mutation methods for automation clients.
- Context visibility: route path, HTTP method, role set, and ordering relative to broad wildcard rules remain visible in shipped Sureness config tests.

## 2026-05-10 Old Monitor Manage Mutation Compatibility Boundary

- Hierarchy: legacy `GET /api/monitors/manage` remains for existing clients, while explicit POST/PUT mutation aliases should map to the same enable boundary instead of introducing new workflow branches.
- Density: do not add response fields, helper banners, duplicate manage rows, or UI copy; the compatibility change stays at the route contract level.
- Anti-AI-slop: never infer monitor ids from entity, telemetry, alert, host, or selection state; the route must act only on submitted `ids`, legacy `id`, or body ids.
- Operator workflow clarity: enabling monitors has a state-changing method available for safer automation clients, while old GET and DELETE pause paths keep their existing behavior.
- Context visibility: submitted ids, HTTP method, action route, and downstream monitor-service call remain visible in controller tests without changing payload shape.

## 2026-05-10 Entity Governance State Request-Workspace Boundary

- Hierarchy: governance-state service keeps DTO validation, content shaping, and conversion, while default request workspace lookup for raw reads, upsert-row preparation, and deletes lives in query/write boundaries.
- Density: do not add governance workspace chips, helper lists, duplicate template rows, resume banners, or explanatory copy while moving scope ownership.
- Anti-AI-slop: never mix cross-workspace templates, presets, resumes, or activity rows; do not synthesize governance records to make workflows appear complete.
- Operator workflow clarity: default definition/discovery governance calls must bind current request workspace before storage lookup or mutation, while explicit workspace overloads remain available for compatibility contracts.
- Context visibility: state scope, kind, key, name, status, content, creator, update time, and workspace scope stay visible through existing governance DTO/service contracts.

## 2026-05-10 Entity Status Refresh Active-Alert Query Boundary

- Hierarchy: mutation-time status refresh keeps bound-monitor collection and runtime-health persistence sequencing, while current request workspace lookup for active alert evidence lives in the alert query boundary.
- Density: do not add status banners, alert counters, duplicate monitor rows, workspace chips, or new helper text while moving active-alert scope ownership.
- Anti-AI-slop: never derive entity health from cross-workspace alerts, guessed alert states, synthetic firing rows, or fabricated monitor matches.
- Operator workflow clarity: default status refresh must fetch active alerts in the current request workspace before runtime health is persisted, while explicit workspace overloads remain available for focused compatibility contracts.
- Context visibility: entity id, bound monitors, active firing alerts, alert status/severity labels, workspace scope, and persisted runtime health stay visible through existing service contracts.

## 2026-05-10 Entity Alert Request-Workspace Query Boundary

- Hierarchy: alert evidence read models keep status, severity, sort, and page shaping, while current request workspace lookup, raw alert predicates, monitor matching, and workspace filtering live in the alert query boundary.
- Density: do not add alert-origin columns, workspace chips, helper banners, duplicate alert rows, or new empty-state copy while moving request scope ownership.
- Anti-AI-slop: never fill scoped alert evidence with cross-workspace rows, guessed severities, synthetic firing alerts, or placeholder acknowledged/resolved rows.
- Operator workflow clarity: default alert evidence calls must bind the current request workspace before `SingleAlert` lookup, while explicit workspace overloads stay available for status refresh and compatibility paths.
- Context visibility: monitor names/instances, alert status, severity, update time, content, labels, pagination, and workspace scope remain visible through existing alert DTO/page contracts.

## 2026-05-10 Entity Activity Request-Workspace Query Boundary

- Hierarchy: activity timeline read models keep page-size shaping and DTO mapping, while current request workspace lookup, entity accessibility, raw row lookup, and workspace filtering live in the query boundary.
- Density: do not add timeline chips, helper rows, scope banners, duplicate activity groups, or new explanatory copy while moving request scope ownership.
- Anti-AI-slop: never backfill activity rows from cross-workspace entities, guessed workspaces, or synthetic import/update events to make timelines appear complete.
- Operator workflow clarity: default timeline calls must bind the current request workspace before storage lookup, and explicit overloads keep testable workspace scopes for imports, discovery, and compatibility paths.
- Context visibility: entity id, activity type, format, status, summary, detail, creator, timestamp, and workspace scope remain visible through existing activity DTO/query contracts.

## 2026-05-10 Entity Activity Record Write Boundary

- Hierarchy: activity lifecycle classification and operator-facing summary/detail wording stay in the activity write model, while raw row persistence, workspace normalization, and stored-entity workspace fallback move behind a dedicated record writer.
- Density: do not add activity helper rows, workspace chips, extra summaries, or duplicate lifecycle events while moving persistence; activity timelines remain compact persisted evidence.
- Anti-AI-slop: never fabricate activity workspace ids, guessed stored entities, synthetic success/failure rows, or monitor-bind evidence to make catalog history look complete.
- Operator workflow clarity: request workspace, entity workspace, and stored fallback are resolved at the final write boundary before the activity row is flushed, so create/import/edit evidence remains scoped and deterministic.
- Context visibility: entity id, activity type, format, status, summary, detail, workspace scope, and monitor-bind count evidence remain visible through the existing activity contracts.

## 2026-05-10 Old Monitor Batch Body Compatibility Boundary

- Hierarchy: the old batch monitor routes keep action ownership in the monitor controller/service boundary, while entity workflows continue to consume monitor rows through the existing anti-corruption query boundary.
- Density: do not add response fields, wrapper rows, confirmation copy, helper banners, or duplicate action endpoints while preserving legacy body ids.
- Anti-AI-slop: batch delete/cancel/enable must act only on submitted ids from query or body; never infer monitor ids from host, entity, alert, or telemetry context.
- Operator workflow clarity: existing clients that submit JSON id arrays to `/api/monitors`, `/api/monitors/manage`, and `DELETE /api/monitors/manage` keep their side effects, while query `ids` remain the preferred value when both are present.
- Context visibility: submitted ids, action route, HTTP method, and resulting service call remain visible through controller contracts without changing the response shape.

## 2026-05-10 Entity Identity Query Ownership Boundary

- Hierarchy: entity identity evidence should keep detail/list/candidate consumers focused on row presentation, counts, and scoring order, while raw identity row lookup and match/count DAO access live behind a dedicated query boundary.
- Density: do not add identity helper rows, workspace chips, duplicate identity groups, or explanatory copy while moving DAO ownership; identity evidence remains compact and operator-scannable.
- Anti-AI-slop: never invent identity keys, normalized values, counts, or candidate matches to make an entity appear better correlated.
- Operator workflow clarity: persisted identity rows and counts must be read before detail summaries, list readiness, and monitor-binding candidates are assembled, with no synthetic fallback when storage has no evidence.
- Context visibility: entity id, identity key/value, normalized value, priority, primary flag, identity counts, and matched identity keys remain visible through existing DTO/service contracts.

## 2026-05-10 Entity Activity Query Ownership Boundary

- Hierarchy: entity activity timelines should keep DTO mapping and limit/page shaping in the read model, while raw definition/lifecycle activity row lookup and workspace/entity eligibility live behind a dedicated query boundary.
- Density: do not add timeline helper rows, workspace chips, duplicate activity groups, or explanatory copy while moving DAO ownership; activity lists remain compact evidence.
- Anti-AI-slop: never backfill timelines with cross-workspace rows, guessed import/update events, or synthetic lifecycle activities.
- Operator workflow clarity: entity access and request workspace filtering must happen before timeline rows and latest definition activities are mapped for detail/list summaries.
- Context visibility: entity id, activity type, format, status, summary, detail, creator, timestamp, and workspace scope remain visible through existing activity DTO contracts.

## 2026-05-10 Entity Governance State Query Ownership Boundary

- Hierarchy: definition/discovery governance workflows should keep DTO validation and content shaping in the state service, while raw persisted state lookup, upsert, delete, and workspace eligibility live behind a dedicated query boundary.
- Density: do not add governance helper rows, workspace chips, resume banners, or explanatory copy while moving DAO ownership; templates, activities, resumes, and presets remain compact records.
- Anti-AI-slop: never fill governance lists with cross-workspace states, guessed templates, synthetic resume tokens, or placeholder discovery activities.
- Operator workflow clarity: request workspace filtering must happen before governance records are mapped into definition/discovery workflow DTOs, and writes must resolve the persisted workspace consistently.
- Context visibility: state scope/kind/key/name/status/content, creator, update time, and workspace scope remain visible through existing governance DTO contracts.

## 2026-05-10 Entity Alert Evidence Query Ownership Boundary

- Hierarchy: entity alert evidence should keep status/severity/page shaping in the read model, while raw `SingleAlert` lookup, monitor predicates, and workspace eligibility live behind a dedicated query boundary.
- Density: do not add alert-origin columns, workspace chips, helper banners, or new empty-state copy while moving DAO ownership; alert rows remain compact evidence.
- Anti-AI-slop: never fill scoped alert evidence with cross-workspace rows, guessed severities, synthetic firing alerts, or placeholder acknowledged/resolved rows.
- Operator workflow clarity: monitor identity predicates and request workspace filtering must happen before active-alert lists and paged alert evidence are sorted, counted, and returned.
- Context visibility: monitor ids/names/instances, alert status, severity, update time, content, labels, page request, and workspace scope remain visible through existing alert DTO/page contracts.

## 2026-05-10 Entity Noise-Control Rule Query Ownership Boundary

- Hierarchy: entity detail noise-control evidence should keep candidate label normalization and compact summary assembly in the read model, while raw silence/inhibit rule lookup and workspace eligibility live behind a dedicated rule query boundary.
- Density: do not add rule-origin columns, workspace chips, warning rows, or helper prose while moving DAO ownership; active silence and matching inhibit previews stay compact.
- Anti-AI-slop: never mark possible suppression from cross-workspace rules, guessed labels, disabled rules, or unlabeled non-default rules to make an entity look explained.
- Operator workflow clarity: request workspace filtering must happen before silence/inhibit rule matching, counts, previews, and possible-suppression flags leave the detail read model.
- Context visibility: accepted rule id/name/type, matched labels, update time, active-alert presence, candidate entity/monitor labels, and workspace scope remain visible through existing detail DTO contracts.

## 2026-05-10 Entity Relation Target Lookup Boundary

- Hierarchy: relation replacement keeps submitted relation parsing, target-reference resolution, dedupe, and persistence in order while raw entity lookup stays behind the workspace-access boundary.
- Density: do not add relation helper rows, warning copy, fallback graph edges, or duplicate target labels while moving target lookup.
- Anti-AI-slop: never resolve relation targets from another workspace, guessed ids, or invented refs to make topology or definition previews appear connected.
- Operator workflow clarity: direct ids and typed refs must resolve only after workspace access accepts the target row, so import/edit flows preserve real relation evidence.
- Context visibility: source entity id, target entity id, target ref, relation type/source/status/score, and workspace scope remain visible through existing relation DTO contracts.

## 2026-05-10 Catalog Suggestions Workspace Entity Lookup Boundary

- Hierarchy: catalog suggestions keep workspace-scoped entity acceptance before owner, namespace, system, lifecycle, relation-ref, language, and link-provider aggregation.
- Density: do not add suggestion helper text, workspace chips, duplicated suggestion buckets, or synthetic fallback values while moving entity lookup.
- Anti-AI-slop: never use cross-workspace catalog rows or guessed owner/system/reference values to make profile suggestions look richer.
- Operator workflow clarity: the suggestion read-model should only aggregate from entities accepted by the workspace-access boundary, so import/edit forms keep real reuse hints.
- Context visibility: accepted entity ids, refs, owners, additional owners, namespaces, environments, systems, lifecycles, tiers, inherit refs, languages, and link providers remain visible through the existing suggestion DTO.

## 2026-05-10 Entity Detail Entity Access Boundary

- Hierarchy: entity detail keeps entity acceptance first, then identity rows, monitor binds, and relations; raw entity lookup belongs to the workspace-access boundary.
- Density: do not add access banners, workspace chips, empty cards, or explanatory helper text while moving the lookup; missing or inaccessible detail remains a null response.
- Anti-AI-slop: never borrow entity profile, identities, binds, relations, health, or navigation context from another workspace to make a detail page appear complete.
- Operator workflow clarity: detail DTO assembly must reject inaccessible entities before child evidence is queried so cross-workspace detail, definition, and evidence flows stay closed.
- Context visibility: accepted entity profile, identities, monitor binds, relations, route id, and existing cross-signal handoff context remain visible through the unchanged detail DTO shape.

## 2026-05-10 Entity Activity Timeline Workspace Lookup Boundary

- Hierarchy: activity timelines keep access check, persisted activity lookup, workspace filtering, and DTO mapping in that order; entity accessibility lookup belongs to the workspace-access boundary.
- Density: do not add timeline chips, warning rows, helper copy, or generated explanations while moving the lookup; recent activities stay compact and evidence-first.
- Anti-AI-slop: never backfill activity rows from cross-workspace entities or invent import/update/failure events when an entity is inaccessible.
- Operator workflow clarity: entity-scoped timelines must reject inaccessible entities before any activity rows are queried, while catalog-level workspace timelines continue to read only eligible persisted rows.
- Context visibility: entity id, activity type, format, status, summary, detail, creator, and timestamp remain visible through the existing activity DTO contract.

## 2026-05-10 Identity Candidate Workspace Entity Lookup Boundary

- Hierarchy: monitor-to-entity suggestions keep identity extraction, persisted bind evidence, accessible entity lookup, then candidate scoring output; workspace entity lookup belongs to the workspace-access boundary.
- Density: do not add workspace chips, empty-state prose, duplicate candidate groups, or new helper text while moving the lookup; suggestions remain scan-first.
- Anti-AI-slop: never fill filtered candidates with cross-workspace entities, guessed names, fake scores, or invented matched identities.
- Operator workflow clarity: request workspace scope must be applied before candidate DTO assembly so accepted monitors never suggest inaccessible entities.
- Context visibility: monitor id, matched identity keys, score, recommendation, entity id/name/type, and already-bound state remain visible through the current response shape.

## 2026-05-10 Identity Resolution Monitor-Bind Ownership Boundary

- Hierarchy: monitor-to-entity suggestions keep identity extraction, candidate scoring, workspace filtering, and already-bound marking in that order; persisted bind lookup belongs to the monitor-bind boundary.
- Density: do not add already-bound banners, duplicate monitor rows, or extra suggestion rationale while moving the lookup; candidate lists stay compact.
- Anti-AI-slop: never guess already-bound state, entity names, scores, or matched identities when persisted bind evidence is unavailable.
- Operator workflow clarity: accepted monitors still surface the same ranked candidates, and already-bound flags must come from real monitor-bind rows before suggestions leave identity resolution.
- Context visibility: monitor id, matched identity keys, recommendation, score, workspace-filtered entity id/name, and already-bound state remain visible through the existing DTO contract.

## 2026-05-10 Monitor Binding Identity Workspace Lookup Boundary

- Hierarchy: monitor binding suggestions keep monitor acceptance first and identity-ranked entity candidates second; request workspace lookup belongs where identity candidates are filtered.
- Density: do not add workspace chips, duplicate candidate groups, helper copy, or warning rows while moving the lookup; suggestion lists stay compact.
- Anti-AI-slop: never broaden suggestions to cross-workspace entities or fabricate scores when identity resolution filters all candidates.
- Operator workflow clarity: missing monitors still return no suggestions, accepted monitors keep the same identity evidence, and identity resolution applies request workspace scope before candidates leave the boundary.
- Context visibility: monitor id, app, instance/name labels, matched identity keys, recommendation, score, and already-bound state remain visible through the existing DTO contract.

## 2026-05-10 Entity Evidence Facade Workspace Lookup Boundary

- Hierarchy: entity evidence endpoints keep access check, bound-monitor lookup, and alert/monitor evidence delegation in that order; raw workspace lookup belongs with the alert filtering boundary.
- Density: do not add workspace labels, helper banners, or explanatory alert rows while moving the lookup; alert and monitor pages stay compact and evidence-led.
- Anti-AI-slop: never default the evidence facade to a broad workspace or synthesize alert rows when the alert evidence boundary filters everything out.
- Operator workflow clarity: inaccessible entities still return empty evidence, accepted entities keep the same status/severity/app filters, and alert evidence applies request workspace scope where alert rows are queried.
- Context visibility: entity id, monitor ids, alert status, severity, pagination, and accepted workspace constraints remain visible through existing service contracts without new UI copy.

## 2026-05-09 Login Session Boundary

- Hierarchy: keep the existing passport login, auth gate, and operator shell hierarchy unchanged; this slice only changes where credentials live after successful login.
- Density: do not add banners, rails, explanatory cards, or new login controls. The session boundary should be invisible during the normal happy path.
- Anti-AI-slop: no marketing security copy, no fake "secure" status panel, and no client-visible token preview.
- Operator workflow clarity: login should still restore the guarded route, bootstrap system config, and redirect exactly as before; logout should clear the BFF session then return to the canonical login route.
- Context visibility: protected workbench redirects keep the current return target, but access and refresh tokens must move behind same-origin BFF cookies rather than browser localStorage.

## 2026-05-09 Backend Query Workspace Boundary

- Hierarchy: log and trace workbench layouts should keep their existing evidence order; workspace filtering is a data boundary, not a new visual layer.
- Density: avoid adding explanatory chips or warning cards for normal scoped queries; empty states should remain truthful if a workspace has no matching telemetry.
- Anti-AI-slop: never pad scoped workspaces with fake zero panels or synthetic rows; filtered-out data must simply stay unavailable.
- Operator workflow clarity: the active workspace from the authenticated request must constrain query results consistently across list, overview, trend, and detail surfaces.
- Context visibility: existing route/query context remains visible through current filters and handoffs, while workspace membership is enforced server-side.

## 2026-05-10 Trace Query Workspace Boundary

- Hierarchy: trace center list, overview, detail, and span tree keep their current evidence order; workspace enforcement must not add a new visual tier.
- Density: do not add workspace chips, warning cards, or explanatory rows for normal scoped trace reads; zero results should remain a truthful absence of matching traces.
- Anti-AI-slop: never synthesize placeholder spans, fake service paths, or cross-workspace trace summaries to fill scoped views.
- Operator workflow clarity: the request workspace must constrain trace list, overview, detail, and span endpoints consistently so handoffs never reveal another workspace's trace.
- Context visibility: existing entity, service, namespace, environment, time, and trace-id filters stay visible while the workspace boundary is enforced by backend resource attributes.

## 2026-05-10 Live Log Stream Workspace Boundary

- Hierarchy: the live log stream keeps the current event feed hierarchy; workspace scoping is a subscriber data boundary, not a new stream mode.
- Density: do not add workspace badges, warning rows, or explanatory cards for normal scoped streams; filtered events should simply not arrive.
- Anti-AI-slop: never backfill filtered live streams with synthetic log rows, placeholder errors, or guessed tenant labels.
- Operator workflow clarity: a subscription created under a request workspace must keep that workspace boundary for the lifetime of the SSE subscriber, even after events are flushed asynchronously.
- Context visibility: existing severity, content, trace, and span filters stay visible and continue to compose with the server-bound workspace filter.

## 2026-05-10 Entity Catalog Workspace Boundary

- Hierarchy: entity list and catalog entry points keep their current summary, health, evidence, and action order; workspace isolation must not add a new visible tier.
- Density: do not add workspace chips, scope banners, or empty-state explanations for normal scoped lists; absent entities should remain a plain truthful empty result.
- Anti-AI-slop: never synthesize entity summaries, health states, owners, or monitor counts to fill a scoped catalog.
- Operator workflow clarity: the request workspace must constrain entity list reads before summaries, monitor counts, relation counts, alert evidence, and next actions are assembled.
- Context visibility: existing type, status, owner, source, environment, lifecycle, tier, system, search, and sort filters stay visible while workspace membership is enforced server-side.

## 2026-05-10 Entity Detail Evidence Workspace Boundary

- Hierarchy: entity detail, definition export, bound monitor, and alert evidence entry points should keep their current detail-first structure; a workspace miss behaves like no accessible entity instead of adding a new visible security layer.
- Density: do not add scoped badges, explanatory banners, or padded empty panels for cross-workspace misses; detail and evidence surfaces should simply return null or empty pages from the server.
- Anti-AI-slop: never backfill detail health, active alerts, bound monitors, definition YAML, or next actions from another entity/workspace to make a page look complete.
- Operator workflow clarity: workspace membership must be checked before identities, relations, monitor binds, alerts, definition activities, and cross-signal handoffs are assembled.
- Context visibility: existing entity id, query filters, status/severity/app filters, and return-to context remain unchanged when the server accepts the workspace.

## 2026-05-10 Monitor Binding Candidate Workspace Boundary

- Hierarchy: monitor-to-entity suggestions stay ranked by identity match strength; workspace enforcement must only remove inaccessible candidates, not add a new grouping tier.
- Density: do not add workspace labels or warning rows to candidate lists; no accessible match should remain an honest empty result.
- Anti-AI-slop: never fabricate entity names, match identities, scores, or already-bound states to compensate for filtered cross-workspace candidates.
- Operator workflow clarity: a bound request workspace must constrain candidate entities before recommendation, score, and already-bound state are presented.
- Context visibility: existing monitor identity evidence such as `service.name`, `container.name`, `endpoint.url`, and app/instance context stays visible for accepted candidates.

## 2026-05-10 Entity Mutation Workspace Boundary

- Hierarchy: create, edit, definition import/update, and delete flows keep their current entity-first hierarchy; workspace rejection must behave like an inaccessible entity rather than a new UI state.
- Density: do not add workspace banners, warning panels, or extra confirmation copy for normal scoped writes; accepted writes should keep the existing dense editor flow.
- Anti-AI-slop: never silently reassign a cross-workspace entity to the caller's workspace, fabricate an updated entity, or delete evidence from another workspace.
- Operator workflow clarity: request workspace membership must be checked before save/delete side effects, identity replacement, monitor-bind replacement, relation updates, lifecycle activities, and definition activities.
- Context visibility: existing entity id, definition format, validation feedback, and return navigation remain unchanged for entities inside the accepted workspace.

## 2026-05-10 Entity Delete Write Boundary

- Hierarchy: delete keeps the entity-first mutation flow; identity rows, monitor binds, relations, and catalog row cleanup are backend side effects, not a new operator-visible tier.
- Density: do not add delete banners, tombstone panels, or explanatory records while moving the cleanup sequence behind a write-model boundary.
- Anti-AI-slop: never fabricate deleted-state summaries, retained evidence, or cross-workspace cleanup results; inaccessible entities remain a no-op.
- Operator workflow clarity: workspace acceptance must happen before any identity, monitor-bind, relation, or catalog deletion side effect, and accepted cleanup order must remain deterministic.
- Context visibility: accepted entity id and workspace context remain the only mutation context; downstream lists/details should reflect real persisted deletion without synthetic placeholders.

## 2026-05-10 Governance State Workspace Boundary

- Hierarchy: definition templates, definition activities, resume drafts, discovery presets, and discovery activities keep their current workflow order; workspace filtering only removes inaccessible shared-state records.
- Density: do not add workspace chips, warnings, or new panels to normal template, preset, activity, or resume lists; an empty scoped list should remain a truthful empty result.
- Anti-AI-slop: never synthesize templates, resume drafts, preset defaults, seed bundles, or activity rows to replace filtered records.
- Operator workflow clarity: request workspace must constrain shared governance state before list, lookup, update, delete, and resume recovery side effects.
- Context visibility: existing template id, resume token, preset id, activity id, format, source, seed definition, and workspace-path context remain visible for accepted records.

## 2026-05-10 Catalog Suggestion Workspace Boundary

- Hierarchy: catalog autocomplete and definition editor suggestions should keep the current owner, namespace, environment, system, lifecycle, tier, inherited-entity, language, and link-provider order; workspace scoping only changes the source rows.
- Density: do not add workspace labels, scope banners, or explanatory empty states to suggestion menus; no accessible suggestions should stay a compact empty list.
- Anti-AI-slop: never fabricate owners, systems, inherited refs, languages, link providers, or entity refs to make a scoped workspace look populated.
- Operator workflow clarity: request workspace must constrain suggestion source entities before reusable catalog hints are assembled for create, import, edit, and definition workflows.
- Context visibility: existing suggestion values remain visible for accepted rows, including entity reference shape and namespace context.

## 2026-05-10 Definition Relation Lookup Workspace Boundary

- Hierarchy: definition import/edit relation resolution should keep the existing depends-on/ref flow; workspace scoping only changes which entity row can be resolved as the target.
- Density: do not add workspace labels, warnings, or explanatory rows to definition relation previews; unresolved scoped references stay compact and truthful.
- Anti-AI-slop: never resolve a relation to a cross-workspace entity, never rewrite refs to invented targets, and never silently fabricate a related entity.
- Operator workflow clarity: the request workspace must constrain type/namespace/name and direct-id lookup before relation target ids are attached during parse, import, edit, or bundle flows.
- Context visibility: accepted relation refs, direct ids, namespace, and relation type/status/score context remain visible exactly as before.

## 2026-05-10 Definition Activity Workspace Boundary

- Hierarchy: catalog-level definition activity timelines should keep the same recent-first order; workspace filtering only changes which persisted rows are eligible.
- Density: do not add workspace chips, warnings, or explanatory rows to activity timelines; a workspace with no activity stays a compact empty list.
- Anti-AI-slop: never backfill activity rows from another workspace, and never fabricate import/update/failure rows to make a timeline look active.
- Operator workflow clarity: request workspace must be written onto new definition activities and used for catalog-level activity reads before the timeline DTO is assembled.
- Context visibility: accepted activity type, format, status, summary, detail, creator, and timestamp remain visible as before.

## 2026-05-10 Entity Alert Evidence Workspace Boundary

- Hierarchy: entity detail and entity alert evidence keep the current alert-first order; workspace filtering only decides which alert rows are eligible.
- Density: do not add workspace labels, banners, or explanatory rows to alert tables or detail summaries; no scoped alerts remains a truthful empty state.
- Anti-AI-slop: never fill an entity with cross-workspace alerts, guessed severity, fake status, or synthetic suppression evidence to make the detail page look active.
- Operator workflow clarity: request workspace must constrain matched alert rows before active-alert lists, status summaries, response handoffs, and noise-control evidence are assembled.
- Context visibility: accepted alert status, severity, content, monitor identity, timestamps, and return-to context remain visible exactly as before.

## 2026-05-10 Noise-Control Evidence Workspace Boundary

- Hierarchy: silence and inhibit evidence stays below active-alert context; workspace filtering only decides which suppression rules can be considered.
- Density: do not add workspace chips, rule-source banners, or explanatory suppression rows to entity detail; filtered rules should simply be absent.
- Anti-AI-slop: never mark possible suppression from a cross-workspace `matchAll` silence, generic inhibit, or guessed rule match to make an entity look explained.
- Operator workflow clarity: request workspace must constrain silence and inhibit rules before match-all, label matching, counts, previews, and possible-suppression flags are assembled.
- Context visibility: accepted rule name, type, matched labels, update time, active-alert context, and existing handoff targets remain visible exactly as before.

## 2026-05-10 Entity Runtime Health Read-Model Boundary

- Hierarchy: entity list/detail health should keep the current status, reason, monitor counts, and active-alert evidence order; this backend split must not introduce a new visual tier.
- Density: do not add health badges, explanatory cards, or synthetic readiness rows for normal health evaluation; the existing compact status/readiness surfaces should stay unchanged.
- Anti-AI-slop: never invent healthy/degraded/critical states, fake monitor counts, or placeholder alert counts when no evidence exists; no bound evidence remains `unknown`.
- Operator workflow clarity: active firing alerts outrank monitor-down evidence, monitor-down evidence outranks healthy up evidence, all-paused monitors stay paused, and empty evidence stays unknown.
- Context visibility: accepted active-alert, monitor, status reason, evaluated-at, entity id, and existing cross-signal handoff context remain visible exactly as before.

## 2026-05-10 Entity Summary Read-Model Boundary

- Hierarchy: entity list summaries should keep entity identity, counts, ops readiness, next action, evidence time, and definition activity in the existing compact row payload.
- Density: do not add new summary panels, workspace chips, or readiness prose while moving aggregation out of the large service; rows stay scan-first.
- Anti-AI-slop: never synthesize identity, monitor, relation, alert, evidence, next-action, or definition-management fields to make an entity look more complete.
- Operator workflow clarity: summary rows must still derive readiness and first next action from the shared observability gateway after real counts, monitors, alerts, and definition activity are loaded.
- Context visibility: entity id/name, status reason, monitor count, relation count, active-alert count, last evidence time, next action, and definition activity metadata remain visible exactly as before.

## 2026-05-10 Entity Integration Hint Boundary

- Hierarchy: monitor-to-entity binding suggestions stay as an evidence-backed handoff from monitor context into entity catalog context, not a new operator workflow tier.
- Density: do not add suggestion banners, generated rationale prose, or placeholder candidate rows while moving monitor lookup behind a service boundary.
- Anti-AI-slop: never invent binding candidates, identities, scores, already-bound state, or workspace matches when the monitor row or identity evidence is absent.
- Operator workflow clarity: monitor acceptance and workspace context must be resolved before identity matching leaves the integration-hint boundary.
- Context visibility: accepted monitor id, monitor labels/annotations, workspace id, matched identity keys, scores, recommendation, and already-bound state remain visible exactly as before.

## 2026-05-10 Entity Activity Monitor-Bind Diff Boundary

- Hierarchy: lifecycle activity remains audit evidence under entity mutation, with monitor-bind diffs feeding activity type selection instead of becoming a separate workflow tier.
- Density: do not add activity badges, generated explanations, or placeholder discovery rows while moving current-bind lookup behind the activity write model.
- Anti-AI-slop: never mark discovery governance from guessed monitor binds, stale cross-entity binds, or missing bind evidence just to make an edit look telemetry-driven.
- Operator workflow clarity: current monitor binds must be loaded inside the activity boundary before comparing next submitted binds, so mutation orchestration stays focused on catalog writes.
- Context visibility: accepted entity id, source transition, telemetry bind source, monitor ids, workspace-scoped mutation context, and existing activity summaries remain visible exactly as before.

## 2026-05-10 Entity List Query Read-Model Boundary

- Hierarchy: entity catalog list filtering, workspace scoping, runtime health, monitor evidence, alert evidence, and summary row assembly should leave the existing scan-first row hierarchy unchanged.
- Density: do not add list-level banners, workspace badges, explanation rows, or synthetic "no evidence" panels while moving the query boundary; rows stay compact and filter-driven.
- Anti-AI-slop: never fabricate entity rows, monitor counts, alert counts, health, next actions, or definition activity to compensate for scoped or filtered results.
- Operator workflow clarity: type/status/owner/source/environment/lifecycle/tier/system/search/sort filters must apply before summaries leave the read model, with workspace membership enforced before evidence enrichment.
- Context visibility: accepted entity id, workspace id, filters, sort order, health reason, evidence counts, and definition-activity metadata remain visible through the existing list payload.

## 2026-05-10 Entity Workspace Access Boundary

- Hierarchy: entity list, detail, alert, monitor, definition, mutation, import, and edit entry points keep their current entity-first hierarchy; workspace access only decides eligible rows.
- Density: do not add workspace badges, warnings, or explanatory access rows to normal successful flows; inaccessible rows should be absent or behave like missing entities.
- Anti-AI-slop: never borrow cross-workspace entities, identities, monitors, relations, alerts, definitions, or summaries to make an entity page appear complete.
- Operator workflow clarity: request workspace matching and write-workspace resolution must be applied before read models, mutation side effects, relation resolution, and activity writes.
- Context visibility: accepted entity id, workspace id, route filters, definition format, return navigation, and existing evidence counts remain visible exactly as before.

## 2026-05-10 Entity Noise-Control Read-Model Boundary

- Hierarchy: entity detail noise-control evidence keeps its current position below active alert and handoff context; extracting the read model must not create a new visual or product tier.
- Density: do not add rule-origin badges, workspace warnings, or explanatory suppression prose; matched silence/inhibit previews remain compact evidence counts.
- Anti-AI-slop: never infer suppression from cross-workspace rules, unlabeled non-default rules, or guessed labels; if no real rule matches, the summary must stay empty.
- Operator workflow clarity: entity, alert, identity, and monitor labels should be normalized into candidate evidence before silence/inhibit rules are matched and workspace-filtered.
- Context visibility: accepted rule name, type, matched label keys, update time, active-alert presence, and possible-suppression flag remain visible exactly as before.

## 2026-05-10 Entity Detail Observability Assembly Boundary

- Hierarchy: entity detail keeps the existing entity profile, status, evidence, alert, monitor, log, trace, unified evidence, triage, ops, status-page, response-handoff, noise-control, monitor list, active-alert list, query-hint, and activity order.
- Density: do not add detail banners, evidence explanation rows, synthetic cross-signal cards, or placeholder navigation while moving assembly behind a read model.
- Anti-AI-slop: never fabricate status, alerts, monitors, log hints, trace hints, evidence rows, recommendations, ops readiness, noise-control rows, or definition activities when the backing evidence is absent.
- Operator workflow clarity: accepted entity context, workspace-scoped monitors/alerts, runtime health, observability bundle, response handoffs, noise-control evidence, and definition activities must be assembled before the detail payload leaves the read model.
- Context visibility: entity id, workspace id, identities, relation count, status reason, evidence counts, handoff return context, noise-control evidence, and definition activity metadata remain visible exactly as before.

## 2026-05-10 Entity Response-Handoff Read-Model Boundary

- Hierarchy: entity detail handoffs keep the existing alert, monitor, log, trace, discovery, and editor order; extraction must not introduce new navigation tiers.
- Density: do not add handoff badges, explanatory link groups, or fake destination rows; handoff payloads stay compact route context.
- Anti-AI-slop: never invent severity, owner readiness, runbook readiness, relation readiness, telemetry readiness, trace ids, or monitor targets when evidence is missing.
- Operator workflow clarity: handoff assembly must preserve return-to path, return label, entity ownership/system/environment/source metadata, signal evidence lists, and ops readiness flags before delegating to the shared observability gateway.
- Context visibility: accepted search tokens, status/severity, monitor filters, trace/log correlation ids, discovery context, editor focus, and return navigation remain visible exactly as before.

## 2026-05-10 Entity Alert Evidence Read-Model Boundary

- Hierarchy: entity alert evidence keeps the existing alert-first order in detail summaries and alert list pages; extraction must not create a new evidence tier.
- Density: do not add workspace badges, severity explainer rows, or synthetic alert rows while moving the query boundary; scoped empty results stay compact.
- Anti-AI-slop: never borrow cross-workspace alerts, guess severity from content, or fabricate firing/resolved/acknowledged rows when monitor-linked evidence is missing.
- Operator workflow clarity: monitor-linked alert matching, workspace label filtering, status normalization, severity filtering, severity-first ordering, and pagination must happen before the DTO/page leaves the read model.
- Context visibility: accepted alert content, labels, status, severity, monitor identity, update time, and existing return-to/handoff context remain visible exactly as before.

## 2026-05-10 Entity Monitor Evidence Read-Model Boundary

- Hierarchy: entity monitor evidence keeps the existing bound-monitor list order semantics, with down monitors still surfacing before healthy or paused monitors.
- Density: do not add monitor badges, workspace prose, or explanatory rows while moving list shaping; empty bound-monitor evidence remains a compact empty page.
- Anti-AI-slop: never fabricate bound monitors, statuses, apps, timestamps, or monitor rows to make an entity appear better instrumented.
- Operator workflow clarity: status filtering, app filtering, health-priority sorting, recency tie-breaking, id tie-breaking, DTO mapping, and pagination must complete before the page leaves the read model.
- Context visibility: accepted monitor id, name, app, instance, status, labels, annotations, and update time remain visible exactly as before.

## 2026-05-10 Entity Evidence Facade Boundary

- Hierarchy: entity alert and monitor evidence entry points keep the same entity-first access check, alert-first page, and bound-monitor page order; the facade only owns read orchestration.
- Density: do not add evidence banners, workspace chips, explanatory rows, or synthetic empty panels while moving access and monitor lookup out of the API facade.
- Anti-AI-slop: never borrow cross-workspace monitors or alerts, never guess severity/status, and never fabricate instrumentation rows for inaccessible or unbound entities.
- Operator workflow clarity: workspace acceptance, page normalization, bound monitor lookup, alert filtering, monitor filtering, sorting, and pagination must stay deterministic before evidence leaves the read boundary.
- Context visibility: accepted entity id, workspace id, status/severity/app filters, monitor identities, alert labels, and existing return-to context remain visible through the current payloads.

## 2026-05-10 Entity Detail DTO Read-Model Boundary

- Hierarchy: entity detail, edit, and definition export keep the existing entity-first payload order of catalog profile, identities, monitor binds, and relations.
- Density: do not add workspace labels, access banners, or synthetic related-row placeholders while moving DTO assembly behind a read model; inaccessible entities remain null.
- Anti-AI-slop: never borrow identities, monitor binds, relations, or definition fields from another workspace/entity to make detail or definition pages appear complete.
- Operator workflow clarity: workspace acceptance must happen before child DAO lookups, then identities, monitor binds, and relations are loaded in their existing stable order.
- Context visibility: accepted entity id, workspace id, identity priority, monitor bind order, relation endpoints, and definition-export context remain visible exactly as before.

## 2026-05-10 Entity Core Write Boundary

- Hierarchy: entity create, edit, and definition bundle import keep catalog identity, ownership, workspace, definition metadata, monitor binds, relations, and runtime evidence in the existing order.
- Density: do not add UI copy, workflow steps, synthetic metadata rows, or placeholder hints while moving core field writes behind a service boundary.
- Anti-AI-slop: never infer owners, systems, tags, workspace, source, status, labels, integrations, extensions, or HertzBeat blocks beyond submitted data and existing defaults.
- Operator workflow clarity: writes must preserve accepted workspace, explicit source fallback, labels-to-tags fallback only when tags are absent, and the existing relation/monitor-bind sequencing.
- Context visibility: workspace id, catalog fields, labels/tags, integrations, extensions, and HertzBeat blocks stay persisted exactly as submitted/defaulted for downstream detail, list, and evidence read models.

## 2026-05-10 Entity Catalog Persistence Boundary

- Hierarchy: entity row persistence belongs to the catalog write model before identities, monitor binds, relations, runtime health, and activities are assembled.
- Density: do not add create/edit/import steps, status banners, generated summaries, or extra rows while moving persistence out of the orchestration service.
- Anti-AI-slop: never synthesize entity ids, workspace ownership, source, status, tags, or definition fields beyond submitted catalog data and existing defaults.
- Operator workflow clarity: single create, edit, and bundle import must persist catalog rows in stable order before downstream evidence and activity writers consume entity ids.
- Context visibility: accepted entity id, workspace id, source fallback, catalog metadata, bundle order, and existing activity/evidence context remain visible exactly as before.

## 2026-05-10 Entity Validation Boundary

- Hierarchy: entity create, edit, definition import, and bundle import keep validation before catalog persistence, identity writes, monitor binds, relations, runtime health, and activities.
- Density: do not add extra validation screens, explanatory banners, or generated helper copy while moving validation out of the orchestration service.
- Anti-AI-slop: validation must reject unsupported types, statuses, criticality, blank names, blank identities, and missing monitor ids instead of defaulting them into plausible-looking catalog evidence.
- Operator workflow clarity: existing error messages and modify-id requirements remain stable so API callers and UI forms can map failures back to the submitted field.
- Context visibility: submitted type, name, status, criticality, identity key/value, monitor id, and modify entity id stay the only validation evidence.

## 2026-05-10 Entity Runtime Status Refresh Boundary

- Hierarchy: create, edit, and bundle import keep catalog persistence, identity writes, monitor binds, relations, then runtime status refresh before activity evidence.
- Density: do not add status banners, generated health explanations, empty panels, or workflow copy while moving refresh orchestration out of the large service.
- Anti-AI-slop: runtime health must be computed only from real bound monitors and active alerts; no fake healthy, zero, or placeholder status evidence.
- Operator workflow clarity: monitor lookup, active-alert lookup, and runtime persistence must remain in that order so saved entities surface accurate health immediately after mutation.
- Context visibility: accepted entity id, workspace id, bound monitor ids, active-alert count, status reason, and persisted status stay visible through the existing detail/list read models.

## 2026-05-10 Entity Definition Draft Boundary

- Hierarchy: definition import and edit keep raw document parsing, canonical normalization, workspace-aware DTO mapping, validation, persistence, and activity evidence in the existing order.
- Density: do not add preview panels, generated summaries, inferred fields, or extra activity rows while moving draft assembly behind a service boundary.
- Anti-AI-slop: blank documents, multi-document single imports, telemetry identities, monitor binds, relation refs, owners, and HertzBeat extension blocks must reflect submitted definitions only.
- Operator workflow clarity: single-definition and bundle APIs keep their current success and failure messages so import/edit callers can map errors to the submitted YAML or JSON.
- Context visibility: request workspace id, target entity id, document order, mapped entity DTOs, relation refs, and definition format remain visible through existing import/export APIs and activity records.

## 2026-05-10 Entity Mutation Workflow Boundary

- Hierarchy: create, edit, definition import, and bundle import keep validation, catalog persistence, identity writes, monitor binds, relations, runtime health refresh, and activity evidence in their existing order.
- Density: do not add extra mutation stages, generated summaries, preview cards, or duplicate activity rows while moving mutation choreography behind a service boundary.
- Anti-AI-slop: saved catalog rows, identities, binds, relations, health, and activity evidence must come from submitted DTOs/definitions and existing read models only.
- Operator workflow clarity: single create/edit/import and multi-entity bundle imports keep the same success ids, failure behavior, and definition activity records so callers can trace exactly what was accepted.
- Context visibility: request workspace id, accepted entity ids, bundle order, source fallback, relation refs, runtime status, and activity format remain visible through existing APIs and read models.

## 2026-05-10 Entity Definition Document Parser Boundary

- Hierarchy: definition import/edit keeps the existing document-first flow before entity normalization, relation resolution, and activity writes.
- Density: do not add parser explanation rows, format badges, or fake preview records while extracting the document parser; invalid input remains a direct validation failure.
- Anti-AI-slop: never invent entity documents from blank content, scalar YAML/JSON, or malformed curl payloads to make an import look usable.
- Operator workflow clarity: payload extraction, format detection, JSON/YAML loading, multi-document order, and bundle unwrapping must complete before the entity service applies domain defaults.
- Context visibility: accepted source format, document order, metadata name/namespace, bundle size, and existing definition activity context remain visible exactly as before.

## 2026-05-10 Entity Definition Document Renderer Boundary

- Hierarchy: definition export keeps the existing entity-to-definition-to-document order before the operator sees YAML or JSON output.
- Density: do not add export banners, format hints, or synthetic preview sections while extracting rendering; the returned document remains the only payload.
- Anti-AI-slop: never add empty integrations, extensions, hertzbeat blocks, relations, or telemetry placeholders to make an exported entity look richer.
- Operator workflow clarity: canonical metadata, spec, telemetry, relation, integration, extension, and HertzBeat-specific blocks must render after the entity service builds the real definition model.
- Context visibility: accepted format, entity kind, metadata, spec fields, telemetry bindings, relation refs, and existing definition export context remain visible exactly as before.

## 2026-05-10 Entity Definition Export Workspace Lookup Boundary

- Hierarchy: definition export keeps entity DTO loading, DTO-to-definition mapping, and document rendering in order while request workspace lookup lives with the detail read-model boundary.
- Density: do not add export helper copy, preview rows, badges, or wrapper payloads while removing export-level workspace plumbing.
- Anti-AI-slop: never default workspace scope in the export orchestrator to make inaccessible entity definitions render.
- Operator workflow clarity: inaccessible entities still return no definition, and accepted entities keep the same canonical YAML/JSON output path.
- Context visibility: entity id, requested format, stored DTO fields, canonical definition blocks, and request workspace constraints remain visible through existing service contracts.

## 2026-05-10 Entity Monitor Query Anti-Corruption Boundary

- Hierarchy: monitor binding writes and monitor-binding suggestions keep entity workflow ownership, while old monitor DAO lookup lives behind a dedicated query boundary.
- Density: do not add monitor preview cards, duplicate binding rows, helper copy, or synthetic compatibility metadata while moving the lookup.
- Anti-AI-slop: never invent missing monitors, never preserve stale binds for nonexistent monitors, and never broaden suggestions beyond accepted monitor records.
- Operator workflow clarity: missing monitors still produce no suggestions or skipped binds, accepted monitors keep the same order, filters, and identity evidence.
- Context visibility: monitor ids, monitor app/name/instance labels, bind source/type/status/score, and matched identity keys remain visible through existing DTO and bind contracts.

## 2026-05-10 Entity Definition Export Facade Boundary

- Hierarchy: definition export keeps workspace-scoped entity DTO loading, DTO-to-definition mapping, and document rendering in that order before YAML or JSON reaches the operator.
- Density: do not add export previews, explanatory wrappers, format badges, or synthetic document sections while moving export orchestration behind a facade.
- Anti-AI-slop: never render a cross-workspace entity, never invent telemetry, relations, integrations, extensions, or HertzBeat blocks when the stored DTO lacks evidence.
- Operator workflow clarity: inaccessible entities still return no definition, and accepted entities keep the same canonical document format and fallback behavior.
- Context visibility: accepted entity id, request workspace id, output format, canonical definition fields, telemetry, relation refs, and extension blocks remain visible through the existing export payload.

## 2026-05-10 Entity Governance Workflow Facade Boundary

- Hierarchy: definition templates, definition activities, resume drafts, discovery presets, and discovery activities keep their current workspace workflow order while request workspace lookup moves behind a facade.
- Density: do not add governance banners, scope badges, helper prose, or synthetic rows while reducing facade orchestration.
- Anti-AI-slop: never invent templates, presets, activity trails, resume drafts, seed bundles, or discovery entity refs for an empty workspace.
- Operator workflow clarity: every read, save, and delete must resolve the same current request workspace before touching shared governance state.
- Context visibility: accepted template id, activity id, resume token, preset id, seed definition metadata, workspace path, entity refs, creator, and timestamps remain visible through the existing payloads.

## 2026-05-10 Entity Facade Dependency Wiring Boundary

- Hierarchy: the large entity facade remains a thin API entry point that forwards validation, mutation, detail, activity, evidence, governance, catalog, list, and monitor-binding work to dedicated M5 components.
- Density: do not add fallback service creation, duplicate orchestration, synthetic payload rows, or operator copy while fixing dependency wiring.
- Anti-AI-slop: never silently skip activity timelines or detail observability assembly because a delegated service was not injected.
- Operator workflow clarity: entity detail, definition activity, evidence, governance, and catalog entry points must all reach their owning service consistently at runtime.
- Context visibility: current request workspace id and accepted entity ids stay passed through existing method boundaries instead of being hidden behind fallback objects.

## 2026-05-10 Entity Facade Workspace Lookup Boundary

- Hierarchy: the entity facade remains an API router while workspace lookup lives with detail, definition draft, activity, catalog, list, and integration read-model/workflow owners.
- Density: do not add workspace badges, helper banners, duplicated context rows, or fallback enrichment while removing facade-level workspace plumbing.
- Anti-AI-slop: never default or invent workspace scope in the facade to make detail, definition, catalog, list, or binding results appear available.
- Operator workflow clarity: each delegated service must resolve the current request workspace exactly where it reads or maps operator evidence.
- Context visibility: accepted entity ids, definition requests, list filters, catalog suggestions, monitor ids, and request workspace constraints remain visible through existing service contracts.

## 2026-05-10 Entity Governance Workflow Workspace Lookup Boundary

- Hierarchy: governance workflow methods remain operator-facing command/read entry points while the state boundary owns request workspace lookup for templates, activities, resumes, presets, and discovery activity rows.
- Density: do not add scope banners, helper copy, duplicated workflow rows, or synthetic empty-state content while moving workspace lookup down.
- Anti-AI-slop: never default workspace scope in the workflow facade to make missing templates, presets, resume drafts, or activity trails appear available.
- Operator workflow clarity: every governance read, save, and delete must resolve workspace scope at the state read/write boundary that touches persisted evidence.
- Context visibility: template ids, activity ids, resume tokens, preset ids, seed definition metadata, workspace paths, entity refs, creators, timestamps, and request workspace constraints stay visible through existing payloads.

## 2026-05-10 Entity Mutation Workflow Workspace Lookup Boundary

- Hierarchy: mutation workflows keep create, edit, definition import, bundle import, and definition update sequencing while raw workspace lookup lives with draft parsing, relation resolution, status refresh, and activity persistence boundaries.
- Density: do not add import preview rows, mutation helper copy, generated activity summaries, or duplicate evidence records while moving workspace lookup down.
- Anti-AI-slop: never default workspace scope in the workflow to make cross-workspace relations, alerts, activities, or definition imports appear valid.
- Operator workflow clarity: access checks remain explicit in the workflow, but each delegated write/read stage resolves request workspace scope where it touches persisted or derived evidence.
- Context visibility: accepted entity ids, definition formats, bundle order, relation refs, monitor evidence, lifecycle activity type, and request workspace constraints remain visible through existing API behavior.

## 2026-05-10 Entity Definition Normalization Boundary

- Hierarchy: import/edit normalization keeps raw document parsing separate from canonical entity-definition interpretation before any entity DTO or persistence decision.
- Density: keep the operator payload as the evidence source; do not add generated enrichment, hidden defaults beyond existing source/type fallbacks, or synthetic catalog details during normalization.
- Anti-AI-slop: legacy aliases, tags, links, contacts, telemetry, relations, and HertzBeat-specific blocks must normalize only when present or explicitly derivable from the submitted definition.
- Operator workflow clarity: validation failures and imported fields continue to map back to the submitted YAML/JSON structure, so the editor preview and activity trail explain real input rather than invented status.
- Context visibility: canonical apiVersion, kind, metadata, spec, telemetry, relation refs, integrations, extensions, and HertzBeat-specific context remain inspectable after normalization.

## 2026-05-10 Entity Definition Mapping Boundary

- Hierarchy: definition import/export keeps document parsing, normalization, entity DTO mapping, and persistence/rendering as separate steps before any operator-facing result.
- Density: do not add generated entity fields, placeholder identities, fake binds, or synthetic relations while moving DTO mapping.
- Anti-AI-slop: mapping must preserve only real metadata, catalog links/contacts, telemetry identities, monitor binds, relations, integration/extension blocks, and HertzBeat blocks.
- Operator workflow clarity: imports, edits, bundle creation, and export previews continue to explain the submitted or stored definition fields without invented enrichment.
- Context visibility: entity kind/type, metadata, source, owner, namespace, runbook, telemetry, relation refs, and exported definition context remain visible exactly as before.

## 2026-05-10 Entity Definition Source Ownership Boundary

- Hierarchy: definition import/export ownership should stay split across parser, normalization, mapping, renderer, and orchestration rather than drifting back into the large service.
- Density: do not preserve duplicate helper paths that could add hidden defaults, duplicate rows, or conflicting relation refs during future changes.
- Anti-AI-slop: source ownership must make it obvious that generated enrichment, placeholder identities, fake binds, and synthetic relation evidence have no fallback path in `ObserveEntityServiceImpl`.
- Operator workflow clarity: imports, edits, bundle creation, and export previews continue to flow through the dedicated components before persistence or rendering.
- Context visibility: canonical definition fields, mapped entity context, relation refs, telemetry bindings, and export blocks remain inspectable in their dedicated boundaries.

## 2026-05-10 Entity Deletion Cleanup Ownership Boundary

- Hierarchy: delete access checks stay in the deletion write-model, while identity, monitor-bind, relation, and catalog-row cleanup each remain owned by their domain boundary before the entity disappears from operator views.
- Density: do not add delete summaries, cleanup banners, duplicate relation rows, or synthetic monitor evidence while moving cleanup orchestration.
- Anti-AI-slop: never hide dangling monitor binds or relations by inventing fallback cleanup evidence; deletion must remove only persisted dependent rows for the accepted entity id.
- Operator workflow clarity: inaccessible entities still skip every side effect, and accepted deletes keep the same dependent-row cleanup order before the catalog row is removed.
- Context visibility: accepted entity id, identity cleanup, monitor-bind cleanup, relation cleanup, and final catalog deletion remain visible through service contracts and tests.

## 2026-05-10 Entity Detail Child Evidence Ownership Boundary

- Hierarchy: entity detail loading keeps workspace acceptance first, then asks monitor-bind and relation boundaries for persisted child evidence instead of reading those stores itself.
- Density: do not add extra detail sections, duplicate relation rows, monitor previews, or helper copy while moving child evidence ownership.
- Anti-AI-slop: never synthesize monitor binds or relation context for an accepted entity; the detail DTO must expose only persisted rows from the owning boundaries.
- Operator workflow clarity: rejected or missing entities still skip every child lookup, while accepted entities keep stable identity, monitor-bind, and relation ordering.
- Context visibility: accepted entity id, identities, monitor bind ids/status/source, relation refs/types/status, and request workspace checks remain visible through existing detail DTO contracts.

## 2026-05-10 Entity Activity Monitor Evidence Ownership Boundary

- Hierarchy: activity writes keep definition/lifecycle event persistence, while monitor-bind evidence for discovery classification and detail counts stays behind the monitor-bind boundary.
- Density: do not add extra timeline rows, generated summaries, badges, or duplicated monitor evidence while moving the lookup.
- Anti-AI-slop: discovery activity must not invent bind counts or telemetry-discovery evidence; it can only reflect persisted monitor bind rows.
- Operator workflow clarity: source changes, catalog updates, and telemetry discovery decisions keep their existing order and wording, with inaccessible workflow guards handled before activity writes.
- Context visibility: accepted entity id, activity type, workspace id, source, owner/system/environment, telemetry-discovery bind ids, and monitor-bind count remain visible through activity tests and payloads.

## 2026-05-10 Entity Workspace Query Ownership Boundary

- Hierarchy: request-workspace access decisions stay in `EntityWorkspaceAccessService`, while raw catalog row lookup by id, ids, sorted workspace, and entity reference belongs to a dedicated query boundary.
- Density: do not add workspace badges, duplicated catalog rows, helper copy, or extra evidence sections while moving lookup ownership.
- Anti-AI-slop: access checks must not widen scope or synthesize default rows when the persisted catalog has no matching entity.
- Operator workflow clarity: entity detail, list, activity, relation, identity candidate, and mutation flows keep the same accepted/rejected workspace behavior after raw lookup delegation.
- Context visibility: request workspace id, entity id, reference type/namespace/name, sorted catalog rows, default-workspace compatibility, and filtered accepted entities remain visible through existing service contracts.

## 2026-05-10 Entity Activity Entity Lookup Ownership Boundary

- Hierarchy: activity writes keep timeline row persistence and activity detail construction, while stored entity workspace fallback lookup belongs to the workspace access boundary.
- Density: do not add extra timeline rows, generated summaries, workspace helper copy, or duplicated activity evidence while moving the entity lookup.
- Anti-AI-slop: activity workspace fallback must not invent a scope when the request and stored entity are absent; default workspace remains only the existing last-resort behavior.
- Operator workflow clarity: definition failures, catalog lifecycle updates, source changes, and telemetry discovery activity continue to show the same summaries and details after the lookup boundary moves.
- Context visibility: entity id, resolved workspace id, activity type, format, status, summary, detail, and monitor-bind evidence remain visible through the existing activity payload contracts.

## 2026-05-10 Entity Deletion Catalog Row Ownership Boundary

- Hierarchy: deletion orchestration keeps access checks and dependent identity, monitor-bind, and relation cleanup before asking the core write model to remove the accepted catalog row.
- Density: do not add delete banners, cleanup summaries, duplicate timeline rows, or synthetic cleanup evidence while moving the final delete call.
- Anti-AI-slop: never invent deletion evidence or hide dangling cleanup by deleting rows outside the accepted entity id.
- Operator workflow clarity: inaccessible deletes still stop before side effects; accepted deletes keep the same cleanup order and final catalog-row removal.
- Context visibility: accepted entity id, identity cleanup, monitor-bind cleanup, relation cleanup, and catalog-row delete remain visible through existing service contracts.

## 2026-05-10 Entity Identity Read Evidence Ownership Boundary

- Hierarchy: detail DTO assembly and list summaries keep workspace acceptance and summary composition first, while persisted identity rows and counts come from a dedicated identity read-model boundary.
- Density: do not add identity badges, duplicate detail sections, extra summary columns, or helper copy while moving identity lookups.
- Anti-AI-slop: never infer identities from labels, monitors, alerts, or telemetry placeholders; detail identities and identity counts must reflect persisted identity rows only.
- Operator workflow clarity: rejected or missing entities still skip identity lookups, accepted detail pages keep stable identity ordering, and list summaries keep the same count semantics.
- Context visibility: accepted entity id, persisted identity key/value/priority rows, identity count, monitor/relation counts, status, and definition activity context remain visible through existing DTO contracts.

## 2026-05-10 Entity Identity Candidate Match Ownership Boundary

- Hierarchy: monitor-binding candidate resolution keeps monitor identity extraction, bind evidence, workspace filtering, and scoring, while persisted identity-match lookup belongs to the identity read-model boundary.
- Density: do not add candidate badges, extra suggestion rows, helper copy, or duplicate identity evidence while moving the persisted match query.
- Anti-AI-slop: candidates must not be inferred from monitor labels alone; suggestions require persisted identity rows and accepted workspace entities.
- Operator workflow clarity: hint calls keep current request workspace behavior, explicit workspace calls keep the same filtering, and already-bound flags continue to reflect persisted monitor binds.
- Context visibility: monitor id, extracted identity keys/normalized values, persisted identity matches, accepted entity ids, scores, matched identity details, and already-bound state remain visible through existing candidate contracts.

## 2026-05-10 Entity Summary Count Evidence Ownership Boundary

- Hierarchy: entity list summaries keep row assembly and gateway readiness mapping, while monitor-bind and relation counts come from their owning domain boundaries.
- Density: do not add extra summary badges, list columns, helper copy, or duplicate evidence lookups while moving count ownership.
- Anti-AI-slop: list summaries must not infer monitor or relation counts from supplied monitor previews, gateway readiness, or placeholder evidence.
- Operator workflow clarity: identity, monitor, relation, alert, definition activity, and next-action summary values keep the same order and meaning for entity list scanning.
- Context visibility: accepted entity id, identity count, persisted monitor-bind count, relation count, active alert count, status, ops summary, and latest definition activity remain visible through summary contracts.

## 2026-05-10 Entity Summary Definition Activity Ownership Boundary

- Hierarchy: list summary assembly keeps counts, status, ops readiness, and next action composition, while latest definition activity lookup belongs to the activity read-model boundary.
- Density: do not add extra list columns, activity badges, timeline previews, or helper copy while moving definition activity lookup.
- Anti-AI-slop: summaries must not invent import/update evidence from lifecycle rows or missing activity history; only persisted definition import/update rows can mark definition activity context.
- Operator workflow clarity: entity list scanning keeps the same definition activity status, summary, format, and time semantics after the lookup moves.
- Context visibility: entity ids, latest definition import/update row, ignored lifecycle activities, summary counts, status, ops readiness, and next action remain visible through the existing list summary contracts.

## 2026-05-10 Entity List Catalog Query Ownership Boundary

- Hierarchy: entity list read-model assembly should keep summary/evidence composition, while catalog page filtering, sorting, workspace predicates, search predicates, and old API type compatibility live in a catalog query boundary.
- Density: do not add list columns, badges, helper copy, or duplicated fallback rows while moving the query ownership.
- Anti-AI-slop: list queries must not infer entities outside the persisted catalog page or silently widen workspace scope when filters are absent.
- Operator workflow clarity: entity list scanning keeps the same pagination, search, type/status/source/owner/environment/lifecycle/tier/system filters, and old api/endpoint compatibility behavior after delegation.
- Context visibility: request workspace, page request, search text, accepted entity ids, old api endpoint predicates, and persisted catalog rows remain visible through query and list contracts.

## 2026-05-10 Entity Detail Runtime Evidence Ownership Boundary

- Hierarchy: entity detail observability assembly should keep evidence, handoff, noise-control, and activity composition, while bound-monitor lookup, active-alert lookup, and status persistence live behind the runtime status refresh boundary.
- Density: do not add detail panels, badges, helper rows, loading copy, or duplicated monitor/alert previews while moving runtime evidence ownership.
- Anti-AI-slop: detail health, active alert count, and monitor context must come from persisted monitor binds plus real alert evidence, never synthetic healthy/zero panels.
- Operator workflow clarity: accepted entity detail pages keep the same status, alert, monitor, log, trace, response handoff, noise-control, and definition activity semantics after delegation.
- Context visibility: entity id, request workspace, bound monitors, active alerts, computed status, evidence summary, handoff context, and activity timeline remain visible through existing detail contracts.

## 2026-05-10 Entity List Runtime Evidence Ownership Boundary

- Hierarchy: entity list read-model assembly should keep catalog paging, workspace filtering, latest activity lookup, and summary mapping, while bound-monitor lookup, active-alert lookup, and status persistence live behind the runtime status refresh boundary.
- Density: do not add list columns, badges, helper rows, duplicated alert previews, or fake status chips while moving runtime evidence ownership.
- Anti-AI-slop: list health, alert count, and monitor context must come from persisted monitor binds plus real alert evidence, never synthetic healthy/zero rows.
- Operator workflow clarity: entity list scanning keeps the same status, monitor count, alert count, definition activity, ops summary, next-action, pagination, and total fallback semantics after delegation.
- Context visibility: request workspace, entity id, bound monitors, active alerts, computed status, latest definition activity, summary evidence, and pagination total remain visible through existing list contracts.

## 2026-05-10 Entity Definition Residual Helper Boundary

- Hierarchy: the large entity service should only orchestrate definition parsing, normalization, mapping, persistence, and rendering; residual conversion helpers belong to the dedicated definition components.
- Density: removing duplicate helper code must not add copy, wrapper rows, or inferred catalog details to import/export responses.
- Anti-AI-slop: no hidden helper path may invent owners, contacts, links, telemetry, monitor binds, relations, or HertzBeat extension blocks after the source components have made their decisions.
- Operator workflow clarity: submitted definitions, edit payloads, bundle imports, and exports continue to preserve their existing success/failure behavior while helper ownership gets simpler.
- Context visibility: accepted definition fields, entity DTO fields, relation references, and rendered document blocks remain visible through the existing APIs and tests.

## 2026-05-10 Entity Relation Query Ownership Boundary

- Hierarchy: relation replacement and reference resolution stay in the relation domain boundary, while persisted relation evidence and relation counts move behind a dedicated query boundary.
- Density: do not add topology rows, summary badges, helper copy, duplicate relation previews, or generated relationship hints while moving lookup ownership.
- Anti-AI-slop: relation detail and count evidence must come from persisted relation rows only; no inferred zero, healthy, dependency, or topology state should appear from missing rows.
- Operator workflow clarity: entity detail and entity list scanning keep the same relation evidence and count semantics after the storage lookup moves.
- Context visibility: accepted entity id, incoming/outgoing relation rows, relation counts, normalized target references, and workspace-resolved relation targets remain visible through existing service contracts.

## 2026-05-10 Entity Monitor-Bind Query Ownership Boundary

- Hierarchy: monitor-bind replacement and cleanup stay in the monitor-bind domain boundary, while persisted bind rows, monitor-id reverse lookups, and bind counts move behind a dedicated query boundary.
- Density: do not add monitor badges, extra summary columns, helper copy, duplicate monitor previews, or synthetic binding hints while moving lookup ownership.
- Anti-AI-slop: bound monitor evidence and counts must come from persisted bind rows plus real monitor rows only; do not infer binds from names, labels, alerts, or placeholder telemetry.
- Operator workflow clarity: detail pages, activity evidence, identity candidates, runtime health, and list summaries keep the same bind order and count semantics after delegation.
- Context visibility: accepted entity id, persisted bind rows, monitor id reverse lookup, bind counts, monitor lookup handoff, and replacement cleanup remain visible through existing contracts.

## 2026-05-10 Entity Runtime Health Persistence Boundary

- Hierarchy: runtime health calculation stays focused on bound monitor and alert evidence, while catalog-row status persistence belongs to a dedicated write-model boundary.
- Density: do not add status badges, health panels, helper copy, duplicate alert rows, or extra summary fields while moving persistence ownership.
- Anti-AI-slop: runtime status must persist only the computed value from real bound monitors and active alerts; never invent healthy, degraded, zero, or paused evidence to make a row look complete.
- Operator workflow clarity: detail pages, list rows, and mutation refresh flows keep the same status, reason, monitor counts, alert counts, and unchanged-status no-op behavior after delegation.
- Context visibility: accepted entity id, previous status, computed status, bound monitor counts, active alert count, and persisted catalog row remain visible through existing service contracts.

## 2026-05-10 Old Monitor Route Host-Alias Compatibility Boundary

- Hierarchy: the old batch monitor route keeps monitor catalog query ownership, while entity workflows consume monitor rows only through the existing anti-corruption boundary.
- Density: do not add response fields, wrapper rows, extra filters, helper copy, or duplicate monitor summaries while preserving the legacy query alias.
- Anti-AI-slop: the `host` alias must map to the real monitor search predicate; do not infer monitor matches from placeholder entity, alert, or telemetry context.
- Operator workflow clarity: existing clients calling `/api/monitors?host=...` keep the same search behavior as clients using `/api/monitors?search=...`, and explicit `search` remains the preferred value when both are present.
- Context visibility: monitor ids, app, status, labels, sort/order, pagination, search text, and legacy host alias remain visible through controller and service contracts.

## 2026-05-10 Old Monitor Route Id-Alias Compatibility Boundary

- Hierarchy: the old monitor list route keeps monitor catalog query ownership, while entity workflows continue to read monitor rows only through the anti-corruption query boundary.
- Density: do not add response fields, wrapper rows, duplicate filters, helper copy, or synthetic monitor summaries while preserving the legacy singular id alias.
- Anti-AI-slop: the `id` alias must map only to an explicit persisted monitor id filter; never infer monitor identity from entity, alert, topology, or telemetry placeholders.
- Operator workflow clarity: existing clients calling `/api/monitors?id=...` keep the same filter behavior as clients using `/api/monitors?ids=...`, explicit `ids` remains preferred when both are present, and malformed legacy ids stay ignored rather than breaking old list searches.
- Context visibility: monitor ids, legacy id alias, app, status, labels, search text, host alias, sort/order, and pagination remain visible through controller and service contracts.

## 2026-05-10 Old Monitor Delete Authorization Config Boundary

- Hierarchy: shipped Sureness templates keep authorization ownership in deployment/runtime config, while monitor controllers and entity read models keep their current route behavior.
- Density: do not add roles, duplicate monitor route entries, helper copy, or new endpoint patterns while normalizing the old singular monitor DELETE rule.
- Anti-AI-slop: delete authorization must protect only the explicit `/api/monitor/**` DELETE route with the admin role; do not broaden it to monitor lists, entity routes, or telemetry ingest paths.
- Operator workflow clarity: private deployments using packaged or compose `sureness.yml` templates keep monitor delete access restricted to admins with a parseable `api===method===roles` rule.
- Context visibility: route pattern, HTTP method, role list, and shipped config file remain visible through the config contract without changing controller response shapes.

## 2026-05-10 Old Monitor Batch Id-Alias Compatibility Boundary

- Hierarchy: monitor batch mutation routes keep controller-level compatibility, while entity workflows continue to consume monitor rows through the existing anti-corruption query boundary.
- Density: do not add response fields, wrapper rows, duplicate endpoints, helper copy, or synthetic monitor summaries while accepting the singular id alias.
- Anti-AI-slop: the `id` alias must map only to explicit persisted monitor ids for delete/manage side effects; never infer batch ids from entity, alert, topology, or telemetry context.
- Operator workflow clarity: existing clients calling `/api/monitors?id=...`, `DELETE /api/monitors/manage?id=...`, or `GET /api/monitors/manage?id=...` keep their side effects; explicit `ids` remains preferred and body ids stay a legacy fallback.
- Context visibility: query `ids`, legacy query `id`, body ids, chosen batch-id set, route, method, and service side effect remain visible through controller contracts.

## 2026-05-10 Old Monitor Export Id-Alias Compatibility Boundary

- Hierarchy: monitor export remains a controller-level compatibility affordance for explicit monitor rows, while entity read models keep monitor evidence behind the anti-corruption query boundary.
- Density: do not add export summary payloads, duplicated export endpoints, or UI hints; only preserve the old singular id request shape for the existing download route.
- Anti-AI-slop: export ids must come from explicit query `ids` or legacy query `id`; never infer export scope from search text, host filters, entity context, or telemetry evidence.
- Operator workflow clarity: existing clients calling `/api/monitors/export?id=...&type=JSON` keep the same export side effect as `/api/monitors/export?ids=...&type=JSON`, with `ids` remaining preferred when both are present.
- Context visibility: query `ids`, legacy query `id`, export type, route, method, and the selected id list remain visible through the controller contract.

## 2026-05-10 Old Monitor Import Multipart Binding Boundary

- Hierarchy: monitor import remains a single controller-level file upload handoff to the existing monitor import service, while entity read models keep monitor evidence behind the anti-corruption query boundary.
- Density: do not add upload summaries, alternate response payloads, duplicated import endpoints, helper copy, or fake import progress rows while tightening multipart binding.
- Anti-AI-slop: imported monitor config must come only from the explicit multipart `file` part; never infer import content from params, placeholder entities, telemetry, or generated sample monitors.
- Operator workflow clarity: existing clients posting `FormData` with `file` to `/api/monitors/import` keep the same success response and real import side effect across compiler/native packaging modes.
- Context visibility: multipart part name, original filename/content, route, method, response message, and service handoff remain visible through the controller contract.

## 2026-05-10 Entity Detail Facade Handoff Boundary

- Hierarchy: the observe entity facade should delegate entity detail loading plus observability assembly to the detail read-model boundary instead of composing the DTO through a self-call.
- Density: do not add panels, summaries, badges, helper copy, alternate response wrappers, or duplicate entity detail rows while tightening the handoff.
- Anti-AI-slop: entity detail evidence must keep coming from persisted entity rows, identities, relations, real bound monitors, active alerts, logs, traces, metrics, and activities; never fabricate empty health or navigation evidence.
- Operator workflow clarity: entity detail callers keep the same null-on-inaccessible behavior and the same evidence bundle, while the facade stays a thin route-to-service boundary.
- Context visibility: accepted entity id, request workspace, loaded entity DTO, runtime status evidence, response handoffs, noise-control evidence, and definition activities remain visible through the read-model contracts.

## 2026-05-10 Observability Workspace Gateway Query Boundary

- Hierarchy: observability-facing entity identity, entity row, and bind-count lookups should route through manager entity query boundaries, while raw DAO ownership stays inside the manager domain.
- Density: do not add observability summary fields, entity cards, helper copy, duplicate monitor evidence, or synthetic workspace rollups while moving the gateway handoff.
- Anti-AI-slop: observability workspace context must come only from persisted entity identities, entity catalog rows, bind rows, monitors, and collectors; never infer workspace identity from placeholder telemetry or generated labels.
- Operator workflow clarity: traces, ingest attribution, and workspace summary callers keep the same counts, identity matches, entity lookup, and bind-count semantics after the gateway stops touching entity DAOs directly.
- Context visibility: identity keys, normalized values, entity ids, entity rows, bind counts, monitor/collector counts, and latest monitor evidence remain visible through explicit query contracts.

## 2026-05-10 Observability Inventory Gateway Query Boundary

- Hierarchy: monitor and collector inventory reads should route through a manager observability inventory query boundary, while raw monitor and collector DAO ownership stays inside that boundary.
- Density: do not add inventory summary fields, collector cards, monitor badges, helper copy, or synthetic readiness totals while moving the gateway handoff.
- Anti-AI-slop: monitor counts, collector counts, online collector counts, and latest monitor evidence must come only from persisted monitor and collector rows; never infer inventory health from entity, alert, topology, or telemetry placeholders.
- Operator workflow clarity: workspace summaries, ingest attribution, trace context, and entity workbench callers keep the same monitor and collector count semantics after the gateway stops touching inventory DAOs directly.
- Context visibility: monitor count, collector count, collector status byte, latest monitor row, and entity query handoffs remain visible through explicit query contracts.

## 2026-05-10 Old Monitor Singular Delete Query-Id Boundary

- Hierarchy: the singular monitor delete route should preserve old-client query-id compatibility while keeping the delete side effect in the existing monitor service.
- Density: do not add response wrappers, delete previews, extra route families, helper copy, or synthetic monitor evidence while accepting the legacy query shape.
- Anti-AI-slop: delete scope must come only from the explicit persisted monitor id path variable or query parameter; never infer a delete target from entity, alert, topology, or telemetry context.
- Operator workflow clarity: clients using `DELETE /api/monitor/{id}` and legacy clients using `DELETE /api/monitor?id=...` get the same existence check, side effect, and success/not-found message.
- Context visibility: route, HTTP method, path id, legacy query id, existence lookup, delete side effect, and response message remain visible through controller contracts.

## 2026-05-10 Old Monitor Singular Get Query-Id Boundary

- Hierarchy: the singular monitor read route should preserve old-client query-id compatibility while keeping monitor DTO loading in the existing monitor service.
- Density: do not add response wrappers, duplicate monitor summaries, helper copy, alternate payloads, or synthetic monitor evidence while accepting the legacy query shape.
- Anti-AI-slop: read scope must come only from the explicit persisted monitor id path variable or query parameter; never infer monitor identity from entity, alert, topology, or telemetry context.
- Operator workflow clarity: clients using `GET /api/monitor/{id}` and legacy clients using `GET /api/monitor?id=...` get the same success and not-found response semantics.
- Context visibility: route, HTTP method, path id, legacy query id, DTO lookup, not-found branch, and response body remain visible through controller contracts.

## 2026-05-10 Old Monitor Pinned Collector Validation Boundary

- Hierarchy: old monitor create/edit validation should keep request normalization and parameter checks in `MonitorServiceImpl`, while persisted collector existence lookup routes through a dedicated query boundary.
- Density: do not add collector pickers, validation panels, response wrappers, helper copy, duplicate monitor summaries, or synthetic collector evidence while moving the lookup owner.
- Anti-AI-slop: pinned collector validity must come only from the explicit submitted collector name and persisted collector rows; never infer collector availability from entity, topology, telemetry labels, generated examples, or UI defaults.
- Operator workflow clarity: legacy create/edit clients keep the same "pinned collector does not exist" rejection and blank collector normalization, but the raw collector DAO read path is now explicit.
- Context visibility: submitted collector, blank normalization, persisted collector lookup, validation rejection, and later collector-bind persistence remain visible through service contracts.

## 2026-05-10 Old Monitor Page Query Boundary

- Hierarchy: old monitor pagination, filtering, and sort specification should live in a query boundary, while `MonitorServiceImpl` keeps the legacy service API surface.
- Density: do not add list panels, duplicate counters, alternate route envelopes, helper copy, synthetic monitor rows, or fallback summaries while moving the raw page query.
- Anti-AI-slop: monitor list rows must come only from persisted monitor rows and explicit request filters; never infer monitor scope from entity context, alert evidence, topology, telemetry labels, or generated examples.
- Operator workflow clarity: legacy monitor list callers keep the same app, status, search, label, sort, order, and pagination behavior, with repository access isolated for future compatibility work.
- Context visibility: submitted filters, generated specification, pageable sort, raw DAO page query, and legacy service method remain visible through source and behavior contracts.

## 2026-05-10 Old Monitor Status Write-Model Boundary

- Hierarchy: old monitor status mutation should sit behind a write-model boundary, while `MonitorServiceImpl` keeps route-facing orchestration and compatibility behavior.
- Density: do not add status panels, duplicate monitor summaries, helper copy, alternate response envelopes, or synthetic status evidence while moving persistence ownership.
- Anti-AI-slop: monitor status must come only from explicit service inputs and persisted monitor rows; never infer pause, resume, up, or down state from entity context, telemetry placeholders, alerts, topology, or generated examples.
- Operator workflow clarity: legacy status-update callers keep the same side effect, but raw status persistence is separated from the monitor service orchestration path.
- Context visibility: monitor id, submitted status, write-model call, raw DAO update, and unchanged legacy service method remain visible through source and behavior contracts.

## 2026-05-10 Old Monitor Copy Query-Id Boundary

- Hierarchy: the singular monitor copy route should preserve old-client query-id compatibility while keeping the copy side effect in the existing monitor service.
- Density: do not add response wrappers, copy previews, duplicate monitor rows, helper copy, or synthetic monitor evidence while accepting the legacy query shape.
- Anti-AI-slop: copy scope must come only from the explicit persisted monitor id path variable or query parameter; never infer copy targets from entity, alert, topology, or telemetry context.
- Operator workflow clarity: clients using `POST /api/monitor/copy/{id}` and legacy clients using `POST /api/monitor/copy?id=...` get the same success and failure response semantics.
- Context visibility: route, HTTP method, path id, legacy query id, copy side effect, exception branch, and response message remain visible through controller contracts.

## 2026-05-10 Old Monitor Singular Modify Path-Id Boundary

- Hierarchy: the singular monitor modify route should preserve old-client path-id compatibility while keeping validation and mutation side effects in the existing monitor service.
- Density: do not add response wrappers, duplicate monitor summaries, helper copy, extra editor routes, or synthetic monitor evidence while accepting the legacy path shape.
- Anti-AI-slop: modify scope must come only from the explicit persisted monitor id path variable or the submitted monitor body; never infer monitor identity from entity, alert, topology, or telemetry context.
- Operator workflow clarity: clients using `PUT /api/monitor` and legacy clients using `PUT /api/monitor/{id}` get the same validation, mutation side effect, and success response, with the path id binding the submitted monitor row.
- Context visibility: route, HTTP method, path id, body monitor id, validation call, mutation side effect, and response message remain visible through controller contracts.

## 2026-05-10 Old Monitor Root Authorization Boundary

- Hierarchy: exact root monitor authorization rules should sit beside wildcard monitor rules so old singular and batch controller entrypoints remain protected in every shipped Sureness template.
- Density: do not add new route families, role variants, response wrappers, helper copy, or duplicate monitor workflows while making the security templates explicit.
- Anti-AI-slop: route access must be declared only from real controller paths and existing role scopes; never infer authorization from UI navigation, entity context, telemetry labels, or generated examples.
- Operator workflow clarity: existing clients calling exact root paths such as `GET /api/monitor?id=...`, `PUT /api/monitor`, `DELETE /api/monitor?id=...`, `GET /api/monitors`, and `DELETE /api/monitors` keep the same roles as their wildcard monitor route family.
- Context visibility: exact path, wildcard path, HTTP method, role list, shipped config file, and malformed-rule rejection stay visible through the config contract.

## 2026-05-10 Entity Governance State Write-Model Boundary

- Hierarchy: governance-state reads should stay in the query boundary, while template, resume, preset, and activity persistence routes through a write-model boundary.
- Density: do not add governance panels, generated workflow summaries, duplicate state rows, helper copy, or alternate response envelopes while splitting persistence ownership.
- Anti-AI-slop: governance state must be persisted only from explicit operator inputs and request workspace context; never infer saved templates, resumes, presets, or activities from placeholder telemetry or generated examples.
- Operator workflow clarity: definition and discovery workspace flows keep the same save/delete behavior, but the code now makes mutation side effects visibly separate from read lookup.
- Context visibility: state scope, state kind, state key, request workspace, resolved workspace id, saved content, and delete route remain visible through the query/write-model contracts.

## 2026-05-10 Old Monitor Submitted Null Id Boundary

- Hierarchy: old monitor bulk actions should normalize submitted ids inside the shared service-discovery expansion helper before DAO reads, while route/controller compatibility remains unchanged.
- Density: do not add validation panels, alternate response wrappers, helper copy, duplicate delete summaries, or synthetic child monitor rows while filtering invalid ids.
- Anti-AI-slop: action scope must come only from explicit non-null submitted monitor ids plus persisted service-discovery child binds; never infer targets from entity, alert, topology, telemetry, or placeholder context.
- Operator workflow clarity: legacy clients that accidentally include blank/null ids in a bulk request keep the valid requested side effect instead of failing the whole monitor cleanup path.
- Context visibility: submitted ids, sanitized parent ids, persisted child bind ids, expanded action ids, cleanup side effects, and scheduler events remain visible through the service contract.

## 2026-05-10 Entity Workspace Access Id Normalization Boundary

- Hierarchy: entity workspace access should normalize entity id collections before crossing into the raw workspace query boundary, while read models and facades keep their existing delegation paths.
- Density: do not add entity panels, summaries, duplicate rows, helper copy, alternate response wrappers, or synthetic workspace totals while tightening id handoff.
- Anti-AI-slop: accessible entity evidence must come only from explicit non-null entity ids and persisted entity rows; never infer entity scope from generated placeholders, topology guesses, alerts, telemetry, or monitor labels.
- Operator workflow clarity: entity detail/list/evidence flows that pass sparse or repeated ids keep the valid entity evidence and avoid repository-level null id failures.
- Context visibility: submitted ids, normalized entity ids, request workspace, persisted entity rows, and workspace filtering remain visible through the access/query contract.

## 2026-05-10 Old Monitor Bulk Id Order Boundary

- Hierarchy: old monitor bulk delete, pause, resume, and export routes should preserve submitted id order as request evidence while keeping side effects inside `MonitorService`.
- Density: do not add response wrappers, preview rows, helper copy, duplicate monitor summaries, or synthetic child-monitor evidence while making the id container deterministic.
- Anti-AI-slop: bulk action scope must come only from explicit query/body ids plus persisted service-discovery child binds; never infer order or targets from entity, alert, topology, telemetry, or generated examples.
- Operator workflow clarity: legacy clients using comma-separated `id`, repeated `ids`, or JSON bodies get the same actions, with deterministic submitted evidence for cleanup, support, and tests.
- Context visibility: route, HTTP method, submitted id sequence, normalized action set, service handoff, service-discovery expansion, and cleanup side effects remain visible through controller/service contracts.

## 2026-05-10 Entity Runtime Health Catalog Write Boundary

- Hierarchy: runtime health calculation should stay evidence-focused, while catalog-row status persistence routes through the core catalog write model that already owns `ObserveEntityDao` writes.
- Density: do not add health panels, duplicate status summaries, helper copy, synthetic evidence counters, alternate response envelopes, or generated remediation text while moving persistence ownership.
- Anti-AI-slop: entity status changes must come only from persisted monitors, active alerts, and the explicit entity row being refreshed; never infer catalog health from placeholder topology, telemetry guesses, or generated defaults.
- Operator workflow clarity: entity detail, evidence, and list flows keep the same status semantics, but code ownership now makes calculated health separate from raw catalog-row persistence.
- Context visibility: monitor totals, alert counts, computed status, entity row, catalog status mutation, and DAO save owner remain visible through runtime-health and core-write-model contracts.

## 2026-05-10 Entity Catalog Page Raw Query Boundary

- Hierarchy: entity list filters should build catalog page specifications in `EntityCatalogQueryService`, while raw `ObserveEntityDao.findAll(...)` execution stays in the workspace query boundary.
- Density: do not add entity list cards, extra summary counters, helper copy, fallback rows, duplicate pagination metadata, or synthetic workspace totals while moving the DAO handoff.
- Anti-AI-slop: list rows must come only from persisted entity catalog rows plus explicit request filters; never infer entities, owners, status, or workspace scope from placeholder topology, alerts, telemetry, or generated examples.
- Operator workflow clarity: entity list, detail handoff, and old API compatibility filters keep the same pagination, sort, search, and workspace behavior after the raw query owner moves.
- Context visibility: submitted filters, generated specification, pageable/sort, request workspace, persisted rows, and workspace filtering remain visible through catalog-query and workspace-query contracts.

## 2026-05-10 Old Monitor Service-Discovery Expansion Query Boundary

- Hierarchy: old monitor delete, pause, and resume should share one service-discovery expansion boundary, while `MonitorServiceImpl` stays focused on action side effects and cleanup sequencing.
- Density: do not add response wrappers, previews, duplicate monitor summaries, helper copy, alternate route branches, or synthetic child monitor rows while moving the bind lookup.
- Anti-AI-slop: expanded action scope must come only from explicit non-null submitted parent ids plus persisted `MonitorBind` child ids; never infer targets from entity, alert, topology, telemetry, or generated examples.
- Operator workflow clarity: legacy clients keep the same parent-plus-child behavior for delete, pause, and resume, but raw service-discovery bind lookup is visible in a dedicated query boundary.
- Context visibility: submitted ids, sanitized parent ids, persisted child bind rows, expanded action ids, monitor row lookup, cleanup side effects, and scheduler events remain visible through expansion and service contracts.

## 2026-05-10 Old Monitor Service-Discovery Bind Cleanup Boundary

- Hierarchy: old monitor delete should keep monitor-row deletion and scheduler events in `MonitorServiceImpl`, while service-discovery bind cleanup routes through a dedicated write-model boundary.
- Density: do not add delete previews, alternate route branches, response wrappers, helper copy, duplicate monitor summaries, or synthetic child monitor rows while moving cleanup ownership.
- Anti-AI-slop: cleanup scope must come only from persisted monitors selected for deletion and their persisted service-discovery bind rows; never infer cleanup targets from entity, alert, topology, telemetry, or generated examples.
- Operator workflow clarity: legacy delete clients keep the same parent-plus-child cleanup behavior, but parent-bind and child-bind deletion are now explicit write-model calls instead of raw DAO calls inside the monitor service.
- Context visibility: expanded monitor ids, persisted monitor rows, parent bind cleanup, child bind cleanup, entity bind cleanup, collector bind cleanup, favorites cleanup, scheduler cancellation, and deletion events remain visible through service contracts.

## 2026-05-10 Old Monitor Collector Bind Delete Cleanup Boundary

- Hierarchy: old monitor delete should keep selected monitor rows, job cancellation, and event publishing in `MonitorServiceImpl`, while collector bind cleanup routes through a dedicated write-model boundary.
- Density: do not add delete previews, collector cards, response wrappers, helper copy, duplicate monitor summaries, or synthetic collector evidence while moving cleanup ownership.
- Anti-AI-slop: collector bind cleanup must come only from persisted monitors selected for deletion; never infer collector cleanup scope from entity, alert, topology, telemetry labels, or generated examples.
- Operator workflow clarity: legacy delete clients keep the same collector binding cleanup, but the code now separates collector-bind persistence from the delete orchestration path.
- Context visibility: expanded action ids, persisted monitor rows, collector bind cleanup, service-discovery cleanup, entity bind cleanup, scheduler cancellation, and deletion events remain visible through service contracts.

## 2026-05-10 Old Monitor Collector Bind Modify Boundary

- Hierarchy: old monitor modify should keep validation, job update, monitor save, and param save in `MonitorServiceImpl`, while collector bind replacement routes through the collector-bind write-model boundary.
- Density: do not add editor panels, collector cards, response wrappers, helper copy, duplicate monitor summaries, or synthetic collector evidence while moving persistence ownership.
- Anti-AI-slop: collector assignment must come only from the explicit submitted collector value and persisted monitor id; never infer collector assignment from entity, alert, topology, telemetry labels, or generated examples.
- Operator workflow clarity: legacy modify clients keep the same delete-then-save collector binding behavior, but collector-bind persistence is now a visible write-model call.
- Context visibility: submitted monitor id, collector value, updated job id, collector bind replacement, monitor save, param save, and rollback cancellation remain visible through service contracts.

## 2026-05-10 Old Monitor Collector Bind Add Boundary

- Hierarchy: old monitor create should keep id allocation, job creation, detect, monitor save, param save, and dashboard creation in `MonitorServiceImpl`, while collector bind creation routes through the collector-bind write-model boundary.
- Density: do not add creation previews, collector cards, response wrappers, helper copy, duplicate monitor summaries, or synthetic collector evidence while moving persistence ownership.
- Anti-AI-slop: collector assignment must come only from the explicit submitted collector value and newly allocated monitor id; never infer collector assignment from entity, alert, topology, telemetry labels, or generated examples.
- Operator workflow clarity: legacy add clients keep the same optional collector binding behavior, but the code now makes collector-bind persistence a dedicated write-model action.
- Context visibility: allocated monitor id, submitted collector, created job id, collector bind creation, monitor save, param save, dashboard creation, and rollback cancellation remain visible through service contracts.

## 2026-05-10 Old Monitor Collector Bind Query Boundary

- Hierarchy: old monitor detail, resume, and template-refresh flows should keep DTO assembly and job orchestration in `MonitorServiceImpl`, while collector-bind lookup routes through a dedicated query boundary.
- Density: do not add detail panels, collector cards, response wrappers, helper copy, duplicate monitor summaries, or synthetic collector evidence while moving read ownership.
- Anti-AI-slop: collector evidence must come only from persisted collector-bind rows for explicit monitor ids; never infer collector assignment from entity, alert, topology, telemetry labels, or generated examples.
- Operator workflow clarity: legacy detail and management clients keep the same collector values and pinned collector job behavior, but the raw collector-bind read path is now visible and reusable.
- Context visibility: monitor id, monitor id set, persisted collector bind rows, detail collector value, resume collector value, template-refresh collector map, and scheduler handoff remain visible through service contracts.

## 2026-05-10 Old Monitor Export-All Catalog Query Boundary

- Hierarchy: old monitor export-all should keep HTTP export orchestration in `MonitorServiceImpl`, while full catalog id selection belongs to the old monitor catalog query boundary.
- Density: do not add export previews, response wrappers, duplicate monitor summaries, helper copy, synthetic counts, or alternate export screens while moving query ownership.
- Anti-AI-slop: exported ids must come only from persisted old monitor catalog rows; never infer export scope from entity, alert, topology, telemetry, labels, or generated examples.
- Operator workflow clarity: legacy export-all clients keep the same type/response behavior, but the full-id read path is now visible as a catalog query contract.
- Context visibility: export type, persisted monitor ids, catalog query owner, export helper call, and response handoff remain visible through service contracts.

## 2026-05-10 Old Monitor Validation Name Query Boundary

- Hierarchy: old monitor validation should keep request normalization and parameter checks in `MonitorServiceImpl`, while persisted name lookup belongs to the old monitor catalog query boundary.
- Density: do not add editor panels, inline helper copy, duplicate warnings, alternate response wrappers, or synthetic uniqueness evidence while moving query ownership.
- Anti-AI-slop: name conflict evidence must come only from explicit submitted monitor names and persisted old monitor catalog rows; never infer conflicts from labels, entities, alerts, topology, telemetry, or generated examples.
- Operator workflow clarity: legacy create/edit validation keeps the same error messages and modify semantics, but the raw catalog-name lookup is now a visible query contract.
- Context visibility: submitted name, modify flag, existing monitor row, app-definition name guard, param validation, and collector validation remain visible through service contracts.

## 2026-05-10 Old Monitor Detail Copy Modify Catalog Lookup Boundary

- Hierarchy: old monitor detail, copy, modify, and simple lookup flows should keep DTO assembly, copy construction, scheduler orchestration, and legacy errors in `MonitorServiceImpl`, while persisted monitor-row lookup belongs to the old monitor catalog query boundary.
- Density: do not add detail panels, copy previews, duplicate monitor summaries, helper copy, alternate response wrappers, or synthetic monitor evidence while moving lookup ownership.
- Anti-AI-slop: monitor evidence must come only from explicit monitor ids and persisted old monitor catalog rows; never infer source monitors from entities, alerts, topology, telemetry labels, or generated examples.
- Operator workflow clarity: legacy detail, copy, modify, and get-monitor clients keep the same null/not-found behavior, app-type guard, copy naming, and scheduler side effects, but raw catalog lookup is now a visible query contract.
- Context visibility: submitted monitor id, persisted source row, not-found branch, detail DTO assembly, copy parameters, app-type compatibility guard, and scheduler handoff remain visible through service contracts.

## 2026-05-10 Old Monitor Alert Bind Delete Cleanup Boundary

- Hierarchy: old monitor delete should keep monitor-row selection, downstream cleanup ordering, scheduler cancellation, and event emission in `MonitorServiceImpl`, while alert-definition bind cleanup belongs to a dedicated write-model boundary.
- Density: do not add delete previews, alert cards, duplicate monitor summaries, helper copy, alternate response wrappers, or synthetic alert evidence while moving cleanup ownership.
- Anti-AI-slop: alert-bind cleanup must come only from persisted monitors selected for deletion; never infer alert cleanup scope from entity context, telemetry, topology, labels, or generated examples.
- Operator workflow clarity: legacy delete clients keep the same monitor/alert cleanup behavior, but raw alert bind persistence is now isolated from old monitor orchestration.
- Context visibility: expanded monitor ids, persisted monitor rows, alert-bind cleanup, parameter cleanup, entity bind cleanup, collector cleanup, scheduler cancellation, and delete events remain visible through service contracts.
