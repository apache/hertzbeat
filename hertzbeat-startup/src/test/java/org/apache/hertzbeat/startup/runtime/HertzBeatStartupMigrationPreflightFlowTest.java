/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.CALLER_OWNED_ABORT_EXECUTOR;
import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.PREFLIGHT_TIMEOUT;
import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.coordinator;
import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.replaceOwnerLock;
import static org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.rootArgs;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoveryDisposition;
import org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.RecordingAdmittedLauncher;
import org.apache.hertzbeat.startup.runtime.StartupMigrationPreflightTestSupport.RecordingPreflight;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class HertzBeatStartupMigrationPreflightFlowTest {

    @TempDir
    private Path installationRoot;

    @Test
    void opensOneOwnerBoundPreflightBeforeProbeAndPinsTerminalNormal() throws Exception {
        List<String> events = new ArrayList<>();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
        Path canonicalRoot = installationRoot.toRealPath();
        AtomicInteger opens = new AtomicInteger();
        StartupMigrationRecoveryPreflightFactory preflightFactory = (root, owner, timeout, executor) -> {
            events.add("preflight-open");
            opens.incrementAndGet();
            assertEquals(canonicalRoot, root);
            assertEquals(root, owner.installationRoot());
            assertTrue(owner.isValid());
            assertEquals(PREFLIGHT_TIMEOUT, timeout);
            assertSame(CALLER_OWNED_ABORT_EXECUTOR, executor);
            return preflight;
        };
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events);
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> {
                    events.add("probe");
                    return StartupDecision.normal();
                }, launcher, events, preflightFactory);

        coordinator.start(rootArgs(installationRoot));
        coordinator.configurationApplied();

        assertEquals(1, opens.get());
        assertEquals(List.of(
                "owner", "preflight-open", "reconcile", "probe", "open:normal:ORDINARY"), events);
        coordinator.close();
        assertEquals(List.of("close:normal", "preflight-close"), events.subList(events.size() - 2, events.size()));
    }

    @Test
    void unresolvedMigrationOverridesForcedNormalAndReloadsFreshExactManagedContexts() {
        List<String> events = new ArrayList<>();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY,
                ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED);
        AtomicInteger probes = new AtomicInteger();
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events);
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> {
                    probes.incrementAndGet();
                    return StartupDecision.normal();
                }, launcher, events, (root, owner, timeout, executor) -> preflight);

        coordinator.start(new String[] {
                "--" + SetupInstallationPaths.ROOT_PROPERTY + "=" + installationRoot,
                "--" + StartupModePropertyProbe.PROPERTY_NAME + "=" + RuntimeMode.NORMAL.value()
        });
        assertEquals(RuntimeMode.RECOVERY, coordinator.mode());
        coordinator.configurationApplied();
        assertEquals(RuntimeMode.FULL_SETUP_GATED, coordinator.mode());
        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> coordinator.transition(StartupDecision.normal()));
        launcher.transitions.getLast().completeSetup();

        assertEquals(0, probes.get());
        assertEquals(List.of(
                "owner", "reconcile", "open:recovery:ORDINARY",
                "reconcile", "close:recovery", "open:full_setup_gated:EXACT_MANAGED_DATASOURCE",
                "close:full_setup_gated", "open:normal:EXACT_MANAGED_DATASOURCE"), events);
        assertEquals(RuntimeMode.NORMAL, coordinator.mode());
        assertTrue(launcher.views.getLast().isValid());
        coordinator.close();
    }

    @Test
    void ownerReplacementAfterReconcilePreventsProbeAndSpringLaunch() throws Exception {
        List<String> events = new ArrayList<>();
        AtomicInteger probes = new AtomicInteger();
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events);
        StartupMigrationRecoveryPreflight replacing = new StartupMigrationRecoveryPreflight() {
            @Override
            public ManagedMigrationStartupRecoveryDisposition reconcile() {
                events.add("reconcile");
                replaceOwnerLock(installationRoot);
                return ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION;
            }

            @Override
            public void close() {
                events.add("preflight-close");
            }
        };
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> {
                    probes.incrementAndGet();
                    return StartupDecision.normal();
                }, launcher, events, (root, owner, timeout, executor) -> replacing);

        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> coordinator.start(rootArgs(installationRoot)));

        assertEquals(0, probes.get());
        assertTrue(launcher.modes.isEmpty());
        assertEquals(List.of("owner", "reconcile", "preflight-close"), events);
        ResolvedStartupInstallationRoot root = new StartupInstallationRootResolver()
                .resolve(rootArgs(installationRoot));
        try (StandaloneDeploymentOwner owner = StandaloneDeploymentOwner.acquire(root)) {
            assertTrue(owner.isValid());
        }
    }

    @Test
    void failedPostOpenOwnerCheckRetainsTheExactPreflightUntilCloseRetry() {
        List<String> events = new ArrayList<>();
        AtomicInteger closes = new AtomicInteger();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION) {
            @Override
            public void close() {
                events.add("preflight-close");
                if (closes.getAndIncrement() == 0) {
                    throw new IllegalStateException("close pending");
                }
            }
        };
        RecordingAdmittedLauncher launcher = new RecordingAdmittedLauncher(events);
        HertzBeatStartupCoordinator coordinator = coordinator(
                installationRoot,
                ignored -> {
                    throw new AssertionError("probe must not run");
                }, launcher, events, (root, owner, timeout, executor) -> {
                    replaceOwnerLock(installationRoot);
                    return preflight;
                });

        assertThrows(StandaloneDeploymentOwnerException.class,
                () -> coordinator.start(rootArgs(installationRoot)));
        assertEquals(1, closes.get());
        coordinator.close();

        assertEquals(2, closes.get());
        try (StandaloneDeploymentOwner owner = StandaloneDeploymentOwner.acquire(
                new StartupInstallationRootResolver().resolve(rootArgs(installationRoot)))) {
            assertTrue(owner.isValid());
        }
    }

    @Test
    void repeatedReloadDispositionKeepsTheFreshExactFullContext() {
        List<String> events = new ArrayList<>();
        RecordingPreflight preflight = new RecordingPreflight(events,
                ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY,
                ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED,
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
        coordinator.configurationApplied();

        assertSame(full, coordinator.currentContext());
        assertEquals(1, launcher.modes.stream()
                .filter(RuntimeMode.FULL_SETUP_GATED::equals)
                .count());
        coordinator.close();
    }
}
