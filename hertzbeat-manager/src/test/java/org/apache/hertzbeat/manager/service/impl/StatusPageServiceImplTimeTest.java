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

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;
import org.apache.hertzbeat.manager.component.status.CalculateStatus;
import org.apache.hertzbeat.manager.dao.StatusPageComponentDao;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentComponentBindDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentDao;
import org.apache.hertzbeat.manager.dao.StatusPageOrgDao;
import org.apache.hertzbeat.manager.pojo.dto.ComponentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class StatusPageServiceImplTimeTest {

    @Mock private StatusPageHistoryDao historyDao;
    @Mock private StatusPageComponentDao componentDao;
    @Mock private StatusPageOrgDao orgDao;
    @Mock private StatusPageIncidentDao incidentDao;
    @Mock private StatusPageIncidentComponentBindDao bindDao;
    @Mock private CalculateStatus calculateStatus;

    private StatusPageServiceImpl service;
    private StatusPageComponent component;

    @BeforeEach
    void setup() throws Exception {
        MockitoAnnotations.openMocks(this);

        // Create service using its real constructor
        service = new StatusPageServiceImpl(bindDao);

        // Inject all @Autowired fields manually
        inject("statusPageHistoryDao", historyDao);
        inject("statusPageComponentDao", componentDao);
        inject("statusPageOrgDao", orgDao);
        inject("statusPageIncidentDao", incidentDao);
        inject("calculateStatus", calculateStatus);

        component = new StatusPageComponent();
        component.setId(1L);
        component.setState((byte) CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL);

        when(componentDao.findAll()).thenReturn(List.of(component));
        when(calculateStatus.getCalculateStatusIntervals()).thenReturn(300);
        when(bindDao.countByComponentId(anyLong())).thenReturn(0L);
    }

    private void inject(String field, Object value) throws Exception {
        Field f = StatusPageServiceImpl.class.getDeclaredField(field);
        f.setAccessible(true);
        f.set(service, value);
    }

    @Test
    void testMidnightBoundary() {
        Instant midnight = LocalDate.of(2026, 1, 14)
            .atStartOfDay(ZoneId.of("UTC"))
            .toInstant();

        StatusPageHistory before = history(midnight.minusSeconds(1),
            CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL);
        StatusPageHistory after = history(midnight.plusSeconds(1),
            CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL);

        when(historyDao.findStatusPageHistoriesByComponentIdAndTimestampBetween(anyLong(), anyLong(), anyLong()))
            .thenReturn(List.of(before, after));

        List<ComponentStatus> result = service.queryComponentsStatus();
        assertEquals(30, result.get(0).getHistory().size());
    }

    @Test
    void testDstDay() {
        ZoneId zone = ZoneId.of("America/New_York");
        Instant dstDay = ZonedDateTime.of(2026, 3, 8, 12, 0, 0, 0, zone).toInstant();

        StatusPageHistory history = history(dstDay,
            CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL);

        when(historyDao.findStatusPageHistoriesByComponentIdAndTimestampBetween(anyLong(), anyLong(), anyLong()))
            .thenReturn(List.of(history));

        List<ComponentStatus> result = service.queryComponentsStatus();
        assertEquals(30, result.get(0).getHistory().size());
    }

    @Test
    void testHistoryWindowSize() {
        Instant tenDaysAgo = Instant.now().minus(Duration.ofDays(10));

        StatusPageHistory history = history(tenDaysAgo,
            CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL);

        when(historyDao.findStatusPageHistoriesByComponentIdAndTimestampBetween(anyLong(), anyLong(), anyLong()))
            .thenReturn(List.of(history));

        List<ComponentStatus> result = service.queryComponentsStatus();
        assertEquals(30, result.get(0).getHistory().size());
    }

    private StatusPageHistory history(Instant time, int state) {
        return StatusPageHistory.builder()
            .timestamp(time.toEpochMilli())
            .state((byte) state)
            .componentId(1L)
            .build();
    }
}
