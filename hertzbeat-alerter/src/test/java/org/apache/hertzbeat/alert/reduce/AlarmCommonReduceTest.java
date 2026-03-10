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

package org.apache.hertzbeat.alert.reduce;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link AlarmCommonReduce}
 */

@ExtendWith(MockitoExtension.class)
class AlarmCommonReduceTest {

    @Mock
    private AlarmGroupReduce alarmGroupReduce;

    private AlarmCommonReduce alarmCommonReduce;

    private SingleAlert testAlert;

    @BeforeEach
    void setUp() {
        testAlert = SingleAlert.builder().labels(new HashMap<>(Map.of("alertname", "test"))).build();
        alarmCommonReduce = new AlarmCommonReduce(alarmGroupReduce);
    }

    @AfterEach
    void tearDown() {
        if (alarmCommonReduce != null) {
            alarmCommonReduce.destroy();
        }
    }

    @Test
    void testReduceAndSendAlarm() {
        alarmCommonReduce.reduceAndSendAlarm(testAlert);
    }

    @Test
    void testReduceAndSendAlarmRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        doAnswer(invocation -> {
            virtualThread.set(Thread.currentThread().isVirtual());
            latch.countDown();
            return null;
        }).when(alarmGroupReduce).processGroupAlert(any(SingleAlert.class));

        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void testReduceAndSendAlarmQueuesWhenConcurrencyLimitReached() throws Exception {
        VirtualThreadProperties properties = new VirtualThreadProperties();
        VirtualThreadProperties.QueueProperties queueProperties = new VirtualThreadProperties.QueueProperties();
        queueProperties.setMaxConcurrentJobs(1);
        properties.getAlerter().setReduce(queueProperties);
        alarmCommonReduce.destroy();
        alarmCommonReduce = new AlarmCommonReduce(alarmGroupReduce, properties);

        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger invocationOrder = new AtomicInteger();
        doAnswer(invocation -> {
            int order = invocationOrder.incrementAndGet();
            if (order == 1) {
                firstStarted.countDown();
                try {
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            } else if (order == 2) {
                secondStarted.countDown();
            }
            return null;
        }).when(alarmGroupReduce).processGroupAlert(any(SingleAlert.class));

        alarmCommonReduce.reduceAndSendAlarm(SingleAlert.builder()
                .labels(new HashMap<>(Map.of("name", "first"))).build());
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        alarmCommonReduce.reduceAndSendAlarm(SingleAlert.builder()
                .labels(new HashMap<>(Map.of("name", "second"))).build());
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
    }

}
