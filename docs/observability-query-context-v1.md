# Observability Query Context v1

This document freezes the optional query context shared by the Metrics, Logs, and Traces operator
APIs. It is separate from the application instrumentation v1 catalog, render, and detection
contract; that contract remains unchanged.

## Context hierarchy

Queries narrow data in this order:

`Collector -> service.name -> service.namespace -> deployment.environment.name -> instance -> endpoint`

Each supplied dimension is an exact additional constraint. A row, series, log record, or span that
does not carry a supplied dimension does not match. An implementation must return an honest empty
result instead of falling back to the broader service context.

## Frozen fields

| Query field | Meaning | Metrics | Logs | Traces |
| --- | --- | --- | --- | --- |
| `instance` | OTel Resource `service.instance.id` | data-point label `service_instance_id` | Resource `service.instance.id` | Resource `service.instance.id` |
| `endpoint` | Low-cardinality HTTP route template | data-point label `http_route` | LogRecord attribute `http.route` | Span attribute `http.route` |

`endpoint` is a route template such as `/checkout`. It excludes the HTTP method, query string,
fragment, and concrete URL. Values such as `POST /checkout` and `/checkout?order=42` are invalid.
RPC method, messaging destination, and database operation meanings are not overloaded into this
field. Supporting those protocols requires new versioned fields.

The dedicated fields cannot compete with the same key in a free-form resource, attribute, or metric
filter. Such a request is rejected instead of silently applying ambiguous constraints.

## API coverage

- Metrics console request and returned context.
- Historical log list, surrounding context, overview, trace coverage, trend, and group-by queries.
- Live log SSE filtering.
- Trace list, overview, and group-by queries. Trace detail and span endpoints already address an
  exact trace identifier and do not add these discovery filters.

Storage access remains behind the existing query services and storage adapters. Controllers only
bind the HTTP parameters and construct the storage-neutral context; they contain no database query
language or storage-specific SQL.

## Compatibility

These fields are optional additions to the existing query APIs. Omitting both retains the prior
behavior. Changing either field's semantic mapping, accepting an HTTP method in `endpoint`, or
reusing `endpoint` for a non-HTTP protocol requires a new contract version.
