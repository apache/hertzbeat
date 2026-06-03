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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;
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
            "hzb_auth_token"
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

    private static Path repoRoot() {
        Path userDir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        if (Files.exists(userDir.resolve("pom.xml"))
                && Files.exists(userDir.resolve("hertzbeat-startup/pom.xml"))) {
            return userDir;
        }
        return userDir.getParent();
    }
}
