/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.startup.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.flywaydb.core.api.output.MigrateResult;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.hibernate.SpringImplicitNamingStrategy;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.yaml.snakeyaml.Yaml;

/**
 * Upgrade regression for the 1.9.0 migration chain, run once per supported dialect.
 *
 * <p>The scenario mirrors a production start: Hibernate {@code ddl-auto} builds the schema
 * from the entity model first, then Flyway runs, exactly as {@code FlywayConfiguration}
 * orders them with {@code @DependsOn("entityManagerFactory")}. The database is first taken
 * to the last officially released state (V180) and only then is V190 applied, so the test
 * covers the upgrade path a 1.8.0 user actually takes.
 */
abstract class AbstractMigrationUpgradeTest {

    protected static final String SOP_SCHEDULE_TABLE = "hzb_sop_schedule";

    protected static final String ALERT_DEFINE_TABLE = "hzb_alert_define";

    private static final String LAST_RELEASED_VERSION = "180";

    private static final String CURRENT_VERSION = "190";

    private static final List<String> WITHDRAWN_VERSIONS = List.of("181", "182", "183");

    private static final List<String> SCHEDULE_INDEX_CONVERSATION = List.of("conversation_id");

    private static final List<String> SCHEDULE_INDEX_ENABLED_NEXT = List.of("enabled", "next_run_time");

    private static final List<String> SCHEDULE_INDEX_CREATOR_CONVERSATION = List.of("creator", "conversation_id");

    private static final String SEEDED_EXPR = "usage>90";

    private static final Map<String, Object> SHIPPED_FLYWAY_SETTINGS = loadShippedFlywaySettings();

    /**
     * The data source of the freshly created database under test.
     *
     * @return data source
     */
    protected abstract DataSource dataSource();

    /**
     * Flyway vendor directory holding the dialect specific migrations.
     *
     * @return vendor directory name
     */
    protected abstract String vendor();

    /**
     * Reads the type the database itself reports for a column.
     *
     * @param table  table name
     * @param column column name
     * @return the declared type, normalised to lower case
     * @throws SQLException on query failure
     */
    protected abstract String declaredType(String table, String column) throws SQLException;

    /**
     * The types this dialect uses for a boolean column. More than one spelling is legitimate:
     * on MySQL Hibernate declares {@code bit(1)} while the migration's own {@code BOOLEAN}
     * lands as {@code tinyint(1)}, and both hold the same values.
     *
     * @return accepted types of {@code hzb_sop_schedule.enabled}
     */
    protected abstract Set<String> expectedBooleanTypes();

    /**
     * The type {@code hzb_alert_define.expr} must have once V190 has enlarged it.
     *
     * @return expected type of {@code hzb_alert_define.expr}
     */
    protected abstract String expectedEnlargedTextType();

    /**
     * Stored routines left behind in the schema under test.
     *
     * @return routine names, empty when the migrations cleaned up after themselves
     * @throws SQLException on query failure
     */
    protected abstract List<String> storedRoutines() throws SQLException;

    @Test
    @DisplayName("V190 upgrades a V180 database whose schedule table Hibernate owns")
    void upgradesDatabaseWhoseScheduleTableHibernateOwns() throws SQLException {
        startFromLastReleasedState();
        seedSchedules();
        seedAlertDefine();

        Flyway flyway = flyway();
        assertPendingVersions(flyway, List.of(CURRENT_VERSION));

        MigrateResult result = flyway.migrate();
        assertEquals(1, result.migrationsExecuted, "V190 must be the only migration left to apply");
        assertEquals(CURRENT_VERSION, result.targetSchemaVersion);

        assertScheduleRowsScopedToOwner();
        assertBooleanColumn();
        assertEquals(expectedEnlargedTextType(), declaredType(ALERT_DEFINE_TABLE, "expr"));
        assertSeededExprSurvived();
        assertOversizedExprRoundTrips();
        assertScheduleIndexes(List.of(
                SCHEDULE_INDEX_CONVERSATION,
                SCHEDULE_INDEX_ENABLED_NEXT,
                SCHEDULE_INDEX_CREATOR_CONVERSATION));
        assertNoStoredRoutinesLeftBehind();
        assertHistoryChain();

        assertSecondStartupChangesNothing();
        assertScheduleRowsScopedToOwner();
    }

