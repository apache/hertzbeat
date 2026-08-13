/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.time.Duration;
import java.util.Objects;
import java.util.function.LongSupplier;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/**
 * Runs one bounded metadata copy inside one exact maintenance lease.
 *
 * <p>A failed release retains only the completed result and exact lease. The same operation must
 * call {@link #retryRelease(String)}; copy is never repeated by that recovery path.
 */
public final class MetadataCopyExecutionCoordinator {

    private final Object stateLock = new Object();
    private final MigrationMaintenanceOrchestrator maintenance;
    private final JdbcMetadataMigrationExecutor executor;
    private final LongSupplier ticker;
    private ActiveExecution active;

    public MetadataCopyExecutionCoordinator(
            MigrationMaintenanceOrchestrator maintenance, JdbcMetadataMigrationExecutor executor) {
        this(maintenance, executor, System::nanoTime);
    }

    MetadataCopyExecutionCoordinator(
            MigrationMaintenanceOrchestrator maintenance,
            JdbcMetadataMigrationExecutor executor,
            LongSupplier ticker) {
        this.maintenance = Objects.requireNonNull(maintenance, "maintenance");
        this.executor = Objects.requireNonNull(executor, "executor");
        this.ticker = Objects.requireNonNull(ticker, "ticker");
    }

    /** Executes one copy using the source owned by the acquired maintenance lease. */
    public void execute(
            String operationId,
            Connection target,
            MetadataDatabaseKind targetKind,
            Duration timeout,
            MetadataMigrationProgressSink progress) {
        requireRequest(operationId, target, targetKind, timeout, progress);
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(timeout, ticker);
        ActiveExecution execution = reserve(operationId);
        try {
            MigrationMaintenanceLease lease = maintenance.acquire(operationId, deadline.remainingDuration());
            if (lease == null) {
                throw MigrationMaintenanceException.maintenanceFailure();
            }
            execution.lease = lease;
        } catch (RuntimeException | Error failure) {
            clear(execution);
            throw failure;
        }

        MetadataCopyOutcome outcome = copy(execution.lease, target, targetKind, deadline, progress);
        completeCopy(execution, outcome);
        releaseAndReplay(execution);
    }

    /** Retries only release of the exact pending lease and then replays the completed copy result. */
    public void retryRelease(String operationId) {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw MigrationMaintenanceException.invalidRequest();
        }
        ActiveExecution execution;
        synchronized (stateLock) {
            if (active == null
                    || active.outcome == null
                    || active.releasing
                    || !active.operationId.equals(operationId)) {
                throw MigrationMaintenanceException.operationConflict();
            }
            execution = active;
            execution.releasing = true;
        }
        releaseAndReplay(execution);
    }

    private MetadataCopyOutcome copy(
            MigrationMaintenanceLease lease,
            Connection target,
            MetadataDatabaseKind targetKind,
            JdbcMetadataMigrationDeadline deadline,
            MetadataMigrationProgressSink progress) {
        try {
            deadline.remainingDuration();
            lease.withSourceConnection(source -> executor.execute(
                    source, target, targetKind, deadline, progress));
            return MetadataCopyOutcome.success();
        } catch (MetadataMigrationException failure) {
            return MetadataCopyOutcome.stableFailure(failure.code());
        } catch (MigrationMaintenanceException failure) {
            return MetadataCopyOutcome.stableMaintenanceFailure(failure);
        } catch (Error fatal) {
            return MetadataCopyOutcome.fatal(fatal);
        } catch (RuntimeException unexpected) {
            return MetadataCopyOutcome.stableFailure(MetadataMigrationErrorCode.COPY);
        }
    }

    private void releaseAndReplay(ActiveExecution execution) {
        boolean interrupted = Thread.interrupted();
        try {
            execution.lease.close();
        } catch (RuntimeException releaseFailure) {
            releasePending(execution);
            execution.outcome.releaseRequired();
        } catch (Error releaseFatal) {
            releasePending(execution);
            execution.outcome.releaseFatal(releaseFatal);
        } finally {
            interrupted |= Thread.interrupted();
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
        clear(execution);
        execution.outcome.replay();
    }

    private void completeCopy(ActiveExecution execution, MetadataCopyOutcome outcome) {
        synchronized (stateLock) {
            execution.outcome = outcome;
            execution.releasing = true;
        }
    }

    private void releasePending(ActiveExecution execution) {
        synchronized (stateLock) {
            if (active == execution) {
                execution.releasing = false;
            }
        }
    }

    private ActiveExecution reserve(String operationId) {
        synchronized (stateLock) {
            if (active != null) {
                throw MigrationMaintenanceException.operationConflict();
            }
            active = new ActiveExecution(operationId);
            return active;
        }
    }

    private void clear(ActiveExecution execution) {
        synchronized (stateLock) {
            if (active == execution) {
                active = null;
            }
        }
    }

    private static void requireRequest(
            String operationId,
            Connection target,
            MetadataDatabaseKind targetKind,
            Duration timeout,
            MetadataMigrationProgressSink progress) {
        if (!OperationIdValidator.isSafe(operationId)
                || target == null
                || targetKind == null
                || timeout == null
                || progress == null) {
            throw MigrationMaintenanceException.invalidRequest();
        }
    }

    private static final class ActiveExecution {

        private final String operationId;
        private MigrationMaintenanceLease lease;
        private MetadataCopyOutcome outcome;
        private boolean releasing;

        private ActiveExecution(String operationId) {
            this.operationId = operationId;
        }
    }
}
