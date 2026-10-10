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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Normalized JDBC metadata used to compare two schemas on the same database vendor. */
record MetadataSchemaSnapshot(
        Set<Column> columns,
        Set<PrimaryKey> primaryKeys,
        Set<Index> indexes,
        Set<ForeignKey> foreignKeys) {

    static MetadataSchemaSnapshot capture(Connection connection) throws SQLException {
        DatabaseMetaData metadata = connection.getMetaData();
        Set<String> tables = tables(connection, metadata);
        Set<Column> columns = new HashSet<>();
        Set<PrimaryKey> primaryKeys = new HashSet<>();
        Set<Index> indexes = new HashSet<>();
        Set<ForeignKey> foreignKeys = new HashSet<>();
        for (String table : tables) {
            readColumns(connection, metadata, table, columns);
            readPrimaryKeys(connection, metadata, table, primaryKeys);
            readIndexes(connection, metadata, table, indexes);
            readForeignKeys(connection, metadata, table, foreignKeys);
        }
        return new MetadataSchemaSnapshot(columns, primaryKeys, indexes, foreignKeys);
    }

    private static Set<String> tables(Connection connection, DatabaseMetaData metadata) throws SQLException {
        Set<String> tables = new HashSet<>();
        try (ResultSet result = metadata.getTables(connection.getCatalog(), null, "hzb_%", new String[]{"TABLE"})) {
            while (result.next()) {
                tables.add(normalize(result.getString("TABLE_NAME")));
            }
        }
        return tables;
    }

    private static void readColumns(
            Connection connection, DatabaseMetaData metadata, String table, Set<Column> columns) throws SQLException {
        try (ResultSet result = metadata.getColumns(connection.getCatalog(), null, table, null)) {
            while (result.next()) {
                columns.add(new Column(
                        table,
                        normalize(result.getString("COLUMN_NAME")),
                        result.getInt("DATA_TYPE"),
                        normalize(result.getString("TYPE_NAME")),
                        result.getInt("COLUMN_SIZE"),
                        result.getInt("DECIMAL_DIGITS"),
                        result.getInt("NULLABLE"),
                        normalize(result.getString("COLUMN_DEF")),
                        normalize(result.getString("REMARKS")),
                        result.getInt("ORDINAL_POSITION")));
            }
        }
    }

    private static void readPrimaryKeys(
            Connection connection, DatabaseMetaData metadata, String table, Set<PrimaryKey> primaryKeys)
            throws SQLException {
        try (ResultSet result = metadata.getPrimaryKeys(connection.getCatalog(), null, table)) {
            while (result.next()) {
                primaryKeys.add(new PrimaryKey(
                        table,
                        normalize(result.getString("PK_NAME")),
                        result.getShort("KEY_SEQ"),
                        normalize(result.getString("COLUMN_NAME"))));
            }
        }
    }

    private static void readIndexes(
            Connection connection, DatabaseMetaData metadata, String table, Set<Index> indexes) throws SQLException {
        Map<String, IndexAccumulator> collected = new HashMap<>();
        try (ResultSet result = metadata.getIndexInfo(connection.getCatalog(), null, table, false, false)) {
            while (result.next()) {
                String name = normalize(result.getString("INDEX_NAME"));
                String column = normalize(result.getString("COLUMN_NAME"));
                if (name == null || column == null || result.getShort("TYPE") == DatabaseMetaData.tableIndexStatistic) {
                    continue;
                }
                String key = name + ':' + result.getBoolean("NON_UNIQUE");
                collected.computeIfAbsent(key,
                                ignored -> new IndexAccumulator(table, name, !resultBoolean(result, "NON_UNIQUE")))
                        .add(resultShort(result, "ORDINAL_POSITION"), column, normalize(resultString(result, "ASC_OR_DESC")));
            }
        }
        collected.values().stream().map(IndexAccumulator::build).forEach(indexes::add);
    }

    private static void readForeignKeys(
            Connection connection, DatabaseMetaData metadata, String table, Set<ForeignKey> foreignKeys)
            throws SQLException {
        try (ResultSet result = metadata.getImportedKeys(connection.getCatalog(), null, table)) {
            while (result.next()) {
                foreignKeys.add(new ForeignKey(
                        table,
                        normalize(result.getString("FK_NAME")),
                        result.getShort("KEY_SEQ"),
                        normalize(result.getString("FKCOLUMN_NAME")),
                        normalize(result.getString("PKTABLE_NAME")),
                        normalize(result.getString("PKCOLUMN_NAME")),
                        result.getShort("UPDATE_RULE"),
                        result.getShort("DELETE_RULE"),
                        result.getShort("DEFERRABILITY")));
            }
        }
    }

    private static boolean resultBoolean(ResultSet result, String column) {
        try {
            return result.getBoolean(column);
        } catch (SQLException exception) {
            throw new IllegalStateException("JDBC metadata result is incomplete", exception);
        }
    }

    private static short resultShort(ResultSet result, String column) {
        try {
            return result.getShort(column);
        } catch (SQLException exception) {
            throw new IllegalStateException("JDBC metadata result is incomplete", exception);
        }
    }

    private static String resultString(ResultSet result, String column) {
        try {
            return result.getString(column);
        } catch (SQLException exception) {
            throw new IllegalStateException("JDBC metadata result is incomplete", exception);
        }
    }

    private static String normalize(String value) {
        return value == null ? null : value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    record Column(
            String table,
            String name,
            int jdbcType,
            String typeName,
            int size,
            int scale,
            int nullable,
            String defaultValue,
            String remarks,
            int position) {
    }

    record PrimaryKey(String table, String name, short position, String column) {
    }

    record Index(String table, String name, boolean unique, List<IndexColumn> columns) {
    }

    record IndexColumn(short position, String name, String order) {
    }

    record ForeignKey(
            String table,
            String name,
            short position,
            String column,
            String referencedTable,
            String referencedColumn,
            short updateRule,
            short deleteRule,
            short deferrability) {
    }

    private static final class IndexAccumulator {
        private final String table;
        private final String name;
        private final boolean unique;
        private final List<IndexColumn> columns = new ArrayList<>();

        private IndexAccumulator(String table, String name, boolean unique) {
            this.table = table;
            this.name = name;
            this.unique = unique;
        }

        void add(short position, String column, String order) {
            columns.add(new IndexColumn(position, column, order));
        }

        Index build() {
            columns.sort(java.util.Comparator.comparingInt(IndexColumn::position));
            return new Index(table, name, unique, List.copyOf(columns));
        }
    }
}
