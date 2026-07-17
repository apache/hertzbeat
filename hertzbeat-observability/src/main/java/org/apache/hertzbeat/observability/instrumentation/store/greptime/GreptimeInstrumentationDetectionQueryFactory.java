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

package org.apache.hertzbeat.observability.instrumentation.store.greptime;

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpMetricSemanticLabels;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionCriteria;

/** Builds storage-specific last-received-time queries without exposing Greptime details to the port. */
final class GreptimeInstrumentationDetectionQueryFactory {

    private static final String METRICS_TABLE = "greptime_physical_table";
    private static final String LOGS_TABLE = "hertzbeat_logs";
    private static final String TRACES_TABLE = "hzb_traces";

    String latestReceivedAt(Signal signal, DetectionCriteria criteria) {
        return switch (signal) {
            case METRICS -> metricsQuery(criteria);
            case LOGS -> jsonResourceQuery(LOGS_TABLE, criteria);
            case TRACES -> flattenedTraceResourceQuery(criteria);
            default -> throw new IllegalArgumentException("Unsupported signal");
        };
    }

    private String metricsQuery(DetectionCriteria criteria) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("service_name", criteria.serviceName()));
        filters.add(equalsColumn("service_namespace", criteria.serviceNamespace()));
        filters.add(equalsColumn("deployment_environment_name", criteria.environment()));
        filters.add(equalsColumn(OtlpMetricSemanticLabels.HERTZBEAT_COLLECTOR_ID, criteria.collectorId()));
        filters.add("greptime_timestamp >= to_timestamp_millis(" + criteria.startedAt() + ")");
        return "SELECT MAX(greptime_timestamp) AS last_received_at FROM " + METRICS_TABLE
                + " WHERE " + String.join(" AND ", filters);
    }

    private String jsonResourceQuery(String table, DetectionCriteria criteria) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("service_name", criteria.serviceName()));
        filters.add(equalsResourceAttribute("service.namespace", criteria.serviceNamespace()));
        filters.add(equalsResourceAttribute("deployment.environment.name", criteria.environment()));
        filters.add(equalsResourceAttribute("hertzbeat.collector.id", criteria.collectorId()));
        filters.add("timestamp >= to_timestamp_millis(" + criteria.startedAt() + ")");
        return "SELECT MAX(timestamp) AS last_received_at FROM " + table
                + " WHERE " + String.join(" AND ", filters);
    }

    private String flattenedTraceResourceQuery(DetectionCriteria criteria) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("service_name", criteria.serviceName()));
        filters.add(equalsColumn(quotedIdentifier("resource_attributes.service.namespace"),
                criteria.serviceNamespace()));
        filters.add(equalsColumn(quotedIdentifier("resource_attributes.deployment.environment.name"),
                criteria.environment()));
        filters.add(equalsColumn(quotedIdentifier("resource_attributes.hertzbeat.collector.id"),
                criteria.collectorId()));
        filters.add("timestamp >= to_timestamp_millis(" + criteria.startedAt() + ")");
        return "SELECT MAX(timestamp) AS last_received_at FROM " + TRACES_TABLE
                + " WHERE " + String.join(" AND ", filters);
    }

    private String equalsColumn(String column, String value) {
        return column + " = '" + escapeSql(value) + "'";
    }

    private String equalsResourceAttribute(String attribute, String value) {
        return "json_get_string(resource_attributes, '$[\"" + attribute + "\"]') = '"
                + escapeSql(value) + "'";
    }

    private String quotedIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private String escapeSql(String value) {
        return value.replace("'", "''");
    }
}
