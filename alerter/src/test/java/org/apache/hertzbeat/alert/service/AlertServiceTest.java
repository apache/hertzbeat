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
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.alert.dao.AlertDao;
import org.apache.hertzbeat.alert.dto.AlertPriorityNum;
import org.apache.hertzbeat.alert.dto.TenCloudAlertReport;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.AlertServiceImpl;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.dto.AlertReport;
import org.apache.hertzbeat.common.util.JsonUtil;
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
    private AlertDao alertDao;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private AlertServiceImpl alertService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void addAlert() {
        Alert alert = new Alert();
        assertDoesNotThrow(() -> alertService.addAlert(alert));
        verify(alertDao, times(1)).save(alert);
    }

    @Test
    void getAlerts() {
        // todo
    }

    @Test
    void deleteAlerts() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);
        assertDoesNotThrow(() -> alertService.deleteAlerts(ids));
        verify(alertDao, times(1)).deleteAlertsByIdIn(ids);
    }

    @Test
    void clearAlerts() {
        assertDoesNotThrow(() -> alertService.clearAlerts());
        verify(alertDao, times(1)).deleteAll();
    }

    @Test
    void editAlertStatus() {
        Byte status = 0;
        List<Long> ids = List.of(1L, 2L, 3L);
        assertDoesNotThrow(() -> alertService.editAlertStatus(status, ids));
        verify(alertDao, times(1)).updateAlertsStatus(status, ids);
    }

    @Test
    void getAlertsSummary() {
        List<AlertPriorityNum> priorityNums = new ArrayList<>();
        priorityNums.add(new AlertPriorityNum((byte) 1, 100));
        when(alertDao.findAlertPriorityNum()).thenReturn(priorityNums);

        assertDoesNotThrow(() -> alertService.getAlertsSummary());
        verify(alertDao, times(1)).findAlertPriorityNum();
        verify(alertDao, times(1)).count();

        assertNotNull(alertService.getAlertsSummary());
    }

    @Test
    void addNewAlertReport() {
        AlertReport alertReport = AlertReport.builder()
                .annotations(new HashMap<>())
                .priority(0)
                .alertTime(System.currentTimeMillis())
                .build();
        assertDoesNotThrow(() -> alertService.addNewAlertReport(alertReport));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(Alert.class));
    }

    @Test
    void addNewAlertReportFromCloud() {
        TenCloudAlertReport alertReport = TenCloudAlertReport.builder()
                .firstOccurTime("2024-08-01 11:30:00")
                .durationTime(100)
                .build();
        String reportJson = JsonUtil.toJson(alertReport);
        assertDoesNotThrow(() -> alertService.addNewAlertReportFromCloud("tencloud", reportJson));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(Alert.class));

        alertService.addNewAlertReportFromCloud("alicloud", reportJson);
        reset(alarmCommonReduce);
        verify(alarmCommonReduce, times(0)).reduceAndSendAlarm(any(Alert.class));

    }
}
