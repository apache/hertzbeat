/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.repository;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.DateTimeException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoField;
import java.util.Locale;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationLogRecord;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationServiceIdentity;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView.SpanEvent;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView.SpanLink;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

/** Greptime implementation of the strict Trace and Log investigation boundary. */
@Repository
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeInvestigationQueryRepository implements InvestigationQueryRepository {

    private static final DateTimeFormatter EVENT_TIME = new DateTimeFormatterBuilder()
            .appendPattern("uuuu-MM-dd HH:mm:ss")
            .optionalStart().appendFraction(ChronoField.NANO_OF_SECOND, 1, 9, true).optionalEnd()
            .appendOffset("+HHMM", "+0000")
            .toFormatter(Locale.ROOT).withResolverStyle(ResolverStyle.STRICT);
    private static final Pattern TRACE_ID = Pattern.compile("[0-9a-f]{32}");
    private static final Pattern SPAN_ID = Pattern.compile("[0-9a-f]{16}");
    private static final String LOG_TABLE = WarehouseConstants.LOG_TABLE_NAME;

    private static final String TRACE_COLUMNS = "CAST(timestamp AS BIGINT) / 1000000 AS start_time, "
            + "CAST(timestamp AS BIGINT) AS start_time_unix_nano, "
            + "CAST(timestamp_end AS BIGINT) AS end_time_unix_nano, *, "
            + "\"resource_attributes.hertzbeat.workspace_id\" AS workspace_id, "
            + "\"resource_attributes.hertzbeat.entity_id\" AS entity_id, "
            + "\"resource_attributes.hertzbeat.entity_type\" AS entity_type, "
            + "\"resource_attributes.service.namespace\" AS service_namespace, "
            + "\"resource_attributes.deployment.environment.name\" AS deployment_environment";
    private static final String LOG_COLUMNS = "CAST(timestamp AS BIGINT) AS time_unix_nano, "
            + "trace_id, span_id, severity_number, severity_text, body, log_attributes, resource_attributes, "
            + "log_record_uid, hertzbeat_entity_id, hertzbeat_workspace_id, service_name, "
            + "json_get_string(resource_attributes, '$[\"hertzbeat.entity_type\"]') AS hertzbeat_entity_type, "
            + "json_get_string(resource_attributes, '$[\"service.namespace\"]') AS service_namespace, "
            + "json_get_string(resource_attributes, '$[\"deployment.environment.name\"]') "
            + "AS deployment_environment";

    private final ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    public GreptimeInvestigationQueryRepository(ObjectProvider<GreptimeSqlQueryExecutor> executorProvider) {
        this.executorProvider = executorProvider;
    }

    @Override
    public RowsResult<TraceSpanRow> trace(TraceQuery query) {
        String scope = " FROM hzb_traces WHERE trace_id = " + literal(query.traceId())
                + " AND \"resource_attributes.hertzbeat.workspace_id\" = " + literal(query.workspaceId())
                + window("timestamp", query.start(), query.end());
        String sql = "SELECT " + TRACE_COLUMNS + scope + " ORDER BY timestamp ASC, span_id ASC LIMIT "
                + (MAX_TRACE_SPANS + 1);
        try {
            List<Map<String, Object>> rawRows = execute(sql);
            boolean truncated = rawRows.size() > MAX_TRACE_SPANS;
            int baseRowCount = Math.min(rawRows.size(), MAX_TRACE_SPANS);
            List<TraceSpanRow> rows = new ArrayList<>(baseRowCount + 1);
            for (Map<String, Object> row : rawRows.subList(0, baseRowCount)) {
                rows.add(traceRow(row, query));
            }
            if (truncated && query.selectedSpanId() != null && rows.stream()
                    .noneMatch(span -> query.selectedSpanId().equals(span.spanId()))) {
                List<Map<String, Object>> selectedRows = execute("SELECT " + TRACE_COLUMNS + scope
                        + " AND span_id = " + literal(query.selectedSpanId()) + " LIMIT 2");
                if (selectedRows.size() > 1) {
                    throw new MalformedRowException();
                }
                if (selectedRows.size() == 1) {
                    TraceSpanRow mapped = traceRow(selectedRows.getFirst(), query);
                    if (!query.selectedSpanId().equals(mapped.spanId())) {
                        throw new MalformedRowException();
                    }
                    rows.add(mapped);
                }
            }
            for (TraceSpanRow span : rows) {
                if (!query.traceId().equals(span.traceId()) || !query.workspaceId().equals(span.workspaceId())) {
                    throw new MalformedRowException();
                }
            }
            return RowsResult.available(rows, truncated);
        } catch (MalformedRowException exception) {
            return RowsResult.failed(Status.MALFORMED_DATA);
        } catch (RuntimeException exception) {
            return RowsResult.failed(Status.STORAGE_UNAVAILABLE);
        }
    }

    @Override
    public RowsResult<InvestigationLogRecord> selectedLog(LogQuery query) {
        String sql = "SELECT " + LOG_COLUMNS + " FROM " + LOG_TABLE + " WHERE log_record_uid = "
                + literal(query.logRecordUid()) + " AND hertzbeat_workspace_id = " + literal(query.workspaceId())
                + window("timestamp", query.start(), query.end())
                + " ORDER BY timestamp ASC, log_record_uid ASC LIMIT 2";
        try {
            List<Map<String, Object>> rawRows = execute(sql);
            if (rawRows.size() > 1) {
                return RowsResult.failed(Status.MALFORMED_DATA);
            }
            return RowsResult.available(mapLogs(rawRows, query.workspaceId()), false);
        } catch (MalformedRowException | IllegalArgumentException exception) {
            return RowsResult.failed(Status.MALFORMED_DATA);
        } catch (RuntimeException exception) {
            return RowsResult.failed(Status.STORAGE_UNAVAILABLE);
        }
    }

    @Override
    public RowsResult<InvestigationLogRecord> sameTraceLogs(TraceLogsQuery query) {
        String sql = "SELECT " + LOG_COLUMNS + " FROM " + LOG_TABLE + " WHERE trace_id = "
                + literal(query.traceId())
                + " AND hertzbeat_workspace_id = " + literal(query.workspaceId())
                + window("timestamp", query.start(), query.end())
                + " ORDER BY timestamp ASC, log_record_uid ASC LIMIT " + (MAX_TRACE_LOGS + 1);
        try {
            List<InvestigationLogRecord> rows = mapLogs(execute(sql), query.workspaceId());
            boolean truncated = rows.size() > MAX_TRACE_LOGS;
            return RowsResult.available(truncated ? rows.subList(0, MAX_TRACE_LOGS) : rows, truncated);
        } catch (MalformedRowException | IllegalArgumentException exception) {
            return RowsResult.failed(Status.MALFORMED_DATA);
        } catch (RuntimeException exception) {
            return RowsResult.failed(Status.STORAGE_UNAVAILABLE);
        }
    }

    @Override
    public NearbyResult nearbyLogs(NearbyQuery query) {
        try {
            List<InvestigationLogRecord> before = mapLogs(execute(nearbySql(query, true)), query.workspaceId());
            List<InvestigationLogRecord> after = mapLogs(execute(nearbySql(query, false)), query.workspaceId());
            boolean moreBefore = before.size() > MAX_NEARBY_LOGS;
            boolean moreAfter = after.size() > MAX_NEARBY_LOGS;
            if (moreBefore) {
                before = new ArrayList<>(before.subList(0, MAX_NEARBY_LOGS));
            }
            if (moreAfter) {
                after = new ArrayList<>(after.subList(0, MAX_NEARBY_LOGS));
            }
            before = before.reversed();
            return new NearbyResult(Status.AVAILABLE, before, after, moreBefore, moreAfter);
        } catch (MalformedRowException | IllegalArgumentException exception) {
            return new NearbyResult(Status.MALFORMED_DATA, List.of(), List.of(), false, false);
        } catch (RuntimeException exception) {
            return new NearbyResult(Status.STORAGE_UNAVAILABLE, List.of(), List.of(), false, false);
        }
    }

    @Override
    public RowsResult<InvestigationLogRecord> identityLogs(IdentityQuery query) {
        String sql = "SELECT " + LOG_COLUMNS + " FROM " + LOG_TABLE
                + identityWhere(query, false)
                + " ORDER BY timestamp DESC, log_record_uid DESC LIMIT " + (MAX_ALERT_LOGS + 1);
        try {
            List<InvestigationLogRecord> rows = mapLogs(execute(sql), query.workspaceId());
            boolean truncated = rows.size() > MAX_ALERT_LOGS;
            return RowsResult.available(truncated ? rows.subList(0, MAX_ALERT_LOGS) : rows, truncated);
        } catch (MalformedRowException | IllegalArgumentException exception) {
            return RowsResult.failed(Status.MALFORMED_DATA);
        } catch (RuntimeException exception) {
            return RowsResult.failed(Status.STORAGE_UNAVAILABLE);
        }
    }

    @Override
    public RowsResult<TraceSummaryRow> identityTraces(IdentityQuery query) {
        String sql = "SELECT trace_id, CAST(MIN(timestamp) AS BIGINT) AS start_time_unix_nano, "
                + "MAX(CAST(timestamp AS BIGINT) + duration_nano) - MIN(CAST(timestamp AS BIGINT)) "
                + "AS duration_nanos, COUNT(*) AS span_count, service_name, "
                + "SUM(CASE WHEN span_status_code = 'STATUS_CODE_ERROR' THEN 1 ELSE 0 END) AS error_count, "
                + "SUM(CASE WHEN span_status_code = 'STATUS_CODE_OK' THEN 1 ELSE 0 END) AS ok_count, "
                + "SUM(CASE WHEN span_status_code = 'STATUS_CODE_UNSET' THEN 1 ELSE 0 END) AS unset_count "
                + "FROM hzb_traces" + identityWhere(query, true)
                + " GROUP BY trace_id, service_name ORDER BY start_time_unix_nano DESC LIMIT "
                + (MAX_ALERT_TRACES + 1);
        try {
            List<Map<String, Object>> rawRows = execute(sql);
            boolean truncated = rawRows.size() > MAX_ALERT_TRACES;
            List<Map<String, Object>> bounded = truncated ? rawRows.subList(0, MAX_ALERT_TRACES) : rawRows;
            List<TraceSummaryRow> rows = new ArrayList<>(bounded.size());
            for (Map<String, Object> row : bounded) {
                rows.add(traceSummary(row, query));
            }
            return RowsResult.available(rows, truncated);
        } catch (MalformedRowException | IllegalArgumentException exception) {
            return RowsResult.failed(Status.MALFORMED_DATA);
        } catch (RuntimeException exception) {
            return RowsResult.failed(Status.STORAGE_UNAVAILABLE);
        }
    }

    private String nearbySql(NearbyQuery query, boolean before) {
        String comparator = before ? "<" : ">";
        String order = before ? "DESC" : "ASC";
        String selectedUid = literal(query.selectedLogRecordUid());
        String selectedTime = Long.toString(query.selectedTimeUnixNano());
        String identityScope = query.entityId() != null
                ? " AND hertzbeat_entity_id = " + literal(query.entityId())
                        + " AND json_get_string(resource_attributes, '$[\"hertzbeat.entity_type\"]') = "
                        + literal(query.entityType())
                : " AND COALESCE(json_get_string(resource_attributes, '$[\"host.name\"]'), "
                        + "json_get_string(resource_attributes, '$[\"host\"][\"name\"]')) = "
                        + literal(query.hostName());
        return "SELECT " + LOG_COLUMNS + " FROM " + LOG_TABLE + " WHERE hertzbeat_workspace_id = "
                + literal(query.workspaceId()) + " AND service_name = " + literal(query.serviceName())
                + identityScope
                + optionalJsonScope("service.namespace", query.serviceNamespace())
                + optionalEnvironmentScope(query.deploymentEnvironment())
                + " AND log_record_uid != " + selectedUid
                + window("timestamp", query.start(), query.end())
                + " AND (CAST(timestamp AS BIGINT) " + comparator + " " + selectedTime
                + " OR (CAST(timestamp AS BIGINT) = " + selectedTime
                + " AND log_record_uid " + comparator + " " + selectedUid + "))"
                + " ORDER BY timestamp " + order + ", log_record_uid " + order
                + " LIMIT " + (MAX_NEARBY_LOGS + 1);
    }

    private String identityWhere(IdentityQuery query, boolean trace) {
        String workspaceColumn = trace ? "\"resource_attributes.hertzbeat.workspace_id\"" : "hertzbeat_workspace_id";
        String entityColumn = trace ? "\"resource_attributes.hertzbeat.entity_id\"" : "hertzbeat_entity_id";
        String namespaceColumn = trace ? "\"resource_attributes.service.namespace\""
                : "json_get_string(resource_attributes, '$[\"service.namespace\"]')";
        String environmentColumn = trace ? "\"resource_attributes.deployment.environment.name\""
                : "json_get_string(resource_attributes, '$[\"deployment.environment.name\"]')";
        return " WHERE " + workspaceColumn + " = " + literal(query.workspaceId())
                + exactOptionalScope(entityColumn, query.entityId())
                + " AND service_name = " + literal(query.serviceName())
                + exactOptionalScope(namespaceColumn, query.serviceNamespace())
                + exactOptionalScope(environmentColumn, query.deploymentEnvironment())
                + window("timestamp", query.start(), query.end());
    }

    private TraceSummaryRow traceSummary(Map<String, Object> row, IdentityQuery query) {
        String traceId = requiredIdentifier(row, "trace_id", TRACE_ID);
        long startNanos = positiveLong(value(row, "start_time_unix_nano"));
        long durationNanos = nonNegativeLong(value(row, "duration_nanos"));
        long spanCount = positiveLong(value(row, "span_count"));
        if (spanCount > MAX_TRACE_SPANS || !query.serviceName().equals(required(row, "service_name", 256))) {
            throw new MalformedRowException();
        }
        BigInteger start = BigInteger.valueOf(query.start()).multiply(BigInteger.valueOf(1_000_000L));
        BigInteger end = BigInteger.valueOf(query.end()).multiply(BigInteger.valueOf(1_000_000L));
        BigInteger actual = BigInteger.valueOf(startNanos);
        if (actual.compareTo(start) < 0 || actual.compareTo(end) >= 0) {
            throw new MalformedRowException();
        }
        long errors = nonNegativeLong(value(row, "error_count"));
        long ok = nonNegativeLong(value(row, "ok_count"));
        long unset = nonNegativeLong(value(row, "unset_count"));
        String status = errors > 0L ? "error" : ok == spanCount ? "ok" : unset == spanCount ? "unset" : "unknown";
        return new TraceSummaryRow(traceId, Long.toString(startNanos), Long.toString(durationNanos), status,
                (int) spanCount, query.serviceName());
    }


    private List<Map<String, Object>> execute(String sql) {
        GreptimeSqlQueryExecutor executor = executorProvider.getIfAvailable();
        if (executor == null) {
            throw new IllegalStateException("Greptime executor is unavailable");
        }
        List<Map<String, Object>> rows = executor.executeStrict(sql);
        return rows == null ? List.of() : rows;
    }

    private TraceSpanRow traceRow(Map<String, Object> row, TraceQuery query) {
        long startTime = nonNegativeLong(value(row, "start_time"));
        long durationNanos = nonNegativeLong(value(row, "duration_nano"));
        String traceId = requiredIdentifier(row, "trace_id", TRACE_ID);
        String spanId = requiredIdentifier(row, "span_id", SPAN_ID);
        String workspaceId = required(row, "workspace_id", 128);
        if (!query.traceId().equals(traceId) || !query.workspaceId().equals(workspaceId)
                || startTime < query.start() || startTime >= query.end()) {
            throw new MalformedRowException();
        }
        Map<String, String> resource = canonicalResource(row);
        return new TraceSpanRow(startTime, nonNegativeLong(value(row, "start_time_unix_nano")),
                observedEndTime(row, durationNanos), traceId, spanId,
                optionalIdentifier(row, "parent_span_id", SPAN_ID),
                optional(row, "span_name", 512), optional(row, "service_name", 256),
                optional(row, "span_status_code", 64), optional(row, "span_status_message", 4_096),
                optional(row, "span_kind", 64), optional(row, "trace_state", 512),
                optional(row, "scope_name", 256), optional(row, "scope_version", 128), durationNanos,
                workspaceId, optional(row, "entity_id", 20), optional(row, "entity_type", 64),
                optional(row, "service_namespace", 256), optional(row, "deployment_environment", 128),
                resource, attributes(row, "span_attributes."), spanEvents(value(row, "span_events")),
                spanLinks(value(row, "span_links")), null);
    }

    private List<InvestigationLogRecord> mapLogs(List<Map<String, Object>> rows, String workspaceId) {
        List<InvestigationLogRecord> mapped = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            String rowWorkspace = required(row, "hertzbeat_workspace_id", 128);
            if (!workspaceId.equals(rowWorkspace)) {
                throw new MalformedRowException();
            }
            String uid = required(row, "log_record_uid", InvestigationLogRecord.MAX_UID_LENGTH);
            String entityId = optional(row, "hertzbeat_entity_id", 20);
            String entityType = optional(row, "hertzbeat_entity_type", 64);
            String serviceName = optional(row, "service_name", 256);
            String namespace = optional(row, "service_namespace", 256);
            String environment = optional(row, "deployment_environment", 128);
            InvestigationServiceIdentity identity = entityId == null || entityType == null || serviceName == null
                    ? null : new InvestigationServiceIdentity(
                            rowWorkspace, entityId, entityType, serviceName, namespace, environment);
            AttributePreview attributes = logAttributePreview(value(row, "log_attributes"));
            Object rawResourceAttributes = value(row, "resource_attributes");
            Map<?, ?> rawResourceMap = structuredMap(rawResourceAttributes);
            AttributePreview resourceAttributes = logAttributePreview(rawResourceMap);
            Map<String, String> canonicalResources = canonicalLogResources(
                    resourceAttributes.values(), rawResourceMap, serviceName);
            Map<String, List<String>> truncatedFields = new LinkedHashMap<>();
            if (!attributes.truncatedKeys().isEmpty()) {
                truncatedFields.put("attributes", attributes.truncatedKeys());
            }
            if (!resourceAttributes.truncatedKeys().isEmpty()) {
                truncatedFields.put("resourceAttributes", resourceAttributes.truncatedKeys());
            }
            mapped.add(new InvestigationLogRecord(uid,
                    Long.toString(positiveLong(value(row, "time_unix_nano"))),
                    nullablePositiveLongText(value(row, "observed_time_unix_nano")),
                    nullableInteger(value(row, "severity_number")), optional(row, "severity_text", 64),
                    boundedText(value(row, "body"), InvestigationLogRecord.MAX_BODY_LENGTH),
                    optional(row, "trace_id", 128), optional(row, "span_id", 128), identity,
                    attributes.values(), canonicalResources, Map.copyOf(truncatedFields)));
        }
        return List.copyOf(mapped);
    }

    private Map<String, String> canonicalResource(Map<String, Object> row) {
        Map<String, String> values = new LinkedHashMap<>(attributes(row, "resource_attributes."));
        put(values, "hertzbeat.workspace_id", optional(row, "workspace_id", 128));
        put(values, "hertzbeat.entity_id", optional(row, "entity_id", 20));
        put(values, "hertzbeat.entity_type", optional(row, "entity_type", 64));
        put(values, "service.name", optional(row, "service_name", 256));
        put(values, "service.namespace", optional(row, "service_namespace", 256));
        put(values, "deployment.environment.name", optional(row, "deployment_environment", 128));
        return Map.copyOf(values);
    }

    private long observedEndTime(Map<String, Object> row, long durationNanos) {
        long startNanos = nonNegativeLong(value(row, "start_time_unix_nano"));
        Object endValue = value(row, "end_time_unix_nano");
        BigInteger end = endValue == null ? BigInteger.valueOf(startNanos).add(BigInteger.valueOf(durationNanos))
                : BigInteger.valueOf(nonNegativeLong(endValue));
        if (end.subtract(BigInteger.valueOf(startNanos)).compareTo(BigInteger.valueOf(durationNanos)) != 0
                || end.compareTo(BigInteger.valueOf(Long.MAX_VALUE)) > 0) {
            throw new MalformedRowException();
        }
        return end.add(BigInteger.valueOf(999_999L)).divide(BigInteger.valueOf(1_000_000L)).longValueExact();
    }

    private Map<String, String> attributes(Map<String, Object> row, String prefix) {
        Map<String, String> attributes = new LinkedHashMap<>();
        row.forEach((key, item) -> {
            if (key.startsWith(prefix) && key.length() > prefix.length() && item != null) {
                attributes.put(key.substring(prefix.length()), attributeText(item));
            }
        });
        return Map.copyOf(attributes);
    }

    private String attributeText(Object value) {
        return value instanceof Map<?, ?> || value instanceof List<?> ? JsonUtil.toJson(value) : value.toString();
    }

    private Map<String, String> stringMap(Object value) {
        Map<?, ?> map = structuredMap(value);
        Map<String, String> result = new LinkedHashMap<>();
        map.forEach((key, item) -> {
            if (key != null && item != null) {
                result.put(key.toString(), item.toString());
            }
        });
        return Map.copyOf(result);
    }

    private AttributePreview logAttributePreview(Object value) {
        Map<?, ?> map = structuredMap(value);
        return logAttributePreview(map);
    }

    private AttributePreview logAttributePreview(Map<?, ?> map) {
        Map<String, String> result = new LinkedHashMap<>();
        List<String> truncatedKeys = new ArrayList<>();
        map.forEach((key, item) -> {
            if (key != null && item != null) {
                String name = key.toString();
                String text = item.toString();
                if (text.length() > InvestigationLogRecord.MAX_ATTRIBUTE_VALUE_LENGTH) {
                    int end = InvestigationLogRecord.MAX_ATTRIBUTE_VALUE_LENGTH;
                    if (Character.isHighSurrogate(text.charAt(end - 1)) && Character.isLowSurrogate(text.charAt(end))) {
                        end--;
                    }
                    text = text.substring(0, end);
                    truncatedKeys.add(name);
                }
                result.put(name, text);
            }
        });
        return new AttributePreview(Map.copyOf(result), List.copyOf(truncatedKeys));
    }

    private Map<String, String> canonicalLogResources(Map<String, String> preview,
                                                       Map<?, ?> raw,
                                                       String serviceName) {
        Map<String, String> canonical = new LinkedHashMap<>(preview);
        if (serviceName != null) {
            canonical.put("service.name", serviceName);
        }
        canonical.remove("host.name");
        String hostName = scalarHostName(raw.get("host.name"));
        if (hostName == null && raw.get("host") instanceof Map<?, ?> host) {
            hostName = scalarHostName(host.get("name"));
        }
        if (hostName != null) {
            canonical.put("host.name", hostName);
        }
        return Map.copyOf(canonical);
    }

    private String scalarHostName(Object value) {
        if (!(value instanceof String hostName) || hostName.isBlank() || hostName.length() > 256
                || hostName.codePoints().anyMatch(Character::isISOControl)) {
            return null;
        }
        return hostName;
    }

    private Map<?, ?> structuredMap(Object value) {
        if (value == null) {
            return Map.of();
        }
        Object parsed = value;
        if (value instanceof String text) {
            try {
                parsed = JsonUtil.fromJson(text, Object.class);
            } catch (RuntimeException exception) {
                throw new MalformedRowException();
            }
        }
        if (!(parsed instanceof Map<?, ?> map)) {
            throw new MalformedRowException();
        }
        return map;
    }

    private record AttributePreview(Map<String, String> values, List<String> truncatedKeys) { }

    private List<SpanEvent> spanEvents(Object raw) {
        List<?> values = structuredList(raw);
        if (values.size() > 128) {
            throw new MalformedRowException();
        }
        List<SpanEvent> events = new ArrayList<>(values.size());
        for (Object value : values) {
            if (!(value instanceof Map<?, ?> map)) {
                throw new MalformedRowException();
            }
            events.add(new SpanEvent(Long.toString(spanEventTime(map)), text(map.get("name"), 512),
                    stringMap(map.get("attributes")), nullableInteger(
                            first(map, "dropped_attributes_count", "droppedAttributesCount"))));
        }
        return List.copyOf(events);
    }

    private long spanEventTime(Map<?, ?> event) {
        if (event.containsKey("time_unix_nano") || event.containsKey("timeUnixNano")) {
            return positiveLong(first(event, "time_unix_nano", "timeUnixNano"));
        }
        if (!(event.get("time") instanceof String timestamp)) {
            throw new MalformedRowException();
        }
        try {
            var instant = OffsetDateTime.parse(timestamp, EVENT_TIME).toInstant();
            return positiveLong(Math.addExact(Math.multiplyExact(instant.getEpochSecond(), 1_000_000_000L), instant.getNano()));
        } catch (DateTimeException | ArithmeticException invalid) {
            throw new MalformedRowException();
        }
    }

    private List<SpanLink> spanLinks(Object raw) {
        List<?> values = structuredList(raw);
        if (values.size() > 128) {
            throw new MalformedRowException();
        }
        List<SpanLink> links = new ArrayList<>(values.size());
        for (Object value : values) {
            if (!(value instanceof Map<?, ?> map)) {
                throw new MalformedRowException();
            }
            links.add(new SpanLink(requiredIdentifier(first(map, "trace_id", "traceId"), TRACE_ID),
                    requiredIdentifier(first(map, "span_id", "spanId"), SPAN_ID),
                    boundedText(first(map, "trace_state", "traceState"), 512), stringMap(map.get("attributes")),
                    nullableInteger(first(map, "dropped_attributes_count", "droppedAttributesCount"))));
        }
        return List.copyOf(links);
    }

    private List<?> structuredList(Object raw) {
        if (raw == null) {
            return List.of();
        }
        Object parsed = raw;
        if (raw instanceof String text) {
            try {
                parsed = JsonUtil.fromJson(text, Object.class);
            } catch (RuntimeException exception) {
                throw new MalformedRowException();
            }
        }
        if (!(parsed instanceof List<?> list)) {
            throw new MalformedRowException();
        }
        return list;
    }

    private Object first(Map<?, ?> values, String first, String second) {
        return values.containsKey(first) ? values.get(first) : values.get(second);
    }

    private String text(Object value, int maxLength) {
        if (value == null) {
            return null;
        }
        String text = Objects.toString(value, null);
        if (text == null || text.isBlank() || text.length() > maxLength) {
            throw new MalformedRowException();
        }
        return text.trim();
    }

    private String boundedText(Object value, int maxLength) {
        if (value == null) {
            return null;
        }
        String text = Objects.toString(value, null);
        if (text == null || text.length() > maxLength) {
            throw new MalformedRowException();
        }
        return text;
    }

    private Object value(Map<String, Object> row, String key) {
        if (row == null || !row.containsKey(key)) {
            return null;
        }
        return row.get(key);
    }

    private String required(Map<String, Object> row, String key, int maxLength) {
        String result = optional(row, key, maxLength);
        if (result == null) {
            throw new MalformedRowException();
        }
        return result;
    }

    private String requiredIdentifier(Map<String, Object> row, String key, Pattern pattern) {
        return requiredIdentifier(value(row, key), pattern);
    }

    private String requiredIdentifier(Object value, Pattern pattern) {
        String identifier = Objects.toString(value, null);
        if (identifier == null || !pattern.matcher(identifier).matches()) {
            throw new MalformedRowException();
        }
        return identifier;
    }

    private String optionalIdentifier(Map<String, Object> row, String key, Pattern pattern) {
        Object value = value(row, key);
        if (value == null || Objects.toString(value, "").isBlank()) {
            return null;
        }
        return requiredIdentifier(value, pattern);
    }

    private String optional(Map<String, Object> row, String key, int maxLength) {
        Object value = value(row, key);
        if (value == null) {
            return null;
        }
        String text = Objects.toString(value, null);
        if (text == null || text.isBlank()) {
            return null;
        }
        text = text.trim();
        if (text.length() > maxLength || text.codePoints().anyMatch(Character::isISOControl)) {
            throw new MalformedRowException();
        }
        return text;
    }

    private long positiveLong(Object value) {
        long result = losslessLong(value);
        if (result <= 0L) {
            throw new MalformedRowException();
        }
        return result;
    }

    private long nonNegativeLong(Object value) {
        long result = losslessLong(value);
        if (result < 0L) {
            throw new MalformedRowException();
        }
        return result;
    }

    private long losslessLong(Object value) {
        try {
            if (value instanceof Byte || value instanceof Short || value instanceof Integer || value instanceof Long) {
                return ((Number) value).longValue();
            }
            if (value instanceof BigInteger integer) {
                return integer.longValueExact();
            }
            if (value instanceof BigDecimal decimal) {
                return decimal.longValueExact();
            }
            return new BigDecimal(Objects.toString(value, "")).longValueExact();
        } catch (ArithmeticException | NumberFormatException exception) {
            throw new MalformedRowException();
        }
    }

    private String nullablePositiveLongText(Object value) {
        return value == null ? null : Long.toString(positiveLong(value));
    }

    private Integer nullableInteger(Object value) {
        if (value == null) {
            return null;
        }
        long result = losslessLong(value);
        if (result < Integer.MIN_VALUE || result > Integer.MAX_VALUE) {
            throw new MalformedRowException();
        }
        return (int) result;
    }

    private String window(String column, long start, long end) {
        return " AND " + column + " >= to_timestamp_millis(" + start + ") AND " + column
                + " < to_timestamp_millis(" + end + ")";
    }

    private String literal(String value) {
        return "'" + value.replace("'", "''") + "'";
    }

    private String optionalJsonScope(String key, String value) {
        return value == null ? "" : " AND json_get_string(resource_attributes, '$[\"" + key + "\"]') = "
                + literal(value);
    }

    private String optionalEnvironmentScope(String value) {
        String environment = "COALESCE(" + environmentValue("deployment.environment.name") + ", "
                + environmentValue("deployment.environment") + ", json_get_string(resource_attributes, '$[\"env\"]'))";
        return value == null ? "" : " AND " + environment + " = " + literal(value);
    }

    private String environmentValue(String key) {
        String value = "json_get_string(resource_attributes, '$[\"" + key + "\"]')";
        return "CASE WHEN TRIM(" + value + ") = '' THEN NULL ELSE " + value + " END";
    }

    private String exactOptionalScope(String column, String value) {
        return value == null ? "" : " AND " + column + " = " + literal(value);
    }

    private void put(Map<String, String> values, String key, String value) {
        if (value != null) {
            values.put(key, value);
        }
    }

    private static final class MalformedRowException extends RuntimeException {
        private static final long serialVersionUID = 1L;
    }
}
