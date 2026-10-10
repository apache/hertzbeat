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
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Reads the exact application-table, column, primary-key, and foreign-key inventory. */
final class MetadataSchemaInventory {

    private static final Set<String> HOUSEKEEPING_TABLES =
            Set.of("flyway_schema_history", TargetSchemaContract.TABLE);
    private static final String[] OBJECT_TYPES = {"TABLE", "VIEW", "MATERIALIZED VIEW"};

    private final Map<String, MetadataTableDescriptor> tables;
    private final MetadataDatabaseKind kind;

    private MetadataSchemaInventory(
            Map<String, MetadataTableDescriptor> tables,
            MetadataDatabaseKind kind) {
        this.tables = Map.copyOf(tables);
        this.kind = kind;
    }

    static MetadataSchemaInventory capture(
            Connection connection,
            Set<String> expectedTables,
            MetadataDatabaseKind kind,
            MigrationDeadline deadline) throws SQLException {
        DatabaseMetaData metadata = connection.getMetaData();
        String catalog = connection.getCatalog();
        String schema = connection.getSchema();
        Set<String> normalizedExpected = expectedTables.stream()
                .map(MetadataSchemaInventory::normalize)
                .collect(Collectors.toUnmodifiableSet());
        Set<String> actualObjects = readObjects(metadata, catalog, schema);
        if (!actualObjects.containsAll(normalizedExpected)
                || !normalizedExpected.containsAll(withoutHousekeeping(actualObjects))) {
            throw new SQLException("Application schema inventory differs", "55000");
        }
        Map<String, MetadataTableDescriptor> descriptors = new TreeMap<>();
        for (String table : normalizedExpected.stream().sorted().toList()) {
            deadline.check();
            descriptors.put(table, descriptor(metadata, catalog, schema, table));
        }
        return new MetadataSchemaInventory(descriptors, kind);
    }

    List<MetadataTableDescriptor> foreignKeyOrder() throws SQLException {
        Map<String, Integer> incoming = new HashMap<>();
        Map<String, List<String>> children = new HashMap<>();
        tables.keySet().forEach(table -> incoming.put(table, 0));
        for (MetadataTableDescriptor table : tables.values()) {
            for (MetadataTableDescriptor.ForeignKey key : table.foreignKeys()) {
                if (key.referencedTable().equals(table.name())) {
                    continue;
                }
                if (!tables.containsKey(key.referencedTable())) {
                    throw new SQLException("Foreign key references another schema", "55000");
                }
                incoming.compute(table.name(), (ignored, count) -> count + 1);
                children.computeIfAbsent(key.referencedTable(), ignored -> new ArrayList<>()).add(table.name());
            }
        }
        PriorityQueue<String> ready = new PriorityQueue<>();
        incoming.forEach((table, count) -> {
            if (count == 0) {
                ready.add(table);
            }
        });
        List<MetadataTableDescriptor> ordered = new ArrayList<>();
        while (!ready.isEmpty()) {
            String parent = ready.remove();
            ordered.add(tables.get(parent));
            for (String child : children.getOrDefault(parent, List.of()).stream().sorted().toList()) {
                int count = incoming.compute(child, (ignored, current) -> current - 1);
                if (count == 0) {
                    ready.add(child);
                }
            }
        }
        if (ordered.size() != tables.size()) {
            throw new SQLException("Application foreign keys contain a cycle", "55000");
        }
        return List.copyOf(ordered);
    }

    boolean hasSamePortableShape(MetadataSchemaInventory other) {
        if (!tables.keySet().equals(other.tables.keySet())) {
            return false;
        }
        return tables.entrySet().stream()
                .allMatch(entry -> entry.getValue()
                        .hasSamePortableShape(other.tables.get(entry.getKey()), kind, other.kind));
    }

    MetadataTableDescriptor table(String name) {
        return tables.get(name);
    }

    private static Set<String> readObjects(DatabaseMetaData metadata, String catalog, String schema)
            throws SQLException {
        HashSet<String> objects = new HashSet<>();
        try (ResultSet rows = metadata.getTables(catalog, schema, "%", OBJECT_TYPES)) {
            while (rows.next()) {
                objects.add(normalize(rows.getString("TABLE_NAME")));
            }
        }
        return Set.copyOf(objects);
    }

