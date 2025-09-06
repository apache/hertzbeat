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

package org.apache.hertzbeat.alert.calculate.periodic;

import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link LogPeriodicAlertCalculator}
 */
@ExtendWith(MockitoExtension.class)
class LogPeriodicAlertCalculatorTest {

    @Mock
    private DataSourceService dataSourceService;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private LogPeriodicAlertCalculator calculator;

    private AlertDefine groupAlertDefine;
    private AlertDefine individualAlertDefine;

    @BeforeEach
    void setUp() {
        groupAlertDefine = AlertDefine.builder()
                .id(1L)
                .name("log_error_alert")
                .type("periodic_log")
                .expr("SELECT * FROM hertzbeat_logs WHERE severity_text = 'ERROR' AND time_unix_nano >= ? AND time_unix_nano <= ?")
                .labels(Map.of("severity", "warning", "team", "backend", LogPeriodicAlertCalculator.ALERT_MODE_LABEL, LogPeriodicAlertCalculator.ALERT_MODE_GROUP))
                .annotations(Map.of("summary", "Error logs detected", "description", "Multiple error logs found"))
                .template("Found ${severity_text} log: ${body} from ${service_name}")
                .datasource("sql")
                .enable(true)
                .period(300)
                .build();

        individualAlertDefine = AlertDefine.builder()
                .id(1L)
                .name("log_error_alert")
                .type("periodic_log")
                .expr("SELECT * FROM hertzbeat_logs WHERE severity_text = 'ERROR' AND time_unix_nano >= ? AND time_unix_nano <= ?")
                .labels(Map.of("severity", "warning", "team", "backend", LogPeriodicAlertCalculator.ALERT_MODE_LABEL, LogPeriodicAlertCalculator.ALERT_MODE_INDIVIDUAL))
                .annotations(Map.of("summary", "Error logs detected", "description", "Multiple error logs found"))
                .template("Found ${severity_text} log: ${body} from ${service_name}")
                .datasource("sql")
                .enable(true)
                .period(300)
                .build();
    }

    @Test
    void testCalculateWithEnabledRuleAndValidExpression() {
        // Given
        List<Map<String, Object>> queryResults = createSampleLogResults(3);
        when(dataSourceService.query(anyString(), anyString())).thenReturn(queryResults);

        // When
        calculator.calculate(groupAlertDefine);

        // Then
        verify(dataSourceService).query("sql", "SELECT * FROM hertzbeat_logs WHERE severity_text = 'ERROR' AND time_unix_nano >= ? AND time_unix_nano <= ?");
        verify(alarmCommonReduce).reduceAndSendAlarmGroup(any(), any());
    }

    @Test
    void testCalculateWithEmptyQueryResults() {
        // Given
        when(dataSourceService.query(anyString(), anyString())).thenReturn(new ArrayList<>());

        // When
        calculator.calculate(groupAlertDefine);

        // Then
        verify(dataSourceService).query(anyString(), anyString());
        verifyNoInteractions(alarmCommonReduce);
    }

    @Test
    void testCalculateWithNullQueryResults() {
        // Given
        when(dataSourceService.query(anyString(), anyString())).thenReturn(null);

        // When
        calculator.calculate(groupAlertDefine);

        // Then
        verify(dataSourceService).query(anyString(), anyString());
        verifyNoInteractions(alarmCommonReduce);
    }

    @Test
    void testCalculateWithQueryException() {
        // Given
        when(dataSourceService.query(anyString(), anyString())).thenThrow(new RuntimeException("Database connection failed"));

        // When
        calculator.calculate(groupAlertDefine);

        // Then
        verify(dataSourceService).query(anyString(), anyString());
        verifyNoInteractions(alarmCommonReduce);
    }

