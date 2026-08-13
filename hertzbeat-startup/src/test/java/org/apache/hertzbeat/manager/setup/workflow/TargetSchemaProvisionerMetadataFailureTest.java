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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.DriverPropertyInfo;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Logger;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;

class TargetSchemaProvisionerMetadataFailureTest {

    @Test
    void metadataProviderFailureIsSanitizedAtProvisioningBoundary() throws Exception {
        String jdbcUrl = "jdbc:metadata-failure://private.example.test/hertzbeat?password=secret-value";
        TargetSchemaBaseline baseline = TargetSchemaBaseline.load(MetadataDatabaseKind.MYSQL);
        Connection connection = currentSchemaConnection(baseline);
        Driver driver = new TestConnectionDriver(jdbcUrl, connection);
        DriverManager.registerDriver(driver);
        try {
            MetadataDatabaseConfiguration target = new MetadataDatabaseConfiguration(
                    MetadataDatabaseKind.MYSQL, jdbcUrl, "operator", "secret-value");

            assertThatThrownBy(() -> new FlywayTargetSchemaProvisioner().provision(target))
                    .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception -> {
                        assertThat(exception.failure()).isEqualTo(new TargetSchemaProvisioningFailure(
                                TargetSchemaProvisioningFailure.Phase.PRECONDITION,
                                TargetSchemaBaseline.VERSION,
                                "58000",
                                777));
                        assertThat(exception).hasNoCause();
                        assertThat(exception.getMessage())
                                .doesNotContain(jdbcUrl, "secret-value", "raw metadata diagnostic");
                    });
        } finally {
            DriverManager.deregisterDriver(driver);
        }
    }

    private static Connection currentSchemaConnection(TargetSchemaBaseline baseline) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        Statement historyStatement = mock(Statement.class);
        ResultSet tables = tableRows(baseline);
        ResultSet history = historyRow(baseline);
        when(connection.getMetaData()).thenReturn(metadata);
        when(connection.createStatement()).thenReturn(historyStatement);
        when(metadata.getTables(isNull(), isNull(), anyString(), any(String[].class)))
                .thenReturn(tables);
        when(historyStatement.executeQuery(anyString())).thenReturn(history);
        when(metadata.getColumns(isNull(), isNull(), anyString(), isNull()))
                .thenThrow(new SQLException("raw metadata diagnostic", "58000", 777));
        return connection;
    }

    private static ResultSet tableRows(TargetSchemaBaseline baseline) throws Exception {
        List<String> tables = new ArrayList<>(baseline.expectedTables());
        tables.add("flyway_schema_history");
        tables.add(TargetSchemaContract.TABLE);
        AtomicInteger row = new AtomicInteger(-1);
        ResultSet result = mock(ResultSet.class);
        when(result.next()).thenAnswer(ignored -> row.incrementAndGet() < tables.size());
        when(result.getString("TABLE_NAME")).thenAnswer(ignored -> tables.get(row.get()));
        return result;
    }

    private static ResultSet historyRow(TargetSchemaBaseline baseline) throws Exception {
        ResultSet result = mock(ResultSet.class);
        when(result.next()).thenReturn(true, false);
        when(result.getInt("installed_rank")).thenReturn(1);
        when(result.getString("version")).thenReturn(TargetSchemaBaseline.VERSION);
        when(result.getString("type")).thenReturn(TargetSchemaBaseline.TYPE);
        when(result.getString("script")).thenReturn(TargetSchemaBaseline.SCRIPT);
        when(result.getInt("checksum")).thenReturn(baseline.checksum());
        when(result.getBoolean("success")).thenReturn(true);
        return result;
    }

    private record TestConnectionDriver(String acceptedUrl, Connection connection) implements Driver {

        @Override
        public Connection connect(String url, Properties info) {
            return acceptsURL(url) ? connection : null;
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
