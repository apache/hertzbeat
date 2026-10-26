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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.application.GatewayRuntimeEventProjector;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorToolService;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ScriptProtocol;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Characterizes boundaries using inert strings and mocks, never collection or template execution.
 */
class AgentIndirectCapabilityAuditTest {
    @Test
    void declaredAliasesCannotReachNativeCodeWritesWithoutBoundPreview() {
        AppService apps = mock(AppService.class);
        MonitorService nativeService = mock(MonitorService.class);
        ParamDefineInfo field = new ParamDefineInfo();
        field.setField("payload");
        field.setType("text");
        when(apps.getAppParamDefines("custom_alias")).thenReturn(List.of(field));
        doAnswer(
                        call -> {
                            ((Monitor) call.getArgument(0)).setId(123L);
                            return null;
                        })
                .when(nativeService)
                .addMonitor(any(), any(), any(), any());
        when(apps.getAppDefine("custom_alias"))
                .thenReturn(
                        org.apache.hertzbeat.common.entity.job.Job.builder()
                                .metrics(
                                        List.of(
                                                Metrics.builder()
                                                        .protocol("script")
                                                        .script(
                                                                ScriptProtocol.builder()
                                                                        .scriptCommand(
                                                                                "INERT_AUDIT_MARKER")
                                                                        .build())
                                                        .build()))
                                .build());
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () ->
                        new AgentMonitorToolService(nativeService, apps, null)
                                .createMonitor(
                                        "audit-only",
                                        "custom_alias",
                                        600,
                                        Map.of("payload", "INERT_AUDIT_MARKER"),
                                        null,
                                        null,
                                        null,
                                        null));
        org.mockito.Mockito.verify(nativeService, org.mockito.Mockito.never())
                .addMonitor(any(), any(), any(), any());
    }

    @Test
    void processAliasCannotBypassTheBoundCodePreviewThroughProtocolUpdate() {
        AppService apps = mock(AppService.class);
        MonitorService nativeService = mock(MonitorService.class);
        ParamDefineInfo field = new ParamDefineInfo();
        field.setField("process_name");
        field.setType("text");
        when(apps.getAppParamDefines("process")).thenReturn(List.of(field));
        var dto = new org.apache.hertzbeat.manager.pojo.dto.MonitorDto();
        dto.setMonitor(
                Monitor.builder()
                        .id(123L)
                        .name("audit-only")
                        .app("process")
                        .intervals(600)
                        .status((byte) 0)
                        .build());
        dto.setParams(List.of(), false);
        when(nativeService.getMonitorDto(123L)).thenReturn(dto);
        when(apps.getAppDefine("process"))
                .thenReturn(
                        org.apache.hertzbeat.common.entity.job.Job.builder()
                                .metrics(List.of(Metrics.builder().protocol("ssh").build()))
                                .build());
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () ->
                        new AgentMonitorToolService(nativeService, apps, null)
                                .protocolUpdate(123L, Map.of("process_name", "owner's-worker")));
        org.mockito.Mockito.verify(nativeService, org.mockito.Mockito.never())
                .modifyMonitor(any(), any(), any(), any());
    }

    @Test
    void nativeSubstitutionCanRouteAnInnocentAliasIntoScriptConfigurationWithoutExecutingIt() {
        ScriptProtocol script = ScriptProtocol.builder().scriptCommand("^_^payload^_^").build();
        Metrics metrics = Metrics.builder().protocol("script").script(script).build();
        var gson = new com.google.gson.Gson();
        var tree = gson.toJsonTree(metrics);
        CollectUtil.replaceSmilingPlaceholder(
                tree, Map.of("payload", new Configmap("payload", "INERT_AUDIT_MARKER", (byte) 1)));
        Metrics resolved = gson.fromJson(tree, Metrics.class);
        assertEquals("INERT_AUDIT_MARKER", resolved.getScript().getScriptCommand());
        assertEquals("^_^payload^_^", metrics.getScript().getScriptCommand());
    }

    @Test
    @SuppressWarnings("unchecked")
    void builtinProcessNameIsInsertedIntoCommandTextWithoutEscapingQuotes() throws Exception {
        try (var input =
                getClass().getClassLoader().getResourceAsStream("define/app-process.yml")) {
            var options = new org.yaml.snakeyaml.LoaderOptions();
            var yaml =
                    new org.yaml.snakeyaml.Yaml(
                            new org.yaml.snakeyaml.constructor.SafeConstructor(options));
            Map<String, Object> document = yaml.load(input);
            var metrics = (List<Map<String, Object>>) document.get("metrics");
            var gson = new com.google.gson.Gson();
            var tree = gson.toJsonTree(metrics.getFirst());
            CollectUtil.replaceSmilingPlaceholder(
                    tree,
                    Map.of(
                            "process_name",
                            new Configmap("process_name", "owner's-worker", (byte) 1)));
            String script =
                    tree.getAsJsonObject().getAsJsonObject("ssh").get("script").getAsString();
            assertTrue(script.contains("grep 'owner's-worker'"));
            org.junit.jupiter.api.Assertions.assertFalse(
                    org.apache.hertzbeat.collector.collect.common.ssh.CommonSshBlacklist
                            .isCommandBlacklisted(script));
        }
    }

    @Test
    void dashboardDocumentAcceptsPluginQueryTextWithoutExecutingAnyQuery() {
        String dashboard =
                "{\"title\":\"audit-only\",\"panels\":[{\"type\":\"audit-unknown-plugin\",\"targets\":[{\"rawSql\":\"INERT_QUERY_MARKER\"}]}]}";
        var draft =
                org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft.fromArguments(
                        "grafana.dashboard_save",
                        Map.of("operation", "create", "monitorId", 1L, "dashboardJson", dashboard));
        assertTrue(draft.dashboardJson().contains("INERT_QUERY_MARKER"));
    }

    @Test
    void startedEventProjectionDoesNotExposeSyntheticSensitiveArgument() {
        var call =
                AgentRuntimeToolCall.builder()
                        .toolCallId("audit-call")
                        .toolName("monitor.create")
                        .arguments(
                                Map.of(
                                        "params",
                                        Map.of("password", "AUDIT_FAKE_SECRET_NEVER_REAL"),
                                        "customAlias",
                                        "AUDIT_PRIVATE_FREE_TEXT",
                                        "url",
                                        "https://synthetic:password@example.invalid/private?unusual=synthetic"))
                        .build();
        var event =
                new GatewayRuntimeEventProjector()
                        .project(
                                AgentRuntimeEvent.toolStarted(
                                        "audit-item", "audit-trace", call, Instant.EPOCH),
                                "audit-conversation",
                                "audit-session",
                                "audit-run");
        assertFalse(JsonUtil.toJson(event).contains("AUDIT_FAKE_SECRET_NEVER_REAL"));
        assertTrue(JsonUtil.toJson(call.getArguments()).contains("AUDIT_FAKE_SECRET_NEVER_REAL"));
        assertFalse(JsonUtil.toJson(event).contains("AUDIT_PRIVATE_FREE_TEXT"));
        assertFalse(JsonUtil.toJson(event).contains("example.invalid"));
    }
}
