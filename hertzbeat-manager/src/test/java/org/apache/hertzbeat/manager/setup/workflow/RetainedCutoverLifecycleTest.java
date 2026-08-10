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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class RetainedCutoverLifecycleTest {

    private static final String OPERATION_ID = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final Duration TIMEOUT = Duration.ofSeconds(1);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat", "migration");

    @Test
    void concurrentAndReentrantExecuteCannotReplaceTheOneActiveOperation() throws Exception {
        Fixture fixture = new Fixture();
        CountDownLatch enteredProvision = new CountDownLatch(1);
        CountDownLatch releaseProvision = new CountDownLatch(1);
        doAnswer(invocation -> {
            enteredProvision.countDown();
            await(releaseProvision);
            return new TargetSchemaProvisioningOutcome(TargetSchemaConnectionDisposition.REUSABLE);
        }).when(fixture.provisioner).provision(any(), any(), anyDeadline());
        ExecutorService callers = Executors.newSingleThreadExecutor();
        Future<RetainedCutoverResult> first = callers.submit(() -> fixture.execute());
        try {
            assertThat(enteredProvision.await(1, TimeUnit.SECONDS)).isTrue();
            assertConflict(fixture::execute);
            assertConflict(() -> fixture.coordinator.execute(
                    "operation-b", TARGET, fixture.password, TIMEOUT,
                    MetadataMigrationProgressSink.NO_OP, RetainedCutoverPreparation.NO_OP));
        } finally {
            releaseProvision.countDown();
            first.get(2, TimeUnit.SECONDS);
            callers.shutdownNow();
        }
    }

    @Test
    void callbackLocalReentryFailsBeforeAnySecondConnectionOrMaintenanceMutation() {
        Fixture fixture = new Fixture();
        AtomicReference<Throwable> reentrantFailure = new AtomicReference<>();
        doAnswer(invocation -> {
            try {
                fixture.execute();
            } catch (Throwable failure) {
                reentrantFailure.set(failure);
            }
            return new TargetSchemaProvisioningOutcome(TargetSchemaConnectionDisposition.REUSABLE);
        }).when(fixture.provisioner).provision(any(), any(), anyDeadline());

        fixture.execute();

        assertThat(reentrantFailure.get()).isInstanceOf(MigrationMaintenanceException.class);
        verify(fixture.factory, never()).close();
        verify(fixture.executor, never()).close();
    }

    @Test
    void borrowedSecretRemainsCallerOwnedAcrossSuccessAndFailure() {
        Fixture fixture = new Fixture();
        try (SecretValue callerPassword = SecretValue.of("borrowed-password")) {
            char[] before = callerPassword.copy();
            try {
                when(fixture.factory.acquire(same(TARGET), same(callerPassword), anyDeadline()))
                        .thenReturn(fixture.provisionLease, fixture.copyLease);
                fixture.execute(callerPassword);
                assertThat(callerPassword.copy()).containsExactly(before);
                fixture.coordinator.releaseRetained(OPERATION_ID);
                when(fixture.factory.acquire(same(TARGET), same(callerPassword), anyDeadline()))
                        .thenThrow(new TargetJdbcConnectionException(
                                TargetJdbcConnectionErrorCode.UNAVAILABLE));
                assertThatThrownBy(() -> fixture.execute(callerPassword))
                        .isInstanceOf(TargetJdbcConnectionException.class);
                assertThat(callerPassword.copy()).containsExactly(before);
            } finally {
                Arrays.fill(before, '\0');
            }
        }
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(MigrationMaintenanceException.class);
    }

    private static void await(CountDownLatch latch) {
        boolean interrupted = false;
        try {
            while (true) {
                try {
                    latch.await();
                    return;
                } catch (InterruptedException ignored) {
                    interrupted = true;
                }
            }
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static final class Fixture {

        private final Connection provisionConnection = mock(Connection.class);
        private final Connection copyConnection = mock(Connection.class);
        private final Connection sourceConnection = mock(Connection.class);
        private final TargetJdbcConnectionFactory factory = mock(TargetJdbcConnectionFactory.class);
        private final TargetJdbcConnectionLease provisionLease = mock(TargetJdbcConnectionLease.class);
        private final TargetJdbcConnectionLease copyLease = mock(TargetJdbcConnectionLease.class);
        private final FlywayTargetSchemaProvisioner provisioner = mock(FlywayTargetSchemaProvisioner.class);
        private final MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        private final MigrationMaintenanceLease maintenanceLease = mock(MigrationMaintenanceLease.class);
        private final JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        private final SecretValue password = mock(SecretValue.class);
        private final RetainedCutoverCoordinator coordinator;

        private Fixture() {
            when(provisionLease.targetIdentityHash()).thenReturn(IDENTITY);
            when(copyLease.targetIdentityHash()).thenReturn(IDENTITY);
            when(factory.acquire(same(TARGET), same(password), anyDeadline()))
                    .thenReturn(provisionLease, copyLease);
            scopedTarget(provisionLease, provisionConnection);
            scopedTarget(copyLease, copyConnection);
            scopedSource(maintenanceLease, sourceConnection);
            when(provisioner.provision(any(), any(), anyDeadline()))
                    .thenReturn(new TargetSchemaProvisioningOutcome(
                            TargetSchemaConnectionDisposition.REUSABLE));
            when(maintenance.acquire(eq(OPERATION_ID), any())).thenReturn(maintenanceLease);
            coordinator = new RetainedCutoverCoordinator(
                    factory, provisioner, maintenance, executor, System::nanoTime);
        }

        private RetainedCutoverResult execute() {
            return execute(password);
        }

        private RetainedCutoverResult execute(SecretValue borrowedPassword) {
            return coordinator.execute(
                    OPERATION_ID, TARGET, borrowedPassword, TIMEOUT,
                    MetadataMigrationProgressSink.NO_OP, RetainedCutoverPreparation.NO_OP);
        }

        private static void scopedTarget(TargetJdbcConnectionLease lease, Connection connection) {
            doAnswer(invocation -> {
                TargetJdbcConnectionAction action = invocation.getArgument(0);
                action.execute(connection);
                return null;
            }).when(lease).withConnection(any());
        }

        private static void scopedSource(MigrationMaintenanceLease lease, Connection connection) {
            doAnswer(invocation -> {
                MigrationSourceAction action = invocation.getArgument(0);
                action.execute(connection);
                return null;
            }).when(lease).withSourceConnection(any());
        }
    }
}
