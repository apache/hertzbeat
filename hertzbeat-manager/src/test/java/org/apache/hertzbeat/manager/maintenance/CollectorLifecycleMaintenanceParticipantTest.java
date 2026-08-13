/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.alert.calculate.CollectorAlertHandler;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.manager.scheduler.CollectorJobScheduler;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.mockito.Mockito;

class CollectorLifecycleMaintenanceParticipantTest {

    @Test
    void runningTransitionsAreSerializedPerIdentityAndLatestRunsLast() throws Exception {
        CollectorJobScheduler scheduler = Mockito.mock(CollectorJobScheduler.class);
        CollectorAlertHandler alerts = Mockito.mock(CollectorAlertHandler.class);
        CountDownLatch onlineAlertEntered = new CountDownLatch(1);
        CountDownLatch releaseOnlineAlert = new CountDownLatch(1);
        Mockito.doAnswer(invocation -> {
            onlineAlertEntered.countDown();
            releaseOnlineAlert.await();
            return null;
        }).when(alerts).online("collector-a");
        CollectorLifecycleMaintenanceParticipant participant =
                new CollectorLifecycleMaintenanceParticipant(scheduler, alerts);
        CollectorInfo info = CollectorInfo.builder().version("current").build();
        Thread online = Thread.ofPlatform().start(() -> participant.collectorOnline("collector-a", info, true));
        assertThat(onlineAlertEntered.await(1, TimeUnit.SECONDS)).isTrue();
        CountDownLatch offlineInvoked = new CountDownLatch(1);
        Thread offline = Thread.ofPlatform().start(() -> {
            offlineInvoked.countDown();
            participant.collectorOffline("collector-a", false);
        });
        assertThat(offlineInvoked.await(1, TimeUnit.SECONDS)).isTrue();

        releaseOnlineAlert.countDown();
        online.join(1_000);
        offline.join(1_000);

        InOrder order = inOrder(alerts, scheduler);
        order.verify(alerts).online("collector-a");
        order.verify(scheduler).collectorGoOnline("collector-a", info);
        order.verify(scheduler).collectorGoOffline("collector-a");
        verify(alerts, never()).offline("collector-a");
    }

    @Test
    void inFlightSpansStatusJobsAndPairedHealthAlertSubmission() throws Exception {
        CollectorJobScheduler scheduler = Mockito.mock(CollectorJobScheduler.class);
        CollectorAlertHandler alerts = Mockito.mock(CollectorAlertHandler.class);
        CountDownLatch schedulerEntered = new CountDownLatch(1);
        CountDownLatch releaseScheduler = new CountDownLatch(1);
        CountDownLatch alertEntered = new CountDownLatch(1);
        CountDownLatch releaseAlert = new CountDownLatch(1);
        Mockito.doAnswer(invocation -> {
            schedulerEntered.countDown();
            releaseScheduler.await();
            return null;
        }).when(scheduler).collectorGoOffline("collector-a");
        Mockito.doAnswer(invocation -> {
            alertEntered.countDown();
            releaseAlert.await();
            return null;
        }).when(alerts).offline("collector-a");
        CollectorLifecycleMaintenanceParticipant participant =
                new CollectorLifecycleMaintenanceParticipant(scheduler, alerts);
        Thread transition = Thread.ofPlatform().start(() -> participant.collectorOffline("collector-a", true));
        assertThat(schedulerEntered.await(1, TimeUnit.SECONDS)).isTrue();

        assertTimeout(participant);
        releaseScheduler.countDown();
        assertThat(alertEntered.await(1, TimeUnit.SECONDS)).isTrue();
        assertTimeout(participant);
        releaseAlert.countDown();
        transition.join(1_000);
        assertThat(transition.isAlive()).isFalse();
    }

