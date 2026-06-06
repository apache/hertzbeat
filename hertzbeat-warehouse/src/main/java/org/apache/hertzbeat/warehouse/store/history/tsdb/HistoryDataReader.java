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

package org.apache.hertzbeat.warehouse.store.history.tsdb;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.log.LogEntry;

/**
 * history data reader
 */
public interface HistoryDataReader {

    /**
     * @return data storage available
     */
    boolean isServerAvailable();

    private static boolean hasLogAttributeFilters(Map<String, String> resourceFilters,
                                                  Map<String, String> attributeFilters) {
        return (resourceFilters != null && !resourceFilters.isEmpty())
                || (attributeFilters != null && !attributeFilters.isEmpty());
    }

    /**
     * query history range metrics data from tsdb
     *
     * @param instance instance e.g. ip:port or ip or domain
     * @param app      monitor type
     * @param metrics  metrics
     * @param metric   metric
     * @param history  range
     * @return metrics data
     */
    Map<String, List<Value>> getHistoryMetricData(String instance, String app, String metrics, String metric, String history);

    /**
     * query history metrics data with absolute time bounds when supported by the storage engine
     *
     * @param instance instance e.g. ip:port or ip or domain
     * @param app      monitor type
     * @param metrics  metrics
     * @param metric   metric
     * @param history  fallback range
     * @param start    query start time in milliseconds
     * @param end      query end time in milliseconds
     * @param step     query step, for example 60s or 5m
     * @return metrics data
     */
    default Map<String, List<Value>> getHistoryMetricData(String instance, String app, String metrics, String metric,
                                                          String history, Long start, Long end, String step) {
        return getHistoryMetricData(instance, app, metrics, metric, history);
    }

    /**
     * query history range interval metrics data from tsdb
     * max min mean metrics value
     *
     * @param instance instance e.g. ip:port or ip or domain
     * @param app      monitor type
     * @param metrics  metrics
     * @param metric   metric
     * @param history  history range
     * @return metrics data
     */
    Map<String, List<Value>> getHistoryIntervalMetricData(String instance, String app, String metrics, String metric, String history);

    /**
     * query history interval metrics data with absolute time bounds when supported by the storage engine
     *
     * @param instance instance e.g. ip:port or ip or domain
     * @param app      monitor type
     * @param metrics  metrics
     * @param metric   metric
     * @param history  fallback range
     * @param start    query start time in milliseconds
     * @param end      query end time in milliseconds
     * @param step     query step, for example 60s or 5m
     * @return metrics data
     */
    default Map<String, List<Value>> getHistoryIntervalMetricData(String instance, String app, String metrics,
                                                                  String metric, String history, Long start,
                                                                  Long end, String step) {
        return getHistoryIntervalMetricData(instance, app, metrics, metric, history);
    }

