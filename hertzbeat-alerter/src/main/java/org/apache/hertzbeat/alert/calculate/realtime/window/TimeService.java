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
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Watermark Generator responsible for:
 * 1. Receiving maxTimestamp updates from WindowedLogRealTimeAlertCalculator
 * 2. Calculating watermarks based on configurable delay
 * 3. Broadcasting watermarks to all subscribers (WindowAggregator)
 */
@Component
@Slf4j
public class TimeService {
    
    private static final long DEFAULT_WATERMARK_DELAY_MS = 30_000; // 30 seconds
    private static final long WATERMARK_BROADCAST_INTERVAL_MS = 5_000; // 5 seconds
    
    // Define acceptable timestamp range to filter abnormal timestamps
    private static final long MAX_FUTURE_TIME_MS = 60_000; // Allow 1 minute future time
    private static final long MAX_PAST_TIME_MS = 24 * 60 * 60 * 1000; // Allow 24 hours past time
    
    private final AtomicLong maxTimestamp = new AtomicLong(0);
    private final AtomicLong currentWatermark = new AtomicLong(0);
    private final CopyOnWriteArrayList<WatermarkListener> listeners = new CopyOnWriteArrayList<>();
    private ScheduledExecutorService scheduler;
    
    public TimeService(List<WatermarkListener> initialListeners) {
        listeners.addAll(initialListeners);
    }
    
    @PostConstruct
    public void start() {
        // Create internal scheduled executor
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("TimeService scheduler has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("timeservice-scheduler-%d")
                .build();
        
        this.scheduler = Executors.newSingleThreadScheduledExecutor(threadFactory);
        
        // Start watermark broadcast scheduler
        scheduler.scheduleAtFixedRate(
                this::broadcastWatermark,
                0,
                WATERMARK_BROADCAST_INTERVAL_MS,
                TimeUnit.MILLISECONDS
        );
        
        log.info("TimeService started with watermark delay: {}ms", DEFAULT_WATERMARK_DELAY_MS);
    }
    
    @PreDestroy
    public void stop() {
        if (scheduler != null && !scheduler.isShutdown()) {
            log.info("Shutting down TimeService scheduler...");
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(10, TimeUnit.SECONDS)) {
                    log.warn("TimeService scheduler did not terminate within 10 seconds, forcing shutdown");
                    scheduler.shutdownNow();
                    if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                        log.error("TimeService scheduler did not terminate");
                    }
                }
            } catch (InterruptedException e) {
                log.warn("Interrupted while waiting for TimeService scheduler to terminate");
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        
        log.info("TimeService stopped");
    }
    
    /**
     * Check if timestamp is within acceptable range
     */
    public boolean isValidTimestamp(long timestamp) {
        long currentTime = System.currentTimeMillis();
        return timestamp >= (currentTime - MAX_PAST_TIME_MS) && timestamp <= (currentTime + MAX_FUTURE_TIME_MS);
    }
    
    /**
     * Check if data is late based on current watermark
     */
    public boolean isLateData(long timestamp) {
        return timestamp < getCurrentWatermark();
    }
    
    /**
     * Update max timestamp from WindowedLogRealTimeAlertCalculator
     */
    public void updateMaxTimestamp(long timestamp) {
        long currentMax = maxTimestamp.get();
        if (timestamp > currentMax) {
            maxTimestamp.compareAndSet(currentMax, timestamp);
        }
    }
    
    /**
     * Add watermark listener
     */
    public void addWatermarkListener(WatermarkListener listener) {
        listeners.add(listener);
    }
    
    /**
     * Remove watermark listener
     */
    public void removeWatermarkListener(WatermarkListener listener) {
        listeners.remove(listener);
    }
    
    /**
     * Get current watermark
     */
    public long getCurrentWatermark() {
        return currentWatermark.get();
    }
    
    /**
     * Calculate and broadcast watermark
     */
    private void broadcastWatermark() {
        
        try {
            long maxTs = maxTimestamp.get();
            if (maxTs <= 0) {
                return;
            }
            // Calculate watermark: maxTimestamp - delay
            long newWatermark = maxTs - DEFAULT_WATERMARK_DELAY_MS;
            long currentWm = currentWatermark.get();
            
            // Only advance watermark (monotonic property)
            if (newWatermark <= currentWm) {
                return;
            }
            if (currentWatermark.compareAndSet(currentWm, newWatermark)) {
                // Broadcast to all listeners
                Watermark watermark = new Watermark(newWatermark);
                for (WatermarkListener listener : listeners) {
                    try {
                        listener.onWatermark(watermark);
                    } catch (Exception e) {
                        log.error("Error notifying watermark listener: {}", e.getMessage(), e);
                    }
                }
                log.debug("Broadcast watermark: {} (maxTimestamp: {})", newWatermark, maxTs);
            }
        } catch (Exception e) {
            log.error("Error in watermark broadcast: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Watermark data class
     */
    @Data
    @AllArgsConstructor
    @Getter
    public static class Watermark {
        private final long timestamp;
    }
    
    /**
     * Interface for watermark listeners
     */
    public interface WatermarkListener {
        void onWatermark(Watermark watermark);
    }
}