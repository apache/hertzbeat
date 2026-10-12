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

package org.apache.hertzbeat.common.observability.dto.ingestion;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * OTLP ingestion overview for the unified observability intake center.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtlpIngestionOverviewDto {

    private SignalOverview metrics;

    private SignalOverview logs;

    private SignalOverview traces;

    private int activeSignalCount;

    private Long latestObservedAt;

    private int recentServiceCount;

    private long boundEntityCount;

    private List<RecentSignalEvent> recentEvents;

    private List<ReadinessCheck> readinessChecks;

    public OtlpIngestionOverviewDto(SignalOverview metrics, SignalOverview logs, SignalOverview traces,
                                    int activeSignalCount, Long latestObservedAt, int recentServiceCount,
                                    long boundEntityCount, List<RecentSignalEvent> recentEvents) {
        this(metrics, logs, traces, activeSignalCount, latestObservedAt, recentServiceCount, boundEntityCount,
                recentEvents, List.of());
    }

    /**
     * Signal-level overview shown in the OTLP intake center.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignalOverview {
        private String signal;
        private boolean active;
        private long totalCount;
        private Long latestObservedAt;
        private String intakeMode;
        private String summary;
    }

    /**
     * Recent telemetry event highlighted in the OTLP intake center.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentSignalEvent {
        private String signal;
        private String title;
        private String detail;
        private Long observedAt;
    }

    /**
     * Backend-backed readiness check shown in the OTLP intake center.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReadinessCheck {
        private String key;
        private String title;
        private String status;
        private String summary;
        private String detail;
        private Long checkedAt;
    }
}
