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

package org.apache.hertzbeat.alert.calculate.realtime;

import org.apache.hertzbeat.alert.calculate.realtime.window.LogWorker;
import org.apache.hertzbeat.alert.calculate.realtime.window.TimeService;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link WindowedLogRealTimeAlertCalculator}
 */
@ExtendWith(MockitoExtension.class)
class WindowedLogRealTimeAlertCalculatorTest {

    @Mock
    private CommonDataQueue dataQueue;

    @Mock
    private TimeService timeService;

    @Mock
    private LogWorker logWorker;

    @InjectMocks
    private WindowedLogRealTimeAlertCalculator calculator;

    private LogEntry validLogEntry;
    private LogEntry invalidTimestampLogEntry;
    private LogEntry lateDataLogEntry;

    @BeforeEach
    void setUp() {
        // Create valid log entry with current timestamp
        long currentTimeNano = System.currentTimeMillis() * 1_000_000L;
        validLogEntry = LogEntry.builder()
                .timeUnixNano(currentTimeNano)
                .severityText("ERROR")
                .body("Test error message")
                .build();

        // Create log entry with invalid timestamp (far future)
        long invalidTimeNano = (System.currentTimeMillis() + 2 * 60 * 60 * 1000L) * 1_000_000L; // 2 hours in future
        invalidTimestampLogEntry = LogEntry.builder()
                .timeUnixNano(invalidTimeNano)
                .severityText("ERROR")
                .body("Test error message with invalid timestamp")
                .build();

        // Create late data log entry
        long lateTimeNano = (System.currentTimeMillis() - 60 * 60 * 1000L) * 1_000_000L; // 1 hour in past
        lateDataLogEntry = LogEntry.builder()
                .timeUnixNano(lateTimeNano)
                .severityText("ERROR")
                .body("Test late data message")
                .build();
    }

    @Test
    void testRunWithValidLogEntry() throws InterruptedException {
        // Given
        when(dataQueue.pollLogEntry()).thenReturn(validLogEntry, (LogEntry) null);
        when(timeService.isValidTimestamp(anyLong())).thenReturn(true);
        when(timeService.isLateData(anyLong())).thenReturn(false);

        // Create a thread to run the calculator
        Thread calculatorThread = new Thread(calculator);

        // When
        calculatorThread.start();
        
        // Give some time for processing
        Thread.sleep(100);
        calculatorThread.interrupt();
        calculatorThread.join(1000);

        // Then
        verify(dataQueue, atLeastOnce()).pollLogEntry();
        verify(timeService).isValidTimestamp(anyLong());
        verify(timeService).isLateData(anyLong());
        verify(timeService).updateMaxTimestamp(anyLong());
        verify(logWorker).reduceAndSendLogTask(validLogEntry);
    }

    @Test
    void testRunWithInvalidTimestamp() throws InterruptedException {
        // Given
        when(dataQueue.pollLogEntry()).thenReturn(invalidTimestampLogEntry, (LogEntry) null);
        when(timeService.isValidTimestamp(anyLong())).thenReturn(false);

        // Create a thread to run the calculator
        Thread calculatorThread = new Thread(calculator);

        // When
        calculatorThread.start();
        
        // Give some time for processing
        Thread.sleep(100);
        calculatorThread.interrupt();
        calculatorThread.join(1000);

        // Then
        verify(dataQueue, atLeastOnce()).pollLogEntry();
        verify(timeService).isValidTimestamp(anyLong());
        verify(timeService, never()).isLateData(anyLong());
        verify(timeService, never()).updateMaxTimestamp(anyLong());
        verify(logWorker, never()).reduceAndSendLogTask(any());
    }

    @Test
    void testRunWithLateData() throws InterruptedException {
        // Given
        when(dataQueue.pollLogEntry()).thenReturn(lateDataLogEntry, (LogEntry) null);
        when(timeService.isValidTimestamp(anyLong())).thenReturn(true);
        when(timeService.isLateData(anyLong())).thenReturn(true);
        when(timeService.getCurrentWatermark()).thenReturn(System.currentTimeMillis() - 30 * 60 * 1000L); // 30 minutes ago

        // Create a thread to run the calculator
        Thread calculatorThread = new Thread(calculator);

        // When
        calculatorThread.start();
        
        // Give some time for processing
        Thread.sleep(100);
        calculatorThread.interrupt();
        calculatorThread.join(1000);

        // Then
        verify(dataQueue, atLeastOnce()).pollLogEntry();
        verify(timeService).isValidTimestamp(anyLong());
        verify(timeService).isLateData(anyLong());
        verify(timeService, never()).updateMaxTimestamp(anyLong());
        verify(logWorker, never()).reduceAndSendLogTask(any());
    }

    @Test
    void testRunWithGeneralException() throws InterruptedException {
        // Given
        when(dataQueue.pollLogEntry()).thenThrow(new RuntimeException("Test runtime exception"))
                .thenReturn(null); // Return null to exit the loop

        // Create a thread to run the calculator
        Thread calculatorThread = new Thread(calculator);

        // When
        calculatorThread.start();
        
        // Give some time for processing
        Thread.sleep(100);
        calculatorThread.interrupt();
        calculatorThread.join(1000);

        // Then
        verify(dataQueue, atLeastOnce()).pollLogEntry();
    }

}
