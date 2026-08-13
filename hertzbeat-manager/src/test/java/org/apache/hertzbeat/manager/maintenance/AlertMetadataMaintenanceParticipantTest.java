/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;

import java.time.Duration;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.alert.calculate.periodic.PeriodicAlertRuleScheduler;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.reduce.AlarmGroupReduce;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.mockito.Mockito;

class AlertMetadataMaintenanceParticipantTest {

    @Test
    void eachProducerDrainsBeforeTheNextCutCloses() throws Exception {
        PeriodicAlertRuleScheduler periodic = Mockito.mock(PeriodicAlertRuleScheduler.class);
        AlarmCommonReduce common = Mockito.mock(AlarmCommonReduce.class);
        AlarmGroupReduce group = Mockito.mock(AlarmGroupReduce.class);
        CountDownLatch periodicDrainEntered = new CountDownLatch(1);
        CountDownLatch releasePeriodic = new CountDownLatch(1);
        CountDownLatch commonDrainEntered = new CountDownLatch(1);
        CountDownLatch releaseCommon = new CountDownLatch(1);
        Mockito.doAnswer(invocation -> {
            periodicDrainEntered.countDown();
            releasePeriodic.await();
            return null;
        }).when(periodic).awaitDrained(anyLong());
        Mockito.doAnswer(invocation -> {
            commonDrainEntered.countDown();
            releaseCommon.await();
            return null;
        }).when(common).awaitDrained(anyLong());
        AlertMetadataMaintenanceParticipant participant =
                new AlertMetadataMaintenanceParticipant(periodic, common, group);
        Thread quiesce = Thread.ofPlatform().start(() -> participant.quiesce(Duration.ofSeconds(30)));

        org.assertj.core.api.Assertions.assertThat(periodicDrainEntered.await(1, TimeUnit.SECONDS)).isTrue();
        verify(common, never()).pauseAdmission();
        releasePeriodic.countDown();
        org.assertj.core.api.Assertions.assertThat(commonDrainEntered.await(1, TimeUnit.SECONDS)).isTrue();
        verify(group, never()).pauseAdmission();
        releaseCommon.countDown();
        quiesce.join(1_000);

        org.assertj.core.api.Assertions.assertThat(quiesce.isAlive()).isFalse();
    }

    @Test
    void pausesAndDrainsForwardThenResumesInReverse() throws Exception {
        PeriodicAlertRuleScheduler periodic = Mockito.mock(PeriodicAlertRuleScheduler.class);
        AlarmCommonReduce common = Mockito.mock(AlarmCommonReduce.class);
        AlarmGroupReduce group = Mockito.mock(AlarmGroupReduce.class);
        AlertMetadataMaintenanceParticipant participant =
                new AlertMetadataMaintenanceParticipant(periodic, common, group);

        participant.quiesce(Duration.ofSeconds(1));
        participant.resume();

        InOrder order = inOrder(periodic, common, group);
        order.verify(periodic).pauseAdmission();
        order.verify(periodic).awaitDrained(anyLong());
        order.verify(common).pauseAdmission();
        order.verify(common).awaitDrained(anyLong());
        order.verify(group).pauseAdmission();
        order.verify(group).awaitDrained(anyLong());
        order.verify(group).resumeAdmission();
        order.verify(common).resumeAdmission();
        order.verify(periodic).resumeAdmission();
    }

    @Test
    void drainTimeoutRollsBackInReverseWithSafeFailure() throws Exception {
        PeriodicAlertRuleScheduler periodic = Mockito.mock(PeriodicAlertRuleScheduler.class);
        AlarmCommonReduce common = Mockito.mock(AlarmCommonReduce.class);
        AlarmGroupReduce group = Mockito.mock(AlarmGroupReduce.class);
        Mockito.doThrow(new TimeoutException("private-rule")).when(common).awaitDrained(anyLong());
        AlertMetadataMaintenanceParticipant participant =
                new AlertMetadataMaintenanceParticipant(periodic, common, group);

        assertThatThrownBy(() -> participant.quiesce(Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception -> {
                    org.assertj.core.api.Assertions.assertThat(exception.code())
                            .isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT);
                    org.assertj.core.api.Assertions.assertThat(exception.safeMessage()).doesNotContain("private-rule");
                    org.assertj.core.api.Assertions.assertThat(exception.getCause()).isNull();
                });

        InOrder order = inOrder(periodic, common, group);
        order.verify(periodic).pauseAdmission();
        order.verify(periodic).awaitDrained(anyLong());
        order.verify(common).pauseAdmission();
        order.verify(common).awaitDrained(anyLong());
        order.verify(common).resumeAdmission();
        order.verify(periodic).resumeAdmission();
    }

    @Test
    void timeoutIsNotHiddenWhenCommonReplayIsRejected() throws Exception {
        PeriodicAlertRuleScheduler periodic = Mockito.mock(PeriodicAlertRuleScheduler.class);
        AlarmCommonReduce common = Mockito.mock(AlarmCommonReduce.class);
        AlarmGroupReduce group = Mockito.mock(AlarmGroupReduce.class);
        Mockito.doThrow(new TimeoutException()).when(common).awaitDrained(anyLong());
        doThrow(new IllegalStateException("rejected")).when(common).resumeAdmission();
        AlertMetadataMaintenanceParticipant participant =
                new AlertMetadataMaintenanceParticipant(periodic, common, group);

        assertThatThrownBy(() -> participant.quiesce(Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        org.assertj.core.api.Assertions.assertThat(exception.code())
                                .isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT));

        verify(periodic).resumeAdmission();
    }

    @Test
    void interruptIsRestoredWhenCommonReplayIsRejected() throws Exception {
        PeriodicAlertRuleScheduler periodic = Mockito.mock(PeriodicAlertRuleScheduler.class);
        AlarmCommonReduce common = Mockito.mock(AlarmCommonReduce.class);
        AlarmGroupReduce group = Mockito.mock(AlarmGroupReduce.class);
        CountDownLatch entered = new CountDownLatch(1);
        Mockito.doAnswer(invocation -> {
            entered.countDown();
            new CountDownLatch(1).await();
            return null;
        }).when(common).awaitDrained(anyLong());
        doThrow(new IllegalStateException("rejected")).when(common).resumeAdmission();
        AlertMetadataMaintenanceParticipant participant =
                new AlertMetadataMaintenanceParticipant(periodic, common, group);
        java.util.concurrent.atomic.AtomicReference<MetadataMaintenanceException> failure =
                new java.util.concurrent.atomic.AtomicReference<>();
        java.util.concurrent.atomic.AtomicBoolean interrupted = new java.util.concurrent.atomic.AtomicBoolean();
        Thread thread = Thread.ofPlatform().start(() -> {
            try {
                participant.quiesce(Duration.ofSeconds(30));
            } catch (MetadataMaintenanceException exception) {
                failure.set(exception);
                interrupted.set(Thread.currentThread().isInterrupted());
            }
        });

        org.assertj.core.api.Assertions.assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        thread.interrupt();
        thread.join(1_000);

        org.assertj.core.api.Assertions.assertThat(failure.get().code())
                .isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_INTERRUPTED);
        org.assertj.core.api.Assertions.assertThat(interrupted).isTrue();
        verify(periodic).resumeAdmission();
    }
}
