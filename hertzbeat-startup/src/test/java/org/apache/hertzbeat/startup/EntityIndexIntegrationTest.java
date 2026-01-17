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

package org.apache.hertzbeat.startup;

import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.AlertDefineMonitorBind;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncidentComponentBind;
import org.apache.hertzbeat.common.entity.push.PushMetrics;
import org.apache.hertzbeat.common.entity.warehouse.History;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration test for validating that entity indexes are actually created in the database.
 * This test uses H2 in-memory database to verify DDL generation and index creation.
 */
@Slf4j
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:testdb;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.show-sql=false"
})
@DisplayName("Entity Index Creation Integration Test")
class EntityIndexIntegrationTest {

    @Autowired
    private DataSource dataSource;

    public List<Class<?>> entities = List.of(
        AlertDefineMonitorBind.class,
        CollectorMonitorBind.class,
        Monitor.class,
        MonitorBind.class,
        Param.class,
        StatusPageIncidentComponentBind.class,
        PushMetrics.class,
        History.class,
        PluginParam.class
    );

    @Test
    @DisplayName("All entity indexes should be created in database")
    public void testAllEntityIndexes() throws SQLException {
        for (Class<?> entity : entities) {
            List<ExpectedIndex> expectedIndexes = parseExpectedIndexes(entity);
            if (expectedIndexes.isEmpty()) {
                continue;
            }
            Map<String, IndexMeta> actual = getIndexes(expectedIndexes.get(0).tableName());

            for (ExpectedIndex expected : expectedIndexes) {
                assertIndexExists(expected, actual);
            }
        }

    }

    private List<ExpectedIndex> parseExpectedIndexes(Class<?> entityClass) {
        Table table = entityClass.getAnnotation(Table.class);
        if (table == null) {
            return List.of();
        }
        String tableName = table.name().toUpperCase();
        List<ExpectedIndex> result = new ArrayList<>();

        for (Index idx : table.indexes()) {
            Set<String> columns = Arrays.stream(idx.columnList().split(","))
                .map(String::trim)
                .map(String::toUpperCase)
                .collect(Collectors.toSet());

            result.add(new ExpectedIndex(tableName, columns, false));
        }
        for (UniqueConstraint uc : table.uniqueConstraints()) {
            Set<String> columns = Arrays.stream(uc.columnNames())
                .map(String::toUpperCase).collect(Collectors.toSet());
            result.add(new ExpectedIndex(tableName, columns, true));
        }
        return result;
    }

    private void assertIndexExists(ExpectedIndex expected, Map<String, IndexMeta> actualIndexes) {
        boolean found = actualIndexes.values().stream().filter(idx -> !expected.unique || idx.unique).anyMatch(idx -> idx.columns.containsAll(expected.columns));
        assertTrue(found, "Expected index not found. Table=" + expected.tableName + ", columns=" + expected.columns + ", unique=" + expected.unique + ", actual=" + actualIndexes);
    }

    private Map<String, IndexMeta> getIndexes(String tableName) throws SQLException {
        Map<String, IndexMeta> indexes = new HashMap<>();

        String sql = """
            SELECT
                INDEX_NAME,
                COLUMN_NAME,
                IS_UNIQUE
            FROM INFORMATION_SCHEMA.INDEX_COLUMNS
            WHERE TABLE_NAME = ?
            """;
        try (Connection conn = dataSource.getConnection(); var ps = conn.prepareStatement(sql)) {
            ps.setString(1, tableName.toUpperCase());

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    String column = rs.getString("COLUMN_NAME");
                    boolean unique = rs.getBoolean("IS_UNIQUE");
                    if ("PRIMARY".equalsIgnoreCase(indexName)) {
                        continue;
                    }
                    indexes.computeIfAbsent(indexName, k -> new IndexMeta(unique)).columns.add(column.toUpperCase());
                }
            }
        }
        return indexes;
    }

    static class IndexMeta {
        final boolean unique;
        final Set<String> columns = new HashSet<>();

        IndexMeta(boolean unique) {
            this.unique = unique;
        }
    }

    record ExpectedIndex(String tableName, Set<String> columns, boolean unique) {

    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        public WebProperties webProperties() {
            return new WebProperties();
        }
    }
}
