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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelBinding;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.part.TextPart;
import org.springframework.ai.chat.messages.part.ToolCallPart;

class UpgradePartsContractTest {

    @Test
    void publicProjectionMustRedactSecretsSplitAcrossProviderParts() {
        var parts = new AgentModelParts("fixture", List.of(TextPart.of("apiKey="), TextPart.of("fixture-secret")));
        var view = AgentPublicMessageParts.project(parts, List.of(), true);
        assertEquals("apiKey=[REDACTED]", view.getFirst().getText());
        assertFalse(JsonUtil.toJson(view).contains("fixture-secret"));
    }

    @Test
    void publicPartsPreserveTextToolOrderAndRejectUnpairedCalls() {
        var call = new AssistantMessage.ToolCall("call-1", "function", "read_fixture", "{}");
        var parts = new AgentModelParts("fixture", List.of(TextPart.of("before"), ToolCallPart.of(call), TextPart.of("after")));
        var fallback = List.of(TranscriptContent.toolCall("call-1", "read.fixture", java.util.Map.of()));
        var view = AgentPublicMessageParts.project(parts, fallback, true);
        assertEquals(List.of("text", "toolCall", "text"), view.stream().map(TranscriptContent::getType).toList());
        assertEquals("read.fixture", view.get(1).getName());
        assertThrows(AgentRuntimeModelException.class, () -> AgentPublicMessageParts.project(parts, List.of(), true));
        var duplicate = new AgentModelParts("fixture", List.of(ToolCallPart.of(call), ToolCallPart.of(call)));
        assertThrows(AgentRuntimeModelException.class, () -> AgentPublicMessageParts.project(duplicate, fallback, true));
        var duplicateWithSecret = new AgentModelParts("fixture", List.of(TextPart.of("apiKey=fixture"),
                ToolCallPart.of(call), ToolCallPart.of(call)));
        assertThrows(AgentRuntimeModelException.class,
                () -> AgentPublicMessageParts.project(duplicateWithSecret, fallback, true));
    }

    @Test
    void partsStayOrderedEncryptedPrivateAndBoundToTheOriginalProvider() {
        AesUtil.setDefaultSecretKey("parts-fixture-01");
        var parts = new AgentModelParts("binding-fixture", List.of(TextPart.of("before"),
                ToolCallPart.of(new AssistantMessage.ToolCall("call-1", "function", "read_fixture", "{}")),
                new org.springframework.ai.chat.messages.part.ReasoningPart(null, "safe summary",
                        new org.springframework.ai.chat.messages.part.OpaquePayload("openai", "response-output-item",
                                "{\"encrypted_content\":\"opaque-fixture\"}"), java.util.Map.of()), TextPart.of("after")));
        String ciphertext = AgentModelPartsCodec.seal(parts);
        assertFalse(ciphertext.contains("before"));
        var message = TranscriptMessage.assistantText("safe public view", null);
        message.setModelPartsCiphertext(ciphertext);
        assertFalse(JsonUtil.toJson(message).contains(ciphertext));
        assertFalse(JsonUtil.toJson(message).contains("opaque-fixture"));
        String stored = AgentModelPartsCodec.storageJson(message);
        assertTrue(stored.contains("modelPartsCiphertext"));
        String redacted = org.springframework.test.util.ReflectionTestUtils.invokeMethod(
                org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService.class, "redactTranscriptPayload", stored);
        var replayMessage = JsonUtil.fromJson(redacted, TranscriptMessage.class);
        var replay = AgentModelPartsCodec.open(replayMessage.getModelPartsCiphertext(), "binding-fixture");
        assertEquals(parts, replay);
        assertThrows(AgentRuntimeModelException.class, () -> AgentModelPartsCodec.open(ciphertext, "another-provider"));
    }

    @Test
    void bindingIgnoresCredentialRotationButChangesWithProtocolAndDestination() {
        var config = new ModelProviderConfig();
        config.setUid("fixture");
        config.setType("openai-compatible");
        config.setBaseUrl("https://fixture.invalid/v1");
        config.setModel("fixture");
        config.setApiKey("fixture-one");
        String legacy = AgentModelBinding.of(config);
        config.setApiKey("fixture-two");
        assertEquals(legacy, AgentModelBinding.of(config));
        config.setProtocol("responses");
        assertNotEquals(legacy, AgentModelBinding.of(config));
        String response = AgentModelBinding.of(config);
        config.setBaseUrl("https://other.invalid/v1");
        assertNotEquals(response, AgentModelBinding.of(config));
        config.setProtocol("unknown-protocol");
        assertThrows(IllegalArgumentException.class, () -> AgentModelBinding.of(config));
    }
}
