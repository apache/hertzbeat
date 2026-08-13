/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoveryDisposition;

final class StartupMigrationPreflightTestSupport {

    static final Duration PREFLIGHT_TIMEOUT = Duration.ofSeconds(7);
    static final Executor CALLER_OWNED_ABORT_EXECUTOR = Runnable::run;

    private StartupMigrationPreflightTestSupport() {
    }

    static HertzBeatStartupCoordinator coordinator(
            Path installationRoot,
            StartupDecisionProbe probe,
            StartupContextLauncher launcher,
            List<String> events,
            StartupMigrationRecoveryPreflightFactory preflightFactory) {
        StartupInstallationRootResolver resolver = new StartupInstallationRootResolver();
        StandaloneDeploymentOwnerFactory ownerFactory = root -> {
            events.add("owner");
            return StandaloneDeploymentOwner.acquire(root);
        };
        return new HertzBeatStartupCoordinator(
                probe, launcher, new StartupFailureReporter(), resolver, ownerFactory,
                preflightFactory, PREFLIGHT_TIMEOUT, CALLER_OWNED_ABORT_EXECUTOR);
    }

    static String[] rootArgs(Path installationRoot) {
        return new String[] {"--" + SetupInstallationPaths.ROOT_PROPERTY + "=" + installationRoot};
    }

    static void replaceOwnerLock(Path installationRoot) {
        Path lock = installationRoot.resolve(StandaloneDeploymentOwner.LOCK_PATH);
        try {
            Files.delete(lock);
            Files.writeString(lock, "replacement\n", StandardCharsets.UTF_8);
            Files.setPosixFilePermissions(lock, PosixFilePermissions.fromString("rw-------"));
        } catch (IOException failure) {
            throw new AssertionError("test owner replacement failed", failure);
        }
    }

    static class RecordingPreflight implements StartupMigrationRecoveryPreflight {

        private final List<String> events;
        private final Deque<ManagedMigrationStartupRecoveryDisposition> dispositions;

        RecordingPreflight(
                List<String> events, ManagedMigrationStartupRecoveryDisposition... dispositions) {
            this.events = events;
            this.dispositions = new ArrayDeque<>(List.of(dispositions));
        }

        @Override
        public ManagedMigrationStartupRecoveryDisposition reconcile() {
            events.add("reconcile");
            return dispositions.size() == 1 ? dispositions.getFirst() : dispositions.removeFirst();
        }

        @Override
        public void close() {
            events.add("preflight-close");
        }
    }

    static class RecordingAdmittedLauncher
            implements StartupContextLauncher, AdmittedStartupContextLauncher {

        private final List<String> events;
        final List<RuntimeMode> modes = new ArrayList<>();
        final List<SetupRuntimeTransition> transitions = new ArrayList<>();
        final List<StandaloneDeploymentOwnerView> views = new ArrayList<>();

        RecordingAdmittedLauncher(List<String> events) {
            this.events = events;
        }

        @Override
        public RunningApplicationContext launch(
                StartupDecision decision, String[] args, SetupRuntimeTransition transition) {
            throw new AssertionError("owned startup must use admitted launch");
        }

        @Override
        public RunningApplicationContext launchAdmitted(
                StartupDecision decision,
                String[] args,
                SetupRuntimeTransition transition,
                Path root,
                StandaloneDeploymentOwnerView view,
                StartupLaunchAdmission.Mode admissionMode) {
            events.add("open:" + decision.mode().value() + ":" + admissionMode);
            modes.add(decision.mode());
            transitions.add(transition);
            views.add(view);
            return context(decision, view);
        }

        RunningApplicationContext context(
                StartupDecision decision, StandaloneDeploymentOwnerView view) {
            return new RecordingContext(decision.mode(), events);
        }
    }

    static class RecordingContext implements RunningApplicationContext {

        private final RuntimeMode mode;
        private final List<String> events;
        private boolean active = true;

        RecordingContext(RuntimeMode mode, List<String> events) {
            this.mode = mode;
            this.events = events;
        }

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
            events.add("close:" + mode.value());
        }
    }

    static final class AdmittedLauncherAdapter
            implements StartupContextLauncher, AdmittedStartupContextLauncher {

        private final StartupContextLauncher publicLauncher;
        private final AdmittedStartupContextLauncher admittedLauncher;

        AdmittedLauncherAdapter(
                StartupContextLauncher publicLauncher, AdmittedStartupContextLauncher admittedLauncher) {
            this.publicLauncher = publicLauncher;
            this.admittedLauncher = admittedLauncher;
        }

        @Override
        public RunningApplicationContext launch(
                StartupDecision decision, String[] args, SetupRuntimeTransition transition) {
            return publicLauncher.launch(decision, args, transition);
        }

        @Override
        public RunningApplicationContext launchAdmitted(
                StartupDecision decision,
                String[] args,
                SetupRuntimeTransition transition,
                Path root,
                StandaloneDeploymentOwnerView view,
                StartupLaunchAdmission.Mode mode) {
            return admittedLauncher.launchAdmitted(decision, args, transition, root, view, mode);
        }
    }
}
