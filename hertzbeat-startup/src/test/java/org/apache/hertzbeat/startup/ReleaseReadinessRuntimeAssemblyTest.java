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

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Column;
import jakarta.persistence.Table;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardEntity;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardPanelDraftEntity;
import org.apache.hertzbeat.common.entity.manager.SignalSavedViewEntity;
import org.junit.jupiter.api.Test;

/**
 * Release-readiness guard for the runtime assembly and migration baseline.
 */
class ReleaseReadinessRuntimeAssemblyTest {

    private static final List<String> ENTITY_FOUNDATION_TABLES = List.of(
            "hzb_entity",
            "hzb_entity_identity",
            "hzb_entity_monitor_bind",
            "hzb_entity_relation",
            "hzb_entity_definition_activity",
            "hzb_entity_governance_state",
            "hzb_auth_token",
            "hzb_signal_saved_view",
            "hzb_signal_dashboard_panel_draft",
            "hzb_signal_dashboard"
    );
    private static final Map<String, List<String>> SIGNAL_WORKSPACE_TABLE_COLUMNS = Map.of(
            "hzb_signal_saved_view", List.of(
                    "id",
                    "creator",
                    "signal",
                    "view_key",
                    "label",
                    "description",
                    "route",
                    "query_snapshot",
                    "payload",
                    "create_time",
                    "update_time"
            ),
            "hzb_signal_dashboard_panel_draft", List.of(
                    "id",
                    "creator",
                    "signal",
                    "draft_key",
                    "title",
                    "description",
                    "visualization",
                    "route",
                    "query_snapshot",
                    "payload",
                    "create_time",
                    "update_time"
            ),
            "hzb_signal_dashboard", List.of(
                    "id",
                    "creator",
                    "dashboard_key",
                    "title",
                    "description",
                    "tags",
                    "layout",
                    "widgets",
                    "variables",
                    "panel_map",
                    "version",
                    "create_time",
                    "update_time"
            )
    );
    private static final Map<String, List<String>> SIGNAL_WORKSPACE_TABLE_INDEXES = Map.of(
            "hzb_signal_saved_view", List.of(
                    "uk_hzb_signal_saved_view_signal_key",
                    "idx_hzb_signal_saved_view_signal",
                    "idx_hzb_signal_saved_view_update"
            ),
            "hzb_signal_dashboard_panel_draft", List.of(
                    "uk_hzb_signal_dashboard_panel_draft_creator_signal_key",
                    "idx_hzb_signal_dashboard_panel_draft_creator_signal",
                    "idx_hzb_signal_dashboard_panel_draft_update"
            ),
            "hzb_signal_dashboard", List.of(
                    "uk_hzb_signal_dashboard_key",
                    "idx_hzb_signal_dashboard_update"
            )
    );

    @Test
    void rootReactorAggregatesObservabilityForReleaseBuilds() throws IOException {
        String rootPom = readRepoFile("pom.xml");

        assertThat(tagValues(rootPom, "module")).contains("hertzbeat-observability");
        assertThat(dependencyBlock(rootPom, "hertzbeat-observability"))
                .contains("<version>${hertzbeat.version}</version>");
    }

    @Test
    void startupCarriesObservabilityAsRuntimeDependency() throws IOException {
        String startupPom = readRepoFile("hertzbeat-startup/pom.xml");

        assertThat(dependencyBlock(startupPom, "hertzbeat-observability"))
                .doesNotContain("<scope>test</scope>")
                .doesNotContain("<scope>provided</scope>");
    }

    @Test
    void aiMcpRuntimeCarriesCommonAutoconfigure() throws IOException {
        String startupPom = readRepoFile("hertzbeat-startup/pom.xml");
        String aiPom = readRepoFile("hertzbeat-ai/pom.xml");

        assertThat(dependencyBlock(startupPom, "hertzbeat-ai"))
                .doesNotContain("<scope>test</scope>")
                .doesNotContain("<scope>provided</scope>");
        assertThat(dependencyBlock(aiPom, "spring-ai-autoconfigure-mcp-server-common"))
                .contains("<groupId>org.springframework.ai</groupId>")
                .doesNotContain("<scope>test</scope>")
                .doesNotContain("<scope>provided</scope>");
    }

    @Test
    void entityFoundationMigrationsCoverSupportedRelationalDatabases() throws IOException {
        for (String database : List.of("mysql", "postgresql", "h2")) {
            String migration = readRepoFile(
                    "hertzbeat-startup/src/main/resources/db/migration/"
                            + database
                            + "/V200__create_entity_foundation.sql"
            ).toLowerCase();

            assertThat(migration)
                    .as(database + " migration should create the entity catalog and token foundation")
                    .contains(ENTITY_FOUNDATION_TABLES.toArray(String[]::new));
            assertThat(migration).contains("token_hash");
            assertThat(migration).contains("uk_hzb_auth_token_hash");
        }
    }

