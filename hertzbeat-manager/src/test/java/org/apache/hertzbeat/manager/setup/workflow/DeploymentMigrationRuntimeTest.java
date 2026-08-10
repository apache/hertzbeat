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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.InOrder;

class DeploymentMigrationRuntimeTest {

    @Test
    void closeRetainsTheExactPhaseForAnExplicitRetry() {
        DefaultDeploymentWorkflow workflow = mock(DefaultDeploymentWorkflow.class);
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
        JdbcMetadataMigrationExecutor copyExecutor = mock(JdbcMetadataMigrationExecutor.class);
        TargetJdbcConnectionFactory factory = mock(TargetJdbcConnectionFactory.class);
        RuntimeException first = new IllegalStateException("private");
        doThrow(first).doNothing().when(commands).close();
        DeploymentMigrationRuntime runtime = new DeploymentMigrationRuntime(
                workflow, commands, inspector, copyExecutor, factory,
                Duration.ofSeconds(5), System::nanoTime);

        assertThatThrownBy(runtime::close).isSameAs(first);
        verify(inspector, never()).shutdown(any());
        runtime.close();

        InOrder order = inOrder(workflow, commands, inspector, copyExecutor, factory);
        order.verify(workflow).closeAdmission();
        order.verify(commands, times(2)).close();
        order.verify(inspector).shutdown(any());
        order.verify(copyExecutor).close();
        order.verify(factory).close();
        assertThat(runtime.workflow()).isSameAs(workflow);
    }

    @Test
    void springDestroyRetriesTheExactPhaseUntilItSettlesWithinOneCallback() {
        DefaultDeploymentWorkflow workflow = mock(DefaultDeploymentWorkflow.class);
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        RuntimeException first = new IllegalStateException("private");
        doThrow(first).doThrow(first).doNothing().when(commands).close();
        MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
        DeploymentMigrationRuntime runtime = new DeploymentMigrationRuntime(
                workflow, commands, inspector, mock(JdbcMetadataMigrationExecutor.class),
                mock(TargetJdbcConnectionFactory.class), Duration.ofSeconds(5), System::nanoTime);

        runtime.destroySafely();

        verify(workflow).closeAdmission();
        verify(commands, times(3)).close();
        verify(inspector).shutdown(any());
    }