    /**
     * Query logs with multiple filter conditions
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @param searchContent search content in log body
     * @return filtered log entries
     */
    default List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent) {
        throw new UnsupportedOperationException("query logs by multiple conditions is not supported");
    }

    /**
     * Query logs with storage-side workspace noise filters when the backend supports them.
     *
     * @param excludedServiceNames normalized service names that should be omitted
     * @param requireServiceName whether logs without a resolved service name should be omitted
     * @return filtered log entries
     */
    default List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent,
                                                         Set<String> excludedServiceNames,
                                                         boolean requireServiceName) {
        return queryLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent);
    }

    /**
     * Query logs with service/resource context and optional workspace/noise filters.
     */
    default List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent,
                                                         Set<String> excludedServiceNames,
                                                         boolean requireServiceName,
                                                         String workspaceId,
                                                         String serviceName,
                                                         String serviceNamespace,
                                                         String environment) {
        throw new UnsupportedOperationException("query service-scoped logs is not supported");
    }

    /**
     * Query logs with service/resource context plus resource and log attribute predicates.
     */
    default List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent,
                                                         Set<String> excludedServiceNames,
                                                         boolean requireServiceName,
                                                         String workspaceId,
                                                         String serviceName,
                                                         String serviceNamespace,
                                                         String environment,
                                                         Map<String, String> resourceFilters,
                                                         Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return queryLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, excludedServiceNames, requireServiceName,
                    workspaceId, serviceName, serviceNamespace, environment);
        }
        throw new UnsupportedOperationException("query attribute-scoped logs is not supported");
    }

    /**
     * Query logs with multiple filter conditions and pagination (Legacy)
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, Integer offset, Integer limit) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber, severityText, null, offset, limit);
    }

    /**
     * Query logs with multiple filter conditions and pagination including search content
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @param searchContent search content in log body
     * @param offset pagination offset
     * @param limit pagination limit
     * @return filtered log entries with pagination
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, String searchContent,
                                                                       Integer offset, Integer limit) {
        throw new UnsupportedOperationException("query logs by multiple conditions with pagination is not supported");
    }

    /**
     * Query logs with pagination and storage-side workspace noise filters when the backend supports them.
     *
     * @param excludedServiceNames normalized service names that should be omitted
     * @param requireServiceName whether logs without a resolved service name should be omitted
     * @return filtered log entries with pagination
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, String searchContent,
                                                                       Integer offset, Integer limit,
                                                                       Set<String> excludedServiceNames,
                                                                       boolean requireServiceName) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent, offset, limit);
    }

    /**
     * Query logs with pagination, workspace scope, and storage-side noise filters when the backend supports them.
     *
     * @param workspaceId normalized workspace id that should own the returned logs
     * @return filtered log entries with pagination
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, String searchContent,
                                                                       Integer offset, Integer limit,
                                                                       Set<String> excludedServiceNames,
                                                                       boolean requireServiceName,
                                                                       String workspaceId) {
        throw new UnsupportedOperationException("query workspace logs with pagination is not supported");
    }

    /**
     * Query workspace logs with pagination plus resource and log attribute predicates.
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, String searchContent,
                                                                       Integer offset, Integer limit,
                                                                       Set<String> excludedServiceNames,
                                                                       boolean requireServiceName,
                                                                       String workspaceId,
                                                                       Map<String, String> resourceFilters,
                                                                       Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, offset, limit, excludedServiceNames, requireServiceName, workspaceId);
        }
        throw new UnsupportedOperationException("query attribute-scoped workspace logs with pagination is not supported");
    }

    /**
     * Query logs with pagination, service/resource context, workspace scope, and storage-side noise filters.
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, String searchContent,
                                                                       Integer offset, Integer limit,
                                                                       Set<String> excludedServiceNames,
                                                                       boolean requireServiceName,
                                                                       String workspaceId,
                                                                       String serviceName,
                                                                       String serviceNamespace,
                                                                       String environment) {
        throw new UnsupportedOperationException("query service-scoped logs with pagination is not supported");
    }

    /**
     * Query logs with pagination plus resource and log attribute predicates.
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, String searchContent,
                                                                       Integer offset, Integer limit,
                                                                       Set<String> excludedServiceNames,
                                                                       boolean requireServiceName,
                                                                       String workspaceId,
                                                                       String serviceName,
                                                                       String serviceNamespace,
                                                                       String environment,
                                                                       Map<String, String> resourceFilters,
                                                                       Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, offset, limit, excludedServiceNames, requireServiceName,
                    workspaceId, serviceName, serviceNamespace, environment);
        }
        throw new UnsupportedOperationException("query attribute-scoped logs with pagination is not supported");
    }

    /**
     * Count logs with multiple filter conditions (Legacy)
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText, null);
    }

    /**
     * Count logs with multiple filter conditions including search content
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @param searchContent search content in log body
     * @return count of matching log entries
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText, String searchContent) {
        throw new UnsupportedOperationException("count logs by multiple conditions is not supported");
    }

    /**
     * Count logs with storage-side workspace noise filters when the backend supports them.
     *
     * @param excludedServiceNames normalized service names that should be omitted
     * @param requireServiceName whether logs without a resolved service name should be omitted
     * @return count of matching log entries
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText, String searchContent,
                                               Set<String> excludedServiceNames,
                                               boolean requireServiceName) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                severityText, searchContent);
    }

    /**
     * Count logs with workspace scope and storage-side noise filters when the backend supports them.
     *
     * @param workspaceId normalized workspace id that should own the counted logs
     * @return count of matching log entries
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText, String searchContent,
                                               Set<String> excludedServiceNames,
                                               boolean requireServiceName,
                                               String workspaceId) {
        throw new UnsupportedOperationException("count workspace logs is not supported");
    }

    /**
     * Count workspace logs with resource and log attribute predicates.
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText, String searchContent,
                                               Set<String> excludedServiceNames,
                                               boolean requireServiceName,
                                               String workspaceId,
                                               Map<String, String> resourceFilters,
                                               Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, excludedServiceNames, requireServiceName, workspaceId);
        }
        throw new UnsupportedOperationException("count attribute-scoped workspace logs is not supported");
    }

    /**
     * Count logs with service/resource context, workspace scope, and storage-side noise filters.
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText, String searchContent,
                                               Set<String> excludedServiceNames,
                                               boolean requireServiceName,
                                               String workspaceId,
                                               String serviceName,
                                               String serviceNamespace,
                                               String environment) {
        throw new UnsupportedOperationException("count service-scoped logs is not supported");
    }

    /**
     * Count logs with resource and log attribute predicates.
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText, String searchContent,
                                               Set<String> excludedServiceNames,
                                               boolean requireServiceName,
                                               String workspaceId,
                                               String serviceName,
                                               String serviceNamespace,
                                               String environment,
                                               Map<String, String> resourceFilters,
                                               Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, excludedServiceNames, requireServiceName,
                    workspaceId, serviceName, serviceNamespace, environment);
        }
        throw new UnsupportedOperationException("count attribute-scoped logs is not supported");
    }

    /**
     * Aggregate log severity buckets in the storage engine when supported.
     *
     * @return a map with totalCount, fatalCount, errorCount, warnCount, infoCount, debugCount, traceCount
     */
    default Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent,
                                                         Set<String> excludedServiceNames,
                                                         boolean requireServiceName) {
        throw new UnsupportedOperationException("count log severity buckets is not supported");
    }

    /**
     * Aggregate log severity buckets with workspace scope in the storage engine when supported.
     *
     * @param workspaceId normalized workspace id that should own the aggregated logs
     * @return a map with totalCount, fatalCount, errorCount, warnCount, infoCount, debugCount, traceCount
     */
    default Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent,
                                                         Set<String> excludedServiceNames,
                                                         boolean requireServiceName,
                                                         String workspaceId) {
        throw new UnsupportedOperationException("count workspace log severity buckets is not supported");
    }

    /**
     * Aggregate log severity buckets with service/resource context.
     */
    default Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent,
                                                         Set<String> excludedServiceNames,
                                                         boolean requireServiceName,
                                                         String workspaceId,
                                                         String serviceName,
                                                         String serviceNamespace,
                                                         String environment) {
        throw new UnsupportedOperationException("count service-scoped log severity buckets is not supported");
    }

    /**
     * Aggregate log severity buckets with resource and log attribute predicates.
     */
    default Map<String, Long> countLogsBySeverityBuckets(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent,
                                                         Set<String> excludedServiceNames,
                                                         boolean requireServiceName,
                                                         String workspaceId,
                                                         String serviceName,
                                                         String serviceNamespace,
                                                         String environment,
                                                         Map<String, String> resourceFilters,
                                                         Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return countLogsBySeverityBuckets(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, excludedServiceNames, requireServiceName,
                    workspaceId, serviceName, serviceNamespace, environment);
        }
        throw new UnsupportedOperationException("count attribute-scoped log severity buckets is not supported");
    }

    /**
     * Aggregate log trace coverage in the storage engine when supported.
     *
     * @return a map with withTrace, withoutTrace, withSpan, withBothTraceAndSpan
     */
    default Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                    String spanId, Integer severityNumber,
                                                    String severityText, String searchContent,
                                                    Set<String> excludedServiceNames,
                                                    boolean requireServiceName) {
        throw new UnsupportedOperationException("count log trace coverage is not supported");
    }

    /**
     * Aggregate log trace coverage with workspace scope in the storage engine when supported.
     *
     * @param workspaceId normalized workspace id that should own the aggregated logs
     * @return a map with withTrace, withoutTrace, withSpan, withBothTraceAndSpan
     */
    default Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                    String spanId, Integer severityNumber,
                                                    String severityText, String searchContent,
                                                    Set<String> excludedServiceNames,
                                                    boolean requireServiceName,
                                                    String workspaceId) {
        throw new UnsupportedOperationException("count workspace log trace coverage is not supported");
    }

    /**
     * Aggregate log trace coverage with service/resource context.
     */
    default Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                    String spanId, Integer severityNumber,
                                                    String severityText, String searchContent,
                                                    Set<String> excludedServiceNames,
                                                    boolean requireServiceName,
                                                    String workspaceId,
                                                    String serviceName,
                                                    String serviceNamespace,
                                                    String environment) {
        throw new UnsupportedOperationException("count service-scoped log trace coverage is not supported");
    }

    /**
     * Aggregate log trace coverage with resource and log attribute predicates.
     */
    default Map<String, Long> countLogTraceCoverage(Long startTime, Long endTime, String traceId,
                                                    String spanId, Integer severityNumber,
                                                    String severityText, String searchContent,
                                                    Set<String> excludedServiceNames,
                                                    boolean requireServiceName,
                                                    String workspaceId,
                                                    String serviceName,
                                                    String serviceNamespace,
                                                    String environment,
                                                    Map<String, String> resourceFilters,
                                                    Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return countLogTraceCoverage(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, excludedServiceNames, requireServiceName,
                    workspaceId, serviceName, serviceNamespace, environment);
        }
        throw new UnsupportedOperationException("count attribute-scoped log trace coverage is not supported");
    }

    /**
     * Aggregate log counts by hour in the storage engine when supported.
     *
     * @return a map keyed by yyyy-MM-dd HH:00
     */
    default Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName) {
        throw new UnsupportedOperationException("count logs by hour is not supported");
    }

    /**
     * Aggregate log counts by hour with workspace scope in the storage engine when supported.
     *
     * @param workspaceId normalized workspace id that should own the aggregated logs
     * @return a map keyed by yyyy-MM-dd HH:00
     */
    default Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId) {
        throw new UnsupportedOperationException("count workspace logs by hour is not supported");
    }

    /**
     * Aggregate log counts by hour with service/resource context.
     */
    default Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId,
                                             String serviceName,
                                             String serviceNamespace,
                                             String environment) {
        throw new UnsupportedOperationException("count service-scoped logs by hour is not supported");
    }

    /**
     * Aggregate log counts by hour with resource and log attribute predicates.
     */
    default Map<String, Long> countLogsByHour(Long startTime, Long endTime, String traceId,
                                             String spanId, Integer severityNumber,
                                             String severityText, String searchContent,
                                             Set<String> excludedServiceNames,
                                             boolean requireServiceName,
                                             String workspaceId,
                                             String serviceName,
                                             String serviceNamespace,
                                             String environment,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters) {
        if (!hasLogAttributeFilters(resourceFilters, attributeFilters)) {
            return countLogsByHour(startTime, endTime, traceId, spanId, severityNumber,
                    severityText, searchContent, excludedServiceNames, requireServiceName,
                    workspaceId, serviceName, serviceNamespace, environment);
        }
        throw new UnsupportedOperationException("count attribute-scoped logs by hour is not supported");
    }

    /**
     * Aggregate log counts by a native log field, resource attribute, or log attribute.
     */
    default Map<String, Long> countLogsByGroup(Long startTime, Long endTime, String traceId,
                                              String spanId, Integer severityNumber,
                                              String severityText, String searchContent,
                                              Set<String> excludedServiceNames,
                                              boolean requireServiceName,
                                              String workspaceId,
                                              String serviceName,
                                              String serviceNamespace,
                                              String environment,
                                              Map<String, String> resourceFilters,
                                              Map<String, String> attributeFilters,
                                              String groupBy) {
        throw new UnsupportedOperationException("count logs by group is not supported");
    }
}
