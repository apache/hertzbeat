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

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;


/**
 * Window Aggregator Responsible for:
 * 1. Managing window data structure for all active windows
 * 2. Receiving matching logs from Workers
 * 3. Receiving watermarks from TimeService
 * 4. Sending closed windows to AlarmEvaluator
 */
@Component
@Slf4j
public class WindowAggregator implements TimeService.WatermarkListener, Runnable {
    
    private static final long DEFAULT_WINDOW_SIZE_MS = 1 * 60 * 1000; // 1 minutes
    
    private final AlarmEvaluator alarmEvaluator;
    private final BlockingQueue<MatchingLogEvent> eventQueue = new LinkedBlockingQueue<>();
    private final Map<WindowKey, WindowData> activeWindows = new HashMap<>();
    private final Object windowLock = new Object();
    
    private ExecutorService aggregatorExecutor;

    public WindowAggregator(AlarmEvaluator alarmEvaluator) {
        this.alarmEvaluator = alarmEvaluator;
    }

    public void addMatchingLog(MatchingLogEvent event) {
        try {
            eventQueue.put(event);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted while adding matching log to aggregator");
        }
    }
    
    @Override
    public void onWatermark(TimeService.Watermark watermark) {
        List<WindowData> closedWindows;
        
        synchronized (windowLock) {
            closedWindows = new ArrayList<>();
            
            // Find windows that should be closed based on watermark
            Iterator<Map.Entry<WindowKey, WindowData>> iterator = activeWindows.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<WindowKey, WindowData> entry = iterator.next();
                WindowData windowData = entry.getValue();
                
                // Close window if its end time <= watermark timestamp
                if (windowData.getEndTime() <= watermark.getTimestamp()) {
                    closedWindows.add(windowData);
                    iterator.remove();
                    
                    log.debug("Closing window: {} with {} matching logs", 
                             entry.getKey(), windowData.getMatchingLogs().size());
                }
            }
        } 
        
        for (WindowData windowData : closedWindows) {
            alarmEvaluator.sendAndProcessWindowData(windowData);
        }
    }

    @Override
    public void run() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                MatchingLogEvent event = eventQueue.take();
                processMatchingLogEvent(event);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Error processing matching log event: {}", e.getMessage(), e);
            }
        }
    }
    
    private void processMatchingLogEvent(MatchingLogEvent event) {
        
        // Determine window size from alert define (if specified) or use default
        long windowSizeMs = getWindowSize(event.getAlertDefine());
        
        // Calculate window boundaries
        long eventTime = event.getEventTimestamp();
        long windowStart = (eventTime / windowSizeMs) * windowSizeMs;
        long windowEnd = windowStart + windowSizeMs;
        
        // Create window key
        WindowKey windowKey = new WindowKey(
            event.getAlertDefine().getId(),
            windowStart,
            windowEnd
        );
        synchronized (windowLock) {
            // Get or create window data
            WindowData windowData = activeWindows.computeIfAbsent(windowKey, 
                key -> new WindowData(key, event.getAlertDefine()));
            // Add matching log to window
            windowData.addMatchingLog(event);
            log.debug("Added matching log to window: {} (total logs: {})", 
                     windowKey, windowData.getMatchingLogs().size());
        }
    }
    
    private long getWindowSize(AlertDefine alertDefine) {
        // Check if alert define has custom window size configuration
        if (alertDefine.getPeriod() != null) {
            return alertDefine.getPeriod() * 1000; // Convert seconds to milliseconds
        }
        log.info("Using default window size of {} ms for alert define: {}",
                 DEFAULT_WINDOW_SIZE_MS, alertDefine.getName());
        return DEFAULT_WINDOW_SIZE_MS;
    }
    
    @PostConstruct
    public void start() {
        // Create internal executor
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("WindowAggregator executor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("window-aggregator-%d")
                .build();
        
        aggregatorExecutor = Executors.newSingleThreadExecutor(threadFactory);

        // Submit aggregation task
        aggregatorExecutor.submit(this);
        
        log.info("WindowAggregator started");
    }
    
    @PreDestroy
    public void stop() {
        if (aggregatorExecutor != null && !aggregatorExecutor.isShutdown()) {
            log.info("Shutting down WindowAggregator executor...");
            aggregatorExecutor.shutdown();
            try {
                if (!aggregatorExecutor.awaitTermination(10, TimeUnit.SECONDS)) {
                    log.warn("WindowAggregator executor did not terminate within 10 seconds, forcing shutdown");
                    aggregatorExecutor.shutdownNow();
                    if (!aggregatorExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                        log.error("WindowAggregator executor did not terminate");
                    }
                }
            } catch (InterruptedException e) {
                log.warn("Interrupted while waiting for WindowAggregator executor to terminate");
                aggregatorExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        
        log.info("WindowAggregator stopped");
    }
    
    /**
     * Window key for identifying unique windows
     */
    @Data
    @Getter
    @AllArgsConstructor
    public static class WindowKey {
        private final long alertDefineId;
        private final long startTime;
        private final long endTime;
    }
    
    /**
     * Window data container
     */
    public static class WindowData {
        @Getter
        private final WindowKey windowKey;
        @Getter
        private final AlertDefine alertDefine;
        private final List<MatchingLogEvent> matchingLogs = new ArrayList<>();
        @Getter
        private final long createdTime;
        
        public WindowData(WindowKey windowKey, AlertDefine alertDefine) {
            this.windowKey = windowKey;
            this.alertDefine = alertDefine;
            this.createdTime = System.currentTimeMillis();
        }
        
        public void addMatchingLog(MatchingLogEvent event) {
            matchingLogs.add(event);
        }

        public List<MatchingLogEvent> getMatchingLogs() {
            return new ArrayList<>(matchingLogs);
        }

        /**
         * Get start time of the window
         * @return start time
         */
        public long getStartTime() { return windowKey.getStartTime(); }

        /**
         * Get end time of the window
         * @return end time
         */
        public long getEndTime() { return windowKey.getEndTime(); }
    }
}