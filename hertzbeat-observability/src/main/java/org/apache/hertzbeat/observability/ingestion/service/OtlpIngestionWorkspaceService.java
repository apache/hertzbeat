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

package org.apache.hertzbeat.observability.ingestion.service;

import jakarta.servlet.http.HttpServletRequest;
import org.apache.hertzbeat.common.observability.dto.binding.OtlpEntityBindingSummaryDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionOverviewDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpRelatedMetricsDto;

/**
 * OTLP ingestion workspace aggregation service.
 */
public interface OtlpIngestionWorkspaceService {

    OtlpIngestionOverviewDto getOverview();

    OtlpIngestionGuideDto getGuide(HttpServletRequest request);

    OtlpEntityBindingSummaryDto getBindingSummary();

    OtlpMetricsConsoleDto getMetricsConsole(Long entityId, String entityType, Long start, Long end, String serviceName,
                                            String serviceNamespace, String environment, String query,
                                            String filter, String groupBy, String aggregation,
                                            String temporalAggregation, String step, String limit);

    OtlpMetricsInventoryDto getMetricsInventory(Long entityId, String entityType, Long start, Long end,
                                                String serviceName, String serviceNamespace, String environment,
                                                String limit);

    OtlpRelatedMetricsDto getRelatedMetrics(Long entityId, String entityType, Long start, Long end, String serviceName,
                                            String serviceNamespace, String environment, String filter,
                                            String operationName, String limit);
}
