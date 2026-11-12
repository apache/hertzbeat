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

package org.apache.hertzbeat.ai.gateway.tool.metrics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.apache.hertzbeat.observability.ingestion.controller.OtlpIngestionController;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.ingestion.red.OtlpIngestionRedSummaryService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.springframework.beans.factory.ObjectProvider;

/** OTLP queries remain separate from the legacy app-hierarchy tool and use native admission. */
class AgentOtlpMetricToolTest {
    private <T> T invoke(String workspace, Supplier<T> action) {
        var request = AgentToolExecutionRequest.builder().sessionUid("session").runId(1L).runUid("run")
                .runSessionId(1L).workspaceId(workspace).actor(AgentActor.builder().type("user").id("alice")
                        .roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).approvalHandling(AgentApprovalHandling.DENY)
                .toolName("test").toolCallId("call").arguments(Map.of()).build();
        return AgentToolContextSupport.withInvocation(new AgentToolExecutionContext(request, new AgentToolCall()), action);
    }

    @AfterEach
    void clearWorkspace() {
        AuthTokenRequestContext.bindWorkspaceId(null);
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId(null);
    }

    @Test
    @SuppressWarnings("unchecked")
    void inventoryUsesAdmissionAndPropagatesBackendTruncation() {
        var backend = mock(CollectorScopedMetricsQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        when(admission.execute(eq("metrics"), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(1)).get());
        var data = new OtlpMetricsInventoryDto();
        data.setTruncated(true);
        data.setItems(List.of());
        when(backend.inventory(any())).thenReturn(data);
        var controller = new OtlpIngestionController(mock(OtlpIngestionWorkspaceService.class),
                mock(OtlpIngestionRedSummaryService.class), backend, admission);
        ObjectProvider<OtlpIngestionController> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(controller);
        var service = new AgentMetricsToolService(null, null, null, provider);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var query = JsonUtil.fromJson("{\"start\":1000,\"end\":2000,\"limit\":\"20\"}", AgentOtlpMetricQuery.class);
        var result = invoke("team-a", () -> service.otlpInventory(query));
        assertEquals(true, result.get("partial"));
        verify(admission).execute(eq("metrics"), any());
        verify(backend).inventory(argThat(q -> "team-a".equals(q.workspaceId())));
    }

    @Test
    void schemaRejectsWorkspaceOverrideAndOverBudgetLimit() {
        assertNull(JsonUtil.fromJsonQuietly("{\"start\":1,\"end\":2,\"workspaceId\":\"other\"}", AgentOtlpMetricQuery.class));
        var query = JsonUtil.fromJson("{\"start\":1,\"end\":2,\"limit\":\"101\"}", AgentOtlpMetricQuery.class);
        assertThrows(IllegalArgumentException.class, query::validate);
        var unsupported = JsonUtil.fromJson("{\"start\":1,\"end\":2,\"collectorId\":\"collector-a\"}", AgentOtlpMetricQuery.class);
        assertThrows(IllegalArgumentException.class, () -> unsupported.validateOperation("related"));
    }

    @Test
    void missingWorkspaceFailsClosed() {
        var service = new AgentMetricsToolService(null, null, null);
        var query = JsonUtil.fromJson("{\"start\":1,\"end\":2}", AgentOtlpMetricQuery.class);
        assertThrows(IllegalArgumentException.class, () -> service.otlpInventory(query));
    }

    @Test
    void projectionRedactsNestedDtoSecretKeysBeforeSerializing() throws ReflectiveOperationException {
        var service = new AgentMetricsToolService(null, null, null);
        var payload = org.apache.hertzbeat.common.entity.dto.Message.success(Map.of(
                "attributes", List.of(Map.of("clientSecret", "sensitive-client-value",
                        "privateKey", "sensitive-private-value", "serviceName", "checkout"))));
        var projection = AgentMetricsToolService.class.getDeclaredMethod("otlpResult", Object.class);
        projection.setAccessible(true);
        Map<?, ?> result = (Map<?, ?>) projection.invoke(service, payload);
        String data = (String) result.get("data");
        org.junit.jupiter.api.Assertions.assertFalse(data.contains("sensitive-client-value"));
        org.junit.jupiter.api.Assertions.assertFalse(data.contains("sensitive-private-value"));
        org.junit.jupiter.api.Assertions.assertTrue(data.contains("checkout"));
        org.junit.jupiter.api.Assertions.assertTrue(data.contains("[REDACTED]"));
    }


    @Test
    void unavailableProjectionFailsClosed() throws ReflectiveOperationException {
        var service = new AgentMetricsToolService(null, null, null);
        var projection = AgentMetricsToolService.class.getDeclaredMethod("otlpResult", Object.class);
        projection.setAccessible(true);
        var failure = assertThrows(java.lang.reflect.InvocationTargetException.class,
                () -> projection.invoke(service, new Object[] {null}));
        org.junit.jupiter.api.Assertions.assertInstanceOf(IllegalStateException.class, failure.getCause());
    }

}
