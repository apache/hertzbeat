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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentSessionKeyBuilder}.
 */
class AgentSessionKeyBuilderTest {

    private final AgentSessionKeyBuilder keyBuilder = new AgentSessionKeyBuilder();

    @Test
    void buildShouldReturnBoundedDeterministicKeyForSessionIdentity() {
        GatewayEnvelope envelope = GatewayEnvelope.builder()
            .channelId("c".repeat(64))
            .receivedAt(100L)
            .actor(AgentActor.builder().type("user").id("alice").build())
            .build();
        String conversationId = "e".repeat(256);

        String first = keyBuilder.build(envelope, conversationId);
        String second = keyBuilder.build(envelope, conversationId);

        assertEquals(first, second);
        assertTrue(first.startsWith("v1:"));
        assertEquals(67, first.length());
    }

    @Test
    void buildShouldChangeWhenActorChanges() {
        String conversationId = "chat-1";

        String first = keyBuilder.build(envelope("web-ui", "user", "alice"), conversationId);
        String second = keyBuilder.build(envelope("web-ui", "user", "bob"), conversationId);

        assertNotEquals(first, second);
    }

    @Test
    void buildShouldChangeWhenConversationChanges() {
        GatewayEnvelope envelope = envelope("web-ui", "user", "alice");

        String first = keyBuilder.build(envelope, "chat-1");
        String second = keyBuilder.build(envelope, "chat-2");

        assertNotEquals(first, second);
    }

    private GatewayEnvelope envelope(String channelId, String actorType, String actorId) {
        return GatewayEnvelope.builder()
            .channelId(channelId)
            .receivedAt(100L)
            .actor(AgentActor.builder().type(actorType).id(actorId).build())
            .build();
    }
}
