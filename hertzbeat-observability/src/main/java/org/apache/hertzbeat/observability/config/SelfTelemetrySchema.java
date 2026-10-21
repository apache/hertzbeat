/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Validates self schemas before writes; existing incompatible tables are never migrated. */
final class SelfTelemetrySchema {
    private SelfTelemetrySchema() {
    }

    static Map<String, String> traceColumns() {
        Map<String, String> columns = new LinkedHashMap<>();
        columns.put("timestamp", "TimestampNanosecond");
        columns.put("timestamp_end", "TimestampNanosecond");
        columns.put("duration_nano", "UInt64");
        for (String name : List.of("trace_id", "span_id", "parent_span_id", "span_kind", "span_name",
                "span_status_code", "span_status_message", "trace_state", "scope_name", "scope_version", "service_name",
                "resource_attributes.hertzbeat.workspace_id", "resource_attributes.hertzbeat.entity_id",
                "resource_attributes.hertzbeat.entity_type", "resource_attributes.service.namespace",
                "resource_attributes.service.instance.id", "resource_attributes.deployment.environment.name",
                "resource_attributes.hertzbeat.collector.id", "resource_attributes.host.name", "resource_attributes.host.id")) {
            columns.put(name, "String");
        }
        columns.put("span_events", "Json");
        columns.put("span_links", "Json");
        return columns;
    }

    static Map<String, String> logColumns() {
        Map<String, String> columns = new LinkedHashMap<>();
        columns.put("timestamp", "TimestampNanosecond");
        for (String name : List.of("trace_id", "span_id", "hertzbeat_event_id", "log_record_uid", "hertzbeat_ingest_id",
                "hertzbeat_entity_id", "hertzbeat_workspace_id", "severity_text", "body", "service_name")) {
            columns.put(name, "String");
        }
        columns.put("severity_number", "Int32");
        columns.put("log_attributes", "Json");
        columns.put("resource_attributes", "Json");
        return columns;
    }

    static String projection(Map<String, String> required) {
        return required.keySet().stream().map(name -> "\"" + name + "\"").collect(Collectors.joining(", "));
    }

    static void validate(List<Map<String, Object>> rows, Map<String, String> required) {
        if (rows == null || rows.isEmpty()) {
            throw new SchemaValidationException("Self table schema metadata is unavailable");
        }
        Map<String, Map<String, Object>> columns = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            if (row == null || !(row.get("Column") instanceof String name)
                    || !(row.get("Type") instanceof String) || !(row.get("Semantic Type") instanceof String)
                    || columns.putIfAbsent(name, row) != null) {
                throw new SchemaValidationException("Self table schema metadata is invalid");
            }
        }
        for (Map.Entry<String, String> expected : required.entrySet()) {
            Map<String, Object> column = columns.get(expected.getKey());
            if (column == null || !expected.getValue().equals(column.get("Type"))) {
                throw new SchemaValidationException("Self table schema requires an explicit upgrade: " + expected.getKey());
            }
        }
        List<String> timeIndexes = columns.entrySet().stream()
                .filter(column -> "TIMESTAMP".equals(column.getValue().get("Semantic Type")))
                .map(Map.Entry::getKey).toList();
        if (!timeIndexes.equals(List.of("timestamp")) || !"TAG".equals(columns.get("service_name").get("Semantic Type"))) {
            throw new SchemaValidationException("Self table time index or service tag is incompatible");
        }
    }

    /** Existing schema requires explicit operator review; no automatic migration is allowed. */
    static final class SchemaValidationException extends IllegalStateException {
        SchemaValidationException(String message) {
            super(message);
        }
    }
}
