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
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.SQLTimeoutException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;

class JdbcMetadataMigrationContractTest {

    @Test
    void renamedColumnIsAnIncompatibleShapeInsteadOfAnInspectionFailure() {
        MetadataTableDescriptor source = descriptor("name");
        MetadataTableDescriptor target = descriptor("renamed");

        assertThat(source.hasSamePortableShape(
                target, MetadataDatabaseKind.H2, MetadataDatabaseKind.MYSQL)).isFalse();
    }

    @Test
    void rejectsUnexpectedSchemaWithoutClosingCallerConnectionsOrLeakingDetails() throws Exception {
        String sourceUrl = "jdbc:h2:mem:copy-contract-source;DB_CLOSE_DELAY=-1";
        String targetUrl = "jdbc:h2:mem:copy-contract-target;DB_CLOSE_DELAY=-1";
        List<Progress> progress = new ArrayList<>();
        try (Connection source = DriverManager.getConnection(sourceUrl);
                Connection target = DriverManager.getConnection(targetUrl);
                Statement statement = source.createStatement()) {
            statement.execute("CREATE TABLE private_source_table (id BIGINT PRIMARY KEY, secret VARCHAR(64))");

            assertThatThrownBy(() -> new JdbcMetadataMigration().migrate(
                            source,
                            target,
                            MetadataDatabaseKind.POSTGRESQL,
                            Duration.ofSeconds(5),
                            (stage, percent) -> progress.add(new Progress(stage, percent))))
                    .isInstanceOfSatisfying(MetadataMigrationException.class, exception -> {
                        assertThat(exception.code()).isEqualTo(MetadataMigrationErrorCode.SCHEMA);
                        assertThat(exception).hasNoCause();
                        assertThat(exception.getMessage())
                                .doesNotContain(sourceUrl, targetUrl, "private_source_table", "secret");
                    });

            assertThat(source.isClosed()).isFalse();
            assertThat(target.isClosed()).isFalse();
            assertThat(progress).allSatisfy(event -> {
                assertThat(event.percent()).isBetween(0, 100);
                assertThat(event.toString()).doesNotContain("private_source_table", "secret");
            });
        }
    }

    @Test
    void rejectsExpiredCallerDeadlineBeforeInspectingJdbcMetadata() throws Exception {
        try (Connection source = DriverManager.getConnection("jdbc:h2:mem:expired-source");
                Connection target = DriverManager.getConnection("jdbc:h2:mem:expired-target")) {
            assertThatThrownBy(() -> new JdbcMetadataMigration().migrate(
                            source,
                            target,
                            MetadataDatabaseKind.MYSQL,
                            Duration.ZERO,
                            MetadataMigrationProgressSink.NO_OP))
                    .isInstanceOfSatisfying(MetadataMigrationException.class, exception -> {
                        assertThat(exception.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
                        assertThat(exception).hasNoCause();
                    });
        }
    }

    @Test
    void classifiesSqlTimeoutExceptionWithoutSqlStateAsTimeout() throws Exception {
        Connection source = connection("H2");
        Connection target = connection("MySQL");
        doThrow(new SQLTimeoutException("private timeout diagnostic"))
                .when(target).setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);

        assertThatThrownBy(() -> new JdbcMetadataMigration().migrate(
                        source,
                        target,
                        MetadataDatabaseKind.MYSQL,
                        Duration.ofSeconds(5),
                        MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataMigrationException.class, exception -> {
                    assertThat(exception.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
                    assertThat(exception).hasNoCause();
                    assertThat(exception.getMessage()).doesNotContain("private timeout diagnostic");
                });
    }

    private record Progress(MetadataMigrationStage stage, int percent) {
    }

    private static MetadataTableDescriptor descriptor(String column) {
        return new MetadataTableDescriptor(
                "sample",
                List.of(new MetadataTableDescriptor.Column(
                        column, Types.BIGINT, "bigint", 64, 0, false, false)),
                List.of(column),
                List.of());
    }

    private static Connection connection(String product) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn(product);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.getTransactionIsolation()).thenReturn(Connection.TRANSACTION_READ_COMMITTED);
        when(connection.isReadOnly()).thenReturn(false);
        return connection;
    }
}
