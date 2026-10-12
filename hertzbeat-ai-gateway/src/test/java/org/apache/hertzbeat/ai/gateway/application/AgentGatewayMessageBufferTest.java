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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageDeltaPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageStartedPayload;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class AgentGatewayMessageBufferTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "password=synthetic-sentinel",
        "{\"password\":\"synthetic-sentinel\"}",
        "-----BEGIN PRIVATE KEY-----\nsynthetic-sentinel\n-----END PRIVATE KEY-----"
    })
    void redactsCompleteTextAcrossEveryPossibleSplit(String raw) {
        for (int split = 1; split < raw.length(); split++) {
            AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
            buffer.accept(start());
            assertTrue(buffer.accept(delta(raw.substring(0, split))).isEmpty());
            assertTrue(buffer.accept(delta(raw.substring(split))).isEmpty());
            List<GatewayEvent> completed = buffer.accept(complete());
            assertEquals(GatewayText.redactSecrets(raw), text(completed.getFirst()));
            assertEquals(List.of(GatewayEventType.MESSAGE_DELTA, GatewayEventType.MESSAGE_COMPLETED),
                    completed.stream().map(GatewayEvent::type).toList());
            assertTrue(!text(completed.getFirst()).contains("synthetic-sentinel"));
        }
    }

    @Test
    void toolProgressContinuesWhileAssistantTextWaitsForCompletion() {
        AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
        buffer.accept(start());
        buffer.accept(delta("pass"));
        GatewayEvent tool = new GatewayEvent(GatewayEventType.TOOL_STARTED, "tool-1", "conversation", "session",
                "run", "tool", new GatewayEvent.ToolStartedPayload("trace", "logs.query", "call", null, "IN_PROGRESS"), 1L);
        assertEquals(List.of(tool), buffer.accept(tool));
        buffer.accept(delta("word=synthetic-sentinel"));
        assertEquals("password=[REDACTED]", text(buffer.accept(complete()).getFirst()));
    }

    @Test
    void clearAndTerminalEventsDiscardIncompleteText() {
        AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
        for (GatewayEventType terminal : List.of(GatewayEventType.ERROR, GatewayEventType.RUN_COMPLETED)) {
            buffer.accept(start());
            buffer.accept(delta("password=synthetic-sentinel"));
            GatewayEvent event = new GatewayEvent(terminal, "terminal", "conversation", "session", "run", null,
                    terminal == GatewayEventType.ERROR ? new GatewayEvent.ErrorPayload("trace", "Stopped", "FAILED")
                            : new GatewayEvent.RunCompletedPayload("trace"), 2L);
            assertEquals(List.of(event), buffer.accept(event));
            assertThrows(IllegalStateException.class, () -> buffer.accept(complete()));
        }
        buffer.accept(start());
        buffer.accept(delta("incomplete"));
        buffer.clear();
        buffer.accept(start());
        buffer.accept(delta("new safe response"));
        assertEquals("new safe response", text(buffer.accept(complete()).getFirst()));
    }

    @Test
    void emptyMessageDoesNotInventText() {
        AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
        buffer.accept(start());
        assertEquals(List.of(complete()), buffer.accept(complete()));
    }

    @Test
    void rejectsOverlappingMessagesAndMismatchedScopeBeforePublishingText() {
        AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
        buffer.accept(start());
        buffer.accept(delta("pass"));
        assertThrows(IllegalStateException.class, () -> buffer.accept(start()));
        for (GatewayEvent foreign : List.of(
                new GatewayEvent(GatewayEventType.MESSAGE_DELTA, "delta", "other", "session", "run", "message",
                        new MessageDeltaPayload("trace", 0, "word=synthetic-sentinel"), 1L),
                new GatewayEvent(GatewayEventType.MESSAGE_DELTA, "delta", "conversation", "other", "run", "message",
                        new MessageDeltaPayload("trace", 0, "word=synthetic-sentinel"), 1L),
                new GatewayEvent(GatewayEventType.MESSAGE_DELTA, "delta", "conversation", "session", "other", "message",
                        new MessageDeltaPayload("trace", 0, "word=synthetic-sentinel"), 1L),
                new GatewayEvent(GatewayEventType.MESSAGE_DELTA, "delta", "conversation", "session", "run", "other",
                        new MessageDeltaPayload("trace", 0, "word=synthetic-sentinel"), 1L),
                new GatewayEvent(GatewayEventType.MESSAGE_COMPLETED, "completed", "conversation", "session", "run", "message",
                        new MessageCompletedPayload("other-trace"), 2L))) {
            assertThrows(IllegalStateException.class, () -> buffer.accept(foreign));
        }
    }

    @Test
    void keepsExactUtf8BudgetIncludingSplitSurrogatePairs() {
        AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
        String prefix = "a".repeat(65_531);
        buffer.accept(start());
        buffer.accept(delta(prefix + "\uD83D"));
        buffer.accept(delta("\uDE00"));
        String completed = text(buffer.accept(complete()).getFirst());
        assertEquals(65_535, completed.getBytes(StandardCharsets.UTF_8).length);
        assertEquals(prefix + "\uD83D\uDE00", completed);
    }

    @Test
    void rejectsActualUtf8OverflowBeforeAppendingOrTruncatingRawText() {
        AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
        buffer.accept(start());
        buffer.accept(delta("\u20ac".repeat(21_845)));
        assertThrows(IllegalStateException.class, () -> buffer.accept(delta("a")));
        buffer.clear();
        buffer.accept(start());
        buffer.accept(delta("a".repeat(65_532) + "\uD83D"));
        assertThrows(IllegalStateException.class, () -> buffer.accept(delta("\uDE00")));
        buffer.clear();
        buffer.accept(start());
        assertThrows(IllegalStateException.class,
                () -> buffer.accept(delta("-----BEGIN PRIVATE KEY-----" + "x".repeat(65_535) + "-----END PRIVATE KEY-----")));
    }

    @Test
    void rejectsRedactionExpansionBeyondTheSameOutboundTextBudget() {
        AgentGatewayMessageBuffer buffer = new AgentGatewayMessageBuffer();
        buffer.accept(start());
        buffer.accept(delta("token=x\n".repeat(8_191)));
        assertThrows(IllegalStateException.class, () -> buffer.accept(complete()));
    }

    private GatewayEvent start() {
        return new GatewayEvent(GatewayEventType.MESSAGE_STARTED, "started", "conversation", "session", "run", "message",
                new MessageStartedPayload("trace"), 0L);
    }

    private GatewayEvent delta(String value) {
        return new GatewayEvent(GatewayEventType.MESSAGE_DELTA, "delta", "conversation", "session", "run", "message",
                new MessageDeltaPayload("trace", 0, value), 1L);
    }

    private GatewayEvent complete() {
        return new GatewayEvent(GatewayEventType.MESSAGE_COMPLETED, "completed", "conversation", "session", "run", "message",
                new MessageCompletedPayload("trace"), 2L);
    }

    private String text(GatewayEvent event) {
        return ((MessageDeltaPayload) event.payload()).delta();
    }
}
