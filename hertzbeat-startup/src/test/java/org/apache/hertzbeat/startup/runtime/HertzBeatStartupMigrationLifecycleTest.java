/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.coordinator;
import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.replaceOwnerLock;
import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.rootArgs;
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
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoveryDisposition;
import org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.AdmittedLauncherAdapter;
import org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.RecordingAdmittedLauncher;
import org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.RecordingContext;
import org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.RecordingPreflight;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class HertzBeatStartupMigrationLifecycleTest {

    @TempDir
    private Path installationRoot;

    @Test
    void queuedCallbackDoesNotReviveClosedCoordinatorAfterOwnerRelease() {
        List<String> events = new ArrayList<>();
        AtomicInteger probes = new AtomicInteger();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY,
                ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events);
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> {
                    probes.incrementAndGet();
                    return StartupDecision.normal();
                }, launcher, events, (root, owner, timeout, executor) -> preflight);
        coordinator.start(rootArgs(installationRoot));
        coordinator.configurationApplied();
        SetupRuntimeTransition queued = launcher.transitions.getLast();
        int launches = launcher.modes.size();
        coordinator.close();

        queued.configurationApplied();

        assertEquals(0, probes.get());
        assertEquals(launches, launcher.modes.size());
        assertNull(coordinator.currentContext());
        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> coordinator.transition(StartupDecision.normal()));
        assertEquals(0, probes.get());
        assertEquals(launches, launcher.modes.size());
    }

    @Test
    void queuedCompletionDoesNotReviveNormalWhileClosedCleanupIsPending() {
        List<String> events = new ArrayList<>();
        AtomicInteger contextCloses = new AtomicInteger();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events) {
            @Override
            RunningApplicationContext context(
                    StartupDecision decision, StandaloneDeploymentOwnerView view) {
                if (decision.mode() != RuntimeMode.FULL_SETUP_GATED) {
                    return super.context(decision, view);
                }
                return new RecordingContext(decision.mode(), events) {
                    @Override
                    public void close() {
                        events.add("close-attempt:" + mode().value());
                        if (contextCloses.getAndIncrement() == 0) {
                            throw new IllegalStateException("close pending");
                        }
                        super.close();
                    }
                };
            }
        };
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                launcher, events, (root, owner, timeout, executor) -> preflight);
        RunningApplicationContext full = coordinator.start(rootArgs(installationRoot));
        SetupRuntimeTransition queued = launcher.transitions.getLast();
        int launches = launcher.modes.size();

        assertThrows(IllegalStateException.class, coordinator::close);
        queued.completeSetup();

        assertSame(full, coordinator.currentContext());
        assertTrue(full.isActive());
        assertEquals(launches, launcher.modes.size());
        coordinator.close();
        assertNull(coordinator.currentContext());
        assertEquals(2, contextCloses.get());
    }

    @Test
    void trustedCompletionRevalidatesOwnerBeforeClosingTheFullContext() {
        List<String> events = new ArrayList<>();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY,
                ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED);
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events);
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> {
                    throw new AssertionError("migration recovery must not probe");
                }, launcher, events, (root, owner, timeout, executor) -> preflight);
        coordinator.start(rootArgs(installationRoot));
        coordinator.configurationApplied();
        RunningApplicationContext full = coordinator.currentContext();
        SetupRuntimeTransition completion = launcher.transitions.getLast();
        replaceOwnerLock(installationRoot);

        assertThrows(StandaloneDeploymentOwnerException.class, completion::completeSetup);

        assertSame(full, coordinator.currentContext());
        assertTrue(full.isActive());
        assertEquals(List.of(RuntimeMode.RECOVERY, RuntimeMode.FULL_SETUP_GATED), launcher.modes);
        coordinator.close();
    }

    @Test
    void transitionRetriesTheExactOldContextCloseBeforeLaunchingAnythingNew() {
        List<String> events = new ArrayList<>();
        AtomicInteger probes = new AtomicInteger();
        AtomicInteger closes = new AtomicInteger();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events) {
            @Override
            RunningApplicationContext context(
                    StartupDecision decision, StandaloneDeploymentOwnerView view) {
                if (decision.mode() != RuntimeMode.FULL_SETUP_GATED) {
                    return super.context(decision, view);
                }
                return new RecordingContext(decision.mode(), events) {
                    @Override
                    public void close() {
                        events.add("close-attempt:" + mode().value());
                        if (closes.getAndIncrement() == 0) {
                            throw new IllegalStateException("close pending");
                        }
                        super.close();
                    }
                };
            }
        };
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> probes.getAndIncrement() == 0
                        ? new StartupDecision(RuntimeMode.FULL_SETUP_GATED)
                        : StartupDecision.normal(),
                launcher, events, (root, owner, timeout, executor) -> preflight);

        RunningApplicationContext original = coordinator.start(rootArgs(installationRoot));
        assertThrows(IllegalStateException.class, coordinator::configurationApplied);
        assertSame(original, coordinator.currentContext());
        assertEquals(1, launcher.modes.size());
        coordinator.configurationApplied();

        assertEquals(RuntimeMode.NORMAL, coordinator.mode());
        assertEquals(List.of(RuntimeMode.FULL_SETUP_GATED, RuntimeMode.NORMAL), launcher.modes);
        coordinator.close();
    }

    @Test
    void closeRetriesOnlyResourcesWhoseExactCloseDidNotComplete() {
        List<String> events = new ArrayList<>();
        AtomicInteger contextCloses = new AtomicInteger();
        AtomicInteger preflightCloses = new AtomicInteger();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION) {
            @Override
            public void close() {
                events.add("preflight-close");
                if (preflightCloses.getAndIncrement() < 2) {
                    throw new IllegalStateException("preflight close pending");
                }
            }
        };
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events) {
            @Override
            RunningApplicationContext context(
                    StartupDecision decision, StandaloneDeploymentOwnerView view) {
                return new RecordingContext(decision.mode(), events) {
                    @Override
                    public void close() {
                        events.add("close:" + mode().value());
                        if (contextCloses.getAndIncrement() == 0) {
                            throw new IllegalArgumentException("context close pending");
                        }
                    }
                };
            }
        };
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot, ignored -> StartupDecision.normal(), launcher, events,
                (root, owner, timeout, executor) -> preflight);
        coordinator.start(rootArgs(installationRoot));

        IllegalArgumentException first = assertThrows(IllegalArgumentException.class, coordinator::close);
        assertEquals(1, first.getSuppressed().length);
        assertEquals("preflight close pending", first.getSuppressed()[0].getMessage());
        ResolvedStartupInstallationRoot root = new StartupInstallationRootResolver()
                .resolve(rootArgs(installationRoot));
        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> StandaloneDeploymentOwner.acquire(root));
        assertThrows(IllegalStateException.class, coordinator::close);
        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> StandaloneDeploymentOwner.acquire(root));
        coordinator.close();

        assertEquals(2, contextCloses.get());
        assertEquals(3, preflightCloses.get());
        try (StandaloneDeploymentOwner ignored = StandaloneDeploymentOwner.acquire(root)) {
            assertTrue(ignored.isValid());
        }
        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> coordinator.start(rootArgs(installationRoot)));
    }

    @Test
    void closePromotesPreflightErrorOverContextRuntimeAndIsolatesInterruptsBetweenActions() {
        List<String> events = new ArrayList<>();
        IllegalStateException contextFailure = new IllegalStateException("context-close");
        AssertionError preflightFailure = new AssertionError("preflight-close");
        AtomicInteger contextCloses = new AtomicInteger();
        AtomicInteger preflightCloses = new AtomicInteger();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION) {
            @Override
            public void close() {
                events.add("preflight-close");
                assertFalse(Thread.currentThread().isInterrupted());
                Thread.interrupted();
                if (preflightCloses.getAndIncrement() == 0) {
                    throw preflightFailure;
                }
            }
        };
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events) {
            @Override
            RunningApplicationContext context(
                    StartupDecision decision, StandaloneDeploymentOwnerView view) {
                return new RecordingContext(decision.mode(), events) {
                    @Override
                    public void close() {
                        events.add("close:" + mode().value());
                        Thread.currentThread().interrupt();
                        if (contextCloses.getAndIncrement() == 0) {
                            throw contextFailure;
                        }
                    }
                };
            }
        };
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot, ignored -> StartupDecision.normal(), launcher, events,
                (root, owner, timeout, executor) -> preflight);
        coordinator.start(rootArgs(installationRoot));

        Thread.currentThread().interrupt();
        try {
            AssertionError thrown = assertThrows(AssertionError.class, coordinator::close);
            assertSame(preflightFailure, thrown);
            assertEquals(1, thrown.getSuppressed().length);
            assertSame(contextFailure, thrown.getSuppressed()[0]);
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
        try {
            coordinator.close();
            assertEquals(2, contextCloses.get());
            assertEquals(2, preflightCloses.get());
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
        ResolvedStartupInstallationRoot root = new StartupInstallationRootResolver()
                .resolve(rootArgs(installationRoot));
        try (StandaloneDeploymentOwner owner = StandaloneDeploymentOwner.acquire(root)) {
            assertTrue(owner.isValid());
        }
    }

    @Test
    void recoveryLaunchErrorOutranksAndRetainsTheOriginalRuntimeFailure() {
        List<String> events = new ArrayList<>();
        AssertionError fatal = new AssertionError("recovery fatal");
        StartupContextLauncher launcher = new StartupContextLauncher() {
            @Override
            public RunningApplicationContext launch(
                    StartupDecision decision, String[] args, SetupRuntimeTransition transition) {
                throw new AssertionError("owned startup must use admitted launch");
            }
        };
        AdmittedStartupContextLauncher admitted = (
                decision, args, transition, root, view, mode) -> {
            if (decision.mode() == RuntimeMode.RECOVERY) {
                throw fatal;
            }
            throw new IllegalStateException("normal launch failed");
        };
        StartupContextLauncher both = new AdmittedLauncherAdapter(launcher, admitted);
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot, ignored -> StartupDecision.normal(), both, events,
                (root, owner, timeout, executor) -> preflight);

        AssertionError thrown = assertThrows(AssertionError.class,
                () -> coordinator.start(rootArgs(installationRoot)));

        assertSame(fatal, thrown);
        assertEquals(1, thrown.getSuppressed().length);
        assertEquals("normal launch failed", thrown.getSuppressed()[0].getMessage());
    }
}
