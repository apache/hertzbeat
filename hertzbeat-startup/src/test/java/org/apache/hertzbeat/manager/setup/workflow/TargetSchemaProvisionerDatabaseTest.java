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

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.persistence.Entity;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.flywaydb.core.Flyway;
import org.assertj.core.api.SoftAssertions;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real-database proof for current-version target schema provisioning. */
@EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
class TargetSchemaProvisionerDatabaseTest {

    private static final String DATABASE = "hertzbeat";
    private static final String USERNAME = "hertzbeat";
    private static final String PASSWORD = "test-only-password";

    @Test
    void provisionsAndValidatesFreshMysqlSchema() throws Exception {
        try (MySQLContainer database = new MySQLContainer("mysql:8.4")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)
                .withCommand("--lower-case-table-names=1")) {
            database.start();
            assertRejectsFalseEmptyStates(database.getJdbcUrl(), MetadataDatabaseKind.MYSQL);
            verify(database.getJdbcUrl(), MetadataDatabaseKind.MYSQL,
                    MetadataValidationMySqlDialect.class.getName());
        }
    }

    @Test
    void provisionsAndValidatesFreshPostgresqlSchema() throws Exception {
        try (PostgreSQLContainer database = new PostgreSQLContainer("postgres:17.6")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)) {
            database.start();
            assertRejectsFalseEmptyStates(database.getJdbcUrl(), MetadataDatabaseKind.POSTGRESQL);
            verify(database.getJdbcUrl(), MetadataDatabaseKind.POSTGRESQL,
                    "org.hibernate.dialect.PostgreSQLDialect");
        }
    }

    private static void assertRejectsFalseEmptyStates(String jdbcUrl, MetadataDatabaseKind kind) throws Exception {
        TargetSchemaProvisioner provisioner = new FlywayTargetSchemaProvisioner();
        MetadataDatabaseConfiguration target =
                new MetadataDatabaseConfiguration(kind, jdbcUrl, USERNAME, PASSWORD);
        SoftAssertions softly = new SoftAssertions();

        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD)) {
            TargetSchemaBaseline baseline = TargetSchemaBaseline.load(kind);
            new FlywaySchemaHistory(kind).record(connection, baseline, USERNAME, 0);
        }
        softly.assertThatThrownBy(() -> provisioner.provision(target))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception ->
                        softly.assertThat(exception.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION));
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE hzb_account (id INTEGER NOT NULL PRIMARY KEY)");
        }
        softly.assertThatThrownBy(() -> provisioner.provision(target))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception ->
                        softly.assertThat(exception.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION));
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement()) {
            softly.assertThat(metadataTables(connection)).containsExactly("hzb_account");
            statement.execute("DROP TABLE hzb_account");
            statement.execute("DROP TABLE flyway_schema_history");
            statement.execute("DROP TABLE flyway_schema_contract");
            statement.execute("CREATE TABLE unrelated_table (id INTEGER NOT NULL PRIMARY KEY)");
        }
        softly.assertThatThrownBy(() -> provisioner.provision(target))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception ->
                        softly.assertThat(exception.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION));
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement()) {
            softly.assertThat(metadataTables(connection)).isEmpty();
            statement.execute("DROP TABLE unrelated_table");
            statement.execute("CREATE VIEW hzb_status_page_org AS SELECT 1 AS id");
        }
        softly.assertThatThrownBy(() -> provisioner.provision(target))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception ->
                        softly.assertThat(exception.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION));
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement()) {
            softly.assertThat(metadataTables(connection)).isEmpty();
            statement.execute("DROP VIEW hzb_status_page_org");
        }
        assertRejectsPostgresqlObjects(jdbcUrl, kind, provisioner, target, softly);
        assertRejectsContractWithoutHistory(jdbcUrl, kind, provisioner, target, softly);
        softly.assertAll();
    }

    private static void assertRejectsContractWithoutHistory(
            String jdbcUrl,
            MetadataDatabaseKind kind,
            TargetSchemaProvisioner provisioner,
            MetadataDatabaseConfiguration target,
            SoftAssertions softly) throws Exception {
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD)) {
            new TargetSchemaContract(kind).record(connection, Set.of());
        }
        softly.assertThatThrownBy(() -> provisioner.provision(target))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception ->
                        softly.assertThat(exception.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION));
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement()) {
            statement.execute("DROP TABLE flyway_schema_contract");
        }
    }

    private static void assertRejectsPostgresqlObjects(
            String jdbcUrl,
            MetadataDatabaseKind kind,
            TargetSchemaProvisioner provisioner,
            MetadataDatabaseConfiguration target,
            SoftAssertions softly) throws Exception {
        if (kind != MetadataDatabaseKind.POSTGRESQL) {
            return;
        }
        assertRejectsObject(jdbcUrl, provisioner, target, softly,
                "CREATE MATERIALIZED VIEW hzb_schema_probe AS SELECT 1 AS id",
                "DROP MATERIALIZED VIEW hzb_schema_probe");
        assertRejectsObject(jdbcUrl, provisioner, target, softly,
                "CREATE SEQUENCE hzb_schema_probe_sequence",
                "DROP SEQUENCE hzb_schema_probe_sequence");
    }

    private static void assertRejectsObject(
            String jdbcUrl,
            TargetSchemaProvisioner provisioner,
            MetadataDatabaseConfiguration target,
            SoftAssertions softly,
            String createSql,
            String dropSql) throws Exception {
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement()) {
            statement.execute(createSql);
        }
        softly.assertThatThrownBy(() -> provisioner.provision(target))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception ->
                        softly.assertThat(exception.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION));
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement()) {
            statement.execute(dropSql);
        }
    }

    private static void verify(String jdbcUrl, MetadataDatabaseKind kind, String dialect) throws Exception {
        MetadataDatabaseConfiguration target =
                new MetadataDatabaseConfiguration(kind, jdbcUrl, USERNAME, PASSWORD);
        TargetSchemaProvisioner provisioner = new FlywayTargetSchemaProvisioner();
        assertProvisioningLogsAreSanitized(provisioner, target);
        assertCurrentBaselineAllowsAdditionalTable(provisioner, target);
        assertCurrentBaselineRejectsSchemaCorruption(provisioner, target);

        MetadataSchemaSnapshot baseline;
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD)) {
            assertThat(metadataTables(connection)).containsExactlyInAnyOrderElementsOf(
                    TargetSchemaBaselineResourceTest.mappedTables());
            try (Statement statement = connection.createStatement();
                    ResultSet history = statement.executeQuery(
                            "SELECT version, type, success FROM flyway_schema_history ORDER BY installed_rank")) {
                assertThat(history.next()).isTrue();
                assertThat(history.getString("version")).isEqualTo("206");
                assertThat(history.getString("type")).isEqualTo("SQL_BASELINE");
                assertThat(history.getBoolean("success")).isTrue();
                assertThat(history.next()).isFalse();
            }
            baseline = MetadataSchemaSnapshot.capture(connection);
        }
        assertStandardFlywayAcceptsBaseline(jdbcUrl, kind);
        validateHibernateMappings(jdbcUrl, dialect);
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD)) {
            replaceEarlyMigrationIndexWithIncorrectDefinition(connection, kind);
        }
        HistoricalMetadataSchema.rebuild(jdbcUrl, USERNAME, PASSWORD, kind.value());
        assertThat(historyRows(jdbcUrl))
                .extracting(HistoryRow::version)
                .containsExactly("159", "160", "170", "172", "173", "180", "181",
                        "200", "201", "202", "203", "204", "205", "206");
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD)) {
            MetadataSchemaSnapshot migrated = MetadataSchemaSnapshot.capture(connection);
            assertThat(migrated.indexes())
                    .filteredOn(index -> index.table().equals("hzb_monitor")
                            && index.name().equals("idx_hzb_monitor_app"))
                    .singleElement()
                    .extracting(MetadataSchemaSnapshot.Index::columns)
                    .isEqualTo(List.of(new MetadataSchemaSnapshot.IndexColumn((short) 1, "app", "a")));
            assertThat(schemaDifferences(baseline, migrated)).isEmpty();
        }
    }

    private static List<String> schemaDifferences(
            MetadataSchemaSnapshot baseline, MetadataSchemaSnapshot migrated) {
        List<String> differences = new ArrayList<>();
        addDifferences(differences, "column", baseline.columns(), migrated.columns());
        addDifferences(differences, "primary key", baseline.primaryKeys(), migrated.primaryKeys());
        addDifferences(differences, "index", baseline.indexes(), migrated.indexes());
        addDifferences(differences, "foreign key", baseline.foreignKeys(), migrated.foreignKeys());
        return List.copyOf(differences);
    }

    private static void addDifferences(
            List<String> differences, String kind, Set<?> baseline, Set<?> migrated) {
        baseline.stream()
                .filter(value -> !migrated.contains(value))
                .map(value -> "baseline-only " + kind + ": " + value)
                .forEach(differences::add);
        migrated.stream()
                .filter(value -> !baseline.contains(value))
                .map(value -> "migration-only " + kind + ": " + value)
                .forEach(differences::add);
    }

    private static void replaceEarlyMigrationIndexWithIncorrectDefinition(
            Connection connection, MetadataDatabaseKind kind) throws Exception {
        try (Statement statement = connection.createStatement()) {
            if (kind == MetadataDatabaseKind.MYSQL) {
                statement.execute("DROP INDEX idx_hzb_monitor_app ON hzb_monitor");
            } else {
                statement.execute("DROP INDEX idx_hzb_monitor_app");
            }
            statement.execute("CREATE INDEX idx_hzb_monitor_app ON hzb_monitor(name)");
        }
    }

    private static void assertCurrentBaselineAllowsAdditionalTable(
            TargetSchemaProvisioner provisioner, MetadataDatabaseConfiguration target) throws Exception {
        try (Connection connection = DriverManager.getConnection(
                target.jdbcUrl(), target.username(), target.password());
                Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE unrelated_table (id INTEGER NOT NULL PRIMARY KEY)");
            try {
                provisioner.provision(target);
            } finally {
                statement.execute("DROP TABLE unrelated_table");
            }
        }
    }

    private static void assertCurrentBaselineRejectsSchemaCorruption(
            TargetSchemaProvisioner provisioner, MetadataDatabaseConfiguration target) throws Exception {
        assertCorruptionRejected(provisioner, target,
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_account MODIFY COLUMN username VARCHAR(63) NOT NULL"
                        : "ALTER TABLE hzb_account ALTER COLUMN username TYPE VARCHAR(63)",
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_account MODIFY COLUMN username VARCHAR(64) NOT NULL"
                        : "ALTER TABLE hzb_account ALTER COLUMN username TYPE VARCHAR(64)");
        assertCorruptionRejected(provisioner, target,
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_account MODIFY COLUMN credential_version INTEGER NOT NULL"
                        : "ALTER TABLE hzb_account ALTER COLUMN credential_version TYPE INTEGER",
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_account MODIFY COLUMN credential_version BIGINT NOT NULL"
                        : "ALTER TABLE hzb_account ALTER COLUMN credential_version TYPE BIGINT");
        assertCorruptionRejected(provisioner, target,
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_alert_silence MODIFY COLUMN id BIGINT NOT NULL"
                        : "ALTER TABLE hzb_alert_silence ALTER COLUMN id DROP IDENTITY",
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_alert_silence MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT"
                        : "ALTER TABLE hzb_alert_silence ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY");
        assertCorruptionRejected(provisioner, target,
                "ALTER TABLE hzb_auth_token ALTER COLUMN token_scope SET DEFAULT 'API-ADMIN'",
                "ALTER TABLE hzb_auth_token ALTER COLUMN token_scope SET DEFAULT 'api-admin'");
        assertCorruptionRejected(provisioner, target,
                "ALTER TABLE hzb_auth_token ALTER COLUMN token_scope DROP DEFAULT",
                "ALTER TABLE hzb_auth_token ALTER COLUMN token_scope SET DEFAULT 'api-admin'");
        if (target.kind() == MetadataDatabaseKind.POSTGRESQL) {
            assertCorruptionRejected(provisioner, target,
                    "ALTER TABLE hzb_notice_template DROP CONSTRAINT hzb_notice_template_type_check",
                    "ALTER TABLE hzb_notice_template ADD CONSTRAINT hzb_notice_template_type_check "
                            + "CHECK (type >= 0)");
            assertCorruptionRejected(provisioner, target,
                    "CREATE SEQUENCE migration_unexpected_sequence",
                    "DROP SEQUENCE migration_unexpected_sequence");
            assertCorruptionRejected(provisioner, target,
                    "ALTER SEQUENCE hzb_auth_token_id_seq INCREMENT BY 2",
                    "ALTER SEQUENCE hzb_auth_token_id_seq INCREMENT BY 1");
            assertCorruptionRejected(provisioner, target,
                    "ALTER SEQUENCE hzb_auth_token_id_seq CYCLE",
                    "ALTER SEQUENCE hzb_auth_token_id_seq NO CYCLE");
            assertCorruptionRejected(provisioner, target,
                    "ALTER SEQUENCE hzb_auth_token_id_seq OWNED BY hzb_signal_saved_view.id; "
                            + "ALTER SEQUENCE hzb_signal_saved_view_id_seq OWNED BY hzb_auth_token.id",
                    "ALTER SEQUENCE hzb_auth_token_id_seq OWNED BY hzb_auth_token.id; "
                            + "ALTER SEQUENCE hzb_signal_saved_view_id_seq OWNED BY hzb_signal_saved_view.id");
        }
        assertCorruptionRejected(provisioner, target,
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "DROP INDEX idx_hzb_monitor_app ON hzb_monitor"
                        : "DROP INDEX idx_hzb_monitor_app",
                "CREATE INDEX idx_hzb_monitor_app ON hzb_monitor(app)");
        assertCorruptionRejected(provisioner, target,
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_ai_message DROP FOREIGN KEY fk_hzb_ai_message_conversation"
                        : "ALTER TABLE hzb_ai_message DROP CONSTRAINT fk_hzb_ai_message_conversation",
                "ALTER TABLE hzb_ai_message ADD CONSTRAINT fk_hzb_ai_message_conversation "
                        + "FOREIGN KEY (conversation_id) REFERENCES hzb_ai_conversation(id)");
        assertCorruptionRejected(provisioner, target,
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_ai_message DROP FOREIGN KEY fk_hzb_ai_message_conversation, "
                                + "ADD CONSTRAINT fk_hzb_ai_message_conversation_cascade "
                                + "FOREIGN KEY (conversation_id) "
                                + "REFERENCES hzb_ai_conversation(id) ON DELETE CASCADE"
                        : "ALTER TABLE hzb_ai_message DROP CONSTRAINT fk_hzb_ai_message_conversation, "
                                + "ADD CONSTRAINT fk_hzb_ai_message_conversation_cascade "
                                + "FOREIGN KEY (conversation_id) "
                                + "REFERENCES hzb_ai_conversation(id) ON DELETE CASCADE",
                target.kind() == MetadataDatabaseKind.MYSQL
                        ? "ALTER TABLE hzb_ai_message "
                                + "DROP FOREIGN KEY fk_hzb_ai_message_conversation_cascade, "
                                + "ADD CONSTRAINT fk_hzb_ai_message_conversation FOREIGN KEY (conversation_id) "
                                + "REFERENCES hzb_ai_conversation(id)"
                        : "ALTER TABLE hzb_ai_message "
                                + "DROP CONSTRAINT fk_hzb_ai_message_conversation_cascade, "
                                + "ADD CONSTRAINT fk_hzb_ai_message_conversation FOREIGN KEY (conversation_id) "
                                + "REFERENCES hzb_ai_conversation(id)");
    }

    private static void assertCorruptionRejected(
            TargetSchemaProvisioner provisioner,
            MetadataDatabaseConfiguration target,
            String corruptSql,
            String restoreSql) throws Exception {
        try (Connection connection = DriverManager.getConnection(
                target.jdbcUrl(), target.username(), target.password());
                Statement statement = connection.createStatement()) {
            statement.execute(corruptSql);
            try {
                assertThatThrownBy(() -> provisioner.provision(target))
                        .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, exception ->
                                assertThat(exception.failure().phase())
                                        .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION));
            } finally {
                statement.execute(restoreSql);
            }
        }
    }

    private static void assertProvisioningLogsAreSanitized(
            TargetSchemaProvisioner provisioner, MetadataDatabaseConfiguration target) throws Exception {
        Logger root = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
        ListAppender<ILoggingEvent> captured = new ListAppender<>();
        captured.start();
        root.addAppender(captured);
        try {
            provisioner.provision(target);
            try (Connection connection = DriverManager.getConnection(
                    target.jdbcUrl(), target.username(), target.password())) {
                TargetSchemaBaseline baseline = TargetSchemaBaseline.load(target.kind());
                assertThat(new TargetSchemaContract(target.kind()).matches(connection, baseline.expectedTables()))
                        .isTrue();
            }
            provisioner.provision(target);
        } finally {
            root.detachAppender(captured);
            captured.stop();
        }
        assertThat(captured.list.stream().map(ILoggingEvent::getFormattedMessage).toList().toString())
                .doesNotContain(target.jdbcUrl(), target.password(), "CREATE TABLE", "INSERT INTO");
    }

    private static void assertStandardFlywayAcceptsBaseline(String jdbcUrl, MetadataDatabaseKind kind)
            throws Exception {
        List<HistoryRow> before = historyRows(jdbcUrl);
        String vendor = kind == MetadataDatabaseKind.MYSQL ? "mysql" : "postgresql";
        Flyway flyway = Flyway.configure()
                .dataSource(jdbcUrl, USERNAME, PASSWORD)
                .locations("classpath:db/migration/" + vendor)
                .cleanDisabled(true)
                .validateMigrationNaming(true)
                .load();
        flyway.validate();
        flyway.migrate();
        assertThat(historyRows(jdbcUrl)).isEqualTo(before);
    }

    private static List<HistoryRow> historyRows(String jdbcUrl) throws Exception {
        List<HistoryRow> rows = new ArrayList<>();
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USERNAME, PASSWORD);
                Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(
                        "SELECT installed_rank, version, description, type, script, checksum, "
                                + "installed_by, installed_on, execution_time, success "
                                + "FROM flyway_schema_history ORDER BY installed_rank")) {
            while (result.next()) {
                rows.add(new HistoryRow(
                        result.getInt("installed_rank"),
                        result.getString("version"),
                        result.getString("description"),
                        result.getString("type"),
                        result.getString("script"),
                        result.getInt("checksum"),
                        result.getString("installed_by"),
                        result.getTimestamp("installed_on").toInstant(),
                        result.getInt("execution_time"),
                        result.getBoolean("success")));
            }
        }
        return List.copyOf(rows);
    }

    private record HistoryRow(
            int installedRank,
            String version,
            String description,
            String type,
            String script,
            int checksum,
            String installedBy,
            java.time.Instant installedOn,
            int executionTime,
            boolean success) {
    }

    private static Set<String> metadataTables(Connection connection) throws Exception {
        Set<String> tables = new HashSet<>();
        DatabaseMetaData metadata = connection.getMetaData();
        try (ResultSet result = metadata.getTables(connection.getCatalog(), null, "hzb_%", new String[]{"TABLE"})) {
            while (result.next()) {
                tables.add(result.getString("TABLE_NAME").toLowerCase(Locale.ROOT));
            }
        }
        return tables;
    }

    private static void validateHibernateMappings(String jdbcUrl, String dialect) throws Exception {
        StandardServiceRegistryBuilder registryBuilder = new StandardServiceRegistryBuilder()
                .applySetting("jakarta.persistence.jdbc.url", jdbcUrl)
                .applySetting("jakarta.persistence.jdbc.user", USERNAME)
                .applySetting("jakarta.persistence.jdbc.password", PASSWORD)
                .applySetting("hibernate.dialect", dialect)
                .applySetting("hibernate.physical_naming_strategy",
                        "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy")
                .applySetting("hibernate.hbm2ddl.auto", "validate");
        StandardServiceRegistry registry = registryBuilder.build();
        try {
            MetadataSources sources = new MetadataSources(registry);
            ClassPathScanningCandidateComponentProvider scanner =
                    new ClassPathScanningCandidateComponentProvider(false);
            scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
            scanner.findCandidateComponents("org.apache.hertzbeat").stream()
                    .map(definition -> definition.getBeanClassName())
                    .map(TargetSchemaProvisionerDatabaseTest::loadClass)
                    .forEach(sources::addAnnotatedClass);
            try (SessionFactory ignored = sources.buildMetadata().buildSessionFactory()) {
                assertThat(ignored.getMetamodel().getEntities()).hasSize(48);
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private static Class<?> loadClass(String className) {
        try {
            return Class.forName(className);
        } catch (ClassNotFoundException exception) {
            throw new IllegalStateException("Mapped entity class is unavailable", exception);
        }
    }
}
