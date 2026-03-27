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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test for AlarmInhibitReduce
 */
class AlarmInhibitReduceTest {

    @Mock
    private AlertInhibitDao alertInhibitDao;
    
    @Mock
    private AlarmSilenceReduce alarmSilenceReduce;
    
    @Mock
    private AlerterProperties alerterProperties;

    private AlarmInhibitReduce alarmInhibitReduce;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(alertInhibitDao.findAlertInhibitsByEnableIsTrue())
            .thenReturn(Collections.emptyList());

        // Correctly set up AlerterProperties mock
        AlerterProperties.InhibitProperties inhibitProperties = new AlerterProperties.InhibitProperties();
        inhibitProperties.setTtl(60000);
        when(alerterProperties.getInhibit()).thenReturn(inhibitProperties);
        
        alarmInhibitReduce = new AlarmInhibitReduce(alarmSilenceReduce, alertInhibitDao, alerterProperties,
                new VirtualThreadProperties(), false);
    }

    @AfterEach
    void tearDown() {
        if (alarmInhibitReduce != null) {
            alarmInhibitReduce.destroy();
        }
    }

    @Test
    void whenNoInhibitRules_shouldForwardAlert() {
        SingleAlert alert = createSingleAlert("firing", "fp1", 
            createLabels("severity", "warning"));
        GroupAlert groupAlert = createGroupAlert("firing", 
            createLabels("severity", "warning"), 
            Stream.of(alert).collect(Collectors.toList()));
        
        alarmInhibitReduce.inhibitAlarm(groupAlert);
        
        verify(alarmSilenceReduce).silenceAlarm(groupAlert);
    }

    @Test
    void whenSourceAlertMatches_shouldInhibitTargetAlert() {
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .equalLabels(Collections.singletonList("instance"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        // Create and process source alert
        SingleAlert sourceAlert = createSingleAlert("firing", "fp1",
            createLabels("severity", "critical", "instance", "host1"));
        GroupAlert sourceGroupAlert = createGroupAlert("firing",
            createLabels("severity", "critical", "instance", "host1"),
            Stream.of(sourceAlert).collect(Collectors.toList()));
        alarmInhibitReduce.inhibitAlarm(sourceGroupAlert);
        
        // Create and process target alert
        SingleAlert targetAlert = createSingleAlert("firing", "fp2",
            createLabels("severity", "warning", "instance", "host1"));
        GroupAlert targetGroupAlert = createGroupAlert("firing",
            createLabels("severity", "warning", "instance", "host1"),
            Stream.of(targetAlert).collect(Collectors.toList()));
        alarmInhibitReduce.inhibitAlarm(targetGroupAlert);
        
        verify(alarmSilenceReduce).silenceAlarm(sourceGroupAlert);
        verify(alarmSilenceReduce, never()).silenceAlarm(targetGroupAlert);
    }

    @Test
    void whenSourceAlertDoesNotMatch_shouldNotInhibitTargetAlert() {
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .equalLabels(Arrays.asList("instance"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        // Create source alert with different instance
        GroupAlert sourceAlert = createGroupAlert("firing",
            createLabels("severity", "critical", "instance", "host1"),
            Collections.emptyList());
        alarmInhibitReduce.inhibitAlarm(sourceAlert);
        
        // Create target alert with different instance
        GroupAlert targetAlert = createGroupAlert("firing",
            createLabels("severity", "warning", "instance", "host2"),
            Collections.emptyList());
        alarmInhibitReduce.inhibitAlarm(targetAlert);
    }

    @Test
    void whenResolvedAlert_shouldNeverBeInhibited() {
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        GroupAlert sourceAlert = createGroupAlert("firing",
            createLabels("severity", "critical"),
            Collections.emptyList());
        GroupAlert resolvedAlert = createGroupAlert("resolved",
            createLabels("severity", "warning"),
            Collections.emptyList());
            
        alarmInhibitReduce.inhibitAlarm(sourceAlert);
        alarmInhibitReduce.inhibitAlarm(resolvedAlert);
    }

    @Test
    void whenNullGroupAlert_shouldHandleGracefully() {
        alarmInhibitReduce.inhibitAlarm(null);
        verify(alarmSilenceReduce, never()).silenceAlarm(null);
    }

    @Test
    void whenEmptyAlertList_shouldPassThrough() {
        GroupAlert alert = GroupAlert.builder()
                .alerts(new ArrayList<>())
                .build();
        
        alarmInhibitReduce.inhibitAlarm(alert);
        verify(alarmSilenceReduce).silenceAlarm(alert);
    }

    @Test
    void whenMultipleSourceAlerts_shouldInhibitAllMatchingTargets() {
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .equalLabels(Collections.singletonList("instance"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        // Create source alerts
        SingleAlert sourceAlert1 = createSingleAlert("firing", "fp1",
            createLabels("severity", "critical", "instance", "host1"));
        SingleAlert sourceAlert2 = createSingleAlert("firing", "fp2",
            createLabels("severity", "critical", "instance", "host2"));
        GroupAlert sourceGroupAlert = createGroupAlert("firing", null,
            new ArrayList<>(Arrays.asList(sourceAlert1, sourceAlert2)));
        alarmInhibitReduce.inhibitAlarm(sourceGroupAlert);
        
        // Create target alerts
        SingleAlert targetAlert1 = createSingleAlert("firing", "fp3",
            createLabels("severity", "warning", "instance", "host1"));
        SingleAlert targetAlert2 = createSingleAlert("firing", "fp4",
            createLabels("severity", "warning", "instance", "host2")); 
        SingleAlert targetAlert3 = createSingleAlert("firing", "fp5",
            createLabels("severity", "warning", "instance", "host3"));
        GroupAlert targetGroupAlert = createGroupAlert("firing", null,
            new ArrayList<>(Arrays.asList(targetAlert1, targetAlert2, targetAlert3)));
        
        alarmInhibitReduce.inhibitAlarm(targetGroupAlert);
        
        assertEquals(1, targetGroupAlert.getAlerts().size());
        assertEquals("fp5", targetGroupAlert.getAlerts().get(0).getFingerprint());
    }

    @Test
    void whenMultipleInhibitRules_shouldApplyAll() {
        AlertInhibit rule1 = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .equalLabels(Arrays.asList("instance"))
                .build();
                
        AlertInhibit rule2 = AlertInhibit.builder()
                .id(2L)
                .enable(true)
                .sourceLabels(createLabels("type", "disk"))
                .targetLabels(createLabels("type", "memory"))
                .equalLabels(Arrays.asList("host"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Arrays.asList(rule1, rule2));
        
        // Test both rules being applied
        SingleAlert sourceAlert = createSingleAlert("firing", "fp1",
            createLabels("severity", "critical", "type", "disk", 
                        "instance", "host1", "host", "server1"));
                        
        GroupAlert sourceGroupAlert = GroupAlert.builder()
                .alerts(Stream.of(sourceAlert).collect(Collectors.toList()))
                .build();
                
        alarmInhibitReduce.inhibitAlarm(sourceGroupAlert);
        
        // Create alerts that match different rules
        SingleAlert targetAlert1 = createSingleAlert("firing", "fp2",
            createLabels("severity", "warning", "instance", "host1"));
        SingleAlert targetAlert2 = createSingleAlert("firing", "fp3",
            createLabels("type", "memory", "host", "server1"));
            
        GroupAlert targetGroupAlert = GroupAlert.builder()
                .alerts(new ArrayList<>(Arrays.asList(targetAlert1, targetAlert2)))
                .status("firing")
                .build();
                
        alarmInhibitReduce.inhibitAlarm(targetGroupAlert);
        
        assertTrue(targetGroupAlert.getAlerts().isEmpty());
    }

    @Test
    void whenSourceAlertExpires_shouldNotInhibit() throws InterruptedException {
        // Configure short TTL for test
        AlerterProperties.InhibitProperties inhibitProperties = new AlerterProperties.InhibitProperties();
        inhibitProperties.setTtl(100);
        when(alerterProperties.getInhibit()).thenReturn(inhibitProperties);
        alarmInhibitReduce.destroy();
        alarmInhibitReduce = new AlarmInhibitReduce(alarmSilenceReduce, alertInhibitDao, alerterProperties,
                new VirtualThreadProperties(), false);
        
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .equalLabels(Collections.singletonList("instance"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        // Process source alert
        SingleAlert sourceAlert = createSingleAlert("firing", "fp1",
            createLabels("severity", "critical", "instance", "host1"));
        GroupAlert sourceGroupAlert = createGroupAlert("firing",
            createLabels("severity", "critical", "instance", "host1"),
                Stream.of(sourceAlert).collect(Collectors.toList()));
        alarmInhibitReduce.inhibitAlarm(sourceGroupAlert);
        
        // Wait for source alert to expire
        Thread.sleep(200);
        
        // Target alert should not be inhibited
        SingleAlert targetAlert = createSingleAlert("firing", "fp2",
            createLabels("severity", "warning", "instance", "host1"));
        GroupAlert targetGroupAlert = createGroupAlert("firing",
            createLabels("severity", "warning", "instance", "host1"),
            Stream.of(targetAlert).collect(Collectors.toList()));
        alarmInhibitReduce.inhibitAlarm(targetGroupAlert);
        
        verify(alarmSilenceReduce).silenceAlarm(targetGroupAlert);
    }

    @Test
    void dispatchCleanupCacheRunsOnVirtualThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicBoolean virtualThread = new AtomicBoolean(false);
        alarmInhibitReduce.destroy();
        alarmInhibitReduce = new TestAlarmInhibitReduce(alarmSilenceReduce, alertInhibitDao, alerterProperties,
                new VirtualThreadProperties(), latch, virtualThread, null, null, null, null, null);

        alarmInhibitReduce.dispatchCleanupCache();

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertTrue(virtualThread.get());
    }

    @Test
    void dispatchCleanupCacheDoesNotRunConcurrently() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        AtomicInteger maxConcurrent = new AtomicInteger();
        alarmInhibitReduce.destroy();
        alarmInhibitReduce = new TestAlarmInhibitReduce(alarmSilenceReduce, alertInhibitDao, alerterProperties,
                new VirtualThreadProperties(), null, null, firstStarted, releaseFirst, secondStarted,
                maxConcurrent, new AtomicInteger());

        alarmInhibitReduce.dispatchCleanupCache();
        assertTrue(firstStarted.await(5, TimeUnit.SECONDS));

        alarmInhibitReduce.dispatchCleanupCache();
        assertFalse(secondStarted.await(200, TimeUnit.MILLISECONDS));

        releaseFirst.countDown();
        assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
        assertEquals(1, maxConcurrent.get());
    }

    private GroupAlert createGroupAlert(String status, Map<String, String> labels, List<SingleAlert> alerts) {
        return GroupAlert.builder()
                .status(status)
                .commonLabels(labels)
                .alerts(alerts)
                .build();
    }

    private Map<String, String> createLabels(String... keyValues) {
        Map<String, String> labels = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            labels.put(keyValues[i], keyValues[i + 1]);
        }
        return labels;
    }

    private SingleAlert createSingleAlert(String status, String fingerprint, Map<String, String> labels) {
        return SingleAlert.builder()
                .status(status)
                .fingerprint(fingerprint)
                .labels(labels)
                .build();
    }

    private static final class TestAlarmInhibitReduce extends AlarmInhibitReduce {

        private final CountDownLatch virtualThreadLatch;

        private final AtomicBoolean virtualThread;

        private final CountDownLatch firstStarted;

        private final CountDownLatch releaseFirst;

        private final CountDownLatch secondStarted;

        private final AtomicInteger maxConcurrent;

        private final AtomicInteger concurrent;

        private final AtomicInteger invocations;

        private TestAlarmInhibitReduce(AlarmSilenceReduce alarmSilenceReduce, AlertInhibitDao alertInhibitDao,
                                       AlerterProperties alerterProperties, VirtualThreadProperties properties,
                                       CountDownLatch virtualThreadLatch, AtomicBoolean virtualThread,
                                       CountDownLatch firstStarted, CountDownLatch releaseFirst,
                                       CountDownLatch secondStarted, AtomicInteger maxConcurrent,
                                       AtomicInteger invocations) {
            super(alarmSilenceReduce, alertInhibitDao, alerterProperties, properties, false);
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
        void beforeCleanupCacheRun() {
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
