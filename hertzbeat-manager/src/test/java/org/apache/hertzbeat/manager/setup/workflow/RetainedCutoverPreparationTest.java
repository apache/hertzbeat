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
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
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
import org.mockito.InOrder;

@Timeout(15)
class RetainedCutoverPreparationTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final Duration TIMEOUT = Duration.ofNanos(100);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat", "migration");

    @Test
    void preparesExactlyOnceAfterFirstIdentityAndBeforeAnyProvisionMutation() {
        Fixture fixture = new Fixture();
        AtomicReference<RetainedCutoverPreparationContext> observed = new AtomicReference<>();
        RetainedCutoverPreparation preparation = mock(RetainedCutoverPreparation.class);
        doAnswer(invocation -> {
            observed.set(invocation.getArgument(0));
            return null;
        }).when(preparation).prepare(any(), same(TARGET), same(fixture.password));

        fixture.execute(preparation);

        assertThat(observed.get()).isEqualTo(
                new RetainedCutoverPreparationContext(OPERATION, IDENTITY));
        InOrder order = inOrder(fixture.factory, fixture.provisionLease, preparation, fixture.provisioner);
        order.verify(fixture.factory).acquire(same(TARGET), same(fixture.password), anyDeadline());
        order.verify(fixture.provisionLease).targetIdentityHash();
        order.verify(preparation).prepare(observed.get(), TARGET, fixture.password);
        order.verify(fixture.provisionLease).withConnection(any());
        order.verify(fixture.provisioner).provision(
                same(fixture.provisionConnection), eq(MetadataDatabaseKind.MYSQL), anyDeadline());
        verify(preparation).prepare(any(), same(TARGET), same(fixture.password));
    }

    @Test
    void elapsedRootDeadlineAfterPreparationPreventsProvision() {
        Fixture fixture = new Fixture();
        RetainedCutoverPreparation preparation = (context, target, password) -> fixture.ticker.set(100);

        assertThatThrownBy(() -> fixture.execute(preparation))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT));

        verify(fixture.provisionLease).close();
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    @Test
    void expiredRootDeadlineAfterFirstIdentityNeverInvokesPreparation() {
        Fixture fixture = new Fixture();
        RetainedCutoverPreparation preparation = mock(RetainedCutoverPreparation.class);
        when(fixture.provisionLease.targetIdentityHash()).thenAnswer(invocation -> {
            fixture.ticker.set(100);
            return IDENTITY;
        });

        assertThatThrownBy(() -> fixture.execute(preparation))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT));

        verifyNoInteractions(preparation, fixture.provisioner, fixture.maintenance, fixture.executor);
        verify(fixture.provisionLease).close();
    }

    @Test
    void interruptAfterFirstIdentityNeverInvokesPreparationAndIsRestored() {
        Fixture fixture = new Fixture();
        RetainedCutoverPreparation preparation = mock(RetainedCutoverPreparation.class);
        when(fixture.provisionLease.targetIdentityHash()).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            return IDENTITY;
        });
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(fixture.provisionLease).close();

        try {
            assertThatThrownBy(() -> fixture.execute(preparation))
                    .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                            assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
        verifyNoInteractions(preparation, fixture.provisioner, fixture.maintenance, fixture.executor);
        verify(fixture.provisionLease).close();
    }

    @Test
    void stableAndUnexpectedPreparationFailuresCloseFirstLeaseWithoutProvision() {
        Fixture stable = new Fixture();
        MetadataMigrationException expected = new MetadataMigrationException(
                MetadataMigrationErrorCode.VERIFICATION);
        RetainedCutoverPreparation stableFailure = (context, target, password) -> {
            throw expected;
        };

        assertThatThrownBy(() -> stable.execute(stableFailure)).isSameAs(expected);
        verify(stable.provisionLease).close();
        verifyNoInteractions(stable.provisioner, stable.maintenance, stable.executor);

        Fixture unexpected = new Fixture();
        RetainedCutoverPreparation privateFailure = (context, target, password) -> {
            throw new IllegalStateException("private preparation diagnostic");
        };
        assertThatThrownBy(() -> unexpected.execute(privateFailure))
                .isInstanceOfSatisfying(RetainedCutoverException.class, failure ->
                        assertThat(failure.code()).isEqualTo(RetainedCutoverErrorCode.EXECUTION_FAILED))
                .hasNoCause();
        verify(unexpected.provisionLease).close();
        verifyNoInteractions(unexpected.provisioner, unexpected.maintenance, unexpected.executor);
    }

    @Test
    void durableStopCodeIsPreservedWithoutAllowingProvision() {
        Fixture fixture = new Fixture();
        DurableCutoverPreparationException expected = new DurableCutoverPreparationException(
                org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        RetainedCutoverPreparation stop = (context, target, password) -> {
            throw expected;
        };

        assertThatThrownBy(() -> fixture.execute(stop)).isSameAs(expected);
        verify(fixture.provisionLease).close();
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    @Test
    void fatalPreparationRemainsPrimaryAcrossExactCloseRetry() {
        Fixture fixture = new Fixture();
        AssertionError fatal = new AssertionError("preparation fatal");
        RetainedCutoverPreparation preparation = mock(RetainedCutoverPreparation.class);
        doThrow(fatal).when(preparation).prepare(any(), same(TARGET), same(fixture.password));
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(fixture.provisionLease).close();

        assertThatThrownBy(() -> fixture.execute(preparation)).isSameAs(fatal);
        assertThat(fatal.getSuppressed()).singleElement()
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
        assertConflict(() -> fixture.coordinator.retryRelease("operation-b", Duration.ofSeconds(1)));
        assertThatThrownBy(() -> fixture.coordinator.retryRelease(OPERATION, Duration.ofSeconds(1)))
                .isSameAs(fatal);

        verify(preparation).prepare(any(), same(TARGET), same(fixture.password));
        verify(fixture.provisionLease, times(2)).close();
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    @Test
    void preparationInterruptIsClearedForCloseAndRestoredForCaller() {
        Fixture fixture = new Fixture();
        RetainedCutoverPreparation preparation =
                (context, target, password) -> Thread.currentThread().interrupt();
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(fixture.provisionLease).close();

        try {
            assertThatThrownBy(() -> fixture.execute(preparation))
                    .isInstanceOf(MetadataMigrationException.class);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    @Test
    void preparationReentryAndForeignOperationConflictBeforeProvision() {
        Fixture fixture = new Fixture();
        AtomicReference<Throwable> sameOperation = new AtomicReference<>();
        AtomicReference<Throwable> foreignOperation = new AtomicReference<>();
        RetainedCutoverPreparation preparation = (context, target, password) -> {
            capture(sameOperation, () -> fixture.execute(RetainedCutoverPreparation.NO_OP));
            capture(foreignOperation, () -> fixture.coordinator.execute(
                    "operation-b", TARGET, fixture.password, TIMEOUT,
                    MetadataMigrationProgressSink.NO_OP, RetainedCutoverPreparation.NO_OP,
                    RetainedCopyJournalHandoff.NO_OP));
        };

        fixture.execute(preparation);

        assertThat(sameOperation.get()).isInstanceOf(MigrationMaintenanceException.class);
        assertThat(foreignOperation.get()).isInstanceOf(MigrationMaintenanceException.class);
        verify(fixture.provisioner).provision(any(), any(), anyDeadline());
    }

    @Test
    void contextRejectsUnsafeIdentityAndExposesNoCredentialSurface() {
        assertThatThrownBy(() -> new RetainedCutoverPreparationContext("../operation", IDENTITY))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RetainedCutoverPreparationContext(OPERATION, "invalid"))
                .isInstanceOf(IllegalArgumentException.class);

        RetainedCutoverPreparationContext context =
                new RetainedCutoverPreparationContext(OPERATION, IDENTITY);
        assertThat(context.getClass().getRecordComponents())
                .extracting(component -> component.getName())
                .containsExactly("operationId", "targetIdentityHash");
        assertThat(context.toString())
                .doesNotContain("jdbc:", "password", "username", "table", "checksum");
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static void capture(AtomicReference<Throwable> target, Runnable action) {
        try {
            action.run();
        } catch (Throwable failure) {
            target.set(failure);
        }
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(MigrationMaintenanceException.class);
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
            when(maintenance.acquire(eq(OPERATION), any())).thenReturn(maintenanceLease);
            coordinator = new RetainedCutoverCoordinator(
                    factory, provisioner, maintenance, executor, ticker::get);
        }

        private RetainedCutoverResult execute(RetainedCutoverPreparation preparation) {
            return coordinator.execute(
                    OPERATION, TARGET, password, TIMEOUT,
                    MetadataMigrationProgressSink.NO_OP, preparation,
                    RetainedCopyJournalHandoff.NO_OP);
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
