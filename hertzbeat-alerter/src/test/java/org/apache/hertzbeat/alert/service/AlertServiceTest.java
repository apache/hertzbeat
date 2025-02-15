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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.AlertServiceImpl;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link AlertService}
*/
@ExtendWith(MockitoExtension.class)
class AlertServiceTest {
    @Mock
    private GroupAlertDao groupAlertDao;
    
    @Mock
    private SingleAlertDao singleAlertDao;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private AlertServiceImpl alertService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void deleteGroupAlerts() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);
        assertDoesNotThrow(() -> alertService.deleteGroupAlerts(ids));
        verify(groupAlertDao, times(1)).deleteGroupAlertsByIdIn(ids);
    }
    

    @Test
    void editGroupAlertStatus() {
        String status = "firing";
        List<Long> ids = List.of(1L, 2L, 3L);
        assertDoesNotThrow(() -> alertService.editGroupAlertStatus(status, ids));
        verify(groupAlertDao, times(1)).updateGroupAlertsStatus(status, ids);
    }

    @Test
    void testGetAlertsSummary() {
        SingleAlert alert = new SingleAlert();
        alert.setLabels(Collections.singletonMap(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL));

        when(singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING)).thenReturn(Collections.singletonList(alert));
        when(singleAlertDao.count()).thenReturn(10L);

        AlertSummary summary = alertService.getAlertsSummary();

        assertNotNull(summary);
        assertEquals(1, summary.getPriorityCriticalNum());
        assertEquals(0, summary.getPriorityEmergencyNum());
        assertEquals(0, summary.getPriorityWarningNum());
        assertEquals(10L, summary.getTotal());
        assertEquals(90.0f, summary.getRate());

        verify(singleAlertDao, times(1)).querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING);
        verify(singleAlertDao, times(1)).count();
    }
}
