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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;

/**
 * Contract for entity monitor evidence list shaping extracted from the large entity service.
 */
class EntityMonitorEvidenceReadModelServiceTest {

    private final EntityMonitorEvidenceReadModelService monitorEvidenceReadModelService =
            new EntityMonitorEvidenceReadModelService();

    @Test
    void buildEntityMonitorPageFiltersByStatusAndAppBeforeReturningEvidence() {
        Monitor mysqlDown = monitor(
                601L, "order-db", "mysql", CommonConstants.MONITOR_DOWN_CODE,
                LocalDateTime.of(2026, 5, 10, 9, 0));
        Monitor redisUp = monitor(
                602L, "cart-cache", "redis", CommonConstants.MONITOR_UP_CODE,
                LocalDateTime.of(2026, 5, 10, 9, 5));

        Page<MonitorInfo> page = monitorEvidenceReadModelService.buildEntityMonitorPage(
                List.of(mysqlDown, redisUp), CommonConstants.MONITOR_DOWN_CODE, "mysql", 0, 10);

        assertEquals(1, page.getTotalElements());
        assertEquals(601L, page.getContent().getFirst().getId());
        assertEquals("mysql", page.getContent().getFirst().getApp());
    }

    @Test
    void buildEntityMonitorPagePrioritizesDownMonitorsBeforeRecentHealthyOnes() {
        Monitor recentHealthyMonitor = monitor(
                611L, "gateway-http", "http", CommonConstants.MONITOR_UP_CODE,
                LocalDateTime.of(2026, 5, 10, 10, 20));
        Monitor olderDownMonitor = monitor(
                612L, "gateway-db", "mysql", CommonConstants.MONITOR_DOWN_CODE,
                LocalDateTime.of(2026, 5, 10, 10, 0));
        Monitor pausedMonitor = monitor(
                613L, "gateway-worker", "jvm", CommonConstants.MONITOR_PAUSED_CODE,
                LocalDateTime.of(2026, 5, 10, 10, 30));

        Page<MonitorInfo> page = monitorEvidenceReadModelService.buildEntityMonitorPage(
                List.of(recentHealthyMonitor, olderDownMonitor, pausedMonitor), null, null, 0, 10);

        assertEquals(3, page.getTotalElements());
        assertEquals(List.of(612L, 611L, 613L), page.getContent().stream().map(MonitorInfo::getId).toList());
    }

    @Test
    void buildEntityMonitorPagePaginatesAfterFilteringAndPrioritySort() {
        Monitor firstDown = monitor(
                701L, "db-a", "mysql", CommonConstants.MONITOR_DOWN_CODE,
                LocalDateTime.of(2026, 5, 10, 11, 0));
        Monitor secondDown = monitor(
                702L, "db-b", "mysql", CommonConstants.MONITOR_DOWN_CODE,
                LocalDateTime.of(2026, 5, 10, 11, 5));
        Monitor healthy = monitor(
                703L, "api", "http", CommonConstants.MONITOR_UP_CODE,
                LocalDateTime.of(2026, 5, 10, 11, 10));

        Page<MonitorInfo> page = monitorEvidenceReadModelService.buildEntityMonitorPage(
                List.of(firstDown, secondDown, healthy), null, null, 0, 2);

        assertEquals(3, page.getTotalElements());
        assertEquals(List.of(702L, 701L), page.getContent().stream().map(MonitorInfo::getId).toList());
    }

    @Test
    void buildEntityMonitorPageReturnsNormalizedEmptyPageWithoutBoundMonitors() {
        Page<MonitorInfo> page = monitorEvidenceReadModelService.buildEntityMonitorPage(
                Collections.emptyList(), CommonConstants.MONITOR_DOWN_CODE, "mysql", -1, 0);

        assertTrue(page.isEmpty());
        assertEquals(0, page.getNumber());
        assertEquals(10, page.getSize());
    }

    private Monitor monitor(Long id, String name, String app, byte status, LocalDateTime updatedAt) {
        return Monitor.builder()
                .id(id)
                .name(name)
                .app(app)
                .status(status)
                .gmtUpdate(updatedAt)
                .build();
    }
}
