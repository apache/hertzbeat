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

package org.apache.hertzbeat.ai.agent.config;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.usthe.sureness.mgt.SurenessSecurityManager;
import com.usthe.sureness.subject.SubjectSum;
import io.modelcontextprotocol.spec.McpError;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpServerSession;
import io.modelcontextprotocol.spec.McpServerTransport;
import io.modelcontextprotocol.spec.McpServerTransportProvider;
import io.modelcontextprotocol.util.Assert;
import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.RouterFunctions;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Custom Server-Sent Events transport provider for Model Context Protocol.
 */
@Slf4j
public class CustomSseServerTransport implements McpServerTransportProvider {
    private final ObjectMapper objectMapper;
    private final String messageEndpoint;
    private final String sseEndpoint;
    private final String baseUrl;
    @Getter
    private final RouterFunction<ServerResponse> routerFunction;
    @Setter
    private McpServerSession.Factory sessionFactory;
    private final Map<String, Object> sessionRequest = new HashMap<>();
    private final ConcurrentHashMap<String, McpServerSession> sessions;
    private volatile boolean isClosing;

    public CustomSseServerTransport(ObjectMapper objectMapper, String messageEndpoint) {
        this(objectMapper, messageEndpoint, "/sse");
    }


    public CustomSseServerTransport(ObjectMapper objectMapper, String messageEndpoint, String sseEndpoint) {
        this(objectMapper, "", messageEndpoint, sseEndpoint);
    }

    public CustomSseServerTransport(ObjectMapper objectMapper, String baseUrl, String messageEndpoint, String sseEndpoint) {
        this.sessions = new ConcurrentHashMap();
        this.isClosing = false;
        Assert.notNull(objectMapper, "ObjectMapper must not be null");
        Assert.notNull(baseUrl, "Message base URL must not be null");
        Assert.notNull(messageEndpoint, "Message endpoint must not be null");
        Assert.notNull(sseEndpoint, "SSE endpoint must not be null");
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
        this.messageEndpoint = messageEndpoint;
        this.sseEndpoint = sseEndpoint;
        this.routerFunction = RouterFunctions.route().GET(this.sseEndpoint, this::handleSseConnection).POST(this.messageEndpoint, this::handleMessage).build();
    }

    public Mono<Void> notifyClients(String method, Object params) {
        if (this.sessions.isEmpty()) {
            log.debug("No active sessions to broadcast message to");
            return Mono.empty();
        } else {
            log.debug("Attempting to broadcast message to {} active sessions", this.sessions.size());
            return Flux.fromIterable(this.sessions.values())
                    .flatMap((session) -> session.sendNotification(method, params)
                            .doOnError((e) -> log.error("Failed to send message to session {}: {}", session.getId(), e.getMessage()))
                            .onErrorComplete())
                    .then();
        }
    }

    public Mono<Void> closeGracefully() {
        return Flux.fromIterable(this.sessions.values()).doFirst(() -> {
            this.isClosing = true;
            log.debug("Initiating graceful shutdown with {} active sessions", this.sessions.size());
        }).flatMap(McpServerSession::closeGracefully).then().doOnSuccess((v) -> log.debug("Graceful shutdown completed"));
    }

    private ServerResponse handleSseConnection(ServerRequest request) {
        log.debug("Handling SSE connection for request: {}", request);
        HttpServletRequest servletRequest = request.servletRequest();

        try {

            log.debug("Processing SSE connection for servlet request: {}", servletRequest);
            log.debug("Authorization header: {}", servletRequest.getHeader("Authorization"));


        } catch (Exception e) {
            log.error("Authentication failed for SSE connection: {}", e.getMessage());
            return ServerResponse.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: " + e.getMessage());
        }



        if (this.isClosing) {
            return ServerResponse.status(HttpStatus.SERVICE_UNAVAILABLE).body("Server is shutting down");
        } else {
            String sessionId = UUID.randomUUID().toString();
            log.debug("Generated session ID for SSE connection: {}", sessionId);
            log.debug("Creating new SSE connection for session: {}", sessionId);


            return ServerResponse.sse((sseBuilder) -> {
                sseBuilder.onComplete(() -> {
                    log.debug("SSE connection completed for session: {}", sessionId);
                    this.sessions.remove(sessionId);
                });
                sseBuilder.onTimeout(() -> {
                    log.debug("SSE connection timed out for session: {}", sessionId);
                    this.sessions.remove(sessionId);
                });
                CustomSseServerTransport.WebMvcMcpSessionTransport sessionTransport = new CustomSseServerTransport.WebMvcMcpSessionTransport(sessionId, sseBuilder);
                McpServerSession session = this.sessionFactory.create(sessionTransport);
                this.sessionRequest.put(sessionId, request.servletRequest());
                this.sessions.put(sessionId, session);

                try {
                    sseBuilder.id(sessionId).event("endpoint").data(this.baseUrl + this.messageEndpoint + "?sessionId=" + sessionId);
                } catch (Exception e) {
                    log.error("Failed to send initial endpoint event: {}", e.getMessage());
                    sseBuilder.error(e);
                }

            }, Duration.ZERO);

        }
    }

