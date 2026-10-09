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

package org.apache.hertzbeat.manager.config;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationState;
import org.flywaydb.core.api.callback.BaseCallback;
import org.flywaydb.core.api.callback.Context;
import org.flywaydb.core.api.callback.Event;

/**
 * Removes one known obsolete index before the immutable H2 V180 conversion.
 * Only clean, pre-ORM 1.7.3 shapes qualify. This is not failed-migration recovery:
 * H2 DDL and subsequent migration failures can leave a partially changed database.
 */
public final class H2LegacyHistoryIndexCallback extends BaseCallback {
    private static final String SCHEMA = "PUBLIC";
    private static final String HISTORY_INDEX = "HISTORY_QUERY_INDEX";
    private static final List<String> LEGACY_INDEX_COLUMNS = List.of("MONITOR_ID", "APP", "METRICS", "METRIC");
    private static final Map<String, Integer> PRIOR_CHECKSUMS = Map.of(
            "160", -1084765426, "170", 1025542181, "172", -45972584, "173", -2037759056);
    private static final Map<String, Integer> MONITOR_TYPES = Map.ofEntries(
            Map.entry("ID", Types.BIGINT), Map.entry("APP", Types.VARCHAR), Map.entry("CREATOR", Types.VARCHAR),
            Map.entry("DESCRIPTION", Types.VARCHAR), Map.entry("GMT_CREATE", Types.TIMESTAMP),
            Map.entry("GMT_UPDATE", Types.TIMESTAMP), Map.entry("HOST", Types.VARCHAR), Map.entry("INTERVALS", Types.INTEGER),
            Map.entry("JOB_ID", Types.BIGINT), Map.entry("MODIFIER", Types.VARCHAR), Map.entry("NAME", Types.VARCHAR),
            Map.entry("STATUS", Types.TINYINT), Map.entry("ANNOTATIONS", Types.VARCHAR), Map.entry("LABELS", Types.VARCHAR),
            Map.entry("SCRAPE", Types.VARCHAR), Map.entry("TYPE", Types.TINYINT));
    private static final Map<String, Integer> HISTORY_TYPES = Map.ofEntries(
            Map.entry("ID", Types.BIGINT), Map.entry("APP", Types.VARCHAR), Map.entry("DOU", Types.DOUBLE),
            Map.entry("INSTANCE", Types.VARCHAR), Map.entry("INT32", Types.INTEGER), Map.entry("METRIC", Types.VARCHAR),
            Map.entry("METRIC_TYPE", Types.TINYINT), Map.entry("METRICS", Types.VARCHAR),
            Map.entry("MONITOR_ID", Types.BIGINT), Map.entry("STR", Types.VARCHAR), Map.entry("TIME", Types.BIGINT));
    private static final Map<String, String> REPLACEMENT_INDEXES = Map.of(
            "IDX_HZB_HISTORY_INSTANCE", "INSTANCE", "IDX_HZB_HISTORY_APP", "APP",
            "IDX_HZB_HISTORY_METRICS", "METRICS", "IDX_HZB_HISTORY_METRIC", "METRIC");
    // Hibernate 1.5 Bean Validation emits these checks on unchanged monitor fields.
    private static final Set<String> LEGACY_MONITOR_CHECKS = Set.of(
            "\"INTERVALS\">=10", "(\"STATUS\"<=4)AND(\"STATUS\">=0)");

    @Override
    public boolean supports(Event event, Context context) {
        if (event != Event.BEFORE_EACH_MIGRATE) {
            return false;
        }
        // Flyway probes supported events with a null context before executing callbacks.
        if (context == null) {
            return true;
        }
        var migration = context.getMigrationInfo();
        return migration != null && migration.getVersion() != null
                && "180".equals(migration.getVersion().getVersion()) && migration.getState() == MigrationState.PENDING;
    }

    @Override
    public boolean canHandleInTransaction(Event event, Context context) {
        return false;
    }

