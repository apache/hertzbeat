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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceErrorCode;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.InOrder;
import org.mockito.ArgumentCaptor;

@Timeout(15)
class RetainedCutoverCoordinatorTest {

    private static final String OPERATION_ID = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final String OTHER_IDENTITY = "b".repeat(64);
    private static final Duration TIMEOUT = Duration.ofNanos(100);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "migration");

    @Test
    void provisionsAndClosesOneLeaseBeforeFreshIdentityMatchedCopyAndRetainsMaintenance() {
        Fixture fixture = new Fixture();

        RetainedCutoverResult result = fixture.execute();

        assertThat(result.status()).isEqualTo(RetainedCutoverResult.Status.RETAINED_SUCCESS);
        assertThat(result.operationId()).isEqualTo(OPERATION_ID);
        assertThat(result.targetIdentityHash()).isEqualTo(IDENTITY);
        InOrder order = inOrder(
                fixture.factory, fixture.provisionLease, fixture.provisioner,
                fixture.copyLease, fixture.maintenance, fixture.maintenanceLease, fixture.executor);
        order.verify(fixture.factory).acquire(same(TARGET), same(fixture.password), anyDeadline());
        order.verify(fixture.provisionLease).withConnection(any());
        order.verify(fixture.provisioner).provision(
                same(fixture.provisionConnection), eq(MetadataDatabaseKind.POSTGRESQL), anyDeadline());
        order.verify(fixture.provisionLease).close();
        order.verify(fixture.factory).acquire(same(TARGET), same(fixture.password), anyDeadline());
        order.verify(fixture.maintenance).acquire(eq(OPERATION_ID), any());
        order.verify(fixture.copyLease).withConnection(any());
        order.verify(fixture.maintenanceLease).withSourceConnection(any());
        order.verify(fixture.executor).execute(
                same(fixture.sourceConnection), same(fixture.copyConnection),
                eq(MetadataDatabaseKind.POSTGRESQL), anyDeadline(),
                same(MetadataMigrationProgressSink.NO_OP));
        order.verify(fixture.copyLease).close();
        verify(fixture.maintenanceLease, never()).close();
        verify(fixture.factory, never()).close();
        assertThat(fixture.provisionConnection).isNotSameAs(fixture.copyConnection);
    }

    @Test
    void passesOneRootDeadlineAndConsumesMaintenanceAcquisitionFromItsRemainingBudget() {
        Fixture fixture = new Fixture();
        fixture.ticker.set(10);
        when(fixture.maintenance.acquire(eq(OPERATION_ID), any())).thenAnswer(invocation -> {
            assertThat((Duration) invocation.getArgument(1)).isEqualTo(Duration.ofNanos(55));
            fixture.ticker.addAndGet(20);
            return fixture.maintenanceLease;
        });
        doAnswer(invocation -> {
            JdbcMetadataMigrationDeadline deadline = invocation.getArgument(2);
            assertThat(deadline.remainingNanos()).isEqualTo(90);
            fixture.ticker.addAndGet(20);
            return new TargetSchemaProvisioningOutcome(TargetSchemaConnectionDisposition.REUSABLE);
        }).when(fixture.provisioner).provision(any(), any(), anyDeadline());
        when(fixture.factory.acquire(same(TARGET), same(fixture.password), anyDeadline()))
                .thenAnswer(invocation -> {
                    JdbcMetadataMigrationDeadline deadline = invocation.getArgument(2);
                    assertThat(deadline.remainingNanos()).isPositive();
                    fixture.ticker.addAndGet(10);
                    return fixture.provisionLease;
                })
                .thenAnswer(invocation -> {
                    JdbcMetadataMigrationDeadline deadline = invocation.getArgument(2);
                    assertThat(deadline.remainingNanos()).isEqualTo(70);
                    fixture.ticker.addAndGet(15);
                    return fixture.copyLease;
                });
        doAnswer(invocation -> {
            JdbcMetadataMigrationDeadline deadline = invocation.getArgument(3);
            assertThat(deadline.remainingNanos()).isEqualTo(35);
            return null;
        }).when(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());

        fixture.execute();

        ArgumentCaptor<JdbcMetadataMigrationDeadline> acquireDeadlines =
                ArgumentCaptor.forClass(JdbcMetadataMigrationDeadline.class);
        verify(fixture.factory, times(2)).acquire(
                same(TARGET), same(fixture.password), acquireDeadlines.capture());
        ArgumentCaptor<JdbcMetadataMigrationDeadline> provisionDeadline =
                ArgumentCaptor.forClass(JdbcMetadataMigrationDeadline.class);
        verify(fixture.provisioner).provision(
                any(), any(), provisionDeadline.capture());
        ArgumentCaptor<JdbcMetadataMigrationDeadline> copyDeadline =
                ArgumentCaptor.forClass(JdbcMetadataMigrationDeadline.class);
        verify(fixture.executor).execute(
                any(), any(), any(), copyDeadline.capture(), any());
        assertThat(acquireDeadlines.getAllValues())
                .allSatisfy(value -> assertThat(value).isSameAs(provisionDeadline.getValue()));
        assertThat(copyDeadline.getValue()).isSameAs(provisionDeadline.getValue());
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
    }

    @Test
    void retainedStatusReplaysWithoutCredentialsOrWorkAndExecuteRemainsExclusive() {
        Fixture fixture = new Fixture();
        RetainedCutoverResult first = fixture.execute();

        RetainedCutoverResult replay = fixture.coordinator.retained(OPERATION_ID);

        assertThat(replay.status()).isEqualTo(RetainedCutoverResult.Status.ALREADY_RETAINED);
        assertThat(replay.targetIdentityHash()).isEqualTo(first.targetIdentityHash());
        verify(fixture.factory, times(2)).acquire(any(), any(), anyDeadline());
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        assertConflict(fixture::execute);
        assertConflict(() -> fixture.coordinator.execute(
                "operation-b", TARGET, fixture.password, TIMEOUT,
                MetadataMigrationProgressSink.NO_OP, RetainedCutoverPreparation.NO_OP));
    }

    @Test
    void identityChangeClosesFreshTargetWithoutAcquiringMaintenanceOrCopying() {
        Fixture fixture = new Fixture(IDENTITY, OTHER_IDENTITY);

        assertThatThrownBy(fixture::execute)
                .isInstanceOfSatisfying(RetainedCutoverException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(RetainedCutoverErrorCode.TARGET_IDENTITY_CHANGED));

        verify(fixture.copyLease).close();
        verifyNoInteractions(fixture.maintenance, fixture.maintenanceLease, fixture.executor);
    }

    @Test
    void copyFailureClosesTargetThenMaintenanceBeforeReplayingStableFailure() {
        Fixture fixture = new Fixture();
        doThrow(new MetadataMigrationException(MetadataMigrationErrorCode.VERIFICATION))
                .when(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());

        assertThatThrownBy(fixture::execute)
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.VERIFICATION));

        InOrder release = inOrder(fixture.copyLease, fixture.maintenanceLease);
        release.verify(fixture.copyLease).close();
        release.verify(fixture.maintenanceLease).close();
    }

    @Test
    void failedTargetCloseRetainsExactFailureAndSameOperationRetryNeverRecopies() {
        Fixture fixture = new Fixture();
        doThrow(new MetadataMigrationException(MetadataMigrationErrorCode.COPY))
                .when(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(fixture.copyLease).close();

        assertThatThrownBy(fixture::execute)
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class)
                .hasNoCause();
        assertConflict(() -> fixture.coordinator.retryRelease("operation-b", Duration.ofSeconds(1)));

        assertThatThrownBy(() -> fixture.coordinator.retryRelease(OPERATION_ID, Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.COPY));
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.copyLease, times(2)).close();
        verify(fixture.maintenanceLease).close();
    }

    @Test
    void successfulCopyWhoseTargetCloseNeedsRetryConvergesToRetainedSuccess() {
        Fixture fixture = new Fixture();
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(fixture.copyLease).close();

        assertThatThrownBy(fixture::execute)
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);

        RetainedCutoverResult result = fixture.coordinator.retryRelease(
                OPERATION_ID, Duration.ofSeconds(1));
        assertThat(result.status()).isEqualTo(RetainedCutoverResult.Status.RETAINED_SUCCESS);
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void maintenanceReleaseFailureRetainsExactLeaseAndRetryDoesNotRepeatCopy() {
        Fixture fixture = new Fixture();
        doThrow(new MetadataMigrationException(MetadataMigrationErrorCode.COPY))
                .when(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        doThrow(MigrationMaintenanceException.maintenanceFailure())
                .doNothing().when(fixture.maintenanceLease).close();

        assertThatThrownBy(fixture::execute)
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);

        assertThatThrownBy(() -> fixture.coordinator.retryRelease(OPERATION_ID, Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.COPY));
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, times(2)).close();
    }

    @Test
    void fatalCopyRemainsPrimaryWhenCleanupNeedsSameOperationRetry() {
        Fixture fixture = new Fixture();
        AssertionError fatal = new AssertionError("fatal copy");
        doThrow(fatal).when(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        doThrow(new IllegalStateException("private close"))
                .doNothing().when(fixture.copyLease).close();

        assertThatThrownBy(fixture::execute).isSameAs(fatal);
        assertThat(fatal.getSuppressed()).singleElement()
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
        assertThatThrownBy(() -> fixture.coordinator.retryRelease(OPERATION_ID, Duration.ofSeconds(1)))
                .isSameAs(fatal);
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
    }

    @Test
    void mandatoryFailureCleanupClearsAndRestoresInterrupt() {
        Fixture fixture = new Fixture();
        doAnswer(invocation -> {
            Thread.currentThread().interrupt();
            throw new MetadataMigrationException(MetadataMigrationErrorCode.COPY);
        }).when(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(fixture.copyLease).close();
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(fixture.maintenanceLease).close();

        try {
            assertThatThrownBy(fixture::execute).isInstanceOf(MetadataMigrationException.class);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
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
        private final AtomicLong ticker = new AtomicLong();
        private final RetainedCutoverCoordinator coordinator;

        private Fixture() {
            this(IDENTITY, IDENTITY);
        }

        private Fixture(String provisionIdentity, String copyIdentity) {
            when(provisionLease.targetIdentityHash()).thenReturn(provisionIdentity);
            when(copyLease.targetIdentityHash()).thenReturn(copyIdentity);
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
                    factory, provisioner, maintenance, executor, ticker::get);
        }

        private RetainedCutoverResult execute() {
            return coordinator.execute(
                    OPERATION_ID, TARGET, password, TIMEOUT,
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
