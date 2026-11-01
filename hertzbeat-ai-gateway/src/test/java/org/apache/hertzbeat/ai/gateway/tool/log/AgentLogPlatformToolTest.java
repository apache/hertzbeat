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

package org.apache.hertzbeat.ai.gateway.tool.log;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.investigation.service.LogInvestigationReadModelService;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.observability.logs.controller.LogManagerController;
import org.apache.hertzbeat.observability.logs.service.LogManagementService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;

/** Regression coverage for strict query schemas, context binding, and actual query admission. */
class AgentLogPlatformToolTest {
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
    void usesTrustedInvocationWorkspaceAndNativeAdmission() {
        var backend = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        when(admission.execute(eq("logs"), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(1)).get());
        when(backend.facetFields(any())).thenReturn(LogFacets.Fields.empty(new LogFacets.Window(1000, 2000)));
        var controller = new LogQueryController(backend, admission, mock(LogInvestigationReadModelService.class));
        var service = new AgentLogToolService(backend, controller);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var query = JsonUtil.fromJson("{\"start\":1000,\"end\":2000,\"serviceName\":\"checkout\"}", AgentLogQuery.class);
        var result = invoke("team-a", () -> service.facetFields(query));
        assertNotNull(result.get("data"));
        verify(admission).execute(eq("logs"), any());
        verify(backend).facetFields(argThat(q -> "team-a".equals(q.workspaceId()) && q.start() == 1000));
    }

    @Test
    void rejectsStaleWorkspaceBeforeController() {
        var controller = mock(LogQueryController.class);
        var service = new AgentLogToolService(mock(LogQueryService.class), controller);
        AuthTokenRequestContext.bindWorkspaceId("other-team");
        var query = JsonUtil.fromJson("{\"start\":1000,\"end\":2000}", AgentLogQuery.class);
        assertThrows(IllegalArgumentException.class, () -> invoke("team-a", () -> service.analysis(query)));
        verifyNoInteractions(controller);
    }

    @Test
    void boundsLargeProjectionExplicitly() {
        var controller = mock(LogQueryController.class);
        var window = new LogFacets.Window(1000, 2000);
        var fields = new LogFacets.Fields("ready", window, null,
                java.util.Collections.nCopies(2000, LogFacets.builtins().getFirst()), false);
        when(controller.facetFields(any())).thenReturn(ResponseEntity.ok(Message.success(fields)));
        var service = new AgentLogToolService(mock(LogQueryService.class), controller);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var query = JsonUtil.fromJson("{\"start\":1000,\"end\":2000}", AgentLogQuery.class);
        var result = invoke("team-a", () -> service.facetFields(query));
        assertEquals(true, result.get("partial"));
        assertEquals(true, result.get("projectionTruncated"));
        assertEquals(24000, ((String) result.get("data")).length());
    }

    @Test
    void deletionRejectsCrossWorkspaceAndOversizedBatches() {
        var backend = mock(LogManagementService.class);
        var service = new AgentLogToolService(provider(mock(LogQueryService.class)), provider(null),
                provider(null), provider(new LogManagerController(backend)), provider(null));
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-b");
        assertThrows(IllegalArgumentException.class, () -> invoke("team-a", () -> service.batchDelete(List.of(1L))));
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        assertThrows(IllegalArgumentException.class, () -> invoke("team-a",
                () -> service.batchDelete(java.util.Collections.nCopies(101, 1L))));
        verifyNoInteractions(backend);
    }

    @SuppressWarnings("unchecked")
    private <T> ObjectProvider<T> provider(T bean) {
        ObjectProvider<T> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(bean);
        return provider;
    }

    @Test
    void rejectsWorkspaceOverrideAndExcessiveQueries() {
        assertNull(JsonUtil.fromJsonQuietly("{\"start\":1,\"end\":2,\"workspaceId\":\"other\"}", AgentLogQuery.class));
        var query = JsonUtil.fromJson("{\"start\":1,\"end\":700000000}", AgentLogQuery.class);
        assertThrows(IllegalArgumentException.class, query::validate);
        var page = JsonUtil.fromJson("{\"start\":1,\"end\":2,\"pageSize\":101}", AgentLogQuery.class);
        assertThrows(IllegalArgumentException.class, page::validate);
        var unsupported = JsonUtil.fromJson("{\"start\":1,\"end\":2,\"serviceName\":\"checkout\"}", AgentLogQuery.class);
        assertThrows(IllegalArgumentException.class, () -> unsupported.validateOperation("context"));
    }

    @Test
    void projectionRedactsNestedDtoSecretKeysBeforeSerializing() throws ReflectiveOperationException {
        var service = new AgentLogToolService(mock(LogQueryService.class));
        var payload = org.apache.hertzbeat.common.entity.dto.Message.success(Map.of(
                "attributes", List.of(Map.of("clientSecret", "sensitive-client-value",
                        "privateKey", "sensitive-private-value", "serviceName", "checkout"))));
        var projection = AgentLogToolService.class.getDeclaredMethod("boundedResult", Object.class);
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
        var service = new AgentLogToolService(mock(LogQueryService.class));
        var projection = AgentLogToolService.class.getDeclaredMethod("boundedResult", Object.class);
        projection.setAccessible(true);
        var failure = assertThrows(java.lang.reflect.InvocationTargetException.class,
                () -> projection.invoke(service, new Object[] {null}));
        org.junit.jupiter.api.Assertions.assertInstanceOf(IllegalStateException.class, failure.getCause());
    }

}
