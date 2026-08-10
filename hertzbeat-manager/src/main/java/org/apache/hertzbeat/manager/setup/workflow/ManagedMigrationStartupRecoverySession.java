/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/**
 * Holds one exact migration startup recovery binding across retries without Spring or persistence beans.
 * The supplied abort executor is caller-owned and must outlive this session's late JDBC cleanup.
 */
public final class ManagedMigrationStartupRecoverySession implements AutoCloseable {

    private final FileMigrationOperationStore store;
    private final ManagedMigrationStartupRecoveryRuntime runtime;
    private Selection selection;
    private boolean closed;

    public ManagedMigrationStartupRecoverySession(
            Path installationRoot, Duration verificationTimeout, Executor abortExecutor) {
        Path canonicalRoot = canonicalRoot(installationRoot);
        store = new FileMigrationOperationStore(canonicalRoot);
        runtime = new DefaultManagedMigrationStartupRecoveryRuntime(
                canonicalRoot, store,
                Objects.requireNonNull(verificationTimeout, "verificationTimeout"),
                Objects.requireNonNull(abortExecutor, "abortExecutor"));
    }

    ManagedMigrationStartupRecoverySession(
            Path installationRoot,
            FileMigrationOperationStore store,
            ManagedMigrationStartupRecoveryRuntime runtime) {
        canonicalRoot(installationRoot);
        this.store = Objects.requireNonNull(store, "store");
        this.runtime = Objects.requireNonNull(runtime, "runtime");
    }

    /** Reconciles only the operation selected and bound by this session's first observation. */
    public synchronized ManagedMigrationStartupRecoveryDisposition reconcile() {
        if (closed) {
            return ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY;
        }
        if (selection == null) {
            selection = selectOnce();
        }
        if (selection.disposition() != null) {
            return selection.disposition();
        }
        try {
            ManagedMigrationStartupRecoveryDisposition disposition =
                    map(runtime.reconcile(selection.draft()));
            if (disposition == ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED) {
                selection = Selection.fixed(disposition);
            }
            return disposition;
        } catch (MigrationStartupReconciliationException | MigrationOperationStoreException failure) {
            return ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY;
        } catch (RuntimeException failure) {
            return ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY;
        }
    }

    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }
        runtime.close();
        closed = true;
    }

    private Selection selectOnce() {
        try {
            Optional<MigrationOperationSnapshot> selected = store.selectUniqueNonterminalForStartup();
            if (selected.isEmpty()) {
                return Selection.fixed(ManagedMigrationStartupRecoveryDisposition.NO_MIGRATION);
            }
            MigrationOperationSnapshot snapshot = selected.orElseThrow();
            if (!actionable(snapshot)) {
                return Selection.fixed(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
            }
            return Selection.bound(new DurableCutoverDraft(
                    snapshot.operationId(), snapshot.target(), snapshot.applyMode(),
                    snapshot.createdAt(), snapshot.startedAt(), snapshot.managedCandidateGeneration()));
        } catch (MigrationOperationStoreException | IllegalArgumentException failure) {
            return Selection.fixed(ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY);
        }
    }

    private boolean actionable(MigrationOperationSnapshot snapshot) {
        if (snapshot.applyMode() != ApplyMode.MANAGED_WRITE) {
            return false;
        }
        boolean awaitingRestart = snapshot.state() == MigrationOperationState.AWAITING_RESTART
                && snapshot.stage() == MigrationStage.AWAITING_RESTART
                || snapshot.state() == MigrationOperationState.RUNNING
                && snapshot.stage() == MigrationStage.ACTIVATING;
        boolean startupRollback = snapshot.state() == MigrationOperationState.RUNNING
                && snapshot.stage() == MigrationStage.ROLLING_BACK
                && (snapshot.rollbackOrigin() == MigrationRollbackOrigin.ACTIVATION_FAILURE
                || snapshot.rollbackOrigin() == MigrationRollbackOrigin.RESTART_FAILURE);
        return awaitingRestart || startupRollback;
    }

    private ManagedMigrationStartupRecoveryDisposition map(MigrationStartupReconciliation outcome) {
        return switch (Objects.requireNonNull(outcome, "reconciliation outcome")) {
            case GATED, NO_MIGRATION -> ManagedMigrationStartupRecoveryDisposition.GATED_RECOVERY;
            case SUCCEEDED, ALREADY_SUCCEEDED, ROLLED_BACK_RESTART_REQUIRED,
                    ALREADY_ROLLED_BACK_RESTART_REQUIRED ->
                    ManagedMigrationStartupRecoveryDisposition.RELOAD_FULL_GATED;
        };
    }

    private static Path canonicalRoot(Path root) {
        try {
            return SecureSetupFile.prepareTrustedRoot(Objects.requireNonNull(root, "installationRoot"));
        } catch (IOException | RuntimeException failure) {
            throw new IllegalArgumentException("Migration startup recovery root is unsafe");
        }
    }

    private record Selection(
            DurableCutoverDraft draft,
            ManagedMigrationStartupRecoveryDisposition disposition) {

        static Selection bound(DurableCutoverDraft draft) {
            return new Selection(Objects.requireNonNull(draft, "draft"), null);
        }

        static Selection fixed(ManagedMigrationStartupRecoveryDisposition disposition) {
            return new Selection(null, Objects.requireNonNull(disposition, "disposition"));
        }
    }
}
