/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.alert.reduce;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test for AlarmGroupReduce
 */
class AlarmGroupReduceTest {

    @Mock
    private AlarmInhibitReduce alarmInhibitReduce;
    
    @Mock
    private AlertGroupConvergeDao alertGroupConvergeDao;
    
    private AlarmGroupReduce alarmGroupReduce;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(alertGroupConvergeDao.findAlertGroupConvergesByEnableIsTrue())
            .thenReturn(Collections.emptyList());
        alarmGroupReduce = new AlarmGroupReduce(alarmInhibitReduce, alertGroupConvergeDao,
                new VirtualThreadProperties(), false);
    }

    @AfterEach
    void tearDown() {
        if (alarmGroupReduce != null) {
            alarmGroupReduce.destroy();
        }
    }

    @Test
    void whenNoGroupRules_shouldSendSingleAlert() {
        SingleAlert alert = SingleAlert.builder()
                .fingerprint("fp1")
                .status("firing")
                .labels(createLabels("severity", "critical"))
                .build();
                
        alarmGroupReduce.processGroupAlert(alert);
        
        verify(alarmInhibitReduce).inhibitAlarm(argThat(group -> 
            group.getAlerts().size() == 1 && group.getAlerts().get(0).getFingerprint().equals("fp1")));
    }

    @Test
    void whenMatchingGroupRule_shouldGroup() {
        // Setup group rule
        AlertGroupConverge rule = new AlertGroupConverge();
        rule.setName("test-rule");
        rule.setGroupLabels(Arrays.asList("severity", "instance"));
        when(alertGroupConvergeDao.findAlertGroupConvergesByEnableIsTrue())
            .thenReturn(Collections.singletonList(rule));
        alarmGroupReduce.refreshGroupDefines(Collections.singletonList(rule));
        
        SingleAlert alert = SingleAlert.builder()
                .fingerprint("fp1")
                .status("firing")
                .labels(createLabels("severity", "critical", "instance", "host1"))
                .build();
                
        alarmGroupReduce.processGroupAlert(alert);
        
        // Verify group is created and cached (implicitly tested through internal state)
        verify(alarmInhibitReduce, never()).inhibitAlarm(any());  // Should not send immediately due to group wait
    }

    @Test
    void dispatchCheckAndSendGroupsRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        alarmGroupReduce.destroy();
        alarmGroupReduce = new TestAlarmGroupReduce(alarmInhibitReduce, alertGroupConvergeDao,
                new VirtualThreadProperties(), latch, virtualThread, null, null, null, null, null);

        alarmGroupReduce.dispatchCheckAndSendGroups();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchCheckAndSendGroupsDoesNotRunConcurrently() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger maxConcurrent = new AtomicInteger();
        alarmGroupReduce.destroy();
        alarmGroupReduce = new TestAlarmGroupReduce(alarmInhibitReduce, alertGroupConvergeDao,
                new VirtualThreadProperties(), null, null, firstStarted, releaseFirst, secondStarted,
                maxConcurrent, new AtomicInteger());

        alarmGroupReduce.dispatchCheckAndSendGroups();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        alarmGroupReduce.dispatchCheckAndSendGroups();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    private Map<String, String> createLabels(String... keyValues) {
        Map<String, String> labels = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            labels.put(keyValues[i], keyValues[i + 1]);
        }
        return labels;
    }

    private static final class TestAlarmGroupReduce extends AlarmGroupReduce {

        private final CountDownLatch virtualThreadLatch;

        private final AtomicBoolean virtualThread;

        private final CountDownLatch firstStarted;

        private final CountDownLatch releaseFirst;

        private final CountDownLatch secondStarted;

        private final AtomicInteger maxConcurrent;

        private final AtomicInteger concurrent;

        private final AtomicInteger invocations;

        private TestAlarmGroupReduce(AlarmInhibitReduce alarmInhibitReduce, AlertGroupConvergeDao alertGroupConvergeDao,
                                     VirtualThreadProperties properties, CountDownLatch virtualThreadLatch,
                                     AtomicBoolean virtualThread, CountDownLatch firstStarted,
                                     CountDownLatch releaseFirst, CountDownLatch secondStarted,
                                     AtomicInteger maxConcurrent, AtomicInteger invocations) {
            super(alarmInhibitReduce, alertGroupConvergeDao, properties, false);
            this.virtualThreadLatch = virtualThreadLatch;
            this.virtualThread = virtualThread;
            this.firstStarted = firstStarted;
            this.releaseFirst = releaseFirst;
            this.secondStarted = secondStarted;
            this.maxConcurrent = maxConcurrent;
            this.invocations = invocations;
            this.concurrent = maxConcurrent == null ? null : new AtomicInteger();
        }

        @Override
        void beforeCheckAndSendGroupsRun() {
            if (virtualThread != null) {
                virtualThread.set(Thread.currentThread().isVirtual());
            }
            if (virtualThreadLatch != null) {
                virtualThreadLatch.countDown();
            }
            if (maxConcurrent == null || invocations == null) {
                return;
            }
            int running = concurrent.incrementAndGet();
            maxConcurrent.accumulateAndGet(running, Math::max);
            int currentInvocation = invocations.incrementAndGet();
            try {
                if (currentInvocation == 1 && firstStarted != null && releaseFirst != null) {
                    firstStarted.countDown();
                    releaseFirst.await(5, TimeUnit.SECONDS);
                } else if (currentInvocation == 2 && secondStarted != null) {
                    secondStarted.countDown();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                concurrent.decrementAndGet();
            }
        }
    }
}
