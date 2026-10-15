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
 * Recent OTLP ingest request/error/duration summary.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtlpIngestionRedSummaryDto {

    private String workspaceId;

    private long requestCount;

    private double requestRatePerMinute;

    private long errorCount;

    private double errorRate;

    private long requestBytes;

    private long signalItems;

    private Long averageSignalItems;

    private Long maxSignalItems;

    private Long averageDurationMillis;

    private Long maxDurationMillis;

    private Long latestObservedAt;

    private List<SignalRedMetric> signals;

    /**
     * Signal and protocol-level RED summary.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignalRedMetric {
        private String signal;
        private String protocol;
        private long requestCount;
        private double requestRatePerMinute;
        private long errorCount;
        private double errorRate;
        private long requestBytes;
        private long signalItems;
        private Long averageSignalItems;
        private Long maxSignalItems;
        private Long averageDurationMillis;
        private Long maxDurationMillis;
        private String latestStatusCode;
        private String latestReason;
        private Long latestObservedAt;
    }
}
