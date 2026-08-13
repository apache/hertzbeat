/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.concurrent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class WorkAdmissionGateTest {

    @Test
    void pauseRejectsNewWorkAndDrainsOnlyAdmittedWork() throws Exception {
        WorkAdmissionGate gate = new WorkAdmissionGate();
        WorkAdmissionGate.Permit admitted = gate.tryAcquire();

        gate.pauseAdmission();

        assertThat(gate.tryAcquire()).isNull();
        assertThatThrownBy(() -> gate.awaitDrained(0))
                .isInstanceOf(TimeoutException.class);

        admitted.close();
        gate.awaitDrained(TimeUnit.SECONDS.toNanos(1));
        gate.resumeAdmission();

        assertThat(gate.tryAcquire()).isNotNull().satisfies(WorkAdmissionGate.Permit::close);
    }

    @Test
    void repeatedPauseResumeDoesNotDuplicatePermits() throws Exception {
        WorkAdmissionGate gate = new WorkAdmissionGate();

        gate.pauseAdmission();
        gate.pauseAdmission();
        gate.awaitDrained(0);
        gate.resumeAdmission();
        gate.resumeAdmission();

        WorkAdmissionGate.Permit permit = gate.tryAcquire();
        assertThat(permit).isNotNull();
        permit.close();
        gate.awaitDrained(0);
    }

    @Test
    void waitingAdmissionResumesOnceAndInterruptDoesNotLeakPermit() throws Exception {
        WorkAdmissionGate gate = new WorkAdmissionGate();
        gate.pauseAdmission();
        AtomicReference<WorkAdmissionGate.Permit> resumed = new AtomicReference<>();
        Thread waiter = Thread.ofPlatform().start(() -> {
            try {
                resumed.set(gate.awaitAcquire());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        });
        while (gate.waitingWork() == 0) {
            Thread.onSpinWait();
        }

        gate.resumeAdmission();
        waiter.join(1_000);
        assertThat(waiter.isAlive()).isFalse();
        assertThat(resumed.get()).isNotNull();
        resumed.get().close();
        gate.awaitDrained(0);

        gate.pauseAdmission();
        AtomicBoolean interrupted = new AtomicBoolean();
        Thread interruptedWaiter = Thread.ofPlatform().start(() -> {
            try {
                gate.awaitAcquire();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                interrupted.set(Thread.currentThread().isInterrupted());
            }
        });
        while (gate.waitingWork() == 0) {
            Thread.onSpinWait();
        }
        interruptedWaiter.interrupt();
        interruptedWaiter.join(1_000);

        assertThat(interrupted.get()).isTrue();
        gate.awaitDrained(0);
    }

    @Test
    void terminalStopWakesWaiterAndResumeCannotReviveAdmission() throws Exception {
        WorkAdmissionGate gate = new WorkAdmissionGate();
        gate.pauseAdmission();
        AtomicReference<WorkAdmissionGate.Permit> result = new AtomicReference<>();
        Thread waiter = Thread.ofPlatform().start(() -> {
            try {
                result.set(gate.awaitAcquire());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        });
        while (gate.waitingWork() == 0) {
            Thread.onSpinWait();
        }

        gate.stop();
        gate.resumeAdmission();
        waiter.join(1_000);

        assertThat(waiter.isAlive()).isFalse();
        assertThat(result.get()).isNull();
        assertThat(gate.tryAcquire()).isNull();
    }
}
