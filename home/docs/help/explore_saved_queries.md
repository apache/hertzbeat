---
id: explore_saved_queries
title: Explore and saved queries (2.0 alpha)
sidebar_label: Explore and saved queries
keywords: [HertzBeat, Explore, saved queries, logs, metrics, traces]
---

Open **Explore** (`/explore`) to query metrics, logs, or traces. The workbench follows one flow: select a signal, edit Query conditions, press **Query**, and inspect the results. Conditions staged in the controls do not silently replace the applied investigation.

## Query and follow evidence

Use the signal's supported filters together with service, namespace, environment, and time. Metrics require an actual stored metric name. Logs support search, severity, and correlation fields; traces support operation, error, span-scope, and duration filters. Keep the original absolute window when following a trace or related log so the evidence refers to the same investigation.

For trace lists, **Latest first** and **Root duration: longest first** request server ordering before pagination. Root duration is available only when the full observed chain has one identifiable root. A missing or ambiguous root is not replaced by a child-span duration or the observed width of the trace.

Read coverage alongside the rows. A full-window query, a bounded candidate set, a truncated result, and unknown coverage are different states. Older responses without coverage metadata remain unknown. Pages can change as late spans arrive; the list does not promise snapshot isolation.

Empty results mean no matching rows were returned for the applied query. An unavailable warehouse, permission error, invalid handoff, or failed request is reported separately. Correct an invalid explicit time window before querying; it is not silently replaced with a broader default.

## Query controls and recovery

**Query** applies the current draft. **Refresh** repeats the applied query; it does not submit unfinished filters. **Reset changes** restores the applied conditions without querying. Applied filter chips describe the executed scope. Removing a chip or using its clear action changes the corresponding supported predicate; do not assume it removes a bound resource identity.

The time picker supports relative presets and explicit start/end in the selected time zone, up to 24 hours. **Cancel** leaves the time unchanged. Applying time preserves other pending query edits. Following evidence fixes an absolute window so that a return or refresh refers to the same investigation.

For zero results, use **Review query** to return to the existing controls without changing or executing the query. Check the metric name or message, service scope, filters and time. A catalog search with no matching names has its own **Clear search** action. Permission, unavailable storage, failed refresh and empty results remain separate; a retry does not grant access. Retained rows after a failed refresh are marked stale and cannot supply new field-filter actions.

## Metrics: select, combine, and interpret

1. Select source row **a**, search the catalog of received metrics, and choose a name or enter one you already know. Selection updates the draft; press **Query** to execute it.
2. Constrain service/environment. The default **sum** combines matching series within retained identity; **avg** averages matching series. **Group by** keeps the chosen label as separate output series. These controls do not calculate percentiles.
3. Use source options for supported label matchers, raw/rate/increase/delta, and step. Temporal rate/increase/delta use the supported fixed five-minute interval. A count aggregation counts series, not business requests.
4. Add up to four sources and four formulas. Formula expressions support source letters, numeric constants, parentheses and basic `+`, `-`, `*`, `/` arithmetic, for example `a / b`. This is not an arbitrary PromQL editor. Deleting a referenced source leaves a visible invalid reference instead of silently retargeting it.
5. Inspect graph, table or split view. Split ordering uses the selected output's mean of returned numeric samples over the window; missing scores sort last. Hiding an output does not change the underlying query. Different units require care when reading a shared axis.

Formulas combine compatible returned label identities and timestamps. Missing operands, division by zero, or unmatched samples produce gaps rather than fabricated zeroes. One source can be empty or failed while another remains inspectable. Raw histogram buckets are not P95, and summing buckets is not a percentile calculation. Declared metadata does not establish sampling completeness or the unit of every transformed result.

The source controls also support bounded fixed time shifts, rollup and nested time aggregation. Review the displayed source window and returned bucket coverage before comparing shifted series. These controls apply to the selected stored metric and its supported labels; they do not provide arbitrary PromQL, forecasting or anomaly detection.

Each source retains the supported query limits. The encoded plan is limited to 6,000 URL characters, with formula expressions at most 256 characters. Unsupported or oversized saved plans require explicit correction/reset; they are not silently flattened into one metric.

## Logs: fields, facets, and nearby evidence

Choose **Text match** for a literal message search, or **Structured** for supported field predicates, Boolean grouping, ranges and wildcards. For example, `(@http.status_code:[500 TO 599] OR @event:timeout) AND -@name:skip*` combines alternatives and an exclusion. Field and value suggestions edit the draft; press **Query** to execute it. The syntax help describes the supported grammar.

