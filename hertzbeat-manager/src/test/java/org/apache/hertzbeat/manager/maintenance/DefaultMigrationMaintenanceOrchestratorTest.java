/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionCoordinator;
import org.apache.hertzbeat.common.transaction.MetadataWriteMaintenanceLease;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.InOrder;
import org.mockito.Mockito;

@Timeout(15)
class DefaultMigrationMaintenanceOrchestratorTest {

    @Test
    void acquiresForwardWithOneDeadlineAndReleasesInReverse() {
        Harness harness = harness();
        AtomicLong ticker = new AtomicLong(10);
        DefaultMigrationMaintenanceOrchestrator orchestrator = new DefaultMigrationMaintenanceOrchestrator(
                harness.deploymentAuthority, harness.sourceGuard,
                harness.producerCoordinator, harness.writeCoordinator, ticker::get);
        when(harness.deploymentAuthority.acquire(eq("operation-a"), any())).thenAnswer(invocation -> {
            assertThat((Duration) invocation.getArgument(1)).isEqualTo(Duration.ofNanos(100));
            ticker.addAndGet(10);
            return harness.authorityLease;
        });
        when(harness.sourceGuard.fence(eq("operation-a"), any())).thenAnswer(invocation -> {
            assertThat((Duration) invocation.getArgument(1)).isEqualTo(Duration.ofNanos(90));
            ticker.addAndGet(20);
            return harness.sourceLease;
        });
        when(harness.producerCoordinator.quiesce(eq("operation-a"), any())).thenAnswer(invocation -> {
            assertThat((Duration) invocation.getArgument(1)).isEqualTo(Duration.ofNanos(70));
            ticker.addAndGet(30);
            return harness.producerLease;
        });
        when(harness.writeCoordinator.acquire(eq("operation-a"), any())).thenAnswer(invocation -> {
            assertThat((Duration) invocation.getArgument(1)).isEqualTo(Duration.ofNanos(40));
            return harness.writeLease;
        });

        MigrationMaintenanceLease lease = orchestrator.acquire("operation-a", Duration.ofNanos(100));
        lease.close();

        InOrder order = inOrder(harness.deploymentAuthority, harness.sourceGuard, harness.producerCoordinator,
                harness.writeCoordinator, harness.writeLease, harness.producerLease,
                harness.sourceLease, harness.authorityLease);
        order.verify(harness.deploymentAuthority).acquire(eq("operation-a"), any());
        order.verify(harness.sourceGuard).fence(eq("operation-a"), any());
        order.verify(harness.producerCoordinator).quiesce(eq("operation-a"), any());
        order.verify(harness.writeCoordinator).acquire(eq("operation-a"), any());
        order.verify(harness.writeLease).close();
        order.verify(harness.producerLease).resume();
        order.verify(harness.sourceLease).close();
        order.verify(harness.authorityLease).close();
    }

    @Test
    void compositeScopesTheExactSourceAndCannotCloseAcrossTheCallback() throws Exception {
        Harness harness = harness();
        Connection source = Mockito.mock(Connection.class);
        CountDownLatch callbackEntered = new CountDownLatch(1);
        CountDownLatch releaseCallback = new CountDownLatch(1);
        CountDownLatch closeReturned = new CountDownLatch(1);
        Mockito.doAnswer(invocation -> {
            MigrationSourceAction action = invocation.getArgument(0);
            action.execute(source);
            return null;
        }).when(harness.sourceLease).withConnection(any());
        when(harness.sourceGuard.fence(any(), any())).thenReturn(harness.sourceLease);
        when(harness.producerCoordinator.quiesce(any(), any())).thenReturn(harness.producerLease);
        when(harness.writeCoordinator.acquire(any(), any())).thenReturn(harness.writeLease);
        MigrationMaintenanceLease lease = harness.orchestrator()
                .acquire("operation-a", Duration.ofSeconds(1));
        AtomicReference<Connection> observed = new AtomicReference<>();
        Thread callback = Thread.ofPlatform().start(() -> lease.withSourceConnection(connection -> {
            observed.set(connection);
            callbackEntered.countDown();
            awaitIgnoringInterrupt(releaseCallback);
        }));
        Thread closer = null;

        try {
            assertThat(callbackEntered.await(5, TimeUnit.SECONDS)).isTrue();
            closer = Thread.ofPlatform().start(() -> {
                lease.close();
                closeReturned.countDown();
            });
            assertThat(closeReturned.await(1, TimeUnit.SECONDS)).isFalse();
            verify(harness.writeLease, never()).close();
        } finally {
            releaseCallback.countDown();
        }
        callback.join(5_000);
        if (closer != null) {
            closer.join(5_000);
        }
        assertThat(observed.get()).isSameAs(source);
        assertThat(closeReturned.getCount()).isZero();
        verify(harness.sourceLease).withConnection(any());
        verify(harness.writeLease).close();
    }

