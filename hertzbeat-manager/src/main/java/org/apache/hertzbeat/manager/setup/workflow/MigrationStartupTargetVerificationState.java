/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;

/** Owns exact retry state for one candidate-backed startup target verification. */
final class MigrationStartupTargetVerificationState {

    private PendingLease pendingLease;
    private VerificationContext pendingAcquire;

    VerificationContext context(CandidateRef candidate, String targetIdentityHash) {
        return new VerificationContext(candidate, targetIdentityHash);
    }

    boolean hasPendingLease() {
        return pendingLease != null;
    }

    MigrationStartupTargetVerification closePending(VerificationContext context) {
        requireSame(pendingLease.context(), context);
        try {
            pendingLease.lease().close();
        } catch (RuntimeException failure) {
            throw retainedFatalOrRecovery();
        } catch (Error fatal) {
            pendingLease = pendingLease.withFatalUnlessPresent(fatal);
            throw pendingLease.completion().fatal();
        }
        StableCompletion completion = pendingLease.completion();
        pendingLease = null;
        return completion.replay();
    }

    StableCompletion closePendingForShutdown() {
        try {
            pendingLease.lease().close();
        } catch (RuntimeException failure) {
            throw retainedFatalOrRecovery();
        } catch (Error fatal) {
            pendingLease = pendingLease.withFatalUnlessPresent(fatal);
            throw pendingLease.completion().fatal();
        }
        StableCompletion completion = pendingLease.completion();
        pendingLease = null;
        return completion;
    }

    void retainLease(
            VerificationContext context,
            TargetJdbcConnectionLease lease,
            StableCompletion completion) {
        pendingLease = new PendingLease(context, lease, completion);
    }

    boolean hasPendingAcquire() {
        return pendingAcquire != null;
    }

    void requirePendingAcquire(VerificationContext context) {
        requireSame(pendingAcquire, context);
    }

    void retainAcquire(VerificationContext context) {
        pendingAcquire = context;
    }

    void clearPendingAcquire() {
        pendingAcquire = null;
    }

    private RuntimeException retainedFatalOrRecovery() {
        Error fatal = pendingLease.completion().fatal();
        if (fatal != null) {
            throw fatal;
        }
        return recovery();
    }

    private static void requireSame(VerificationContext expected, VerificationContext actual) {
        if (!expected.equals(actual)) {
            throw new MigrationStartupReconciliationException(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    record VerificationContext(CandidateRef candidate, String targetIdentityHash) {

        VerificationContext {
            Objects.requireNonNull(candidate, "candidate");
            if (targetIdentityHash == null || !targetIdentityHash.matches("[0-9a-f]{64}")) {
                throw new IllegalArgumentException("Invalid target identity");
            }
        }
    }

    private record PendingLease(
            VerificationContext context,
            TargetJdbcConnectionLease lease,
            StableCompletion completion) {

        PendingLease withFatalUnlessPresent(Error fatal) {
            return new PendingLease(context, lease, completion.withFatalUnlessPresent(fatal));
        }
    }

    record StableCompletion(
            MigrationStartupTargetVerification outcome,
            SetupErrorCode recoveryCode,
            Error fatal) {

        static StableCompletion outcome(MigrationStartupTargetVerification outcome) {
            return new StableCompletion(Objects.requireNonNull(outcome, "outcome"), null, null);
        }

        static StableCompletion recovery() {
            return new StableCompletion(null, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, null);
        }

        static StableCompletion fatal(Error fatal) {
            return new StableCompletion(null, null, Objects.requireNonNull(fatal, "fatal"));
        }

        StableCompletion withFatalUnlessPresent(Error laterFatal) {
            return fatal == null ? fatal(laterFatal) : this;
        }

        MigrationStartupTargetVerification replay() {
            if (fatal != null) {
                throw fatal;
            }
            if (recoveryCode != null) {
                throw new MigrationStartupReconciliationException(recoveryCode);
            }
            return outcome;
        }
    }

    static final class VerificationHolder {

        private MigrationStartupTargetVerification outcome;

        void set(MigrationStartupTargetVerification value) {
            if (outcome != null) {
                throw recovery();
            }
            outcome = Objects.requireNonNull(value, "target verification");
        }

        MigrationStartupTargetVerification get() {
            return Objects.requireNonNull(outcome, "target verification");
        }
    }

    private static MigrationStartupReconciliationException recovery() {
        return new MigrationStartupReconciliationException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }
}
