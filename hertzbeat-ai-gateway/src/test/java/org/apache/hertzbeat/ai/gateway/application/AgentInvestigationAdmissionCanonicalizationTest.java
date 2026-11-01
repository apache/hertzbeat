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

package org.apache.hertzbeat.ai.gateway.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentIncidentScope;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.junit.jupiter.api.Test;

class AgentInvestigationAdmissionCanonicalizationTest {
    private final AgentIncidentTargetAuthorityService incidents = mock(AgentIncidentTargetAuthorityService.class);
    private final AgentEntityInvestigationAuthorityService entities = mock(AgentEntityInvestigationAuthorityService.class);
    private final AgentTargetCanonicalizationService service = new AgentTargetCanonicalizationService(
            null, null, null, null, null, null, incidents, entities);

    @Test
    void automaticEventGetsServerIssuedTargetAndReplayKeepsOriginalWindow() {
        var incident = new AgentAlertIncidentContext(1L, 42L, List.of(42L), 1, 1000);
        var source = command(AgentTargetRef.builder().alertId(42L).build(), incident, AgentRuntimeEntryType.ALERT_TRIGGER,
                AgentActor.alertAnalysisActor(), "system");
        var target = AgentTargetRef.builder().version("incident.v1").alertId(42L).alertType("single")
                .incident(new AgentIncidentScope(1L, List.of(42L), 1000, 2000))
                .authority(authority(1L, "incident-authority.v1")).build();
        when(incidents.canonicalize("w", incident, 2000)).thenReturn(target);
        assertTrue(service.requiresCanonicalization(source));
        assertEquals(target, service.canonicalize(source).userInput().getTarget());
        assertEquals(target, service.replayCommand(source, target).userInput().getTarget());
        var wrong = command(AgentTargetRef.builder().alertId(42L).build(), incident, AgentRuntimeEntryType.ALERT_TRIGGER,
                AgentActor.builder().type("user").id("alice").roles(List.of("admin")).build(), "web-ui");
        assertThrows(IllegalArgumentException.class, () -> service.canonicalize(wrong));
    }

    @Test
    void operatorScopeStripsAuthorityOnRetryAndRejectsClientForgedAuthority() {
        var signal = AgentSignalRef.builder().type("investigation").start(1000L).end(2000L).timezone("UTC").build();
        var source = AgentTargetRef.builder().entityId(42L).signal(signal).build();
        var target = source.toBuilder().version("entity-investigation.v1")
                .authority(authority(42L, "entity-investigation-authority.v1")).build();
        when(entities.canonicalize("w", 42L, signal)).thenReturn(target);
        var command = command(source, null, AgentRuntimeEntryType.USER_INPUT, user(), "web-ui");
        assertEquals(target, service.canonicalize(command).userInput().getTarget());
        assertEquals(source, AgentTargetCanonicalizationService.retrySourceIntent(target));
        assertNull(AgentTargetCanonicalizationService.retrySourceIntent(target).getAuthority());
        assertThrows(IllegalArgumentException.class, () -> service.canonicalize(
                command(target, null, AgentRuntimeEntryType.USER_INPUT, user(), "web-ui")));
    }

    @Test
    void absentIncidentDoesNotChangeLegacyTargetFingerprintMaterial() {
        String json = org.apache.hertzbeat.common.util.JsonUtil.toJson(AgentTargetRef.builder().alertId(42L).build());
        assertFalse(json.contains("incident"));
    }

    @Test
    void alertTriggerWithoutTrustedIncidentCannotUseGenericGrounding() {
        var source = command(null, null, AgentRuntimeEntryType.ALERT_TRIGGER, AgentActor.alertAnalysisActor(), "system");
        assertTrue(service.requiresCanonicalization(source));
        assertThrows(IllegalArgumentException.class, () -> service.canonicalize(source));
        verifyNoInteractions(incidents, entities);
    }

    private AgentActor user() {
        return AgentActor.builder().type("user").id("alice").roles(List.of("user")).build();
    }

    private AgentTargetAuthority authority(Long id, String version) {
        return AgentTargetAuthority.builder().bindingId(id).version(version).hash("sha256:" + "a".repeat(64)).build();
    }

    private InvokeCommand command(AgentTargetRef target, AgentAlertIncidentContext incident, AgentRuntimeEntryType entry,
                                   AgentActor actor, String channel) {
        return InvokeCommand.builder().commandId("message").entryType(entry).replyMode(ReplyMode.FINAL_ONLY)
                .envelope(GatewayEnvelope.builder().channelId(channel).actor(actor).workspaceId("w").receivedAt(2000L).build())
                .userInput(UserInput.builder().messageId("message").conversationId("conversation").target(target)
                        .alertIncident(incident).message(UserInput.Message.builder().text("Investigate").build()).build()).build();
    }
}
