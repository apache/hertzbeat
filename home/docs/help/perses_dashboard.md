---
id: perses_dashboard
title: Perses dashboards (2.0 alpha)
sidebar_label: Dashboards
keywords: [HertzBeat, Perses, dashboard, metrics, logs, traces]
---

HertzBeat 2.0 alpha embeds a restricted Perses dashboard editor and renderer. Open **Application observability → Dashboards** (`/observability/dashboards`). Dashboards are shared across the installation; accounts with write access can change or delete them. Guest accounts can inspect them.

No separate Perses server is required. Panels query HertzBeat's configured signal storage. A saved document contains query definitions and layout, not copied result rows. This alpha does not accept arbitrary Perses plugins, external data sources, or SQL.

## Create and inspect a dashboard

1. Select **New dashboard** and enter a dashboard name.
2. Select **Add panel**, choose its type, and enter its query fields. Metric panels need an actual stored metric name; a trace waterfall needs an actual Trace ID.
3. Expand **Query context** to constrain the service, namespace, environment, or other supported identity fields.
4. Select a time range and press **Query** to preview the applied definitions. Invalid definitions or an invalid explicit time window block execution.
5. Select **Save** to persist the document. **Cancel** discards the local draft without saving. Reloading the browser also discards an unsaved draft.

Select a panel to edit its title, type, query, and layout. Nonprimary document options are under **Dashboard settings**: description, ID, default duration, auto refresh, time zone, and variable definitions. Changing between metric, raw-log, and trace tables retains compatible query context but resets type-specific filters. Analytical log panels keep their type and complete query: use **Open in Explore** to change the analysis; title, layout and shared service context remain editable. A waterfall uses a fixed Trace ID and does not inherit service context.

Move or resize panels with the grid controls, or use the numeric **Column**, **Row**, **Width**, and **Height** fields with a keyboard. Overlapping or out-of-bounds layouts cannot be saved. A narrow viewport stacks the panels for reading without rewriting the stored desktop layout.

Each panel loads independently. **Refresh** reruns a ready panel, **Cancel** is available while it loads, and **Retry panel** recovers a failed or canceled panel; cancellation and errors in one panel do not turn other panels into failures. A valid empty result means no matching data was returned. Permission, storage, invalid-query, and rendering failures have separate messages. Truncation, bounded coverage, and unknown coverage remain visible; a displayed table is not necessarily the complete time window.

## Supported three-signal views

