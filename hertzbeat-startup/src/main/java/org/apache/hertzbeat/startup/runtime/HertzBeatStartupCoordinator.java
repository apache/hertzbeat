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

import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;

/** Serializes pre-Spring recovery and setup-to-normal context transitions. */
public final class HertzBeatStartupCoordinator implements SetupRuntimeTransition, AutoCloseable {

    private static final Duration MIGRATION_RECOVERY_TIMEOUT = Duration.ofSeconds(30);
    private final StartupDecisionProbe probe;
    private final StartupContextLauncher launcher;
    private final StartupFailureReporter failureReporter;
    private final StartupInstallationRootResolver rootResolver;
    private final StandaloneDeploymentOwnerFactory ownerFactory;
    private final StartupMigrationRecoveryPreflightFactory preflightFactory;
    private final Duration migrationRecoveryTimeout;
    private final Executor abortExecutor;
    private String[] args = new String[0];
    private RunningApplicationContext currentContext;
    private ResolvedStartupInstallationRoot installationRoot;
    private StandaloneDeploymentOwner deploymentOwner;
    private StartupMigrationPreflightGate migrationPreflight;
    private boolean normalRuntimeSelected;
    private boolean convergenceConfirmed;
    private boolean migrationCompletionApplied;
    private boolean closed;

    public HertzBeatStartupCoordinator(StartupDecisionProbe probe, StartupContextLauncher launcher) {
        this(probe, launcher, new StartupFailureReporter(), null, null, null, null, null);
    }

    public HertzBeatStartupCoordinator(
            StartupDecisionProbe probe,
            StartupContextLauncher launcher,
            StartupInstallationRootResolver rootResolver,
            StandaloneDeploymentOwnerFactory ownerFactory) {
        this(probe, launcher, new StartupFailureReporter(), rootResolver, ownerFactory,
                StartupMigrationRecoveryPreflightFactory.system(), MIGRATION_RECOVERY_TIMEOUT,
                StartupMigrationAbortExecutor.processLifetime());
    }

    HertzBeatStartupCoordinator(
            StartupDecisionProbe probe, StartupContextLauncher launcher, StartupFailureReporter failureReporter) {
        this(probe, launcher, failureReporter, null, null, null, null, null);
    }

    HertzBeatStartupCoordinator(
            StartupDecisionProbe probe,
            StartupContextLauncher launcher,
            StartupFailureReporter failureReporter,
            StartupInstallationRootResolver rootResolver,
            StandaloneDeploymentOwnerFactory ownerFactory) {
        this(probe, launcher, failureReporter, rootResolver, ownerFactory,
                StartupMigrationRecoveryPreflightFactory.system(), MIGRATION_RECOVERY_TIMEOUT,
                StartupMigrationAbortExecutor.processLifetime());
    }

    HertzBeatStartupCoordinator(
            StartupDecisionProbe probe,
            StartupContextLauncher launcher,
            StartupFailureReporter failureReporter,
            StartupInstallationRootResolver rootResolver,
            StandaloneDeploymentOwnerFactory ownerFactory,
            StartupMigrationRecoveryPreflightFactory preflightFactory,
            Duration migrationRecoveryTimeout,
            Executor abortExecutor) {
        this.probe = Objects.requireNonNull(probe, "probe");
        this.launcher = Objects.requireNonNull(launcher, "launcher");
        this.failureReporter = Objects.requireNonNull(failureReporter, "failureReporter");
        this.rootResolver = rootResolver;
        this.ownerFactory = ownerFactory;
        this.preflightFactory = preflightFactory;
        this.migrationRecoveryTimeout = migrationRecoveryTimeout;
        this.abortExecutor = abortExecutor;
    }

    public synchronized RunningApplicationContext start(String[] applicationArgs) {
        if (closed) {
            throw StandaloneDeploymentOwnerException.unavailable();
        }
        args = applicationArgs == null ? new String[0] : applicationArgs.clone();
        try {
            acquireDeploymentOwner();
            openMigrationPreflight();
            return transitionInternal(startupPlan());
        } catch (Throwable failure) {
            closed = true;
            StartupCleanup.rethrow(cleanupResources(failure));
            throw new AssertionError("unreachable");
        }
    }

    @Override
    public synchronized void configurationApplied() {
        if (closed) {
            return;
        }
        if (normalRuntimeSelected && (migrationPreflight == null || migrationCompletionApplied
                || !migrationPreflight.requiresReconciliationAfterNormal())) {
            return;
        }
        StartupPlan plan = startupPlan();
        transitionInternal(plan);
    }

