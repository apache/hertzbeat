# HertzBeat 2.0 Alpha Release Checklist

This is a reproducible release checklist, not a claim that a public release has
been published. Scope is defined in [Alpha preview](alpha-preview.md). Keep the
release alpha/community preview until a separate release decision changes it.

## Freeze and build

- Record the canonical repository, branch, commit and any uncommitted source
  snapshot separately. Record Java 25, Node.js 22, pnpm 10, architecture,
  dependency lockfiles and build commands. A dirty local candidate is not a
  published canonical revision.
- Preserve the existing worktree and classify generated evidence, screenshots,
  runtime configuration, secrets and databases as local-only. Do not stage them
  with source changes.
- Run `pnpm verify` in `web-app`. This includes toolchain, architecture, i18n,
  formatting, lint, types, tests, production build, size and dead-code gates.
- Run focused Maven tests for every changed backend contract, including real
  H2/MySQL/PostgreSQL persistence when schema or mapping changes affect them.
  Then run `./mvnw -pl hertzbeat-startup -am -Prelease -DskipTests package`.
- Validate Server and applicable Collector distribution layouts. Test the
  actual launch scripts and exact archive selection; do not infer script or
  Docker behavior from a directly launched Java process.
- Build `home` in its configured English and Chinese locales. Run documentation
  link/navigation checks and both `git diff --check` and
  `git diff --cached --check`.
- Record the archive SHA-256, module JAR and embedded frontend hashes. Extract
  into a fresh directory. API and Browser evidence must identify this same
  immutable archive. Code changes after a freeze require a new build and
  validation of affected behavior; preserve previous evidence as a prior
  candidate rather than silently relabeling it.

## Installed workflows

| Workflow | Required evidence | Boundary to preserve |
| --- | --- | --- |
| Setup and restart | Fresh direct `/setup`, reload, administrator creation, login, configuration write/read, restart and authentication | No built-in password assumption; failed Setup does not report success |
| Three metadata profiles | H2, MySQL and PostgreSQL create/read/update/delete, six signal/time-mode saved queries, standard Dashboard document and revision | Read native UTF-8 TEXT; invalid records cannot be silently repaired or discarded |
| Backup and recovery | Database-native metadata backup/restore, private configuration and credential recovery, separate stopped Greptime backup/restore | No live directory copy, online/distributed backup or cross-alpha V200 checksum promise |
| Agentless MySQL | Detect, fresh collected values, stored history, connection failure and recovery | Use a declared real target and least-privilege collection account |
| Java OTLP | Official Java agent, first Metrics/Logs/Traces, fixed-window partial/no-data checks, actual rejected credentials, stop and fresh check, recovery | Catalog support is per recipe; received data is historical evidence |
| Service investigation | Service → observed anomalous operation → Trace → associated Logs → return/refresh | Retain service/environment/filters/absolute window; missing RED or identity is not zero/healthy |
| Trace pagination | Multiple pages for newest and duration; bounded fallback, error filters and missing root | Sorting precedes pagination; no snapshot isolation or complete-duration claim for partial roots |
| Saved queries | Save, reopen, update, save as, delete, relative/exact modes, failure/retry, refresh/restart, read-only role, legacy record | Save applied conditions; unsupported legacy remains exportable; shared existing roles |
| Perses Dashboard subset | Four actual panel kinds, local edit/cancel, copy/delete, layout, variable changes, uniform time, Explore add/back, conflicts, import/export and restart | Query bounds and strict subset; fixed waterfall remains pinned; download receipt differs from source-derived export roundtrip |
| Alert delivery | Real metric threshold crossing, persisted firing/resolved state and local receiver receipts | A send-test button alone is insufficient; repeated firing receipts are possible |
| AI read-only investigation | Actual bounded tool results, no data, refusal, timeout, Stop/Retry, isolation, durable replay and redaction | Label controlled protocol providers; do not infer external model quality or all-tools coverage |

Use stable role/attribute selectors for Browser checks and a production frontend
with the real backend. Screenshots should show the state being claimed, with
step notes and matching viewport for design comparison. Preserve failed attempts
and their cause or unresolved status; do not replace them with fabricated data.

## Review and closure

Run OCR file preview and rule resolution, then actually review changes and their
call chains, including new files and tests omitted by default filters. Run three
whole-repository Ponytail rounds in order: implementation and abstractions;
cross-module duplication and dependencies; then regression and remaining items
after fixes. Track credible high/medium findings through a failing proof, smallest
fix, focused verification and repeat review. Keep necessary authorization,
validation, cancellation and data provenance boundaries.

Before publication, deliver the change inventory, command results, artifact and
source provenance, evidence index, known limitations and remaining release-owner
checks. Remove only owned local test processes, load generators and temporary
containers; preserve private recovery artifacts under the stated retention plan.
No cloud resources, commits, pushes or publication are implied by local candidate
acceptance. Do not claim GA, scale performance, an SLO, all Native platforms or
competitive feature parity from this checklist.
