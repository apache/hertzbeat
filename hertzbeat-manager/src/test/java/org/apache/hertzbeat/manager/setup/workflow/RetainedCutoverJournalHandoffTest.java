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
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Path;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceErrorCode;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;

@Timeout(15)
class RetainedCutoverJournalHandoffTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final Duration TIMEOUT = Duration.ofSeconds(1);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "migration");

    @TempDir
    private Path root;

    @Test
    void uncertainVerifyingConfirmationKeepsFenceAndHealthyRetryNeverRecopies() {
        JournalFixture fixture = fixture((publication, target, content, publisher) -> {
            publisher.publish(target, content);
            if (publication <= 2) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertPendingThenRetry(fixture, MigrationStage.VERIFYING,
                RetainedCutoverResult.Status.RETAINED_SUCCESS);
    }

    @Test
    void uncertainFinalConfirmationKeepsFenceAndHealthyRetryReturnsAlreadyRetained() {
        JournalFixture fixture = fixture((publication, target, content, publisher) -> {
            publisher.publish(target, content);
            if (publication == 2 || publication == 3) {
                throw new CommittedSetupFileDurabilityException();
            }
        });

        assertPendingThenRetry(fixture, MigrationStage.READY_TO_ACTIVATE,
                RetainedCutoverResult.Status.ALREADY_RETAINED);
    }

    private void assertPendingThenRetry(
            JournalFixture fixture,
            MigrationStage durableStage,
            RetainedCutoverResult.Status retryStatus) {
        assertThatThrownBy(fixture::execute)
                .isInstanceOf(RetainedCopyJournalHandoffException.class)
                .hasNoCause();
        assertThat(fixture.store.find(OPERATION).orElseThrow().stage()).isEqualTo(durableStage);
        assertConflict(() -> fixture.coordinator.releaseRetained(OPERATION));

        fixture.delegate.set(new DurableRetainedCopyJournalHandoff(fixture.draft, fixture.store));
        assertThat(fixture.coordinator.retryHandoff(OPERATION).status()).isEqualTo(retryStatus);
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, never()).close();
    }

    private JournalFixture fixture(PublicationBehavior behavior) {
        DurableCutoverDraft draft = new DurableCutoverDraft(
                OPERATION, MigrationTarget.POSTGRESQL, ApplyMode.MANAGED_WRITE,
                Instant.parse("2026-08-10T03:00:00Z"),
                Instant.parse("2026-08-10T03:00:01Z"), "candidate-generation");
        DurableCutoverSnapshots snapshots = new DurableCutoverSnapshots(draft, IDENTITY);
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        store.create(snapshots.cleanPending());
        store.compareAndTransition(
                OPERATION, MigrationOperationState.PENDING, snapshots.running());
        MigrationOperationFilePublisher publisher = new MigrationOperationFilePublisher(root);
        AtomicInteger publications = new AtomicInteger();
        FileMigrationOperationStore uncertain = new FileMigrationOperationStore(root, (target, content) ->
                behavior.publish(publications.incrementAndGet(), target, content, publisher));
        return new JournalFixture(draft, store, uncertain);
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                        assertThat(failure.code()).isEqualTo(
                                MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
    }

    @FunctionalInterface
    private interface PublicationBehavior {
        void publish(
                int publication,
                Path target,
                byte[] content,
                MigrationOperationFilePublisher publisher) throws IOException;
    }

    private static final class JournalFixture {

        private final DurableCutoverDraft draft;
        private final FileMigrationOperationStore store;
        private final AtomicReference<RetainedCopyJournalHandoff> delegate;
        private final JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        private final MigrationMaintenanceLease maintenanceLease = mock(MigrationMaintenanceLease.class);
        private final SecretValue password = mock(SecretValue.class);
        private final RetainedCopyJournalHandoff handoff;
        private final RetainedCutoverCoordinator coordinator;

        private JournalFixture(
                DurableCutoverDraft draft,
                FileMigrationOperationStore store,
                FileMigrationOperationStore uncertainStore) {
            this.draft = draft;
            this.store = store;
            delegate = new AtomicReference<>(new DurableRetainedCopyJournalHandoff(draft, uncertainStore));
            TargetJdbcConnectionFactory factory = mock(TargetJdbcConnectionFactory.class);
            TargetJdbcConnectionLease provisionLease = lease(IDENTITY);
            TargetJdbcConnectionLease copyLease = lease(IDENTITY);
            when(factory.acquire(same(TARGET), same(password), anyDeadline()))
                    .thenReturn(provisionLease, copyLease);
            FlywayTargetSchemaProvisioner provisioner = mock(FlywayTargetSchemaProvisioner.class);
            when(provisioner.provision(any(), any(), anyDeadline())).thenReturn(
                    new TargetSchemaProvisioningOutcome(TargetSchemaConnectionDisposition.REUSABLE));
            MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
            when(maintenance.acquire(eq(OPERATION), any())).thenReturn(maintenanceLease);
            scopedSource(maintenanceLease, mock(Connection.class));
            RetainedCopyJournalHandoff handoff = context -> delegate.get().handoff(context);
            coordinator = new RetainedCutoverCoordinator(
                    factory, provisioner, maintenance, executor, System::nanoTime);
            this.handoff = handoff;
        }

        private RetainedCutoverResult execute() {
            return coordinator.execute(
                    OPERATION, TARGET, password, TIMEOUT, MetadataMigrationProgressSink.NO_OP,
                    RetainedCutoverPreparation.NO_OP, handoff);
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

        private static void scopedSource(MigrationMaintenanceLease lease, Connection connection) {
            doAnswer(invocation -> {
                MigrationSourceAction action = invocation.getArgument(0);
                action.execute(connection);
                return null;
            }).when(lease).withSourceConnection(any());
        }
    }
}
