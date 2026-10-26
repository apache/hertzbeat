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

package org.apache.hertzbeat.ai.gateway.tool.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.legacy.LegacyToolService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.context.support.GenericApplicationContext;

/**
 * Test case for {@link AgentToolConfiguration}.
 */
class AgentToolConfigurationTest {

    @Test
    void consoleSchemaRequiresQueryWhileInventoryDoesNot() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService(null, null, null));
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            var console = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                    registry.find("metrics.otlp_console").orElseThrow().descriptor().getInputSchema()).path("properties").path("q");
            var inventory = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                    registry.find("metrics.otlp_inventory").orElseThrow().descriptor().getInputSchema()).path("properties").path("q");
            assertTrue(console.path("required").toString().contains("query"));
            assertEquals("string", console.path("properties").path("query").path("type").asText());
            assertEquals(1, console.path("properties").path("query").path("minLength").asInt());
            assertFalse(inventory.path("required").toString().contains("query"));
        }
    }

    @org.junit.jupiter.api.Test
    void nativeLogQueryAdvertisesRejectedUnknownBucketAndOptionalUnfilteredSemantics() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService(
                            (org.apache.hertzbeat.observability.logs.service.LogQueryService) null));
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            var registered = registry.find("logs.query").orElseThrow();
            var schema = org.apache.hertzbeat.common.util.JsonUtil.fromJson(registered.descriptor().getInputSchema());
            var severity = schema.path("properties").path("severityText");
            assertEquals(6, severity.path("enum").size());
            assertFalse(severity.path("enum").toString().contains("unknown"));
            assertTrue(severity.path("description").asText().contains("not a queryable severity"));
            var failure = org.junit.jupiter.api.Assertions.assertThrows(org.springframework.ai.tool.execution.ToolExecutionException.class,
                    () -> registered.execute(context(registered.descriptor(), Map.of(
                            "start", 1792217350000L, "end", 1792218250741L, "severityText", "unknown"))));
            assertTrue(failure.getMessage().contains("severityText"));
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
        "logs.list,list", "logs.live.snapshot,list", "logs.context,context",
        "logs.analysis,analysis", "logs.facet_fields,facetFields", "logs.facet_values,facetValues",
        "logs.overview_stats,overviewStats", "logs.trace_coverage_stats,traceCoverageStats",
        "logs.trend_stats,trendStats", "logs.group_by_stats,groupByStats",
        "logs.transactions,transactions", "logs.transaction_detail,transactionDetail", "logs.live.validate,live"
    })
    void everyLogSchemaMatchesHandlerControlContract(String tool, String operation) {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService(
                            (org.apache.hertzbeat.observability.logs.service.LogQueryService) null));
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            var q = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                    registry.find(tool).orElseThrow().descriptor().getInputSchema()).path("properties").path("q");
            java.util.Set<String> advertised = new java.util.HashSet<>();
            advertised.addAll(q.path("properties").propertyNames());
            assertEquals(org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery.allowedControls(operation), advertised);
            assertFalse(q.path("additionalProperties").asBoolean());
            assertFalse(advertised.contains("timezone"));
            java.util.Set<String> required = new java.util.HashSet<>(java.util.Set.of("start", "end"));
            if ("facetValues".equals(operation)) {
                required.add("field");
            }
            if ("groupByStats".equals(operation)) {
                required.add("groupBy");
            }
            java.util.Set<String> actual = new java.util.HashSet<>();
            q.path("required").forEach(value -> actual.add(value.asText()));
            assertEquals(required, actual);
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"timezone", "timeZone", "unsupportedControl"})
    void unknownTopLevelControlsCannotBeSilentlyIgnored(String control) {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(SampleToolService.class);
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            var handler = registry.find("sample.one").orElseThrow();
            var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                    () -> handler.execute(context(handler.descriptor(), Map.of("monitorId", 10L, control, "secret-value"))));
            assertTrue(error.getMessage().contains(control));
            assertFalse(error.getMessage().contains("secret-value"));
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
        "2026-03-08T01:30:00-05:00,2026-03-08T03:30:00-04:00,3600000",
        "2026-11-01T01:30:00-04:00,2026-11-01T01:30:00-05:00,3600000",
        "2026-10-17T12:00:00+08:00,2026-10-17T13:00:00+08:00,3600000"
    })
    void logEpochWindowsRemainExactAcrossTimezoneAndDst(String start, String end, long duration) {
        long from = java.time.OffsetDateTime.parse(start).toInstant().toEpochMilli();
        long to = java.time.OffsetDateTime.parse(end).toInstant().toEpochMilli();
        var q = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                "{\"start\":" + from + ",\"end\":" + to + "}",
                org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery.class);
        q.validateOperation("overviewStats");
        assertEquals(Long.toString(from), q.parameters().get("start"));
        assertEquals(Long.toString(to), q.parameters().get("end"));
        assertEquals(duration, q.end() - q.start());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"timezone", "timeZone", "unsupportedControl"})
    void unknownNestedLogControlsCannotBeSilentlyIgnored(String control) {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService(
                            (org.apache.hertzbeat.observability.logs.service.LogQueryService) null));
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            var handler = registry.find("logs.overview_stats").orElseThrow();
            var arguments = Map.<String, Object>of("q", Map.of("start", 1000, "end", 2000, control, "private-value"));
            var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                    () -> handler.execute(context(handler.descriptor(), arguments)));
            assertTrue(error.getMessage().contains("q." + control));
            assertFalse(error.getMessage().contains("private-value"));
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({"start,1000.5", "start,not-a-number", "hideNoise,not-a-boolean"})
    void invalidJsonTypesCannotBeCoercedIntoQueryControls(String key, String value) {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService(
                            (org.apache.hertzbeat.observability.logs.service.LogQueryService) null));
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            var handler = registry.find("logs.group_by_stats").orElseThrow();
            Map<String, Object> q = new java.util.HashMap<>(Map.of("start", 1000L, "end", 2000L, "groupBy", "severity"));
            q.put(key, "1000.5".equals(value) ? new java.math.BigDecimal(value) : value);
            var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                    () -> handler.execute(context(handler.descriptor(), Map.of("q", q))));
            assertTrue(error.getMessage().contains("q." + key));
        }
    }

    @Test
    void relativeHistoryPublishedSchemaAndHandlerAcceptTheSameCompleteEmptyQuery() {
        var data = org.mockito.Mockito.mock(org.apache.hertzbeat.warehouse.service.MetricsDataService.class);
        org.mockito.Mockito.when(data.getMetricHistoryData("127.0.0.1:14601", "port", "port", "up", "900s", true))
                .thenReturn(org.apache.hertzbeat.common.entity.dto.MetricsHistoryData.builder().values(Map.of()).build());
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService(
                            org.mockito.Mockito.mock(org.apache.hertzbeat.manager.service.AppService.class),
                            org.mockito.Mockito.mock(org.apache.hertzbeat.manager.service.MonitorService.class), data));
            context.refresh();
            var registry = new AgentToolConfiguration().agentToolRegistry(context.getDefaultListableBeanFactory());
            var handler = registry.find("metrics.history").orElseThrow();
            var schema = org.apache.hertzbeat.common.util.JsonUtil.fromJson(handler.descriptor().getInputSchema());
            assertTrue(schema.path("oneOf").get(1).path("required").toString().contains("fieldParameter"));
            var args = Map.<String, Object>of("instance", "127.0.0.1:14601", "app", "port", "metrics", "port",
                    "fieldParameter", "up", "history", "15m", "interval", true, "maxPoints", 100);
            var output = handler.execute(context(handler.descriptor(), args));
            assertEquals(AgentToolStatus.SUCCEEDED, output.getStatus());
            assertEquals(0, org.apache.hertzbeat.common.util.JsonUtil.fromJson(output.getModelContent()).path("returnedPoints").asInt());
            Map<String, Object> missing = new java.util.HashMap<>(args);
            missing.remove("fieldParameter");
            org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class,
                    () -> handler.execute(context(handler.descriptor(), missing)));
            org.mockito.Mockito.verify(data).getMetricHistoryData("127.0.0.1:14601", "port", "port", "up", "900s", true);
            org.mockito.Mockito.verifyNoMoreInteractions(data);
        }
    }

    @Test
    void logOperationSchemasMustNotAdvertiseUnsupportedControls() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService(
                            (org.apache.hertzbeat.observability.logs.service.LogQueryService) null));
            context.refresh();
            AgentToolRegistry registry = new AgentToolConfiguration()
                    .agentToolRegistry(context.getDefaultListableBeanFactory());
            var schema = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                    registry.find("logs.group_by_stats").orElseThrow().descriptor().getInputSchema());
            var query = schema.path("properties").path("q");
            assertTrue(query.path("properties").has("groupBy"), schema.toString());
            assertFalse(query.path("properties").has("pageSize"));
            assertFalse(query.path("properties").has("transactionId"));
            assertFalse(query.path("required").toString().contains("endpoint"));
            assertTrue(query.path("required").toString().contains("groupBy"));
            assertEquals("[\"TRACE\",\"DEBUG\",\"INFO\",\"WARN\",\"ERROR\",\"FATAL\"]",
                    query.path("properties").path("severityCategory").path("enum").toString());
            assertTrue(query.path("properties").path("start").path("description").asText().contains("epoch milliseconds"));
            var facet = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                    registry.find("logs.facet_values").orElseThrow().descriptor().getInputSchema())
                    .path("properties").path("q");
            assertTrue(facet.path("properties").path("field").path("description").asText().contains("builtin:"));
        }
    }

    @Test
    void facetValueFieldMustUseTheProductQualifiedIdentity() {
        var valid = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                "{\"start\":1000,\"end\":2000,\"field\":\"builtin:severityCategory\"}",
                org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery.class);
        valid.validateOperation("facetValues");
        var invalid = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                "{\"start\":1000,\"end\":2000,\"field\":\"severityCategory\"}",
                org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery.class);
        var failure = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> invalid.validateOperation("facetValues"));
        assertTrue(failure.getMessage().contains("qualified id"));
    }

    @Test
    void unsupportedLogControlsNameKeysButNotValues() {
        var query = org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                "{\"start\":1000,\"end\":2000,\"groupBy\":\"service.name\",\"pageSize\":20}",
                org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery.class);
        var failure = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> query.validateOperation("groupByStats"));
        assertTrue(failure.getMessage().contains("pageSize"));
        assertFalse(failure.getMessage().contains("20"));
    }

    @Test
    void shouldRegisterSpringAiTools() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(SampleToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());

            assertEquals(List.of("sample.one", "sample.two"),
                registry.descriptors().stream().map(AgentToolDescriptor::getName).toList());
            AgentToolDescriptor first = registry.find("sample.one").orElseThrow().descriptor();
            assertEquals("sample", first.getNamespace());
            assertEquals(AgentToolRisk.READ, first.getRisk());
            assertEquals(AgentToolAccess.ADMIN, first.getAccess());
            assertTrue(first.getInputSchema().contains("\"monitorId\""));
            assertFalse(first.getInputSchema().contains("agentToolExecutionContext"));

            AgentToolOutput output = registry.find("sample.one").orElseThrow()
                .execute(context(first, Map.of("monitorId", 10L)));

            assertEquals(AgentToolStatus.SUCCEEDED, output.getStatus());
            assertTrue(output.getModelContent().contains("monitorId"));
            assertTrue(output.getModelContent().contains("10"));
        }
    }

    @Test
    void shouldWrapPlainToolReturnValue() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(PlainToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());
            AgentToolRegistry.RegisteredTool handler = registry.find("sample.plain").orElseThrow();
            AgentToolOutput output = handler.execute(context(handler.descriptor(), Map.of()));

            assertEquals(AgentToolStatus.SUCCEEDED, output.getStatus());
            assertTrue(output.getModelContent().contains("plain"));
        }
    }

    @Test
    void shouldPreserveStructuredToolOutput() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(StructuredToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());
            AgentToolRegistry.RegisteredTool handler = registry.find("sample.structured").orElseThrow();
            AgentToolOutput output = handler.execute(context(handler.descriptor(), Map.of()));

            assertEquals(AgentToolStatus.FAILED, output.getStatus());
            assertEquals("diagnostic output", output.getModelContent());
            assertEquals("diagnostic error", output.getErrorMessage());
        }
    }

    @Test
    void shouldIgnoreToolBeansOutsideGatewayToolPackage() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(SampleToolService.class);
            context.registerBean(LegacyToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());

            assertEquals(List.of("sample.one", "sample.two"),
                registry.descriptors().stream().map(AgentToolDescriptor::getName).toList());
        }
    }

    private AgentToolExecutionContext context(AgentToolDescriptor descriptor, Map<String, Object> arguments) {
        AgentToolExecutionRequest request = AgentToolExecutionRequest.builder()
            .sessionUid("ags_1")
            .runId(2L)
            .runUid("run_1")
            .runSessionId(1L)
            .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .toolName(descriptor.getName())
            .toolCallId("agc_sample")
            .arguments(arguments)
            .build();
        return new AgentToolExecutionContext(request,
            AgentToolCall.builder().toolCallId("agc_sample").build());
    }

    static class SampleToolService {

        @Tool(name = "sample.one", description = "Sample tool one.")
        @AgentToolPolicy(access = AgentToolAccess.ADMIN)
        public Map<String, Object> one(
            @ToolParam(description = "Monitor id.")
            Long monitorId) {
            return Map.of("monitorId", monitorId);
        }

        @Tool(name = "sample.two", description = "Sample tool two.")
        @AgentToolPolicy
        public String two(
            @ToolParam(required = false, description = "Optional filter.")
            String filter) {
            return filter;
        }
    }

    static class PlainToolService {

        @Tool(name = "sample.plain", description = "Plain return tool.")
        @AgentToolPolicy
        public String execute() {
            return "plain";
        }
    }

    static class StructuredToolService {

        @Tool(name = "sample.structured", description = "Structured return tool.")
        @AgentToolPolicy
        public AgentToolOutput execute() {
            return AgentToolOutput.builder()
                .status(AgentToolStatus.FAILED)
                .modelContent("diagnostic output")
                .errorMessage("diagnostic error")
                .build();
        }
    }
}
