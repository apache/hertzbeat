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

import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.dto.observability.LogQueryFilter;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogTrendBucket;

/**
 * history data reader
 */
public interface HistoryDataReader {

    default org.apache.hertzbeat.common.observability.dto.log.LogCalculated.PageResult calculatedPage(
            org.apache.hertzbeat.common.observability.dto.log.LogCalculated.Query query) {
        throw new UnsupportedOperationException("Calculated log page unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogCalculated.TrendResult calculatedTrend(
            org.apache.hertzbeat.common.observability.dto.log.LogCalculated.Query query) {
        throw new UnsupportedOperationException("Calculated log trend unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogCalculated.FacetResult calculatedFacet(
            org.apache.hertzbeat.common.observability.dto.log.LogCalculated.Query query) {
        throw new UnsupportedOperationException("Calculated log facet unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogCalculated.AnalysisResult calculatedAnalysis(
            org.apache.hertzbeat.common.observability.dto.log.LogCalculated.Query query) {
        throw new UnsupportedOperationException("Calculated log analysis unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogCalculated.Preview calculatedPreview(
            org.apache.hertzbeat.common.observability.dto.log.LogCalculated.Definition definition, String sample) {
        throw new UnsupportedOperationException("Calculated extraction preview unavailable");
    }

    default void calculatedPattern(String pattern) {
        throw new UnsupportedOperationException("Calculated native pattern validation unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogTransactions.Result logTransactions(
            org.apache.hertzbeat.common.observability.dto.log.LogTransactions.Query query) {
        throw new UnsupportedOperationException("Log transactions unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogTransactions.DetailResult logTransactionDetail(
            org.apache.hertzbeat.common.observability.dto.log.LogTransactions.Query query,
            org.apache.hertzbeat.common.observability.dto.log.LogTransactions.Detail detail) {
        throw new UnsupportedOperationException("Log transaction details unavailable");
    }


    default List<LogEntry> querySortedLogs(
            org.apache.hertzbeat.common.observability.dto.log.LogComparison.Source source, int offset, int limit,
            org.apache.hertzbeat.common.observability.dto.log.LogSort sort) {
        throw new UnsupportedOperationException("Business log ordering unavailable");
    }

    default long countSortedLogs(org.apache.hertzbeat.common.observability.dto.log.LogComparison.Source source) {
        throw new UnsupportedOperationException("Business log ordering unavailable");
    }


    default org.apache.hertzbeat.common.observability.dto.log.PreparedLogGroupSelection prepareLogGroupSelection(
            String workspaceId, org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection selection) {
        throw new UnsupportedOperationException("Live exact log selection unavailable");
    }


    default org.apache.hertzbeat.common.observability.dto.log.LogComparison.Result logComparison(
            org.apache.hertzbeat.common.observability.dto.log.LogComparison.Source a,
            org.apache.hertzbeat.common.observability.dto.log.LogComparison.Source b,
            LogAnalysis.Request analysis, long intervalMs, String formula) {
        throw new UnsupportedOperationException("Log comparison unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogComparison.Result logComparison(
            org.apache.hertzbeat.common.observability.dto.log.LogComparison.Source a,
            org.apache.hertzbeat.common.observability.dto.log.LogComparison.Source b,
            LogAnalysis.Request analysis, long intervalMs, String formula, Long timeShiftMs) {
        if (timeShiftMs == null) { return logComparison(a, b, analysis, intervalMs, formula); }
        throw new UnsupportedOperationException("Shifted log comparison unavailable");
    }

    default org.apache.hertzbeat.common.observability.dto.log.LogQuerySet.Result logQuerySet(
            org.apache.hertzbeat.common.observability.dto.log.LogFacets.Window window,
            java.util.List<org.apache.hertzbeat.common.observability.dto.log.LogQuerySet.Population> sources,
            java.util.List<org.apache.hertzbeat.common.observability.dto.log.LogQuerySet.Formula> formulas,
            String view, long intervalMs) {
        throw new UnsupportedOperationException("Log query set unavailable");
    }

    default LogAnalysis.Result logAnalysis(org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery query,
                                           LogAnalysis.Request request, long intervalMs) {
        if (query.selection() != null || query.scope().numericRange() != null) {
            throw new UnsupportedOperationException("Typed log population filter unavailable");
        }
        return logAnalysis(query.scope(), query.expression(), request, intervalMs);
    }

    default LogAnalysis.Result logAnalysis(org.apache.hertzbeat.common.observability.dto.log.LogFacets.Scope scope,
            org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression expression,
            LogAnalysis.Request request, long intervalMs) {
        throw new UnsupportedOperationException("Log analysis unavailable");
    }

    default List<LogEntry> queryStructuredLogs(LogSearchQuery query, int offset, int limit, String sort) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }

    default long countStructuredLogs(LogSearchQuery query) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }

    default Map<String, Long> structuredLogOverview(LogSearchQuery query) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }

    default Map<String, Long> structuredLogTraceCoverage(LogSearchQuery query) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }

    default List<LogTrendBucket> structuredLogTrend(LogSearchQuery query, long intervalMs) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }

    default Map<String, Long> structuredLogGroups(LogSearchQuery query, String groupBy, int limit, String orderBy, long minCount) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }

    default LogFacets.Fields structuredLogFacetFields(LogSearchQuery query) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }

