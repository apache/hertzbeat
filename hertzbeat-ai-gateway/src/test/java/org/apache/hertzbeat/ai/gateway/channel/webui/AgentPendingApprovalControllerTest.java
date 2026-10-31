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

package org.apache.hertzbeat.ai.gateway.channel.webui;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentPendingApprovalQuery;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

class AgentPendingApprovalControllerTest {
    private final AgentPendingApprovalQuery query = mock(AgentPendingApprovalQuery.class);
    private final AgentPendingApprovalController controller =
            new AgentPendingApprovalController(query);

    @AfterEach
    void clear() {
        SurenessContextHolder.clear();
        AuthTokenRequestContext.clear();
    }

    @Test
    void normalGetUsesAuthenticatedOwnerEnvelopeAndReturnsSafeCards() throws Exception {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn("alice");
        when(subject.getRoles()).thenReturn(List.of("user"));
        when(subject.hasRole("user")).thenReturn(true);
        SurenessContextHolder.bindSubject(subject);
        AuthTokenRequestContext.bindWorkspaceId("workspace-test");
        when(query.read(eq("run-test"), any()))
                .thenReturn(
                        new AgentPendingApprovalQuery.View(
                                "run-test",
                                "session-test",
                                List.of(
                                        new AgentPendingApprovalQuery.Approval(
                                                "approval-test",
                                                "tool-test",
                                                "monitor.create_batch",
                                                "WAITING_APPROVAL",
                                                null,
                                                false)),
                                false));
        MockMvcBuilders.standaloneSetup(controller)
                .build()
                .perform(get("/api/agent/runs/run-test/pending-approvals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.runUid").value("run-test"))
                .andExpect(jsonPath("$.data.approvals[0].canDecide").value(false))
                .andExpect(jsonPath("$.data.approvals[0].inputJson").doesNotExist());
        var actorEnvelope = ArgumentCaptor.forClass(GatewayEnvelope.class);
        verify(query).read(eq("run-test"), actorEnvelope.capture());
        assertEquals("alice", actorEnvelope.getValue().getActor().getId());
        assertEquals("workspace-test", actorEnvelope.getValue().getWorkspaceId());
    }

    @Test
    void missingAuthenticationCannotReadAnyApproval() {
        assertThrows(RuntimeException.class, () -> controller.read("run-test"));
        verifyNoInteractions(query);
    }
}
