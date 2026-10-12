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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Captures only JDBC metadata that is stable across compatible drivers and vendor versions. */
final class JdbcTargetSchemaState {

    private JdbcTargetSchemaState() {
    }

    static SchemaState capture(
            Connection connection,
            MetadataDatabaseKind kind,
            Set<String> baselineTables) throws SQLException {
        return capture(connection, kind, baselineTables, TargetSchemaJdbcBudget.none());
    }

    static SchemaState capture(
            Connection connection,
            MetadataDatabaseKind kind,
            Set<String> baselineTables,
            int queryTimeoutSeconds) throws SQLException {
        return capture(connection, kind, baselineTables, TargetSchemaJdbcBudget.fixed(queryTimeoutSeconds));
    }

    static SchemaState capture(
            Connection connection,
            MetadataDatabaseKind kind,
            Set<String> baselineTables,
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
        FactCollector facts = new FactCollector();
        for (String table : baselineTables.stream().sorted().toList()) {
            facts.add("table", table);
            List<String> identities = readColumns(metadata, catalog, schema, table, kind, facts, budget);
            JdbcTargetSchemaObjectState.captureIdentityOwnership(
                    connection, kind, table, identities, budget, facts::add);
            readPrimaryKey(metadata, catalog, schema, table, facts, budget);
            readIndexes(metadata, catalog, schema, table, facts, budget);
            readForeignKeys(metadata, catalog, schema, table, facts, budget);
        }
        JdbcTargetSchemaObjectState.capture(
                connection, kind, baselineTables, budget, facts::add);
        return facts.build();
    }

    private static List<String> readColumns(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table,
            MetadataDatabaseKind kind,
            FactCollector facts,
            TargetSchemaJdbcBudget budget) throws SQLException {
        List<String> identities = new ArrayList<>();
        budget.check();
        try (ResultSet columns = metadata.getColumns(catalog, schema, table, null)) {
            budget.check();
            while (columns.next()) {
                budget.check();
                int jdbcType = columns.getInt("DATA_TYPE");
                int size = columns.getInt("COLUMN_SIZE");
                int scale = columns.getInt("DECIMAL_DIGITS");
                String column = normalize(columns.getString("COLUMN_NAME"));
                String generated = generated(columns.getString("IS_AUTOINCREMENT"));
                if (generated.equals("identity")) {
                    identities.add(column);
                }
                facts.add(
                        "column",
                        table,
                        column,
                        stableTypeFamily(kind, jdbcType, size, scale),
                        nullable(columns.getInt("NULLABLE")),
                        generated,
                        defaultValue(columns.getString("COLUMN_DEF")));
            }
        }
        budget.check();
        return List.copyOf(identities);
    }

    private static void readPrimaryKey(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table,
            FactCollector facts,
            TargetSchemaJdbcBudget budget) throws SQLException {
        OrderedColumns columns = new OrderedColumns();
        budget.check();
        try (ResultSet keys = metadata.getPrimaryKeys(catalog, schema, table)) {
            budget.check();
            while (keys.next()) {
                budget.check();
                columns.add(keys.getShort("KEY_SEQ"), normalize(keys.getString("COLUMN_NAME")));
            }
        }
        budget.check();
        if (!columns.isEmpty()) {
            facts.add("primary-key", table, columns.definition());
        }
    }