    default LogFacets.Values structuredLogFacetValues(LogSearchQuery query, LogFacets.Field field, int limit, String valueSearch) {
        if (LogFacets.normalizeValueSearch(valueSearch) != null) {
            throw new UnsupportedOperationException("Facet value search unavailable");
        }
        return structuredLogFacetValues(query, field, limit);
    }

    default LogFacets.Values logFacetValues(LogFacets.Scope scope, LogFacets.Field field, int limit, String valueSearch) {
        if (LogFacets.normalizeValueSearch(valueSearch) != null) {
            throw new UnsupportedOperationException("Facet value search unavailable");
        }
        return logFacetValues(scope, field, limit);
    }

    default LogFacets.Values structuredLogFacetValues(LogSearchQuery query, LogFacets.Field field, int limit) {
        throw new UnsupportedOperationException("Structured log search unavailable");
    }


    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
            String spanId, Integer severityNumber, String severityText, String searchContent, Integer offset, Integer limit,
            Set<String> excludedServiceNames, boolean requireServiceName, String workspaceId, String serviceName,
            String serviceNamespace, String environment, Map<String, String> resourceFilters,
            Map<String, String> attributeFilters, LogSeverityCategory severityCategory, String sort) {
        throw new UnsupportedOperationException("Ordered log history unavailable");
    }


    default LogFacets.Values logFacetValues(
            LogFacets.Scope scope,
            LogFacets.Field field, int limit) {
        throw new UnsupportedOperationException("Log facets unavailable");
    }

    default LogFacets.Fields logFacetFields(
            LogFacets.Scope scope) {
        throw new UnsupportedOperationException("Log field discovery unavailable");
    }


    /** Result of a bounded storage reachability observation. */
    enum ServerAvailability {
        AVAILABLE,
        UNAVAILABLE
    }

    /**
     * @return data storage available
     */
    boolean isServerAvailable();

    /**
     * Performs the storage adapter's reachability observation when one is available.
     *
     * <p>The compatibility default retains existing storage behavior. Remote adapters may override
     * this method with a bounded probe and throw {@link WarehouseStorageProbeException} when the
     * probe contract itself fails.</p>
     *
     * @return observed server availability
     */
    default ServerAvailability getServerAvailability() {
        return isServerAvailable() ? ServerAvailability.AVAILABLE : ServerAvailability.UNAVAILABLE;
    }

    private static boolean hasLogAttributeFilters(Map<String, String> resourceFilters,
                                                  Map<String, String> attributeFilters) {
        return (resourceFilters != null && !resourceFilters.isEmpty())
                || (attributeFilters != null && !attributeFilters.isEmpty());
    }

    /**
     * @return cumulative metric samples dropped by the history writer
     */
    default long getDroppedMetricCount() {
        return 0;
    }

    /**
     * @return metric samples currently waiting for history persistence
     */
    default int getPendingMetricCount() {
        return 0;
    }

    /**
     * @return whether this storage supports observability log query
     */
    default boolean supportsLogQuery() {
        return false;
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
                                                         Map<String, String> attributeFilters,
                                                         LogSeverityCategory severityCategory) {
        if (severityCategory != null) {
            throw new UnsupportedOperationException("Severity category filtering is not supported");
        }
        return queryLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent, excludedServiceNames,
                requireServiceName, workspaceId, serviceName, serviceNamespace, environment,
                resourceFilters, attributeFilters);
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
                                                                       Map<String, String> attributeFilters,
                                                                       LogSeverityCategory severityCategory) {
        if (severityCategory != null) {
            throw new UnsupportedOperationException("Severity category filtering is not supported");
        }
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent, offset, limit,
                excludedServiceNames, requireServiceName, workspaceId, serviceName, serviceNamespace,
                environment, resourceFilters, attributeFilters);
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
                                               Map<String, String> attributeFilters,
                                               LogSeverityCategory severityCategory) {
        if (severityCategory != null) {
            throw new UnsupportedOperationException("Severity category filtering is not supported");
        }
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent, excludedServiceNames,
                requireServiceName, workspaceId, serviceName, serviceNamespace, environment,
                resourceFilters, attributeFilters);
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
                                                         Map<String, String> attributeFilters,
                                                         LogSeverityCategory severityCategory) {
        if (severityCategory != null) {
            throw new UnsupportedOperationException("Severity category filtering is not supported");
        }
        return countLogsBySeverityBuckets(startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent, excludedServiceNames,
                requireServiceName, workspaceId, serviceName, serviceNamespace, environment,
                resourceFilters, attributeFilters);
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
                                                    Map<String, String> attributeFilters,
                                                    LogSeverityCategory severityCategory) {
        if (severityCategory != null) {
            throw new UnsupportedOperationException("Severity category filtering is not supported");
        }
        return countLogTraceCoverage(startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent, excludedServiceNames,
                requireServiceName, workspaceId, serviceName, serviceNamespace, environment,
                resourceFilters, attributeFilters);
    }

    /**
     * Aggregate log counts by an epoch-aligned interval in the storage engine when supported.
     */
    default List<LogTrendBucket> countLogsByInterval(Long startTime, Long endTime, long intervalMs,
                                                     String traceId, String spanId, Integer severityNumber,
                                                     String severityText, String searchContent,
                                                     Set<String> excludedServiceNames,
                                                     boolean requireServiceName) {
        throw new UnsupportedOperationException("count logs by interval is not supported");
    }

    /**
     * Aggregate log counts by an epoch-aligned interval with workspace scope.
     */
    default List<LogTrendBucket> countLogsByInterval(Long startTime, Long endTime, long intervalMs,
                                                     String traceId, String spanId, Integer severityNumber,
                                                     String severityText, String searchContent,
                                                     Set<String> excludedServiceNames,
                                                     boolean requireServiceName,
                                                     String workspaceId) {
        throw new UnsupportedOperationException("count workspace logs by interval is not supported");
    }

    /**
     * Aggregate log counts by an epoch-aligned interval with service/resource context.
     */
    default List<LogTrendBucket> countLogsByInterval(Long startTime, Long endTime, long intervalMs,
                                                     String traceId, String spanId, Integer severityNumber,
                                                     String severityText, String searchContent,
                                                     Set<String> excludedServiceNames,
                                                     boolean requireServiceName,
                                                     String workspaceId,
                                                     String serviceName,
                                                     String serviceNamespace,
                                                     String environment) {
        throw new UnsupportedOperationException("count service-scoped logs by interval is not supported");
    }

    /**
     * Aggregate log counts by an epoch-aligned interval with resource and log attribute predicates.
     */
    default List<LogTrendBucket> countLogsByInterval(Long startTime, Long endTime, long intervalMs,
                                                     String traceId, String spanId, Integer severityNumber,
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
            return countLogsByInterval(startTime, endTime, intervalMs, traceId, spanId, severityNumber,
                    severityText, searchContent, excludedServiceNames, requireServiceName,
                    workspaceId, serviceName, serviceNamespace, environment);
        }
        throw new UnsupportedOperationException("count attribute-scoped logs by interval is not supported");
    }

    default List<LogTrendBucket> countLogsByInterval(Long startTime, Long endTime, long intervalMs,
                                                     String traceId, String spanId, Integer severityNumber,
                                                     String severityText, String searchContent,
                                                     Set<String> excludedServiceNames,
                                                     boolean requireServiceName,
                                                     String workspaceId,
                                                     String serviceName,
                                                     String serviceNamespace,
                                                     String environment,
                                                     Map<String, String> resourceFilters,
                                                     Map<String, String> attributeFilters,
                                                     LogSeverityCategory severityCategory) {
        if (severityCategory != null) {
            throw new UnsupportedOperationException("Severity category filtering is not supported");
        }
        return countLogsByInterval(startTime, endTime, intervalMs, traceId, spanId, severityNumber, severityText, searchContent,
                excludedServiceNames, requireServiceName, workspaceId, serviceName, serviceNamespace,
                environment, resourceFilters, attributeFilters);
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

    /** Query the transition workbench using OTLP resource semantics. */
    default List<LogEntry> queryObservabilityLogs(LogQueryFilter filter, Integer offset, Integer limit) {
        return queryLogsByMultipleConditionsWithPagination(filter.start(), filter.end(), filter.traceId(),
                filter.spanId(), filter.severityNumber(), filter.severityText(), filter.search(), offset, limit);
    }

    /** Count the transition workbench result using OTLP resource semantics. */
    default long countObservabilityLogs(LogQueryFilter filter) {
        return countLogsByMultipleConditions(filter.start(), filter.end(), filter.traceId(), filter.spanId(),
                filter.severityNumber(), filter.severityText(), filter.search());
    }

    /** Return severity and trace coverage in one storage aggregation. */
    default Map<String, Object> queryLogOverviewAggregate(LogQueryFilter filter) {
        throw new UnsupportedOperationException("query log overview aggregate is not supported");
    }

    /** Return log counts grouped by hour in one storage aggregation. */
    default Map<String, Long> queryLogTrendAggregate(LogQueryFilter filter) {
        throw new UnsupportedOperationException("query log trend aggregate is not supported");
    }

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
                                              String groupBy,
                                              LogSeverityCategory severityCategory) {
        if (severityCategory != null) {
            throw new UnsupportedOperationException("Severity category filtering is not supported");
        }
        return countLogsByGroup(startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent, excludedServiceNames,
                requireServiceName, workspaceId, serviceName, serviceNamespace, environment,
                resourceFilters, attributeFilters, groupBy);
    }
}
