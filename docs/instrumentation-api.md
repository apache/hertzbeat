# Application Instrumentation API

HertzBeat exposes one public application-instrumentation route family. The
paths are unversioned; internal implementation package names are not alternate
API surfaces. Every response uses the ordinary HertzBeat `Message<T>` envelope.

## Public endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/instrumentation/catalog` | Discover source groups, sources, and selectable recipes |
| `GET` | `/api/instrumentation/intake-profiles` | Discover non-secret OTLP intake destinations and transport requirements |
| `POST` | `/api/instrumentation/render` | Render structured onboarding blocks for a recipe and intake profile |
| `POST` | `/api/instrumentation/detect` | Detect scoped Metrics, Logs, and Traces reception |

There are no public path-version aliases. Clients must not prepend a version
segment or construct paths from implementation class or package names.

## Authorization

Catalog and intake-profile discovery are available to `admin`, `user`, and
`guest` roles. Rendering and detection require `admin` or `user`. Shipped
Sureness configurations enumerate the four paths explicitly so authorization
does not imply a second route family.

## Wire compatibility

The existing `schemaVersion` field remains part of the request and response
payloads. It is a payload compatibility guard, not a URL version. This contract
does not add, remove, or rename any wire field or enum value.

- Catalog data contains `schemaVersion`, `groups`, `sources`, and `recipes`.
- Intake-profile discovery returns explicit non-secret destinations,
  transports, authentication requirements, and availability state.
- Render requests select a source or recipe, environment, platform, intake
  profile, and service identity. Responses contain structured blocks and
  declared secret placeholders; no token value is returned.
- Detection requests carry the same selection and identity scope plus
  `startedAt`. Responses distinguish `waiting`, `received`, `unsupported`,
  `unavailable`, and `error`, and return bounded polling and typed query-jump
  context.

Clients should consume server-provided catalog choices and intake profiles
rather than inventing endpoints, package coordinates, health states, or signal
support. Unknown or unavailable data must remain distinguishable from healthy
or zero-valued data.

## Observation and troubleshooting

Detection is a bounded observation, not a liveness monitor. The current service
queries the selected identity within the fixed 120-second window beginning at
`startedAt`. Automatic polling ends when supported signals have arrived or the
window reaches its deadline; unavailable and failed queries require an explicit
retry. Check each signal independently: partial reception must not become an
all-signals success.

A `received` result reports evidence in that window. It does not mean an emitter
is still running. Start a new check after stopping an application; old data stays
queryable. Distinguish an unsupported catalog signal from an empty observation,
a store that cannot answer and a failed query. Inspect actual exporter HTTP/gRPC
errors for rejected credentials; absence of data alone is not proof of an
authentication failure.

The alpha's real reference checks use Agentless MySQL and an official Java
OpenTelemetry agent. The catalog remains the authority for other recipes and
per-signal maturity. Never infer validation of every runtime or platform from a
catalog entry. Application identity resolution is conservative: unrelated
service names must not inherit an Entity merely because namespace/environment
match. Signals without resolved Entity identity remain directly queryable.
