/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.function.LongSupplier;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.installation.InstallationFingerprint;
import org.apache.hertzbeat.manager.setup.installation.LocalInstallationFingerprintStore;
import org.apache.hertzbeat.manager.setup.workflow.MigrationStartupTargetVerificationState.StableCompletion;
import org.apache.hertzbeat.manager.setup.workflow.MigrationStartupTargetVerificationState.VerificationContext;
import org.apache.hertzbeat.manager.setup.workflow.MigrationStartupTargetVerificationState.VerificationHolder;

/** Verifies one exact managed target while candidate secrets remain synchronously borrowed. */
final class CandidateBackedMigrationStartupTargetVerifier
        implements MigrationStartupTargetVerifier, AutoCloseable {

    private final ManagedMigrationConfigurationTransaction configuration;
    private final LocalInstallationFingerprintStore fingerprints;
    private final TargetJdbcConnectionFactory factory;
    private final MigrationStartupTargetInspector inspector;
    private final Duration timeout;
    private final LongSupplier ticker;
    private final MigrationStartupTargetVerificationState state =
            new MigrationStartupTargetVerificationState();
    private boolean closed;

    CandidateBackedMigrationStartupTargetVerifier(
            ManagedMigrationConfigurationTransaction configuration,
            LocalInstallationFingerprintStore fingerprints,
            TargetJdbcConnectionFactory factory,
            MigrationStartupTargetInspector inspector,
            Duration timeout,
            LongSupplier ticker) {
        this.configuration = Objects.requireNonNull(configuration, "configuration");
        this.fingerprints = Objects.requireNonNull(fingerprints, "fingerprints");
        this.factory = Objects.requireNonNull(factory, "factory");
        this.inspector = Objects.requireNonNull(inspector, "inspector");
        this.timeout = Objects.requireNonNull(timeout, "timeout");
        this.ticker = Objects.requireNonNull(ticker, "ticker");
    }

    @Override
    public synchronized MigrationStartupTargetVerification verify(
            CandidateRef candidate, String targetIdentityHash) {
        VerificationContext context = state.context(candidate, targetIdentityHash);
        try {
            if (closed) {
                throw recovery();
            }
            JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(timeout, ticker);
            check(deadline);
            if (state.hasPendingLease()) {
                return state.closePending(context);
            }
            settleAcquire(context, deadline);
            InstallationFingerprint fingerprint = readFingerprint(deadline);
            return configuration.readExact(candidate, targetIdentityHash,
                    bundle -> verifyBundle(context, bundle, fingerprint, deadline));
        } catch (IOException failure) {
            throw recovery();
        } catch (MigrationStartupReconciliationException failure) {
            throw failure;
        } catch (TargetJdbcConnectionException failure) {
            return classifyAcquire(context, failure);
        } catch (MetadataMigrationException timeoutFailure) {
            return MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE;
        } catch (RuntimeException failure) {
            throw recovery();
        }
    }

    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }
        StableCompletion pendingCompletion = null;
        if (state.hasPendingLease()) {
            pendingCompletion = state.closePendingForShutdown();
        }
        try {
            factory.close();
        } catch (RuntimeException failure) {
            closed = true;
            if (pendingCompletion != null && pendingCompletion.fatal() != null) {
                throw pendingCompletion.fatal();
            }
            throw recovery();
        } catch (Error fatal) {
            closed = true;
            if (pendingCompletion != null && pendingCompletion.fatal() != null) {
                throw pendingCompletion.fatal();
            }
            throw fatal;
        }
        closed = true;
        replayPendingCompletion(pendingCompletion);
    }

    private static void replayPendingCompletion(StableCompletion pendingCompletion) {
        if (pendingCompletion != null) {
            pendingCompletion.replay();
        }
    }

    private MigrationStartupTargetVerification verifyBundle(
            VerificationContext context,
            ManagedConfigurationBundle bundle,
            InstallationFingerprint fingerprint,
            JdbcMetadataMigrationDeadline deadline) {
        TargetJdbcConnectionLease lease = factory.acquire(
                bundle.application().metadataDatabase(),
                bundle.secrets().metadataDatabasePassword(), deadline);
        StableCompletion completion = inspect(context, bundle, fingerprint, lease, deadline);
        try {
            lease.close();
        } catch (RuntimeException failure) {
            state.retainLease(context, lease, completion);
            if (completion.fatal() != null) {
                throw completion.fatal();
            }
            throw recovery();
        } catch (Error fatal) {
            StableCompletion retained = completion.withFatalUnlessPresent(fatal);
            state.retainLease(context, lease, retained);
            throw retained.fatal();
        }
        return completion.replay();
    }

    private StableCompletion inspect(
            VerificationContext context,
            ManagedConfigurationBundle bundle,
            InstallationFingerprint fingerprint,
            TargetJdbcConnectionLease lease,
            JdbcMetadataMigrationDeadline deadline) {
        try {
            if (!lease.targetIdentityHash().equals(context.targetIdentityHash())) {
                return StableCompletion.outcome(
                        MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH);
            }
            VerificationHolder holder = new VerificationHolder();
            lease.withConnection(connection -> holder.set(inspector.inspect(
                    connection, bundle.application().metadataDatabase().kind(), fingerprint, deadline)));
            return StableCompletion.outcome(holder.get());
        } catch (MigrationStartupReconciliationException failure) {
            return StableCompletion.recovery();
        } catch (RuntimeException failure) {
            return StableCompletion.recovery();
        } catch (Error fatal) {
            return StableCompletion.fatal(fatal);
        }
    }

    private void settleAcquire(
            VerificationContext context,
            JdbcMetadataMigrationDeadline deadline) {
        if (!state.hasPendingAcquire()) {
            return;
        }
        state.requirePendingAcquire(context);
        TargetJdbcFailedAcquireSettlement settlement;
        try {
            settlement = factory.settleFailedAcquire(deadline);
        } catch (MetadataMigrationException timeoutFailure) {
            throw timeoutFailure;
        } catch (RuntimeException failure) {
            throw recovery();
        }
        if (settlement != TargetJdbcFailedAcquireSettlement.REUSABLE) {
            throw recovery();
        }
        state.clearPendingAcquire();
    }

    private InstallationFingerprint readFingerprint(JdbcMetadataMigrationDeadline deadline) {
        check(deadline);
        try {
            Optional<InstallationFingerprint> fingerprint = fingerprints.read();
            check(deadline);
            return fingerprint.orElseThrow(CandidateBackedMigrationStartupTargetVerifier::recovery);
        } catch (IOException failure) {
            throw recovery();
        }
    }

    private MigrationStartupTargetVerification classifyAcquire(
            VerificationContext context,
            TargetJdbcConnectionException failure) {
        return switch (failure.code()) {
            case TIMEOUT, UNAVAILABLE -> {
                state.retainAcquire(context);
                yield MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE;
            }
            case TARGET_MISMATCH -> MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH;
            case CLEANUP_REQUIRED -> {
                state.retainAcquire(context);
                throw recovery();
            }
            case OPERATION_CONFLICT, FACTORY_CLOSED -> throw recovery();
        };
    }

    private static void check(JdbcMetadataMigrationDeadline deadline) {
        if (Thread.currentThread().isInterrupted()) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        deadline.remainingDuration();
    }

    private static MigrationStartupReconciliationException recovery() {
        return new MigrationStartupReconciliationException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
    }

}
