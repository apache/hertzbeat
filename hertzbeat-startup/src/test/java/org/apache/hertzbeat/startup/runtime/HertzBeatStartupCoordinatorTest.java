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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class HertzBeatStartupCoordinatorTest {

    @TempDir
    private Path installationRoot;

    @Test
    void commandLineDatasourceParticipatesInThePreSpringDecision() {
        String previous = System.getProperty(SetupInstallationPaths.ROOT_PROPERTY);
        System.setProperty(SetupInstallationPaths.ROOT_PROPERTY, installationRoot.toString());
        try {
            RecordingLauncher launcher = new RecordingLauncher();
            HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                    new StartupModePropertyProbe(new LocalInstallationStartupProbe()), launcher);

            coordinator.start(new String[] {
                    "--" + SetupInstallationPaths.ROOT_PROPERTY + "=" + installationRoot,
                    "--spring.datasource.url=jdbc:postgresql://database.example.test/hertzbeat"
            });

            assertEquals(RuntimeMode.FULL_SETUP_GATED, coordinator.mode());
        } finally {
            restoreSystemProperty(SetupInstallationPaths.ROOT_PROPERTY, previous);
        }
    }

    @Test
    void commandLineStartupModeTakesPrecedenceOverSystemProperty() {
        String previous = System.getProperty(StartupModePropertyProbe.PROPERTY_NAME);
        System.setProperty(StartupModePropertyProbe.PROPERTY_NAME, RuntimeMode.FULL_SETUP_GATED.value());
        try {
            RecordingLauncher launcher = new RecordingLauncher();
            HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                    new StartupModePropertyProbe(ignored -> StartupDecision.normal()), launcher);

            coordinator.start(new String[] {
                    "--" + StartupModePropertyProbe.PROPERTY_NAME + "=" + RuntimeMode.SETUP_ONLY.value(),
                    "--" + RuntimeMode.PROPERTY_NAME + "=" + RuntimeMode.NORMAL.value()
            });

            assertEquals(RuntimeMode.SETUP_ONLY, coordinator.mode());
        } finally {
            restoreSystemProperty(StartupModePropertyProbe.PROPERTY_NAME, previous);
        }
    }

    @Test
    void startsFromProbeAndClosesGatedContextBeforeOpeningNormalExactlyOnce() {
        RecordingLauncher launcher = new RecordingLauncher();
        StartupDecision gated = new StartupDecision(RuntimeMode.FULL_SETUP_GATED);
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(ignored -> gated, launcher);

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
    void normalLaunchFallbackToRecoveryCanReprobeAndConvergeAfterConfiguration() {
        RecordingLauncher launcher = new RecordingLauncher();
        launcher.failMode = RuntimeMode.NORMAL;
        AtomicInteger probeCalls = new AtomicInteger();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> probeCalls.getAndIncrement() == 0
                        ? StartupDecision.normal()
                        : new StartupDecision(RuntimeMode.FULL_SETUP_GATED), launcher);

        coordinator.start(new String[0]);
        launcher.failMode = null;
        coordinator.configurationApplied();

        assertEquals(2, probeCalls.get());
        assertEquals(RuntimeMode.FULL_SETUP_GATED, coordinator.mode());
        assertEquals(List.of(
                "open:normal", "open:recovery", "close:recovery", "open:full_setup_gated"),
                launcher.events);
    }

    @Test
    void launchFailureClosesOldContextAndFallsBackToRecovery() {
        RecordingLauncher launcher = new RecordingLauncher();
        launcher.failMode = RuntimeMode.FULL_SETUP_GATED;
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> new StartupDecision(RuntimeMode.SETUP_ONLY), launcher);
        coordinator.start(new String[0]);

        RunningApplicationContext recovery = coordinator.transition(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED));

        assertEquals(List.of("open:setup_only", "close:setup_only", "open:full_setup_gated", "open:recovery"),
                launcher.events);
        assertEquals(RuntimeMode.RECOVERY, coordinator.mode());
        assertSame(recovery, coordinator.currentContext());
    }

    @Test
    void probeFailureCannotBeMisclassifiedAsNewInstallation() {
        RecordingLauncher launcher = new RecordingLauncher();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> {
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
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> StartupDecision.normal(), launcher);

        IllegalStateException failure = assertThrows(IllegalStateException.class,
                () -> coordinator.start(new String[0]));

        assertEquals("launch failed: recovery", failure.getMessage());
        assertEquals(1, failure.getSuppressed().length);
        assertEquals("launch failed: normal", failure.getSuppressed()[0].getMessage());
    }

    @Test
    void nullContextIsAnExplicitLaunchFailure() {
        StartupContextLauncher launcher = (decision, args, transition) -> null;
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> StartupDecision.normal(), launcher);

        NullPointerException failure = assertThrows(NullPointerException.class,
                () -> coordinator.start(new String[0]));

        assertEquals("startup context launcher returned null for recovery", failure.getMessage());
        assertEquals(1, failure.getSuppressed().length);
        assertEquals("startup context launcher returned null for normal", failure.getSuppressed()[0].getMessage());
    }

    @Test
    void officialStartupOwnsRootBeforeProbeAndFailsFatallyOnContention() {
        StartupInstallationRootResolver resolver = new StartupInstallationRootResolver();
        String[] args = rootArgs();
        AtomicInteger probes = new AtomicInteger();
        OfficialRecordingLauncher launcher = new OfficialRecordingLauncher();
        try (StandaloneDeploymentOwner existing = StandaloneDeploymentOwner.acquire(resolver.resolve(args))) {
            HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                    ignored -> {
                        probes.incrementAndGet();
                        return StartupDecision.normal();
                    }, launcher, resolver, StandaloneDeploymentOwnerFactory.system());

            assertThrows(StandaloneDeploymentOwnerException.class, () -> coordinator.start(args));
            assertEquals(0, probes.get());
            assertTrue(launcher.events.isEmpty());
        }
    }

    @Test
    void gatedCompletionKeepsOwnerAcrossContextSwitchAndExposesOnlyConfirmedNormalView() {
        StartupInstallationRootResolver resolver = new StartupInstallationRootResolver();
        String[] args = rootArgs();
        OfficialRecordingLauncher launcher = new OfficialRecordingLauncher();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> new StartupDecision(RuntimeMode.FULL_SETUP_GATED), launcher,
                resolver, StandaloneDeploymentOwnerFactory.system());

        coordinator.start(args);
        assertNull(launcher.views.getFirst());
        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> StandaloneDeploymentOwner.acquire(resolver.resolve(args)));
        launcher.transitions.getFirst().completeSetup();

        assertTrue(launcher.views.getLast().isValid());
        assertEquals(List.of("open:full_setup_gated", "close:full_setup_gated", "open:normal"), launcher.events);
        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> StandaloneDeploymentOwner.acquire(resolver.resolve(args)));
        coordinator.close();
        assertFalse(launcher.views.getLast().isValid());
        try (StandaloneDeploymentOwner ignored = StandaloneDeploymentOwner.acquire(resolver.resolve(args))) {
            assertTrue(ignored.isValid());
        }
    }

    @Test
    void forcedNormalDoesNotReceiveAuthorityWithoutTrustedCompletion() {
        OfficialRecordingLauncher launcher = new OfficialRecordingLauncher();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                new StartupModePropertyProbe(ignored -> new StartupDecision(RuntimeMode.FULL_SETUP_GATED)),
                launcher, new StartupInstallationRootResolver(), StandaloneDeploymentOwnerFactory.system());

        coordinator.start(new String[] {
                "--" + SetupInstallationPaths.ROOT_PROPERTY + "=" + installationRoot,
                "--" + StartupModePropertyProbe.PROPERTY_NAME + "=" + RuntimeMode.NORMAL.value()
        });

        assertEquals(RuntimeMode.NORMAL, coordinator.mode());
        assertNull(launcher.views.getFirst());
        coordinator.close();
    }

    @Test
    void terminalContextLaunchFailureReleasesOwnerWithoutWaitingForShutdownHook() {
        StartupInstallationRootResolver resolver = new StartupInstallationRootResolver();
        String[] args = rootArgs();
        StartupContextLauncher failing = (decision, ignored, transition) -> {
            throw new IllegalStateException("launch failed");
        };
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> StartupDecision.normal(), failing, resolver, StandaloneDeploymentOwnerFactory.system());

        assertThrows(IllegalStateException.class, () -> coordinator.start(args));
        try (StandaloneDeploymentOwner owner = StandaloneDeploymentOwner.acquire(resolver.resolve(args))) {
            assertTrue(owner.isValid());
        }
    }

    private String[] rootArgs() {
        return new String[] {"--" + SetupInstallationPaths.ROOT_PROPERTY + "=" + installationRoot};
    }

    private static void restoreSystemProperty(String name, String value) {
        if (value == null) {
            System.clearProperty(name);
        } else {
            System.setProperty(name, value);
        }
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

    private static final class OfficialRecordingLauncher implements StartupContextLauncher {

        private final List<String> events = new ArrayList<>();
        private final List<SetupRuntimeTransition> transitions = new ArrayList<>();
        private final List<StandaloneDeploymentOwnerView> views = new ArrayList<>();

        @Override
        public RunningApplicationContext launch(
                StartupDecision decision, String[] args, SetupRuntimeTransition setupRuntimeTransition) {
            throw new AssertionError("Official startup must supply its resolved root");
        }

        @Override
        public RunningApplicationContext launch(
                StartupDecision decision,
                String[] args,
                SetupRuntimeTransition setupRuntimeTransition,
                Path resolvedRoot,
                StandaloneDeploymentOwnerView authorityView) {
            assertTrue(resolvedRoot.isAbsolute());
            events.add("open:" + decision.mode().value());
            transitions.add(setupRuntimeTransition);
            views.add(authorityView);
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
                    if (authorityView != null) {
                        assertTrue(authorityView.isValid());
                    }
                    active = false;
                    events.add("close:" + decision.mode().value());
                }
            };
        }
    }
}