    @Test
    void entityGovernanceStateWorkspaceBoundaryLivesInV200Baseline() throws IOException {
        for (String database : List.of("mysql", "postgresql", "h2")) {
            String migration = readRepoFile(
                    "hertzbeat-startup/src/main/resources/db/migration/"
                            + database
                            + "/V200__create_entity_foundation.sql"
            ).toLowerCase();

            assertThat(migration)
                    .contains("hzb_entity_governance_state")
                    .contains("workspace_id")
                    .contains("default")
                    .contains("idx_hzb_entity_governance_state_scope_kind_workspace")
                    .contains("uk_hzb_entity_governance_state_scope_kind_workspace_key");
        }
    }

    @Test
    void signalSavedViewsLiveInV200Baseline() throws IOException {
        for (String database : List.of("mysql", "postgresql", "h2")) {
            String migration = readRepoFile(
                    "hertzbeat-startup/src/main/resources/db/migration/"
                            + database
                            + "/V200__create_entity_foundation.sql"
            ).toLowerCase();

            assertThat(migration)
                    .contains("hzb_signal_saved_view")
                    .contains("creator")
                    .contains("signal")
                    .contains("view_key")
                    .contains("route")
                    .contains("query_snapshot")
                    .contains("payload")
                    .contains("uk_hzb_signal_saved_view_signal_key")
                    .contains("idx_hzb_signal_saved_view_signal");
        }
    }

    @Test
    void signalDashboardPanelDraftsLiveInV200Baseline() throws IOException {
        for (String database : List.of("mysql", "postgresql", "h2")) {
            String migration = readRepoFile(
                    "hertzbeat-startup/src/main/resources/db/migration/"
                            + database
                            + "/V200__create_entity_foundation.sql"
            ).toLowerCase();

            assertThat(migration)
                    .contains("hzb_signal_dashboard_panel_draft")
                    .contains("creator")
                    .contains("signal")
                    .contains("draft_key")
                    .contains("title")
                    .contains("visualization")
                    .contains("route")
                    .contains("query_snapshot")
                    .contains("payload")
                    .contains("uk_hzb_signal_dashboard_panel_draft_creator_signal_key")
                    .contains("idx_hzb_signal_dashboard_panel_draft_creator_signal");
        }
    }

    @Test
    void signalDashboardsLiveInV200Baseline() throws IOException {
        for (String database : List.of("mysql", "postgresql", "h2")) {
            String migration = readRepoFile(
                    "hertzbeat-startup/src/main/resources/db/migration/"
                            + database
                            + "/V200__create_entity_foundation.sql"
            ).toLowerCase();

            assertThat(migration)
                    .contains("hzb_signal_dashboard")
                    .contains("creator")
                    .contains("dashboard_key")
                    .contains("title")
                    .contains("layout")
                    .contains("widgets")
                    .contains("variables")
                    .contains("panel_map")
                    .contains("uk_hzb_signal_dashboard_key")
                    .contains("idx_hzb_signal_dashboard_update");
        }
    }

    @Test
    void signalWorkspaceTablesKeepAlignedV200SchemaAcrossDatabases() throws IOException {
        for (String database : List.of("mysql", "postgresql", "h2")) {
            String migration = readRepoFile(
                    "hertzbeat-startup/src/main/resources/db/migration/"
                            + database
                            + "/V200__create_entity_foundation.sql"
            ).toLowerCase();

            SIGNAL_WORKSPACE_TABLE_COLUMNS.forEach((table, columns) -> {
                assertThat(migration)
                        .as(database + " V200 migration should create " + table)
                        .contains("create table")
                        .contains(table);
                assertThat(migration)
                        .as(database + " V200 " + table + " columns should match the signal workspace entity contract")
                        .contains(columns.toArray(String[]::new));
            });
            SIGNAL_WORKSPACE_TABLE_INDEXES.forEach((table, indexes) -> assertThat(migration)
                    .as(database + " V200 " + table + " indexes should match the signal workspace lookup contract")
                    .contains(indexes.toArray(String[]::new)));
        }
    }

    @Test
    void signalWorkspaceEntitiesMatchV200BaselineContract() throws IOException {
        assertSignalEntitySchema(
                SignalSavedViewEntity.class,
                "hzb_signal_saved_view",
                List.of("signal", "view_key")
        );
        assertSignalEntitySchema(
                SignalDashboardPanelDraftEntity.class,
                "hzb_signal_dashboard_panel_draft",
                List.of("creator", "signal", "draft_key")
        );
        assertSignalEntitySchema(
                SignalDashboardEntity.class,
                "hzb_signal_dashboard",
                List.of("dashboard_key")
        );
    }

    @Test
    void signalWorkspaceTablesStayInV200BaselineOnly() throws IOException {
        Path migrationRoot = repoRoot().resolve("hertzbeat-startup/src/main/resources/db/migration");
        try (Stream<Path> migrationFiles = Files.walk(migrationRoot)) {
            List<String> laterSignalMigrations = migrationFiles
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".sql"))
                    .filter(path -> !path.getFileName().toString().startsWith("V200__create_entity_foundation"))
                    .filter(path -> containsSignalWorkspaceTable(path))
                    .map(migrationRoot::relativize)
                    .map(Path::toString)
                    .toList();