    private static void readIndexes(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table,
            FactCollector facts,
            TargetSchemaJdbcBudget budget) throws SQLException {
        Map<String, IndexColumns> indexes = new HashMap<>();
        int unnamedIndex = 0;
        budget.check();
        try (ResultSet rows = metadata.getIndexInfo(catalog, schema, table, false, false)) {
            budget.check();
            while (rows.next()) {
                budget.check();
                String name = rows.getString("INDEX_NAME");
                String column = rows.getString("COLUMN_NAME");
                short position = rows.getShort("ORDINAL_POSITION");
                if (column == null || rows.getShort("TYPE") == DatabaseMetaData.tableIndexStatistic) {
                    continue;
                }
                // Names group composite rows from one JDBC result only; the semantic fact never retains the name.
                if (name == null && position == 1) {
                    unnamedIndex++;
                }
                String group = name == null ? "<unnamed-index-" + unnamedIndex + '>' : normalize(name);
                boolean unique = !rows.getBoolean("NON_UNIQUE");
                indexes.computeIfAbsent(group, ignored -> new IndexColumns(unique))
                        .add(position, normalize(column));
            }
        }
        budget.check();
        indexes.values().forEach(index -> facts.add(
                "index", table, Boolean.toString(index.unique()), index.columns().definition()));
    }

    private static void readForeignKeys(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table,
            FactCollector facts,
            TargetSchemaJdbcBudget budget) throws SQLException {
        Map<String, ForeignKeyColumns> keys = new HashMap<>();
        int unnamedKey = 0;
        budget.check();
        try (ResultSet rows = metadata.getImportedKeys(catalog, schema, table)) {
            budget.check();
            while (rows.next()) {
                budget.check();
                String referencedTable = normalize(rows.getString("PKTABLE_NAME"));
                String name = rows.getString("FK_NAME");
                short position = rows.getShort("KEY_SEQ");
                String updateRule = foreignKeyRule(rows.getShort("UPDATE_RULE"));
                String deleteRule = foreignKeyRule(rows.getShort("DELETE_RULE"));
                String deferrability = foreignKeyDeferrability(rows.getShort("DEFERRABILITY"));
                // As with indexes, the provider name only groups rows and is absent from the persisted definition.
                if (name == null && position == 1) {
                    unnamedKey++;
                }
                String group = name == null ? "<unnamed-key-" + unnamedKey + '>' : normalize(name);
                keys.computeIfAbsent(group, ignored ->
                                new ForeignKeyColumns(referencedTable, updateRule, deleteRule, deferrability))
                        .add(
                                position,
                                normalize(rows.getString("FKCOLUMN_NAME")),
                                normalize(rows.getString("PKCOLUMN_NAME")));
            }
        }
        budget.check();
        keys.values().forEach(key -> facts.add(
                "foreign-key", table, key.localColumns(), key.referencedTable(), key.referencedColumns(),
                key.updateRule(), key.deleteRule(), key.deferrability()));
    }

    private static String stableTypeFamily(
            MetadataDatabaseKind kind,
            int jdbcType,
            int size,
            int scale) {
        return switch (jdbcType) {
            case Types.BOOLEAN -> "boolean";
            case Types.BIT -> kind == MetadataDatabaseKind.MYSQL ? "boolean" : "binary-bit(" + size + ')';
            case Types.TINYINT -> kind == MetadataDatabaseKind.MYSQL && size == 1 ? "boolean" : "tinyint";
            case Types.SMALLINT -> "smallint";
            case Types.INTEGER -> "integer";
            case Types.BIGINT -> "bigint";
            case Types.NUMERIC, Types.DECIMAL -> "decimal(" + size + ',' + scale + ')';
            case Types.REAL -> "real";
            case Types.FLOAT -> "float";
            case Types.DOUBLE -> "double";
            case Types.CHAR, Types.NCHAR, Types.VARCHAR, Types.NVARCHAR -> "character(" + size + ')';
            case Types.LONGVARCHAR, Types.LONGNVARCHAR, Types.CLOB, Types.NCLOB -> "large-text";
            case Types.BINARY, Types.VARBINARY -> "binary(" + size + ')';
            case Types.LONGVARBINARY, Types.BLOB -> "large-binary";
            case Types.DATE -> "date";
            case Types.TIME, Types.TIME_WITH_TIMEZONE -> "time";
            case Types.TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE -> "timestamp";
            default -> "jdbc-type(" + jdbcType + ')';
        };
    }

