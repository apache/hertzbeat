/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Resolves retained ownership without allowing a recovery probe to skip task completion. */
final class MigrationCommandCompletion {

    private MigrationCommandCompletion() {
    }

    static Throwable finish(
            RetainedCutoverCoordinator coordinator,
            String operationId,
            boolean finalizationPending,
            Throwable primary,
            CompletionSink sink) {
        RetainedCutoverRecoveryPhase phase = localPhase(finalizationPending, primary);
        Throwable effective = primary;
        try {
            if (!finalizationPending) {
                RetainedCutoverRecoveryPhase exact = coordinator.recoveryPhase(operationId);
                if (exact != null) {
                    phase = exact;
                }
            }
        } catch (RuntimeException | Error probeFailure) {
            effective = prioritize(primary, probeFailure);
        } finally {
            sink.completed(phase);
        }
        return effective;
    }

    private static RetainedCutoverRecoveryPhase localPhase(
            boolean finalizationPending, Throwable failure) {
        if (finalizationPending) {
            return RetainedCutoverRecoveryPhase.FAILURE_FINALIZATION_PENDING;
        }
        if (failure instanceof RetainedCopyJournalHandoffException) {
            return RetainedCutoverRecoveryPhase.HANDOFF_PENDING;
        }
        if (failure instanceof RetainedCutoverReleaseRequiredException
                || failure instanceof Error fatal && hasReleaseMarker(fatal)) {
            return RetainedCutoverRecoveryPhase.RELEASE_PENDING;
        }
        return RetainedCutoverRecoveryPhase.NONE;
    }

    private static Throwable prioritize(Throwable primary, Throwable secondary) {
        if (primary instanceof Error fatal) {
            fatal.addSuppressed(recoveryMarker());
            return fatal;
        }
        if (secondary instanceof Error fatal) {
            fatal.addSuppressed(recoveryMarker());
            return fatal;
        }
        return primary == null ? recoveryMarker() : primary;
    }

    private static boolean hasReleaseMarker(Error fatal) {
        for (Throwable suppressed : fatal.getSuppressed()) {
            if (suppressed instanceof RetainedCutoverReleaseRequiredException) {
                return true;
            }
        }
        return false;
    }

    private static MigrationOperationStoreException recoveryMarker() {
        return new MigrationOperationStoreException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }

    @FunctionalInterface
    interface CompletionSink {
        void completed(RetainedCutoverRecoveryPhase phase);
    }
}