    @Test
    @Timeout(10)
    void springDestroyBacksOffAfterItsRetryBudgetAndKeepsOwningTheExactPhase()
            throws Exception {
        DefaultDeploymentWorkflow workflow = mock(DefaultDeploymentWorkflow.class);
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
        CountDownLatch firstAttempt = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch hotLoop = new CountDownLatch(100);
        AtomicInteger attempts = new AtomicInteger();
        doAnswer(ignored -> {
            attempts.incrementAndGet();
            firstAttempt.countDown();
            hotLoop.countDown();
            if (release.getCount() != 0) {
                throw new IllegalStateException("private");
            }
            return null;
        }).when(commands).close();
        DeploymentMigrationRuntime runtime = new DeploymentMigrationRuntime(
                workflow, commands, inspector, mock(JdbcMetadataMigrationExecutor.class),
                mock(TargetJdbcConnectionFactory.class), Duration.ofMillis(10), System::nanoTime);

        try (var caller = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<?> destroying = caller.submit(runtime::destroySafely);
            assertThat(firstAttempt.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(hotLoop.await(200, TimeUnit.MILLISECONDS)).isFalse();
            assertThat(attempts.get()).isLessThan(100);
            verify(inspector, never()).shutdown(any());
            release.countDown();
            destroying.get(5, TimeUnit.SECONDS);
        } finally {
            release.countDown();
        }
        verify(inspector).shutdown(any());
    }

    @Test
    void errorIdentityAndInterruptSurviveRetryableClose() {
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
        AssertionError fatal = new AssertionError("fatal");
        doThrow(fatal).doNothing().when(inspector).shutdown(any());
        DeploymentMigrationRuntime runtime = new DeploymentMigrationRuntime(
                mock(DefaultDeploymentWorkflow.class), commands, inspector,
                mock(JdbcMetadataMigrationExecutor.class), mock(TargetJdbcConnectionFactory.class),
                Duration.ofSeconds(5), System::nanoTime);
        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(runtime::close).isSameAs(fatal);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
            runtime.close();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void constructionCleanupErrorOutranksAnOrdinaryFailureAndPreservesInterrupt() {
        RuntimeException construction = new IllegalStateException("private-construction");
        AssertionError cleanupFatal = new AssertionError("private-cleanup");
        AtomicBoolean cleanupRan = new AtomicBoolean();
        Thread.currentThread().interrupt();
        try {
            Throwable first = DeploymentMigrationRuntime.runCleanupAfter(construction, () -> {
                assertThat(Thread.currentThread().isInterrupted()).isFalse();
                cleanupRan.set(true);
                Thread.currentThread().interrupt();
                throw cleanupFatal;
            });

            assertThat(first).isSameAs(cleanupFatal);
            assertThat(first.getSuppressed()).hasSize(1);
            assertThat(first.getSuppressed()[0])
                    .isInstanceOf(MigrationOperationStoreException.class)
                    .hasNoCause();
            assertThat(cleanupRan).isTrue();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    @Timeout(10)
    void closeSealsWorkflowBeforeWaitingForAnInFlightValidationAndClosingCommands()
            throws Exception {
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
        DeploymentViewProjector projector = mock(DeploymentViewProjector.class);
        when(projector.project()).thenReturn(DefaultDeploymentWorkflowTest.deploymentFixture());
        CountDownLatch inspectionEntered = new CountDownLatch(1);
        CountDownLatch releaseInspection = new CountDownLatch(1);
        when(inspector.inspect(any(), any(), any())).thenAnswer(ignored -> {
            inspectionEntered.countDown();
            assertThat(releaseInspection.await(5, TimeUnit.SECONDS)).isTrue();
            return org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection.EMPTY;
        });
        DefaultDeploymentWorkflow workflow = new DefaultDeploymentWorkflow(
                projector, commands, inspector, new MetadataMigrationPolicy(),
                new DeploymentWorkflowFailureMapper(), java.time.Clock.systemUTC(),
                Duration.ofSeconds(5), System::nanoTime);
        DeploymentMigrationRuntime runtime = new DeploymentMigrationRuntime(
                workflow, commands, inspector, mock(JdbcMetadataMigrationExecutor.class),
                mock(TargetJdbcConnectionFactory.class), Duration.ofSeconds(5), System::nanoTime);

        try (var callers = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<?> validation = callers.submit(() -> workflow.validate(
                    DefaultDeploymentWorkflowTest.validationRequestFixture()));
            assertThat(inspectionEntered.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> closing = callers.submit(runtime::close);
            assertThatThrownBy(() -> workflow.migration("operation-a"))
                    .isInstanceOf(org.apache.hertzbeat.manager.setup.api.SetupApiException.class);
            verify(commands, never()).close();
            releaseInspection.countDown();
            validation.get(5, TimeUnit.SECONDS);
            closing.get(5, TimeUnit.SECONDS);
        } finally {
            releaseInspection.countDown();
        }
        verify(commands).close();
    }

    @Test
    @Timeout(10)
    void lateConnectionAfterRuntimeAndFactoryCloseStillUsesProcessLifetimeAbortAndExactClose()
            throws Exception {
        CountDownLatch connectorEntered = new CountDownLatch(1);
        CountDownLatch releaseConnector = new CountDownLatch(1);
        CountDownLatch aborted = new CountDownLatch(1);
        CountDownLatch closed = new CountDownLatch(1);
        Connection connection = mock(Connection.class);
        org.mockito.Mockito.doAnswer(ignored -> {
            aborted.countDown();
            return null;
        }).when(connection).abort(any());
        org.mockito.Mockito.doAnswer(ignored -> {
            closed.countDown();
            return null;
        }).when(connection).close();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            connectorEntered.countDown();
            boolean interrupted = false;
            while (releaseConnector.getCount() != 0) {
                try {
                    releaseConnector.await();
                } catch (InterruptedException ignored) {
                    interrupted = true;
                }
            }
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
            return connection;
        };
        TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                connector, TargetJdbcAbortExecutor.instance());
        DeploymentMigrationRuntime runtime = new DeploymentMigrationRuntime(
                mock(DefaultDeploymentWorkflow.class), mock(ManagedDeploymentMigrationCommands.class),
                mock(MetadataMigrationTargetInspector.class), mock(JdbcMetadataMigrationExecutor.class),
                factory, Duration.ofMillis(20), System::nanoTime);

        try (var caller = Executors.newVirtualThreadPerTaskExecutor();
                SecretValue password = SecretValue.of("private-password")) {
            Future<?> acquisition = caller.submit(() -> factory.acquire(
                    new MetadataDatabaseSettings(
                            MetadataDatabaseKind.POSTGRESQL,
                            "jdbc:postgresql://db.example:5432/hertzbeat", "operator"),
                    password,
                    JdbcMetadataMigrationDeadline.start(Duration.ofMillis(20), System::nanoTime)));
            assertThat(connectorEntered.await(5, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> acquisition.get(5, TimeUnit.SECONDS)).isNotNull();

            runtime.close();
            releaseConnector.countDown();
            assertThat(aborted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(closed.await(5, TimeUnit.SECONDS)).isTrue();
        } finally {
            releaseConnector.countDown();
        }
        verify(connection).abort(any());
        verify(connection).close();
    }
}
