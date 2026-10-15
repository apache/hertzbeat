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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;

/** Validates the log reader and pipeline schema without modifying an existing table. */
final class GreptimeLogSchemaValidator {

    private GreptimeLogSchemaValidator() {
    }

    static void validate(List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty()) {
            throw unavailable();
        }
        Map<String, Map<String, Object>> columns = new LinkedHashMap<>();
        List<String> timeIndexes = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (row == null || !(row.get("Column") instanceof String name) || name.isBlank()
                    || !(row.get("Type") instanceof String)
                    || !(row.get("Semantic Type") instanceof String semanticType)
                    || columns.putIfAbsent(name, row) != null) {
                throw unavailable();
            }
            if ("TIMESTAMP".equals(semanticType)) {
                timeIndexes.add(name);
            }
        }
        List<String> mismatches = new ArrayList<>();
        if (!timeIndexes.equals(List.of("timestamp"))) {
            mismatches.add("expected sole time index timestamp, found " + timeIndexes);
        }
        requireColumn(columns, "timestamp", "TimestampNanosecond", mismatches);
        for (String name : List.of("trace_id", "span_id", "hertzbeat_event_id", "log_record_uid",
                "hertzbeat_ingest_id", "hertzbeat_entity_id", "hertzbeat_workspace_id", "service_name",
                "severity_text", "body")) {
            requireColumn(columns, name, "String", mismatches);
        }
        requireColumn(columns, "severity_number", "Int32", mismatches);
        requireColumn(columns, "log_attributes", "Json", mismatches);
        requireColumn(columns, "resource_attributes", "Json", mismatches);
        Map<String, Object> service = columns.get("service_name");
        if (service != null && !"TAG".equals(service.get("Semantic Type"))) {
            mismatches.add("service_name must be a TAG");
        }
        if (!mismatches.isEmpty()) {
            throw new SchemaValidationException("GreptimeDB log table " + WarehouseConstants.LOG_TABLE_NAME
                    + " requires an upgrade: " + String.join("; ", mismatches)
                    + ". Back up the table and follow an explicit upgrade plan before enabling log ingestion; "
                    + "no automatic migration was attempted.");
        }
    }

    private static void requireColumn(Map<String, Map<String, Object>> columns, String name, String type,
                                      List<String> mismatches) {
        Map<String, Object> column = columns.get(name);
        if (column == null) {
            mismatches.add("missing column " + name);
        } else if (!type.equals(column.get("Type"))) {
            mismatches.add("column " + name + " must have type " + type);
        }
    }

    private static SchemaValidationException unavailable() {
        return new SchemaValidationException("GreptimeDB log table " + WarehouseConstants.LOG_TABLE_NAME
                + " schema metadata cannot be verified; check schema read permissions and backend availability. "
                + "Log ingestion is not ready.");
    }

    static final class SchemaValidationException extends IllegalStateException {
        SchemaValidationException(String message) {
            super(message);
        }
    }
}