            assertThat(laterSignalMigrations)
                    .as("signal workspace tables must stay in the V200 baseline instead of a later V213-style migration")
                    .isEmpty();
        }
    }

    @Test
    void signalWorkspaceRbacKeepsSharedAssetsReadableAndWritableByEditorsOnly() throws IOException {
        String sureness = readRepoFile("hertzbeat-startup/src/main/resources/sureness.yml");

        assertSurenessRule(sureness, "/api/signal/saved-view/**", "get", List.of("admin", "user", "guest"));
        assertSurenessRule(sureness, "/api/signal/saved-view", "put", List.of("admin", "user"));
        assertSurenessRule(sureness, "/api/signal/saved-view/**", "delete", List.of("admin", "user"));

        assertSurenessRule(sureness, "/api/signal/dashboard", "get", List.of("admin", "user", "guest"));
        assertSurenessRule(sureness, "/api/signal/dashboard", "put", List.of("admin", "user"));
        assertSurenessRule(sureness, "/api/signal/dashboard/**", "delete", List.of("admin", "user"));

        assertSurenessRule(sureness, "/api/signal/dashboard-panel-draft/**", "get", List.of("admin", "user"));
        assertSurenessRule(sureness, "/api/signal/dashboard-panel-draft", "put", List.of("admin", "user"));
        assertSurenessRule(sureness, "/api/signal/dashboard-panel-draft/**", "delete", List.of("admin", "user"));
    }

    private static List<String> tagValues(String content, String tagName) {
        Pattern pattern = Pattern.compile("<" + tagName + ">\\s*([^<]+?)\\s*</" + tagName + ">");
        return pattern.matcher(content)
                .results()
                .map(MatchResult::group)
                .map(value -> value.replaceAll("<[^>]+>", "").trim())
                .toList();
    }

    private static String dependencyBlock(String pom, String artifactId) {
        Pattern pattern = Pattern.compile("<dependency>\\s*[\\s\\S]*?<artifactId>"
                + Pattern.quote(artifactId)
                + "</artifactId>[\\s\\S]*?</dependency>");
        return pattern.matcher(pom)
                .results()
                .map(MatchResult::group)
                .findFirst()
                .orElse("");
    }

    private static String readRepoFile(String relativePath) throws IOException {
        Path repoRoot = repoRoot();
        return Files.readString(repoRoot.resolve(relativePath));
    }

    private static void assertSignalEntitySchema(Class<?> entityClass, String tableName,
                                                 List<String> uniqueColumns) throws IOException {
        Table table = entityClass.getAnnotation(Table.class);
        assertThat(table)
                .as(entityClass.getSimpleName() + " should declare a JPA table")
                .isNotNull();
        assertThat(table.name()).isEqualTo(tableName);
        assertThat(Arrays.stream(table.uniqueConstraints())
                .map(constraint -> Arrays.asList(constraint.columnNames()))
                .toList())
                .as(entityClass.getSimpleName() + " should keep the entity uniqueness contract")
                .contains(uniqueColumns);

        Set<String> entityColumns = Arrays.stream(entityClass.getDeclaredFields())
                .filter(field -> field.isAnnotationPresent(Column.class))
                .map(field -> field.getAnnotation(Column.class).name())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> expectedColumns = SIGNAL_WORKSPACE_TABLE_COLUMNS.get(tableName)
                .stream()
                .filter(column -> !"id".equals(column))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        assertThat(entityColumns)
                .as(entityClass.getSimpleName() + " columns should match the V200 baseline contract")
                .containsExactlyInAnyOrderElementsOf(expectedColumns);

        for (String database : List.of("mysql", "postgresql", "h2")) {
            String migration = readRepoFile(
                    "hertzbeat-startup/src/main/resources/db/migration/"
                            + database
                            + "/V200__create_entity_foundation.sql"
            ).toLowerCase();
            assertThat(migration)
                    .as(database + " V200 migration should contain " + entityClass.getSimpleName() + " columns")
                    .contains(tableName)
                    .contains(entityColumns.toArray(String[]::new));
        }
    }

    private static void assertSurenessRule(String sureness, String path, String method, List<String> roles) {
        String rule = "- " + path + "===" + method + "===[" + String.join(",", roles) + "]";
        assertThat(sureness)
                .as("startup sureness.yml should contain " + rule)
                .contains(rule);
    }

    private static boolean containsSignalWorkspaceTable(Path path) {
        try {
            String content = Files.readString(path).toLowerCase();
            return content.contains("hzb_signal_saved_view")
                    || content.contains("hzb_signal_dashboard_panel_draft")
                    || content.contains("hzb_signal_dashboard");
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read migration " + path, e);
        }
    }

    private static Path repoRoot() {
        Path userDir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        if (Files.exists(userDir.resolve("pom.xml"))
                && Files.exists(userDir.resolve("hertzbeat-startup/pom.xml"))) {
            return userDir;
        }
        return userDir.getParent();
    }
}
