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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.Set;

/**
 * Explicit classification inventory; the registration contract test rejects any unrecorded READ
 * tool.
 */
final class AgentReadContractCatalog {
    private static final Set<String> LEGACY =
            Set.of(
                    "alert.get",
                    "alert.query",
                    "alert.similar",
                    "alert.summary",
                    "collector.collect_once",
                    "collector.detect",
                    "collector.list",
                    "database.explain_query",
                    "database.mysql_global_status",
                    "database.mysql_lock_waits",
                    "database.mysql_process_list",
                    "database.mysql_slow_queries",
                    "dns.query",
                    "entity.get",
                    "entity.query",
                    "http.get",
                    "logs.analysis",
                    "logs.group_by_stats",
                    "logs.overview_stats",
                    "logs.query",
                    "logs.repeated_errors.summary",
                    "metrics.history",
                    "metrics.otlp_console",
                    "metrics.realtime",
                    "metrics.warehouse_status",
                    "monitor.get",
                    "monitor.query",
                    "topology.query",
                    "traces.get",
                    "traces.query");
    private static final Set<String> DEFERRED =
            Set.of(
                    "tool.search",
                    "interaction.request_input",
                    "metrics.related",
                    "monitor.params",
                    "skill.load",
                    "alert.integration.catalog",
                    "alert.integration.guide",
                    "alert_analysis_policy.list",
                    "alert_group.get",
                    "alert_group.list",
                    "alert_inhibit.get",
                    "alert_inhibit.list",
                    "alert_rule.datasource_status",
                    "alert_rule.get",
                    "alert_rule.hierarchy",
                    "alert_rule.list",
                    "alert_rule.preview",
                    "alert_silence.get",
                    "alert_silence.list",
                    "bulletin.get",
                    "bulletin.list",
                    "bulletin.metrics",
                    "collector.runtime_get",
                    "dashboard.list_signal_dashboards",
                    "dashboard.panel_draft.list_signal_dashboard_panel_drafts",
                    "deployment.operation_status",
                    "entity.alerts",
                    "entity.binding_candidates",
                    "entity.catalog_suggestions",
                    "entity.definition_activities",
                    "entity.definition_export",
                    "entity.definition_preview",
                    "entity.definition_resume",
                    "entity.definition_templates",
                    "entity.definition_workspace_activities",
                    "entity.discovery",
                    "entity.discovery_activities",
                    "entity.discovery_presets",
                    "entity.editable",
                    "entity.monitors",
                    "entity.red",
                    "label.get",
                    "label.list",
                    "logs.calculated",
                    "logs.context",
                    "logs.facet_fields",
                    "logs.facet_values",
                    "logs.live.validate",
                    "logs.query_set",
                    "logs.subquery",
                    "logs.transaction_detail",
                    "logs.transactions",
                    "logs.validate_calculated",
                    "metrics.otlp_inventory",
                    "metrics.otlp_labels",
                    "metrics.otlp_related",
                    "monitor.collector_binding",
                    "monitor.definition_catalog",
                    "monitor.definition_get",
                    "monitor.definition_validate",
                    "monitor.favorite_list",
                    "monitor.import_list",
                    "monitor.import_status",
                    "monitor.layout_get",
                    "monitor.type_params",
                    "monitor.types",
                    "native.collector_install",
                    "native.deployment_manage",
                    "native.deployment_migrate",
                    "native.monitor_definition_edit",
                    "native.monitor_edit",
                    "native.monitor_export",
                    "native.monitor_import",
                    "native.notification_channel_configure",
                    "native.object_store_configure",
                    "native.plugin_manage",
                    "native.provider_configure",
                    "native.receiver_configure",
                    "native.receiver_test",
                    "native.system_configure",
                    "native.token_manage",
                    "notice.receiver_get",
                    "notice.receiver_list",
                    "notice.rule_get",
                    "notice.rule_list",
                    "notice.template_get",
                    "notice.template_list",
                    "notice.template_preview",
                    "platform.metrics.get_metrics_info",
                    "plugin.metadata_list",
                    "provider.metadata_list",
                    "saved_query.list_signal_saved_views",
                    "schedule.list",
                    "services.red",
                    "status_page.component.get",
                    "status_page.component.history",
                    "status_page.component.list",
                    "status_page.incident.get",
                    "status_page.incident.list",
                    "status_page.organization.get",
                    "system.config_get",
                    "system.timezones",
                    "telemetry.bindings",
                    "telemetry.guide",
                    "telemetry.intake_red_summary",
                    "telemetry.overview",
                    "telemetry.sources",
                    "token.metadata_list",
                    "traces.facet_values",
                    "traces.group_by",
                    "traces.overview",
                    "traces.structure",
                    "traces.structure_analysis");

    private AgentReadContractCatalog() {}

    static String disposition(String tool) {
        if ("monitor.plan_websites".equals(tool) || "monitor.preflight_websites".equals(tool)
                || AgentWebsiteExclusions.TOOL.equals(tool)) return "planning-only-not-platform-evidence";

        if (tool == null) {
            return null;
        }
        if (AgentNativeReadContracts.supports(tool)) {
            return "typed-native-observation";
        }
        if (org.apache.hertzbeat.ai.gateway.tool.application.AgentJsonImportProof.supports(tool)
                || "monitor.collection_preview".equals(tool)
                || "monitor.definition_preview".equals(tool)
                || "grafana.dashboard_preview".equals(tool)) {
            return "validation-only: no observation or mutation proof";
        }
        if (LEGACY.contains(tool)) {
            return "existing-observation-contract";
        }
        if (DEFERRED.contains(tool)) {
            return "explicitly-unsupported: requires a separately reviewed observation, discovery"
                    + " or configuration contract";
        }
        return null;
    }
}
