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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link TimeService}
 */
@ExtendWith(MockitoExtension.class)
class TimeServiceTest {

    @Mock
    private TimeService.WatermarkListener mockListener1;

    @Mock
    private TimeService.WatermarkListener mockListener2;

    private TimeService timeService;
    
    @BeforeEach
    void setUp() {
        timeService = new TimeService(Collections.emptyList());
    }

    @AfterEach
    void tearDown() {
        if (timeService != null) {
            timeService.stop();
        }
    }

    @Test
    void testIsValidTimestamp() {
        // Given
        long currentTime = System.currentTimeMillis();
        long validFutureTime = currentTime + 30_000; // 30 seconds in future
        long validPastTime = currentTime - 60_000; // 1 minute in past
        long invalidFutureTime = currentTime + 120_000; // 2 minutes in future (exceeds 1 minute limit)
        long invalidPastTime = currentTime - 25 * 60 * 60 * 1000; // 25 hours in past (exceeds 24 hours limit)

        // When & Then
        assertAll(
            () -> assertTrue(timeService.isValidTimestamp(currentTime)),
            () -> assertTrue(timeService.isValidTimestamp(validFutureTime)),
            () -> assertTrue(timeService.isValidTimestamp(validPastTime)),
            () -> assertFalse(timeService.isValidTimestamp(invalidFutureTime)),
            () -> assertFalse(timeService.isValidTimestamp(invalidPastTime))
        );
    }

    @Test
    void testIsLateData() {
        // Given
        long currentTime = System.currentTimeMillis();
        timeService.updateMaxTimestamp(currentTime);
        timeService.start();
        
        // Wait for watermark to be set
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // When & Then
        long currentWatermark = timeService.getCurrentWatermark();
        if (currentWatermark > 0) {
            assertTrue(timeService.isLateData(currentWatermark - 1000));
            assertFalse(timeService.isLateData(currentWatermark + 1000));
        }
    }

    @Test
    void testUpdateMaxTimestamp() {
        // Given
        long timestamp1 = 1000L;
        long timestamp2 = 2000L;
        long timestamp3 = 1500L; 

        // When
        timeService.updateMaxTimestamp(timestamp1);
        timeService.updateMaxTimestamp(timestamp2);
        timeService.updateMaxTimestamp(timestamp3); 

        timeService.start();
        
        // Wait for potential watermark broadcast
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Then - The max timestamp should be the highest value (timestamp2)
        assertEquals(timestamp2, timeService.getMaxTimestamp());
    }

    @Test
    void testWatermarkBroadcastWithRealTimestamps() throws InterruptedException {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicLong receivedWatermark = new AtomicLong();
        
        TimeService.WatermarkListener testListener = watermark -> {
            receivedWatermark.set(watermark.getTimestamp());
            latch.countDown();
        };

        timeService.addWatermarkListener(testListener);
        timeService.start();

        // When
        long testTimestamp = System.currentTimeMillis();
        timeService.updateMaxTimestamp(testTimestamp);

        // Then
        assertTrue(latch.await(10, TimeUnit.SECONDS), "Should receive watermark within 10 seconds");
        
        long watermark = receivedWatermark.get();
        long expectedWatermark = testTimestamp - TimeService.DEFAULT_WATERMARK_DELAY_MS; // DEFAULT_WATERMARK_DELAY_MS
        assertEquals(expectedWatermark, watermark);
    }

    @Test
    void testWatermarkMonotonicProperty() throws InterruptedException {
        // Given
        List<Long> receivedWatermarks = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch latch = new CountDownLatch(2);
        
        TimeService.WatermarkListener testListener = watermark -> {
            receivedWatermarks.add(watermark.getTimestamp());
            latch.countDown();
        };

        timeService.addWatermarkListener(testListener);
        timeService.start();

        // When - Update with increasing timestamps
        long baseTime = System.currentTimeMillis();
        timeService.updateMaxTimestamp(baseTime);
        Thread.sleep(6000); // Wait for first watermark
        
        timeService.updateMaxTimestamp(baseTime + 40_000); // Increase by 40 seconds
        
        // Then
        assertTrue(latch.await(15, TimeUnit.SECONDS), "Should receive at least 2 watermarks");
        
        // Verify watermarks are monotonic (non-decreasing)
        for (int i = 1; i < receivedWatermarks.size(); i++) {
            assertTrue(receivedWatermarks.get(i) >= receivedWatermarks.get(i - 1),
                "Watermarks should be monotonic: " + receivedWatermarks);
        }
    }

    @Test
    void testListenerExceptionHandling() throws InterruptedException {
        // Given
        AtomicInteger successfulCalls = new AtomicInteger(0);
        CountDownLatch latch = new CountDownLatch(1);
        
        // Mock listener that throws exception
        TimeService.WatermarkListener faultyListener = watermark -> {
            throw new RuntimeException("Test exception");
        };
        
        // Mock listener that works normally
        TimeService.WatermarkListener normalListener = watermark -> {
            successfulCalls.incrementAndGet();
            latch.countDown();
        };

        timeService.addWatermarkListener(faultyListener);
        timeService.addWatermarkListener(normalListener);
        timeService.start();

        // When
        timeService.updateMaxTimestamp(System.currentTimeMillis());

        // Then - Normal listener should still work despite faulty listener
        assertTrue(latch.await(10, TimeUnit.SECONDS), "Normal listener should receive watermark");
        assertTrue(successfulCalls.get() > 0, "Normal listener should be called successfully");
    }

    @Test
    void testGetCurrentWatermark() {
        // Given
        timeService.start();
        
        // Initially watermark should be 0
        assertEquals(0, timeService.getCurrentWatermark());
        
        // When
        long testTimestamp = System.currentTimeMillis();
        timeService.updateMaxTimestamp(testTimestamp);
        
        // Wait for watermark update
        try {
            Thread.sleep(6000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Then
        long watermark = timeService.getCurrentWatermark();
        assertEquals(testTimestamp - TimeService.DEFAULT_WATERMARK_DELAY_MS, watermark);
    }

    @Test
    void testZeroTimestampHandling() throws InterruptedException {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger callCount = new AtomicInteger(0);
        
        TimeService.WatermarkListener testListener = watermark -> {
            callCount.incrementAndGet();
            latch.countDown();
        };

        timeService.addWatermarkListener(testListener);
        timeService.start();

        // When - Update with zero timestamp
        timeService.updateMaxTimestamp(0);
        
        // Wait for potential watermark broadcast
        boolean received = latch.await(8, TimeUnit.SECONDS);
        
        // Then - No watermark should be broadcast for zero timestamp
        assertFalse(received, "No watermark should be broadcast for zero timestamp");
        assertEquals(0, callCount.get());
    }

    @Test
    void testNegativeTimestampHandling() throws InterruptedException {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger callCount = new AtomicInteger(0);
        
        TimeService.WatermarkListener testListener = watermark -> {
            callCount.incrementAndGet();
            latch.countDown();
        };

        timeService.addWatermarkListener(testListener);
        timeService.start();

        // When - Update with negative timestamp
        timeService.updateMaxTimestamp(-1000L);
        
        // Wait for potential watermark broadcast
        boolean received = latch.await(8, TimeUnit.SECONDS);
        
        // Then - No watermark should be broadcast for negative timestamp
        assertFalse(received, "No watermark should be broadcast for negative timestamp");
        assertEquals(0, callCount.get());
    }
}
