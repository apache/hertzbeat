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
