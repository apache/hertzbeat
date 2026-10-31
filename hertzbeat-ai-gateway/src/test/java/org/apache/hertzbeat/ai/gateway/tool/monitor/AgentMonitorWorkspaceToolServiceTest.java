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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.manager.service.MetricsFavoriteService;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutService;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.junit.jupiter.api.Test;

class AgentMonitorWorkspaceToolServiceTest {
    @Test
    void favoritesUseTrustedActorRatherThanWorkspaceOrModelIdentity() {
        MetricsFavoriteService favorites = mock(MetricsFavoriteService.class);
        var service = new AgentMonitorWorkspaceToolService(favorites, mock(MonitorMetricLayoutService.class));
        when(favorites.getUserFavoritedMetrics("alice", 7L)).thenReturn(Set.of("cpu"));
        assertEquals(Set.of("cpu"), as("user", () -> service.favoriteSet(7L, "cpu", true)));
        verify(favorites).addMetricsFavorite("alice", 7L, "cpu");
    }

    @Test
    void personalStateRejectsMissingContextAndSystemIdentity() {
        var service = new AgentMonitorWorkspaceToolService(mock(MetricsFavoriteService.class), mock(MonitorMetricLayoutService.class));
        assertThrows(IllegalArgumentException.class, () -> service.favoriteList(7L));
        assertThrows(IllegalArgumentException.class, () -> as("system", () -> service.favoriteList(7L)));
        assertThrows(IllegalArgumentException.class, () -> service.favoriteSet(-1L, "cpu", true));
    }

    @Test
    void importStatusUsesTrustedWorkspaceAndHidesForeignTasks() {
        ImportTaskService imports = mock(ImportTaskService.class);
        when(imports.find("task", "workspace-a")).thenReturn(java.util.Optional.empty());
        var service = new AgentMonitorImportToolService(imports);
        assertThrows(IllegalArgumentException.class, () -> as("user", () -> service.importStatus("task")));
        verify(imports).find("task", "workspace-a");
    }

    @Test
    void importListIsBoundedAndUsesTrustedWorkspace() {
        ImportTaskService imports = mock(ImportTaskService.class);
        when(imports.list("workspace-a", 20)).thenReturn(List.of());
        var service = new AgentMonitorImportToolService(imports);
        assertEquals(List.of(), as("user", () -> service.importList(20)));
        verify(imports).list("workspace-a", 20);
        assertThrows(IllegalArgumentException.class, () -> service.importList(101));
    }

    private <T> T as(String type, Supplier<T> call) {
        var request = AgentToolExecutionRequest.builder()
                .sessionUid("s").runId(1L).runUid("r").runSessionId(1L).workspaceId("workspace-a")
                .actor(AgentActor.builder().type(type).id("alice").roles(List.of("user")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .toolName("test").toolCallId("call").arguments(Map.of()).build();
        return AgentToolContextSupport.withInvocation(new AgentToolExecutionContext(request,
                AgentToolCall.builder().toolCallId("call").build()), call);
    }
}