    @Override
    public void handle(Event event, Context context) {
        if (context == null || !supports(event, context)) {
            return;
        }
        try {
            Connection connection = context.getConnection();
            if (!"H2".equals(connection.getMetaData().getDatabaseProductName())) {
                return;
            }
            require(SCHEMA.equals(connection.getSchema())
                    && "flyway_schema_history".equals(context.getConfiguration().getTable()), "unknown schema/history table");
            require(Integer.valueOf(345412379).equals(context.getMigrationInfo().getChecksum()), "unexpected V180 checksum");
            verifyHistory(connection);
            int monitorWidth = verifyShape(connection);
            verifyDependencies(connection, monitorWidth);
            verifyMigrationMetadata(connection);
            boolean obsoleteIndex = verifyIndexes(connection);
            require((monitorWidth == 100) == obsoleteIndex, "index presence does not match the recognized source shape");
            verifyMonitorIndexes(connection, monitorWidth);
            // All read-only checks precede the sole mutation; V180 owns conversion and replacement indexes.
            if (obsoleteIndex) {
                try (var statement = connection.createStatement()) {
                    statement.execute("DROP INDEX \"PUBLIC\".\"HISTORY_QUERY_INDEX\"");
                }
            }
        } catch (SQLException exception) {
            throw new FlywayException("H2 pre-V180 compatibility check failed; automatic retry/repair is unsafe", exception);
        }
    }