    @Test
    void pausedTransitionsCoalesceToLatestIntentWithoutChangingAlertSemantics() {
        CollectorJobScheduler scheduler = Mockito.mock(CollectorJobScheduler.class);
        CollectorAlertHandler alerts = Mockito.mock(CollectorAlertHandler.class);
        CollectorLifecycleMaintenanceParticipant participant =
                new CollectorLifecycleMaintenanceParticipant(scheduler, alerts);
        CollectorInfo first = CollectorInfo.builder().version("first").build();
        CollectorInfo latest = CollectorInfo.builder().version("latest").build();
        participant.quiesce(Duration.ofSeconds(1));

        participant.collectorOnline("collector-a", first, true);
        participant.collectorOffline("collector-a", true);
        participant.collectorOnline("collector-a", latest, true);
        participant.collectorOffline("collector-b", false);
        verify(scheduler, never()).collectorGoOnline(Mockito.anyString(), Mockito.any());
        verify(scheduler, never()).collectorGoOffline(Mockito.anyString());

        participant.resume();

        InOrder onlineOrder = inOrder(alerts, scheduler);
        onlineOrder.verify(alerts).online("collector-a");
        onlineOrder.verify(scheduler).collectorGoOnline("collector-a", latest);
        verify(scheduler).collectorGoOffline("collector-b");
        verify(alerts, never()).offline("collector-b");
        verify(alerts, never()).offline("collector-a");
    }

    @Test
    void timeoutReopensAdmissionWithoutReplayingAcrossRunningTransition() throws Exception {
        CollectorJobScheduler scheduler = Mockito.mock(CollectorJobScheduler.class);
        CollectorAlertHandler alerts = Mockito.mock(CollectorAlertHandler.class);
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondEntered = new CountDownLatch(1);
        Mockito.doAnswer(invocation -> {
            firstEntered.countDown();
            releaseFirst.await();
            return null;
        }).when(scheduler).collectorGoOffline("collector-a");
        Mockito.doAnswer(invocation -> {
            secondEntered.countDown();
            return null;
        }).when(scheduler).collectorGoOnline(Mockito.eq("collector-a"), Mockito.any());
        CollectorLifecycleMaintenanceParticipant participant =
                new CollectorLifecycleMaintenanceParticipant(scheduler, alerts);
        Thread first = Thread.ofPlatform().start(() -> participant.collectorOffline("collector-a", false));
        assertThat(firstEntered.await(1, TimeUnit.SECONDS)).isTrue();

        assertTimeout(participant);
        Thread second = Thread.ofPlatform().start(() -> participant.collectorOnline(
                "collector-a", CollectorInfo.builder().version("latest").build(), false));
        second.join(1_000);
        assertThat(second.isAlive()).isFalse();
        assertThat(secondEntered.getCount()).isEqualTo(1);

        releaseFirst.countDown();
        assertThat(secondEntered.await(1, TimeUnit.SECONDS)).isTrue();
        first.join(1_000);
    }

    @Test
    void newerIntentRunsAfterFailedOlderIntentAndOlderIsNotRetried() throws Exception {
        CollectorJobScheduler scheduler = Mockito.mock(CollectorJobScheduler.class);
        CollectorAlertHandler alerts = Mockito.mock(CollectorAlertHandler.class);
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondEntered = new CountDownLatch(1);
        AtomicReference<RuntimeException> failure = new AtomicReference<>();
        CollectorInfo info = CollectorInfo.builder().version("old").build();
        Mockito.doAnswer(invocation -> {
            firstEntered.countDown();
            releaseFirst.await();
            throw new IllegalStateException("safe fixture failure");
        }).when(scheduler).collectorGoOnline("collector-a", info);
        Mockito.doAnswer(invocation -> {
            secondEntered.countDown();
            return null;
        }).when(scheduler).collectorGoOffline("collector-a");
        CollectorLifecycleMaintenanceParticipant participant =
                new CollectorLifecycleMaintenanceParticipant(scheduler, alerts);
        Thread first = Thread.ofPlatform().start(() -> {
            try {
                participant.collectorOnline("collector-a", info, false);
            } catch (RuntimeException exception) {
                failure.set(exception);
            }
        });
        assertThat(firstEntered.await(1, TimeUnit.SECONDS)).isTrue();
        participant.collectorOffline("collector-a", false);

        releaseFirst.countDown();
        assertThat(secondEntered.await(1, TimeUnit.SECONDS)).isTrue();
        first.join(1_000);
        participant.quiesce(Duration.ofSeconds(1));
        participant.resume();

        assertThat(failure.get()).isInstanceOf(IllegalStateException.class);
        InOrder order = inOrder(scheduler);
        order.verify(scheduler).collectorGoOnline("collector-a", info);
        order.verify(scheduler).collectorGoOffline("collector-a");
        verify(scheduler, Mockito.times(1)).collectorGoOnline("collector-a", info);
    }

    private void assertTimeout(CollectorLifecycleMaintenanceParticipant participant) {
        assertThatThrownBy(() -> participant.quiesce(Duration.ZERO))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT));
    }
}
