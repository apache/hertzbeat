/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @Timeout(10)
    void closeSealsWorkflowBeforeWaitingForAnInFlightValidationAndClosingCommands(boolean virtual)
            throws Exception {
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        MetadataMigrationTargetInspector inspector = mock(MetadataMigrationTargetInspector.class);
        DeploymentViewProjector projector = mock(DeploymentViewProjector.class);
        when(projector.project()).thenReturn(DefaultDeploymentWorkflowTest.deploymentFixture());
        CountDownLatch inspectionEntered = new CountDownLatch(1);
        CountDownLatch releaseInspection = new CountDownLatch(1);
        when(inspector.inspect(any(), any(), any())).thenAnswer(ignored -> {
            inspectionEntered.countDown();
            releaseInspection.await();
            return org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection.EMPTY;
        });
        DefaultDeploymentWorkflow workflow = new DefaultDeploymentWorkflow(
                projector, commands, inspector, new MetadataMigrationPolicy(),
                new DeploymentWorkflowFailureMapper(), java.time.Clock.systemUTC(),
                Duration.ofSeconds(5), System::nanoTime);
        DeploymentMigrationRuntime runtime = new DeploymentMigrationRuntime(
                workflow, commands, inspector, mock(JdbcMetadataMigrationExecutor.class),
                mock(TargetJdbcConnectionFactory.class), Duration.ofSeconds(5), System::nanoTime);

        var callers = virtual ? Executors.newVirtualThreadPerTaskExecutor() : Executors.newSingleThreadExecutor();
        AtomicReference<Throwable> closeFailure = new AtomicReference<>();
        Thread closing = Thread.ofPlatform().unstarted(() -> {
            try {
                runtime.close();
            } catch (Throwable failure) {
                closeFailure.set(failure);
            }
        });
        try {
            Future<?> validation = callers.submit(() -> workflow.validate(
                    DefaultDeploymentWorkflowTest.validationRequestFixture()));
            assertThat(inspectionEntered.await(5, TimeUnit.SECONDS)).isTrue();
            closing.start();
            awaitAdmissionCloseWait(closing, workflow);
            assertThatThrownBy(() -> workflow.migration("operation-a"))
                    .isInstanceOf(org.apache.hertzbeat.manager.setup.api.SetupApiException.class);
            verify(commands, never()).close();
            releaseInspection.countDown();
            validation.get(5, TimeUnit.SECONDS);
            closing.join(5000);
            assertThat(closing.isAlive()).isFalse();
            assertThat(closeFailure.get()).isNull();
        } finally {
            releaseInspection.countDown();
            callers.shutdownNow();
            closing.join(5000);
            assertThat(callers.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
            assertThat(closing.isAlive()).isFalse();
        }
        verify(commands).close();
    }

    private static void awaitAdmissionCloseWait(Thread thread, DefaultDeploymentWorkflow workflow) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        var bean = ManagementFactory.getThreadMXBean();
        while (System.nanoTime() < deadline) {
            var info = bean.getThreadInfo(thread.threadId(), 20);
            if (info != null && info.getThreadState() == Thread.State.WAITING && info.getLockInfo() != null
                    && info.getLockInfo().getIdentityHashCode() == System.identityHashCode(workflow)) {
                for (StackTraceElement frame : info.getStackTrace()) {
                    if (frame.getClassName().equals(DefaultDeploymentWorkflow.class.getName())
                            && frame.getMethodName().equals("closeAdmission")) {
                        return;
                    }
                }
            }
            Thread.onSpinWait();
        }
        throw new AssertionError("close did not seal admission and wait for validation");
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
