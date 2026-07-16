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

package org.apache.hertzbeat.log.service;

import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsConsole;
import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsInventory;
import org.apache.hertzbeat.common.entity.dto.observability.SignalPage;
import org.apache.hertzbeat.common.entity.dto.observability.TraceDetail;
import org.apache.hertzbeat.common.entity.dto.observability.TraceListItem;
import org.apache.hertzbeat.common.entity.dto.observability.TraceOverview;

/** Entity-free query boundary for OTLP metrics and traces. */
public interface ThreeSignalQueryService {

    OtlpMetricsConsole queryMetrics(String query, Long start, Long end, String serviceName,
                                    String serviceNamespace, String environment, String filter, String groupBy,
                                    String aggregation, Integer step, String operationName);

    OtlpMetricsInventory metricInventory(Long start, Long end, String serviceName, String serviceNamespace,
                                         String environment, Integer limit);

    SignalPage<TraceListItem> queryTraces(Long start, Long end, String traceId, Boolean errorOnly,
                                          String serviceName, String serviceNamespace, String environment,
                                          String operationName, Long minDurationMs, Long maxDurationMs,
                                          Integer pageIndex, Integer pageSize);

    TraceOverview traceOverview(Long start, Long end, String traceId, Boolean errorOnly, String serviceName,
                                String serviceNamespace, String environment, String operationName,
                                Long minDurationMs, Long maxDurationMs);

    TraceDetail traceDetail(String traceId);
}
