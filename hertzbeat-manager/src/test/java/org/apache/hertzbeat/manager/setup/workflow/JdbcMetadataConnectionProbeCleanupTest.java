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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLNonTransientConnectionException;
import java.sql.SQLTimeoutException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;

class JdbcMetadataConnectionProbeCleanupTest {

    @Test
    void timeoutAfterCreateUsesIndependentConnectionForExactCandidateCleanup() throws Exception {
        ThreadPoolExecutor executor = executor();
        Connection primary = mock(Connection.class);
        Connection cleanup = mock(Connection.class);
        Statement primaryStatement = mock(Statement.class);
        Statement cleanupStatement = mock(Statement.class);
        CountDownLatch createStarted = new CountDownLatch(1);
        CountDownLatch primaryClosed = new CountDownLatch(1);
        CountDownLatch cleanupFinished = new CountDownLatch(1);
        AtomicReference<String> createSql = new AtomicReference<>();
        AtomicReference<String> cleanupSql = new AtomicReference<>();
        AtomicInteger connections = new AtomicInteger();
        stubH2Compatibility(primary);
        when(primary.createStatement()).thenReturn(primaryStatement);
        when(cleanup.createStatement()).thenReturn(cleanupStatement);
        doAnswer(ignored -> {
            primaryClosed.countDown();
            return null;
        }).when(primary).close();
        when(primaryStatement.execute(startsWith("CREATE TABLE"))).thenAnswer(invocation -> {
            createSql.set(invocation.getArgument(0));
            createStarted.countDown();
            primaryClosed.await(2, TimeUnit.SECONDS);
            throw new SQLException("closed after create", "08006", 51);
        });
        when(cleanupStatement.execute(startsWith("DROP TABLE IF EXISTS"))).thenAnswer(invocation -> {
            cleanupSql.set(invocation.getArgument(0));
            cleanupFinished.countDown();
            return true;
        });
        JdbcMetadataConnectionProbe probe = new JdbcMetadataConnectionProbe(
                Duration.ofMillis(250), executor, (url, username, password) ->
                        connections.getAndIncrement() == 0 ? primary : cleanup);
        try {
            assertThat(probe.probe(configuration("jdbc:h2:mem:cleanup")))
                    .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
            assertThat(createStarted.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(cleanupFinished.await(2, TimeUnit.SECONDS)).isTrue();
            assertThat(connections).hasValue(2);
            String table = createSql.get().split(" ")[2];
            assertThat(cleanupSql.get()).isEqualTo("DROP TABLE IF EXISTS " + table);
            verify(cleanup).setNetworkTimeout(any(), org.mockito.ArgumentMatchers.intThat(value -> value > 0));
            verify(cleanupStatement).setQueryTimeout(org.mockito.ArgumentMatchers.intThat(value -> value > 0));
        } finally {
            primaryClosed.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void genuineCreatePermissionFailureRemainsInsufficientPrivileges() throws Exception {
        assertThat(probeCreateFailure(new SQLException("permission denied", "42501", 70)))
                .contains(SetupErrorCode.METADATA_INSUFFICIENT_PRIVILEGES);
    }

    @Test
    void connectionSqlStateWithoutCallerCancellationMapsToConnectionFailed() throws Exception {
        assertThat(probeCreateFailure(new SQLException("connection lost", "08006", 71)))
                .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
    }

    @Test
    void sqlTimeoutWithoutCallerCancellationMapsToConnectionFailed() throws Exception {
        assertThat(probeCreateFailure(new SQLTimeoutException("timed out", "HYT00", 72)))
                .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
    }

    @Test
    void nonTransientConnectionFailureWithoutSqlStateMapsToConnectionFailed() throws Exception {
        assertThat(probeCreateFailure(new SQLNonTransientConnectionException("connection rejected", null, 73)))
                .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"HYT00", "HYT01", "57014"})
    void timeoutSqlStateMapsToConnectionFailed(String sqlState) throws Exception {
        assertThat(probeCreateFailure(new SQLException("operation timed out", sqlState, 74)))
                .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
    }

    @Test
    void cleanupFailureLogContainsOnlyFixedDiagnostics() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(JdbcMetadataConnectionProbe.class);
        CountDownLatch warningLogged = new CountDownLatch(1);
        ListAppender<ILoggingEvent> appender = new ListAppender<>() {
            @Override
            protected void append(ILoggingEvent event) {
                super.append(event);
                if (event.getLevel() == Level.WARN) {
                    warningLogged.countDown();
                }
            }
        };
        appender.start();
        logger.addAppender(appender);
        ThreadPoolExecutor executor = executor();
        Connection primary = mock(Connection.class);
        Connection cleanup = mock(Connection.class);
        Statement primaryStatement = mock(Statement.class);
        Statement cleanupStatement = mock(Statement.class);
        CountDownLatch primaryClosed = new CountDownLatch(1);
        AtomicInteger connections = new AtomicInteger();
        stubH2Compatibility(primary);
        when(primary.createStatement()).thenReturn(primaryStatement);
        when(cleanup.createStatement()).thenReturn(cleanupStatement);
        doAnswer(ignored -> {
            primaryClosed.countDown();
            return null;
        }).when(primary).close();
        when(primaryStatement.execute(startsWith("CREATE TABLE"))).thenAnswer(invocation -> {
            primaryClosed.await(2, TimeUnit.SECONDS);
            throw new SQLException("password=primary-secret", "08006", 61);
        });
        when(cleanupStatement.execute(startsWith("DROP TABLE IF EXISTS"))).thenThrow(
                new SQLException("password=cleanup-secret jdbc:h2:/private DROP TABLE", "42501", 77));
        JdbcMetadataConnectionProbe probe = new JdbcMetadataConnectionProbe(
                Duration.ofMillis(200), executor, (url, username, password) ->
                        connections.getAndIncrement() == 0 ? primary : cleanup);
        try {
            assertThat(probe.probe(configuration("jdbc:h2:/private/config")))
                    .contains(SetupErrorCode.METADATA_CONNECTION_FAILED);
            verify(cleanupStatement, timeout(2_000)).execute(startsWith("DROP TABLE IF EXISTS"));
            assertThat(warningLogged.await(1, TimeUnit.SECONDS)).isTrue();
            ILoggingEvent warning = appender.list.stream()
                    .filter(event -> event.getLevel() == Level.WARN).findFirst().orElseThrow();
            assertThat(warning.getFormattedMessage())
                    .startsWith("Metadata probe cleanup failure kind=H2 table=HZB_SETUP_PROBE_")
                    .endsWith(" sqlState=42501 vendorCode=77")
                    .doesNotContain("password", "jdbc", "/private", "DROP TABLE", "cleanup-secret");
            assertThat(warning.getThrowableProxy()).isNull();
        } finally {
            logger.detachAppender(appender);
            appender.stop();
            primaryClosed.countDown();
            executor.shutdownNow();
        }
    }

    private static MetadataDatabaseConfiguration configuration(String url) {
        return new MetadataDatabaseConfiguration(MetadataDatabaseKind.H2, url, "sa", "password");
    }

    private static Optional<SetupErrorCode> probeCreateFailure(SQLException failure) throws Exception {
        ThreadPoolExecutor executor = executor();
        Connection primary = mock(Connection.class);
        Statement statement = mock(Statement.class);
        stubH2Compatibility(primary);
        when(primary.createStatement()).thenReturn(statement);
        when(statement.execute(startsWith("CREATE TABLE"))).thenThrow(failure);
        try {
            return new JdbcMetadataConnectionProbe(
                    Duration.ofSeconds(2), executor, (url, username, password) -> primary)
                    .probe(configuration("jdbc:h2:mem:failure-classification"));
        } finally {
            executor.shutdownNow();
        }
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
