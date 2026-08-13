/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.DriverPropertyInfo;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.logging.Logger;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.logging.Log;
import org.flywaydb.core.api.logging.LogCreator;
import org.flywaydb.core.api.logging.LogFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;

class FlywayTargetSchemaProvisionerTest {

    private static final String FLYWAY_LOG_FACTORY = "flyway-log-factory";

    @Test
    void callerOwnedEntryAcceptsNoIdentityAndNeverClosesOnDeadline() throws Exception {
        Connection connection = mock(Connection.class);
        long[] ticks = {0, 2};
        int[] index = {0};
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(1), () -> ticks[Math.min(index[0]++, ticks.length - 1)]);

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner()
                        .provision(connection, MetadataDatabaseKind.MYSQL, deadline))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE);
                    assertThat(failure.disposition()).isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
                });
        verify(connection, never()).close();
    }

    @Test
    void rejectsEmbeddedTargetsBeforeConnectionOpen() {
        MetadataDatabaseConfiguration target = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.H2, "jdbc:h2:mem:not-opened", "sa", "not-retained");

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner().provision(target))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("External target schema provisioning does not support H2");
    }

    @Test
    void failureDoesNotRetainJdbcUrlPasswordOrFlywayDetails() {
        String jdbcUrl = "jdbc:mysql://invalid.example.test:3306/hertzbeat";
        String password = "not-retained";
        MetadataDatabaseConfiguration target =
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.MYSQL, jdbcUrl, "operator", password);

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner().provision(target))
                .isInstanceOf(TargetSchemaProvisioningException.class)
                .hasMessage("Target schema provisioning failed for MYSQL")
                .hasNoCause()
                .message()
                .doesNotContain(jdbcUrl, password, "SELECT", "CREATE");
    }

    @Test
    void failureExposesOnlyStableStructuredDiagnostics() throws Exception {
        String jdbcUrl = "jdbc:diagnostic://private.example.test/hertzbeat?password=secret-value";
        Driver driver = new DiagnosticFailureDriver(jdbcUrl);
        DriverManager.registerDriver(driver);
        try {
            MetadataDatabaseConfiguration target = new MetadataDatabaseConfiguration(
                    MetadataDatabaseKind.MYSQL, jdbcUrl, "operator", "secret-value");

            assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner().provision(target))
                    .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception -> {
                        assertThat(exception.failure()).isEqualTo(new TargetSchemaProvisioningFailure(
                                TargetSchemaProvisioningFailure.Phase.CONNECTION,
                                "206",
                                "08006",
                                1045));
                        assertThat(exception).hasNoCause();
                        assertThat(exception.getMessage())
                                .doesNotContain(jdbcUrl, "secret-value", "SELECT", "CREATE");
                    });
        } finally {
            DriverManager.deregisterDriver(driver);
        }
    }

    @Test
    void closeFailureIsNotAttachedToSanitizedOperationFailure() throws Exception {
        String jdbcUrl = "jdbc:close-failure://private.example.test/hertzbeat";
        Driver driver = new CloseFailureDriver(jdbcUrl);
        DriverManager.registerDriver(driver);
        try {
            MetadataDatabaseConfiguration target = new MetadataDatabaseConfiguration(
                    MetadataDatabaseKind.MYSQL, jdbcUrl, "operator", "secret-value");

            assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner().provision(target))
                    .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception -> {
                        assertThat(exception.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION);
                        assertThat(exception.getSuppressed()).isEmpty();
                        assertThat(exception.getMessage()).doesNotContain(jdbcUrl, "secret-value", "SELECT");
                    });
        } finally {
            DriverManager.deregisterDriver(driver);
        }
    }

    @Test
    void ownedConnectionCloseFailureAfterSuccessIsStableCleanupFailure() throws Exception {
        Connection connection = mock(Connection.class);
        doThrow(new SQLException("private close diagnostic", "08006", 93)).when(connection).close();

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner()
                        .provisionOwned(connection, MetadataDatabaseKind.MYSQL, () -> { }))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.CLEANUP);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getMessage()).doesNotContain("private close diagnostic");
                });
    }

    @Test
    void ownedConnectionCloseErrorNeverOverridesStableOperationFailure() throws Exception {
        Connection connection = mock(Connection.class);
        doThrow(new AssertionError("private close fatal")).when(connection).close();
        TargetSchemaProvisioningException operation = new TargetSchemaProvisioningException(
                MetadataDatabaseKind.MYSQL,
                new TargetSchemaProvisioningFailure(
                        TargetSchemaProvisioningFailure.Phase.PRECONDITION,
                        TargetSchemaBaseline.VERSION,
                        null,
                        0),
                TargetSchemaConnectionDisposition.REUSABLE);

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner()
                        .provisionOwned(connection, MetadataDatabaseKind.MYSQL, () -> {
                            throw operation;
                        }))
                .isSameAs(operation)
                .satisfies(failure -> assertThat(failure.getSuppressed()).isEmpty());
    }

    @Test
    void ownedConnectionCloseErrorNeverOverridesEarlierFatal() throws Exception {
        Connection connection = mock(Connection.class);
        doThrow(new AssertionError("private close fatal")).when(connection).close();
        AssertionError operation = new AssertionError("first fatal");

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner()
                        .provisionOwned(connection, MetadataDatabaseKind.MYSQL, () -> {
                            throw operation;
                        }))
                .isSameAs(operation)
                .satisfies(failure -> assertThat(failure.getSuppressed()).isEmpty());
    }

    @Test
    @ResourceLock(FLYWAY_LOG_FACTORY)
    void provisioningDoesNotReplaceLoggerUsedByAnInterleavedFlywayOperation() throws Exception {
        RecordingLogCreator recording = new RecordingLogCreator();
        LogFactory.setLogCreator(recording);
        CountDownLatch provisioningFinished = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> provisioning = executor.submit(() -> {
                try {
                    MetadataDatabaseConfiguration target = new MetadataDatabaseConfiguration(
                            MetadataDatabaseKind.MYSQL,
                            "jdbc:mysql://127.0.0.1:1/hertzbeat?connectTimeout=100",
                            "operator",
                            "test-only-password");
                    assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner().provision(target))
                            .isInstanceOf(TargetSchemaProvisioningException.class);
                } finally {
                    provisioningFinished.countDown();
                }
            });
            Future<?> interleavedLog = executor.submit(() -> {
                provisioningFinished.await();
                LogFactory.getLog(FlywayTargetSchemaProvisionerTest.class).info("unrelated-flyway-operation");
                return null;
            });

            provisioning.get();
            interleavedLog.get();
            assertThat(recording.messages()).contains("unrelated-flyway-operation");
        } finally {
            LogFactory.setConfiguration(Flyway.configure());
        }
    }

    private static final class RecordingLogCreator implements LogCreator {

        private final List<String> messages = new CopyOnWriteArrayList<>();

        @Override
        public Log createLogger(Class<?> clazz) {
            return new RecordingLog(messages);
        }

        List<String> messages() {
            return List.copyOf(messages);
        }
    }

    private record RecordingLog(List<String> messages) implements Log {

        @Override
        public boolean isDebugEnabled() {
            return true;
        }

        @Override
        public void debug(String message) {
            messages.add(message);
        }

        @Override
        public void info(String message) {
            messages.add(message);
        }

        @Override
        public void warn(String message) {
            messages.add(message);
        }

        @Override
        public void error(String message) {
            messages.add(message);
        }

        @Override
        public void error(String message, Exception exception) {
            messages.add(message);
        }

        @Override
        public void notice(String message) {
            messages.add(message);
        }
    }

    private record DiagnosticFailureDriver(String acceptedUrl) implements Driver {

        @Override
        public Connection connect(String url, Properties info) throws SQLException {
            if (!acceptsURL(url)) {
                return null;
            }
            throw new SQLException("Connection failed for " + url + " after SELECT secret-value", "08006", 1045);
        }

        @Override
        public boolean acceptsURL(String url) {
            return acceptedUrl.equals(url);
        }

        @Override
        public DriverPropertyInfo[] getPropertyInfo(String url, Properties info) {
            return new DriverPropertyInfo[0];
        }

        @Override
        public int getMajorVersion() {
            return 1;
        }

        @Override
        public int getMinorVersion() {
            return 0;
        }

        @Override
        public boolean jdbcCompliant() {
            return false;
        }

        @Override
        public Logger getParentLogger() {
            return Logger.getAnonymousLogger();
        }
    }

    private record CloseFailureDriver(String acceptedUrl) implements Driver {

        @Override
        public Connection connect(String url, Properties info) {
            if (!acceptsURL(url)) {
                return null;
            }
            return (Connection) Proxy.newProxyInstance(
                    getClass().getClassLoader(), new Class<?>[]{Connection.class}, (proxy, method, arguments) -> {
                        if (method.getName().equals("close")) {
                            throw new SQLException("close leaked " + url + " after SELECT secret-value", "08006", 999);
                        }
                        if (method.getName().equals("getAutoCommit")) {
                            return true;
                        }
                        if (method.getName().equals("isReadOnly")) {
                            return false;
                        }
                        if (method.getName().equals("getMetaData")) {
                            throw new SQLException("metadata unavailable after SELECT secret-value", "08006", 998);
                        }
                        return null;
                    });
        }

        @Override
        public boolean acceptsURL(String url) {
            return acceptedUrl.equals(url);
        }

        @Override
        public DriverPropertyInfo[] getPropertyInfo(String url, Properties info) {
            return new DriverPropertyInfo[0];
        }

        @Override
        public int getMajorVersion() {
            return 1;
        }

        @Override
        public int getMinorVersion() {
            return 0;
        }

        @Override
        public boolean jdbcCompliant() {
            return false;
        }

        @Override
        public Logger getParentLogger() {
            return Logger.getAnonymousLogger();
        }
    }
}
