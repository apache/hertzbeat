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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import jakarta.persistence.EntityManager;
import jakarta.persistence.OptimisticLockException;
import java.sql.DriverManager;
import java.util.UUID;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardEntity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.flywaydb.core.Flyway;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Native entity persistence and competing transactions against the shipped TEXT schema. */
class SignalDashboardPersistenceTest {
    private static final String USER = "hertzbeat";
    private static final String PASSWORD = "test-only-password";
    private static final String DOCUMENT = """
            {"kind":"Dashboard","metadata":{"name":"native","project":"hertzbeat"},
            "spec":{"display":{"name":"Native","description":"\u20ac"},"duration":"30m","variables":[],
            "panels":{},"layouts":[{"kind":"Grid","spec":{"items":[]}}]}}
            """;

    @Test
    void h2PersistsTextAndRejectsStaleTransactions() throws Exception {
        String url = "jdbc:h2:mem:dashboard-" + UUID.randomUUID() + ";MODE=MYSQL;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration/h2").load().migrate();
        verifyPersistence(url, "sa", "");
    }

    @Test
    @EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
    void postgresqlPersistsTextAndRejectsStaleTransactions() throws Exception {
        try (PostgreSQLContainer database = new PostgreSQLContainer("postgres:17.6")
                .withDatabaseName("hertzbeat").withUsername(USER).withPassword(PASSWORD)) {
            database.start();
            new FlywayTargetSchemaProvisioner().provision(new MetadataDatabaseConfiguration(
                    MetadataDatabaseKind.POSTGRESQL, database.getJdbcUrl(), USER, PASSWORD));
            verifyPersistence(database.getJdbcUrl(), USER, PASSWORD);
        }
    }

    @Test
    @EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
    void mysqlPersistsTextAndRejectsStaleTransactions() throws Exception {
        try (MySQLContainer database = new MySQLContainer("mysql:8.4")
                .withDatabaseName("hertzbeat").withUsername(USER).withPassword(PASSWORD)
                .withCommand("--lower-case-table-names=1")) {
            database.start();
            new FlywayTargetSchemaProvisioner().provision(new MetadataDatabaseConfiguration(
                    MetadataDatabaseKind.MYSQL, database.getJdbcUrl(), USER, PASSWORD));
            verifyPersistence(database.getJdbcUrl(), USER, PASSWORD);
        }
    }

    private void verifyPersistence(String url, String username, String password) throws Exception {
        // A pre-document row contains literal TEXT, not a PostgreSQL large-object identifier.
        try (var connection = DriverManager.getConnection(url, username, password);
                var statement = connection.createStatement()) {
            statement.executeUpdate("INSERT INTO hzb_signal_dashboard "
                    + "(creator,dashboard_key,title,layout,widgets,variables,panel_map,version) "
                    + "VALUES ('original','legacy','Legacy','[ ]','[]','[  ]','{ }','v1')");
        }
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.url", url)
                .applySetting("hibernate.connection.username", username)
                .applySetting("hibernate.connection.password", password)
                .build();
        try (SessionFactory factory = new MetadataSources(registry).addAnnotatedClass(SignalDashboardEntity.class)
                .buildMetadata().buildSessionFactory()) {
            try (EntityManager reader = factory.createEntityManager()) {
                SignalDashboardEntity legacy = reader.createQuery(
                        "from SignalDashboardEntity where dashboardKey = 'legacy'", SignalDashboardEntity.class).getSingleResult();
                assertEquals("[ ]", legacy.getLayout());
                assertEquals("[  ]", legacy.getVariables());
                assertEquals("{ }", legacy.getPanelMap());
                assertEquals(0L, legacy.getRevision());
            }
            Long id;
            try (EntityManager writer = factory.createEntityManager()) {
                writer.getTransaction().begin();
                SignalDashboardEntity entity = SignalDashboardEntity.builder().creator("operator").dashboardKey("native")
                        .title("Native").layout("[]").widgets("[]").variables("[]").panelMap("{}")
                        .version("hertzbeat-perses-v1").document(DOCUMENT).build();
                repository(writer).saveAndFlush(entity);
                assertNotNull(entity.getId());
                assertEquals(0L, entity.getRevision());
                id = entity.getId();
                writer.getTransaction().commit();
            }
            try (var connection = DriverManager.getConnection(url, username, password);
                    var statement = connection.createStatement();
                    var result = statement.executeQuery("SELECT document,layout,widgets,variables,panel_map FROM hzb_signal_dashboard "
                            + "WHERE dashboard_key='native'")) {
                result.next();
                assertEquals(DOCUMENT, result.getString(1));
                assertEquals("[]", result.getString(2));
                assertEquals("[]", result.getString(3));
                assertEquals("[]", result.getString(4));
                assertEquals("{}", result.getString(5));
            }
            try (EntityManager duplicate = factory.createEntityManager()) {
                duplicate.getTransaction().begin();
                SignalDashboardEntity entity = SignalDashboardEntity.builder().creator("other").dashboardKey("native")
                        .title("Duplicate").layout("[]").widgets("[]").version("v1").build();
                assertThrows(org.hibernate.exception.ConstraintViolationException.class,
                        () -> repository(duplicate).saveAndFlush(entity));
                duplicate.getTransaction().rollback();
            }
            for (boolean delete : new boolean[]{false, true}) {
                try (EntityManager first = factory.createEntityManager(); EntityManager second = factory.createEntityManager()) {
                    first.getTransaction().begin();
                    second.getTransaction().begin();
                    SignalDashboardEntity winner = first.find(SignalDashboardEntity.class, id);
                    SignalDashboardEntity loser = second.find(SignalDashboardEntity.class, id);
                    long oldRevision = winner.getRevision();
                    assertEquals(oldRevision, loser.getRevision());
                    assertEquals(DOCUMENT, winner.getDocument());
                    winner.setTitle(delete ? "Update before stale delete" : "First update");
                    repository(first).saveAndFlush(winner);
                    first.getTransaction().commit();
                    assertEquals(oldRevision + 1, winner.getRevision());
                    if (delete) {
                        repository(second).delete(loser);
                        assertThrows(OptimisticLockException.class, () -> repository(second).flush());
                    } else {
                        loser.setTitle("Losing update");
                        assertThrows(OptimisticLockException.class, () -> repository(second).saveAndFlush(loser));
                    }
                    second.getTransaction().rollback();
                }
            }
            try (EntityManager writer = factory.createEntityManager()) {
                writer.getTransaction().begin();
                SignalDashboardEntity latest = writer.find(SignalDashboardEntity.class, id);
                assertEquals("Update before stale delete", latest.getTitle());
                assertEquals(2L, latest.getRevision());
                repository(writer).delete(latest);
                repository(writer).flush();
                writer.getTransaction().commit();
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private SimpleJpaRepository<SignalDashboardEntity, Long> repository(EntityManager manager) {
        return new SimpleJpaRepository<>(SignalDashboardEntity.class, manager);
    }
}
