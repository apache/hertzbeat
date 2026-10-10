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

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real B200 copy proof against the supported external metadata databases. */
@EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
class JdbcMetadataMigrationDatabaseTest {

    private static final String DATABASE = "hertzbeat";
    private static final String USERNAME = "hertzbeat";
    private static final String PASSWORD = "test-only-password";

    @Test
    void copiesAndVerifiesB200MetadataIntoMysql() throws Exception {
        try (MySQLContainer database = new MySQLContainer("mysql:8.4")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)
                .withCommand("--lower-case-table-names=1", "--log-bin-trust-function-creators=1")) {
            database.start();
            proveCopy(database.getJdbcUrl(), MetadataDatabaseKind.MYSQL);
        }
    }

    @Test
    void copiesAndVerifiesB200MetadataAndOidTextIntoPostgresql() throws Exception {
        try (PostgreSQLContainer database = new PostgreSQLContainer("postgres:17.6")
                .withDatabaseName(DATABASE)
                .withUsername(USERNAME)
                .withPassword(PASSWORD)) {
            database.start();
            proveCopy(database.getJdbcUrl(), MetadataDatabaseKind.POSTGRESQL);
        }
    }

    private static void proveCopy(String targetUrl, MetadataDatabaseKind targetKind) throws Exception {
        String sourceUrl = "jdbc:h2:mem:migration_" + targetKind.value()
                + ";MODE=MYSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE";
        createSourceSchema(sourceUrl);
        new FlywayTargetSchemaProvisioner().provision(
                new MetadataDatabaseConfiguration(targetKind, targetUrl, USERNAME, PASSWORD));
        try (Connection source = DriverManager.getConnection(sourceUrl, "sa", "");
                Connection target = DriverManager.getConnection(targetUrl, USERNAME, PASSWORD)) {
            var expectedTables = TargetSchemaBaseline.load(targetKind).expectedTables();
            var sourceSchema = MetadataSchemaInventory.capture(source, expectedTables, MetadataDatabaseKind.H2,
                    new MigrationDeadline(Duration.ofMinutes(1)));
            var targetSchema = MetadataSchemaInventory.capture(target, expectedTables, targetKind,
                    new MigrationDeadline(Duration.ofMinutes(1)));
            for (String table : expectedTables) {
                assertThat(sourceSchema.table(table).hasSamePortableShape(
                        targetSchema.table(table), MetadataDatabaseKind.H2, targetKind))
                        .as("Portable schema %s: source=%s target=%s", table, sourceSchema.table(table), targetSchema.table(table))
                        .isTrue();
            }
            OffsetDateTime storedPeriodStart = insertSourceFixtures(source);
            assertTargetTriggerRejected(source, target, targetKind);
            if (targetKind == MetadataDatabaseKind.POSTGRESQL) {
                assertOidRollbackLeavesNoOrphan(source, target, targetKind);
            }
            List<Progress> progress = new ArrayList<>();
            assertConcurrentWriterExcluded(source, target, targetUrl, targetKind, progress);

            assertThat(source.isClosed()).isFalse();
            assertThat(target.isClosed()).isFalse();
            assertThat(progress).isNotEmpty();
            assertThat(progress.getLast()).isEqualTo(new Progress(MetadataMigrationStage.COMPLETE, 100));
            assertCopiedValues(target, targetKind, storedPeriodStart);
            assertNextIdentifier(target, targetKind);
        }
    }

    private static void assertOidRollbackLeavesNoOrphan(
            Connection source,
            Connection target,
            MetadataDatabaseKind targetKind) throws Exception {
        long largeObjectsBefore = count(target, "SELECT count(*) FROM pg_largeobject_metadata");
        assertThat(count(source, "SELECT count(*) FROM hzb_notice_template WHERE id = 43"))
                .isEqualTo(1);
        JdbcMetadataMigration failingMigration = new JdbcMetadataMigration(table -> {
            if (table.equals("hzb_notice_template")) {
                throw new SQLException("Injected copy failure");
            }
        });
        assertThatThrownBy(() -> failingMigration.migrate(
                        source,
                        target,
                        targetKind,
                        Duration.ofMinutes(2),
                        MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataMigrationException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMigrationErrorCode.COPY));
        assertAllBusinessTablesEmpty(target, targetKind);
        assertThat(count(target, "SELECT count(*) FROM pg_largeobject_metadata"))
                .isEqualTo(largeObjectsBefore);
    }

    private static void assertTargetTriggerRejected(
            Connection source,
            Connection target,
            MetadataDatabaseKind targetKind) throws Exception {
        try (Statement statement = target.createStatement()) {
            if (targetKind == MetadataDatabaseKind.POSTGRESQL) {
                statement.execute("CREATE FUNCTION migration_test_trigger() RETURNS trigger LANGUAGE plpgsql AS "
                        + "'BEGIN RETURN NEW; END'");
                statement.execute("CREATE TRIGGER migration_test_trigger BEFORE INSERT ON hzb_ai_conversation "
                        + "FOR EACH ROW EXECUTE FUNCTION migration_test_trigger()");
            } else {
                statement.execute("CREATE TRIGGER migration_test_trigger BEFORE INSERT ON hzb_ai_conversation "
                        + "FOR EACH ROW SET NEW.title = NEW.title");
            }
        }
        try {
            assertThatThrownBy(() -> new JdbcMetadataMigration().migrate(
                            source,
                            target,
                            targetKind,
                            Duration.ofMinutes(2),
                            MetadataMigrationProgressSink.NO_OP))
                    .isInstanceOfSatisfying(MetadataMigrationException.class, exception ->
                            assertThat(exception.code()).isEqualTo(MetadataMigrationErrorCode.SCHEMA));
            assertAllBusinessTablesEmpty(target, targetKind);
        } finally {
            try (Statement statement = target.createStatement()) {
                if (targetKind == MetadataDatabaseKind.POSTGRESQL) {
                    statement.execute("DROP TRIGGER migration_test_trigger ON hzb_ai_conversation");
                    statement.execute("DROP FUNCTION migration_test_trigger()");
                } else {
                    statement.execute("DROP TRIGGER migration_test_trigger");
                }
            }
        }
    }

    private static void assertAllBusinessTablesEmpty(
            Connection target,
            MetadataDatabaseKind targetKind) throws Exception {
        for (String table : TargetSchemaBaseline.load(targetKind).expectedTables()) {
            String sql = "SELECT count(*) FROM " + CanonicalTableDigest.quote(table, targetKind);
            assertThat(count(target, sql)).as(table).isZero();
        }
    }

    private static void assertConcurrentWriterExcluded(
            Connection source,
            Connection target,
            String targetUrl,
            MetadataDatabaseKind targetKind,
            List<Progress> progress) throws Exception {
        CountDownLatch verified = new CountDownLatch(1);
        CountDownLatch releaseCommit = new CountDownLatch(1);
        AtomicReference<Throwable> migrationFailure = new AtomicReference<>();
        Thread migration = Thread.ofPlatform().name("metadata-migration-proof").start(() -> {
            try {
                new JdbcMetadataMigration().migrate(
                        source,
                        target,
                        targetKind,
                        Duration.ofMinutes(2),
                        (stage, percent) -> {
                            progress.add(new Progress(stage, percent));
                            if (stage == MetadataMigrationStage.REPAIRING && percent == 90) {
                                verified.countDown();
                                await(releaseCommit);
                            }
                        });
            } catch (Throwable exception) {
                migrationFailure.set(exception);
            }
        });
        assertThat(verified.await(30, TimeUnit.SECONDS)).isTrue();
        try (Connection contender = DriverManager.getConnection(targetUrl, USERNAME, PASSWORD);
                Statement statement = contender.createStatement()) {
            statement.setQueryTimeout(3);
            if (targetKind == MetadataDatabaseKind.POSTGRESQL) {
                statement.execute("SET lock_timeout = '1s'");
            } else {
                statement.execute("SET SESSION innodb_lock_wait_timeout = 1");
            }
            assertThatThrownBy(() -> statement.executeUpdate(
                            "INSERT INTO hzb_ai_conversation (id, title) VALUES (99, 'contender')"))
                    .isInstanceOf(SQLException.class);
        } finally {
            releaseCommit.countDown();
        }
        migration.join(TimeUnit.SECONDS.toMillis(30));
        assertThat(migration.isAlive()).isFalse();
        assertThat(migrationFailure.get()).isNull();
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(30, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for the concurrency proof");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrency proof was interrupted");
        }
    }

    private static long count(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertThat(rows.next()).isTrue();
            return rows.getLong(1);
        }
    }

    private static OffsetDateTime insertSourceFixtures(Connection source) throws Exception {
        try (Statement statement = source.createStatement()) {
            statement.executeUpdate("INSERT INTO hzb_ai_conversation (id, title, gmt_create) "
                    + "VALUES (41, 'source', TIMESTAMP '2026-08-09 01:02:03.456789')");
            statement.executeUpdate("INSERT INTO hzb_ai_message "
                    + "(id, conversation_id, content, role) VALUES "
                    + "(42, 41, 'Unicode é \u7A7A text', 'user')");
            statement.executeUpdate("INSERT INTO hzb_define (app, content) VALUES ('Z ', 'define-content')");
            statement.executeUpdate("INSERT INTO hzb_define (app, content) VALUES ('a', 'second-content')");
            statement.executeUpdate("INSERT INTO hzb_define (app, content) VALUES ('Ω', 'omega-content')");
            statement.executeUpdate("INSERT INTO hzb_define (app, content) VALUES ('\u4E2D', 'cjk-content')");
            statement.executeUpdate("INSERT INTO hzb_notice_template "
                    + "(id, name, type, preset, content) VALUES (43, 'template', 1, true, 'notice-content')");
            statement.executeUpdate("INSERT INTO hzb_alert_integration_verification "
                    + "(workspace_id, source, status, started_at, verified_at) VALUES "
                    + "('migration-proof', 'waiting-source', 'WAITING', 1786230000000, NULL), "
                    + "('migration-proof', 'verified-source', 'VERIFIED', 1786230000001, 1786230000002)");
        }
        OffsetDateTime start = OffsetDateTime.of(
                LocalDateTime.of(2026, 8, 9, 11, 12, 13, 456789000), ZoneOffset.ofHoursMinutes(5, 30));
        try (PreparedStatement statement = source.prepareStatement("INSERT INTO hzb_alert_silence "
                + "(id, name, enable, match_all, type, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
            statement.setLong(1, 44);
            statement.setString(2, "silence");
            statement.setBoolean(3, true);
            statement.setBoolean(4, false);
            statement.setByte(5, (byte) 0);
            statement.setObject(6, start);
            statement.setObject(7, start.plusHours(1));
            statement.executeUpdate();
        }
        try (Statement statement = source.createStatement();
                ResultSet rows = statement.executeQuery("SELECT period_start FROM hzb_alert_silence WHERE id = 44")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getTimestamp(1).toInstant()).isEqualTo(start.toInstant());
            OffsetDateTime stored = rows.getObject(1, OffsetDateTime.class);
            assertThat(stored.toLocalDateTime()).isEqualTo(rows.getObject(1, LocalDateTime.class));
            assertThat(stored.toInstant()).isEqualTo(start.toInstant());
            return stored;
        }
    }

    private static void assertCopiedValues(Connection target, MetadataDatabaseKind kind, OffsetDateTime storedPeriodStart) throws Exception {
        try (Statement statement = target.createStatement();
                ResultSet rows = statement.executeQuery("SELECT source,status,started_at,verified_at "
                        + "FROM hzb_alert_integration_verification WHERE workspace_id='migration-proof' ORDER BY source")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString(1)).isEqualTo("verified-source");
            assertThat(rows.getString(2)).isEqualTo("VERIFIED");
            assertThat(rows.getLong(3)).isEqualTo(1786230000001L);
            assertThat(rows.getLong(4)).isEqualTo(1786230000002L);
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString(1)).isEqualTo("waiting-source");
            assertThat(rows.getString(2)).isEqualTo("WAITING");
            assertThat(rows.getLong(3)).isEqualTo(1786230000000L);
            assertThat(rows.getObject(4)).isNull();
            assertThat(rows.next()).isFalse();
        }
        String contentSql = kind == MetadataDatabaseKind.POSTGRESQL
                ? "SELECT convert_from(lo_get(content), 'UTF8') FROM hzb_ai_message WHERE id = 42"
                : "SELECT content FROM hzb_ai_message WHERE id = 42";
        try (Statement statement = target.createStatement(); ResultSet rows = statement.executeQuery(contentSql)) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString(1)).isEqualTo("Unicode é \u7A7A text");
        }
        try (Statement statement = target.createStatement();
                ResultSet rows = statement.executeQuery(
                        "SELECT period_start FROM hzb_alert_silence WHERE id = 44")) {
            assertThat(rows.next()).isTrue();
            if (kind == MetadataDatabaseKind.POSTGRESQL) {
                assertThat(rows.getObject(1, OffsetDateTime.class).toInstant())
                        .isEqualTo(storedPeriodStart.toInstant());
            } else {
                assertThat(rows.getObject(1, LocalDateTime.class))
                        .isEqualTo(storedPeriodStart.toLocalDateTime());
            }
        }
    }

    private static void assertNextIdentifier(Connection target, MetadataDatabaseKind kind) throws Exception {
        String sql = kind == MetadataDatabaseKind.POSTGRESQL
                ? "INSERT INTO hzb_ai_conversation (title) VALUES ('next') RETURNING id"
                : "INSERT INTO hzb_ai_conversation (title) VALUES ('next')";
        try (PreparedStatement statement = kind == MetadataDatabaseKind.POSTGRESQL
                ? target.prepareStatement(sql)
                : target.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            if (kind == MetadataDatabaseKind.POSTGRESQL) {
                try (ResultSet rows = statement.executeQuery()) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getLong(1)).isGreaterThan(41);
                }
            } else {
                statement.executeUpdate();
                try (ResultSet rows = statement.getGeneratedKeys()) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getLong(1)).isGreaterThan(41);
                }
            }
        }
    }

    private static void createSourceSchema(String jdbcUrl) {
        Flyway.configure().dataSource(jdbcUrl, "sa", "")
                .locations("classpath:db/migration/h2").load().migrate();
    }

    private record Progress(MetadataMigrationStage stage, int percent) {
    }
}
