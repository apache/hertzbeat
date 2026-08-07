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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.junit.jupiter.api.Test;

class HertzBeatStartupCoordinatorTest {

    @Test
    void startsFromProbeAndClosesGatedContextBeforeOpeningNormalExactlyOnce() {
        RecordingLauncher launcher = new RecordingLauncher();
        StartupDecision gated = new StartupDecision(RuntimeMode.FULL_SETUP_GATED,
                SetupPhase.ADMINISTRATOR_REQUIRED, null);
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(() -> gated, launcher);

        RunningApplicationContext first = coordinator.start(new String[]{"--server.port=0"});
        SetupRuntimeTransition transition = launcher.transitions.getFirst();
        transition.completeSetup();
        RunningApplicationContext normal = coordinator.currentContext();
        transition.completeSetup();
        RunningApplicationContext repeated = coordinator.currentContext();

        assertEquals(List.of("open:full_setup_gated", "close:full_setup_gated", "open:normal"), launcher.events);
        assertEquals(List.of(coordinator, coordinator), launcher.transitions);
        assertSame(normal, repeated);
        assertEquals(RuntimeMode.NORMAL, coordinator.mode());
        assertFalse(first.isActive());
    }

    @Test
    void launchFailureClosesOldContextAndFallsBackToRecovery() {
        RecordingLauncher launcher = new RecordingLauncher();
        launcher.failMode = RuntimeMode.FULL_SETUP_GATED;
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                () -> new StartupDecision(RuntimeMode.SETUP_ONLY, SetupPhase.CONFIGURATION_REQUIRED, null), launcher);
        coordinator.start(new String[0]);

        RunningApplicationContext recovery = coordinator.transition(new StartupDecision(
                RuntimeMode.FULL_SETUP_GATED, SetupPhase.ADMINISTRATOR_REQUIRED, null));

        assertEquals(List.of("open:setup_only", "close:setup_only", "open:full_setup_gated", "open:recovery"),
                launcher.events);
        assertEquals(RuntimeMode.RECOVERY, coordinator.mode());
        assertSame(recovery, coordinator.currentContext());
    }

    @Test
    void probeFailureCannotBeMisclassifiedAsNewInstallation() {
        RecordingLauncher launcher = new RecordingLauncher();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                () -> {
                    throw new IllegalStateException("database unreachable");
                }, launcher);

        coordinator.start(new String[0]);

        assertEquals(List.of("open:recovery"), launcher.events);
        assertEquals(RuntimeMode.RECOVERY, coordinator.mode());
    }

    @Test
    void recoveryFailureRetainsOriginalLaunchFailureAsSuppressed() {
        RecordingLauncher launcher = new RecordingLauncher();
        launcher.failMode = RuntimeMode.NORMAL;
        launcher.failRecovery = true;
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(StartupDecision::normal, launcher);

        IllegalStateException failure = assertThrows(IllegalStateException.class,
                () -> coordinator.start(new String[0]));

        assertEquals("launch failed: recovery", failure.getMessage());
        assertEquals(1, failure.getSuppressed().length);
        assertEquals("launch failed: normal", failure.getSuppressed()[0].getMessage());
    }

    @Test
    void nullContextIsAnExplicitLaunchFailure() {
        StartupContextLauncher launcher = (decision, args, transition) -> null;
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(StartupDecision::normal, launcher);

        NullPointerException failure = assertThrows(NullPointerException.class,
                () -> coordinator.start(new String[0]));

        assertEquals("startup context launcher returned null for recovery", failure.getMessage());
        assertEquals(1, failure.getSuppressed().length);
        assertEquals("startup context launcher returned null for normal", failure.getSuppressed()[0].getMessage());
    }

    private static final class RecordingLauncher implements StartupContextLauncher {

        private final List<String> events = new ArrayList<>();
        private final List<SetupRuntimeTransition> transitions = new ArrayList<>();
        private RuntimeMode failMode;
        private boolean failRecovery;

        @Override
        public RunningApplicationContext launch(
                StartupDecision decision, String[] args, SetupRuntimeTransition setupRuntimeTransition) {
            events.add("open:" + decision.mode().value());
            transitions.add(setupRuntimeTransition);
            if (decision.mode() == failMode || (decision.mode() == RuntimeMode.RECOVERY && failRecovery)) {
                throw new IllegalStateException("launch failed: " + decision.mode().value());
            }
            return new RunningApplicationContext() {
                private boolean active = true;

                @Override
                public RuntimeMode mode() {
                    return decision.mode();
                }

                @Override
                public boolean isActive() {
                    return active;
                }

                @Override
                public void close() {
                    active = false;
                    events.add("close:" + decision.mode().value());
                }
            };
        }
    }
}