    @Test
    @DisplayName("V190 upgrades a V180 database whose schedule table the migration has to create")
    void upgradesDatabaseWhoseScheduleTableTheMigrationCreates() throws SQLException {
        startFromLastReleasedState();
        // Model the ordering where Flyway sees the table first: the migration, not Hibernate,
        // has to create hzb_sop_schedule. This is the path that made PostgreSQL declare the
        // column SMALLINT, after which the script's own "SET enabled = FALSE" failed with 42804.
        execute("DROP TABLE " + SOP_SCHEDULE_TABLE);

        Flyway flyway = flyway();
        MigrateResult result = flyway.migrate();
        assertEquals(1, result.migrationsExecuted, "V190 must be the only migration left to apply");

        assertBooleanColumn();
        assertEquals(expectedEnlargedTextType(), declaredType(ALERT_DEFINE_TABLE, "expr"));
        assertScheduleIndexes(List.of(SCHEDULE_INDEX_CONVERSATION, SCHEDULE_INDEX_ENABLED_NEXT));
        assertNoStoredRoutinesLeftBehind();
        assertHistoryChain();

        // The migration ran against an empty table, so replay its own update statement to prove
        // the column it created accepts the FALSE literal the script uses.
        seedSchedules();
        execute("UPDATE " + SOP_SCHEDULE_TABLE + " SET enabled = FALSE WHERE creator IS NULL OR TRIM(creator) = ''");
        assertScheduleRowsScopedToOwner();

        assertSecondStartupChangesNothing();
    }

    /**
     * Brings the database to the state a 1.8.0 installation is in: schema built by Hibernate,
     * migration history applied up to and including the last released version.
     */
    private void startFromLastReleasedState() {
        createSchemaWithHibernate();
        MigrateResult result = flyway(LAST_RELEASED_VERSION).migrate();
        assertEquals(LAST_RELEASED_VERSION, result.targetSchemaVersion,
                "the released baseline must stop at V" + LAST_RELEASED_VERSION);
    }

