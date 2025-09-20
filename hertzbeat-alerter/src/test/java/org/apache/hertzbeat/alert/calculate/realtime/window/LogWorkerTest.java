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

import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;


/**
 * Test case for {@link LogWorker}
 */
@ExtendWith(MockitoExtension.class)
class LogWorkerTest {

    @Mock
    private AlertDefineService alertDefineService;

    @Mock
    private JexlExprCalculator jexlExprCalculator;

    @Mock
    private WindowAggregator windowAggregator;

    @Mock
    private AlerterWorkerPool workerPool;

    @InjectMocks
    private LogWorker logWorker;

    private LogEntry logEntry;
    private AlertDefine alertDefine;
    private List<AlertDefine> alertDefines;

    @BeforeEach
    void setUp() {
        // Create test log entry
        logEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityText("ERROR")
                .body("Test error message")
                .build();

        // Create test alert define
        alertDefine = AlertDefine.builder()
                .id(1L)
                .name("test_log_alert")
                .type("realtime_log")
                .expr("log.severityText == 'ERROR'")
                .enable(true)
                .build();

        alertDefines = new ArrayList<>();
        alertDefines.add(alertDefine);
    }

    @Test
    void testReduceAndSendLogTask() {
        // When
        logWorker.reduceAndSendLogTask(logEntry);

        // Then
        verify(workerPool).executeLogJob(any(Runnable.class));
    }

    @Test
    void testReduceLogTask() {
        // Given
        when(alertDefineService.getLogRealTimeAlertDefines()).thenReturn(alertDefines);
        when(jexlExprCalculator.execAlertExpression(anyMap(), anyString(), eq(false))).thenReturn(true);

        // When
        Runnable task = logWorker.reduceLogTask(logEntry);
        
        // Execute the task
        task.run();

        // Then
        verify(alertDefineService).getLogRealTimeAlertDefines();
        verify(jexlExprCalculator).execAlertExpression(anyMap(), eq("log.severityText == 'ERROR'"), eq(false));
        verify(windowAggregator).addMatchingLog(any(MatchingLogEvent.class));
    }

    @Test
    void testProcessLogEntryWithMatchingExpression() {
        // Given
        when(alertDefineService.getLogRealTimeAlertDefines()).thenReturn(alertDefines);
        when(jexlExprCalculator.execAlertExpression(anyMap(), anyString(), eq(false))).thenReturn(true);

        // When
        Runnable task = logWorker.reduceLogTask(logEntry);
        task.run();

        // Then
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> contextCaptor = ArgumentCaptor.forClass(Map.class);
        verify(jexlExprCalculator).execAlertExpression(contextCaptor.capture(), eq("log.severityText == 'ERROR'"), eq(false));
        
        Map<String, Object> context = contextCaptor.getValue();
        assertEquals(logEntry, context.get("log"));
        
        ArgumentCaptor<MatchingLogEvent> eventCaptor = ArgumentCaptor.forClass(MatchingLogEvent.class);
        verify(windowAggregator).addMatchingLog(eventCaptor.capture());
        
        MatchingLogEvent capturedEvent = eventCaptor.getValue();
        assertEquals(logEntry, capturedEvent.getLogEntry());
        assertEquals(alertDefine, capturedEvent.getAlertDefine());
        assertTrue(capturedEvent.getEventTimestamp() > 0);
        assertTrue(capturedEvent.getWorkerTimestamp() > 0);
    }

    @Test
    void testProcessLogEntryWithNonMatchingExpression() {
        // Given
        when(alertDefineService.getLogRealTimeAlertDefines()).thenReturn(alertDefines);
        when(jexlExprCalculator.execAlertExpression(anyMap(), anyString(), eq(false))).thenReturn(false);

        // When
        Runnable task = logWorker.reduceLogTask(logEntry);
        task.run();

        // Then
        verify(jexlExprCalculator).execAlertExpression(anyMap(), eq("log.severityText == 'ERROR'"), eq(false));
        verify(windowAggregator, never()).addMatchingLog(any(MatchingLogEvent.class));
    }

    @Test
    void testProcessLogEntryWithMultipleAlertDefines() {
        // Given
        AlertDefine secondDefine = AlertDefine.builder()
                .id(2L)
                .name("second_alert")
                .type("realtime_log")
                .expr("log.body != null")
                .enable(true)
                .build();
        
        List<AlertDefine> multipleDefines = List.of(alertDefine, secondDefine);
        when(alertDefineService.getLogRealTimeAlertDefines()).thenReturn(multipleDefines);
        when(jexlExprCalculator.execAlertExpression(anyMap(), eq("log.severityText == 'ERROR'"), eq(false))).thenReturn(true);
        when(jexlExprCalculator.execAlertExpression(anyMap(), eq("log.body != null"), eq(false))).thenReturn(true);

        // When
        Runnable task = logWorker.reduceLogTask(logEntry);
        task.run();

        // Then
        verify(jexlExprCalculator).execAlertExpression(anyMap(), eq("log.severityText == 'ERROR'"), eq(false));
        verify(jexlExprCalculator).execAlertExpression(anyMap(), eq("log.body != null"), eq(false));
        verify(windowAggregator, times(2)).addMatchingLog(any(MatchingLogEvent.class));
    }

    @Test
    void testCreateMatchingLogEventStructure() {
        // Given
        when(alertDefineService.getLogRealTimeAlertDefines()).thenReturn(alertDefines);
        when(jexlExprCalculator.execAlertExpression(anyMap(), anyString(), eq(false))).thenReturn(true);

        // When
        Runnable task = logWorker.reduceLogTask(logEntry);
        task.run();

        // Then
        ArgumentCaptor<MatchingLogEvent> eventCaptor = ArgumentCaptor.forClass(MatchingLogEvent.class);
        verify(windowAggregator).addMatchingLog(eventCaptor.capture());
        
        MatchingLogEvent event = eventCaptor.getValue();
        assertAll(
            () -> assertNotNull(event.getLogEntry()),
            () -> assertNotNull(event.getAlertDefine()),
            () -> assertTrue(event.getEventTimestamp() > 0),
            () -> assertTrue(event.getWorkerTimestamp() > 0),
            () -> assertEquals(logEntry, event.getLogEntry()),
            () -> assertEquals(alertDefine, event.getAlertDefine()),
            () -> assertTrue(event.getWorkerTimestamp() >= event.getEventTimestamp() - 1000) 
        );
    }

    @Test
    void testLogPrefixInContext() {
        // Given
        when(alertDefineService.getLogRealTimeAlertDefines()).thenReturn(alertDefines);
        when(jexlExprCalculator.execAlertExpression(anyMap(), anyString(), eq(false))).thenReturn(false);

        // When
        Runnable task = logWorker.reduceLogTask(logEntry);
        task.run();

        // Then
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> contextCaptor = ArgumentCaptor.forClass(Map.class);
        verify(jexlExprCalculator).execAlertExpression(contextCaptor.capture(), anyString(), eq(false));
        
        Map<String, Object> context = contextCaptor.getValue();
        assertTrue(context.containsKey("log"));
        assertEquals(logEntry, context.get("log"));
    }
}
