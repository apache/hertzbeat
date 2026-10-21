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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Entity;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.LocalDateTime;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.apache.hertzbeat.common.entity.manager.SignalSavedViewEntity;
import org.apache.hertzbeat.manager.dao.SignalSavedViewDao;
import org.apache.hertzbeat.manager.config.MySqlJpaConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.flywaydb.core.Flyway;
import org.hibernate.SessionFactory;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.engine.jdbc.env.spi.JdbcEnvironment;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.mock.env.MockEnvironment;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Actual saved-query repository CRUD against the shipped schema, including literal legacy TEXT. */
class SignalSavedViewPersistenceTest {
    private static final String USER = "hertzbeat";
    private static final String PASSWORD = "test-only-password";
    private static final String LEGACY_ROUTE = "/log/manage?query=legacy%20text";
    private static final String LEGACY_PAYLOAD = "{\"createdAt\":1788666231854,\"unknown\":\"preserve\"}";
    private static final String QUERY_SNAPSHOT = "/explore?signal=logs&query=" + "escaped%20value%2B".repeat(100);

    @Test
    void h2PreservesSavedQueriesAcrossCrud() throws Exception {
        String url = "jdbc:h2:mem:saved-query-" + UUID.randomUUID() + ";MODE=MYSQL;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration/h2").load().migrate();
        verifyPersistence(url, "sa", "");
    }

    @Test
    @EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
    void mysqlPreservesSavedQueriesAcrossCrud() throws Exception {
        try (MySQLContainer database = new MySQLContainer("mysql:8.4")
                .withDatabaseName("hertzbeat").withUsername(USER).withPassword(PASSWORD)
                .withCommand("--lower-case-table-names=1")) {
            database.start();
            new FlywayTargetSchemaProvisioner().provision(new MetadataDatabaseConfiguration(
                    MetadataDatabaseKind.MYSQL, database.getJdbcUrl(), USER, PASSWORD));
            verifyPersistence(database.getJdbcUrl(), USER, PASSWORD);
        }
    }

    @Test
    @EnabledIfSystemProperty(named = "hertzbeat.test.database-containers", matches = "true")
    void postgresqlPreservesSavedQueriesAcrossCrud() throws Exception {
        try (PostgreSQLContainer database = new PostgreSQLContainer("postgres:17.6")
                .withDatabaseName("hertzbeat").withUsername(USER).withPassword(PASSWORD)) {
            database.start();
            new FlywayTargetSchemaProvisioner().provision(new MetadataDatabaseConfiguration(
                    MetadataDatabaseKind.POSTGRESQL, database.getJdbcUrl(), USER, PASSWORD));
            verifyPersistence(database.getJdbcUrl(), USER, PASSWORD);
        }
    }

    private void verifyPersistence(String url, String username, String password) throws Exception {
        try (var connection = DriverManager.getConnection(url, username, password)) {
            String quote = connection.getMetaData().getIdentifierQuoteString();
            String column = connection.getMetaData().storesUpperCaseIdentifiers() ? "SIGNAL" : "signal";
            try (var insert = connection.prepareStatement("INSERT INTO hzb_signal_saved_view "
                    + "(creator," + quote + column + quote + ",view_key,label,route,query_snapshot,payload) VALUES (?,?,?,?,?,?,?)")) {
                insert.setString(1, "original");
                insert.setString(2, "logs");
                insert.setString(3, "legacy");
                insert.setString(4, "Legacy");
                insert.setString(5, LEGACY_ROUTE);
                insert.setString(6, LEGACY_ROUTE);
                insert.setString(7, LEGACY_PAYLOAD);
                insert.executeUpdate();
            }
        }
        Map<String, Object> settings = new HashMap<>();
        new MySqlJpaConfiguration().mysqlKeywordQuoting(new MockEnvironment().withProperty("spring.datasource.url", url))
                .customize(settings);
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.url", url)
                .applySetting("hibernate.connection.username", username)
                .applySetting("hibernate.connection.password", password)
                .applySetting("hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy")
                .applySettings(settings)
                .build();
        try {
            MetadataSources sources = new MetadataSources(registry);
            ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
            scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
            for (var definition : scanner.findCandidateComponents("org.apache.hertzbeat")) {
                sources.addAnnotatedClass(Class.forName(definition.getBeanClassName()));
            }
            Metadata metadata = sources.buildMetadata();
            assertEquals(TargetSchemaBaselineResourceTest.mappedTables().size(), metadata.getEntityBindings().size());
            verifyQuotedColumns(url, username, password, metadata, registry);
            try (SessionFactory factory = metadata.buildSessionFactory()) {
                try (EntityManager reader = factory.createEntityManager()) {
                    reader.getTransaction().begin();
                    SignalSavedViewEntity legacy = repository(reader).findBySignalAndViewKey("logs", "legacy").orElseThrow();
                    assertEquals(LEGACY_ROUTE, legacy.getRoute());
                    assertEquals(LEGACY_ROUTE, legacy.getQuerySnapshot());
                    assertEquals(LEGACY_PAYLOAD, legacy.getPayload());
                    reader.getTransaction().commit();
                }
                for (String signal : List.of("metrics", "logs", "traces")) {
                    String payload = "{\"version\":1,\"query\":{\"signal\":\"" + signal
                            + "\",\"timeRange\":\"30m\",\"windowMode\":\"relative\",\"query\":\""
                            + "quoted\\\"line\\n\u20ac".repeat(100) + "\"}}";
                    Long id;
                    try (EntityManager writer = factory.createEntityManager()) {
                        writer.getTransaction().begin();
                        SignalSavedViewEntity entity = SignalSavedViewEntity.builder().creator("operator").signal(signal)
                                .viewKey("shared-key").label("Native " + signal).route("/explore?signal=" + signal)
                                .querySnapshot(QUERY_SNAPSHOT).payload(payload).createTime(LocalDateTime.now())
                                .updateTime(LocalDateTime.now()).build();
                        repository(writer).saveAndFlush(entity);
                        id = entity.getId();
                        assertNotNull(id);
                        writer.getTransaction().commit();
                    }
                    try (EntityManager reader = factory.createEntityManager()) {
                        reader.getTransaction().begin();
                        SignalSavedViewEntity loaded = repository(reader).findBySignalAndViewKey(signal, "shared-key").orElseThrow();
                        assertEquals(id, loaded.getId());
                        assertEquals(payload, loaded.getPayload());
                        assertEquals(QUERY_SNAPSHOT, loaded.getQuerySnapshot());
                        assertTrue(repository(reader).findBySignalOrderByUpdateTimeDesc(signal).stream()
                                .anyMatch(view -> view.getId().equals(id)));
                        reader.getTransaction().commit();
                    }
                    assertStoredText(url, username, password, id, payload, QUERY_SNAPSHOT);
                    String updated = payload.replace("\"windowMode\":\"relative\"", "\"windowMode\":\"absolute\"");
                    try (EntityManager writer = factory.createEntityManager()) {
                        writer.getTransaction().begin();
                        SignalSavedViewEntity loaded = repository(writer).findById(id).orElseThrow();
                        loaded.setPayload(updated);
                        loaded.setQuerySnapshot(null);
                        repository(writer).saveAndFlush(loaded);
                        writer.getTransaction().commit();
                    }
                    assertStoredText(url, username, password, id, updated, null);
                    try (EntityManager writer = factory.createEntityManager()) {
                        writer.getTransaction().begin();
                        repository(writer).delete(repository(writer).findBySignalAndViewKey(signal, "shared-key").orElseThrow());
                        repository(writer).flush();
                        writer.getTransaction().commit();
                    }
                    try (EntityManager reader = factory.createEntityManager()) {
                        assertTrue(repository(reader).findById(id).isEmpty());
                    }
                }
                try (EntityManager reader = factory.createEntityManager()) {
                    reader.getTransaction().begin();
                    SignalSavedViewEntity legacy = repository(reader).findBySignalAndViewKey("logs", "legacy").orElseThrow();
                    assertEquals(LEGACY_PAYLOAD, legacy.getPayload());
                    assertEquals(LEGACY_ROUTE, legacy.getQuerySnapshot());
                    reader.getTransaction().commit();
                }
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private void verifyQuotedColumns(String url, String username, String password, Metadata metadata,
                                     StandardServiceRegistry registry) throws Exception {
        var dialect = registry.getService(JdbcEnvironment.class).getDialect();
        try (var connection = DriverManager.getConnection(url, username, password);
                var statement = connection.createStatement()) {
            for (var table : metadata.collectTableMappings()) {
                for (var column : table.getColumns()) {
                    if (column.isQuoted()) {
                        String name = column.getQuotedName(dialect);
                        try (var rows = statement.executeQuery("SELECT " + name + " FROM " + table.getQuotedName(dialect) + " WHERE 1=0")) {
                            assertFalse(rows.next());
                        }
                        assertEquals(0, statement.executeUpdate("UPDATE " + table.getQuotedName(dialect)
                                + " SET " + name + "=" + name + " WHERE 1=0"));
                    }
                }
            }
        }
    }

    private void assertStoredText(String url, String username, String password, Long id, String payload, String snapshot) throws Exception {
        try (var connection = DriverManager.getConnection(url, username, password);
                var query = connection.prepareStatement("SELECT payload,query_snapshot FROM hzb_signal_saved_view WHERE id=?")) {
            query.setLong(1, id);
            try (var rows = query.executeQuery()) {
                assertTrue(rows.next());
                assertEquals(payload, rows.getString(1));
                assertArrayEquals(payload.getBytes(StandardCharsets.UTF_8), rows.getBytes(1));
                assertEquals(snapshot, rows.getString(2));
                assertArrayEquals(snapshot == null ? null : snapshot.getBytes(StandardCharsets.UTF_8), rows.getBytes(2));
            }
        }
    }

    private SignalSavedViewDao repository(EntityManager manager) {
        return new JpaRepositoryFactory(manager).getRepository(SignalSavedViewDao.class);
    }
}
