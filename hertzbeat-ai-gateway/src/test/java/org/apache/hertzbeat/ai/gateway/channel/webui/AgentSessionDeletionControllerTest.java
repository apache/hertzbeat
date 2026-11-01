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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionDeletionService;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class AgentSessionDeletionControllerTest {
    @Test
    void expectedConflictsKeepTheirStatusAndNeverBecomeGeneric500() throws Exception {
        var service = mock(AgentSessionDeletionService.class);
        when(service.delete(any(), any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Stop active conversations"));
        var mvc = MockMvcBuilders.standaloneSetup(new AgentSessionDeletionController(service))
                .setControllerAdvice(new AgentSessionDeletionAdvice()).build();
        try (var actors = mockStatic(ActorSupport.class)) {
            actors.when(ActorSupport::requireCurrentSurenessActor).thenReturn(actor());
            mvc.perform(post("/api/agent/sessions/delete").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"sessionUids\":[\"ags_1\"],\"confirmed\":true}"))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value(1));
        }
    }

    @Test
    void previewBuildsServerOwnedWebUiEnvelope() throws Exception {
        var service = mock(AgentSessionDeletionService.class);
        when(service.preview(any())).thenReturn(new AgentSessionDeletionService.Preview(List.of("ags_1"), 0));
        var mvc = MockMvcBuilders.standaloneSetup(new AgentSessionDeletionController(service)).build();
        try (var actors = mockStatic(ActorSupport.class)) {
            actors.when(ActorSupport::requireCurrentSurenessActor).thenReturn(actor());
            mvc.perform(get("/api/agent/sessions/deletion-preview"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data.sessionUids[0]").value("ags_1"));
            var envelope = ArgumentCaptor.forClass(GatewayEnvelope.class);
            verify(service).preview(envelope.capture());
            assertEquals("web-ui", envelope.getValue().getChannelId());
            assertEquals("alice", envelope.getValue().getActor().getId());
        }
    }

    private AgentActor actor() { return AgentActor.builder().type("user").id("alice").roles(List.of("user")).build(); }
}