    /**
     * Builds the schema the way the application does at startup, from the scanned entity model.
     */
    private void createSchemaWithHibernate() {
        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource());
        factory.setPackagesToScan("org.apache.hertzbeat");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        Properties properties = new Properties();
        properties.setProperty("hibernate.hbm2ddl.auto", "update");
        // The naming strategies Spring Boot applies by default, so the generated column names
        // are the ones the running application has.
        properties.setProperty("hibernate.implicit_naming_strategy", SpringImplicitNamingStrategy.class.getName());
        properties.setProperty("hibernate.physical_naming_strategy",
                CamelCaseToUnderscoresNamingStrategy.class.getName());
        factory.setJpaProperties(properties);
        factory.afterPropertiesSet();
        factory.destroy();
    }

    private Flyway flyway() {
        return flyway(null);
    }

    /**
     * Configures Flyway from the shipped {@code application.yml} rather than from a copy of it,
     * so the regression cannot drift away from what the application actually runs. The
     * {@code {vendor}} placeholder is resolved the way Spring Boot resolves it at startup.
     *
     * @param target version to stop at, {@code null} to migrate to the latest
     * @return configured Flyway instance
     */
    private Flyway flyway(String target) {
        List<String> locations = shippedSetting("locations", List.class).stream()
                .map(location -> String.valueOf(location).replace("{vendor}", vendor()))
                .toList();
        FluentConfiguration configuration = Flyway.configure()
                .dataSource(dataSource())
                .locations(locations.toArray(new String[0]))
                .baselineOnMigrate(shippedSetting("baseline-on-migrate", Boolean.class))
                .baselineVersion(String.valueOf(shippedSetting("baseline-version", Object.class)))
                .cleanDisabled(shippedSetting("clean-disabled", Boolean.class));
        if (target != null) {
            configuration.target(MigrationVersion.fromVersion(target));
        }
        return configuration.load();
    }

    private static <T> T shippedSetting(String key, Class<T> type) {
        Object value = SHIPPED_FLYWAY_SETTINGS.get(key);
        assertNotNull(value, () -> "spring.flyway." + key + " is not declared in application.yml");
        return type.cast(value);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> loadShippedFlywaySettings() {
        try (InputStream stream = AbstractMigrationUpgradeTest.class.getClassLoader()
                .getResourceAsStream("application.yml")) {
            assertNotNull(stream, "application.yml must be on the test classpath");
            for (Object document : new Yaml().loadAll(stream)) {
                if (!(document instanceof Map<?, ?> root)) {
                    continue;
                }
                Object spring = root.get("spring");
                if (spring instanceof Map<?, ?> springSection
                        && springSection.get("flyway") instanceof Map<?, ?> flyway) {
                    return (Map<String, Object>) flyway;
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("cannot read the shipped application.yml", e);
        }
        throw new IllegalStateException("application.yml declares no spring.flyway section");
    }

    private void assertPendingVersions(Flyway flyway, List<String> expected) {
        List<String> pending = new ArrayList<>();
        for (MigrationInfo info : flyway.info().pending()) {
            pending.add(info.getVersion().getVersion());
        }
        assertEquals(expected, pending);
    }

    private void assertSecondStartupChangesNothing() {
        Flyway restart = flyway();
        assertEquals(0, restart.info().pending().length, "a restart must have nothing left to apply");
        MigrateResult result = restart.migrate();
        assertEquals(0, result.migrationsExecuted, "a restart must not re-run any migration");
        assertTrue(restart.validateWithResult().validationSuccessful,
                "a restart must validate cleanly against the recorded history");
    }

    private void assertHistoryChain() {
        List<String> applied = new ArrayList<>();
        for (MigrationInfo info : flyway().info().applied()) {
            assertFalse(info.getState().isFailed(),
                    () -> "migration " + info.getVersion() + " is recorded as failed");
            if (info.getVersion() != null) {
                applied.add(info.getVersion().getVersion());
            }
        }
        assertEquals(1, applied.stream().filter(CURRENT_VERSION::equals).count(),
                () -> "V" + CURRENT_VERSION + " must be recorded exactly once, history is " + applied);
        for (String withdrawn : WITHDRAWN_VERSIONS) {
            assertTrue(applied.stream().noneMatch(withdrawn::equals),
                    () -> "withdrawn version V" + withdrawn + " must not appear in the history, history is " + applied);
        }
        assertEquals(CURRENT_VERSION, applied.get(applied.size() - 1),
                () -> "the chain must end at V" + CURRENT_VERSION + ", history is " + applied);
    }

    private void seedSchedules() throws SQLException {
        try (Connection connection = dataSource().getConnection();
             PreparedStatement statement = connection.prepareStatement("INSERT INTO " + SOP_SCHEDULE_TABLE
                     + " (conversation_id, sop_name, cron_expression, enabled, creator) VALUES (?, ?, ?, ?, ?)")) {
            addSchedule(statement, 1L, "owned", "alice");
            addSchedule(statement, 2L, "null-owner", null);
            addSchedule(statement, 3L, "blank-owner", "   ");
            statement.executeBatch();
        }
    }

    private void addSchedule(PreparedStatement statement, long conversationId, String name, String creator)
            throws SQLException {
        statement.setLong(1, conversationId);
        statement.setString(2, name);
        statement.setString(3, "0 0 * * * ?");
        statement.setBoolean(4, true);
        statement.setString(5, creator);
        statement.addBatch();
    }

    private void assertScheduleRowsScopedToOwner() throws SQLException {
        Map<String, Boolean> enabledByName = new LinkedHashMap<>();
        try (Connection connection = dataSource().getConnection();
             Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery("SELECT sop_name, enabled FROM " + SOP_SCHEDULE_TABLE)) {
            while (rs.next()) {
                enabledByName.put(rs.getString("sop_name"), rs.getBoolean("enabled"));
            }
        }
        assertEquals(Boolean.TRUE, enabledByName.get("owned"), "a schedule with an owner must stay enabled");
        assertEquals(Boolean.FALSE, enabledByName.get("null-owner"), "a schedule without an owner must be disabled");
        assertEquals(Boolean.FALSE, enabledByName.get("blank-owner"), "a blank owner must count as no owner");
    }

    private void seedAlertDefine() throws SQLException {
        try (Connection connection = dataSource().getConnection();
             PreparedStatement statement = connection.prepareStatement("INSERT INTO " + ALERT_DEFINE_TABLE
                     + " (name, expr, enable) VALUES (?, ?, ?)")) {
            statement.setString(1, "seeded");
            statement.setString(2, SEEDED_EXPR);
            statement.setBoolean(3, true);
            statement.executeUpdate();
        }
    }

    private void assertSeededExprSurvived() throws SQLException {
        try (Connection connection = dataSource().getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT expr FROM " + ALERT_DEFINE_TABLE + " WHERE name = ?")) {
            statement.setString(1, "seeded");
            try (ResultSet rs = statement.executeQuery()) {
                assertTrue(rs.next(), "the alert define seeded before the upgrade must still be there");
                assertEquals(SEEDED_EXPR, rs.getString("expr"), "widening expr must not rewrite existing rows");
            }
        }
    }

    private void assertOversizedExprRoundTrips() throws SQLException {
        String expr = "a".repeat(100_000);
        try (Connection connection = dataSource().getConnection();
             PreparedStatement insert = connection.prepareStatement("INSERT INTO " + ALERT_DEFINE_TABLE
                     + " (name, expr, enable) VALUES (?, ?, ?)")) {
            insert.setString(1, "oversized");
            insert.setString(2, expr);
            insert.setBoolean(3, true);
            insert.executeUpdate();
        }
        try (Connection connection = dataSource().getConnection();
             PreparedStatement select = connection.prepareStatement(
                     "SELECT expr FROM " + ALERT_DEFINE_TABLE + " WHERE name = ?")) {
            select.setString(1, "oversized");
            try (ResultSet rs = select.executeQuery()) {
                assertTrue(rs.next(), "the oversized alert define must have been stored");
                assertEquals(expr.length(), rs.getString("expr").length(),
                        "expr must hold an expression far beyond the pre-1.9.0 limit");
            }
        }
    }

    private void assertBooleanColumn() throws SQLException {
        String actual = declaredType(SOP_SCHEDULE_TABLE, "enabled");
        assertTrue(expectedBooleanTypes().contains(actual),
                () -> "enabled must be a boolean column, but is declared " + actual
                        + "; expected one of " + expectedBooleanTypes());
    }

    private void assertNoStoredRoutinesLeftBehind() throws SQLException {
        List<String> routines = storedRoutines();
        assertTrue(routines.isEmpty(), () -> "migrations left stored routines behind: " + routines);
    }

    private void assertScheduleIndexes(List<List<String>> expected) throws SQLException {
        Map<String, List<String>> indexes = indexColumns(SOP_SCHEDULE_TABLE);
        List<List<String>> actual = indexes.values().stream()
                .filter(columns -> !columns.equals(List.of("id")))
                .toList();
        for (List<String> signature : expected) {
            assertEquals(1, actual.stream().filter(signature::equals).count(),
                    () -> "index on " + signature + " must exist exactly once, found " + indexes);
        }
        assertEquals(expected.size(), actual.size(), () -> "unexpected indexes on " + SOP_SCHEDULE_TABLE + ": " + indexes);
    }

    private Map<String, List<String>> indexColumns(String table) throws SQLException {
        Map<String, List<String>> indexes = new LinkedHashMap<>();
        try (Connection connection = dataSource().getConnection()) {
            String[] identity = resolveTable(connection, table);
            assertNotNull(identity, () -> "table " + table + " does not exist");
            try (ResultSet rs = connection.getMetaData()
                    .getIndexInfo(identity[0], identity[1], identity[2], false, false)) {
                while (rs.next()) {
                    String name = rs.getString("INDEX_NAME");
                    String column = rs.getString("COLUMN_NAME");
                    if (name == null || column == null) {
                        continue;
                    }
                    indexes.computeIfAbsent(name.toLowerCase(Locale.ROOT), key -> new ArrayList<>())
                            .add(column.toLowerCase(Locale.ROOT));
                }
            }
        }
        return indexes;
    }

    /**
     * Resolves the catalog, schema and stored spelling of a table. The lookup is pinned to the
     * catalog and schema of the connection: MySQL Connector/J defaults {@code nullCatalogMeansCurrent}
     * to false, so an unqualified lookup would happily match a table of the same name in another
     * database on the same server.
     *
     * @param connection connection to the database under test
     * @param table      table name, in any case
     * @return catalog, schema and table name, or {@code null} when the table does not exist
     * @throws SQLException on metadata failure
     */
    private String[] resolveTable(Connection connection, String table) throws SQLException {
        String catalog = connection.getCatalog();
        String schema = connection.getSchema();
        try (ResultSet rs = connection.getMetaData().getTables(catalog, schema, "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                if (table.equalsIgnoreCase(rs.getString("TABLE_NAME"))) {
                    return new String[]{rs.getString("TABLE_CAT"), rs.getString("TABLE_SCHEM"),
                            rs.getString("TABLE_NAME")};
                }
            }
        }
        return null;
    }

    /**
     * Runs a statement against the database under test.
     *
     * @param sql statement to run
     * @throws SQLException on execution failure
     */
    protected void execute(String sql) throws SQLException {
        try (Connection connection = dataSource().getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    /**
     * Runs a single value query against the database under test.
     *
     * @param sql        query returning one column
     * @param parameters query parameters
     * @return the first column of the first row, lower cased, or {@code null} when there is no row
     * @throws SQLException on execution failure
     */
    protected String queryString(String sql, Object... parameters) throws SQLException {
        try (Connection connection = dataSource().getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < parameters.length; index++) {
                statement.setObject(index + 1, parameters[index]);
            }
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                String value = rs.getString(1);
                return value == null ? null : value.toLowerCase(Locale.ROOT);
            }
        }
    }

    /**
     * Runs a query collecting a single string column.
     *
     * @param sql query returning one column
     * @return every value of the first column
     * @throws SQLException on execution failure
     */
    protected List<String> queryStrings(String sql) throws SQLException {
        List<String> values = new ArrayList<>();
        try (Connection connection = dataSource().getConnection();
             Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(sql)) {
            while (rs.next()) {
                values.add(rs.getString(1));
            }
        }
        return values;
    }

    /**
     * Waits until the container database accepts JDBC connections. MySQL briefly listens while
     * its entrypoint is still bootstrapping, so a single successful connect is not enough.
     *
     * @param url      jdbc url
     * @param username user name
     * @param password password
     */
    protected static void awaitDatabaseReady(String url, String username, String password) {
        long deadline = System.currentTimeMillis() + Duration.ofMinutes(5).toMillis();
        int consecutiveSuccesses = 0;
        SQLException last = null;
        while (System.currentTimeMillis() < deadline) {
            try (Connection connection = DriverManager.getConnection(url, username, password);
                 Statement statement = connection.createStatement()) {
                statement.execute("SELECT 1");
                if (++consecutiveSuccesses == 3) {
                    return;
                }
            } catch (SQLException e) {
                last = e;
                consecutiveSuccesses = 0;
            }
            try {
                Thread.sleep(1000L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("interrupted while waiting for the database", e);
            }
        }
        throw new IllegalStateException("timed out waiting for " + url, last);
    }
}
