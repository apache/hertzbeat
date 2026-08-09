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

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Static schema contract for provisioning an empty external metadata database. */
class TargetSchemaBaselineResourceTest {

    private static final Pattern CREATE_TABLE = Pattern.compile(
            "(?im)^\\s*create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?([a-z][a-z0-9_]*)\\s*\\(");
    private static final Set<String> MAPPED_TABLES = Set.of(
            "hzb_account",
            "hzb_ai_conversation",
            "hzb_ai_message",
            "hzb_alert_define",
            "hzb_alert_define_monitor_bind",
            "hzb_alert_group",
            "hzb_alert_group_converge",
            "hzb_alert_inhibit",
            "hzb_alert_silence",
            "hzb_alert_single",
            "hzb_auth_token",
            "hzb_bulletin",
            "hzb_collector",
            "hzb_collector_monitor_bind",
            "hzb_config",
            "hzb_define",
            "hzb_entity",
            "hzb_entity_definition_activity",
            "hzb_entity_governance_state",
            "hzb_entity_identity",
            "hzb_entity_monitor_bind",
            "hzb_entity_relation",
            "hzb_grafana_dashboard",
            "hzb_history",
            "hzb_installation",
            "hzb_metrics_favorite",
            "hzb_monitor",
            "hzb_monitor_bind",
            "hzb_notice_receiver",
            "hzb_notice_rule",
            "hzb_notice_template",
            "hzb_param",
            "hzb_param_define",
            "hzb_plugin_item",
            "hzb_plugin_metadata",
            "hzb_plugin_param",
            "hzb_push_metrics",
            "hzb_signal_dashboard",
            "hzb_signal_dashboard_panel_draft",
            "hzb_signal_saved_view",
            "hzb_sop_schedule",
            "hzb_status_page_component",
            "hzb_status_page_history",
            "hzb_status_page_incident",
            "hzb_status_page_incident_component_bind",
            "hzb_status_page_incident_content",
            "hzb_status_page_org",
            "hzb_tag");

    @ParameterizedTest
    @ValueSource(strings = {"mysql", "postgresql"})
    void currentBaselineDeclaresEveryMappedTable(String vendor) throws IOException {
        String resource = "db/migration/" + vendor + "/B206__current_schema.sql";
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(input).as(resource).isNotNull();
            assertThat(createdTables(new String(input.readAllBytes(), StandardCharsets.UTF_8)))
                    .containsExactlyInAnyOrderElementsOf(MAPPED_TABLES);
        }
        MetadataDatabaseKind kind = vendor.equals("mysql")
                ? MetadataDatabaseKind.MYSQL : MetadataDatabaseKind.POSTGRESQL;
        assertThat(TargetSchemaBaseline.load(kind).expectedTables())
                .containsExactlyInAnyOrderElementsOf(MAPPED_TABLES);
    }

    @ParameterizedTest
    @ValueSource(strings = {"mysql", "postgresql"})
    void historicalFixtureDeclaresImmutableV159Provenance(String vendor) throws IOException {
        String resource = "db/historical/" + vendor + "/V159__schema.sql";
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(input).as(resource).isNotNull();
            String sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql)
                    .contains("Immutable V159 schema fixture for migration-chain tests.")
                    .contains("Do not derive this fixture from the current baseline or later migrations.")
                    .doesNotContain("Static V205 schema baseline", "Future versioned migrations start at V206");
        }
    }

    private static Set<String> createdTables(String sql) {
        Matcher matcher = CREATE_TABLE.matcher(sql.toLowerCase(Locale.ROOT));
        Set<String> tables = new HashSet<>();
        while (matcher.find()) {
            tables.add(matcher.group(1));
        }
        return Set.copyOf(tables);
    }

    static Set<String> mappedTables() {
        return MAPPED_TABLES;
    }
}
