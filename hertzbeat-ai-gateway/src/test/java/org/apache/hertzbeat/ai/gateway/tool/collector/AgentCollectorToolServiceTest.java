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

package org.apache.hertzbeat.ai.gateway.tool.collector;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.CollectorService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Test collector state and assignment operations. */
class AgentCollectorToolServiceTest {

    private CollectorService collectorService;
    private MonitorService monitorService;
    private AgentCollectorToolService service;

    @BeforeEach
    void setUp() {
        collectorService = mock(CollectorService.class);
        monitorService = mock(MonitorService.class);
        service = new AgentCollectorToolService(collectorService, monitorService,
                mock(AppService.class), mock(CollectJobScheduling.class));
    }

    @Test
    void shouldDeduplicateCollectorsBeforeChangingState() {
        when(collectorService.hasCollector("edge-a")).thenReturn(true);

        Map<String, Object> result = service.setCollectorState(List.of("edge-a", "edge-a"), "offline");

        verify(collectorService).makeCollectorsOffline(List.of("edge-a"));
        assertEquals(1, result.get("affectedCount"));
    }

    @Test
    void shouldUnassignMonitorThroughMonitorDomainService() {
        MonitorDto monitor = new MonitorDto();
        monitor.setMonitor(Monitor.builder().id(42L).build());
        monitor.setParams(List.of());
        when(monitorService.getMonitorDto(42L)).thenReturn(monitor);

        service.unassignMonitor(42L);

        verify(monitorService).modifyMonitor(eq(monitor.getMonitor()), eq(List.of()), isNull(), isNull());
    }
}
