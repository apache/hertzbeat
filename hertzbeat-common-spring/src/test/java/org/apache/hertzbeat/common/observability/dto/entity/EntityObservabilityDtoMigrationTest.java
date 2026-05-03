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

package org.apache.hertzbeat.common.observability.dto.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.junit.jupiter.api.Test;

class EntityObservabilityDtoMigrationTest {

    @Test
    void shouldExposeEntityObservabilityDtosFromCommonPackages() {
        MonitorInfo abnormalMonitor = MonitorInfo.fromEntity(Monitor.builder()
                .id(1L)
                .name("checkout-http")
                .app("http")
                .instance("127.0.0.1")
                .status((byte) 2)
                .type((byte) 0)
                .build());
        EntityEvidenceSummaryInfo evidenceSummary = new EntityEvidenceSummaryInfo(2, 1, 3, 4L, 5, 6L);
        EntityStatusInfo statusInfo = new EntityStatusInfo("down", "timeout", 4, 2, 1, 1, 3,
                LocalDateTime.of(2026, 4, 4, 18, 0));
        EntityMonitorSummaryInfo monitorSummary = new EntityMonitorSummaryInfo(
                4,
                Map.of("http", 3L),
                Map.of("down", 1L),
                List.of(abnormalMonitor),
                7L
        );
        EntityUnifiedEvidenceSummary unifiedSummary = new EntityUnifiedEvidenceSummary(3, true, true, false,
                2L, 3, 0, 8L, List.of("metrics", "logs"));
        EntityTriageRecommendation recommendation = new EntityTriageRecommendation(
                "rule", "metrics", "优先查看监控", "监控异常最多", "down monitors", "查看监控", 9L
        );

        assertEquals("checkout-http", abnormalMonitor.getName());
        assertEquals(5, evidenceSummary.getLogHintCount());
        assertEquals("down", statusInfo.getStatus());
        assertEquals(1, monitorSummary.getAbnormalMonitors().size());
        assertTrue(unifiedSummary.isMetricsActive());
        assertEquals("metrics", recommendation.getRecommendedFocus());
    }
}
