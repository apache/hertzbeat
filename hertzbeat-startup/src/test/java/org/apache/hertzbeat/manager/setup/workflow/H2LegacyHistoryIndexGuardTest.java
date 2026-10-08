/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.config.H2LegacyHistoryIndexCallback;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.callback.Context;
import org.flywaydb.core.api.callback.Event;
import org.flywaydb.core.api.migration.JavaMigration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/** Synthetic guard contracts; complete released-source upgrade proofs remain separate. */
class H2LegacyHistoryIndexGuardTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void removesOnlyTheRecognizedIndexUsingGenuinePriorMigrationHistory() throws Exception {
        String url = prepareFixture();
        try (var connection = DriverManager.getConnection(url, "sa", "")) {
            var historyBefore = rows(connection, "SELECT * FROM \"flyway_schema_history\" ORDER BY \"installed_rank\"");
            var dataBefore = rows(connection, "SELECT * FROM HZB_HISTORY ORDER BY ID");
            new H2LegacyHistoryIndexCallback().handle(Event.BEFORE_EACH_MIGRATE, context(url, connection));
            assertThat(rows(connection, "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.INDEXES "
                    + "WHERE INDEX_NAME='HISTORY_QUERY_INDEX'")).isEmpty();
            assertThat(rows(connection, "SELECT * FROM HZB_HISTORY ORDER BY ID")).isEqualTo(dataBefore);
            assertThat(rows(connection, "SELECT * FROM \"flyway_schema_history\" ORDER BY \"installed_rank\""))
                    .isEqualTo(historyBefore);
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unsafeDefinitions")
    void refusesUnknownDependenciesBeforeChangingTheDatabase(String name, List<String> changes) throws Exception {
        String url = prepareFixture();
        try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
            for (String change : changes) {
                statement.execute(change);
            }
            var before = rows(connection, "SCRIPT");
            assertThatThrownBy(() -> new H2LegacyHistoryIndexCallback().handle(
                    Event.BEFORE_EACH_MIGRATE, context(url, connection))).hasMessageContaining("compatibility refused");
            assertThat(rows(connection, "SCRIPT")).isEqualTo(before);
        }
    }

    @ParameterizedTest(name = "V180 table pattern {0}")
    @MethodSource("migrationTablePatterns")
    void refusesLookalikesForEveryImmutableMigrationTableLookup(String table) throws Exception {
        refusesUnknownDependenciesBeforeChangingTheDatabase(table,
                List.of("CREATE TABLE \"" + table.replace('_', 'z') + "\"(PROOF BIGINT)"));
    }

    private static Stream<String> migrationTablePatterns() {
        return Stream.of("HZB_MONITOR", "HZB_HISTORY", "HZB_ALERT_DEFINE_MONITOR_BIND", "HZB_COLLECTOR_MONITOR_BIND",
                "HZB_MONITOR_BIND", "HZB_STATUS_PAGE_INCIDENT_COMPONENT_BIND", "HZB_PUSH_METRICS", "HZB_PARAM",
                "HZB_PLUGIN_PARAM");
    }

    @Test
    void refusesActualFailedPriorHistoryWithoutRepairingIt() throws Exception {
        String url = prepareFixture();
        var failure = Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration/h2")
                .javaMigrations(new Failing174()).target("174").load();
        assertThatThrownBy(failure::migrate).hasRootCauseInstanceOf(SQLException.class);
        try (var connection = DriverManager.getConnection(url, "sa", "")) {
            assertThat(rows(connection, "SELECT \"success\" FROM \"flyway_schema_history\" WHERE \"version\"='174'"))
                    .containsExactly(List.of("FALSE"));
            var before = rows(connection, "SCRIPT");
            assertThatThrownBy(() -> new H2LegacyHistoryIndexCallback().handle(
                    Event.BEFORE_EACH_MIGRATE, context(url, connection))).hasMessageContaining("failed migration history");
            assertThat(rows(connection, "SCRIPT")).isEqualTo(before);
        }
    }

