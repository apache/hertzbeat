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

package org.apache.hertzbeat.ai.gateway.tool.interaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent.RequestKind;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEventType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService.InputField;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService.InteractionResult;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentInteractionInputService}.
 */
class AgentInteractionInputServiceTest {

    private final AgentInteractionInputService service = new AgentInteractionInputService();
    private final AgentActor actor = AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build();

    @Test
    void shouldRequestInputAndConsumeReferenceOnceAcrossRuns() throws Exception {
        List<AgentRuntimeEvent> publishedEvents = new CopyOnWriteArrayList<>();
        CountDownLatch eventPublished = new CountDownLatch(1);
        AgentToolExecutionRequest interactionRequest = request("interaction.request_input", Map.of())
                .toBuilder()
                .eventConsumer(event -> {
                    publishedEvents.add(event);
                    eventPublished.countDown();
                })
                .build();
        AgentToolExecutionContext context = new AgentToolExecutionContext(interactionRequest,
                AgentToolCall.builder().toolCallId("agc-input").build());
        List<InputField> fields = List.of(
                new InputField("host", "params.host", "text", "Host", true, null),
                new InputField("password", "params.password", "secret", "Password", true, null));

        CompletableFuture<InteractionResult> resultFuture = CompletableFuture.supplyAsync(
                () -> service.request("monitor.create", "Create monitor", "Connection details", fields, context));

        assertTrue(eventPublished.await(2, TimeUnit.SECONDS));
        AgentRuntimeEvent event = publishedEvents.get(0);
        assertEquals(RequestKind.USER_INPUT, event.getRequestKind());
        assertEquals("monitor.create", event.getRequestPayload().get("targetTool"));
        service.submit(event.getRequestId(), actor, Map.of("host", "127.0.0.1", "password", "secret"));

        InteractionResult result = resultFuture.get(2, TimeUnit.SECONDS);
        AgentRuntimeEvent completedEvent = publishedEvents.get(1);
        assertEquals(AgentRuntimeEventType.REQUEST_COMPLETED, completedEvent.getType());
        assertEquals(RequestKind.USER_INPUT, completedEvent.getRequestKind());
        assertEquals(AgentRuntimeEvent.EventStatus.COMPLETED, completedEvent.getStatus());
        assertEquals(event.getRequestId(), completedEvent.getRequestId());
        assertNull(completedEvent.getRequestPayload());
        AgentToolExecutionRequest targetRequest = request("monitor.create",
                Map.of("name", "local", "params", Map.of("port", 22), "inputRef", result.inputRef()))
                .toBuilder()
                .runUid("run-2")
                .build();
        service.validateReference(targetRequest);
        AgentToolExecutionRequest merged = service.mergeAndTake(targetRequest);

        assertFalse(merged.getArguments().containsKey("inputRef"));
        @SuppressWarnings("unchecked")
        Map<String, Object> params = (Map<String, Object>) merged.getArguments().get("params");
        assertEquals(22, params.get("port"));
        assertEquals("127.0.0.1", params.get("host"));
        assertEquals("secret", params.get("password"));
        assertThrows(IllegalArgumentException.class, () -> service.mergeAndTake(targetRequest));
    }

    @Test
    void shouldRejectReferenceForAnotherTargetToolOrSession() throws Exception {
        AtomicReference<AgentRuntimeEvent> publishedEvent = new AtomicReference<>();
        CountDownLatch eventPublished = new CountDownLatch(1);
        AgentToolExecutionRequest interactionRequest = request("interaction.request_input", Map.of())
                .toBuilder()
                .eventConsumer(event -> {
                    publishedEvent.set(event);
                    eventPublished.countDown();
                })
                .build();
        AgentToolExecutionContext context = new AgentToolExecutionContext(interactionRequest,
                AgentToolCall.builder().toolCallId("agc-input").build());

        CompletableFuture<InteractionResult> resultFuture = CompletableFuture.supplyAsync(() -> service.request(
                "monitor.create", "Create monitor", null,
                List.of(new InputField("host", "params.host", "text", "Host", true, null)), context));

        assertTrue(eventPublished.await(2, TimeUnit.SECONDS));
        service.submit(publishedEvent.get().getRequestId(), actor, Map.of("host", "127.0.0.1"));
        InteractionResult result = resultFuture.get(2, TimeUnit.SECONDS);

        assertThrows(IllegalArgumentException.class, () -> service.validateReference(
                request("monitor.query", Map.of("inputRef", result.inputRef()))));
        AgentToolExecutionRequest anotherSessionRequest = request("monitor.create",
                Map.of("inputRef", result.inputRef()))
                .toBuilder()
                .sessionUid("ags-2")
                .build();
        assertThrows(IllegalArgumentException.class,
                () -> service.validateReference(anotherSessionRequest));
    }

    private AgentToolExecutionRequest request(String toolName, Map<String, Object> arguments) {
        return AgentToolExecutionRequest.builder()
                .sessionUid("ags-1")
                .runId(1L)
                .runUid("run-1")
                .runSessionId(2L)
                .actor(actor)
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .toolName(toolName)
                .toolCallId("agc-1")
                .arguments(arguments)
                .build();
    }
}
