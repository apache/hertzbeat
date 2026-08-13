/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.component.status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.maintenance.MaintenanceDeadline;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceErrorCode;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceException;
import org.junit.jupiter.api.Test;

class PausableDispatchTaskTest {

    @Test
    void pendingDueRunIsCoalescedAcrossPauseAndDrain() throws Exception {
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondEntered = new CountDownLatch(1);
        AtomicInteger invocations = new AtomicInteger();
        try (ExecutorService executor = Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory())) {
            PausableDispatchTask task = new PausableDispatchTask(executor, () -> {
                int invocation = invocations.incrementAndGet();
                if (invocation == 1) {
                    firstEntered.countDown();
                    await(releaseFirst);
                } else {
                    secondEntered.countDown();
                }
            });

            task.dispatch();
            assertThat(firstEntered.await(1, TimeUnit.SECONDS)).isTrue();
            task.dispatch();
            task.pauseAdmission();
            releaseFirst.countDown();
            task.awaitDrained(MaintenanceDeadline.start(Duration.ofSeconds(1)));
            assertThat(invocations).hasValue(1);

            task.resumeAdmission();
            task.resumeAdmission();
            assertThat(secondEntered.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(invocations).hasValue(2);
        }
    }

    @Test
    void synchronousModeUsesTheSameRunningAndDrainAccounting() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        PausableDispatchTask task = new PausableDispatchTask(null, () -> {
            entered.countDown();
            await(release);
        });
        Thread runner = Thread.ofPlatform().unstarted(task::dispatch);
        runner.start();
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        task.pauseAdmission();

        assertThatThrownBy(() -> task.awaitDrained(MaintenanceDeadline.start(Duration.ZERO)))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT));

        release.countDown();
        task.awaitDrained(MaintenanceDeadline.start(Duration.ofSeconds(1)));
        runner.join(1_000);
        assertThat(runner.isAlive()).isFalse();
    }

    private void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
