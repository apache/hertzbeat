/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class RetainedCutoverFactoryRaceTest {

    private static final String OPERATION_A = "operation-a";
    private static final String OPERATION_B = "operation-b";
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat", "migration");

    @Test
    void timedOutAcquireKeepsLateCleanupBoundToTheOriginalOperation() throws Exception {
        CountDownLatch connectorEntered = new CountDownLatch(1);
        CountDownLatch releaseConnector = new CountDownLatch(1);
        CountDownLatch firstCloseAttempted = new CountDownLatch(1);
        AtomicInteger closes = new AtomicInteger();
        Connection connection = mysqlConnection();
        doAnswer(invocation -> {
            firstCloseAttempted.countDown();
            if (closes.getAndIncrement() == 0) {
                throw new SQLException("private close diagnostic");
            }
            return null;
        }).when(connection).close();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            connectorEntered.countDown();
            awaitIgnoringInterrupt(releaseConnector);
            return connection;
        };
        TargetJdbcResultWaiter timeoutAfterConnectorStarts = (ready, remaining) -> {
            assertThat(connectorEntered.await(1, TimeUnit.SECONDS)).isTrue();
            return false;
        };
        FlywayTargetSchemaProvisioner provisioner = mock(FlywayTargetSchemaProvisioner.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                        worker(), worker(), Runnable::run, connector,
                        new TargetJdbcConnectionVerifier(Runnable::run), timeoutAfterConnectorStarts);
                SecretValue password = SecretValue.of("borrowed-password")) {
            RetainedCutoverCoordinator coordinator = new RetainedCutoverCoordinator(
                    factory, provisioner, maintenance, executor, System::nanoTime);

            assertThatThrownBy(() -> execute(coordinator, OPERATION_A, password))
                    .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
            assertConflict(() -> execute(coordinator, OPERATION_B, password));

            releaseConnector.countDown();
            assertThat(firstCloseAttempted.await(2, TimeUnit.SECONDS)).isTrue();
            assertConflict(() -> execute(coordinator, OPERATION_B, password));
            assertThatThrownBy(() -> coordinator.retryRelease(OPERATION_A, TIMEOUT))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure ->
                            assertThat(failure.code())
                                    .isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED));

            verify(connection, times(2)).close();
            verifyNoInteractions(provisioner, maintenance, executor);
        } finally {
            releaseConnector.countDown();
        }
    }

    @Test
    void terminalFactorySettlementNeverOverwritesTheOriginalAcquisitionFatal() {
        AssertionError fatal = new AssertionError("private connector fatal");
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            throw fatal;
        };
        FlywayTargetSchemaProvisioner provisioner = mock(FlywayTargetSchemaProvisioner.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(connector, Runnable::run);
                SecretValue password = SecretValue.of("borrowed-password")) {
            RetainedCutoverCoordinator coordinator = new RetainedCutoverCoordinator(
                    factory, provisioner, maintenance, executor, System::nanoTime);

            assertThatThrownBy(() -> execute(coordinator, OPERATION_A, password)).isSameAs(fatal);
            assertThat(fatal.getSuppressed()).singleElement()
                    .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
            assertThatThrownBy(() -> coordinator.retryRelease(OPERATION_A, TIMEOUT)).isSameAs(fatal);

            verifyNoInteractions(provisioner, maintenance, executor);
        }
    }

    private static RetainedCutoverResult execute(
            RetainedCutoverCoordinator coordinator, String operationId, SecretValue password) {
        return coordinator.execute(
                operationId, TARGET, password, TIMEOUT,
                MetadataMigrationProgressSink.NO_OP, RetainedCutoverPreparation.NO_OP);
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException.class);
    }

    private static Connection mysqlConnection() throws SQLException {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.isReadOnly()).thenReturn(false);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("MySQL");
        when(metadata.getURL()).thenReturn("jdbc:mysql://db.example/hertzbeat");
        when(connection.getCatalog()).thenReturn("hertzbeat");
        return connection;
    }

    private static ThreadPoolExecutor worker() {
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>());
        worker.allowCoreThreadTimeOut(true);
        return worker;
    }

    private static void awaitIgnoringInterrupt(CountDownLatch latch) {
        boolean interrupted = false;
        while (true) {
            try {
                latch.await();
                break;
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