    @Override
    public synchronized void completeSetup() {
        if (closed) {
            return;
        }
        if (currentContext == null || currentContext.mode() != RuntimeMode.FULL_SETUP_GATED) {
            return;
        }
        convergenceConfirmed = true;
        boolean exactMigration = migrationPreflight != null
                && migrationPreflight.exactManagedDatasourceRequired();
        StartupLaunchAdmission.Mode mode = exactMigration
                ? StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE
                : StartupLaunchAdmission.Mode.ORDINARY;
        transitionInternal(new StartupPlan(StartupDecision.normal(), false, mode));
        migrationCompletionApplied = exactMigration && normalRuntimeSelected;
    }

    public synchronized RunningApplicationContext transition(StartupDecision decision) {
        if (closed) {
            throw StandaloneDeploymentOwnerException.unavailable();
        }
        Objects.requireNonNull(decision, "decision");
        if (migrationPreflight != null) {
            migrationPreflight.requirePublicTransitionAllowed(decision);
        }
        return transitionInternal(new StartupPlan(
                decision, false, StartupLaunchAdmission.Mode.ORDINARY));
    }

    public synchronized RuntimeMode mode() {
        return currentContext == null ? null : currentContext.mode();
    }

    public synchronized RunningApplicationContext currentContext() {
        return currentContext;
    }

    private RunningApplicationContext transitionInternal(StartupPlan plan) {
        StartupDecision decision = plan.decision();
        if (migrationPreflight != null) {
            migrationPreflight.requireValidOwner();
        }
        if (!plan.forceFresh() && currentContext != null && currentContext.isActive()
                && currentContext.mode() == decision.mode()) {
            recordNormalSelection();
            return currentContext;
        }
        closeCurrent();
        try {
            currentContext = launch(decision, plan.admissionMode());
        } catch (RuntimeException launchFailure) {
            currentContext = launchRecovery(decision, launchFailure);
        }
        recordNormalSelection();
        return currentContext;
    }

    private RunningApplicationContext launchRecovery(
            StartupDecision failedDecision, RuntimeException launchFailure) {
        if (failedDecision.mode() == RuntimeMode.RECOVERY) {
            failureReporter.report(StartupFailureReporter.Stage.RECOVERY_LAUNCH,
                    RuntimeMode.RECOVERY, launchFailure);
            throw launchFailure;
        }
        failureReporter.report(StartupFailureReporter.Stage.CONTEXT_LAUNCH,
                failedDecision.mode(), launchFailure);
        try {
            return launch(StartupDecision.recovery(), StartupLaunchAdmission.Mode.ORDINARY);
        } catch (Error recoveryFailure) {
            recoveryFailure.addSuppressed(launchFailure);
            throw recoveryFailure;
        } catch (RuntimeException recoveryFailure) {
            failureReporter.report(StartupFailureReporter.Stage.RECOVERY_LAUNCH,
                    RuntimeMode.RECOVERY, recoveryFailure);
            if (recoveryFailure != launchFailure) {
                recoveryFailure.addSuppressed(launchFailure);
            }
            throw recoveryFailure;
        }
    }

    private void recordNormalSelection() {
        if (currentContext != null && currentContext.isActive()
                && currentContext.mode() == RuntimeMode.NORMAL) {
            normalRuntimeSelected = true;
        }
    }

    private void closeCurrent() {
        if (currentContext != null) {
            RunningApplicationContext closing = currentContext;
            closing.close();
            currentContext = null;
        }
    }

    private RunningApplicationContext launch(
            StartupDecision decision, StartupLaunchAdmission.Mode admissionMode) {
        if (deploymentOwner == null) {
            return Objects.requireNonNull(
                    launcher.launch(decision, args.clone(), this),
                    "startup context launcher returned null for " + decision.mode().value());
        }
        requireValidOwner();
        boolean exposeAuthority = convergenceConfirmed && decision.mode() == RuntimeMode.NORMAL;
        if (launcher instanceof AdmittedStartupContextLauncher admitted) {
            return Objects.requireNonNull(
                    admitted.launchAdmitted(
                            decision, args.clone(), this, installationRoot.canonicalRoot(),
                            exposeAuthority ? deploymentOwner.view() : null, admissionMode),
                    "startup context launcher returned null for " + decision.mode().value());
        }
        return Objects.requireNonNull(
                launcher.launch(decision, args.clone(), this, installationRoot.canonicalRoot(),
                        exposeAuthority ? deploymentOwner.view() : null),
                "startup context launcher returned null for " + decision.mode().value());
    }

