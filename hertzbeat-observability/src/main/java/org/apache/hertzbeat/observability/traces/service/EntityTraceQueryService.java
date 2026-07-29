/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.traces.service;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.springframework.data.domain.Page;

/**
 * Read-only trace query service.
 */
public interface EntityTraceQueryService {

    /** Complete storage-neutral context for an exact trace detail query. */
    record TraceDetailQuery(
            Long entityId,
            String traceId,
            String spanId,
            Long start,
            Long end,
            String serviceName,
            String serviceNamespace,
            String environment,
            String resourceFilter,
            String attributeFilter,
            Long minDurationMs,
            Long maxDurationMs) {

        private static final String ID_PATTERN = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}";

        public TraceDetailQuery {
            if (!hasSafeId(traceId) || spanId != null && !hasSafeId(spanId)
                    || start != null && start < 0 || end != null && end < 0
                    || start != null && end != null && start > end
                    || minDurationMs != null && minDurationMs < 0
                    || maxDurationMs != null && maxDurationMs < 0
                    || minDurationMs != null && maxDurationMs != null && minDurationMs > maxDurationMs) {
                throw new ObservabilityQueryRequestException();
            }
        }

        private static boolean hasSafeId(String value) {
            return value != null && value.matches(ID_PATTERN);
        }
    }

    EntityTraceSummaryDto buildEntityTraceSummary(ObservedEntityContext entityContext);

    List<EntityTraceQueryHintDto> buildEntityTraceQueryHints(ObservedEntityContext entityContext);

    default Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  int pageIndex, int pageSize) {
        return queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                pageIndex, pageSize, false);
    }

    Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                          String serviceName, String serviceNamespace, String environment,
                                          int pageIndex, int pageSize, Boolean hideInternal);

    Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                          String serviceName, String serviceNamespace, String environment,
                                          String operationName, Long minDurationMs, Long maxDurationMs,
                                          int pageIndex, int pageSize, Boolean hideInternal);

    Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                          String serviceName, String serviceNamespace, String environment,
                                          String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                          int pageIndex, int pageSize, Boolean hideInternal);

    default Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  String resourceFilter, String operationName, Long minDurationMs,
                                                  Long maxDurationMs, int pageIndex, int pageSize, Boolean hideInternal,
                                                  String spanScope) {
        return queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize, hideInternal,
                spanScope, null);
    }

    default Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  String resourceFilter, String operationName, Long minDurationMs,
                                                  Long maxDurationMs, int pageIndex, int pageSize, Boolean hideInternal,
                                                  String spanScope, String attributeFilter) {
        return queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize, hideInternal);
    }

    default TraceDetailDto getTraceDetail(Long entityId, String traceId) {
        return getTraceDetail(new TraceDetailQuery(
                entityId, traceId, null, null, null, null, null, null, null, null, null, null));
    }

    TraceDetailDto getTraceDetail(TraceDetailQuery query);

    List<TraceSpanNodeDto> getTraceSpans(Long entityId, String traceId);

    default TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                              String serviceName, String serviceNamespace, String environment) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment, false);
    }

    TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                      String serviceName, String serviceNamespace, String environment, Boolean hideInternal);

    TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                      String serviceName, String serviceNamespace, String environment,
                                      String operationName, Long minDurationMs, Long maxDurationMs, Boolean hideInternal);

    TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                      String serviceName, String serviceNamespace, String environment,
                                      String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                      Boolean hideInternal);

    default TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                              String serviceName, String serviceNamespace, String environment,
                                              String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                              Boolean hideInternal, String spanScope) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, hideInternal, spanScope, null);
    }

    default TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                              String serviceName, String serviceNamespace, String environment,
                                              String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                              Boolean hideInternal, String spanScope, String attributeFilter) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, hideInternal);
    }

    Map<String, Object> getTraceGroupByStats(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String operationName, Long minDurationMs,
                                             Long maxDurationMs, String groupBy, Integer limit, String orderBy,
                                             Integer minCount, Boolean hideInternal);

    default Map<String, Object> getTraceGroupByStats(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                     String serviceName, String serviceNamespace, String environment,
                                                     String resourceFilter, String operationName, Long minDurationMs,
                                                     Long maxDurationMs, String groupBy, Integer limit, String orderBy,
                                                     Integer minCount, Boolean hideInternal, String spanScope) {
        return getTraceGroupByStats(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace,
                environment, resourceFilter, operationName, minDurationMs, maxDurationMs, groupBy, limit, orderBy,
                minCount, hideInternal, spanScope, null);
    }

    default Map<String, Object> getTraceGroupByStats(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                     String serviceName, String serviceNamespace, String environment,
                                                     String resourceFilter, String operationName, Long minDurationMs,
                                                     Long maxDurationMs, String groupBy, Integer limit, String orderBy,
                                                     Integer minCount, Boolean hideInternal, String spanScope,
                                                     String attributeFilter) {
        return getTraceGroupByStats(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace,
                environment, resourceFilter, operationName, minDurationMs, maxDurationMs, groupBy, limit, orderBy,
                minCount, hideInternal);
    }
}
