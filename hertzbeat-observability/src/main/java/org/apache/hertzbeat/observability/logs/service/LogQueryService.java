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

package org.apache.hertzbeat.observability.logs.service;

import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogQuerySet;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.observability.logs.query.LogQuerySetParser;
import org.apache.hertzbeat.observability.logs.query.LogCalculatedParser;
import org.apache.hertzbeat.common.observability.dto.log.LogTransactions;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.springframework.data.domain.Page;

/**
 * Log query application service.
 */
public interface LogQueryService {
    /** Selected context restrictions, separate from authored transaction seed filters. */
    record ContextFilters(String resourceFilter, String attributeFilter) { }

    LogTransactions.Result transactions(FacetQuery query, ContextFilters context, LogTransactions.Request request);

    LogTransactions.DetailResult transactionDetail(FacetQuery query, ContextFilters context,
                                                   LogTransactions.Request request, LogTransactions.Detail detail);

    LogComparison.Result compare(FacetQuery query, LogAnalysis.Request request,
            java.util.List<LogComparisonParser.Query> queries, String formula);

    LogQuerySet.Result querySet(FacetQuery query, LogQuerySetParser.Envelope envelope);

    LogCalculated.Result calculated(FacetQuery query, LogCalculatedParser.Envelope envelope);

    org.apache.hertzbeat.common.observability.dto.log.LogSubquery.Result subquery(
            FacetQuery query, org.apache.hertzbeat.observability.logs.query.LogSubqueryParser.Envelope envelope);

    LogCalculated.Preview calculatedPreview(LogCalculated.Definition definition, String sample);

    void calculatedPattern(String pattern);

    LogAnalysis.Result analysis(FacetQuery query, LogAnalysis.Request request);

    /** Submitted facet scope before canonical entity resolution. */
    record FacetQuery(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                      Integer severityNumber, String severityText, LogSeverityCategory severityCategory, String search,
                      String serviceName, String serviceNamespace, String environment,
                      String resourceFilter, String attributeFilter, boolean hideInternal, boolean hideNoise, String searchSyntax, String logGroupSelection, String logNumericRange) {
        public FacetQuery(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                          Integer severityNumber, String severityText, LogSeverityCategory severityCategory, String search,
                          String serviceName, String serviceNamespace, String environment, String resourceFilter, String attributeFilter,
                          boolean hideInternal, boolean hideNoise, String searchSyntax, String logGroupSelection) {
            this(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, severityCategory,
                    search, serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                    hideInternal, hideNoise, searchSyntax, logGroupSelection, null);
        }

        public FacetQuery(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                          Integer severityNumber, String severityText, LogSeverityCategory severityCategory, String search,
                          String serviceName, String serviceNamespace, String environment,
                          String resourceFilter, String attributeFilter, boolean hideInternal, boolean hideNoise, String searchSyntax) {
            this(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, severityCategory,
                    search, serviceName, serviceNamespace, environment, resourceFilter, attributeFilter, hideInternal, hideNoise, searchSyntax, null);
        }

        public FacetQuery(String workspaceId, Long entityId, long start, long end, String traceId, String spanId,
                          Integer severityNumber, String severityText, LogSeverityCategory severityCategory, String search,
                          String serviceName, String serviceNamespace, String environment,
                          String resourceFilter, String attributeFilter, boolean hideInternal, boolean hideNoise) {
            this(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, severityCategory,
                    search, serviceName, serviceNamespace, environment, resourceFilter, attributeFilter, hideInternal, hideNoise, null);
        }
    }

    Page<LogEntry> sortedList(FacetQuery query, Integer pageIndex, Integer pageSize, LogSort sort);

    Page<LogEntry> structuredList(FacetQuery query, Integer pageIndex, Integer pageSize, String sort);

    Map<String, Object> structuredOverview(FacetQuery query);

    Map<String, Long> structuredTraceCoverage(FacetQuery query);

    LogTrend structuredTrend(FacetQuery query);

    Map<String, Object> structuredGroups(FacetQuery query, String groupBy, Integer limit, String orderBy, Integer minCount);

    LogFacets.Fields facetFields(FacetQuery query);

    LogFacets.Values facetValues(FacetQuery query, LogFacets.Field field, int limit);

    LogFacets.Values facetValues(FacetQuery query, LogFacets.Field field, int limit, String valueSearch);

    Page<LogEntry> list(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                        Integer severityNumber, String severityText, String search,
                        String serviceName, String serviceNamespace, String environment,
                        String resourceFilter, String attributeFilter, Integer pageIndex, Integer pageSize,
                        boolean hideInternal, boolean hideNoise, LogSeverityCategory severityCategory, String sort);



