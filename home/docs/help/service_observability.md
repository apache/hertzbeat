---
id: service_observability
title: Service observability (2.0 alpha)
sidebar_label: Services
keywords: [HertzBeat, services, RED, traces, observability]
---

Open **Application observability → Services** (`/observability/services`) to inspect registered service entities and their observed signals. An empty directory means no registered services matched the catalog filters. Telemetry can still exist without an entity: use the direct **Explore** entry to query it by service, namespace, environment, and time.

## Investigate a service

1. Filter the directory by name or catalog environment and select a service.
2. Select an investigation time range and press **Query**. Signal reads use a bounded absolute window of at most 24 hours.
3. Inspect the service identity, request RED, observed root trace operations, and existing associations.
4. Choose an operation's **Error traces** action to investigate its failing root traces. Open a trace, then its related logs when correlation exists.
5. Use **Back to results**, then **Back to services** to return through the investigation. The service, environment, operation selection, error filter, and absolute window are retained.

Identity details, RED, operations, and trace observation time load independently. A failure in one section does not fabricate zero values or mark the service healthy. A malformed explicit window remains invalid until you choose a valid preset and press **Query**.

## Read the evidence correctly

| Evidence | Meaning and boundary |
|---|---|
| Catalog source | Origin recorded on the entity; not a statement about the current OTLP transport |
| Last observed trace in window | Historical Trace observation in this service scope and window; not a liveness guarantee |
| Request RED | Service-wide Greptime Flow aggregation of observed SERVER spans in 60-second buckets |
| Observed root trace operations | Up to 20 operation groups, ordered by error trace count; root-trace evidence rather than an exhaustive request inventory |
| Existing associations | Current monitor-linked alerts and up to 50 registered relation previews; not complete inferred dependencies or a historical-window snapshot |

RED is available only when the configured warehouse and identity support this evidence. Request rate, error rate, and latency use the observed Flow data. Minute buckets are selected by their start timestamp; an unaligned investigation window includes whole selected buckets. Sampling completeness is unknown. P95 is approximate and can be unavailable. Missing latency is not zero.

RED remains **service-wide** when an operation is selected. A downstream service can have SERVER-span RED even when it has no root operation groups. A catalog metadata timestamp is not substituted for the last observed Trace time.

## Choose the right signal entry

**Open traces** uses service scope and root spans. An operation action additionally applies the exact operation name; **Error traces** also applies the error condition. Trace ordering and coverage are described in [Explore and saved queries](./explore_saved_queries.md).

**Open service logs** carries service scope and the absolute window. It does not pretend that logs have the same operation/error predicates as the Trace API. To inspect logs belonging to an operation, start with its traces and follow a specific trace's correlated log entry.

**Open metrics** carries the supported service investigation context. A valid query can return no data when the emitted metric lacks the requested labels. Missing or unsupported RED does not turn arbitrary JVM metrics into request RED.

**Open entity evidence** shows the existing entity detail and its registered associations. No linked alerts or relation previews means no evidence in that particular view, not that the service has no alerts or dependencies anywhere.

## Missing data and unresolved identity

Check the selected time, service namespace, environment, and instance predicates before broadening a query. Read errors and permission failures require their own correction; they are not empty results. The frontend keeps unavailable, empty, loading, and failed states distinct.

Resource identity can remain unresolved while its logs, metrics, and traces are queryable directly. Namespace or environment alone does not identify a service entity. Use **Explore** for unresolved resources instead of assigning an unrelated entity to make the catalog appear complete.