    private static String nullable(int value) throws SQLException {
        return switch (value) {
            case DatabaseMetaData.columnNoNulls -> "required";
            case DatabaseMetaData.columnNullable -> "nullable";
            default -> throw new SQLException("Target schema column nullability is unknown", "55000");
        };
    }

    private static String generated(String value) throws SQLException {
        return switch (normalize(value)) {
            case "yes" -> "identity";
            case "no", "" -> "not-identity";
            default -> throw new SQLException("Target schema identity metadata is unknown", "55000");
        };
    }

    private static String defaultValue(String value) {
        return value == null ? "no-default" : "default=" + value.strip();
    }

    private static String foreignKeyRule(short value) throws SQLException {
        return switch (value) {
            case DatabaseMetaData.importedKeyCascade -> "cascade";
            case DatabaseMetaData.importedKeyRestrict -> "restrict";
            case DatabaseMetaData.importedKeySetNull -> "set-null";
            case DatabaseMetaData.importedKeyNoAction -> "no-action";
            case DatabaseMetaData.importedKeySetDefault -> "set-default";
            default -> throw new SQLException("Target schema foreign-key rule is unknown", "55000");
        };
    }

    private static String foreignKeyDeferrability(short value) throws SQLException {
        return switch (value) {
            case DatabaseMetaData.importedKeyInitiallyDeferred -> "initially-deferred";
            case DatabaseMetaData.importedKeyInitiallyImmediate -> "initially-immediate";
            case DatabaseMetaData.importedKeyNotDeferrable -> "not-deferrable";
            default -> throw new SQLException("Target schema foreign-key deferrability is unknown", "55000");
        };
    }

    private static String normalize(String value) {
        return value == null ? "<unnamed>" : value.toLowerCase(Locale.ROOT);
    }

    record SchemaState(Map<String, Integer> facts) {

        SchemaState {
            facts = Map.copyOf(facts);
        }
    }

    private static final class FactCollector {

        private final Map<String, Integer> facts = new TreeMap<>();

        void add(String... parts) {
            facts.merge(String.join("|", parts), 1, Integer::sum);
        }

        SchemaState build() {
            return new SchemaState(facts);
        }
    }

    private static class OrderedColumns {

        private final Map<Short, String> columns = new TreeMap<>();

        void add(short position, String column) {
            columns.put(position, column);
        }

        boolean isEmpty() {
            return columns.isEmpty();
        }

        String definition() {
            return String.join(",", columns.values());
        }
    }

    private static final class IndexColumns {

        private final boolean unique;
        private final OrderedColumns columns = new OrderedColumns();

        private IndexColumns(boolean unique) {
            this.unique = unique;
        }

        void add(short position, String column) {
            columns.add(position, column);
        }

        boolean unique() {
            return unique;
        }

        OrderedColumns columns() {
            return columns;
        }
    }

    private static final class ForeignKeyColumns {

        private final String referencedTable;
        private final String updateRule;
        private final String deleteRule;
        private final String deferrability;
        private final OrderedColumns localColumns = new OrderedColumns();
        private final OrderedColumns referencedColumns = new OrderedColumns();

        private ForeignKeyColumns(
                String referencedTable, String updateRule, String deleteRule, String deferrability) {
            this.referencedTable = referencedTable;
            this.updateRule = updateRule;
            this.deleteRule = deleteRule;
            this.deferrability = deferrability;
        }

        void add(short position, String localColumn, String referencedColumn) {
            localColumns.add(position, localColumn);
            referencedColumns.add(position, referencedColumn);
        }

        String localColumns() {
            return localColumns.definition();
        }

        String referencedTable() {
            return referencedTable;
        }

        String referencedColumns() {
            return referencedColumns.definition();
        }

        String updateRule() {
            return "update=" + updateRule;
        }

        String deleteRule() {
            return "delete=" + deleteRule;
        }

        String deferrability() {
            return "deferrability=" + deferrability;
        }
    }
}
