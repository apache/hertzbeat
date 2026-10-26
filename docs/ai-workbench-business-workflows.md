# AI workbench business workflows (alpha)

The workbench discovers named, typed HertzBeat business operations. It is not a
shell, Python executor, arbitrary SQL console or arbitrary HTTP forwarding tool.
Tool registration alone does not establish native API parity or prove that an
operation completed.

## Execution and approval

An authenticated request creates a durable run. Planning and target review bind
the requested operation to a bounded resource set. A change proposal displays
its saved parameters and targets before an authorized human decides. Execution
rechecks current permissions, consumes approval once, calls the native service
and independently reads back the result. Changing a target or parameter requires
a new proposal. Cancellation and expiry do not authorize a late execution.

The approval route permits authenticated `admin,user` roles so a user can reach
an approval decision endpoint for their own permitted CHANGE. This route policy
originates in the initial platform-coverage commit; it does not grant operation
permission by itself. The ledger rechecks the original owner/workspace, current
account roles and resource access; DANGEROUS and ADMIN resources remain
administrator-only. Foreign-owner, role-downgrade and missing-verifier cases fail
closed. The source configuration copies stay aligned; no deployed security
configuration is changed during validation.

Read-only operations still require their native resource permissions. The
session-scoped full-access mode can waive ordinary change confirmations only
within the existing actor's permissions; enabling it requires the server's
five-second challenge and an explicit human decision. It cannot elevate roles
or waive command-collection approval. Model output and external content cannot
enable permission modes or approve a proposal.

Reopening a conversation can restore its pending approval. Cancelling a proposal
and revising it cancels the current run and fills a draft; it does not silently
send a replacement request. Terminal snapshots clear active observation warnings.
Unknown execution outcomes require reconciliation before a retry.

## Website batches

A request such as “Choose 50 public domains and create website monitors” can
delegate target selection. The planner obtains a bounded host-only projection of
the caller-visible existing website monitors, excludes duplicates, and retains
valid candidates across bounded revisions. It does not substitute different
targets when the user explicitly supplied them. A full immutable plan must be
reviewed before creation; there is no unapproved network probe during planning.

The native batch service bounds items, concurrency and execution time, records
per-item progress, and binds idempotency to the normalized input. A same-key,
different-input replay is rejected. Successful creation requires native ID and
configuration readback; a timeout or missing readback is not a successful or
definitely-unexecuted item. A stopped batch does not start queued work after its
deadline. Progress is based on actual item states, not estimated elapsed time.

Current HTTP availability is separate from successful monitor creation. A
persisted monitor can report an unhealthy endpoint. Receipts distinguish
creation proof from health proof, and preserve partial failures and unknowns.

## Supported surface and deliberate limits

Typed adapters cover monitoring, alert configuration, notification configuration,
status pages, saved views, dashboards, entities and cross-signal investigation,
with native validation and bounded evidence. This does **not** mean that all
business routes or compound input/output semantics have complete AI parity.
In particular, exact schedule get-by-ID, some compound filters and streaming or
file-oriented operations need further work. Credential entry stays in the native
workflow; no generic authenticated proxy is supplied as a fallback.

The Agent tools `entity.create`, `entity.update` and `entity.delete` are excluded
at registration. The original annotated Java methods remain compiled, but cannot
be discovered or resolved through the registry, including an execution request
carrying a prior approval ID. The newer unfinished metadata-write experiment is
removed; neither version is enabled Agent behavior. Four dedicated exclusion
tests cover registration/discovery, preserved reads, direct execution and the
approval-resume execution boundary. The latter is not a cross-process database
recovery simulation. Native Entity UI/API remains unchanged; other
Entity operations are not thereby declared read-only or independently audited.
Native atomic version preconditions and durable create recovery are prerequisites
for reconsidering these tools.

Command-based collection is a separate, narrowly controlled native operation:
the final rendered command, target, template version and scope require human
approval even in full-access mode. Unsupported dynamic or remote execution
contexts fail closed rather than treating an approval as a general code license.

## Database compatibility

The default H2 dependency is updated from 2.2.224 to 2.3.232. Concurrent MySQL-mode
identity inserts previously produced parameter primary-key conflicts in isolated
reproduction; the candidate driver passed repeated synthetic concurrency and
transaction rollback checks. This does not replace testing other supported
databases or their deployment-specific concurrency behavior.

Before opening an existing H2 database with the new driver, stop its owner and
take a consistent, restorable backup. Validate a separate copy first. Retain the
old driver with the old backup; do not downgrade an upgraded live file in place.
Fresh installations use the B201 baseline. Existing V200 schemas receive the
additive V201 migration for permission state/audit, batch receipts and batch-run
parent/segment constraints. Permission tables start empty: upgrading grants no
session additional authority. Historical migrations remain unchanged. H2 fresh
installation and V200 upgrade are exercised locally; MySQL/PostgreSQL scripts
and their integration tests still require their respective database CI jobs.
The running development service and its database were not modified while
preparing these source changes.

## Validation boundaries

Tests include HTTP/SSE model substitutes, temporary H2 transactions, approval
recovery, cancellation/expiry, exact-input replay, batch partial failure and
readback. Synthetic tests are not live-model acceptance.

A separate development smoke using a configured provider created 50 distinct
new website monitors with native readback and zero failed/pending/unknown items.
The observed 38.113-second request included human approval; it is a single local
observation, not a throughput SLO or a claim that every generated site is healthy.
No new bulk data creation is required for reviewing this PR. Desktop approval
recovery, cancellation and run-detail keyboard actions were inspected separately;
mobile acceptance and comprehensive tool-by-tool browser acceptance remain open.

External notification delivery, external Grafana mutations, destructive actions
and experimental Entity CRUD do not have live end-to-end acceptance here. A
previous OTLP read-only final-completion scenario needs targeted revalidation.

Provider retry countdown, provider-error presentation and configurable
timeout/backoff improvements are being reviewed independently in PR #4496;
they are not imported or duplicated here.

## Reproducible production UI proof

Run `pnpm build && pnpm budget && pnpm test:browser:ai` in `web-app` after
installing the pinned dependencies and Playwright Chromium. The AI-only config
uses strict loopback port 4289, synthetic HTTP responses and a fresh browser
profile. It covers 401-message pagination, bounded/partial evidence, bootstrap
and foreground session recovery, rejected refresh, Web Lock admission timeout
and retry, and the five production locale catalogs. It does not call a provider,
use existing browser tabs, or create monitors. The broader `playwright.config.ts` references
`scripts/browser/live-log-sse-fixture.mjs`, which is absent in this source
snapshot. Broader browser smoke is not claimed; the AI-specific command above
is independently reproducible.

Locale compilation shares repeated source-owned keys/text across catalogs;
it does not remove translations, change their nested values, or move payloads
outside JavaScript budget accounting. The dictionary is immutable and stable
for the lifetime of a build/watch plugin instance. Development HMR retains
Vite's regular JSON path.