    @Test
    void testIndividualAlertGeneration() {
        // Given
        Map<String, Object> logContext = createSingleLogResult("Error in payment service", "ERROR");
        List<Map<String, Object>> queryResults = List.of(logContext);
        when(dataSourceService.query(anyString(), anyString())).thenReturn(queryResults);

        try (MockedStatic<org.apache.hertzbeat.alert.util.AlertTemplateUtil> mockedTemplateUtil =
             Mockito.mockStatic(org.apache.hertzbeat.alert.util.AlertTemplateUtil.class)) {

            mockedTemplateUtil.when(() -> org.apache.hertzbeat.alert.util.AlertTemplateUtil.render(anyString(), any()))
                             .thenReturn("Rendered alert content");

            // When
            calculator.calculate(individualAlertDefine);

            // Then
            ArgumentCaptor<SingleAlert> alertCaptor = ArgumentCaptor.forClass(SingleAlert.class);
            verify(alarmCommonReduce).reduceAndSendAlarm(alertCaptor.capture());

            SingleAlert capturedAlert = alertCaptor.getValue();
            assertAll(
                () -> assertEquals(CommonConstants.ALERT_STATUS_FIRING, capturedAlert.getStatus()),
                () -> assertEquals(1, capturedAlert.getTriggerTimes()),
                () -> assertEquals("Rendered alert content", capturedAlert.getContent()),
                () -> assertNotNull(capturedAlert.getStartAt()),
                () -> assertNotNull(capturedAlert.getActiveAt()),
                () -> assertTrue(capturedAlert.getLabels().containsKey("alertname")),
                () -> assertTrue(capturedAlert.getLabels().containsKey("defineid")),
                () -> assertEquals("log_error_alert", capturedAlert.getLabels().get("alertname")),
                () -> assertEquals("1", capturedAlert.getLabels().get("defineid"))
            );
        }
    }

    @Test
    void testGroupAlertGeneration() {
        // Given
        List<Map<String, Object>> queryResults = createSampleLogResults(2);
        when(dataSourceService.query(anyString(), anyString())).thenReturn(queryResults);

        try (MockedStatic<org.apache.hertzbeat.alert.util.AlertTemplateUtil> mockedTemplateUtil = 
             Mockito.mockStatic(org.apache.hertzbeat.alert.util.AlertTemplateUtil.class)) {
            
            mockedTemplateUtil.when(() -> org.apache.hertzbeat.alert.util.AlertTemplateUtil.render(anyString(), any()))
                             .thenReturn("Rendered alert content");

            // When
            calculator.calculate(groupAlertDefine);

            // Then
            @SuppressWarnings("unchecked")
            ArgumentCaptor<Map<String, String>> groupLabelsCaptor = ArgumentCaptor.forClass(Map.class);
            @SuppressWarnings("unchecked")
            ArgumentCaptor<List<SingleAlert>> alertsCaptor = ArgumentCaptor.forClass(List.class);
            verify(alarmCommonReduce).reduceAndSendAlarmGroup(groupLabelsCaptor.capture(), alertsCaptor.capture());

            Map<String, String> groupLabels = groupLabelsCaptor.getValue();
            List<SingleAlert> alerts = alertsCaptor.getValue();

            assertAll(
                () -> assertEquals("2", groupLabels.get("__rows__")),
                () -> assertEquals("group", groupLabels.get("alert_mode")),
                () -> assertEquals("log_error_alert", groupLabels.get("alertname")),
                () -> assertEquals("1", groupLabels.get("defineid")),
                () -> assertEquals(2, alerts.size()),
                () -> alerts.forEach(alert -> {
                    assertEquals(CommonConstants.ALERT_STATUS_FIRING, alert.getStatus());
                    assertEquals(2, alert.getTriggerTimes());
                    assertNotNull(alert.getStartAt());
                    assertNotNull(alert.getActiveAt());
                })
            );
        }
    }

    /**
     * Create sample log results with simplified structure - only key fields
     */
    private List<Map<String, Object>> createSampleLogResults(int count) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            results.add(createSingleLogResult("Error message " + i, "ERROR"));
        }
        return results;
    }

    /**
     * Create a single log result with simplified structure
     */
    private Map<String, Object> createSingleLogResult(String message, String severityText) {
        Map<String, Object> logEntry = new HashMap<>();
        
        // Only essential fields for testing
        logEntry.put("time_unix_nano", System.nanoTime());
        logEntry.put("severity_text", severityText);
        logEntry.put("body", message);
        logEntry.put("service_name", "payment-service");
        
        return logEntry;
    }
}
