# HertzBeat 2.0 Release Readiness Brief

Local parity brief for M8 deployment/release pipeline work. Keep this local unless the user asks to commit or publish docs.

## 2026-05-13 Release Gateway And Checklist Boundary

- Hierarchy: release ingress must preserve the same operator entry hierarchy available in dev: overview, monitors, entities, OTLP ingestion, logs, traces, alerts, topology, settings, and static Next assets route to `web-next`; API and legacy fallbacks route to the Spring backend.
- Density: gateway rules should stay compact and path-prefix based. Avoid per-page sprawl when a route family can be represented by one prefix.
- Anti-AI-slop: do not invent Helm, Kustomize, SaaS packaging, hosted control-plane assumptions, or vanity release docs. Validate only concrete local artifacts: Dockerfile, compose, nginx gateway, CI workflow, package scripts, and executable release gates.
- Operator clarity: a private deployment should open the same signed-in operator routes after promotion or rollback; compose config checks must validate release and rollback versions without pulling images or starting containers.
- Context visibility: release version, rollback version, backend image, web-next image, gateway route ownership, and budget/checklist gate names must remain visible in machine-readable scripts and tests.