    private StartupPlan startupPlan() {
        if (migrationPreflight == null) {
            return new StartupPlan(safeProbeDecision(), false, StartupLaunchAdmission.Mode.ORDINARY);
        }
        return switch (migrationPreflight.reconcile()) {
            case PROBE -> new StartupPlan(
                    safeProbeDecision(), false, StartupLaunchAdmission.Mode.ORDINARY);
            case GATED_RECOVERY -> new StartupPlan(
                    StartupDecision.recovery(), false, StartupLaunchAdmission.Mode.ORDINARY);
            case RELOAD_FULL_GATED -> new StartupPlan(
                    new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                    migrationPreflight.claimFreshReload(),
                    StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
        };
    }

    private StartupDecision safeProbeDecision() {
        try {
            return probeDecision();
        } catch (RuntimeException failure) {
            failureReporter.report(StartupFailureReporter.Stage.STARTUP_PROBE,
                    RuntimeMode.RECOVERY, failure);
            return StartupDecision.recovery();
        }
    }

    private StartupDecision probeDecision() {
        StartupDecision decision = installationRoot == null
                ? probe.probe(args.clone())
                : probe.probe(args.clone(), installationRoot.canonicalRoot());
        return Objects.requireNonNull(decision, "startup decision");
    }

    private void acquireDeploymentOwner() {
        if (deploymentOwner != null || ownerFactory == null || rootResolver == null) {
            return;
        }
        installationRoot = rootResolver.resolve(args.clone());
        deploymentOwner = Objects.requireNonNull(
                ownerFactory.acquire(installationRoot), "standalone deployment owner");
        requireValidOwner();
    }

    private void openMigrationPreflight() {
        if (migrationPreflight != null || deploymentOwner == null || preflightFactory == null) {
            return;
        }
        migrationPreflight = StartupMigrationPreflightGate.open(
                installationRoot.canonicalRoot(), deploymentOwner.view(), preflightFactory,
                Objects.requireNonNull(migrationRecoveryTimeout, "migrationRecoveryTimeout"),
                Objects.requireNonNull(abortExecutor, "abortExecutor"));
        migrationPreflight.requireValidOwner();
    }

    private void requireValidOwner() {
        if (migrationPreflight != null) {
            migrationPreflight.requireValidOwner();
        } else if (deploymentOwner == null || !deploymentOwner.isValid()) {
            throw StandaloneDeploymentOwnerException.unavailable();
        }
    }

    @Override
    public synchronized void close() {
        if (closed && currentContext == null && migrationPreflight == null && deploymentOwner == null) {
            return;
        }
        closed = true;
        StartupCleanup.rethrow(cleanupResources(null));
    }

    private Throwable cleanupResources(Throwable primary) {
        boolean interrupted = Thread.interrupted();
        Throwable failure = primary;
        try {
            if (currentContext != null) {
                RunningApplicationContext context = currentContext;
                StartupCleanup.Result attempt = StartupCleanup.runInterruptSafe(failure, context::close);
                interrupted |= attempt.interrupted();
                if (attempt.completed()) {
                    currentContext = null;
                }
                failure = attempt.failure();
            }
            if (migrationPreflight != null) {
                StartupMigrationPreflightGate preflight = migrationPreflight;
                StartupCleanup.Result attempt = StartupCleanup.runInterruptSafe(failure, preflight::close);
                interrupted |= attempt.interrupted();
                if (attempt.completed()) {
                    migrationPreflight = null;
                }
                failure = attempt.failure();
            }
            if (deploymentOwner != null && currentContext == null && migrationPreflight == null) {
                StandaloneDeploymentOwner owner = deploymentOwner;
                StartupCleanup.Result attempt = StartupCleanup.runInterruptSafe(failure, owner::close);
                interrupted |= attempt.interrupted();
                if (attempt.completed()) {
                    deploymentOwner = null;
                }
                failure = attempt.failure();
            }
            return failure;
        } finally {
            interrupted |= Thread.interrupted();
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private record StartupPlan(
            StartupDecision decision,
            boolean forceFresh,
            StartupLaunchAdmission.Mode admissionMode) {

        private StartupPlan {
            Objects.requireNonNull(decision, "decision");
            Objects.requireNonNull(admissionMode, "admissionMode");
        }
    }
}
