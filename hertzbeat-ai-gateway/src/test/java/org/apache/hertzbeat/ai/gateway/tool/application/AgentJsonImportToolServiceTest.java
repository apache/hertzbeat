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

package org.apache.hertzbeat.ai.gateway.tool.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskStatus;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskView;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

class AgentJsonImportToolServiceTest {
    private static final String MONITOR =
            "[{\"monitor\":{\"name\":\"ai-e2e-import\",\"app\":\"website\",\"host\":\"example.com\",\"intervals\":600},\"params\":[{\"field\":\"host\",\"value\":\"example.com\"}]}]";
    private static final String ALERT =
            "[{\"alertDefine\":{\"name\":\"ai-e2e-alert-import\",\"type\":\"realtime_metric\",\"expr\":\"value"
                + " > 90\",\"datasource\":\"promql\",\"enable\":false}}]";

    private <T> T scoped(Supplier<T> action, boolean permitted) {
        var request =
                AgentToolExecutionRequest.builder()
                        .sessionUid("import-session")
                        .runUid("import-run")
                        .runId(1L)
                        .runSessionId(1L)
                        .workspaceId("import-test")
                        .actor(
                                AgentActor.builder()
                                        .type("user")
                                        .id("tester")
                                        .roles(List.of("admin"))
                                        .build())
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .toolName("monitor.import_submit_json")
                        .toolCallId("import-call")
                        .arguments(Map.of())
                        .executionGuard(() -> permitted)
                        .build();
        var previous = AuthTokenRequestContext.currentWorkspaceId();
        AuthTokenRequestContext.bindWorkspaceId("import-test");
        try {
            return AgentToolContextSupport.withInvocation(
                    new AgentToolExecutionContext(request, new AgentToolCall()), action);
        } finally {
            AuthTokenRequestContext.bindWorkspaceId(previous);
        }
    }

    @Test
    void previewDoesNotQueueAnythingAndAcceptsExactNativeShapes() {
        var monitors = mock(MonitorService.class);
        var alerts = mock(AlertDefineService.class);
        var service = new AgentJsonImportToolService(monitors, alerts);
        assertEquals(1, service.monitorPreview(MONITOR).get("count"));
        assertEquals(1, service.alertPreview(ALERT).get("count"));
        verifyNoInteractions(monitors, alerts);
    }

    @Test
    void monitorSubmitReturnsNativeJobAcceptanceWithoutClaimingCompletion() {
        var monitors = mock(MonitorService.class);
        var service = new AgentJsonImportToolService(monitors, mock(AlertDefineService.class));
        when(monitors.importConfig(any()))
                .thenReturn(
                        new ImportTaskView(
                                1,
                                "job-test",
                                "monitor",
                                ImportTaskStatus.IN_PROGRESS,
                                0,
                                java.time.Instant.now(),
                                null,
                                null,
                                null));
        var value = scoped(() -> service.monitorSubmit(MONITOR, GatewayText.sha256(MONITOR)), true);
        assertEquals("job-test", value.get("taskId"));
        assertEquals(false, value.get("completed"));
        assertFalse((Boolean) value.get("safeToResubmit"));
        verify(monitors).importConfig(any());
    }

    @Test
    void invalidHashRevocationSecretOrServerOwnedFieldsCannotSubmit() {
        var monitors = mock(MonitorService.class);
        var alerts = mock(AlertDefineService.class);
        var service = new AgentJsonImportToolService(monitors, alerts);
        assertThrows(
                IllegalArgumentException.class,
                () -> scoped(() -> service.monitorSubmit(MONITOR, "wrong"), true));
        assertThrows(
                IllegalStateException.class,
                () ->
                        scoped(
                                () -> service.monitorSubmit(MONITOR, GatewayText.sha256(MONITOR)),
                                false));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.monitorPreview(
                                MONITOR.replace("\"field\":\"host\"", "\"field\":\"password\"")));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.monitorPreview(MONITOR.replace("\"app\":", "\"id\":12,\"app\":")));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.alertPreview(
                                ALERT.replace("\"enable\":false", "\"enable\":false,\"id\":99")));
        verifyNoInteractions(monitors, alerts);
    }

    @Test
    void duplicateNamesMoreThanTwentyOrMalformedJsonAreRejectedBeforeWrite() {
        var service =
                new AgentJsonImportToolService(
                        mock(MonitorService.class), mock(AlertDefineService.class));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.monitorPreview(
                                "["
                                        + MONITOR.substring(1, MONITOR.length() - 1)
                                        + ","
                                        + MONITOR.substring(1, MONITOR.length() - 1)
                                        + "]"));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.monitorPreview(
                                "["
                                        + String.join(
                                                ",",
                                                java.util.Collections.nCopies(
                                                        21,
                                                        MONITOR.substring(1, MONITOR.length() - 1)))
                                        + "]"));
        assertThrows(IllegalArgumentException.class, () -> service.alertPreview("not-json"));
    }

    @Test
    void alertSubmitUsesNativeImportAndDoesNotInventVerifiedIds() throws Exception {
        var alerts = mock(AlertDefineService.class);
        var service = new AgentJsonImportToolService(mock(MonitorService.class), alerts);
        var value = scoped(() -> service.alertSubmit(ALERT, GatewayText.sha256(ALERT)), true);
        assertEquals(false, value.get("verified"));
        assertEquals(1, value.get("submittedCount"));
        verify(alerts).importConfig(any());
    }
}
