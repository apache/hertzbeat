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
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.springframework.data.domain.Page;

/**
 * Read-only trace query service.
 */
public interface EntityTraceQueryService {

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

    TraceDetailDto getTraceDetail(Long entityId, String traceId);

    List<TraceSpanNodeDto> getTraceSpans(Long entityId, String traceId);

    default TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                              String serviceName, String serviceNamespace, String environment) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment, false);
    }

    TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                      String serviceName, String serviceNamespace, String environment, Boolean hideInternal);
}
