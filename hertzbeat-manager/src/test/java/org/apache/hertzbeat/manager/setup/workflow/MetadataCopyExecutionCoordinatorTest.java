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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

@Timeout(15)
class MetadataCopyExecutionCoordinatorTest {

    private static final Duration TIMEOUT = Duration.ofNanos(100);

    @Test
    void usesExactGuardedSourceAndOneRootDeadlineBeforeReverseRelease() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        AtomicLong ticker = new AtomicLong(10);
        when(maintenance.acquire(eq("operation-a"), any())).thenAnswer(invocation -> {
            assertThat((Duration) invocation.getArgument(1)).isEqualTo(TIMEOUT);
            ticker.addAndGet(30);
            return lease;
        });
        MetadataCopyExecutionCoordinator coordinator =
                new MetadataCopyExecutionCoordinator(maintenance, executor, ticker::get);

        coordinator.execute("operation-a", target, MetadataDatabaseKind.MYSQL, TIMEOUT,
                MetadataMigrationProgressSink.NO_OP);

        ArgumentCaptor<JdbcMetadataMigrationDeadline> deadline =
                ArgumentCaptor.forClass(JdbcMetadataMigrationDeadline.class);
        InOrder order = inOrder(maintenance, lease, executor);
        order.verify(maintenance).acquire(eq("operation-a"), any());
        order.verify(lease).withSourceConnection(any());
        order.verify(executor).execute(same(source), same(target), eq(MetadataDatabaseKind.MYSQL),
                deadline.capture(), same(MetadataMigrationProgressSink.NO_OP));
        order.verify(lease).close();
        assertThat(deadline.getValue().remainingNanos()).isEqualTo(70);
    }

    @Test
    void releasesBeforeReplayingStableCopyFailure() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(new MetadataMigrationException(MetadataMigrationErrorCode.VERIFICATION))
                .when(executor).execute(same(source), same(target), any(), anyDeadline(), any());
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.POSTGRESQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.VERIFICATION));

        InOrder order = inOrder(executor, lease);
        order.verify(executor).execute(any(), any(), any(), anyDeadline(), any());
        order.verify(lease).close();
    }

    @Test
    void releasesBeforeReplayingFatalCopyError() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        AssertionError fatal = new AssertionError("fatal copy");
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(fatal).when(executor).execute(any(), any(), any(), anyDeadline(), any());
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isSameAs(fatal);

        InOrder order = inOrder(executor, lease);
        order.verify(executor).execute(any(), any(), any(), anyDeadline(), any());
        order.verify(lease).close();
    }

    @Test
    void releasesBeforeReplayingStableMaintenanceFailureWithoutMappingItToCopy() {
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = mock(MigrationMaintenanceLease.class);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(MigrationMaintenanceException.sourceUnavailable())
                .when(lease).withSourceConnection(any());
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE));

        InOrder order = inOrder(lease, executor);
        order.verify(lease).withSourceConnection(any());
        order.verify(lease).close();
        verifyNoInteractions(executor);
    }

    @Test
    void expiredAcquisitionReleasesLeaseWithoutEnteringSourceScopeOrCopy() {
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = mock(MigrationMaintenanceLease.class);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        AtomicLong ticker = new AtomicLong(10);
        when(maintenance.acquire(any(), any())).thenAnswer(invocation -> {
            ticker.addAndGet(101);
            return lease;
        });
        MetadataCopyExecutionCoordinator coordinator =
                new MetadataCopyExecutionCoordinator(maintenance, executor, ticker::get);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT));

        verify(lease, never()).withSourceConnection(any());
        verifyNoInteractions(executor);
        verify(lease).close();
    }

    @Test
    void pendingReleaseRetainsStableOutcomeAndRetriesOnlyTheExactLease() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        Connection foreignTarget = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(new MetadataMigrationException(MetadataMigrationErrorCode.COPY))
                .when(executor).execute(any(), any(), any(), anyDeadline(), any());
        doThrow(new IllegalStateException("private release"))
                .doNothing().when(lease).close();
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataCopyReleaseRequiredException.class, failure -> {
                    assertThat(failure.stableCopyFailure()).contains(MetadataMigrationErrorCode.COPY);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getMessage()).doesNotContain("private");
                });
        assertConflict(() -> coordinator.execute("operation-b", foreignTarget,
                MetadataDatabaseKind.POSTGRESQL, Duration.ofSeconds(1), MetadataMigrationProgressSink.NO_OP));
        assertConflict(() -> coordinator.retryRelease("operation-b"));

        assertThatThrownBy(() -> coordinator.retryRelease("operation-a"))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.COPY));
        verify(maintenance).acquire(any(), any());
        verify(executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(lease, times(2)).close();
        verifyNoInteractions(foreignTarget);
    }

    @Test
    void pendingReleaseCarriesOnlyTheStableMaintenanceCodeAndRetriesWithoutCopy() {
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = mock(MigrationMaintenanceLease.class);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(MigrationMaintenanceException.sourceUnavailable())
                .when(lease).withSourceConnection(any());
        doThrow(new IllegalStateException("private release"))
                .doNothing().when(lease).close();
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataCopyReleaseRequiredException.class, failure -> {
                    assertThat(failure.stableCopyFailure()).isEmpty();
                    assertThat(failure.stableMaintenanceFailure())
                            .contains(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getMessage()).doesNotContain("private");
                });
        assertThatThrownBy(() -> coordinator.retryRelease("operation-a"))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE));
        verifyNoInteractions(executor);
        verify(lease, times(2)).close();
    }

    @Test
    void fatalCopyRemainsPrimaryWhenRuntimeReleaseNeedsRetry() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        AssertionError fatal = new AssertionError("fatal copy");
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(fatal).when(executor).execute(any(), any(), any(), anyDeadline(), any());
        doThrow(new IllegalStateException("private release"))
                .doNothing().when(lease).close();
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isSameAs(fatal);
        assertThat(fatal.getSuppressed()).singleElement()
                .isInstanceOf(MetadataCopyReleaseRequiredException.class);
        assertThatThrownBy(() -> coordinator.retryRelease("operation-a")).isSameAs(fatal);
        verify(executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(lease, times(2)).close();
    }

    @Test
    void fatalCopyRemainsPrimaryWhenReleaseAlsoThrowsError() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        AssertionError copyFatal = new AssertionError("fatal copy");
        AssertionError releaseFatal = new AssertionError("fatal release");
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(copyFatal).when(executor).execute(any(), any(), any(), anyDeadline(), any());
        doThrow(releaseFatal).doNothing().when(lease).close();
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isSameAs(copyFatal);
        assertThat(copyFatal.getSuppressed()).singleElement()
                .isInstanceOf(MetadataCopyReleaseRequiredException.class);
        assertThat(copyFatal.getSuppressed()).doesNotContain(releaseFatal);
        assertThatThrownBy(() -> coordinator.retryRelease("operation-a")).isSameAs(copyFatal);
        verify(executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(lease, times(2)).close();
    }

    @Test
    void releaseErrorRemainsPrimaryAndExactLeaseCanStillConverge() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        AssertionError releaseFatal = new AssertionError("fatal release");
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doThrow(releaseFatal).doNothing().when(lease).close();
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        assertThatThrownBy(() -> coordinator.execute("operation-a", target,
                        MetadataDatabaseKind.MYSQL, Duration.ofSeconds(1),
                        MetadataMigrationProgressSink.NO_OP))
                .isSameAs(releaseFatal);
        assertThat(releaseFatal.getSuppressed()).singleElement()
                .isInstanceOf(MetadataCopyReleaseRequiredException.class);
        coordinator.retryRelease("operation-a");
        verify(executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(lease, times(2)).close();
    }

    @Test
    void interruptBitIsClearedOnlyDuringMandatoryReleaseAndThenRestored() {
        Connection source = mock(Connection.class);
        Connection target = mock(Connection.class);
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = sourceLease(source);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        when(maintenance.acquire(any(), any())).thenReturn(lease);
        doAnswer(invocation -> {
            Thread.currentThread().interrupt();
            return null;
        }).when(executor).execute(any(), any(), any(), anyDeadline(), any());
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(lease).close();
        MetadataCopyExecutionCoordinator coordinator = coordinator(maintenance, executor);

        try {
            coordinator.execute("operation-a", target, MetadataDatabaseKind.MYSQL,
                    Duration.ofSeconds(1), MetadataMigrationProgressSink.NO_OP);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    private static MetadataCopyExecutionCoordinator coordinator(
            MigrationMaintenanceOrchestrator maintenance, JdbcMetadataMigrationExecutor executor) {
        return new MetadataCopyExecutionCoordinator(maintenance, executor, System::nanoTime);
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static MigrationMaintenanceLease sourceLease(Connection source) {
        MigrationMaintenanceLease lease = mock(MigrationMaintenanceLease.class);
        doAnswer(invocation -> {
            MigrationSourceAction action = invocation.getArgument(0);
            action.execute(source);
            return null;
        }).when(lease).withSourceConnection(any());
        return lease;
    }

    private static void assertConflict(ThrowingAction action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run();
    }
}
