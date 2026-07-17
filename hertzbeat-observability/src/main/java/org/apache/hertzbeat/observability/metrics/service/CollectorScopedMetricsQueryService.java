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

package org.apache.hertzbeat.observability.metrics.service;

import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;

/**
 * Applies Collector identity scope before delegating to the existing metrics console.
 */
public interface CollectorScopedMetricsQueryService {

    OtlpMetricsConsoleDto query(Request request);

    /**
     * Storage-neutral metrics console request including the optional Collector scope.
     */
    record Request(
            Long entityId,
            String entityType,
            Long start,
            Long end,
            String serviceName,
            String serviceNamespace,
            String environment,
            String collectorId,
            String query,
            String filter,
            String groupBy,
            String aggregation,
            String temporalAggregation,
            String step,
            String limit,
            String operationName
    ) {
    }
}