Unsupported full-text, CIDR and path forms retain an explicit reason instead of becoming a wider query. Structured field names address exact stored keys; a dotted key does not imply recursive object traversal. Use the explicit collection steps described below for supported nested fields.

Resource and log-attribute filters remain separate scopes. Builder supports `=`, `!=`, `IN`, `NOT IN`, `CONTAINS`, `NOT CONTAINS`, `EXISTS`, and `NOT EXISTS`; these clauses combine with `AND`. For example, a resource condition can be `service.name = checkout`. Code mode preserves expressions that cannot be represented losslessly. Neither mode is an arbitrary SQL editor or a promise of Datadog's full query language.

The facet field inventory is bounded discovery (up to 1,000 inspected rows and 200 field names), not a complete schema. Value counts describe the applied window and predicates, with top-value truncation and missing values reported separately. An empty string is distinct from a missing field. Counts and actions remain unavailable when permission or evidence freshness prevents a safe query.

Choose up to eight columns, keep Message, and reorder the table without querying again. Log details lets you search original fields, inspect JSON, and add eligible fields as columns. Include/exclude changes the draft; press **Query** to apply it. Conflicting existing fields and bound service identity are not overwritten silently.

The severity counts beside **Log trend** summarize the applied result; they are not another filter control. Select a value in the left **Facets** area to stage a severity filter, then press **Query**. On a narrow screen, open **Add filters** to reach those controls. When the selected window contains only one time bucket, the trend reports that limit without drawing an empty graph.

**Nearby logs** is available only for a usable record ID. It uses the verified identity and absolute window while intentionally ignoring the original search, severity and exact-group predicates. Up to 25 earlier and 25 later records are shown; a notice that more exist is a limit disclosure, not a load-more button. Trace links require real correlation identifiers. Return actions preserve the original evidence context.