    @Test
    void compositeCloseFromItsOwnSourceCallbackFailsFast() {
        Harness harness = harness();
        Connection source = Mockito.mock(Connection.class);
        Mockito.doAnswer(invocation -> {
            MigrationSourceAction action = invocation.getArgument(0);
            action.execute(source);
            return null;
        }).when(harness.sourceLease).withConnection(any());
        when(harness.sourceGuard.fence(any(), any())).thenReturn(harness.sourceLease);
        when(harness.producerCoordinator.quiesce(any(), any())).thenReturn(harness.producerLease);
        when(harness.writeCoordinator.acquire(any(), any())).thenReturn(harness.writeLease);
        MigrationMaintenanceLease lease = harness.orchestrator()
                .acquire("operation-a", Duration.ofSeconds(1));

        try {
            lease.withSourceConnection(ignored -> assertThatThrownBy(lease::close)
                    .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                            assertThat(failure.code())
                                    .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT)));
            verify(harness.writeLease, never()).close();
        } finally {
            lease.close();
        }
        verify(harness.writeLease).close();
    }

    @Test
    void deploymentAuthorityUnknownOrMultiFailsBeforeSourceOrLocalPause() {
        Harness unknown = harness();
        when(unknown.deploymentAuthority.acquire(eq("operation-a"), any()))
                .thenThrow(MigrationMaintenanceException.deploymentAuthorityUnavailable());
        DefaultMigrationMaintenanceOrchestrator unknownOrchestrator = unknown.orchestrator();
        assertThatThrownBy(() -> unknownOrchestrator.acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_DEPLOYMENT_AUTHORITY_UNAVAILABLE));
        verify(unknown.sourceGuard, never()).fence(any(), any());
        verify(unknown.producerCoordinator, never()).quiesce(any(), any());
        verify(unknown.writeCoordinator, never()).acquire(any(), any());

        Harness multi = harness();
        when(multi.deploymentAuthority.acquire(eq("operation-a"), any()))
                .thenThrow(MigrationMaintenanceException.multiNodeUnsupported());
        assertThatThrownBy(() -> multi.orchestrator().acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED));
        verify(multi.producerCoordinator, never()).quiesce(any(), any());
    }

    @Test
    void secondAndThirdStepFailuresCleanUpInReverseWithoutReplacingPrimary() {
        Harness second = harness();
        when(second.sourceGuard.fence(eq("operation-a"), any())).thenReturn(second.sourceLease);
        when(second.producerCoordinator.quiesce(eq("operation-a"), any()))
                .thenThrow(MetadataMaintenanceException.quiesceTimeout());
        Mockito.doThrow(new IllegalStateException("private-cleanup")).when(second.sourceLease).close();
        assertThatThrownBy(() -> second.orchestrator().acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception -> {
                    assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_TIMEOUT);
                    assertThat(exception.getSuppressed()).hasSize(1);
                    assertThat(exception.getMessage()).doesNotContain("private");
                });

        Harness third = harness();
        when(third.sourceGuard.fence(eq("operation-a"), any())).thenReturn(third.sourceLease);
        when(third.producerCoordinator.quiesce(eq("operation-a"), any())).thenReturn(third.producerLease);
        when(third.writeCoordinator.acquire(eq("operation-a"), any()))
                .thenThrow(new IllegalStateException("private-write"));
        assertThatThrownBy(() -> third.orchestrator().acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_FAILURE));
        InOrder cleanup = inOrder(third.producerLease, third.sourceLease, third.authorityLease);
        cleanup.verify(third.producerLease).resume();
        cleanup.verify(third.sourceLease).close();
        cleanup.verify(third.authorityLease).close();
    }

    @Test
    void failedAcquisitionRecoveryRetainsFenceAndOwnershipUntilSameOperationRetries() {
        Harness harness = harness();
        when(harness.sourceGuard.fence(eq("operation-a"), any()))
                .thenReturn(harness.sourceLease)
                .thenThrow(MigrationMaintenanceException.sourceUnavailable());
        when(harness.producerCoordinator.quiesce(eq("operation-a"), any())).thenReturn(harness.producerLease);
        when(harness.writeCoordinator.acquire(eq("operation-a"), any()))
                .thenThrow(new IllegalStateException("private-write"));
        Mockito.doThrow(new IllegalStateException("private-resume"))
                .doNothing().when(harness.producerLease).resume();
        DefaultMigrationMaintenanceOrchestrator orchestrator = harness.orchestrator();

        assertThatThrownBy(() -> orchestrator.acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception -> {
                    assertThat(exception.code())
                            .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_FAILURE);
                    assertThat(exception.getSuppressed()).hasSize(1);
                });
        verify(harness.sourceLease, never()).close();
        verify(harness.authorityLease, never()).close();
        assertThatThrownBy(() -> orchestrator.acquire("operation-b", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));

        assertThatThrownBy(() -> orchestrator.acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE));
        verify(harness.producerLease, Mockito.times(2)).resume();
        verify(harness.sourceLease).close();
        verify(harness.authorityLease, Mockito.times(2)).close();
    }

    @Test
    void producerRecoveryWithoutLeaseRetainsFenceUntilSameOperationRecoversCoordinator() {
        Harness harness = harness();
        when(harness.sourceGuard.fence(eq("operation-a"), any()))
                .thenReturn(harness.sourceLease)
                .thenThrow(MigrationMaintenanceException.sourceUnavailable());
        when(harness.producerCoordinator.quiesce(eq("operation-a"), any()))
                .thenThrow(MetadataMaintenanceException.participantFailure());
        AtomicReference<MetadataMaintenanceSnapshot> producerState = new AtomicReference<>(
                new MetadataMaintenanceSnapshot(MetadataMaintenancePhase.RECOVERY_REQUIRED, "operation-a", 1));
        when(harness.producerCoordinator.snapshot()).thenAnswer(invocation -> producerState.get());
        Mockito.doAnswer(invocation -> {
            producerState.set(new MetadataMaintenanceSnapshot(MetadataMaintenancePhase.RUNNING, null, 1));
            return null;
        }).when(harness.producerCoordinator).recover("operation-a");
        DefaultMigrationMaintenanceOrchestrator orchestrator = harness.orchestrator();

        assertThatThrownBy(() -> orchestrator.acquire("operation-a", Duration.ofSeconds(1)))
                .isInstanceOf(MigrationMaintenanceException.class);
        verify(harness.sourceLease, never()).close();
        assertThatThrownBy(() -> orchestrator.acquire("operation-b", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));

        assertThatThrownBy(() -> orchestrator.acquire("operation-a", Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE));
        verify(harness.producerCoordinator).recover("operation-a");
        verify(harness.sourceLease).close();
        verify(harness.authorityLease, Mockito.times(2)).close();
    }

    @Test
    void resumeFailureRetainsTopologyAndSameOwnerCanRetry() {
        Harness harness = harness();
        when(harness.sourceGuard.fence(eq("operation-a"), any())).thenReturn(harness.sourceLease);
        when(harness.producerCoordinator.quiesce(eq("operation-a"), any())).thenReturn(harness.producerLease);
        when(harness.writeCoordinator.acquire(eq("operation-a"), any())).thenReturn(harness.writeLease);
        Mockito.doThrow(new IllegalStateException()).doNothing().when(harness.producerLease).resume();
        MigrationMaintenanceLease lease = harness.orchestrator().acquire("operation-a", Duration.ZERO);

        assertThatThrownBy(lease::close)
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_RESUME_FAILURE));
        verify(harness.sourceLease, never()).close();
        verify(harness.authorityLease, never()).close();
        lease.close();
        verify(harness.writeLease).close();
        verify(harness.producerLease, Mockito.times(2)).resume();
        verify(harness.sourceLease).close();
        verify(harness.authorityLease).close();
    }

    @Test
    void concurrentAcquisitionHasOnlyOneOwnerCapability() throws Exception {
        Harness harness = harness();
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(harness.sourceGuard.fence(eq("operation-a"), any())).thenAnswer(invocation -> {
            entered.countDown();
            release.await();
            return harness.sourceLease;
        });
        when(harness.producerCoordinator.quiesce(eq("operation-a"), any())).thenReturn(harness.producerLease);
        when(harness.writeCoordinator.acquire(eq("operation-a"), any())).thenReturn(harness.writeLease);
        DefaultMigrationMaintenanceOrchestrator orchestrator = harness.orchestrator();
        AtomicReference<MigrationMaintenanceLease> owner = new AtomicReference<>();
        Thread thread = Thread.ofPlatform().start(() ->
                owner.set(orchestrator.acquire("operation-a", Duration.ofSeconds(30))));
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();

        assertThatThrownBy(() -> orchestrator.acquire("operation-b", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
        assertThatThrownBy(() -> orchestrator.acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
        release.countDown();
        thread.join(1_000);
        owner.get().close();
    }

    @Test
    void sharedAuthorityNotSeparateEmbeddedSourcesDeterminesSingletonOwnership() {
        Harness first = harness();
        Harness second = harness();
        FakeSingletonAuthority authority = new FakeSingletonAuthority();
        when(first.sourceGuard.fence(eq("operation-a"), any())).thenReturn(first.sourceLease);
        when(first.producerCoordinator.quiesce(eq("operation-a"), any())).thenReturn(first.producerLease);
        when(first.writeCoordinator.acquire(eq("operation-a"), any())).thenReturn(first.writeLease);
        when(second.sourceGuard.fence(eq("operation-b"), any())).thenReturn(second.sourceLease);
        when(second.producerCoordinator.quiesce(eq("operation-b"), any())).thenReturn(second.producerLease);
        when(second.writeCoordinator.acquire(eq("operation-b"), any())).thenReturn(second.writeLease);
        DefaultMigrationMaintenanceOrchestrator firstOrchestrator = new DefaultMigrationMaintenanceOrchestrator(
                authority, first.sourceGuard, first.producerCoordinator, first.writeCoordinator);
        DefaultMigrationMaintenanceOrchestrator secondOrchestrator = new DefaultMigrationMaintenanceOrchestrator(
                authority, second.sourceGuard, second.producerCoordinator, second.writeCoordinator);

        MigrationMaintenanceLease firstLease = firstOrchestrator.acquire("operation-a", Duration.ZERO);
        assertThatThrownBy(() -> secondOrchestrator.acquire("operation-b", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
        verify(second.sourceGuard, never()).fence(any(), any());
        firstLease.close();
        secondOrchestrator.acquire("operation-b", Duration.ZERO).close();
    }

    @Test
    void validatesNegativeAndOverflowButAllowsZeroAndNewInstanceStartsIdle() {
        Harness first = harness();
        when(first.sourceGuard.fence(eq("operation-a"), any())).thenReturn(first.sourceLease);
        when(first.producerCoordinator.quiesce(eq("operation-a"), any())).thenReturn(first.producerLease);
        when(first.writeCoordinator.acquire(eq("operation-a"), any())).thenReturn(first.writeLease);
        MigrationMaintenanceLease lease = first.orchestrator().acquire("operation-a", Duration.ZERO);
        assertThatThrownBy(() -> first.orchestrator().acquire("operation-b", Duration.ofSeconds(-1)))
                .isInstanceOf(MigrationMaintenanceException.class);
        assertThatThrownBy(() -> first.orchestrator().acquire("operation-b", Duration.ofSeconds(Long.MAX_VALUE)))
                .isInstanceOf(MigrationMaintenanceException.class);
        lease.close();

        Harness restarted = harness();
        when(restarted.sourceGuard.fence(eq("operation-b"), any())).thenReturn(restarted.sourceLease);
        when(restarted.producerCoordinator.quiesce(eq("operation-b"), any())).thenReturn(restarted.producerLease);
        when(restarted.writeCoordinator.acquire(eq("operation-b"), any())).thenReturn(restarted.writeLease);
        restarted.orchestrator().acquire("operation-b", Duration.ZERO).close();
    }

    @Test
    void interruptClassificationKeepsInterruptBit() {
        Harness harness = harness();
        when(harness.deploymentAuthority.acquire(eq("operation-a"), any())).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            throw MigrationMaintenanceException.interrupted();
        });

        assertThatThrownBy(() -> harness.orchestrator().acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_INTERRUPTED));
        assertThat(Thread.interrupted()).isTrue();
    }

    private static Harness harness() {
        Harness harness = new Harness(
                Mockito.mock(DeploymentSingletonAuthority.class),
                Mockito.mock(DeploymentSingletonLease.class),
                Mockito.mock(MigrationSourceGuard.class),
                Mockito.mock(MigrationSourceLease.class),
                Mockito.mock(MetadataMaintenanceCoordinator.class),
                Mockito.mock(MetadataMaintenanceLease.class),
                Mockito.mock(MetadataWriteAdmissionCoordinator.class),
                Mockito.mock(MetadataWriteMaintenanceLease.class));
        when(harness.deploymentAuthority.acquire(any(), any())).thenReturn(harness.authorityLease);
        when(harness.producerCoordinator.snapshot()).thenReturn(
                new MetadataMaintenanceSnapshot(MetadataMaintenancePhase.RUNNING, null, 0));
        return harness;
    }

    private static void awaitIgnoringInterrupt(CountDownLatch latch) {
        boolean interrupted = false;
        while (latch.getCount() > 0) {
            try {
                latch.await();
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private record Harness(
            DeploymentSingletonAuthority deploymentAuthority,
            DeploymentSingletonLease authorityLease,
            MigrationSourceGuard sourceGuard,
            MigrationSourceLease sourceLease,
            MetadataMaintenanceCoordinator producerCoordinator,
            MetadataMaintenanceLease producerLease,
            MetadataWriteAdmissionCoordinator writeCoordinator,
            MetadataWriteMaintenanceLease writeLease) {

        DefaultMigrationMaintenanceOrchestrator orchestrator() {
            return new DefaultMigrationMaintenanceOrchestrator(
                    deploymentAuthority, sourceGuard, producerCoordinator, writeCoordinator);
        }
    }

    private static final class FakeSingletonAuthority implements DeploymentSingletonAuthority {

        private boolean owned;

        @Override
        public synchronized DeploymentSingletonLease acquire(String operationId, Duration timeout) {
            if (owned) {
                throw MigrationMaintenanceException.operationConflict();
            }
            owned = true;
            return this::release;
        }

        private synchronized void release() {
            owned = false;
        }
    }
}
