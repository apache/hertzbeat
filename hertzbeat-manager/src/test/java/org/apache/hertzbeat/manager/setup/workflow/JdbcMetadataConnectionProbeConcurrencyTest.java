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
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.junit.jupiter.api.Test;

class JdbcMetadataConnectionProbeConcurrencyTest {

    @Test
    void lateConnectionAfterTimeoutIsClosedBeforeCompatibilityOrDdl() throws Exception {
        ThreadPoolExecutor executor = executor();
        CountDownLatch connecting = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        Connection late = mock(Connection.class);
        JdbcMetadataConnectionProbe probe = new JdbcMetadataConnectionProbe(
                Duration.ofMillis(100), executor, (url, username, password) -> {
                    connecting.countDown();
                    while (release.getCount() > 0) {
                        try {
                            release.await();
                        } catch (InterruptedException ignored) {
                            // Emulate a driver that ignores interruption while connecting.
                        }
                    }
                    return late;
                });
        try {
            assertThat(probe.probe(configuration("jdbc:h2:mem:late")))
                    .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
            assertThat(connecting.await(1, TimeUnit.SECONDS)).isTrue();
            release.countDown();
            verify(late, timeout(2_000)).close();
            verify(late, never()).getMetaData();
            verify(late, never()).createStatement();
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void interruptedCallerCancelsFutureAndClosesActiveConnection() throws Exception {
        ThreadPoolExecutor executor = executor();
        Connection primary = mock(Connection.class);
        Connection cleanup = mock(Connection.class);
        Statement primaryStatement = mock(Statement.class);
        Statement cleanupStatement = mock(Statement.class);
        CountDownLatch createStarted = new CountDownLatch(1);
        CountDownLatch workerClosed = new CountDownLatch(1);
        AtomicReference<Optional<SetupErrorCode>> outcome = new AtomicReference<>();
        AtomicBoolean interruptRestored = new AtomicBoolean();
        AtomicInteger connections = new AtomicInteger();
        stubH2Compatibility(primary);
        when(primary.createStatement()).thenReturn(primaryStatement);
        when(cleanup.createStatement()).thenReturn(cleanupStatement);
        when(primaryStatement.execute(startsWith("CREATE TABLE"))).thenAnswer(invocation -> {
            createStarted.countDown();
            try {
                new CountDownLatch(1).await();
                return true;
            } catch (InterruptedException cancelled) {
                throw new SQLException("cancelled", "08006", 52);
            }
        });
        doAnswer(ignored -> {
            workerClosed.countDown();
            return null;
        }).when(primary).close();
        JdbcMetadataConnectionProbe probe = new JdbcMetadataConnectionProbe(
                Duration.ofSeconds(5), executor, (url, username, password) ->
                        connections.getAndIncrement() == 0 ? primary : cleanup);
        Thread caller = Thread.ofPlatform().start(() -> {
            outcome.set(probe.probe(configuration("jdbc:h2:mem:interrupted")));
            interruptRestored.set(Thread.currentThread().isInterrupted());
        });
        try {
            assertThat(createStarted.await(2, TimeUnit.SECONDS)).isTrue();
            caller.interrupt();
            caller.join(2_000);
            assertThat(caller.isAlive()).isFalse();
            assertThat(outcome.get()).contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
            assertThat(interruptRestored).isTrue();
            assertThat(workerClosed.await(1, TimeUnit.SECONDS)).isTrue();
            verify(primary, timeout(1_000).times(1)).close();
        } finally {
            caller.interrupt();
            caller.join(1_000);
            executor.shutdownNow();
        }
    }

    @Test
    void timeoutReturnsBeforeWorkerOwnedCloseAndCleanupWaitsForClose() throws Exception {
        ThreadPoolExecutor executor = executor();
        Connection primary = mock(Connection.class);
        Connection cleanup = mock(Connection.class);
        Statement primaryStatement = mock(Statement.class);
        Statement cleanupStatement = mock(Statement.class);
        CountDownLatch createStarted = new CountDownLatch(1);
        CountDownLatch neverReleaseStatement = new CountDownLatch(1);
        CountDownLatch closeStarted = new CountDownLatch(1);
        CountDownLatch releaseClose = new CountDownLatch(1);
        CountDownLatch cleanupConnecting = new CountDownLatch(1);
        AtomicInteger connections = new AtomicInteger();
        AtomicReference<Optional<SetupErrorCode>> outcome = new AtomicReference<>();
        stubH2Compatibility(primary);
        when(primary.createStatement()).thenReturn(primaryStatement);
        when(cleanup.createStatement()).thenReturn(cleanupStatement);
        when(primaryStatement.execute(startsWith("CREATE TABLE"))).thenAnswer(invocation -> {
            createStarted.countDown();
            try {
                neverReleaseStatement.await();
                return true;
            } catch (InterruptedException cancelled) {
                throw new SQLException("cancelled", "08006", 82);
            }
        });
        doAnswer(ignored -> {
            closeStarted.countDown();
            while (releaseClose.getCount() > 0) {
                try {
                    releaseClose.await();
                } catch (InterruptedException ignoredInterrupt) {
                    // The worker remains the close owner until the driver returns.
                }
            }
            return null;
        }).when(primary).close();
        JdbcMetadataConnectionProbe probe = new JdbcMetadataConnectionProbe(
                Duration.ofMillis(100), executor, (url, username, password) -> {
                    if (connections.getAndIncrement() == 0) {
                        return primary;
                    }
                    cleanupConnecting.countDown();
                    return cleanup;
                });
        Thread caller = Thread.ofPlatform().start(() ->
                outcome.set(probe.probe(configuration("jdbc:h2:mem:blocking-close"))));
        try {
            assertThat(createStarted.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(closeStarted.await(1, TimeUnit.SECONDS)).isTrue();
            caller.join(500);
            assertThat(caller.isAlive()).isFalse();
            assertThat(cleanupConnecting.getCount()).isEqualTo(1);
            releaseClose.countDown();
            assertThat(cleanupConnecting.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(outcome.get()).contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
            verify(primary, timeout(1_000).times(1)).close();
        } finally {
            neverReleaseStatement.countDown();
            releaseClose.countDown();
            caller.interrupt();
            caller.join(1_000);
            executor.shutdownNow();
        }
    }

    @Test
    void cleanupConnectorThatIgnoresInterruptDoesNotConsumePrimaryProbeCapacity() throws Exception {
        ThreadPoolExecutor executor = executor();
        ThreadPoolExecutor cleanupExecutor = executor();
        Connection firstPrimary = mock(Connection.class);
        Connection cleanup = mock(Connection.class);
        Connection secondPrimary = mock(Connection.class);
        Statement firstStatement = mock(Statement.class);
        Statement cleanupStatement = mock(Statement.class);
        CountDownLatch firstClosed = new CountDownLatch(1);
        CountDownLatch cleanupConnecting = new CountDownLatch(1);
        CountDownLatch releaseCleanup = new CountDownLatch(1);
        CountDownLatch secondConnecting = new CountDownLatch(1);
        AtomicInteger connections = new AtomicInteger();
        stubH2Compatibility(firstPrimary);
        when(firstPrimary.createStatement()).thenReturn(firstStatement);
        when(cleanup.createStatement()).thenReturn(cleanupStatement);
        DatabaseMetaData mismatch = mock(DatabaseMetaData.class);
        when(secondPrimary.getMetaData()).thenReturn(mismatch);
        when(mismatch.getDatabaseProductName()).thenReturn("PostgreSQL");
        doAnswer(ignored -> {
            firstClosed.countDown();
            return null;
        }).when(firstPrimary).close();
        when(firstStatement.execute(startsWith("CREATE TABLE"))).thenAnswer(invocation -> {
            firstClosed.await(2, TimeUnit.SECONDS);
            throw new SQLException("closed", "08006", 81);
        });
        JdbcMetadataConnectionProbe.JdbcConnector connector = (url, username, password) -> {
            int connection = connections.getAndIncrement();
            if (connection == 0) {
                return firstPrimary;
            }
            if (connection == 1) {
                cleanupConnecting.countDown();
                while (releaseCleanup.getCount() > 0) {
                    try {
                        releaseCleanup.await();
                    } catch (InterruptedException ignored) {
                        // Emulate a cleanup connection attempt with no portable hard cancellation.
                    }
                }
                return cleanup;
            }
            secondConnecting.countDown();
            return secondPrimary;
        };
        try {
            JdbcMetadataConnectionProbe first = new JdbcMetadataConnectionProbe(
                    Duration.ofMillis(200), executor, cleanupExecutor, connector);
            assertThat(first.probe(configuration("jdbc:h2:mem:blocked-cleanup")))
                    .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
            assertThat(cleanupConnecting.await(2, TimeUnit.SECONDS)).isTrue();

            JdbcMetadataConnectionProbe second = new JdbcMetadataConnectionProbe(
                    Duration.ofSeconds(1), executor, cleanupExecutor, connector);
            assertThat(second.probe(configuration("jdbc:h2:mem:second-probe")))
                    .contains(SetupErrorCode.METADATA_SCHEMA_MISMATCH);
            assertThat(secondConnecting.await(1, TimeUnit.SECONDS)).isTrue();
        } finally {
            firstClosed.countDown();
            releaseCleanup.countDown();
            executor.shutdownNow();
            cleanupExecutor.shutdownNow();
        }
    }

    private static MetadataDatabaseConfiguration configuration(String url) {
        return new MetadataDatabaseConfiguration(MetadataDatabaseKind.H2, url, "sa", "password");
    }

    private static ThreadPoolExecutor executor() {
        return new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(4), Thread.ofPlatform().name("probe-test-", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
    }

    private static void stubH2Compatibility(Connection connection) throws SQLException {
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("H2");
        when(metadata.getSchemas()).thenReturn(mock(ResultSet.class));
    }
}
