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
import java.util.Objects;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Verifies a provisional connection before transferring it into a scoped lease. */
final class TargetJdbcConnectionVerifier {

    private final Executor networkExecutor;

    TargetJdbcConnectionVerifier(Executor networkExecutor) {
        this.networkExecutor = Objects.requireNonNull(networkExecutor, "networkExecutor");
    }

    TargetJdbcConnectionLease verify(
            Connection connection,
            TargetJdbcUrl configured,
            String username,
            JdbcMetadataMigrationDeadline deadline) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(configured, "configured");
        Objects.requireNonNull(deadline, "deadline");
        try {
            require(call(deadline, connection::getAutoCommit));
            require(!call(deadline, connection::isReadOnly));
            int networkTimeout = remainingMillis(deadline);
            run(deadline, () -> connection.setNetworkTimeout(networkExecutor, networkTimeout));
            DatabaseMetaData metadata = call(deadline, connection::getMetaData);
            String product = call(deadline, metadata::getDatabaseProductName);
            require(expectedProduct(configured.kind()).equals(product));
            String actualUrl = call(deadline, metadata::getURL);
            TargetJdbcEndpoint actual = parseActual(configured.kind(), actualUrl);
            require(actual.matches(configured));
            String catalog = call(deadline, connection::getCatalog);
            require(configured.database().equals(catalog));
            String schema = configured.kind() == MetadataDatabaseKind.POSTGRESQL
                    ? call(deadline, connection::getSchema) : null;
            if (configured.kind() == MetadataDatabaseKind.POSTGRESQL) {
                require(schema != null && !schema.isBlank());
            }
            check(deadline);
            return new TargetJdbcConnectionLease(
                    connection, TargetJdbcIdentity.hash(configured, username, catalog, schema));
        } catch (TargetJdbcConnectionException failure) {
            closeAfterFailure(connection, failure);
            throw failure;
        } catch (MetadataMigrationException timeout) {
            TargetJdbcConnectionException failure = failure(TargetJdbcConnectionErrorCode.TIMEOUT);
            closeAfterFailure(connection, failure);
            throw failure;
        } catch (SQLException | RuntimeException unavailable) {
            TargetJdbcConnectionException failure = failure(TargetJdbcConnectionErrorCode.UNAVAILABLE);
            closeAfterFailure(connection, failure);
            throw failure;
        } catch (Error fatal) {
            closeAfterFatal(connection, fatal);
            throw fatal;
        }
    }

    private static TargetJdbcEndpoint parseActual(MetadataDatabaseKind kind, String actualUrl) {
        try {
            return TargetJdbcEndpoint.parse(kind, actualUrl);
        } catch (IllegalArgumentException invalid) {
            throw failure(TargetJdbcConnectionErrorCode.TARGET_MISMATCH);
        }
    }

    private static <T> T call(JdbcMetadataMigrationDeadline deadline, JdbcCall<T> call) throws SQLException {
        check(deadline);
        T value = call.execute();
        check(deadline);
        return value;
    }

    private static void run(JdbcMetadataMigrationDeadline deadline, JdbcAction action) throws SQLException {
        check(deadline);
        action.execute();
        check(deadline);
    }

    private static int remainingMillis(JdbcMetadataMigrationDeadline deadline) {
        check(deadline);
        return deadline.remainingMillis();
    }

    private static void check(JdbcMetadataMigrationDeadline deadline) {
        if (Thread.currentThread().isInterrupted()) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        deadline.remainingDuration();
    }

    private static void require(boolean condition) {
        if (!condition) {
            throw failure(TargetJdbcConnectionErrorCode.TARGET_MISMATCH);
        }
    }

    private static String expectedProduct(MetadataDatabaseKind kind) {
        return kind == MetadataDatabaseKind.MYSQL ? "MySQL" : "PostgreSQL";
    }

    private static void closeAfterFailure(
            Connection connection, TargetJdbcConnectionException original) {
        boolean interrupted = Thread.interrupted();
        try {
            connection.close();
        } catch (SQLException | RuntimeException cleanupFailure) {
            throw failure(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        } catch (Error fatal) {
            fatal.addSuppressed(original);
            throw fatal;
        } finally {
            interrupted |= Thread.interrupted();
            restoreInterrupt(interrupted);
        }
    }

    private static void closeAfterFatal(Connection connection, Error original) {
        boolean interrupted = Thread.interrupted();
        try {
            connection.close();
        } catch (SQLException | RuntimeException cleanupFailure) {
            // The original fatal failure retains priority and no JDBC diagnostic is attached.
        } catch (Error cleanupFatal) {
            // Do not attach a second possibly sensitive fatal diagnostic.
        } finally {
            interrupted |= Thread.interrupted();
            restoreInterrupt(interrupted);
        }
    }

    private static void restoreInterrupt(boolean interrupted) {
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private static TargetJdbcConnectionException failure(TargetJdbcConnectionErrorCode code) {
        return new TargetJdbcConnectionException(code);
    }

    @FunctionalInterface
    private interface JdbcCall<T> {
        T execute() throws SQLException;
    }

    @FunctionalInterface
    private interface JdbcAction {
        void execute() throws SQLException;
    }
}