    private static void verifyHistory(Connection connection) throws SQLException {
        var versions = new ArrayList<String>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT \"version\", \"type\", \"script\", \"checksum\", \"success\", \"installed_rank\" "
                        + "FROM \"PUBLIC\".\"flyway_schema_history\" ORDER BY \"installed_rank\"")) {
            while (rows.next()) {
                String version = rows.getString(1);
                require(rows.getBoolean(5), "failed migration history");
                if (version == null && "TABLE".equals(rows.getString(2)) && rows.getInt(6) == -1
                        && "".equals(rows.getString(3)) && rows.getObject(4) == null && versions.isEmpty()) {
                    continue; // Flyway 10's genuine schema-history creation marker is not a migration.
                }
                if (versions.isEmpty()) {
                    require("1".equals(version) && "BASELINE".equals(rows.getString(2))
                            && "<< Flyway Baseline >>".equals(rows.getString(3)) && rows.getObject(4) == null,
                            "unknown baseline");
                } else {
                    require(PRIOR_CHECKSUMS.containsKey(version) && "SQL".equals(rows.getString(2))
                            && ("V" + version + "__update_column.sql").equals(rows.getString(3))
                            && PRIOR_CHECKSUMS.get(version).equals(rows.getObject(4)), "unknown prior migration");
                }
                require(rows.getInt(6) == versions.size() + 1, "unknown history ordering");
                versions.add(version);
            }
        }
        require(versions.equals(List.of("1", "160", "170", "172", "173")), "expected clean successful history173");
    }

    private static int verifyShape(Connection connection) throws SQLException {
        var monitor = columns(connection, "HZB_MONITOR");
        var history = columns(connection, "HZB_HISTORY");
        require(monitor.keySet().equals(MONITOR_TYPES.keySet()) && history.keySet().equals(HISTORY_TYPES.keySet()),
                "unknown or partial pre-ORM shape");
        int identityWidth = monitor.get("HOST").size();
        require(Set.of(100, 255).contains(identityWidth), "unknown monitor identity shape");
        for (var field : MONITOR_TYPES.entrySet()) {
            String name = field.getKey();
            Column column = monitor.get(name);
            require(column.type() == field.getValue(), "unknown monitor column type: " + name);
            boolean nullable = !"ID".equals(name) && (!"STATUS".equals(name) || identityWidth == 255);
            require(column.nullable() == nullable, "unknown monitor nullability: " + name);
            if (column.type() == Types.VARCHAR) {
                int size = switch (name) {
                    case "HOST", "APP", "NAME" -> identityWidth;
                    case "LABELS", "ANNOTATIONS" -> 4096;
                    default -> 255;
                };
                require(column.size() == size, "unknown monitor column width: " + name);
            }
        }
        for (var field : HISTORY_TYPES.entrySet()) {
            String name = field.getKey();
            Column column = history.get(name);
            require(column.type() == field.getValue() && column.nullable() == !"ID".equals(name),
                    "unknown history column type/nullability: " + name);
            if (column.type() == Types.VARCHAR) {
                int size = switch (name) {
                    case "INSTANCE" -> 5000;
                    case "STR" -> 2048;
                    default -> 255;
                };
                require(column.size() == size, "unknown history column width: " + name);
            }
        }
        require(history.get("INSTANCE").size() == 5000 && history.get("INSTANCE").nullable()
                && history.get("MONITOR_ID").nullable(), "unknown legacy history labels/monitor shape");
        return identityWidth;
    }

    private static Map<String, Column> columns(Connection connection, String table) throws SQLException {
        var columns = new HashMap<String, Column>();
        var metadata = connection.getMetaData();
        String escape = metadata.getSearchStringEscape();
        require(escape != null && !escape.isEmpty(), "missing metadata pattern escape");
        String pattern = table.replace(escape, escape + escape).replace("_", escape + "_").replace("%", escape + "%");
        try (var rows = metadata.getColumns(connection.getCatalog(), SCHEMA, pattern, null)) {
            while (rows.next()) {
                verifyMetadataOwner(connection, rows, table);
                String name = rows.getString("COLUMN_NAME");
                require(name != null && columns.putIfAbsent(name, new Column(rows.getInt("DATA_TYPE"),
                        rows.getInt("COLUMN_SIZE"), rows.getInt("NULLABLE") == java.sql.DatabaseMetaData.columnNullable)) == null,
                        "duplicate or unnamed column metadata: " + table);
                String identity = "HZB_HISTORY".equals(table) && "ID".equals(name) ? "YES" : "NO";
                require(rows.getString("COLUMN_DEF") == null && "NO".equals(rows.getString("IS_GENERATEDCOLUMN"))
                        && identity.equals(rows.getString("IS_AUTOINCREMENT")), "unknown column default/generation: " + name);
            }
        }
        return columns;
    }

    private static void verifyMetadataOwner(Connection connection, java.sql.ResultSet rows, String table) throws SQLException {
        require(Objects.equals(connection.getCatalog(), rows.getString("TABLE_CAT"))
                && SCHEMA.equals(rows.getString("TABLE_SCHEM")) && table.equals(rows.getString("TABLE_NAME")),
                "ambiguous metadata owner: " + table);
    }

    private static void verifyMigrationMetadata(Connection connection) throws SQLException {
        var metadata = connection.getMetaData();
        // Immutable V180 uses unescaped patterns and null schema/catalog. Prove those lookups are unambiguous too.
        for (String table : List.of("HZB_MONITOR", "HZB_HISTORY", "HZB_ALERT_DEFINE_MONITOR_BIND",
                "HZB_COLLECTOR_MONITOR_BIND", "HZB_MONITOR_BIND", "HZB_STATUS_PAGE_INCIDENT_COMPONENT_BIND",
                "HZB_PUSH_METRICS", "HZB_PARAM", "HZB_PLUGIN_PARAM")) {
            try (var rows = metadata.getTables(null, null, table, null)) {
                boolean found = false;
                while (rows.next()) {
                    verifyMetadataOwner(connection, rows, table);
                    require(!found, "duplicate migration table metadata: " + table);
                    found = true;
                }
            }
        }
        for (var lookup : Map.of("HZB_MONITOR", List.of("INSTANCE", "HOST"),
                "HZB_HISTORY", List.of("MONITOR_ID", "METRIC_LABELS")).entrySet()) {
            for (String column : lookup.getValue()) {
                try (var rows = metadata.getColumns(null, null, lookup.getKey(), column)) {
                    boolean found = false;
                    while (rows.next()) {
                        verifyMetadataOwner(connection, rows, lookup.getKey());
                        require(column.equals(rows.getString("COLUMN_NAME")) && !found,
                                "ambiguous migration column metadata: " + column);
                        found = true;
                    }
                }
            }
        }
    }

    private static void verifyDependencies(Connection connection, int monitorWidth) throws SQLException {
        try (var statement = connection.createStatement()) {
            // Released fixtures use one application schema; external objects can reference the columns being converted.
            try (var rows = statement.executeQuery("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA "
                    + "WHERE SCHEMA_NAME NOT IN ('PUBLIC','INFORMATION_SCHEMA')")) {
                require(!rows.next(), "unsupported user schema/dependencies");
            }
            try (var rows = statement.executeQuery("SELECT SYNONYM_NAME FROM INFORMATION_SCHEMA.SYNONYMS")) {
                require(!rows.next(), "unhandled synonym dependency");
            }
            // An alias can be evidence of partial nontransactional conversion; do not infer safety from history alone.
            try (var rows = statement.executeQuery("SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES "
                    + "WHERE ROUTINE_SCHEMA='PUBLIC'")) {
                require(!rows.next(), "remaining alias or unknown routine");
            }
            try (var rows = statement.executeQuery("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS "
                    + "WHERE TABLE_SCHEMA='PUBLIC'")) {
                require(!rows.next(), "unhandled view dependency");
            }
            try (var rows = statement.executeQuery("SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS "
                    + "WHERE TRIGGER_SCHEMA='PUBLIC'")) {
                require(!rows.next(), "unhandled trigger dependency");
            }
            try (var rows = statement.executeQuery("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS "
                    + "WHERE INDEX_SCHEMA='PUBLIC' AND INDEX_NAME='HISTORY_QUERY_INDEX'")) {
                require(!rows.next(), "legacy index belongs to a constraint");
            }
            try (var rows = statement.executeQuery("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE "
                    + "WHERE TABLE_SCHEMA='PUBLIC' AND TABLE_NAME='HZB_HISTORY' AND COLUMN_NAME='MONITOR_ID'")) {
                require(!rows.next(), "unhandled monitor_id constraint");
            }
            try (var rows = statement.executeQuery("SELECT INDEX_NAME,TABLE_NAME FROM INFORMATION_SCHEMA.INDEXES "
                    + "WHERE INDEX_SCHEMA='PUBLIC'")) {
                while (rows.next()) {
                    String name = rows.getString(1);
                    if (HISTORY_INDEX.equals(name) || REPLACEMENT_INDEXES.containsKey(name)) {
                        require("HZB_HISTORY".equals(rows.getString(2)), "conflicting index owner: " + name);
                    }
                }
            }
        }
        verifyConstraints(connection, monitorWidth);
    }

    private static void verifyConstraints(Connection connection, int monitorWidth) throws SQLException {
        var monitorChecks = new ArrayList<String>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT t.TABLE_NAME,t.CONSTRAINT_TYPE,c.CHECK_CLAUSE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS t "
                        + "LEFT JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS c ON t.CONSTRAINT_SCHEMA=c.CONSTRAINT_SCHEMA "
                        + "AND t.CONSTRAINT_NAME=c.CONSTRAINT_NAME WHERE t.TABLE_SCHEMA='PUBLIC' "
                        + "AND t.TABLE_NAME IN ('HZB_HISTORY','HZB_MONITOR') AND t.CONSTRAINT_TYPE<>'PRIMARY KEY'")) {
            while (rows.next()) {
                require("HZB_MONITOR".equals(rows.getString(1)) && "CHECK".equals(rows.getString(2))
                        && rows.getString(3) != null, "unknown history/monitor constraint");
                String clause = rows.getString(3).replaceAll("\\s+", "");
                require(LEGACY_MONITOR_CHECKS.contains(clause), "unknown monitor check");
                monitorChecks.add(clause);
            }
        }
        require(monitorWidth == 100
                        ? monitorChecks.size() == 2 && Set.copyOf(monitorChecks).equals(LEGACY_MONITOR_CHECKS)
                        : monitorChecks.isEmpty(),
                "unknown monitor validation constraints");
    }

    private static boolean verifyIndexes(Connection connection) throws SQLException {
        String primaryIndex = primaryIndex(connection, "HZB_HISTORY");
        var primary = new ArrayList<String>();
        try (var rows = connection.getMetaData().getPrimaryKeys(connection.getCatalog(), SCHEMA, "HZB_HISTORY")) {
            while (rows.next()) {
                verifyMetadataOwner(connection, rows, "HZB_HISTORY");
                primary.add(rows.getString("COLUMN_NAME"));
            }
        }
        require(primary.equals(List.of("ID")), "unknown history primary key");
        var indexes = indexes(connection, "HZB_HISTORY");
        for (var entry : indexes.entrySet()) {
            String name = entry.getKey();
            Index index = entry.getValue();
            if (HISTORY_INDEX.equals(name)) {
                require(index.nonUnique() && index.columns().equals(LEGACY_INDEX_COLUMNS), "conflicting legacy index");
            } else if (REPLACEMENT_INDEXES.containsKey(name)) {
                require(index.nonUnique() && index.columns().equals(List.of(REPLACEMENT_INDEXES.get(name))),
                        "conflicting replacement index: " + name);
                // In this pre-ORM shape INSTANCE holds labels; renaming it would silently retarget this index.
                require(!"IDX_HZB_HISTORY_INSTANCE".equals(name), "replacement instance index on legacy labels");
            } else {
                require(name.equals(primaryIndex) && !index.nonUnique() && index.columns().equals(List.of("ID")),
                        "unhandled history index: " + name);
            }
        }
        return indexes.containsKey(HISTORY_INDEX);
    }

    private static void verifyMonitorIndexes(Connection connection, int monitorWidth) throws SQLException {
        String primaryIndex = primaryIndex(connection, "HZB_MONITOR");
        var indexes = indexes(connection, "HZB_MONITOR");
        require(indexes.keySet().equals(Set.of(primaryIndex, "MONITOR_QUERY_INDEX")), "unknown monitor indexes");
        var primary = indexes.get(primaryIndex);
        require(!primary.nonUnique() && primary.columns().equals(List.of("ID")), "unknown monitor primary key");
        var query = indexes.get("MONITOR_QUERY_INDEX");
        require(query.nonUnique() && query.columns().equals(monitorWidth == 100
                ? List.of("APP", "HOST", "NAME") : List.of("APP")), "unknown monitor query index");
    }

    private static String primaryIndex(Connection connection, String table) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='PUBLIC' "
                        + "AND TABLE_NAME='" + table + "' AND CONSTRAINT_TYPE='PRIMARY KEY'")) {
            require(rows.next(), "missing primary key: " + table);
            String index = rows.getString(1);
            require(index != null && !rows.next(), "unknown primary keys: " + table);
            return index;
        }
    }

    private static Map<String, Index> indexes(Connection connection, String table) throws SQLException {
        var indexes = new LinkedHashMap<String, Index>();
        try (var rows = connection.getMetaData().getIndexInfo(connection.getCatalog(), SCHEMA, table, false, false)) {
            while (rows.next()) {
                verifyMetadataOwner(connection, rows, table);
                if (rows.getShort("TYPE") == java.sql.DatabaseMetaData.tableIndexStatistic) {
                    continue;
                }
                require(rows.getShort("TYPE") == java.sql.DatabaseMetaData.tableIndexOther, "unknown index kind");
                String name = rows.getString("INDEX_NAME");
                var index = indexes.get(name);
                if (index == null) {
                    index = new Index(rows.getBoolean("NON_UNIQUE"), new ArrayList<>());
                    indexes.put(name, index);
                }
                require(rows.getInt("ORDINAL_POSITION") == index.columns().size() + 1, "unordered index metadata");
                require(rows.getBoolean("NON_UNIQUE") == index.nonUnique()
                        && rows.getString("FILTER_CONDITION") == null && "A".equals(rows.getString("ASC_OR_DESC")),
                        "unknown index definition: " + name);
                index.columns().add(rows.getString("COLUMN_NAME"));
            }
        }
        return indexes;
    }

    private static void require(boolean condition, String reason) {
        if (!condition) {
            throw new FlywayException("H2 pre-V180 compatibility refused: " + reason + "; no automatic repair/retry");
        }
    }

    private record Column(int type, int size, boolean nullable) { }

    private record Index(boolean nonUnique, List<String> columns) { }
}
