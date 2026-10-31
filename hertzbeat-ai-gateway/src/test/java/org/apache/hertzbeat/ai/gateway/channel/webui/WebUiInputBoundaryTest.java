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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Validation;

import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.channel.webui.dto.WebUiChatStreamRequest;
import org.apache.hertzbeat.ai.gateway.contract.AgentRequestLimits;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;

class WebUiInputBoundaryTest {
    @Test
    void fullFiftyManifestSizedInputFitsWithoutTruncation() {
        var input = input("x".repeat(8763));
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(input).isEmpty());
            input.setMessage("x".repeat(AgentRequestLimits.MAX_MESSAGE_CHARS));
            assertTrue(factory.getValidator().validate(input).isEmpty());
            input.setMessage(input.getMessage() + "x");
            assertFalse(factory.getValidator().validate(input).isEmpty());
        }
    }

    @Test
    void multibyteInputHasAnIndependentUtf8Budget() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(input("\u6d4b".repeat(16384))).isEmpty());
            assertFalse(factory.getValidator().validate(input("\u6d4b".repeat(16385))).isEmpty());
        }
    }

    @Test
    void invalidInputWithSseAcceptReturnsSafe400BeforeRunAdmission() throws Exception {
        var router = mock(GatewayCommandRouter.class);
        var mvc =
                MockMvcBuilders.standaloneSetup(
                                new WebUiController(
                                        router, mock(AgentInteractionInputService.class)))
                        .build();
        var input = input("DO_NOT_ECHO_SECRET".repeat(3000));
        var result =
                mvc.perform(
                                post("/api/agent/webui/chat/stream")
                                        .contentType("application/json")
                                        .accept("text/event-stream")
                                        .content(JsonUtil.toJson(input)))
                        .andExpect(status().isBadRequest())
                        .andExpect(content().contentType("application/json"))
                        .andReturn();
        assertTrue(result.getResponse().getContentAsString().contains("AGENT_INPUT_INVALID"));
        assertFalse(result.getResponse().getContentAsString().contains("DO_NOT_ECHO_SECRET"));
        verifyNoInteractions(router);
    }

    @Test
    void malformedJsonWithSseAcceptNeverEchoesRejectedValues() throws Exception {
        var router = mock(GatewayCommandRouter.class);
        var mvc =
                MockMvcBuilders.standaloneSetup(
                                new WebUiController(
                                        router, mock(AgentInteractionInputService.class)))
                        .build();
        var result =
                mvc.perform(
                                post("/api/agent/webui/chat/stream")
                                        .contentType("application/json")
                                        .accept("text/event-stream")
                                        .content("{\"message\":DO_NOT_ECHO_SECRET}"))
                        .andExpect(status().isBadRequest())
                        .andReturn();
        assertFalse(result.getResponse().getContentAsString().contains("DO_NOT_ECHO_SECRET"));
        verifyNoInteractions(router);
    }

    @Test
    void rawBodyIncludingUnknownFieldsIsBoundedBeforeJsonParsing() throws Exception {
        var filter = new WebUiRequestBodyLimit();
        var reached = new AtomicBoolean();
        var response = new MockHttpServletResponse();
        filter.doFilter(
                request(new byte[AgentRequestLimits.MAX_HTTP_BYTES + 1]),
                response,
                (req, res) -> reached.set(true));
        assertEquals(413, response.getStatus());
        assertFalse(reached.get());
    }

    @Test
    void unknownLengthBodyIsAlsoBoundedAndAcceptedBodyIsPreserved() throws Exception {
        var filter = new WebUiRequestBodyLimit();
        byte[] body = "{\"message\":\"manifest\"}".getBytes(StandardCharsets.UTF_8);
        var request = request(body);
        var reached = new AtomicBoolean();
        filter.doFilter(
                request,
                new MockHttpServletResponse(),
                (req, res) -> {
                    assertArrayEquals(body, req.getInputStream().readAllBytes());
                    reached.set(true);
                });
        assertTrue(reached.get());
        byte[] large = new byte[AgentRequestLimits.MAX_HTTP_BYTES + 1];
        var chunked =
                new MockHttpServletRequest("POST", "/api/agent/webui/chat/stream") {
                    @Override
                    public int getContentLength() {
                        return -1;
                    }

                    @Override
                    public long getContentLengthLong() {
                        return -1;
                    }
                };
        chunked.setContent(large);
        var response = new MockHttpServletResponse();
        filter.doFilter(chunked, response, (req, res) -> fail("oversize chunked request admitted"));
        assertEquals(413, response.getStatus());
    }

    private MockHttpServletRequest request(byte[] bytes) {
        var request = new MockHttpServletRequest("POST", "/api/agent/webui/chat/stream");
        request.setContent(bytes);
        return request;
    }

    private WebUiChatStreamRequest input(String text) {
        return WebUiChatStreamRequest.builder()
                .conversationId("test-conversation")
                .messageId("test-message")
                .message(text)
                .build();
    }
}
