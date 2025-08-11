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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.calculate.realtime.window.LogWorker;
import org.apache.hertzbeat.alert.calculate.realtime.window.TimeService;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.stereotype.Component;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * WindowedLogRealTimeAlertCalculator - Single entry point for log stream processing
 * Responsible for:
 * 1. Reading from original log stream
 * 2. Extracting event timestamps
 * 3. Maintaining maxTimestamp for watermark generation
 * 4. Distributing logs to workers
 */
@Component
@Slf4j
public class WindowedLogRealTimeAlertCalculator implements Runnable {

    private static final int CALCULATE_THREADS = 3;

    private final CommonDataQueue dataQueue;
    private final TimeService timeService;
    private ThreadPoolExecutor dispatcherExecutor;
    private final LogWorker logWorker;

    public WindowedLogRealTimeAlertCalculator(CommonDataQueue dataQueue, TimeService timeService, LogWorker logWorker) {
        this.dataQueue = dataQueue;
        this.timeService = timeService;
        this.logWorker = logWorker;
    }

    @Override
    public void run() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                LogEntry logEntry = dataQueue.pollLogEntry();
                if (logEntry != null) {
                    processLogEntry(logEntry);
                    dataQueue.sendLogEntryToStorage(logEntry);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Error in log dispatch loop: {}", e.getMessage(), e);
            }
        }
    }
    
    private void processLogEntry(LogEntry logEntry) {
        // Extract event timestamp
        long eventTimestamp = extractEventTimestamp(logEntry);
        
        // Update max timestamp
        timeService.updateMaxTimestamp(eventTimestamp);
        logWorker.reduceAndSendLogTask(logEntry);
    }
    
    private long extractEventTimestamp(LogEntry logEntry) {
        if (logEntry.getTimeUnixNano() != null && logEntry.getTimeUnixNano() != 0) {
            return logEntry.getTimeUnixNano() / 1_000_000; // Convert to milliseconds
        }
        if (logEntry.getObservedTimeUnixNano() != null && logEntry.getObservedTimeUnixNano() != 0) {
            return logEntry.getObservedTimeUnixNano() / 1_000_000; // Convert to milliseconds
        }
        return System.currentTimeMillis();
    }
    
    @PostConstruct
    public void start() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Alerter workerExecutor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("log-dispatcher-%d")
                .build();
        // Create dispatcher thread executor
        this.dispatcherExecutor = new ThreadPoolExecutor(
            CALCULATE_THREADS,
            CALCULATE_THREADS,
            10,
            TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(),
            threadFactory,
            new ThreadPoolExecutor.AbortPolicy()
        );
        for (int i = 0; i < CALCULATE_THREADS; i++) {
            dispatcherExecutor.execute(this);
        }
    }

    @PreDestroy
    public void stop() {
        if (dispatcherExecutor != null) {
            dispatcherExecutor.shutdownNow();
        }
    }
}