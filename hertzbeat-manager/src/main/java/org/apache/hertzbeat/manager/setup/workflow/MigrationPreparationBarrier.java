/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Publishes an authoritative journal view at the durable preparation boundary. */
final class MigrationPreparationBarrier implements RetainedCutoverPreparation {

    private final FileMigrationOperationStore store;
    private final CompletableFuture<MigrationView> prepared = new CompletableFuture<>();
    private DurableCutoverDraft draft;
    private RetainedCutoverPreparation delegate;
    private MigrationOperationSnapshot confirmedSnapshot;

    MigrationPreparationBarrier(FileMigrationOperationStore store) {
        this.store = Objects.requireNonNull(store, "store");
    }

    synchronized void bind(
            DurableCutoverDraft boundDraft, RetainedCutoverPreparation boundDelegate) {
        if (draft != null || delegate != null) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
        draft = Objects.requireNonNull(boundDraft, "draft");
        delegate = Objects.requireNonNull(boundDelegate, "delegate");
    }

    @Override
    public void prepare(
            RetainedCutoverPreparationContext context,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword) {
        try {
            requireDelegate().prepare(context, target, borrowedPassword);
        } catch (Error fatal) {
            publishFatal(context, fatal);
            throw fatal;
        } catch (RuntimeException failure) {
            publishAfterFailure(context);
            throw failure;
        }
        publish(context);
    }

    void workerFailed(Throwable failure) {
        Objects.requireNonNull(failure, "failure");
        if (failure instanceof Error fatal) {
            prepared.completeExceptionally(fatal);
        } else if (safeFailure(failure)) {
            prepared.completeExceptionally(failure);
        } else {
            prepared.completeExceptionally(
                    new MigrationOperationStoreException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        }
    }

    MigrationView await(Duration timeout) {
        Objects.requireNonNull(timeout, "timeout");
        try {
            return prepared.get(timeoutNanos(timeout), TimeUnit.NANOSECONDS);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        } catch (TimeoutException timeoutFailure) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        } catch (ExecutionException failed) {
            Throwable cause = failed.getCause();
            if (cause instanceof Error fatal) {
                throw fatal;
            }
            if (cause instanceof MigrationOperationStoreException storeFailure) {
                throw storeFailure;
            }
            if (cause instanceof RuntimeException stableFailure) {
                throw stableFailure;
            }
            throw new MigrationOperationStoreException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    synchronized Optional<MigrationOperationSnapshot> confirmedSnapshot() {
        if (!prepared.isDone() || prepared.isCompletedExceptionally()) {
            return Optional.empty();
        }
        return Optional.ofNullable(confirmedSnapshot);
    }

    private static long timeoutNanos(Duration timeout) {
        try {
            return Math.max(1, timeout.toNanos());
        } catch (ArithmeticException overflow) {
            return Long.MAX_VALUE;
        }
    }

    private void publishAfterFailure(RetainedCutoverPreparationContext context) {
        try {
            publish(context);
        } catch (RuntimeException readFailure) {
            prepared.completeExceptionally(readFailure);
        }
    }

    private void publishFatal(
            RetainedCutoverPreparationContext context, Error fatal) {
        try {
            requireExactSnapshot(context);
        } catch (RuntimeException | Error readFailure) {
            fatal.addSuppressed(new MigrationOperationStoreException(
                    SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        }
        prepared.completeExceptionally(fatal);
    }

    private void publish(RetainedCutoverPreparationContext context) {
        MigrationOperationSnapshot snapshot = requireExactSnapshot(context);
        synchronized (this) {
            confirmedSnapshot = snapshot;
        }
        prepared.complete(MigrationOperationProjection.view(snapshot));
    }

    private MigrationOperationSnapshot requireExactSnapshot(
            RetainedCutoverPreparationContext context) {
        DurableCutoverDraft boundDraft = requireDraft();
        MigrationOperationSnapshot snapshot = store.selectForStartup(boundDraft.operationId())
                .orElseThrow(() -> new MigrationOperationStoreException(
                        SetupErrorCode.OPERATION_NOT_FOUND));
        if (!exact(boundDraft, snapshot, context)) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
        return store.confirmExactForStartup(snapshot);
    }

    private boolean exact(
            DurableCutoverDraft boundDraft,
            MigrationOperationSnapshot snapshot,
            RetainedCutoverPreparationContext context) {
        return boundDraft.operationId().equals(context.operationId())
                && boundDraft.operationId().equals(snapshot.operationId())
                && boundDraft.target() == snapshot.target()
                && boundDraft.applyMode() == snapshot.applyMode()
                && boundDraft.createdAt().equals(snapshot.createdAt())
                && (snapshot.startedAt() == null || boundDraft.startedAt().equals(snapshot.startedAt()))
                && Objects.equals(boundDraft.candidateGeneration(), snapshot.managedCandidateGeneration())
                && context.targetIdentityHash().equals(snapshot.targetIdentityHash());
    }

    private synchronized DurableCutoverDraft requireDraft() {
        if (draft == null) {
            throw new MigrationOperationStoreException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        return draft;
    }

    private synchronized RetainedCutoverPreparation requireDelegate() {
        if (delegate == null) {
            throw new MigrationOperationStoreException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        return delegate;
    }

    private static boolean safeFailure(Throwable failure) {
        return failure instanceof MetadataMigrationException
                || failure instanceof TargetJdbcConnectionException
                || failure instanceof TargetSchemaProvisioningException
                || failure instanceof RetainedCutoverException
                || failure instanceof RetainedCutoverReleaseRequiredException
                || failure instanceof RetainedCopyJournalHandoffException
                || failure instanceof DurableCutoverPreparationException
                || failure instanceof MigrationOperationStoreException;
    }
}
