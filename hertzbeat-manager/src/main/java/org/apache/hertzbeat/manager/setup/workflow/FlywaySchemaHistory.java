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

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Owns the Flyway-compatible history layout and current-baseline marker. */
final class FlywaySchemaHistory {

    private static final String TABLE = "flyway_schema_history";
    private final MetadataDatabaseKind kind;

    FlywaySchemaHistory(MetadataDatabaseKind kind) {
        this.kind = kind;
    }

    boolean isCurrent(Connection connection, TargetSchemaBaseline baseline) throws SQLException {
        return isCurrent(connection, baseline, 0);
    }

    boolean isCurrent(
            Connection connection, TargetSchemaBaseline baseline, int queryTimeoutSeconds) throws SQLException {
        Set<String> currentTables = currentBaselineTables(connection);
        if (!currentTables.contains(TABLE)) {
            return false;
        }
        String sql = "SELECT installed_rank, version, type, script, checksum, success FROM " + TABLE;
        try (Statement statement = connection.createStatement()) {
            if (queryTimeoutSeconds > 0) {
                statement.setQueryTimeout(queryTimeoutSeconds);
            }
            try (ResultSet result = statement.executeQuery(sql)) {
                if (!result.next()) {
                    throw unexpectedTargetState();
                }
                boolean current = result.getInt("installed_rank") == 1
                        && TargetSchemaBaseline.VERSION.equals(result.getString("version"))
                        && TargetSchemaBaseline.TYPE.equals(result.getString("type"))
                        && TargetSchemaBaseline.SCRIPT.equals(result.getString("script"))
                        && baseline.checksum() == result.getInt("checksum")
                        && !result.wasNull()
                        && result.getBoolean("success");
                if (!current || result.next() || !currentTables.contains(TargetSchemaContract.TABLE)
                        || !currentTables.containsAll(baseline.expectedTables())
                        || !new TargetSchemaContract(kind)
                                .matches(connection, baseline.expectedTables(), queryTimeoutSeconds)) {
                    throw unexpectedTargetState();
                }
                return true;
            }
        }
    }

    void requireEmptyTarget(Connection connection) throws SQLException {
        if (!currentCatalogSchemaObjects(connection).isEmpty()) {
            throw unexpectedTargetState();
        }
    }

    void record(
            Connection connection,
            TargetSchemaBaseline baseline,
            String installedBy,
            int executionTimeMillis) throws SQLException {
        new TargetSchemaContract(kind).record(connection, baseline.expectedTables());
        try (Statement statement = connection.createStatement()) {
            for (String sql : createStatements()) {
                statement.execute(sql);
            }
        }
        String insert = "INSERT INTO " + TABLE
                + " (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)"
                + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(insert)) {
            statement.setInt(1, 1);
            statement.setString(2, TargetSchemaBaseline.VERSION);
            statement.setString(3, TargetSchemaBaseline.DESCRIPTION);
            statement.setString(4, TargetSchemaBaseline.TYPE);
            statement.setString(5, TargetSchemaBaseline.SCRIPT);
            statement.setInt(6, baseline.checksum());
            statement.setString(7, abbreviate(installedBy, 100));
            statement.setInt(8, executionTimeMillis);
            statement.setBoolean(9, true);
            statement.executeUpdate();
        }
    }

    private String[] createStatements() {
        String table = switch (kind) {
            case MYSQL -> "CREATE TABLE " + TABLE + " ("
                    + "installed_rank INT NOT NULL, version VARCHAR(50), description VARCHAR(200) NOT NULL, "
                    + "type VARCHAR(20) NOT NULL, script VARCHAR(1000) NOT NULL, checksum INT, "
                    + "installed_by VARCHAR(100) NOT NULL, installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                    + "execution_time INT NOT NULL, success BOOL NOT NULL, "
                    + "CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank)) ENGINE=InnoDB";
            case POSTGRESQL -> "CREATE TABLE " + TABLE + " ("
                    + "installed_rank INT NOT NULL, version VARCHAR(50), description VARCHAR(200) NOT NULL, "
                    + "type VARCHAR(20) NOT NULL, script VARCHAR(1000) NOT NULL, checksum INTEGER, "
                    + "installed_by VARCHAR(100) NOT NULL, installed_on TIMESTAMP NOT NULL DEFAULT now(), "
                    + "execution_time INTEGER NOT NULL, success BOOLEAN NOT NULL, "
                    + "CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank))";
            case H2 -> throw new IllegalArgumentException("H2 has no external target schema history");
        };
        return new String[]{table, "CREATE INDEX flyway_schema_history_s_idx ON " + TABLE + " (success)"};
    }

    private Set<String> currentBaselineTables(Connection connection) throws SQLException {
        return currentCatalogSchemaObjects(connection, new String[]{"TABLE"});
    }

    private Set<String> currentCatalogSchemaObjects(Connection connection) throws SQLException {
        return currentCatalogSchemaObjects(connection, null);
    }

    private Set<String> currentCatalogSchemaObjects(Connection connection, String[] types) throws SQLException {
        DatabaseMetaData metadata = connection.getMetaData();
        String schema = kind == MetadataDatabaseKind.POSTGRESQL ? connection.getSchema() : null;
        Set<String> names = new HashSet<>();
        try (ResultSet objects = metadata.getTables(connection.getCatalog(), schema, "%", types)) {
            while (objects.next()) {
                names.add(objects.getString("TABLE_NAME").toLowerCase(Locale.ROOT));
            }
        }
        return Set.copyOf(names);
    }

    private static String abbreviate(String value, int maximumLength) {
        return value.length() <= maximumLength ? value : value.substring(0, maximumLength);
    }

    private static SQLException unexpectedTargetState() {
        return new SQLException("Target schema is not empty or does not contain the current baseline", "55000");
    }
}