    private static Set<String> withoutHousekeeping(Set<String> names) {
        HashSet<String> application = new HashSet<>(names);
        application.removeAll(HOUSEKEEPING_TABLES);
        return Set.copyOf(application);
    }

    private static MetadataTableDescriptor descriptor(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table) throws SQLException {
        List<MetadataTableDescriptor.Column> columns = readColumns(metadata, catalog, schema, table);
        List<String> primaryKey = readPrimaryKey(metadata, catalog, schema, table);
        List<MetadataTableDescriptor.ForeignKey> foreignKeys = readForeignKeys(metadata, catalog, schema, table);
        if (columns.isEmpty() || primaryKey.isEmpty()) {
            throw new SQLException("Application table is missing columns or primary key", "55000");
        }
        return new MetadataTableDescriptor(table, columns, primaryKey, foreignKeys);
    }

    private static List<MetadataTableDescriptor.Column> readColumns(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table) throws SQLException {
        Map<Integer, MetadataTableDescriptor.Column> columns = new TreeMap<>();
        try (ResultSet rows = metadata.getColumns(catalog, schema, table, null)) {
            while (rows.next()) {
                String autoIncrement = rows.getString("IS_AUTOINCREMENT");
                columns.put(rows.getInt("ORDINAL_POSITION"), new MetadataTableDescriptor.Column(
                        rows.getString("COLUMN_NAME"),
                        rows.getInt("DATA_TYPE"),
                        rows.getString("TYPE_NAME"),
                        rows.getInt("COLUMN_SIZE"),
                        rows.getInt("DECIMAL_DIGITS"),
                        rows.getInt("NULLABLE") == DatabaseMetaData.columnNullable,
                        "YES".equalsIgnoreCase(autoIncrement)));
            }
        }
        return List.copyOf(columns.values());
    }

    private static List<String> readPrimaryKey(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table) throws SQLException {
        Map<Short, String> columns = new TreeMap<>();
        try (ResultSet rows = metadata.getPrimaryKeys(catalog, schema, table)) {
            while (rows.next()) {
                columns.put(rows.getShort("KEY_SEQ"), normalize(rows.getString("COLUMN_NAME")));
            }
        }
        return List.copyOf(columns.values());
    }

    private static List<MetadataTableDescriptor.ForeignKey> readForeignKeys(
            DatabaseMetaData metadata,
            String catalog,
            String schema,
            String table) throws SQLException {
        Map<String, ForeignKeyBuilder> keys = new LinkedHashMap<>();
        int unnamed = 0;
        try (ResultSet rows = metadata.getImportedKeys(catalog, schema, table)) {
            while (rows.next()) {
                String keyName = rows.getString("FK_NAME");
                if (keyName == null && rows.getShort("KEY_SEQ") == 1) {
                    unnamed++;
                }
                String group = keyName == null ? "unnamed-" + unnamed : normalize(keyName);
                String referencedTable = normalize(rows.getString("PKTABLE_NAME"));
                keys.computeIfAbsent(group, ignored -> new ForeignKeyBuilder(referencedTable))
                        .add(
                                rows.getShort("KEY_SEQ"),
                                normalize(rows.getString("FKCOLUMN_NAME")),
                                normalize(rows.getString("PKCOLUMN_NAME")));
            }
        }
        return keys.values().stream()
                .map(ForeignKeyBuilder::build)
                .sorted(Comparator.comparing(MetadataTableDescriptor.ForeignKey::referencedTable)
                        .thenComparing(key -> String.join(",", key.columns())))
                .toList();
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static final class ForeignKeyBuilder {

        private final String referencedTable;
        private final Map<Short, String> columns = new TreeMap<>();
        private final Map<Short, String> referencedColumns = new TreeMap<>();

        private ForeignKeyBuilder(String referencedTable) {
            this.referencedTable = referencedTable;
        }

        void add(short position, String column, String referencedColumn) {
            columns.put(position, column);
            referencedColumns.put(position, referencedColumn);
        }

        MetadataTableDescriptor.ForeignKey build() {
            return new MetadataTableDescriptor.ForeignKey(
                    List.copyOf(columns.values()), referencedTable, List.copyOf(referencedColumns.values()));
        }
    }
}
