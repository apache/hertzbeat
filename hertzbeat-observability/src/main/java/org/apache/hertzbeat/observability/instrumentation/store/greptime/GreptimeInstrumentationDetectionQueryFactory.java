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
            case LOGS -> logsQuery(criteria);
            case TRACES -> flattenedTraceResourceQuery(criteria);
            default -> throw new IllegalArgumentException("Unsupported signal");
        };
    }

    private String metricsQuery(DetectionCriteria criteria) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("service_name", criteria.serviceName()));
        filters.add(equalsColumn("service_namespace", criteria.serviceNamespace()));
        filters.add(equalsColumn("deployment_environment_name", criteria.environment()));
        filters.add(collectorColumnPredicate(
                OtlpMetricSemanticLabels.HERTZBEAT_COLLECTOR_ID, criteria.collectorId()));
        addOptionalColumn(filters, OtlpMetricSemanticLabels.SERVICE_INSTANCE_ID, criteria.serviceInstanceId());
        addOptionalColumn(filters, OtlpMetricSemanticLabels.HTTP_ROUTE, criteria.endpoint());
        addTimeWindow(filters, "greptime_timestamp", criteria);
        return "SELECT MAX(greptime_timestamp) AS last_received_at FROM " + METRICS_TABLE
                + " WHERE " + String.join(" AND ", filters);
    }

    private String logsQuery(DetectionCriteria criteria) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("service_name", criteria.serviceName()));
        filters.add(equalsResourceAttribute("service.namespace", criteria.serviceNamespace()));
        filters.add(equalsResourceAttribute("deployment.environment.name", criteria.environment()));
        filters.add(collectorResourcePredicate(criteria.collectorId()));
        addOptionalResourceAttribute(filters, "service.instance.id", criteria.serviceInstanceId());
        addLogEndpointScope(filters, criteria);
        addTimeWindow(filters, "timestamp", criteria);
        return "SELECT MAX(timestamp) AS last_received_at FROM " + LOGS_TABLE
                + " WHERE " + String.join(" AND ", filters);
    }

    private String flattenedTraceResourceQuery(DetectionCriteria criteria) {
        return "SELECT MAX(timestamp) AS last_received_at FROM " + TRACES_TABLE
                + " WHERE " + String.join(" AND ", flattenedTraceFilters(criteria));
    }

    private List<String> flattenedTraceFilters(DetectionCriteria criteria) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("service_name", criteria.serviceName()));
        filters.add(equalsColumn(quotedIdentifier("resource_attributes.service.namespace"),
                criteria.serviceNamespace()));
        filters.add(equalsColumn(quotedIdentifier("resource_attributes.deployment.environment.name"),
                criteria.environment()));
        filters.add(collectorColumnPredicate(
                quotedIdentifier("resource_attributes.hertzbeat.collector.id"), criteria.collectorId()));
        addOptionalColumn(filters, quotedIdentifier("resource_attributes.service.instance.id"),
                criteria.serviceInstanceId());
        addOptionalColumn(filters, quotedIdentifier("span_attributes.http.route"), criteria.endpoint());
        addTimeWindow(filters, "timestamp", criteria);
        return filters;
    }

    private void addLogEndpointScope(List<String> filters, DetectionCriteria criteria) {
        if (criteria.endpoint() == null) {
            return;
        }
        String directEndpoint = equalsJsonAttribute("log_attributes", "http.route", criteria.endpoint());
        String correlatedTrace = "trace_id IN (SELECT trace_id FROM " + TRACES_TABLE
                + " WHERE " + String.join(" AND ", flattenedTraceFilters(criteria)) + ")";
        // Application logs normally carry trace/span IDs, not HTTP span attributes. Correlating
        // against a trace in the same service, collector and time scope preserves endpoint
        // precision without requiring users to duplicate http.route onto every log record.
        filters.add("(" + directEndpoint + " OR " + correlatedTrace + ")");
    }

    private String equalsColumn(String column, String value) {
        return column + " = '" + escapeSql(value) + "'";
    }

    private String equalsResourceAttribute(String attribute, String value) {
        return equalsJsonAttribute("resource_attributes", attribute, value);
    }

    private String equalsJsonAttribute(String column, String attribute, String value) {
        return jsonStringExpression(column, attribute) + " = '" + escapeSql(value) + "'";
    }

    private String jsonStringExpression(String column, String attribute) {
        return "json_get_string(" + column + ", '$[\"" + attribute + "\"]')";
    }

    private String collectorColumnPredicate(String collectorIdColumn, String collectorId) {
        return collectorId == null ? collectorIdColumn + " IS NULL" : equalsColumn(collectorIdColumn, collectorId);
    }

    private String collectorResourcePredicate(String collectorId) {
        if (collectorId == null) {
            return "json_get_string(resource_attributes,'$[\"hertzbeat.collector.id\"]') IS NULL";
        }
        return equalsResourceAttribute("hertzbeat.collector.id", collectorId);
    }

    private void addOptionalColumn(List<String> filters, String column, String value) {
        if (value != null) {
            filters.add(equalsColumn(column, value));
        }
    }

    private void addOptionalResourceAttribute(List<String> filters, String attribute, String value) {
        addOptionalJsonAttribute(filters, "resource_attributes", attribute, value);
    }

    private void addOptionalJsonAttribute(
            List<String> filters, String column, String attribute, String value) {
        if (value != null) {
            filters.add(equalsJsonAttribute(column, attribute, value));
        }
    }

    private void addTimeWindow(List<String> filters, String column, DetectionCriteria criteria) {
        filters.add(column + " >= to_timestamp_millis(" + criteria.startedAt() + ")");
        if (criteria.detectedAt() == Long.MAX_VALUE) {
            filters.add(column + " <= to_timestamp_millis(" + Long.MAX_VALUE + ")");
            return;
        }
        filters.add(column + " < to_timestamp_millis(" + (criteria.detectedAt() + 1) + ")");
    }

    private String quotedIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private String escapeSql(String value) {
        return value.replace("'", "''");
    }
}
