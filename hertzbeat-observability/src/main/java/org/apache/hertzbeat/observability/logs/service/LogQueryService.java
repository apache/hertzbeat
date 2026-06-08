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

import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.data.domain.Page;

/**
 * Log query application service.
 */
public interface LogQueryService {

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

    default Map<String, Object> trendStats(Long start, Long end, String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search,
                                           boolean hideInternal, boolean hideNoise) {
        return trendStats(start, end, traceId, spanId, severityNumber, severityText, search,
                null, null, null, hideInternal, hideNoise);
    }

    Map<String, Object> trendStats(Long start, Long end, String traceId, String spanId,
                                   Integer severityNumber, String severityText, String search,
                                   String serviceName, String serviceNamespace, String environment,
                                   boolean hideInternal, boolean hideNoise);

    default Map<String, Object> trendStats(Long start, Long end, String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search,
                                           String serviceName, String serviceNamespace, String environment,
                                           String resourceFilter, String attributeFilter,
                                           boolean hideInternal, boolean hideNoise) {
        return trendStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, hideInternal, hideNoise);
    }

    default Map<String, Object> trendStats(Long entityId, Long start, Long end, String traceId, String spanId,
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