Historical results offer **Patterns**, **Transactions** and calculated fields. Patterns group the returned bounded sample by observed message shape; inspect original members before treating a pattern as representative of the whole window.
Transactions expand exact, non-empty stored identity values within the applied context and time window; see the [transaction rules](#investigate-related-logs-by-transaction-id). Calculated fields operate on the disclosed sample and preserve missing or invalid values as unavailable. These views do not expand the applied service or time scope and are not full-window anomaly findings.

## Correct a structured log query

For common syntax errors, the error message explains what to repair: a missing value, an unfinished range, an unclosed group or quote, or an unexpected token. Choose **Review query** to focus the submitted expression at the reported position. With comparison queries, **Review queries and shared filters** targets the failing source. It never changes the text or runs a query for you.

- `service:` needs a service value after the colon.
- `(status:ERROR` needs a closing `)`.
- `@duration:[1 TO ]` needs the second range endpoint.

Correct the expression, then choose **Query** again. If you have edited the draft since the failure, the action preserves your newer text and does not select an old error position. Live mode reports these errors during validation, before starting the stream. Older servers and errors without a reliable position continue to show the general filter guidance.

## First investigation: service errors to a trace

1. Open **Logs**, select a service and a time range, then select **ERROR** and press **Query**. The level selector uses severity categories; a source level such as Java `SEVERE` can belong to ERROR while the table preserves the original level.
2. Open a returned row. Inspect its message and fields. Use a field action to include a relevant value or exclude an irrelevant one, then press **Query**. Field actions stage changes; the old results remain visible until the new query succeeds.
3. Choose **Open trace** when the log contains a usable Trace ID. The investigation opens with the current effective absolute window. A missing or invalid ID is explained beside the disabled action. If results are stale, refresh them first.
4. A usable ID does not guarantee that its trace is stored. A missing trace is shown as missing evidence; it is not a healthy trace, and the interface cannot determine the cause from absence alone. Related logs are queried independently by Trace ID and time window, so stored logs can remain available when the trace is missing. Use **Return to results** to continue with the original filters and time window.
5. Once the query is applied, choose **Save query** and give the investigation a meaningful name. Reopen it from **Saved queries**. An unsaved draft must be applied or explicitly discarded before replacing the view.

If there are no matching errors, check the service and time window or remove the latest filter. A query failure is a separate state: review its reason and retry without interpreting it as zero errors.

## Logs: turn a result into an analysis

Start with a query that returns the logs you want to investigate. Then:

1. Choose **Table**, **Toplist** or **Timeseries**. These representations share the applied analysis conditions.
2. Choose what to **Show**: log count, average, minimum, maximum, unique count or an approximate percentile (P50/P75/P90/P95/P98/P99). For a numerical statistic, select the resource or log-attribute field that stores the number. **By** chooses the grouping field independently; leave it at all logs for one population.
3. Choose highest/lowest, the number of groups, and the minimum matching log count. Press **Query** after changing these conditions. The result continues to describe the previous applied query while edits are pending.
4. Read the statistic together with **Logs** and **Samples**. Counts describe all matching group members. Numerical samples include only finite native JSON numbers: the string `"503"` is not a numerical sample even if a supported search predicate can match it. Units are not inferred.
5. Select a group to inspect its logs. This adds an exact group filter and preserves the original search and absolute window. It shows all matching group members, including those excluded from a numerical statistic. **Back to log analysis** restores the parent analysis.

For example, a group with native numbers `500` and `599` plus string `"503"` has three logs, two numerical samples and an average of `549.5`. A group without numerical samples displays **No numeric samples**; a failed finite aggregation displays **Result is not finite**. Neither state means zero. Timeseries statistics use lines and retain a group summary with sample counts. One returned time bucket is shown as a group result instead of implying a trend. Brushing the chart applies the selected absolute time window.

Timeseries offers Auto or an explicit bucket interval from one second to one day. The result header reports the actual interval. Auto preserves the existing resolution rules; choosing an interval changes only the draft until you press Query. Table and Toplist retain the choice for returning to Timeseries.

A time window may cover at most 60 epoch-aligned buckets, including partial first and last buckets. An interval that would exceed this limit fails explicitly, even for an empty query. Choose a longer interval or a shorter time window. Use Auto changes the draft; press Query to apply it. Both comparison sources share the interval, and saved queries and drilldown returns preserve it.

Approximate percentiles use the native t-digest estimator with 100 centroids per aggregate. They are estimates, not exact ranks or a promised error bound. Each group and time bucket is calculated from its raw numeric samples; child percentiles are never averaged. Comparing two sources uses the same measure and the selected groups from query a.

Extreme numerical ranges or magnitude sums can make an estimate unsafe even when a mathematical percentile exists. The result then shows **Estimate unavailable for this numerical range**, retains the sample count, and supplies no value. Percentiles without numeric samples show **No numeric samples**. These states are not zero, and neither the centroid setting nor the output limits guarantee total query memory.

Unique count uses the stored scalar text identity. Native `2` and string `"2"` count as one distinct value; native `2.0` is a different stored representation. Empty strings and Booleans are included; missing fields, nulls, arrays and objects are excluded. Unique counts from separate time buckets are not additive. A full-window average is calculated from raw samples, not by averaging bucket averages.

Ranking happens over the complete authorized query window before the group limit is applied. Timeseries keep those selected groups and calculate each bucket from its raw records. Table and Timeseries support up to four distinct scalar grouping fields and one primary measure. Add, move or remove dimensions in the draft, then press **Query**. Each dimension has its own limit; their product cannot exceed 100.

Ranking follows the field order: select the first dimension, then rank children inside each selected parent. The output remains bounded to 100 leaf groups and 60 time buckets. Toplist supports one grouping field; changing the representation never silently discards extra dimensions.

A minimum-count filter or top-group limit does not change the displayed matching-log total. These output limits are not a throughput or query-cost guarantee.

Arrays and objects form a non-scalar group rather than expanding into elements. Missing, null and empty values remain distinct. A leaf action includes all grouping keys atomically; if a complete exact selector cannot be represented, the action explains the limitation instead of opening a wider result. Saved queries retain the field order and each dimension limit.

An exact group filter is saved with the query and survives refresh. **Live** supports the same exact scalar group membership on the managed Greptime 1.1.4 pipeline after a capability check. The pipeline must remain unchanged during the subscription; reconnecting checks it again. Other readers or changed pipelines return an explicit restriction.

Return to History or explicitly remove the group filter if the backend cannot support it. AI handoffs and raw-log Dashboard conversion do not yet support this filter; analytical Dashboard panels preserve the exact selection. Unsupported handoffs explain the restriction instead of removing it.

Native nonfinite attribute values remain inspectable. JSON responses represent them as `Infinity`/`-Infinity` strings because standard JSON has no nonfinite numeric literal. Exact grouping uses the native stored value before this display conversion.

## Sum and throughput

Choose **Sum** and a numeric field to add its finite numeric values. Numeric strings are not converted. No numeric samples is unavailable; valid values that cancel to zero produce zero. Overflow remains unavailable. Ranking and additional table measures use the raw matching records, not a sum of previously displayed groups.

In **Timeseries**, choose **Function → Throughput**, then **Query**. Each bucket value is divided by the nominal bucket interval in seconds: 120 logs in a 60-second bucket becomes 2 logs/s. For a measured field, the label is value/s; field names do not imply bytes, milliseconds or another unit. The tooltip retains raw bucket values and marks partial buckets. The group summary below the chart retains raw full-window values and ranking.

Partial edge buckets use the same nominal interval, not the fraction of that interval covered by the query. Analysis requires an end strictly later than its start; an instant-only window remains invalid. Changing the rollup therefore changes the rate denominator. HertzBeat retains its existing closed exact-instant query end and bucket grid; endpoint inclusion is not a claim of identical behavior to another storage engine.

For comparisons, the function transforms a and b before the formula is evaluated, once. Formula results have no inferred unit. Missing inputs and non-finite results remain unavailable. Choose **None** to restore raw values before switching to Logs, Table or Toplist. These controls are staged until **Query**, and saved queries retain the selected function. Analytical Dashboard panels retain the selected function and the complete applied analysis.

## Compare two log queries

In Table, use Add measure for up to three additional statistics. The primary measure still determines which groups appear and their ranking; the additional columns aggregate all matching raw records for those same groups. A P95 table can show average and unique count alongside the existing log count. Each numerical column retains its own admitted sample count and unavailable state.

Adding, editing or removing a measure changes the draft until Query. A function/field combination cannot duplicate the primary or another additional measure. Switching to another representation preserves these definitions with a Table-only notice; Switch to Table restores them. Saved queries and group drilldown returns also preserve the definitions.

Choose Table or Timeseries, then Add query. The new b row starts as a copy of a. Edit either expression; Query applies both rows together. Service, environment, exact time, measures and grouping are shared. Select a or b in the facet rail before adding expression conditions. Draft changes do not replace the applied results.

For an error fraction, keep a as all logs in the selected service/window, set b to the corresponding structured status:ERROR subset, and add the formula 100*b/a. This is a fraction of matching logs, not a request error rate. Formula values have no inferred unit. A zero denominator or unavailable numeric input is shown as unavailable, never zero or infinity.

Query a chooses the ranked groups. Query b is calculated over all matching logs within those selected groups; its independently most frequent groups do not replace the a domain. The matching totals describe each full filtered population. With no matching a groups, no grouped result is produced even if b has matching logs.

Use the chart source selector to inspect a, b or the formula on its own axis. Display toggles only hide table columns. Open a or b logs from a group to inspect its contributing records, then return to restore both expressions, grouping and the exact window. Save query retains the applied comparison and formula.

This alpha supports two sources, one shared primary count/numeric measure, up to three shared additional Table measures, up to four scalar grouping dimensions and bounded arithmetic over a/b. Comparisons use History and Table/Timeseries; Live and Toplist do not support comparisons. Dashboard conversion preserves both sources, their formula and any fixed time shift. Unsupported syntax retains its reason; a source-specific error identifies the row to review.

In a comparison table, each additional measure displays separate a and b values and sample counts. The formula uses only the primary a/b values; adding columns does not change its inputs. Hiding both source columns also hides their additional measures while retaining the definitions. An empty b population has no numeric samples; its successful unique count is zero.

## Export returned analysis results

Use **Add to dashboard** to save an applied Table, Toplist or Timeseries analysis. Table and Toplist use the supported LogsTable panel; Timeseries uses TimeSeriesChart. Panels retain numeric measures, grouping, exact group selections, intervals, both comparison sources, formulas and fixed time shifts. They query the Dashboard's applied time window and declared service context. Each panel loads and fails independently.

Use **Open in Explore** from a panel to continue the same analysis under its current time window. The previous raw-log columns, density and wrapping are restored when provided. Dashboard editing supports title, layout and shared service context; change analytical query conditions in Explore and add the resulting panel. Cancel does not save a draft. Import and export preserve the supported analytical document, and stale revisions are rejected.

Use **Download CSV** in the Table, Toplist or Timeseries results header to download the applied result. Editing a draft does not change the exported evidence. Export does not run another query or retrieve groups beyond the displayed limit. Both comparison sources are retained even when one is hidden in the chart. Use **Copy view link** separately to share all applied query conditions.

The file uses one row per calculation and source, including group summaries and returned time buckets. Filter `row_kind`, `source` and `measure_role` in a spreadsheet. Group kinds distinguish missing, null and empty values; unavailable measurements remain empty with an explicit state. Counts and primary measurements have separate rows. Group summaries retain raw aggregates; throughput bucket rows include both raw and transformed values.

UTC source timestamps and aligned timestamps are separate for shifted comparisons. The file records both query windows, matching totals, minimum count, group limits and truncation; comparison ranking remains based on source a. Percentile rows are marked approximate. These are returned analytical results, not a complete raw-log export.

A conservative size estimate is checked against a local limit of 8 × 1024 × 1024 UTF-16 code units, including the BOM. If the estimate exceeds the limit, the export is rejected without truncation. Reduce groups or time buckets, or choose a grouping field with shorter values. Text cells retain spreadsheet-formula protection; finite negative numerical results remain numbers.

## Live logs

Live displays newly arriving records, not the dormant historical time range. Pause, disconnect, reconnect and buffer limits can leave gaps: there is no replay or completeness guarantee. Resume/retry reconnects for new arrivals. Use history with an explicit window to look for stored records missed by the live view.

Live uses the same details/field actions and supported display settings as history. Clearing the buffer or changing the stream retires the old selection. Records without a timestamp remain inspectable with a missing-time explanation rather than an invented date. A Trace pivot shows its captured investigation window; no record ID means no nearby-log context action.

## Traces and matching spans

Select **Matching traces** or **Matching spans** before interpreting counts. A matching-trace row represents an observed trace; a matching-span row represents one span and uses that span's duration. Error and duration filters have population-specific labels. A matching span is not proof that the entire trace is complete.

Use list or groups, choose a grouping field, and inspect the trend and facets alongside coverage. One trace can belong to several facet values; do not add those memberships as distinct traces. Window coverage and bounded/truncated scans are stated explicitly. For matching traces, histogram buckets count the first matching span in the window; after brushing a subwindow, another span can make the same trace match again.

Open a result and use the waterfall search, error filter, expand/collapse, selected-subtree focus/reset, span list and service/status coloring. Inspect original attributes or JSON. Supported field actions change a draft rather than automatically executing. Open correlated logs, then **Back to trace**, then return to the original list; the selected span, exact window and parent query are preserved where the link is valid.

A structured trace query has two exact span clauses and a supported relationship between them. Its **Patterns** and **Flow** views analyze the same bounded observed-span population. Patterns report observed parent/child shapes; the Request Flow Map counts original cross-service parent-child IDs and exposes the underlying edge table.
A missing parent, root or correlated log is not inferred. Coverage and truncation notices apply to both the list and these analyses; a zero result in a truncated scan is not proof that the whole window has no match. General span-search Patterns and Flow, arbitrary Boolean span syntax, and anomaly clustering remain outside this alpha subset.

## Share the applied view

**Copy view link** shares applied conditions and supported display settings, excluding pending edits. Choose an exact investigation window or a rolling relative window; Live links retain incoming mode. Recipients must authenticate and have permission to read the same data. A link is not a public snapshot or a copy of the telemetry.

## Save the applied query

1. Set the conditions and press **Query**.
2. Select **Save query**, enter a name and optional description, then save.
3. Open **Saved queries** from Explore or the Start page. Search its name or description and filter by signal; clear the search when there are no matching records.
4. Select **Open query** to replace the current query with its saved conditions. Unapplied local changes require a discard decision.

Saving uses the **applied** conditions. If you edit a query without running it, Save, Update, and Save as are blocked with a reminder to run Query. Canceling the name/description dialog performs no write. A failed write keeps the input; a retry of the same new/copy dialog uses the same record key.

Saved queries are shared across the HertzBeat installation. Administrators and users with write access can modify or delete these shared assets; guest accounts can read them. They are not private per-user bookmarks.

## Relative and absolute time

| Mode | What happens when reopened |
|---|---|
| Relative preset | Recalculates the selected range against the current time; supported auto refresh remains part of the query |
| Live logs | Reopens the incoming-record stream; no historical window or replay is implied |
| Absolute investigation | Restores the exact start, end, and time zone; it does not move forward with the clock |

Reopening starts on the first result page. Navigation history and return destinations are not shared query conditions. Reopening the currently selected key also restores its saved conditions rather than keeping an old local draft. Focused Trace and Log investigations retain the same saved-query actions.

## Update, save as, and delete

After opening a record, run any changed conditions with **Query**, then choose **Update saved query** to replace that record. **Save as** creates a separate shared record with a new key. Canceling either dialog leaves the record unchanged. Deletion removes the selected shared asset after confirmation.

Updates and deletes require the revision of the loaded record. If another writer changed or deleted it, the server rejects the stale write with a conflict (HTTP 409); your local draft is retained. Reload the current record before updating, or use **Save as** to keep a separate copy. A legacy record without a usable revision cannot be overwritten by inventing revision zero. The write-capable role applies to the installation's shared records. Navigating away or losing write authority retires local completion callbacks without undoing a write already accepted by the server.

## Older or unsupported records

Opening a record is read-only. Recognized legacy routes are converted only when their query meaning can be restored without losing fields. A legacy record is written in the current format only after an explicit update. Unknown versions, malformed payloads, unknown parameters, or ambiguous time/identity combinations remain unavailable for opening or overwriting.

Use **Inspect original** and **Export original JSON** to retain the raw record for diagnosis. Export does not prove that an unsupported query has been recovered. In particular, an old PostgreSQL large-object reference exported as a numeric payload is still a reference; it is not the original query text. See the [upgrade guide](../start/upgrade.md) for storage compatibility notes.

## Compare with an earlier window

In a two-query log analysis, choose **1 hour earlier**, **24 hours earlier**, or **7 days earlier** for query b, then run **Query**. These are fixed elapsed offsets; they do not mean calendar yesterday or a daylight-saving-aware week. **Same window** restores the ordinary comparison. Changing the selector edits the draft until Query applies it.

The result shows the exact dates for both sources. Query a still selects the ranked groups, and b measures those groups within its own historical window. A time range longer than the offset overlaps the earlier range; the same event can legitimately appear in both populations. No matching older data does not prove that older data was retained.

The **a + b** chart aligns historical b to the a timeline. Its tooltip shows the actual bucket start for each source. Dragging a range starts a new time query and preserves the offset; it does not claim exact membership of an individual half-open bucket. **Inspect b logs** opens the original historical time window. Returning restores the comparison. Facets target the selected source's applied window, including when another offset is still a draft.

Saved queries retain the offset, shared analysis, expressions, and chosen relative or absolute time mode. Reopening a relative query resolves the current a window before deriving b. Formula values continue to use the primary a and b measures.

## Reopen a recent log query

**Recent queries** keeps up to ten manually executed log queries in the current tab session, separated by account. Selecting a record restores its filters, analysis and sorting into the editable draft. It does not execute a request or change the current time, History/Live mode, column/row display preferences or investigation context. Review the draft and select **Query** to apply it, or **Reset changes** to cancel.

Refreshing the page retains supported recent query settings. Older records without analysis or sorting restore their original defaults; they do not inherit settings from the query currently on screen. The summary describes analysis and ordering in readable terms. Use **Saved queries** when you need a named, persistent query shared through the HertzBeat instance.

## Search collection values

In **Structured search**, add `[]` after an exact attribute or resource key:

- `@permissions[]:4` matches numeric `4` or an immediate array element equal to `4`.
- `resource.allowed_codes[]:[2 TO 6]` matches a number between 2 and 6, inclusive. One element must satisfy both bounds: `[1, 9]` does not match; `[1, 4, 9]` does.
- `@permissions[]:(4 6)` requires both values, which may occur in different elements. Use `OR` inside the parentheses to accept either value.
- `@names[]:"Peter"` matches an exact string, with case preserved. `@codes[]:"4"` matches text `"4"`, not numeric `4`.
- `@names[]:""` matches an empty string, including an immediate empty string array element; it does not match null or a missing field.

Dots remain part of the literal key: `@user.codes[]` reads the exact key `user.codes`, not a nested object path. Existing queries without `[]` retain their scalar behavior. Conditions apply before pagination and aggregation in History and use the same matching rules in Live Tail. Saving, reopening and Dashboard handoffs retain the expression.

Numeric collection predicates accept signed integer query values and inclusive integer range bounds with absolute value at most 9007199254740992. Stored finite fractional values may fall inside such a range.

Native integer values compare as integers; native floating values use their stored floating precision. Numeric strings, Booleans, nulls and nested arrays do not become numbers. Missing values and empty arrays do not match a positive condition; `NOT` negates that result.

Quoted collection values retain the existing search escaping rules; quoted `*` and `?` are literal characters. Do not interpret backslash-letter sequences as new JSON escape syntax. Numeric and text memberships can be combined, for example `@codes[]:(4 "4")` requires both types. Recursive paths, unquoted text, wildcard collection operators, and decimal or exponent query bounds remain unsupported.

Use the existing search help for examples; scalar field suggestions are suppressed while a collection expression is being edited.

### Search nested collection fields

Use explicit steps to distinguish nested fields from literal keys containing dots:

- `@users[]["codes"][]:[2 TO 6]` looks up `users`, visits its value or immediate array members, then looks up each object's literal `codes` key and tests its value or immediate members.
- `@users[]["name"][]:"Peter"` matches exact text; `resource.users[]["name"][]:""` matches an empty string.
- `@users.name[]:"Peter"` still addresses one root key named `users.name`. It does not mean the same thing as `@users[]["name"][]:"Peter"`.

Each key must have an explicit `[]` step. Child keys must be quoted and use the same supported key characters as root keys. Paths allow at most four keys (the root plus three children), with 256 characters per key and 1,024 total. Extra array levels are not flattened; missing keys, nulls, and non-object parents do not match a positive condition.

Separate conditions can match different parent objects. For example, `@users[]["name"][]:"Peter" AND @users[]["role"][]:"admin"` does not require Peter to be the administrator. A numeric range within a single condition still requires one final element to satisfy both bounds. Array indices, wildcard keys, recursive traversal and same-parent correlated conditions are unsupported.

These paths filter the complete matching population in History and use the same rules in Live Tail. They do not enable nested facet discovery, array-derived grouping or field sorting. Enter paths in the query input; existing field actions retain their supported scope. Saved queries and Dashboard handoffs preserve the exact expression.

## Sort individual logs by a field

Add a business field as a column, open its column header, and choose a numeric or text order. The choice updates your query draft. Select **Query** to apply sorting together with other edits, or reset the pending change. The arrow in the header describes the applied results. The result toolbar keeps the chosen order visible even when you hide that column.

Sorting covers all matching historical logs before pagination. Numeric sorting uses finite native JSON numbers without converting numeric strings; text sorting uses case-sensitive native strings. Empty strings are valid text. Missing values, nulls, and values of another type appear last in either direction. Numeric ordering uses floating-point precision, so very large integers can tie. Equal values use newest timestamp and persisted log identity as secondary keys; older data without unique identities and concurrently arriving logs do not provide snapshot-stable offset pages.

Saved queries and supported Dashboard log panels retain the typed order. Live logs show newly received events and do not apply historical field sorting. Return to History to restore it. Sorting does not change the matching population used by trend or facet counts.

## Start an analysis from an inspected log

Open a historical log and use the action menu next to a field. **Group by** opens the existing analysis editor with that field selected and counts matching logs. **Analyze numeric values** selects the field's average; this action is available for native numeric values, not text that happens to contain digits. You can change the calculation in the editor before running it.

The shortcut closes the inspector and focuses the selected field. It preserves your search, pending filter edits, service scope and time range. Select **Query** to execute the draft, or **Reset changes** to cancel it. Choosing a result group opens its logs; **Return to log analysis** restores the analysis context.

If the current or pending query already contains an analysis, use the analysis controls to edit it. The shortcut will not overwrite existing grouping, comparison queries, formulas or throughput settings. Literal root attribute and resource keys are supported; nested objects, arrays and internal record identifiers do not offer these analysis shortcuts. This does not create a persistent field or measure definition.

## Storage format and limits

The current payload is JSON with one authority: `{ "version": 1, "query": { ... } }`. The DTO's route is the short signal discriminator `/explore?signal=metrics`, `/explore?signal=logs`, or `/explore?signal=traces`. The optional query summary is display metadata, not a recovery fallback.

The payload preserves supported query conditions and the relative/absolute time mode. It excludes result-page selection, the active saved-record key, and Services/Dashboard/Explore return links. The serialized payload must fit 65,535 UTF-8 bytes; multibyte characters consume more than one byte. The backend applies the same byte bound to the optional query summary. Names and descriptions retain their separate character limits.

Use [Add to dashboard](./perses_dashboard.md) for an applied query supported by the restricted panel contract. Dashboard conversion has a smaller supported field set than saved queries and explicitly rejects conditions that it cannot preserve.

### Filter a numeric field by range

Expand **Numeric range** in the Logs filter rail. Choose a literal resource or
attribute field, then enter inclusive minimum and maximum values. Available
bounds come from the complete applied query window, with this numeric range
removed so you can widen it again. They are not inferred from the first page or
the most frequent facet values. **Use available range** fills both bounds; the
slider is available when its finite extent can be represented safely. Exact
inputs remain usable for single-valued or extreme ranges.

Edits change the draft. Run **Query** to apply them, or reset the draft to cancel.
**Clear range** removes only this condition after Query. A range applies to both
comparison sources, including shifted windows. Available bounds describe source
A; other filters and the time window remain in force. Numeric ranges are retained
by view links, recent and saved queries, Live filters, and supported raw-log
Dashboard panels. Live does not fetch historical available bounds.

This alpha supports one root-field range with finite Float64 semantics. Numeric
strings, arrays, objects, null and missing values do not match. Large integers may
round to Float64 precision; this is not arbitrary-precision equality. Existing
textual search range semantics are unchanged. Units are not inferred or
converted. Context-neighborhood and unsupported AI population handoffs do not
claim to apply this range.

### Find a value outside the facet's top list

In **Facets**, choose a field and use **Search all values**. The lookup searches the
field's values across the applied query and time window, including values outside
the initial top list. It does not change the log query. Use a value's include or
exclude action to change the draft, then select **Query** to apply it.

The lookup is a literal substring search using the server's Unicode lowercase
rules. `%`, `_`, `*`, and backslashes are ordinary characters here; this input is
not the log query language. It does not remove accents or normalize different
Unicode spellings. Spaces are significant, and the input is limited to 256 UTF-16
code units. Clear the input to restore the top values.

The overall log count and missing-value count still describe the applied query.
The lookup count describes logs whose field values match the lookup. A truncation
notice means additional matching values exist. A failed lookup is not an empty
result: retry it or change the lookup text. Changing the field, applied scope, or
comparison source resets the lookup; already drafted log filters remain intact.
The lookup text is temporary and is not included in saved queries or Dashboards.

Some values cannot be expressed exactly in Literal query mode. If an include or
exclude action is disabled for that reason, select **Structured** query mode and
review the existing query before adding the filter. Switching modes does not
automatically convert the meaning of existing query text.

### Investigate related logs by transaction ID

In historical Logs, choose **Transactions** under **Group into**, select an
identity field, then run **Query**. For example, search for `ERROR` logs and choose
`attribute:request.id`. The search first selects IDs. Each result then includes
all logs with that exact ID inside the same selected context and time window,
including `INFO` logs that did not match the original search.

The identity must be a non-empty string in a root log attribute or resource
attribute. Dotted keys are literal keys, not nested paths. Numbers, arrays,
objects, missing values and empty strings are excluded rather than merged into a
synthetic transaction. IDs over 1,024 UTF-16 code units are excluded separately;
IDs are never truncated or compared by prefix. The result reports search matches,
matches with valid IDs, excluded matches and related logs separately.

The list ranks all eligible IDs by their related-log count before returning at
most 100 IDs. **Observed duration** is the interval between the first and last log
inside the selected window. It does not establish business start/end boundaries
or complete request duration. An unknown severity remains unknown.

Select an ID to open its related logs. The search inside this detail applies only
to that ID; it does not replace the original search or expand the selected
service, environment, namespace, entity, instance, endpoint or time range. Apply
or reset the local search, page through the results, then return to the list.
If the ID no longer has a log matching the original search, refresh the list.
This state is different from a local search with zero results or a storage error.

Saved queries retain the transaction mode, identity field and list limit alongside
the original query and time mode. Switching back to **Fields** retains its prior
analysis settings. Local detail search and the open detail panel are temporary.
Transactions require historical mode and a time window of at most 24 hours.
Transaction panels are not yet supported by Dashboard documents; save the query
to reopen the investigation. Start/end conditions, repeated-ID session splitting
and cross-service expansion are separate capabilities and are not implied by
this identity-based view.