    private String prepareFixture() throws Exception {
        String url = "jdbc:h2:file:" + temporaryDirectory.resolve("guard") + ";MODE=MYSQL;DB_CLOSE_ON_EXIT=FALSE";
        try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
            // These tables model the guard's known columns, not a historical released database snapshot.
            statement.execute("""
                    CREATE TABLE HZB_MONITOR(ID BIGINT PRIMARY KEY,APP VARCHAR(100),CREATOR VARCHAR(255),
                    DESCRIPTION VARCHAR(255),GMT_CREATE TIMESTAMP,GMT_UPDATE TIMESTAMP,HOST VARCHAR(100),
                    INTERVALS INTEGER,JOB_ID BIGINT,MODIFIER VARCHAR(255),NAME VARCHAR(100),STATUS TINYINT NOT NULL,
                    ANNOTATIONS VARCHAR(4096),LABELS VARCHAR(4096),SCRAPE VARCHAR(255),TYPE TINYINT)
                    """);
            statement.execute("ALTER TABLE HZB_MONITOR ADD CONSTRAINT KNOWN_INTERVALS CHECK(INTERVALS>=10)");
            statement.execute("ALTER TABLE HZB_MONITOR ADD CONSTRAINT KNOWN_STATUS CHECK(STATUS<=4 AND STATUS>=0)");
            statement.execute("CREATE INDEX MONITOR_QUERY_INDEX ON HZB_MONITOR(APP,HOST,NAME)");
            statement.execute("""
                    CREATE TABLE HZB_HISTORY(ID BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    APP VARCHAR(255),DOU DOUBLE PRECISION,INSTANCE VARCHAR(5000),INT32 INTEGER,METRIC VARCHAR(255),
                    METRIC_TYPE TINYINT,METRICS VARCHAR(255),MONITOR_ID BIGINT,STR VARCHAR(2048),TIME BIGINT)
                    """);
            statement.execute("CREATE INDEX HISTORY_QUERY_INDEX ON HZB_HISTORY(MONITOR_ID,APP,METRICS,METRIC)");
            statement.execute("INSERT INTO HZB_MONITOR(ID,HOST,STATUS) VALUES(7,'checkout',0)");
            statement.execute("INSERT INTO HZB_HISTORY(ID,MONITOR_ID,INSTANCE,INT32,TIME) VALUES(1,7,NULL,17,1000)");
            // Required input tables for the unchanged original V160/170/172/173 scripts.
            statement.execute("CREATE TABLE HZB_PARAM(PARAM_VALUE VARCHAR(255))");
            statement.execute("CREATE TABLE HZB_TAG(TAG_VALUE VARCHAR(255))");
            statement.execute("CREATE TABLE HZB_STATUS_PAGE_HISTORY(UNKNOWING INTEGER)");
            statement.execute("CREATE TABLE HZB_ALERT_DEFINE(ID BIGINT)");
            statement.execute("CREATE TABLE HZB_ALERT_GROUP(COMMON_ANNOTATIONS VARCHAR(255),ALERT_FINGERPRINTS VARCHAR(255))");
            statement.execute("CREATE TABLE HZB_STATUS_PAGE_INCIDENT_CONTENT(MESSAGE VARCHAR(255))");
        }
        // Flyway creates baseline1 and all four successful original migrations; no fabricated history/checksums.
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration/h2")
                .baselineOnMigrate(true).baselineVersion("1").target("173").load().migrate();
        return url;
    }

    private static Context context(String url, Connection connection) {
        Flyway flyway = Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration/h2").load();
        var migration = Stream.of(flyway.info().pending())
                .filter(info -> "180".equals(info.getVersion().getVersion())).findFirst().orElseThrow();
        Context context = mock(Context.class);
        when(context.getMigrationInfo()).thenReturn(migration);
        when(context.getConfiguration()).thenReturn(flyway.getConfiguration());
        when(context.getConnection()).thenReturn(connection);
        return context;
    }

    private static List<List<String>> rows(Connection connection, String sql) throws SQLException {
        var result = new ArrayList<List<String>>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(sql)) {
            while (rows.next()) {
                var row = new ArrayList<String>();
                for (int index = 1; index <= rows.getMetaData().getColumnCount(); index++) {
                    row.add(rows.getString(index));
                }
                result.add(row);
            }
        }
        return result;
    }

    private static Stream<Arguments> unsafeDefinitions() {
        return Stream.of(
                Arguments.of("lookalike masks history width", List.of(
                        "ALTER TABLE HZB_HISTORY ALTER COLUMN INSTANCE VARCHAR(255)",
                        "CREATE TABLE \"HZBzHISTORY\"(INSTANCE VARCHAR(5000))")),
                Arguments.of("lookalike masks monitor width", List.of(
                        "ALTER TABLE HZB_MONITOR ALTER COLUMN CREATOR VARCHAR(50)",
                        "CREATE TABLE \"HZBzMONITOR\"(CREATOR VARCHAR(255))")),
                Arguments.of("lookalike migration labels", List.of(
                        "CREATE TABLE \"HZBzHISTORY\"(METRIC_LABELS VARCHAR(5000))")),
                Arguments.of("lookalike column pattern", List.of(
                        "ALTER TABLE HZB_HISTORY ADD \"METRICzLABELS\" VARCHAR(5000)")),
                Arguments.of("lookalike optional migration table", List.of(
                        "CREATE TABLE \"HZBzPLUGINzPARAM\"(ID BIGINT)")),
                Arguments.of("alias", List.of("CREATE ALIAS PROOF_ALIAS AS 'int proof(){return 1;}'")),
                Arguments.of("partial labels", List.of("ALTER TABLE HZB_HISTORY ADD METRIC_LABELS VARCHAR(5000)")),
                Arguments.of("ORM-first monitor", List.of("ALTER TABLE HZB_MONITOR ADD INSTANCE VARCHAR(255)")),
                Arguments.of("custom dependency", List.of("CREATE INDEX CUSTOM_MONITOR ON HZB_HISTORY(MONITOR_ID)")),
                Arguments.of("missing legacy index", List.of("DROP INDEX HISTORY_QUERY_INDEX")),
                Arguments.of("custom monitor unique", List.of("CREATE UNIQUE INDEX CUSTOM_HOST ON HZB_MONITOR(HOST)")),
                Arguments.of("unique index", List.of("DROP INDEX HISTORY_QUERY_INDEX",
                        "CREATE UNIQUE INDEX HISTORY_QUERY_INDEX ON HZB_HISTORY(MONITOR_ID,APP,METRICS,METRIC)")),
                Arguments.of("replacement conflict", List.of("CREATE INDEX IDX_HZB_HISTORY_APP ON HZB_HISTORY(METRIC)")),
                Arguments.of("replacement follows label rename",
                        List.of("CREATE INDEX IDX_HZB_HISTORY_INSTANCE ON HZB_HISTORY(INSTANCE)")),
                Arguments.of("external view", List.of("CREATE SCHEMA PROOF_OTHER",
                        "CREATE VIEW PROOF_OTHER.HISTORY_VIEW AS SELECT MONITOR_ID FROM PUBLIC.HZB_HISTORY")),
                Arguments.of("history check", List.of("ALTER TABLE HZB_HISTORY ADD CONSTRAINT PROOF_CHECK CHECK(MONITOR_ID>0)")),
                Arguments.of("monitor check", List.of("ALTER TABLE HZB_MONITOR ADD CONSTRAINT PROOF_CHECK CHECK(HOST IS NOT NULL)")),
                Arguments.of("default", List.of("ALTER TABLE HZB_HISTORY ALTER COLUMN INSTANCE SET DEFAULT 'unknown'")),
                Arguments.of("generated column", List.of("ALTER TABLE HZB_HISTORY DROP COLUMN INT32",
                        "ALTER TABLE HZB_HISTORY ADD INT32 INTEGER GENERATED ALWAYS AS (CAST(ID AS INTEGER))")),
                Arguments.of("synonym", List.of("CREATE SYNONYM PROOF_HISTORY FOR HZB_HISTORY")));
    }

    private static class Failing174 implements JavaMigration {
        @Override
        public Integer getChecksum() {
            return null;
        }

        @Override
        public MigrationVersion getVersion() {
            return MigrationVersion.fromVersion("174");
        }

        @Override
        public String getDescription() {
            return "guard fixture failure";
        }

        @Override
        public boolean canExecuteInTransaction() {
            return false;
        }

        @Override
        public void migrate(org.flywaydb.core.api.migration.Context context) throws SQLException {
            try (var statement = context.getConnection().createStatement()) {
                statement.execute("SELECT * FROM MISSING_PROOF_TABLE");
            }
        }
    }
}
