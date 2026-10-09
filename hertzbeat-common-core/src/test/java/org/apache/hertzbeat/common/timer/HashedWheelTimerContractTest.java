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

package org.apache.hertzbeat.common.timer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class HashedWheelTimerContractTest {
    private final List<HashedWheelTimer> timers = new ArrayList<>();

    @AfterEach
    void stopTimers() {
        timers.forEach(HashedWheelTimer::stop);
    }

    @Test
    void callbackRetainsTimeoutTaskAndTimerIdentity() throws Exception {
        HashedWheelTimer timer = timer();
        CountDownLatch ran = new CountDownLatch(1);
        AtomicReference<Timeout> observed = new AtomicReference<>();
        TimerTask task = timeout -> {
            observed.set(timeout);
            ran.countDown();
        };
        Timeout timeout = timer.newTimeout(task, 0, TimeUnit.MILLISECONDS);
        assertTrue(ran.await(5, TimeUnit.SECONDS));
        assertSame(timeout, observed.get());
        assertSame(task, timeout.task());
        assertSame(timer, timeout.timer());
        assertTrue(timeout.isExpired());
        assertFalse(timeout.isCancelled());
        assertFalse(timer.isStop());
    }

    @Test
    void cancellationIsIdempotentAndExcludedFromPendingStopResult() {
        HashedWheelTimer timer = timer();
        Timeout timeout = timer.newTimeout(ignored -> { }, 1, TimeUnit.DAYS);
        assertTrue(timeout.cancel());
        assertFalse(timeout.cancel());
        assertTrue(timeout.isCancelled());
        assertFalse(timeout.isExpired());
        assertFalse(timer.stop().contains(timeout));
    }

    @Test
    void shutdownReturnsOriginalPendingHandlesAndRejectsFurtherScheduling() {
        HashedWheelTimer timer = timer();
        Timeout first = timer.newTimeout(ignored -> { }, 1, TimeUnit.DAYS);
        Timeout second = timer.newTimeout(ignored -> { }, 2, TimeUnit.DAYS);
        assertEquals(Set.of(first, second), timer.stop());
        assertFalse(first.isExpired());
        assertTrue(first.cancel());
        assertTrue(first.isCancelled());
        assertTrue(timer.isStop());
        assertTrue(timer.stop().isEmpty());
        assertThrows(IllegalStateException.class, () -> timer.newTimeout(ignored -> { }, 0, TimeUnit.MILLISECONDS));
        assertThrows(IllegalStateException.class, timer::start);
    }

    @Test
    void callbackCanRescheduleThroughItsOwningTimer() throws Exception {
        HashedWheelTimer timer = timer();
        CountDownLatch ran = new CountDownLatch(2);
        AtomicInteger calls = new AtomicInteger();
        TimerTask task = new TimerTask() {
            @Override
            public void run(Timeout timeout) {
                if (calls.incrementAndGet() == 1) {
                    timeout.timer().newTimeout(this, 10, TimeUnit.MILLISECONDS);
                }
                ran.countDown();
            }
        };
        timer.newTimeout(task, 0, TimeUnit.MILLISECONDS);
        assertTrue(ran.await(5, TimeUnit.SECONDS));
        assertEquals(2, calls.get());
    }

    @Test
    void callbackCannotStopItsWorkerOrChangeTheStoppedState() throws Exception {
        HashedWheelTimer timer = timer();
        CountDownLatch ran = new CountDownLatch(1);
        AtomicReference<Throwable> failure = new AtomicReference<>();
        timer.newTimeout(ignored -> {
            try {
                timer.stop();
            } catch (Throwable thrown) {
                failure.set(thrown);
            } finally {
                ran.countDown();
            }
        }, 0, TimeUnit.MILLISECONDS);
        assertTrue(ran.await(5, TimeUnit.SECONDS));
        assertTrue(failure.get() instanceof IllegalStateException);
        assertFalse(timer.isStop());
    }

    @Test
    void stoppingBeforeStartIsTerminalAndRepeatedStartIsSafe() {
        HashedWheelTimer stopped = timer();
        assertTrue(stopped.stop().isEmpty());
        assertTrue(stopped.isStop());
        assertThrows(IllegalStateException.class, stopped::start);
        HashedWheelTimer started = timer();
        started.start();
        started.start();
        assertFalse(started.isStop());
    }

    @Test
    void pendingLimitRejectsAdditionalWork() {
        HashedWheelTimer timer = new HashedWheelTimer(Executors.defaultThreadFactory(), 10,
                TimeUnit.MILLISECONDS, 32, 1);
        timers.add(timer);
        Timeout accepted = timer.newTimeout(ignored -> { }, 1, TimeUnit.DAYS);
        assertThrows(RejectedExecutionException.class,
                () -> timer.newTimeout(ignored -> { }, 1, TimeUnit.DAYS));
        assertEquals(Set.of(accepted), timer.stop());
    }

    @Test
    void shutdownPublishesStateBeforeWaitingForTheRunningCallback() throws Exception {
        HashedWheelTimer timer = timer();
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch hold = new CountDownLatch(1);
        AtomicBoolean observedStopped = new AtomicBoolean();
        AtomicBoolean rescheduleRejected = new AtomicBoolean();
        timer.newTimeout(ignored -> {
            entered.countDown();
            try {
                hold.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException expected) {
                observedStopped.set(timer.isStop());
                try {
                    timer.newTimeout(next -> { }, 1, TimeUnit.DAYS);
                } catch (IllegalStateException stopped) {
                    rescheduleRejected.set(true);
                }
            }
        }, 0, TimeUnit.MILLISECONDS);
        assertTrue(entered.await(5, TimeUnit.SECONDS));
        timer.stop();
        assertTrue(observedStopped.get());
        assertTrue(rescheduleRejected.get());
    }

    private HashedWheelTimer timer() {
        HashedWheelTimer timer = new HashedWheelTimer(10, TimeUnit.MILLISECONDS, 32);
        timers.add(timer);
        return timer;
    }
}
