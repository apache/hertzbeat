/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.intThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.Duration;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class TargetJdbcConnectionVerifierTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final Executor NETWORK_EXECUTOR = Runnable::run;

    @Test
    void verifiesMysqlEndpointCatalogAndStateWithoutReadingSchema() throws Exception {
        AtomicLong ticker = new AtomicLong();
        Connection connection = mysqlConnection();
        TargetJdbcUrl configured = TargetJdbcUrl.parse(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat?sslmode=required");

        TargetJdbcConnectionLease lease = verifier().verify(
                connection, configured, "operator", deadline(ticker));

        assertThat(lease.targetIdentityHash()).matches("[0-9a-f]{64}");
        verify(connection).setNetworkTimeout(any(), intThat(value -> value > 0 && value <= 5_000));
        verify(connection, never()).getSchema();
        verify(connection, never()).close();
        lease.close();
    }

    @Test
    void verifiesPostgresEndpointCatalogAndNonemptySchema() throws Exception {
        AtomicLong ticker = new AtomicLong();
        Connection connection = postgresConnection();
        TargetJdbcUrl configured = TargetJdbcUrl.parse(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat?sslmode=require");

        TargetJdbcConnectionLease lease = verifier().verify(
                connection, configured, "operator", deadline(ticker));

        assertThat(lease.targetIdentityHash()).isEqualTo(TargetJdbcIdentity.hash(
                configured, "operator", "hertzbeat", "public"));
        verify(connection).getSchema();
        lease.close();
    }

    @Test
    void actualMetadataUrlCorroboratesEndpointWithoutRequiringConfiguredQuery() throws Exception {
        Connection withoutQuery = connectionWith(
                "PostgreSQL", "jdbc:postgresql://db.example:5432/hertzbeat", "hertzbeat", "public");
        TargetJdbcUrl configured = TargetJdbcUrl.parse(
                MetadataDatabaseKind.POSTGRESQL,
                "jdbc:postgresql://db.example/hertzbeat?sslmode=require&ApplicationName=HertzBeat");

        TargetJdbcConnectionLease first = verifier().verify(
                withoutQuery, configured, "operator",
                JdbcMetadataMigrationDeadline.start(TIMEOUT, System::nanoTime));
        first.close();

        Connection driverQuery = connectionWith(
                "PostgreSQL",
                "jdbc:postgresql://db.example/hertzbeat?user=operator&driverProperty=value",
                "hertzbeat", "public");
        TargetJdbcConnectionLease second = verifier().verify(
                driverQuery, configured, "operator",
                JdbcMetadataMigrationDeadline.start(TIMEOUT, System::nanoTime));
        second.close();
    }

    @Test
    void actualMetadataEndpointMismatchIsRejectedWithoutLeakingTheActualUrl() throws Exception {
        assertMismatch(connectionWith(
                        "PostgreSQL", "jdbc:postgresql://other.example/hertzbeat?user=private",
                        "hertzbeat", "public"),
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat");
        assertMismatch(connectionWith(
                        "PostgreSQL", "jdbc:postgresql://db.example:6432/hertzbeat",
                        "hertzbeat", "public"),
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat");
        assertMismatch(connectionWith(
                        "PostgreSQL", "jdbc:postgresql://db.example/other",
                        "hertzbeat", "public"),
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat");
        assertMismatch(connectionWith(
                        "PostgreSQL", "jdbc:postgresql://db-a.example,db-b.example/hertzbeat",
                        "hertzbeat", "public"),
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat");
    }

    @Test
    void productEndpointCatalogAndSchemaMismatchFailClosed() throws Exception {
        assertMismatch(connectionWith("MariaDB", "jdbc:mysql://db.example/hertzbeat", "hertzbeat", null),
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat");
        assertMismatch(connectionWith("MySQL", "jdbc:mysql://other.example/hertzbeat", "hertzbeat", null),
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat");
        assertMismatch(connectionWith("MySQL", "jdbc:mysql://db.example/hertzbeat", "other", null),
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat");
        assertMismatch(connectionWith("PostgreSQL", "jdbc:postgresql://db.example/hertzbeat", "hertzbeat", ""),
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat");
    }

    @ParameterizedTest
    @EnumSource(ExpirationPoint.class)
    void everyJdbcBoundaryUsesTheSameDeadlineAndClosesTheProvisionalConnection(
            ExpirationPoint expirationPoint) throws Exception {
        AtomicLong ticker = new AtomicLong();
        MetadataDatabaseKind kind = expirationPoint == ExpirationPoint.SCHEMA
                ? MetadataDatabaseKind.POSTGRESQL : MetadataDatabaseKind.MYSQL;
        Connection connection = expiringConnection(kind, expirationPoint, ticker);
        doAnswer(invocation -> {
            return null;
        }).when(connection).close();
        TargetJdbcUrl configured = TargetJdbcUrl.parse(kind, kind == MetadataDatabaseKind.MYSQL
                ? "jdbc:mysql://db.example/hertzbeat?sslmode=required"
                : "jdbc:postgresql://db.example/hertzbeat?sslmode=require");

        assertThatThrownBy(() -> verifier().verify(connection, configured, "operator", deadline(ticker)))
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT);
                    assertThat(failure).hasNoCause();
                });

        verify(connection).close();
    }

    @Test
    void timeoutCleanupClearsInterruptDuringCloseAndRestoresItAfterward() throws Exception {
        Connection connection = mysqlConnection();
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(connection).close();
        TargetJdbcUrl configured = TargetJdbcUrl.parse(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat?sslmode=required");

        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(() -> verifier().verify(
                    connection, configured, "operator",
                    JdbcMetadataMigrationDeadline.start(TIMEOUT, System::nanoTime)))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure ->
                            assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT));
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void fatalCleanupClearsNewInterruptDuringCloseAndRestoresItAfterward() throws Exception {
        Connection connection = mysqlConnection();
        AssertionError fatal = new AssertionError("fatal provisional inspection");
        when(connection.getAutoCommit()).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            throw fatal;
        });
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(connection).close();
        TargetJdbcUrl configured = TargetJdbcUrl.parse(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat?sslmode=required");

        try {
            assertThatThrownBy(() -> verifier().verify(
                    connection, configured, "operator",
                    JdbcMetadataMigrationDeadline.start(TIMEOUT, System::nanoTime)))
                    .isSameAs(fatal);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    private static void assertMismatch(
            Connection connection, MetadataDatabaseKind kind, String configuredUrl) throws Exception {
        TargetJdbcUrl configured = TargetJdbcUrl.parse(kind, configuredUrl);
        assertThatThrownBy(() -> verifier().verify(
                connection, configured, "operator",
                JdbcMetadataMigrationDeadline.start(TIMEOUT, System::nanoTime)))
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.TARGET_MISMATCH);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getMessage()).doesNotContain("db.example", "operator", "hertzbeat");
                });
        verify(connection).close();
    }

    private static TargetJdbcConnectionVerifier verifier() {
        return new TargetJdbcConnectionVerifier(NETWORK_EXECUTOR);
    }

    private static JdbcMetadataMigrationDeadline deadline(AtomicLong ticker) {
        return JdbcMetadataMigrationDeadline.start(TIMEOUT, ticker::get);
    }

    private static Connection mysqlConnection() throws Exception {
        return connectionWith("MySQL", "jdbc:mysql://db.example/hertzbeat?sslmode=required", "hertzbeat", null);
    }

    private static Connection postgresConnection() throws Exception {
        return connectionWith(
                "PostgreSQL", "jdbc:postgresql://db.example/hertzbeat?sslmode=require", "hertzbeat", "public");
    }

    private static Connection connectionWith(
            String product, String actualUrl, String catalog, String schema) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.isReadOnly()).thenReturn(false);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn(product);
        when(metadata.getURL()).thenReturn(actualUrl);
        when(connection.getCatalog()).thenReturn(catalog);
        when(connection.getSchema()).thenReturn(schema);
        return connection;
    }

    private static Connection expiringConnection(
            MetadataDatabaseKind kind,
            ExpirationPoint expirationPoint,
            AtomicLong ticker) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getAutoCommit()).thenAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.AUTO_COMMIT, ticker);
            return true;
        });
        when(connection.isReadOnly()).thenAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.READ_ONLY, ticker);
            return false;
        });
        doAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.NETWORK_TIMEOUT, ticker);
            return null;
        }).when(connection).setNetworkTimeout(any(), anyInt());
        when(connection.getMetaData()).thenAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.METADATA, ticker);
            return metadata;
        });
        when(metadata.getDatabaseProductName()).thenAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.PRODUCT, ticker);
            return kind == MetadataDatabaseKind.MYSQL ? "MySQL" : "PostgreSQL";
        });
        when(metadata.getURL()).thenAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.URL, ticker);
            return kind == MetadataDatabaseKind.MYSQL
                    ? "jdbc:mysql://db.example/hertzbeat?sslmode=required"
                    : "jdbc:postgresql://db.example/hertzbeat?sslmode=require";
        });
        when(connection.getCatalog()).thenAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.CATALOG, ticker);
            return "hertzbeat";
        });
        when(connection.getSchema()).thenAnswer(invocation -> {
            expire(expirationPoint, ExpirationPoint.SCHEMA, ticker);
            return "public";
        });
        return connection;
    }

    private static void expire(
            ExpirationPoint actual,
            ExpirationPoint expected,
            AtomicLong ticker) {
        if (actual == expected) {
            ticker.set(TIMEOUT.toNanos());
        }
    }

    private enum ExpirationPoint {
        AUTO_COMMIT,
        READ_ONLY,
        NETWORK_TIMEOUT,
        METADATA,
        PRODUCT,
        URL,
        CATALOG,
        SCHEMA
    }
}
