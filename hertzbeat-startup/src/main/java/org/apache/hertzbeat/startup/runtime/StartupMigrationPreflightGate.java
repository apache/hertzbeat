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

import java.nio.file.Path;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoveryDisposition;

/** Owns the secret-free migration startup decision and its sticky exact-datasource admission. */
final class StartupMigrationPreflightGate implements AutoCloseable {

    private final Path canonicalRoot;
    private final StandaloneDeploymentOwnerView ownerView;
    private final StartupMigrationRecoveryPreflight preflight;
    private boolean migrationGateActive;
    private boolean exactManagedDatasourceRequired;
    private boolean reloadRequested;

    private StartupMigrationPreflightGate(
            Path canonicalRoot,
            StandaloneDeploymentOwnerView ownerView,
            StartupMigrationRecoveryPreflight preflight) {
        this.canonicalRoot = Objects.requireNonNull(canonicalRoot, "canonicalRoot");
        this.ownerView = Objects.requireNonNull(ownerView, "ownerView");
        this.preflight = Objects.requireNonNull(preflight, "preflight");
    }

    static StartupMigrationPreflightGate open(
            Path canonicalRoot,
            StandaloneDeploymentOwnerView ownerView,
            StartupMigrationRecoveryPreflightFactory factory,
            Duration timeout,
            Executor abortExecutor) {
        requireValidOwner(canonicalRoot, ownerView);
        StartupMigrationRecoveryPreflight preflight = Objects.requireNonNull(
                factory.open(canonicalRoot, ownerView, timeout, abortExecutor),
                "migration recovery preflight");
        return new StartupMigrationPreflightGate(canonicalRoot, ownerView, preflight);
    }

    Outcome reconcile() {
        requireValidOwner();
        ManagedMigrationStartupRecoveryDisposition disposition = Objects.requireNonNull(
                preflight.reconcile(), "migration recovery disposition");
        requireValidOwner();
        return switch (disposition) {
            case NO_MIGRATION -> Outcome.PROBE;
            case GATED_RECOVERY -> {
                migrationGateActive = true;
                yield Outcome.GATED_RECOVERY;
            }
            case RELOAD_FULL_GATED -> {
                migrationGateActive = true;
                exactManagedDatasourceRequired = true;
                yield Outcome.RELOAD_FULL_GATED;
            }
        };
    }

    void requireValidOwner() {
        requireValidOwner(canonicalRoot, ownerView);
    }

    void requirePublicTransitionAllowed(StartupDecision decision) {
        if (migrationGateActive && decision.mode() == RuntimeMode.NORMAL) {
            throw StandaloneDeploymentOwnerException.unavailable();
        }
    }

    StartupLaunchAdmission.Mode admissionMode() {
        return exactManagedDatasourceRequired
                ? StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE
                : StartupLaunchAdmission.Mode.ORDINARY;
    }

    boolean exactManagedDatasourceRequired() {
        return exactManagedDatasourceRequired;
    }

    boolean requiresReconciliationAfterNormal() {
        return migrationGateActive;
    }

    boolean claimFreshReload() {
        boolean fresh = !reloadRequested;
        reloadRequested = true;
        return fresh;
    }

    @Override
    public void close() {
        preflight.close();
    }

    private static void requireValidOwner(Path root, StandaloneDeploymentOwnerView owner) {
        OwnerBoundStartupMigrationRecoveryPreflight.requireValidOwner(root, owner);
    }

    enum Outcome {
        PROBE,
        GATED_RECOVERY,
        RELOAD_FULL_GATED
    }
}