A metric panel can retain an Explore composition: up to four source queries and four arithmetic formulas, including each source's metric, supported label filters, aggregation, grouping, temporal mode and step. Edit these definitions in the panel draft; **Cancel** performs no write. Chart, table, split and output visibility are supported. Split ranking uses the selected output's mean of returned samples; an empty or failed source does not replace a working sibling with zero data. Exact label/timestamp alignment and missing-value gaps follow the [Explore rules](./explore_saved_queries.md#metrics-select-combine-and-interpret).

Metric panel types include **TimeSeriesChart**, **StatChart**, **GaugeChart** and **Table**. Stat and Gauge show the latest returned values for each series; Gauge requires an explicit positive maximum. Their numeric display does not imply known or comparable sample units. A narrow panel may scroll horizontally to reveal additional series, including by keyboard. The controlled source query and exact time window remain available through **Open Explore**.

Log panels retain supported message, severity, correlation and resource/attribute predicates, newest/oldest ordering, column order, density and wrapping. Columns are display settings, not new backend fields. A Dashboard table is read-only: it does not offer a disabled action where no detail handler exists. Use **Open in Explore** for a full inspection workflow.

Trace tables can show matching traces, matching spans, or grouped counts for the chosen population. Grouping supports service, operation or environment. Span durations remain span durations; group membership and bounded coverage retain their limits. These are not complete service RED metrics. A waterfall remains a fixed-trace visualization.

Analytical log panels support Table, Toplist and Timeseries, including numeric measures, grouping, exact group selections, additional table measures, comparison sources, formulas and fixed time shifts. Table and Toplist use `LogsTable`; Timeseries uses `TimeSeriesChart`. The selected Dashboard window and declared service variables apply to the controlled query. Matching totals, truncation and comparison windows remain visible; expand **Analysis details** for calculation limits. Missing measurements remain unavailable rather than becoming zero.

The document and **Open in Explore** preserve the supported query and display contract. An unsupported query is rejected rather than partially converted. Live streams cannot be saved as historical Dashboard panels. The shared runtime time window and permissions apply to every panel.

## Time and variables

The shared Query controls apply one time window to all panels. Available default durations are 15 minutes, 30 minutes, 1 hour, 6 hours, and 24 hours. Optional auto refresh is off, 30 seconds, or 1 minute. A fixed investigation window remains fixed when refreshed; choose a preset and press **Query** to return to a rolling range.

Supported variables are `serviceName`, `serviceNamespace`, and `environment`. Each is either a text value or a single selection from static options. Set a variable's default under **Dashboard settings**, then bind the corresponding panel context field to its complete placeholder, such as `${serviceName}`. Adding a variable does not rewrite existing panel queries automatically. Empty text overrides remove only that matching context predicate; other predicates remain in effect.

Variable values are staged until **Query**. A pinned trace waterfall keeps its Trace ID when variables change. The query definitions contain no persisted `timeWindow`; the runtime supplies the current shared window. The document stores its default duration and optional time zone, while an investigation link can carry an exact window and variable overrides.

## Move between Explore and a dashboard

From an applied, supported [Explore query](./explore_saved_queries.md), choose **Add to dashboard**, then choose an existing dashboard or create a new one. The panel is added to a local draft; inspect it and select **Save** to persist it. **Cancel** leaves the saved dashboard unchanged. Unsupported Explore conditions are rejected rather than silently removed.

A panel's **Open Explore** action carries its supported query conditions and fixed investigation window. **Back to dashboard** restores that view. A focused trace becomes a fixed waterfall, so its original filtering context is retained in the return link rather than represented as variable filters on the fixed trace.

## Save, copy, and concurrent edits

**Edit dashboard** updates the same document. **Copy dashboard** creates a local draft with a new ID. A failed save retains the input and reuses the same draft ID on retry.

Updates and deletes use the saved revision. If another writer changes the document, a conflict keeps your local draft. Use **Reload current revision** to inspect the latest saved content; confirm before discarding the local draft. A conflict does not authorize overwriting somebody else's revision.

## Import, export, and older records

**Export document** downloads the supported standard Perses JSON. **Import dashboard** accepts JSON text or a file, validates the entire restricted document, and opens a local draft. **Import as a copy with a new ID** avoids replacing an existing identity. Import does not automatically save.

[Download the four-panel example](/examples/service-diagnostics-dashboard.json). It is an illustrative document with no embedded telemetry. Replace `checkout-api`, `shop`, and `production` with your real resource values, verify the metric name, and replace the placeholder Trace ID before expecting waterfall data. Importing the example does not install instrumentation or create a service entity.

Unsupported documents and populated legacy layouts remain inspectable through **Export original**. Only a recognized empty legacy dashboard with losslessly representable metadata can use **Upgrade empty dashboard**. Save that exact empty conversion before editing it. Original fragments are retained; unsupported populated layouts are not automatically migrated.

## Supported document contract

| Area | Accepted subset |
|---|---|
| Resource | `kind: Dashboard`; `metadata.project: hertzbeat`; `metadata.name` is 1–75 letters, digits, `_`, `.`, or `-` |
| Panels | Up to 24 `Panel` definitions; one query per panel |
| Visual plugins | `TimeSeriesChart`, `StatChart`, `GaugeChart`, `Table`, `LogsTable`, `TraceTable`, `TracingGanttChart` |
| Query plugins | `HertzBeatTimeSeriesQuery`, `HertzBeatLogQuery`, `HertzBeatTraceQuery`; `spec.version: 1` |
| Layout | One 24-column `Grid`; every panel referenced exactly once; no overlap |
| Variables | At most the three names above; `TextVariable` or `ListVariable` with the standard `StaticListVariable` plugin |
| Query limits | At most 24 hours; up to 32 metric series and 1,200 points per series; table limit up to 1,000 |
| Storage and upload | Compact document JSON at most 65,535 UTF-8 bytes; uploaded JSON text at most 256 KiB, allowing formatting whitespace |

Unknown fields and unsupported options are rejected. Accepted text is not silently trimmed or templated. Variable substitution is allowed only as the full value of the matching supported context field; arbitrary interpolation is unsupported. Analytical search text and exact group values are literal data, even when they contain placeholder-like characters.

The additional scalar/table plugins accept only the supported HertzBeat time-series query. Other Perses datasource/panel pairings and Datadog's full widget options, graph inspection, public sharing and scheduled sharing remain outside this alpha subset.

A metric operation filter is a supported metric-label predicate. If a JVM metric does not have the matching operation label, an empty result is valid; this does not mean the metric query API rejects all operation filters.
