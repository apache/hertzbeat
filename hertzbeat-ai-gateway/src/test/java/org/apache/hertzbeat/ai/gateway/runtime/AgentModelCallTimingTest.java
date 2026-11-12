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
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.metadata.ChatGenerationMetadata;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;

import reactor.core.publisher.Flux;

import java.time.Clock;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

class AgentModelCallTimingTest {
    @Test
    void contentFreeTimingReportsObservedChunkTextAndOnlySuppliedMetadata() {
        var nanos = new AtomicLong();
        var request =
                AgentRuntimeModelRequest.builder()
                        .prompt(
                                RuntimePrompt.builder()
                                        .instructions("EXPLICIT_MANIFEST_INTENT")
                                        .build())
                        .build();
        var timing = new AgentModelCallTiming("run", request, Clock.systemUTC(), nanos::get);
        nanos.set(5_000_000);
        timing.chunk();
        nanos.set(9_000_000);
        timing.text("DO_NOT_RETAIN_CONTENT_OR_SECRET");
        nanos.set(20_000_000);
        var result =
                timing.finish(
                        ChatResponseMetadata.builder()
                                .model("local-test")
                                .usage(new DefaultUsage(11, 7, 18))
                                .build(),
                        "length",
                        true,
                        false);
        assertEquals(20L, result.get("elapsedMs"));
        assertEquals(5L, result.get("firstChunkMs"));
        assertEquals(9L, result.get("firstTextDeltaMs"));
        assertEquals("MANIFEST_INTENT", result.get("phase"));
        assertEquals(11, result.get("promptTokens"));
        assertFalse(result.toString().contains("DO_NOT_RETAIN"));
        var empty =
                new AgentModelCallTiming("run", request, Clock.systemUTC(), nanos::get)
                        .finish(null, null, false, true);
        assertEquals("NOT_ADVERTISED", empty.get("usageSource"));
        assertFalse(empty.containsKey("promptTokens"));
        assertEquals(-1L, empty.get("firstTextDeltaMs"));
    }

    @Test
    void lengthTruncationCannotBecomeFinalAnswerEvenIfItLooksLikeValidJson() {
        var response =
                new ChatResponse(
                        List.of(
                                new Generation(
                                        AssistantMessage.builder()
                                                .content("{\"complete\":true}")
                                                .build(),
                                        ChatGenerationMetadata.builder()
                                                .finishReason("length")
                                                .build())),
                        ChatResponseMetadata.builder().build());
        org.springframework.ai.chat.model.StreamingChatModel chat = prompt -> Flux.just(response);
        var model = new HertzBeatModel(chat);
        var request =
                AgentRuntimeModelRequest.builder()
                        .prompt(RuntimePrompt.builder().instructions("test").build())
                        .build();
        try (var control = new AgentRuntimeControl("trace", "run", Clock.systemUTC())) {
            var result = model.stream(request, control, ignored -> {});
            assertEquals(AgentRuntimeModelResponse.ResponseType.INVALID_RESPONSE, result.getType());
            assertTrue(result.getErrorMessage().startsWith("MODEL_OUTPUT_LIMIT_REACHED"));
            assertTrue(result.getToolCalls().isEmpty());
        }
    }
}
