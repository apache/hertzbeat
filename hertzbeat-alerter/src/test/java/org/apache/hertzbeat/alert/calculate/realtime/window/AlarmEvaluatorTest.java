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

package org.apache.hertzbeat.alert.calculate.realtime.window;

import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Test case for {@link AlarmEvaluator}
 */
@ExtendWith(MockitoExtension.class)
class AlarmEvaluatorTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private AlarmEvaluator alarmEvaluator;

    private AlertDefine alertDefine;
    private WindowAggregator.WindowData windowData;

    @BeforeEach
    void setUp() {
        // Create test log entry
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityText("ERROR")
                .body("Test error message")
                .attributes(Map.of("service", "test-service", "pod", "test-pod"))
                .resource(Map.of("cluster", "test-cluster"))
                .build();

        // Create test alert define for individual mode
        alertDefine = AlertDefine.builder()
                .id(1L)
                .name("test_log_alert")
                .type("realtime_log")
                .expr("log.severityText == 'ERROR'")
                .times(1)
                .template("Alert: {{log.body}}")
                .labels(Map.of("alert_mode", "individual", "severity", "high"))
                .annotations(Map.of("summary", "Test alert summary"))
                .enable(true)
                .build();

        // Create matching log events
        MatchingLogEvent matchingEvent = MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(alertDefine)
                .eventTimestamp(System.currentTimeMillis())
                .workerTimestamp(System.currentTimeMillis())
                .build();

        // Create window data
        WindowAggregator.WindowKey windowKey = new WindowAggregator.WindowKey(1L, 
            System.currentTimeMillis() - 60000, System.currentTimeMillis());
        windowData = new WindowAggregator.WindowData(windowKey, alertDefine);
        windowData.addMatchingLog(matchingEvent);
    }

    @Test
    void testProcessWindowDataWithIndividualMode() throws InterruptedException {
        // Given - alert define with individual mode
        alertDefine.setLabels(Map.of("alert_mode", "individual"));
        
        // When
        alarmEvaluator.sendAndProcessWindowData(windowData);
        
        // Wait for async processing
        Thread.sleep(2000);

        // Then
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
        verify(alarmCommonReduce, never()).reduceAndSendAlarmGroup(anyMap(), anyList());
    }

    @Test
    void testProcessWindowDataWithGroupMode() throws InterruptedException {
        // Given - alert define with group mode
        alertDefine.setLabels(Map.of("alert_mode", "group"));
        
        // When
        alarmEvaluator.sendAndProcessWindowData(windowData);
        
        // Wait for async processing
        Thread.sleep(2000);

        // Then
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarmGroup(anyMap(), anyList());
    }

    @Test
    void testProcessWindowDataWithEmptyLogs() throws InterruptedException {
        // Given - window data with no matching logs
        WindowAggregator.WindowKey emptyWindowKey = new WindowAggregator.WindowKey(1L, 
            System.currentTimeMillis() - 60000, System.currentTimeMillis());
        WindowAggregator.WindowData emptyWindowData = new WindowAggregator.WindowData(emptyWindowKey, alertDefine);
        
        // When
        alarmEvaluator.sendAndProcessWindowData(emptyWindowData);
        
        // Wait for async processing
        Thread.sleep(2000);

        // Then - should not process any alerts
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
        verify(alarmCommonReduce, never()).reduceAndSendAlarmGroup(anyMap(), anyList());
    }

    @Test
    void testProcessWindowDataWithInsufficientTimes() throws InterruptedException {
        // Given - alert define requiring 3 times but only 1 matching log
        alertDefine.setTimes(3);
        
        // When
        alarmEvaluator.sendAndProcessWindowData(windowData);
        
        // Wait for async processing
        Thread.sleep(2000);

        // Then - should not process any alerts due to insufficient count
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
        verify(alarmCommonReduce, never()).reduceAndSendAlarmGroup(anyMap(), anyList());
    }

    @Test
    void testIndividualAlertGeneration() throws InterruptedException {
        // Given
        alertDefine.setLabels(Map.of("alert_mode", "individual", "severity", "critical"));
        alertDefine.setAnnotations(Map.of("summary", "Test summary", "description", "Test description"));
        
        // When
        alarmEvaluator.sendAndProcessWindowData(windowData);
        
        // Wait for async processing
        Thread.sleep(2000);

        // Then
        ArgumentCaptor<SingleAlert> alertCaptor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(alertCaptor.capture());
        
        SingleAlert capturedAlert = alertCaptor.getValue();
        assertAll(
            () -> assertNotNull(capturedAlert),
            () -> assertEquals(CommonConstants.ALERT_STATUS_FIRING, capturedAlert.getStatus()),
            () -> assertEquals(1, capturedAlert.getTriggerTimes()),
            () -> assertNotNull(capturedAlert.getContent()),
            () -> assertNotNull(capturedAlert.getLabels()),
            () -> assertNotNull(capturedAlert.getAnnotations()),
            () -> assertTrue(capturedAlert.getStartAt() > 0),
            () -> assertTrue(capturedAlert.getActiveAt() > 0)
        );
        
        // Verify labels contain alert define info and log entry data
        Map<String, String> labels = capturedAlert.getLabels();
        assertTrue(labels.containsKey("severity"));
        assertTrue(labels.containsKey("severityText"));
        assertTrue(labels.containsKey("body"));
    }

    @Test
    void testGroupAlertGeneration() throws InterruptedException {
        // Given
        alertDefine.setLabels(Map.of("alert_mode", "group", "severity", "warning"));
        
        // Add more matching logs to test group functionality
        MatchingLogEvent secondEvent = MatchingLogEvent.builder()
                .logEntry(LogEntry.builder()
                    .timeUnixNano((System.currentTimeMillis() + 1000) * 1_000_000L)
                    .severityText("ERROR")
                    .body("Second error message")
                    .build())
                .alertDefine(alertDefine)
                .eventTimestamp(System.currentTimeMillis() + 1000)
                .workerTimestamp(System.currentTimeMillis() + 1000)
                .build();
        
        windowData.addMatchingLog(secondEvent);
        
        // When
        alarmEvaluator.sendAndProcessWindowData(windowData);
        
        // Wait for async processing
        Thread.sleep(2000);

        // Then
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> labelsCaptor = ArgumentCaptor.forClass(Map.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SingleAlert>> alertsCaptor = ArgumentCaptor.forClass(List.class);
        verify(alarmCommonReduce).reduceAndSendAlarmGroup(labelsCaptor.capture(), alertsCaptor.capture());
        
        Map<String, String> groupLabels = labelsCaptor.getValue();
        List<SingleAlert> alerts = alertsCaptor.getValue();
        
        assertAll(
            () -> assertNotNull(groupLabels),
            () -> assertNotNull(alerts),
            () -> assertEquals(2, alerts.size()),
            () -> assertTrue(groupLabels.containsKey("window_start_time")),
            () -> assertTrue(groupLabels.containsKey("window_end_time")),
            () -> assertTrue(groupLabels.containsKey("matching_logs_count")),
            () -> assertEquals("group", groupLabels.get("alert_mode")),
            () -> assertEquals("2", groupLabels.get("matching_logs_count"))
        );
        
        // Verify each alert in the group
        for (SingleAlert alert : alerts) {
            assertEquals(CommonConstants.ALERT_STATUS_FIRING, alert.getStatus());
            assertEquals(2, alert.getTriggerTimes()); // Should equal the count of matching logs
        }
    }

    @Test
    void testLogEntryDataMapping() throws InterruptedException {
        // Given - log entry with comprehensive data
        LogEntry detailedLogEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Detailed error message")
                .attributes(Map.of("service", "api-service", "version", "1.0.0"))
                .resource(Map.of("cluster", "prod-cluster", "namespace", "default"))
                .droppedAttributesCount(0)
                .traceId("trace123")
                .spanId("span456")
                .traceFlags(1)
                .build();

        MatchingLogEvent detailedEvent = MatchingLogEvent.builder()
                .logEntry(detailedLogEntry)
                .alertDefine(alertDefine)
                .eventTimestamp(System.currentTimeMillis())
                .workerTimestamp(System.currentTimeMillis())
                .build();

        WindowAggregator.WindowData detailedWindowData = new WindowAggregator.WindowData(
            new WindowAggregator.WindowKey(1L, System.currentTimeMillis() - 60000, System.currentTimeMillis()),
            alertDefine);
        detailedWindowData.addMatchingLog(detailedEvent);

        alertDefine.setLabels(Map.of("alert_mode", "individual"));
        
        // When
        alarmEvaluator.sendAndProcessWindowData(detailedWindowData);
        Thread.sleep(2000);

        // Then
        ArgumentCaptor<SingleAlert> alertCaptor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(alertCaptor.capture());
        
        SingleAlert alert = alertCaptor.getValue();
        Map<String, String> labels = alert.getLabels();
        
        // Verify log entry fields are mapped to labels
        assertAll(
            () -> assertEquals("17", labels.get("severityNumber")),
            () -> assertEquals("ERROR", labels.get("severityText")),
            () -> assertEquals("Detailed error message", labels.get("body")),
            () -> assertEquals("0", labels.get("droppedAttributesCount")),
            () -> assertEquals("trace123", labels.get("traceId")),
            () -> assertEquals("span456", labels.get("spanId")),
            () -> assertEquals("1", labels.get("traceFlags")),
            () -> assertEquals("api-service", labels.get("attr_service")),
            () -> assertEquals("1.0.0", labels.get("attr_version")),
            () -> assertEquals("prod-cluster", labels.get("resource_cluster")),
            () -> assertEquals("default", labels.get("resource_namespace"))
        );
    }

    @Test
    void testMultipleMatchingLogsInWindow() throws InterruptedException {
        // Given - multiple matching logs in the same window
        alertDefine.setTimes(2); // Require at least 2 occurrences
        alertDefine.setLabels(Map.of("alert_mode", "group"));
        
        // Add second matching log
        MatchingLogEvent secondEvent = MatchingLogEvent.builder()
                .logEntry(LogEntry.builder()
                    .severityText("ERROR")
                    .body("Another error")
                    .build())
                .alertDefine(alertDefine)
                .eventTimestamp(System.currentTimeMillis() + 5000)
                .workerTimestamp(System.currentTimeMillis() + 5000)
                .build();
        
        windowData.addMatchingLog(secondEvent);
        
        // When
        alarmEvaluator.sendAndProcessWindowData(windowData);
        Thread.sleep(2000);

        // Then - should trigger group alert since threshold is met
        verify(alarmCommonReduce).reduceAndSendAlarmGroup(anyMap(), anyList());
        
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SingleAlert>> alertsCaptor = ArgumentCaptor.forClass(List.class);
        verify(alarmCommonReduce).reduceAndSendAlarmGroup(anyMap(), alertsCaptor.capture());
        
        List<SingleAlert> alerts = alertsCaptor.getValue();
        assertEquals(2, alerts.size());
        assertEquals(2, alerts.get(0).getTriggerTimes()); // Each alert should have trigger times = total count
    }
}
