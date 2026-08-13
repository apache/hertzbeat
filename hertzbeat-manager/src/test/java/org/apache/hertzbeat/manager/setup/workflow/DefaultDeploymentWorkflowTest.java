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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.ActivateMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationValidationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationCapability;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.InOrder;

class DefaultDeploymentWorkflowTest {

    private static final String OPERATION = "operation-a";
    private static final Instant NOW = Instant.parse("2026-08-10T02:00:00Z");
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    @Test
    void durableSameOperationReplayHappensBeforeInspectionAndDoesNotCopySecret() {
        Fixture fixture = fixture();
        MigrationView running = MigrationTestSnapshots.running(OPERATION);
        when(fixture.commands.migration(OPERATION)).thenReturn(running);

        assertThat(fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)))
                .isSameAs(running);

        verify(fixture.inspector, never()).inspect(any(), any(), any());
        verify(fixture.commands, never()).migrate(any());
    }

    @Test
    @Timeout(10)
    void concurrentSameOperationInspectsAndSubmitsOnlyOnceThenReplays() throws Exception {
        Fixture fixture = fixture();
        MigrationView running = MigrationTestSnapshots.running(OPERATION);
        when(fixture.commands.migration(OPERATION))
                .thenThrow(new MigrationOperationStoreException(SetupErrorCode.OPERATION_NOT_FOUND))
                .thenThrow(new MigrationOperationStoreException(SetupErrorCode.OPERATION_NOT_FOUND))
                .thenReturn(running);
        when(fixture.commands.activeOperationId()).thenReturn(Optional.empty());
        when(fixture.inspector.inspect(any(), any(), any())).thenReturn(TargetInspection.EMPTY);
        when(fixture.commands.migrate(any())).thenReturn(running);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(fixture.inspector.inspect(any(), any(), any())).thenAnswer(invocation -> {
            entered.countDown();
            assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
            return TargetInspection.EMPTY;
        });

        try (var callers = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<MigrationView> first = callers.submit(
                    () -> fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            Future<MigrationView> second = callers.submit(
                    () -> fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)));
            release.countDown();

            assertThat(first.get(5, TimeUnit.SECONDS)).isSameAs(running);
            assertThat(second.get(5, TimeUnit.SECONDS)).isSameAs(running);
        } finally {
            release.countDown();
        }
        verify(fixture.inspector).inspect(any(), any(), any());
        verify(fixture.commands).migrate(any());
        verify(fixture.commands, times(3)).migration(OPERATION);
    }

    @Test
    void foreignOperationStopsTargetInspection() {
        Fixture fixture = fixture();
        when(fixture.commands.migration(OPERATION))
                .thenThrow(new MigrationOperationStoreException(SetupErrorCode.OPERATION_NOT_FOUND));
        when(fixture.commands.activeOperationId()).thenReturn(Optional.of("operation-b"));

        assertThatThrownBy(() -> fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)))
                .isInstanceOf(SetupApiException.class)
                .extracting("errorCode").isEqualTo(SetupErrorCode.OPERATION_CONFLICT);
        verify(fixture.inspector, never()).inspect(any(), any(), any());
        verify(fixture.commands, never()).migrate(any());
    }

    @Test
    void externalApplyAndExportFailBeforeSecretStoreOrRendererWork() {
        Fixture fixture = fixture();

        assertThatThrownBy(() -> fixture.workflow.migrate(request(OPERATION, ApplyMode.EXTERNAL_APPLY)))
                .isInstanceOf(SetupApiException.class)
                .hasNoCause();
        assertThatThrownBy(() -> fixture.workflow.prepareExport(OPERATION, mock(
                org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationExportRequest.class)))
                .isInstanceOf(SetupApiException.class)
                .hasNoCause();

        verify(fixture.commands, never()).migration(any());
        verify(fixture.inspector, never()).inspect(any(), any(), any());
    }

    @Test
    void validationOwnsOnlyItsSecretCopyAndMapsInspectionWithoutThrowing() {
        Fixture fixture = fixture();
        AtomicReference<SecretValue> borrowed = new AtomicReference<>();
        when(fixture.inspector.inspect(any(), any(), any())).thenAnswer(invocation -> {
            borrowed.set(invocation.getArgument(1));
            return TargetInspection.NON_EMPTY;
        });
        MetadataMigrationValidationRequest request = validationRequestFixture();

        var result = fixture.workflow.validate(request);

        assertThat(result.valid()).isFalse();
        assertThat(result.errorCode()).isEqualTo(SetupErrorCode.MIGRATION_TARGET_NOT_EMPTY);
        assertThat(borrowed.get().copy()).containsOnly('\0');
    }

    @Test
    void errorIdentityAndInterruptArePreservedByTheWorkflowBoundary() {
        Fixture fixture = fixture();
        AssertionError fatal = new AssertionError("fatal");
        when(fixture.commands.migration(OPERATION)).thenThrow(fatal);
        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(() -> fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)))
                    .isSameAs(fatal);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void eachInspectionSettlesExactPendingCleanupWithTheSameAbsoluteDeadline() {
        Fixture fixture = fixture();
        when(fixture.inspector.inspect(any(), any(), any()))
                .thenReturn(TargetInspection.EMPTY);

        assertThat(fixture.workflow.validate(validationRequestFixture()).valid()).isTrue();

        InOrder order = inOrder(fixture.inspector);
        order.verify(fixture.inspector).retryCleanup(any());
        order.verify(fixture.inspector).inspect(any(), any(), any());
        var cleanupDeadline = org.mockito.ArgumentCaptor.forClass(
                JdbcMetadataMigrationDeadline.class);
        var inspectDeadline = org.mockito.ArgumentCaptor.forClass(
                JdbcMetadataMigrationDeadline.class);
        verify(fixture.inspector).retryCleanup(cleanupDeadline.capture());
        verify(fixture.inspector).inspect(any(), any(), inspectDeadline.capture());
        assertThat(inspectDeadline.getValue()).isSameAs(cleanupDeadline.getValue());
    }

    @Test
    void failedCleanupBlocksTheNextAcquireAndPreservesErrorAndInterrupt() {
        Fixture fixture = fixture();
        AssertionError fatal = new AssertionError("fatal-cleanup");
        org.mockito.Mockito.doThrow(new TargetJdbcConnectionException(
                        TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doThrow(fatal)
                .doNothing()
                .when(fixture.inspector).retryCleanup(any());
        when(fixture.inspector.inspect(any(), any(), any())).thenReturn(TargetInspection.EMPTY);

        assertThatThrownBy(() -> fixture.workflow.validate(validationRequestFixture()))
                .isInstanceOfSatisfying(SetupApiException.class,
                        failure -> assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE));
        verify(fixture.inspector, never()).inspect(any(), any(), any());
        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(() -> fixture.workflow.validate(validationRequestFixture()))
                    .isSameAs(fatal);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
        assertThat(fixture.workflow.validate(validationRequestFixture()).valid()).isTrue();
        verify(fixture.inspector).inspect(any(), any(), any());
    }

    @Test
    void activationRechecksDynamicOwnerAdmissionWithoutReleasingTheRetainedOperation() {
        Fixture fixture = fixture();
        DeploymentView invalidOwner = new DeploymentView(
                NOW, deploymentFixture().managementDatabase(), deploymentFixture().greptimeDatabase(),
                ApplyMode.MANAGED_WRITE, MaintenanceMode.INACTIVE,
                DeploymentTopology.UNKNOWN,
                MigrationCapability.blocked(
                        SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE,
                        MaintenanceAdmission.NOT_APPLICABLE));
        MigrationView awaiting = MigrationTestSnapshots.awaitingRestart(OPERATION);
        when(fixture.projector.project()).thenReturn(invalidOwner).thenReturn(deploymentFixture());
        when(fixture.commands.activate(any(), any())).thenReturn(awaiting);

        assertThatThrownBy(() -> fixture.workflow.activate(OPERATION,
                new org.apache.hertzbeat.manager.setup.api.DeploymentApiContract
                        .ActivateMigrationRequest(
                        org.apache.hertzbeat.manager.setup.api.DeploymentApiContract
                                .MigrationOperationState.READY_TO_ACTIVATE)))
                .isInstanceOfSatisfying(SetupApiException.class,
                        failure -> assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE));
        verify(fixture.commands, never()).activate(any(), any());
        assertThat(fixture.workflow.activate(OPERATION,
                new org.apache.hertzbeat.manager.setup.api.DeploymentApiContract
                        .ActivateMigrationRequest(
                        org.apache.hertzbeat.manager.setup.api.DeploymentApiContract
                                .MigrationOperationState.READY_TO_ACTIVATE))).isSameAs(awaiting);
        verify(fixture.commands).activate(any(), any());
    }

    @Test
    void blockedPendingStillExecutingReplaysWithoutAnotherTargetInspection() {
        Fixture fixture = fixture();
        MigrationView blocked = MigrationTestSnapshots.blockedPending(OPERATION);
        when(fixture.commands.migration(OPERATION)).thenReturn(blocked);
        when(fixture.commands.joinExecuting(any())).thenReturn(Optional.of(blocked));

        assertThat(fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)))
                .isSameAs(blocked);

        verify(fixture.inspector, never()).inspect(any(), any(), any());
        verify(fixture.commands).joinExecuting(any());
    }

    @Test
    void pendingThatFinishesBeforeJoinIsRereadWithoutTargetInspection() {
        Fixture fixture = fixture();
        MigrationView pending = MigrationTestSnapshots.blockedPending(OPERATION);
        MigrationView ready = mock(MigrationView.class);
        when(ready.state()).thenReturn(MigrationOperationState.READY_TO_ACTIVATE);
        when(ready.target()).thenReturn(MigrationTarget.POSTGRESQL);
        when(fixture.commands.migration(OPERATION)).thenReturn(pending, ready);
        when(fixture.commands.joinExecuting(any())).thenReturn(Optional.empty());
        when(fixture.inspector.inspect(any(), any(), any()))
                .thenThrow(new AssertionError("target inspection must not restart"));

        assertThat(fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)))
                .isSameAs(ready);

        verify(fixture.commands, times(2)).migration(OPERATION);
        verify(fixture.inspector, never()).inspect(any(), any(), any());
        verify(fixture.commands, never()).migrate(any());
    }

    @Test
    @Timeout(10)
    void closeSealsAdmissionWhileSerializedMigrateIsStillBlocked() throws Exception {
        Fixture fixture = fixture();
        MigrationView running = MigrationTestSnapshots.running(OPERATION);
        CountDownLatch inspectionEntered = new CountDownLatch(1);
        CountDownLatch releaseInspection = new CountDownLatch(1);
        AtomicInteger inspections = new AtomicInteger();
        AtomicReference<Throwable> closeFailure = new AtomicReference<>();
        when(fixture.commands.migration(OPERATION))
                .thenThrow(new MigrationOperationStoreException(SetupErrorCode.OPERATION_NOT_FOUND));
        when(fixture.commands.activeOperationId()).thenReturn(Optional.empty());
        when(fixture.inspector.inspect(any(), any(), any())).thenAnswer(invocation -> {
            inspections.incrementAndGet();
            inspectionEntered.countDown();
            assertThat(releaseInspection.await(5, TimeUnit.SECONDS)).isTrue();
            return TargetInspection.EMPTY;
        });
        when(fixture.commands.migrate(any())).thenReturn(running);
        Thread closer = Thread.ofPlatform().unstarted(() -> {
            try {
                fixture.workflow.closeAdmission();
            } catch (Throwable failure) {
                closeFailure.set(failure);
            }
        });

        try (var callers = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<MigrationView> first = callers.submit(
                    () -> fixture.workflow.migrate(request(OPERATION, ApplyMode.MANAGED_WRITE)));
            assertThat(inspectionEntered.await(5, TimeUnit.SECONDS)).isTrue();
            closer.start();
            awaitCondition(() -> closer.getState() == Thread.State.BLOCKED
                    || closer.getState() == Thread.State.WAITING
                    || closer.getState() == Thread.State.TIMED_WAITING);

            Future<Throwable> validation = callers.submit(() -> captureFailure(
                    () -> fixture.workflow.validate(validationRequestFixture())));
            Future<Throwable> activation = callers.submit(() -> captureFailure(
                    () -> fixture.workflow.activate(OPERATION, new ActivateMigrationRequest(
                            org.apache.hertzbeat.manager.setup.api.DeploymentApiContract
                                    .MigrationOperationState.READY_TO_ACTIVATE))));

            assertUnavailable(validation.get(1, TimeUnit.SECONDS));
            assertUnavailable(activation.get(1, TimeUnit.SECONDS));
            assertThat(inspections.get()).isOne();
            assertThat(closer.isAlive()).isTrue();

            releaseInspection.countDown();
            assertThat(first.get(5, TimeUnit.SECONDS)).isSameAs(running);
            closer.join(TimeUnit.SECONDS.toMillis(5));
            assertThat(closer.isAlive()).isFalse();
            assertThat(closeFailure.get()).isNull();
            verify(fixture.inspector).inspect(any(), any(), any());
            verify(fixture.commands, never()).activate(any(), any());
        } finally {
            releaseInspection.countDown();
            if (closer.isAlive()) {
                closer.interrupt();
                closer.join(TimeUnit.SECONDS.toMillis(5));
            }
        }
    }

    private static Throwable captureFailure(Runnable action) {
        try {
            action.run();
            return null;
        } catch (Throwable failure) {
            return failure;
        }
    }

    private static void assertUnavailable(Throwable failure) {
        assertThat(failure).isInstanceOfSatisfying(SetupApiException.class,
                unavailable -> assertThat(unavailable.errorCode())
                        .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE));
    }

    private static void awaitCondition(BooleanSupplier condition) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (!condition.getAsBoolean() && System.nanoTime() - deadline < 0) {
            Thread.sleep(1);
        }
        assertThat(condition.getAsBoolean()).isTrue();
    }

    private Fixture fixture() {
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
        DeploymentViewProjector projector = mock(DeploymentViewProjector.class);
        when(projector.project()).thenReturn(deploymentFixture());
        DefaultDeploymentWorkflow workflow = new DefaultDeploymentWorkflow(
                projector, commands, inspector, new MetadataMigrationPolicy(),
                new DeploymentWorkflowFailureMapper(), Clock.fixed(NOW, ZoneOffset.UTC),
                TIMEOUT, System::nanoTime);
        return new Fixture(commands, inspector, projector, workflow);
    }

    private static MetadataMigrationRequest request(String operationId, ApplyMode mode) {
        return new MetadataMigrationRequest(
                operationId, MigrationTarget.POSTGRESQL, database(), mode);
    }

    private static MetadataDatabaseConfiguration database() {
        return new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example:5432/hertzbeat",
                "operator", "private-password");
    }

    static MetadataMigrationValidationRequest validationRequestFixture() {
        return new MetadataMigrationValidationRequest(MigrationTarget.POSTGRESQL, database());
    }

    static DeploymentView deploymentFixture() {
        return new DeploymentView(
                NOW,
                new ManagementDatabaseSummary(MetadataDatabaseKind.H2, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                ApplyMode.MANAGED_WRITE,
                MaintenanceMode.INACTIVE,
                DeploymentTopology.SINGLE_NODE,
                MigrationCapability.permitted(MaintenanceAdmission.AUTO_ENTER));
    }

    private record Fixture(
            ManagedDeploymentMigrationCommands commands,
            MetadataMigrationTargetInspector inspector,
            DeploymentViewProjector projector,
            DefaultDeploymentWorkflow workflow) {
    }
}
