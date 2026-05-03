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

package org.apache.hertzbeat.common.observability.dto.metrics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;

/**
 * Aggregated OTLP metrics console response.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class OtlpMetricsConsoleDto {

    private Context context;

    private String query;

    private String datasource;

    private String queryMode;

    private DatasourceQueryData results;

    private Stats stats;

    private String emptyStateReason;

    private String errorMessage;

    /**
     * Resolved OTLP metrics console context.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Context {

        private Long entityId;

        private String entityName;

        private String serviceName;

        private String serviceNamespace;

        private String environment;

        private Long start;

        private Long end;
    }

    /**
     * OTLP metrics console statistics.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Stats {

        private int totalSeries;

        private int nonEmptySeries;

        private Long latestObservedAt;
    }
}