    private ServerResponse handleMessage(ServerRequest request) {
        if (this.isClosing) {
            return ServerResponse.status(HttpStatus.SERVICE_UNAVAILABLE).body("Server is shutting down");
        } else if (request.param("sessionId").isEmpty()) {
            return ServerResponse.badRequest().body(new McpError("Session ID missing in message endpoint"));
        } else {
            String sessionId = (String) request.param("sessionId").get();
            McpServerSession session = (McpServerSession) this.sessions.get(sessionId);
            log.debug("Authorization header for message request: {}", request.servletRequest().getHeader("Authorization"));
            SubjectSum subject = SurenessSecurityManager.getInstance().checkIn(sessionRequest.get(sessionId));
            McpContextHolder.setSubject(subject);


            if (session == null) {
                return ServerResponse.status(HttpStatus.NOT_FOUND).body(new McpError("Session not found: " + sessionId));
            } else {
                try {
                    String body = request.body(String.class);
                    McpSchema.JSONRPCMessage message = McpSchema.deserializeJsonRpcMessage(this.objectMapper, body);
                    session.handle(message).block();
                    return ServerResponse.ok().build();
                } catch (IOException | IllegalArgumentException e) {
                    log.error("Failed to deserialize message: {}", ((Exception) e).getMessage());
                    return ServerResponse.badRequest().body(new McpError("Invalid message format"));
                } catch (Exception e) {
                    log.error("Error handling message: {}", e.getMessage());
                    return ServerResponse.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new McpError(e.getMessage()));
                }
            }
        }
    }

    private class WebMvcMcpSessionTransport implements McpServerTransport {
        private final String sessionId;
        private final ServerResponse.SseBuilder sseBuilder;

        WebMvcMcpSessionTransport(String sessionId, ServerResponse.SseBuilder sseBuilder) {
            this.sessionId = sessionId;
            this.sseBuilder = sseBuilder;
            log.debug("Session transport {} initialized with SSE builder", sessionId);
        }

        public Mono<Void> sendMessage(McpSchema.JSONRPCMessage message) {
            return Mono.fromRunnable(() -> {
                try {
                    String jsonText = CustomSseServerTransport.this.objectMapper.writeValueAsString(message);
                    this.sseBuilder.id(this.sessionId).event("message").data(jsonText);
                    log.debug("Message sent to session {}", this.sessionId);
                } catch (Exception e) {
                    log.error("Failed to send message to session {}: {}", this.sessionId, e.getMessage());
                    this.sseBuilder.error(e);
                }

            });
        }

        public <T> T unmarshalFrom(Object data, TypeReference<T> typeRef) {
            return (T) CustomSseServerTransport.this.objectMapper.convertValue(data, typeRef);
        }

        public Mono<Void> closeGracefully() {
            return Mono.fromRunnable(() -> {
                log.debug("Closing session transport: {}", this.sessionId);

                try {
                    this.sseBuilder.complete();
                    log.debug("Successfully completed SSE builder for session {}", this.sessionId);
                } catch (Exception e) {
                    log.warn("Failed to complete SSE builder for session {}: {}", this.sessionId, e.getMessage());
                }

            });
        }

        public void close() {
            try {
                this.sseBuilder.complete();
                log.debug("Successfully completed SSE builder for session {}", this.sessionId);
            } catch (Exception e) {
                log.warn("Failed to complete SSE builder for session {}: {}", this.sessionId, e.getMessage());
            }

        }
    }
}
