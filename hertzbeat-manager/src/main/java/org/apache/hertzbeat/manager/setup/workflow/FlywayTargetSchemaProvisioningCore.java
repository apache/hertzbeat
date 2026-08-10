/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Owns schema admission and PostgreSQL transaction state, but never the caller connection. */
final class FlywayTargetSchemaProvisioningCore {

    private static final ReentrantLock SHARED_LOCK = new ReentrantLock();
    private final ReentrantLock lock;
    private final TargetSchemaProvisioningWork work;

    FlywayTargetSchemaProvisioningCore(TargetSchemaProvisioningWork work) {
        this(SHARED_LOCK, work);
    }

    FlywayTargetSchemaProvisioningCore(ReentrantLock lock, TargetSchemaProvisioningWork work) {
        this.lock = Objects.requireNonNull(lock, "lock");
        this.work = Objects.requireNonNull(work, "work");
    }

    TargetSchemaProvisioningOutcome provision(
            Connection connection,
            MetadataDatabaseKind kind,
            JdbcMetadataMigrationDeadline deadline) {
        Objects.requireNonNull(connection, "connection");
        MetadataDatabaseKind supported = supportedKind(kind);
        Objects.requireNonNull(deadline, "deadline");
        boolean acquired;
        try {
            acquired = lock.tryLock(deadline.remainingNanos(), TimeUnit.NANOSECONDS);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw deadlineFailure(supported, TargetSchemaConnectionDisposition.REUSABLE);
        }
        if (!acquired) {
            throw deadlineFailure(supported, TargetSchemaConnectionDisposition.REUSABLE);
        }
        try {
            TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(deadline);
            try {
                budget.check();
            } catch (MetadataMigrationException timeout) {
                throw deadlineFailure(supported, TargetSchemaConnectionDisposition.REUSABLE);
            }
            requireIdleWritableConnection(connection, supported, budget);
            return supported == MetadataDatabaseKind.POSTGRESQL
                    ? provisionPostgresql(connection, supported, budget)
                    : provisionMysql(connection, supported, budget);
        } finally {
            lock.unlock();
        }
    }

