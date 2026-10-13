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

package org.apache.hertzbeat.startup.runtime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.junit.jupiter.api.Test;

class HertzBeatStartupProcessLifetimeTest {

    @Test
    void processLifetimeRemainsOwnedAcrossContextReplacementUntilCoordinatorClose() throws Exception {
        AtomicReference<SetupRuntimeTransition> transition = new AtomicReference<>();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                (decision, args, runtimeTransition) -> {
                    transition.set(runtimeTransition);
                    return context(decision.mode());
                });
        coordinator.start(new String[0]);
        Thread waiter = Thread.ofPlatform().name("startup-process-lifetime-test")
                .start(coordinator::awaitTermination);
        try {
            awaitWaiting(waiter);

            transition.get().completeSetup();

            assertTrue(waiter.isAlive());
            coordinator.close();
            waiter.join(Duration.ofSeconds(2));
            assertFalse(waiter.isAlive());
        } finally {
            coordinator.close();
            waiter.join(Duration.ofSeconds(2));
        }
    }

    @Test
    void processLifetimeWaitRestoresInterruptOnlyAfterCoordinatorClose() throws Exception {
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                (decision, args, runtimeTransition) -> context(decision.mode()));
        coordinator.start(new String[0]);
        AtomicBoolean interrupted = new AtomicBoolean();
        Thread waiter = Thread.ofPlatform().name("startup-process-lifetime-interrupt-test").start(() -> {
            Thread.currentThread().interrupt();
            coordinator.awaitTermination();
            interrupted.set(Thread.currentThread().isInterrupted());
        });
        try {
            awaitWaiting(waiter);

            assertTrue(waiter.isAlive());
            coordinator.close();
            waiter.join(Duration.ofSeconds(2));
            assertFalse(waiter.isAlive());
            assertTrue(interrupted.get());
        } finally {
            coordinator.close();
            waiter.join(Duration.ofSeconds(2));
        }
    }

    private static RunningApplicationContext context(RuntimeMode mode) {
        return new RunningApplicationContext() {
            private boolean active = true;

            @Override
            public RuntimeMode mode() {
                return mode;
            }

            @Override
            public boolean isActive() {
                return active;
            }

            @Override
            public void close() {
                active = false;
            }
        };
    }

    private static void awaitWaiting(Thread thread) throws InterruptedException {
        long deadline = System.nanoTime() + Duration.ofSeconds(2).toNanos();
        while (thread.getState() != Thread.State.WAITING && System.nanoTime() < deadline) {
            Thread.sleep(1);
        }
        assertTrue(thread.getState() == Thread.State.WAITING, "process lifetime waiter must block");
    }
}