    Page<LogEntry> list(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                        Integer severityNumber, String severityText, String search,
                        String serviceName, String serviceNamespace, String environment,
                        String resourceFilter, String attributeFilter,
                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise);

    Page<LogEntry> list(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                        Integer severityNumber, String severityText, String search,
                        String serviceName, String serviceNamespace, String environment,
                        String resourceFilter, String attributeFilter,
                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise,
                        LogSeverityCategory severityCategory);

    Map<String, Object> context(String workspaceId, Long entityId, Long logTimeUnixNano, Long start, Long end,
                                String serviceName, String serviceNamespace, String environment,
                                String resourceFilter, String attributeFilter,
                                Integer limit, String direction, Long cursorLogTimeUnixNano,
                                boolean hideInternal, boolean hideNoise);

    Map<String, Object> overviewStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                      String spanId, Integer severityNumber, String severityText, String search,
                                      String serviceName, String serviceNamespace, String environment,
                                      String resourceFilter, String attributeFilter,
                                      boolean hideInternal, boolean hideNoise);

    Map<String, Object> overviewStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                      String spanId, Integer severityNumber, String severityText, String search,
                                      String serviceName, String serviceNamespace, String environment,
                                      String resourceFilter, String attributeFilter,
                                      boolean hideInternal, boolean hideNoise,
                                      LogSeverityCategory severityCategory);

    Map<String, Object> traceCoverageStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                           String spanId, Integer severityNumber, String severityText, String search,
                                           String serviceName, String serviceNamespace, String environment,
                                           String resourceFilter, String attributeFilter,
                                           boolean hideInternal, boolean hideNoise);

    Map<String, Object> traceCoverageStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                           String spanId, Integer severityNumber, String severityText, String search,
                                           String serviceName, String serviceNamespace, String environment,
                                           String resourceFilter, String attributeFilter,
                                           boolean hideInternal, boolean hideNoise,
                                           LogSeverityCategory severityCategory);

    LogTrend trendStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                        String spanId, Integer severityNumber, String severityText, String search,
                        String serviceName, String serviceNamespace, String environment,
                        String resourceFilter, String attributeFilter,
                        boolean hideInternal, boolean hideNoise);

    LogTrend trendStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                        String spanId, Integer severityNumber, String severityText, String search,
                        String serviceName, String serviceNamespace, String environment,
                        String resourceFilter, String attributeFilter,
                        boolean hideInternal, boolean hideNoise,
                        LogSeverityCategory severityCategory);

    Map<String, Object> groupByStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                     String spanId, Integer severityNumber, String severityText, String search,
                                     String serviceName, String serviceNamespace, String environment,
                                     String resourceFilter, String attributeFilter, String groupBy,
                                     Integer limit, String orderBy, Integer minCount,
                                     boolean hideInternal, boolean hideNoise);

    Map<String, Object> groupByStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                     String spanId, Integer severityNumber, String severityText, String search,
                                     String serviceName, String serviceNamespace, String environment,
                                     String resourceFilter, String attributeFilter, String groupBy,
                                     Integer limit, String orderBy, Integer minCount,
                                     boolean hideInternal, boolean hideNoise,
                                     LogSeverityCategory severityCategory);

    default Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                                Integer severityNumber, String severityText, String search,
                                Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        return list(start, end, traceId, spanId, severityNumber, severityText, search,
                null, null, null, pageIndex, pageSize, hideInternal, hideNoise);
    }

    Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                        Integer severityNumber, String severityText, String search,
                        String serviceName, String serviceNamespace, String environment,
                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise);

    default Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                                Integer severityNumber, String severityText, String search,
                                String serviceName, String serviceNamespace, String environment,
                                String resourceFilter, String attributeFilter,
                                Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        return list(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, pageIndex, pageSize, hideInternal, hideNoise);
    }

    default Page<LogEntry> list(Long entityId, Long start, Long end, String traceId, String spanId,
                                Integer severityNumber, String severityText, String search,
                                String serviceName, String serviceNamespace, String environment,
                                String resourceFilter, String attributeFilter,
                                Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        return list(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                pageIndex, pageSize, hideInternal, hideNoise);
    }

    default Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                              Integer severityNumber, String severityText, String search,
                                              boolean hideInternal, boolean hideNoise) {
        return overviewStats(start, end, traceId, spanId, severityNumber, severityText, search,
                null, null, null, hideInternal, hideNoise);
    }

    Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                      Integer severityNumber, String severityText, String search,
                                      String serviceName, String serviceNamespace, String environment,
                                      boolean hideInternal, boolean hideNoise);

    default Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                              Integer severityNumber, String severityText, String search,
                                              String serviceName, String serviceNamespace, String environment,
                                              String resourceFilter, String attributeFilter,
                                              boolean hideInternal, boolean hideNoise) {
        return overviewStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, hideInternal, hideNoise);
    }

    default Map<String, Object> overviewStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                              Integer severityNumber, String severityText, String search,
                                              String serviceName, String serviceNamespace, String environment,
                                              String resourceFilter, String attributeFilter,
                                              boolean hideInternal, boolean hideNoise) {
        return overviewStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                hideInternal, hideNoise);
    }

    default Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                                   Integer severityNumber, String severityText, String search,
                                                   boolean hideInternal, boolean hideNoise) {
        return traceCoverageStats(start, end, traceId, spanId, severityNumber, severityText, search,
                null, null, null, hideInternal, hideNoise);
    }

    Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search,
                                           String serviceName, String serviceNamespace, String environment,
                                           boolean hideInternal, boolean hideNoise);

    default Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                                   Integer severityNumber, String severityText, String search,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   String resourceFilter, String attributeFilter,
                                                   boolean hideInternal, boolean hideNoise) {
        return traceCoverageStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, hideInternal, hideNoise);
    }

    default Map<String, Object> traceCoverageStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                                   Integer severityNumber, String severityText, String search,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   String resourceFilter, String attributeFilter,
                                                   boolean hideInternal, boolean hideNoise) {
        return traceCoverageStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                hideInternal, hideNoise);
    }

    default LogTrend trendStats(Long start, Long end, String traceId, String spanId,
                                Integer severityNumber, String severityText, String search,
                                boolean hideInternal, boolean hideNoise) {
        return trendStats(start, end, traceId, spanId, severityNumber, severityText, search,
                null, null, null, hideInternal, hideNoise);
    }

    LogTrend trendStats(Long start, Long end, String traceId, String spanId,
                        Integer severityNumber, String severityText, String search,
                        String serviceName, String serviceNamespace, String environment,
                        boolean hideInternal, boolean hideNoise);

    default LogTrend trendStats(Long start, Long end, String traceId, String spanId,
                                Integer severityNumber, String severityText, String search,
                                String serviceName, String serviceNamespace, String environment,
                                String resourceFilter, String attributeFilter,
                                boolean hideInternal, boolean hideNoise) {
        return trendStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, hideInternal, hideNoise);
    }

    default LogTrend trendStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                Integer severityNumber, String severityText, String search,
                                String serviceName, String serviceNamespace, String environment,
                                String resourceFilter, String attributeFilter,
                                boolean hideInternal, boolean hideNoise) {
        return trendStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                hideInternal, hideNoise);
    }

    Map<String, Object> groupByStats(Long start, Long end, String traceId, String spanId,
                                     Integer severityNumber, String severityText, String search,
                                     String serviceName, String serviceNamespace, String environment,
                                     String resourceFilter, String attributeFilter, String groupBy,
                                     Integer limit, String orderBy, Integer minCount,
                                     boolean hideInternal, boolean hideNoise);

    default Map<String, Object> groupByStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String attributeFilter, String groupBy,
                                             Integer limit, String orderBy, Integer minCount,
                                             boolean hideInternal, boolean hideNoise) {
        return groupByStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter, groupBy,
                limit, orderBy, minCount, hideInternal, hideNoise);
    }

    Map<String, Object> context(Long logTimeUnixNano, Long start, Long end,
                                String serviceName, String serviceNamespace, String environment,
                                String resourceFilter, String attributeFilter,
                                Integer limit, boolean hideInternal, boolean hideNoise);

    default Map<String, Object> context(Long logTimeUnixNano, Long start, Long end,
                                        String serviceName, String serviceNamespace, String environment,
                                        String resourceFilter, String attributeFilter,
                                        Integer limit, String direction, Long cursorLogTimeUnixNano,
                                        boolean hideInternal, boolean hideNoise) {
        return context(logTimeUnixNano, start, end, serviceName, serviceNamespace, environment,
                resourceFilter, attributeFilter, limit, hideInternal, hideNoise);
    }

    default Map<String, Object> context(Long entityId, Long logTimeUnixNano, Long start, Long end,
                                        String serviceName, String serviceNamespace, String environment,
                                        String resourceFilter, String attributeFilter,
                                        Integer limit, String direction, Long cursorLogTimeUnixNano,
                                        boolean hideInternal, boolean hideNoise) {
        return context(logTimeUnixNano, start, end, serviceName, serviceNamespace, environment,
                resourceFilter, attributeFilter, limit, direction, cursorLogTimeUnixNano,
                hideInternal, hideNoise);
    }
}
