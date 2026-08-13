/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.Connection;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.MetadataTargetStageResult;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.StageOutcome;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;

@Timeout(15)
class ManagedMigrationCommandFlowTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final MetadataDatabaseConfiguration DATABASE = new MetadataDatabaseConfiguration(
            MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat",
            "migration", "private-password");

    @TempDir
    private Path root;

    @Test
    void sameOperationJoinsTheRealRunnerAndCoordinatorDuringCopyAndHandoff() throws Exception {
        CountDownLatch copyEntered = new CountDownLatch(1);
        CountDownLatch releaseCopy = new CountDownLatch(1);
        CountDownLatch finalPublishEntered = new CountDownLatch(1);
        CountDownLatch releaseFinalPublish = new CountDownLatch(1);
        MigrationOperationFilePublisher delegate = new MigrationOperationFilePublisher(root);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root, (target, content) -> {
            if (new String(content, StandardCharsets.UTF_8).contains("state=READY_TO_ACTIVATE")) {
                finalPublishEntered.countDown();
                await(releaseFinalPublish);
            }
            delegate.publish(target, content);
        });
        ManagedMigrationConfigurationTransaction configuration = configuration();
        TargetJdbcConnectionFactory factory = mock(TargetJdbcConnectionFactory.class);
        TargetJdbcConnectionLease provisionLease = lease(IDENTITY);
        TargetJdbcConnectionLease copyLease = lease(IDENTITY);
        when(factory.acquire(any(), any(), any())).thenReturn(provisionLease, copyLease);
        FlywayTargetSchemaProvisioner provisioner = mock(FlywayTargetSchemaProvisioner.class);
        when(provisioner.provision(any(), eq(MetadataDatabaseKind.MYSQL), any()))
                .thenReturn(new TargetSchemaProvisioningOutcome(
                        TargetSchemaConnectionDisposition.REUSABLE));
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease maintenanceLease = sourceLease();
        when(maintenance.acquire(eq(OPERATION), any())).thenReturn(maintenanceLease);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        doAnswer(ignored -> {
            copyEntered.countDown();
            await(releaseCopy);
            return null;
        }).when(executor).execute(any(), any(), eq(MetadataDatabaseKind.MYSQL),
                any(JdbcMetadataMigrationDeadline.class), any());
        RetainedCutoverCoordinator coordinator = new RetainedCutoverCoordinator(
                factory, provisioner, maintenance, executor, System::nanoTime);

        try (DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                store, configuration, coordinator,
                Clock.fixed(Instant.parse("2026-08-10T04:00:00Z"), ZoneOffset.UTC),
                Duration.ofSeconds(5))) {
            ManagedDeploymentMigrationCommands commands = new ManagedDeploymentMigrationCommands(
                    runner, store, configuration, coordinator);
            MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
            when(inspector.inspect(any(), any(), any())).thenReturn(TargetInspection.EMPTY);
            DeploymentViewProjector projector = mock(DeploymentViewProjector.class);
            when(projector.project()).thenReturn(DefaultDeploymentWorkflowTest.deploymentFixture());
            DefaultDeploymentWorkflow workflow = new DefaultDeploymentWorkflow(
                    projector, commands, inspector, new MetadataMigrationPolicy(),
                    new DeploymentWorkflowFailureMapper(),
                    Clock.fixed(Instant.parse("2026-08-10T04:00:00Z"), ZoneOffset.UTC),
                    Duration.ofSeconds(5), System::nanoTime);
            MetadataMigrationRequest request = new MetadataMigrationRequest(
                    OPERATION, MigrationTarget.MYSQL, DATABASE, ApplyMode.MANAGED_WRITE);
            try {
                MigrationView first = workflow.migrate(request);
                assertThat(copyEntered.await(5, SECONDS)).isTrue();
                assertRunning(first);
                assertRunning(workflow.migrate(request));
                assertRunning(workflow.migration(OPERATION));
                assertThat(coordinator.status().phase())
                        .isEqualTo(RetainedCutoverStatus.Phase.EXECUTING);
                verify(inspector).inspect(any(), any(), any());
                verify(executor).execute(any(), any(), any(),
                        any(JdbcMetadataMigrationDeadline.class), any());

                releaseCopy.countDown();
                assertThat(finalPublishEntered.await(5, SECONDS)).isTrue();
                assertThat(coordinator.status().phase())
                        .isEqualTo(RetainedCutoverStatus.Phase.HANDOFFING);
                assertRunning(workflow.migrate(request));
                assertRunning(workflow.migration(OPERATION));
                verify(inspector).inspect(any(), any(), any());
                verify(executor).execute(any(), any(), any(),
                        any(JdbcMetadataMigrationDeadline.class), any());
            } finally {
                releaseCopy.countDown();
                releaseFinalPublish.countDown();
            }
            awaitRetained(coordinator);
            verify(executor, times(1)).execute(any(), any(), any(),
                    any(JdbcMetadataMigrationDeadline.class), any());
            coordinator.releaseRetained(OPERATION);
        } finally {
            releaseCopy.countDown();
            releaseFinalPublish.countDown();
        }
    }

    @Test
    void blockedPreparationReplaysWhileExactReleaseCleanupStillOwnsTheWorker() throws Exception {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(any(), any(), any(), any(), any()))
                .thenReturn(new MetadataTargetStageResult(
                        StageOutcome.RECOVERY_REQUIRED, Optional.empty()));
        CountDownLatch cleanupEntered = new CountDownLatch(1);
        CountDownLatch releaseCleanup = new CountDownLatch(1);
        TargetJdbcConnectionLease provisionLease = mock(TargetJdbcConnectionLease.class);
        when(provisionLease.targetIdentityHash()).thenReturn(IDENTITY);
        doAnswer(ignored -> {
            cleanupEntered.countDown();
            await(releaseCleanup);
            return null;
        }).when(provisionLease).close();
        TargetJdbcConnectionFactory factory = mock(TargetJdbcConnectionFactory.class);
        when(factory.acquire(any(), any(), any())).thenReturn(provisionLease);
        FlywayTargetSchemaProvisioner provisioner = mock(FlywayTargetSchemaProvisioner.class);
        JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        RetainedCutoverCoordinator coordinator = new RetainedCutoverCoordinator(
                factory, provisioner, mock(MigrationMaintenanceOrchestrator.class),
                executor, System::nanoTime);

        try (DeploymentMigrationCommandRunner runner = new DeploymentMigrationCommandRunner(
                store, configuration, coordinator,
                Clock.fixed(Instant.parse("2026-08-10T04:00:00Z"), ZoneOffset.UTC),
                Duration.ofSeconds(5))) {
            ManagedDeploymentMigrationCommands commands = new ManagedDeploymentMigrationCommands(
                    runner, store, configuration, coordinator);
            MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
            when(inspector.inspect(any(), any(), any())).thenReturn(TargetInspection.EMPTY);
            DeploymentViewProjector projector = mock(DeploymentViewProjector.class);
            when(projector.project()).thenReturn(DefaultDeploymentWorkflowTest.deploymentFixture());
            DefaultDeploymentWorkflow workflow = new DefaultDeploymentWorkflow(
                    projector, commands, inspector, new MetadataMigrationPolicy(),
                    new DeploymentWorkflowFailureMapper(), Clock.systemUTC(),
                    Duration.ofSeconds(5), System::nanoTime);
            MetadataMigrationRequest request = new MetadataMigrationRequest(
                    OPERATION, MigrationTarget.MYSQL, DATABASE, ApplyMode.MANAGED_WRITE);
            try {
                MigrationView first = workflow.migrate(request);
                assertThat(cleanupEntered.await(5, SECONDS)).isTrue();
                assertThat(first.state()).isEqualTo(MigrationOperationState.PENDING);
                assertThat(first.errorCode()).isEqualTo(
                        org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode
                                .CONFIG_RECOVERY_REQUIRED);

                assertThat(workflow.migrate(request)).isEqualTo(first);
                verify(inspector).inspect(any(), any(), any());
                verify(factory).acquire(any(), any(), any());
                verify(provisioner, org.mockito.Mockito.never()).provision(any(), any(), any());
                verify(executor, org.mockito.Mockito.never()).execute(
                        any(), any(), any(), any(JdbcMetadataMigrationDeadline.class), any());
            } finally {
                releaseCleanup.countDown();
            }
        } finally {
            releaseCleanup.countDown();
        }
    }

    private ManagedMigrationConfigurationTransaction configuration() throws Exception {
        ManagedMigrationConfigurationTransaction configuration = mock(
                ManagedMigrationConfigurationTransaction.class);
        when(configuration.stageMetadataTarget(any(), any(), any(), any(), any()))
                .thenAnswer(invocation -> new MetadataTargetStageResult(
                        StageOutcome.STAGED,
                        Optional.of(new CandidateRef(
                                invocation.getArgument(0), invocation.getArgument(1)))));
        return configuration;
    }

    private static TargetJdbcConnectionLease lease(String identity) {
        TargetJdbcConnectionLease lease = mock(TargetJdbcConnectionLease.class);
        when(lease.targetIdentityHash()).thenReturn(identity);
        Connection connection = mock(Connection.class);
        doAnswer(invocation -> {
            TargetJdbcConnectionAction action = invocation.getArgument(0);
            action.execute(connection);
            return null;
        }).when(lease).withConnection(any());
        return lease;
    }

    private static MigrationMaintenanceLease sourceLease() {
        MigrationMaintenanceLease lease = mock(MigrationMaintenanceLease.class);
        Connection source = mock(Connection.class);
        doAnswer(invocation -> {
            MigrationSourceAction action = invocation.getArgument(0);
            action.execute(source);
            return null;
        }).when(lease).withSourceConnection(any());
        return lease;
    }

    private static void assertRunning(MigrationView view) {
        assertThat(view.operationId()).isEqualTo(OPERATION);
        assertThat(view.state()).isEqualTo(MigrationOperationState.RUNNING);
    }

    private static void awaitRetained(RetainedCutoverCoordinator coordinator) {
        long deadline = System.nanoTime() + SECONDS.toNanos(5);
        while (coordinator.status().phase() != RetainedCutoverStatus.Phase.RETAINED
                && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(coordinator.status().phase()).isEqualTo(RetainedCutoverStatus.Phase.RETAINED);
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(5, SECONDS)).isTrue();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError(interrupted);
        }
    }
}
