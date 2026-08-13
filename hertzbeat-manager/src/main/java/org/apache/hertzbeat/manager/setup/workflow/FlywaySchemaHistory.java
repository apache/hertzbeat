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
    private static final Set<String> MYSQL_HISTORY_INDEXES =
            Set.of("primary", "flyway_schema_history_s_idx");
    private static final Set<String> MYSQL_CONTRACT_INDEXES = Set.of("primary");
    private static final Set<String> POSTGRESQL_HISTORY_INDEXES =
            Set.of("flyway_schema_history_pk", "flyway_schema_history_s_idx");
    private static final Set<String> POSTGRESQL_CONTRACT_INDEXES =
            Set.of("flyway_schema_contract_pk");
    private final MetadataDatabaseKind kind;

    FlywaySchemaHistory(MetadataDatabaseKind kind) {
        this.kind = kind;
    }

    boolean isCurrent(Connection connection, TargetSchemaBaseline baseline) throws SQLException {
        return isCurrent(connection, baseline, TargetSchemaJdbcBudget.none());
    }

    boolean isCurrent(
            Connection connection, TargetSchemaBaseline baseline, int queryTimeoutSeconds) throws SQLException {
        return isCurrent(connection, baseline, TargetSchemaJdbcBudget.fixed(queryTimeoutSeconds));
    }

    boolean isCurrent(
            Connection connection,
            TargetSchemaBaseline baseline,
            TargetSchemaJdbcBudget budget) throws SQLException {
        Set<String> currentTables = currentBaselineTables(connection, budget);
        if (!currentTables.contains(TABLE)) {
            return false;
        }
        String sql = "SELECT installed_rank, version, type, script, checksum, success FROM " + TABLE;
        try (Statement statement = connection.createStatement()) {
            budget.apply(statement);
            try (ResultSet result = statement.executeQuery(sql)) {
                budget.check();
                if (!result.next()) {
                    throw unexpectedTargetState();
                }
                budget.check();
                boolean current = result.getInt("installed_rank") == 1
                        && TargetSchemaBaseline.VERSION.equals(result.getString("version"))
                        && TargetSchemaBaseline.TYPE.equals(result.getString("type"))
                        && TargetSchemaBaseline.SCRIPT.equals(result.getString("script"))
                        && baseline.checksum() == result.getInt("checksum")
                        && !result.wasNull()
                        && result.getBoolean("success");
                budget.check();
                if (!current || result.next() || !currentTables.contains(TargetSchemaContract.TABLE)
                        || !currentTables.containsAll(baseline.expectedTables())
                        || !new TargetSchemaContract(kind)
                                .matches(connection, baseline.expectedTables(), budget)) {
                    throw unexpectedTargetState();
                }
                return true;
            }
        }
    }

    void requireEmptyTarget(Connection connection) throws SQLException {
        requireEmptyTarget(connection, TargetSchemaJdbcBudget.none());
    }

    void requireEmptyTarget(Connection connection, TargetSchemaJdbcBudget budget) throws SQLException {
        if (!catalogSchemaObjects(connection, budget).isEmpty()) {
            throw unexpectedTargetState();
        }
    }

    void record(
            Connection connection,
            TargetSchemaBaseline baseline,
            String installedBy,
            int executionTimeMillis) throws SQLException {
        record(connection, baseline, installedBy, executionTimeMillis, TargetSchemaJdbcBudget.none());
    }

    void record(
            Connection connection,
            TargetSchemaBaseline baseline,
            String installedBy,
            int executionTimeMillis,
            TargetSchemaJdbcBudget budget) throws SQLException {
        new TargetSchemaContract(kind).record(connection, baseline.expectedTables(), budget);
        try (Statement statement = connection.createStatement()) {
            for (String sql : createStatements()) {
                budget.apply(statement);
                statement.execute(sql);
            }
        }
        String insert = "INSERT INTO " + TABLE
                + " (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)"
                + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(insert)) {
            budget.apply(statement);
            statement.setInt(1, 1);
            statement.setString(2, TargetSchemaBaseline.VERSION);
            statement.setString(3, TargetSchemaBaseline.DESCRIPTION);
            statement.setString(4, TargetSchemaBaseline.TYPE);
            statement.setString(5, TargetSchemaBaseline.SCRIPT);
            statement.setInt(6, baseline.checksum());
            statement.setString(7, abbreviate(installedBy, 100));
            statement.setInt(8, executionTimeMillis);
            statement.setBoolean(9, true);
            budget.apply(statement);
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

    private Set<String> currentBaselineTables(
            Connection connection, TargetSchemaJdbcBudget budget) throws SQLException {
        return catalogSchemaTables(connection, budget);
    }

    Set<String> catalogSchemaTables(
            Connection connection, TargetSchemaJdbcBudget budget) throws SQLException {
        return readCatalogSchemaObjects(connection, new String[]{"TABLE"}, budget).stream()
                .map(CatalogObject::name)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    Set<CatalogObject> catalogSchemaObjects(
            Connection connection, TargetSchemaJdbcBudget budget) throws SQLException {
        return readCatalogSchemaObjects(connection, null, budget);
    }

    boolean hasExactHousekeepingIndexes(
            Connection connection, TargetSchemaJdbcBudget budget) throws SQLException {
        budget.check();
        DatabaseMetaData metadata = connection.getMetaData();
        budget.check();
        String catalog = connection.getCatalog();
        budget.check();
        String schema = null;
        if (kind == MetadataDatabaseKind.POSTGRESQL) {
            schema = connection.getSchema();
            budget.check();
        }
        Set<String> historyIndexes = readIndexes(metadata, catalog, schema, TABLE, budget);
        Set<String> contractIndexes =
                readIndexes(metadata, catalog, schema, TargetSchemaContract.TABLE, budget);
        return hasExactHousekeepingIndexes(historyIndexes, contractIndexes);
    }

    boolean hasExactHousekeepingIndexes(
            Set<String> historyIndexes, Set<String> contractIndexes) {
        Set<String> expectedHistory = kind == MetadataDatabaseKind.MYSQL
                ? MYSQL_HISTORY_INDEXES : POSTGRESQL_HISTORY_INDEXES;
        Set<String> expectedContract = kind == MetadataDatabaseKind.MYSQL
                ? MYSQL_CONTRACT_INDEXES : POSTGRESQL_CONTRACT_INDEXES;
        return expectedHistory.equals(normalizeIndexes(historyIndexes))
                && expectedContract.equals(normalizeIndexes(contractIndexes));
    }

    private static Set<String> readIndexes(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table,
            TargetSchemaJdbcBudget budget) throws SQLException {
        Set<String> indexes = new HashSet<>();
        budget.check();
        try (ResultSet rows = metadata.getIndexInfo(catalog, schema, table, false, false)) {
            budget.check();
            while (rows.next()) {
                budget.check();
                short type = rows.getShort("TYPE");
                budget.check();
                String name = rows.getString("INDEX_NAME");
                budget.check();
                if (type != DatabaseMetaData.tableIndexStatistic && name != null) {
                    indexes.add(name.toLowerCase(Locale.ROOT));
                }
            }
        }
        budget.check();
        return Set.copyOf(indexes);
    }

    private static Set<String> normalizeIndexes(Set<String> indexes) {
        return indexes.stream()
                .map(index -> index.toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    private Set<CatalogObject> readCatalogSchemaObjects(
            Connection connection,
            String[] types,
            TargetSchemaJdbcBudget budget) throws SQLException {
        budget.check();
        DatabaseMetaData metadata = connection.getMetaData();
        budget.check();
        String catalog = connection.getCatalog();
        budget.check();
        String schema = null;
        if (kind == MetadataDatabaseKind.POSTGRESQL) {
            schema = connection.getSchema();
            budget.check();
        }
        Set<CatalogObject> catalogObjects = new HashSet<>();
        try (ResultSet rows = metadata.getTables(catalog, schema, "%", types)) {
            budget.check();
            while (rows.next()) {
                budget.check();
                String name = rows.getString("TABLE_NAME");
                budget.check();
                String type = types == null ? rows.getString("TABLE_TYPE") : types[0];
                budget.check();
                if (name == null || type == null) {
                    throw unexpectedTargetState();
                }
                catalogObjects.add(new CatalogObject(
                        name.toLowerCase(Locale.ROOT), type.toUpperCase(Locale.ROOT)));
            }
        }
        budget.check();
        return Set.copyOf(catalogObjects);
    }

    private static String abbreviate(String value, int maximumLength) {
        return value.length() <= maximumLength ? value : value.substring(0, maximumLength);
    }

    private static SQLException unexpectedTargetState() {
        return new SQLException("Target schema is not empty or does not contain the current baseline", "55000");
    }

    record CatalogObject(String name, String type) {

        CatalogObject {
            if (name == null || name.isBlank() || type == null || type.isBlank()) {
                throw new IllegalArgumentException("Catalog object fields must not be blank");
            }
            name = name.toLowerCase(Locale.ROOT);
            type = type.toUpperCase(Locale.ROOT);
        }
    }
}
