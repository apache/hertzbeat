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
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real-database proof for bounded target JDBC connection ownership. */
@Timeout(120)
@EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
class TargetJdbcConnectionFactoryDatabaseTest {

    private static final String DATABASE = "hertzbeat";
    private static final String USERNAME = "target_test_user";
    private static final String PASSWORD = "test-only-password";
    private static final String INVALID_PASSWORD = "test-only-invalid-password";

    @Test
    void acquiresAndOwnsMysqlLease() throws Exception {
        try (MySQLContainer database = new MySQLContainer("mysql:8.4")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)) {
            database.start();
            verifyLeaseAndCredentialFailure(
                    MetadataDatabaseKind.MYSQL,
                    database.getJdbcUrl(),
                    "MySQL",
                    null);
        }
    }

    @Test
    void acquiresAndOwnsPostgresqlLease() throws Exception {
        try (PostgreSQLContainer database = new PostgreSQLContainer("postgres:17.6")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)) {
            database.start();
            verifyLeaseAndCredentialFailure(
                    MetadataDatabaseKind.POSTGRESQL,
                    database.getJdbcUrl(),
                    "PostgreSQL",
                    "public");
        }
    }

    private static void verifyLeaseAndCredentialFailure(
            MetadataDatabaseKind kind,
            String jdbcUrl,
            String expectedProduct,
            String expectedSchema) throws Exception {
        MetadataDatabaseSettings settings = new MetadataDatabaseSettings(kind, jdbcUrl, USERNAME);
        TargetJdbcConnectionLease lease;
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(Runnable::run);
                SecretValue password = SecretValue.of(PASSWORD)) {
            lease = factory.acquire(settings, password, deadline());
            assertThat(lease.targetIdentityHash()).matches("[0-9a-f]{64}");

            factory.close();
            assertExactConnection(lease, expectedProduct, expectedSchema);
            lease.close();
            assertThatThrownBy(() -> lease.withConnection(connection -> { }))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure ->
                            assertThat(failure.code())
                                    .isEqualTo(TargetJdbcConnectionErrorCode.OPERATION_CONFLICT));
        }
        assertCredentialFailure(settings, jdbcUrl);
    }

    private static void assertExactConnection(
            TargetJdbcConnectionLease lease,
            String expectedProduct,
            String expectedSchema) {
        AtomicReference<Connection> exactConnection = new AtomicReference<>();
        lease.withConnection(connection -> {
            exactConnection.set(connection);
            assertMetadata(connection, expectedProduct, expectedSchema);
        });
        lease.withConnection(connection -> assertThat(connection).isSameAs(exactConnection.get()));
    }

    private static void assertMetadata(
            Connection connection,
            String expectedProduct,
            String expectedSchema) {
        try {
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo(expectedProduct);
            assertThat(connection.getCatalog()).isEqualTo(DATABASE);
            if (expectedSchema == null) {
                assertThat(connection.getSchema()).isNull();
            } else {
                assertThat(connection.getSchema()).isEqualTo(expectedSchema);
            }
        } catch (SQLException metadataFailure) {
            throw new AssertionError("Target JDBC metadata inspection failed", metadataFailure);
        }
    }

    private static void assertCredentialFailure(
            MetadataDatabaseSettings settings,
            String jdbcUrl) {
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(Runnable::run);
                SecretValue password = SecretValue.of(INVALID_PASSWORD)) {
            TargetJdbcConnectionException failure = catchThrowableOfType(
                    TargetJdbcConnectionException.class,
                    () -> factory.acquire(settings, password, deadline()));

            assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.UNAVAILABLE);
            assertThat(failure).hasNoCause();
            assertThat(failure.toString())
                    .doesNotContain(jdbcUrl, USERNAME, PASSWORD, INVALID_PASSWORD);
        }
    }

    private static JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(30), System::nanoTime);
    }
}