    private TargetSchemaProvisioningOutcome provisionMysql(
            Connection connection,
            MetadataDatabaseKind kind,
            TargetSchemaJdbcBudget budget) {
        try {
            budget.check();
            work.provision(connection, budget);
            return reusable();
        } catch (TargetSchemaProvisioningException failure) {
            throw failure;
        } catch (MetadataMigrationException timeout) {
            throw deadlineFailure(kind, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        } catch (RuntimeException unexpected) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION,
                    unexpected, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
    }

    private TargetSchemaProvisioningOutcome provisionPostgresql(
            Connection connection,
            MetadataDatabaseKind kind,
            TargetSchemaJdbcBudget budget) {
        try {
            connection.setAutoCommit(false);
        } catch (SQLException | RuntimeException failure) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.TRANSACTION,
                    failure, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
        try {
            budget.check();
            work.provision(connection, budget);
        } catch (TargetSchemaProvisioningException failure) {
            throw rollbackKnownFailure(connection, kind, failure);
        } catch (MetadataMigrationException timeout) {
            throw rollbackKnownFailure(connection, kind,
                    deadlineFailure(kind, TargetSchemaConnectionDisposition.DISCARD_REQUIRED));
        } catch (RuntimeException unexpected) {
            throw rollbackKnownFailure(connection, kind,
                    failure(kind, TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION,
                            unexpected, TargetSchemaConnectionDisposition.DISCARD_REQUIRED));
        } catch (Error fatal) {
            cleanupAfterFatal(connection);
            throw fatal;
        }
        try {
            budget.check();
            connection.commit();
        } catch (MetadataMigrationException timeout) {
            throw rollbackKnownFailure(connection, kind,
                    deadlineFailure(kind, TargetSchemaConnectionDisposition.DISCARD_REQUIRED));
        } catch (SQLException | RuntimeException failure) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.COMMIT_OUTCOME_UNKNOWN,
                    failure, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
        return restoreAfterKnownSuccess(connection) ? reusable() : discardRequired();
    }

    private static void requireIdleWritableConnection(
            Connection connection,
            MetadataDatabaseKind kind,
            TargetSchemaJdbcBudget budget) {
        boolean autoCommit;
        boolean readOnly;
        try {
            budget.check();
            autoCommit = connection.getAutoCommit();
            budget.check();
            readOnly = connection.isReadOnly();
            budget.check();
        } catch (MetadataMigrationException timeout) {
            throw deadlineFailure(kind, TargetSchemaConnectionDisposition.REUSABLE);
        } catch (SQLException | RuntimeException failure) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.TRANSACTION,
                    failure, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
        if (!autoCommit || readOnly) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.TRANSACTION,
                    null, TargetSchemaConnectionDisposition.REUSABLE);
        }
        String product;
        try {
            DatabaseMetaData metadata = connection.getMetaData();
            budget.check();
            product = metadata.getDatabaseProductName().toLowerCase(Locale.ROOT);
            budget.check();
        } catch (MetadataMigrationException timeout) {
            throw deadlineFailure(kind, TargetSchemaConnectionDisposition.REUSABLE);
        } catch (SQLException | RuntimeException failure) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.PRECONDITION,
                    failure, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
        boolean matches = switch (kind) {
            case MYSQL -> product.contains("mysql");
            case POSTGRESQL -> product.contains("postgresql");
            case H2 -> false;
        };
        if (!matches) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.PRECONDITION,
                    null, TargetSchemaConnectionDisposition.REUSABLE);
        }
    }

    private static TargetSchemaProvisioningException rollbackKnownFailure(
            Connection connection,
            MetadataDatabaseKind kind,
            TargetSchemaProvisioningException original) {
        boolean interrupted = Thread.interrupted();
        try {
            try {
                connection.rollback();
            } catch (SQLException | RuntimeException rollbackFailure) {
                return failure(kind, TargetSchemaProvisioningFailure.Phase.ROLLBACK_OUTCOME_UNKNOWN,
                        rollbackFailure, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
            }
            boolean restored = restoreAfterKnownFailure(connection);
            TargetSchemaConnectionDisposition disposition = restored
                            && original.disposition() == TargetSchemaConnectionDisposition.REUSABLE
                    ? TargetSchemaConnectionDisposition.REUSABLE
                    : TargetSchemaConnectionDisposition.DISCARD_REQUIRED;
            return new TargetSchemaProvisioningException(kind, original.failure(), disposition);
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static boolean restoreAfterKnownSuccess(Connection connection) {
        try {
            connection.setAutoCommit(true);
            return true;
        } catch (SQLException | RuntimeException ignored) {
            return false;
        }
    }

    private static boolean restoreAfterKnownFailure(Connection connection) {
        return restoreAfterKnownSuccess(connection);
    }

    private static void cleanupAfterFatal(Connection connection) {
        boolean interrupted = Thread.interrupted();
        try {
            try {
                connection.rollback();
            } catch (SQLException | RuntimeException | Error ignored) {
                return;
            }
            try {
                connection.setAutoCommit(true);
            } catch (SQLException | RuntimeException | Error ignored) {
                // The caller always discards the connection after a fatal error.
            }
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static TargetSchemaProvisioningOutcome reusable() {
        return new TargetSchemaProvisioningOutcome(TargetSchemaConnectionDisposition.REUSABLE);
    }

    private static TargetSchemaProvisioningOutcome discardRequired() {
        return new TargetSchemaProvisioningOutcome(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
    }

    private static TargetSchemaProvisioningException deadlineFailure(
            MetadataDatabaseKind kind,
            TargetSchemaConnectionDisposition disposition) {
        return failure(kind, TargetSchemaProvisioningFailure.Phase.DEADLINE, null, disposition);
    }

    private static TargetSchemaProvisioningException failure(
            MetadataDatabaseKind kind,
            TargetSchemaProvisioningFailure.Phase phase,
            Throwable cause,
            TargetSchemaConnectionDisposition disposition) {
        return new TargetSchemaProvisioningException(
                kind, TargetSchemaProvisioningFailure.from(phase, cause), disposition);
    }

    private static MetadataDatabaseKind supportedKind(MetadataDatabaseKind kind) {
        return switch (Objects.requireNonNull(kind, "target kind")) {
            case MYSQL -> MetadataDatabaseKind.MYSQL;
            case POSTGRESQL -> MetadataDatabaseKind.POSTGRESQL;
            case H2 -> throw new IllegalArgumentException("External target schema provisioning does not support H2");
        };
    }
}
