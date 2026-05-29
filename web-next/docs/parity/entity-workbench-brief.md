# Entity Workbench Brief

Local-only parity note for milestone 7.

## 2026-05-13 Entity-Centered Workbench Boundary

- Hierarchy: entity detail should lead with resource identity, inherited time/source context, and real evidence totals, then branch into metrics, logs, traces, alerts, topology, monitor binding, and definition actions. Cross-signal cards must be handoffs from the entity evidence model, not standalone demo panels.
- Density: keep the cold operator surface compact and scannable. Prefer evidence rows, links, and counters over explanatory banners, marketing copy, large empty cards, or repeated hero blocks.
- Anti-AI-slop: never show fabricated zero panels, synthetic health, guessed RED/USE, fake topology, or placeholder trace/log/alert evidence to make the page feel complete. Missing evidence must stay explicit and actionable.
- Operator workflow clarity: an operator should see which entity is being investigated, which time/source context is inherited, what evidence exists, and where each drilldown will land before leaving the page.
- Context visibility: entity id/name, service, namespace, environment, time range, monitor/source context, trace/span context, alert state, topology target, and monitor/template binding must remain visible in data attributes, URLs, or read-model rows for contract tests and browser smoke.

## 2026-05-13 Explicit Entity Evidence Boundary

- Hierarchy: when ingestion already carries `hertzbeat.entity_id`, entity detail should trust that explicit resource attribution as real evidence even if canonical OTEL identity fields are incomplete.
- Density: explicit-ID evidence should flow into the same compact RED/USE counters and rows; do not add a separate diagnostic panel just to explain the fallback.
- Anti-AI-slop: do not fabricate service/namespace/environment values from the entity id. Keep missing canonical context blank/unknown while preserving the signal count.
- Operator workflow clarity: the entity workbench should not appear empty after the ingestion layer has resolved an entity id; real metrics/logs/traces must remain drillable.
- Context visibility: explicit `hertzbeat.entity_id` and `hertzbeat_workspace_id`/`hertzbeat.workspace_id` must be preserved in resource/read-model maps so tests can distinguish real entity attribution from guessed identity matching.

## 2026-05-13 OTLP Candidate Entity Boundary

- Hierarchy: OTLP intake should distinguish confirmed bound entities from unbound telemetry identities, then route unbound identities toward entity discovery instead of making operators infer candidates from raw samples.
- Density: show a short, capped candidate list with service, namespace/environment, signal coverage, and primary identity; do not create a large second dashboard.
- Anti-AI-slop: candidates are suggestions, not entities. Do not invent health, owners, topology, monitor binds, or generated descriptions before an operator confirms them.
- Operator workflow clarity: a newly reporting service with real OTLP evidence should have an obvious "candidate entity" handoff even when no HertzBeat entity exists yet.
- Context visibility: candidate rows must preserve canonical identities and signal names in backend DTOs/data attributes so contracts can verify that candidates are derived from telemetry, not from static examples.

## 2026-05-13 Discovery Confirmation Boundary

- Hierarchy: `/entities/discovery` must preserve OTLP candidate identity context from the intake handoff before any monitor-search result, so the operator knows which telemetry identity is being confirmed.
- Density: keep the handoff as a compact strip above search/policy/table controls; avoid a second hero, wizard, or explanatory right rail.
- Anti-AI-slop: candidate handoff may prefill search and carry identity context, but must not create an entity, assign ownership, infer health, or claim topology until the operator confirms.
- Operator workflow clarity: the page should offer explicit search/confirm/create-draft actions for the candidate while leaving normal discovery search intact.
- Context visibility: `identityKey`, `identityValue`, `serviceName`, `serviceNamespace`, and `environment` from the URL must survive in data attributes and action URLs for tests and browser smoke.

## 2026-05-13 Candidate Draft Boundary

- Hierarchy: `/entities/new?source=otlp-candidate...` should open a prefilled entity draft from the confirmed OTLP candidate identity, then require the operator to save before catalog state changes.
- Density: reuse the existing cold entity composer and telemetry handoff panel; do not add a wizard, modal, or duplicate discovery hero for this narrow handoff.
- Anti-AI-slop: the draft may seed type, name, display name, namespace, environment, source, and identities, but must not fabricate owner, monitor binds, health, topology, or relations.
- Operator workflow clarity: the draft should make it obvious that the source is telemetry discovery and that identity evidence is present even when no traditional monitor bind exists.
- Context visibility: `source=otlp-candidate`, `identityKey`, `identityValue`, `serviceName`, `serviceNamespace`, and `environment` must survive the route seed, cache key, draft payload, attribution panel, and return link.

## 2026-05-13 Evidence Handoff Boundary

- Hierarchy: entity detail should expose alert, topology, and runbook handoffs only after the unified evidence/read model has shown real entity context; handoffs are investigation exits, not standalone product cards.
- Density: use a compact action cluster with evidence labels and counts. Avoid a new hero, right rail, or repeated overview panel for these narrow operator exits.
- Anti-AI-slop: do not show active alert counts, topology targets, or runbook links unless the backend/entity model provides evidence. Missing evidence must not be padded with fake zero states.
- Operator workflow clarity: each handoff should name why it appears and where it will land so the operator can jump from an entity to alert evidence, topology context, or response guidance without losing investigation state.
- Context visibility: entity id/name, active alert count/status, topology relation target, runbook URL/title, time range, and source context must survive in data attributes or URLs for contract tests and browser smoke.
