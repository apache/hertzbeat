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

import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

/**
 * Test case for {@link WindowAggregator}
 */
@ExtendWith(MockitoExtension.class)
class WindowAggregatorTest {

    @Mock
    private AlarmEvaluator alarmEvaluator;

    @InjectMocks
    private WindowAggregator windowAggregator;

    private AlertDefine alertDefine;
    private LogEntry logEntry;

    @BeforeEach
    void setUp() {
        // Create test log entry
        logEntry = LogEntry.builder()
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L)
                .severityText("ERROR")
                .body("Test error message")
                .attributes(Map.of("service", "test-service"))
                .build();

        // Create test alert define
        alertDefine = AlertDefine.builder()
                .id(1L)
                .name("test_log_alert")
                .type("realtime_log")
                .expr("log.severityText == 'ERROR'")
                .period(60) // 60 seconds window
                .times(1)
                .enable(true)
                .build();

        // Stop the default aggregator to avoid conflicts
        windowAggregator.stop();
    }

    @AfterEach
    void tearDown() {
        if (windowAggregator != null) {
            windowAggregator.stop();
        }
    }

    @Test
    void testWatermarkProcessing() throws InterruptedException {
        // Given - add a matching log event first
        long eventTime = System.currentTimeMillis();
        long windowSize = 60 * 1000; // 60 seconds
        long windowStart = (eventTime / windowSize) * windowSize;
        long windowEnd = windowStart + windowSize;

        MatchingLogEvent testEvent = MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(alertDefine)
                .eventTimestamp(eventTime)
                .workerTimestamp(eventTime)
                .build();
        windowAggregator.start();
        windowAggregator.addMatchingLog(testEvent);
        Thread.sleep(100); // Allow processing

        // When - send watermark that should close the window
        TimeService.Watermark watermark = new TimeService.Watermark(windowEnd + 1000);
        windowAggregator.onWatermark(watermark);

        // Then - the window should be closed and sent to AlarmEvaluator
        verify(alarmEvaluator, timeout(1000)).sendAndProcessWindowData(any(WindowAggregator.WindowData.class));
    }

    @Test
    void testWatermarkNotClosingActiveWindow() throws InterruptedException {
        // Given - add a matching log event
        long eventTime = System.currentTimeMillis();
        MatchingLogEvent testEvent = MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(alertDefine)
                .eventTimestamp(eventTime)
                .workerTimestamp(eventTime)
                .build();
        windowAggregator.start();
        windowAggregator.addMatchingLog(testEvent);
        Thread.sleep(100);

        // When - send watermark that should NOT close the window (watermark before window end)
        TimeService.Watermark earlyWatermark = new TimeService.Watermark(eventTime - 1000);
        windowAggregator.onWatermark(earlyWatermark);

        // Give some time for potential processing
        Thread.sleep(100);

        // Then - no window should be closed
        verify(alarmEvaluator, never()).sendAndProcessWindowData(any(WindowAggregator.WindowData.class));
    }

    @Test
    void testMultipleWindowsWithDifferentAlertDefines() throws InterruptedException {
        // Given - two different alert defines
        AlertDefine alertDefine2 = AlertDefine.builder()
                .id(2L)
                .name("second_alert")
                .type("realtime_log")
                .expr("log.severityText == 'WARN'")
                .period(60)
                .times(1)
                .enable(true)
                .build();

        long eventTime = System.currentTimeMillis();
        
        MatchingLogEvent event1 = MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(alertDefine)
                .eventTimestamp(eventTime)
                .workerTimestamp(eventTime)
                .build();

        MatchingLogEvent event2 = MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(alertDefine2)
                .eventTimestamp(eventTime)
                .workerTimestamp(eventTime)
                .build();

        // When
        windowAggregator.start();
        windowAggregator.addMatchingLog(event1);
        windowAggregator.addMatchingLog(event2);
        Thread.sleep(100);

        // Send watermark to close both windows
        long windowSize = 60 * 1000;
        long windowStart = (eventTime / windowSize) * windowSize;
        long windowEnd = windowStart + windowSize;
        
        TimeService.Watermark watermark = new TimeService.Watermark(windowEnd + 1000);
        windowAggregator.onWatermark(watermark);

        // Then - both windows should be closed
        verify(alarmEvaluator, timeout(1000).times(2)).sendAndProcessWindowData(any(WindowAggregator.WindowData.class));
    }

    @Test
    void testMultipleStartCalls() {
        // When - call start multiple times
        windowAggregator.start(); // First call (already called in setUp)
        windowAggregator.start(); // Second call

        // Then - should handle multiple start calls gracefully
        assertNotNull(windowAggregator);
    }

    @Test
    void testWatermarkWithMultipleWindows() throws InterruptedException {
        // Given - multiple windows at different times
        long baseTime = System.currentTimeMillis();
        long windowSize = 60 * 1000; // 60 seconds

        // Event in first window
        MatchingLogEvent event1 = MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(alertDefine)
                .eventTimestamp(baseTime)
                .workerTimestamp(baseTime)
                .build();

        // Event in second window (1 minute later)
        MatchingLogEvent event2 = MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(alertDefine)
                .eventTimestamp(baseTime + windowSize + 5000)
                .workerTimestamp(baseTime + windowSize + 5000)
                .build();
        windowAggregator.start();
        windowAggregator.addMatchingLog(event1);
        windowAggregator.addMatchingLog(event2);
        Thread.sleep(100);

        // When - send watermark that closes only the first window
        long firstWindowStart = (baseTime / windowSize) * windowSize;
        long firstWindowEnd = firstWindowStart + windowSize;

        TimeService.Watermark watermark = new TimeService.Watermark(firstWindowEnd + 1000);
        windowAggregator.onWatermark(watermark);

        // Then - only first window should be closed
        verify(alarmEvaluator, timeout(1000).times(1)).sendAndProcessWindowData(any(WindowAggregator.WindowData.class));

        // When - send watermark that closes the second window
        long secondWindowStart = ((baseTime + windowSize + 5000) / windowSize) * windowSize;
        long secondWindowEnd = secondWindowStart + windowSize;

        TimeService.Watermark secondWatermark = new TimeService.Watermark(secondWindowEnd + 1000);
        windowAggregator.onWatermark(secondWatermark);

        // Then - second window should also be closed (total 2 windows)
        verify(alarmEvaluator, timeout(1000).times(2)).sendAndProcessWindowData(any(WindowAggregator.WindowData.class));
    }
}
