/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.workflow.FileMigrationOperationStore.ExactTransitionDisposition;

/** Durably records verification and cutover readiness after an already completed metadata copy. */
final class DurableRetainedCopyJournalHandoff implements RetainedCopyJournalHandoff {

    private final DurableCutoverDraft draft;
    private final FileMigrationOperationStore store;

    DurableRetainedCopyJournalHandoff(
            DurableCutoverDraft draft, FileMigrationOperationStore store) {
        this.draft = Objects.requireNonNull(draft, "draft");
        this.store = Objects.requireNonNull(store, "store");
    }

    @Override
    public RetainedCopyJournalDisposition handoff(RetainedCopyJournalContext context) {
        Objects.requireNonNull(context, "context");
        try {
            return handoffDurably(context);
        } catch (MigrationOperationStoreException failure) {
            throw new RetainedCopyJournalHandoffException(failure.errorCode());
        } catch (RetainedCopyJournalHandoffException failure) {
            throw failure;
        } catch (RuntimeException failure) {
            throw new RetainedCopyJournalHandoffException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private RetainedCopyJournalDisposition handoffDurably(RetainedCopyJournalContext context) {
        MigrationOperationSnapshot current = store.find(context.operationId())
                .orElseThrow(() -> new RetainedCopyJournalHandoffException(
                        SetupErrorCode.OPERATION_NOT_FOUND));
        if (!exactIdentity(current, context)) {
            throw new RetainedCopyJournalHandoffException(SetupErrorCode.OPERATION_CONFLICT);
        }
        RetainedCopyJournalSnapshots snapshots = new RetainedCopyJournalSnapshots(current);
        if (snapshots.finalState()) {
            confirmExact(current);
            return RetainedCopyJournalDisposition.ALREADY_CONFIRMED;
        }
        MigrationOperationSnapshot verifying;
        if (snapshots.copying()) {
            verifying = snapshots.verifyingSnapshot();
            transition(current, verifying);
        } else if (snapshots.verifying()) {
            verifying = current;
            confirmExact(current);
        } else {
            throw new RetainedCopyJournalHandoffException(SetupErrorCode.OPERATION_CONFLICT);
        }
        MigrationOperationSnapshot ready = new RetainedCopyJournalSnapshots(verifying).finalSnapshot();
        ExactTransitionDisposition disposition = store.compareAndTransitionOrConfirmDisposition(
                context.operationId(), MigrationOperationState.RUNNING, ready);
        return disposition == ExactTransitionDisposition.TRANSITIONED
                ? RetainedCopyJournalDisposition.TRANSITIONED
                : RetainedCopyJournalDisposition.ALREADY_CONFIRMED;
    }

    private boolean exactIdentity(
            MigrationOperationSnapshot current, RetainedCopyJournalContext context) {
        return draft.operationId().equals(context.operationId())
                && current.operationId().equals(draft.operationId())
                && current.target() == draft.target()
                && current.applyMode() == draft.applyMode()
                && current.createdAt().equals(draft.createdAt())
                && Objects.equals(current.startedAt(), draft.startedAt())
                && current.targetIdentityHash().equals(context.targetIdentityHash())
                && Objects.equals(
                        current.managedCandidateGeneration(), draft.candidateGeneration());
    }

    private void transition(
            MigrationOperationSnapshot current, MigrationOperationSnapshot replacement) {
        store.compareAndTransitionOrConfirmDisposition(
                current.operationId(), MigrationOperationState.RUNNING, replacement);
    }

    private void confirmExact(MigrationOperationSnapshot current) {
        ExactTransitionDisposition disposition = store.compareAndTransitionOrConfirmDisposition(
                current.operationId(), current.state(), current);
        if (disposition != ExactTransitionDisposition.ALREADY_CONFIRMED) {
            throw new RetainedCopyJournalHandoffException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }
}
