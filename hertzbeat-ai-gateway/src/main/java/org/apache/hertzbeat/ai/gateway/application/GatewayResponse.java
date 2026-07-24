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

import java.util.List;
import java.util.Objects;
import lombok.Builder;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;

/**
 * Channel-neutral Gateway response.
 */
public sealed interface GatewayResponse permits
        GatewayResponse.GatewaySingleResponse,
        GatewayResponse.GatewayStreamResponse {

    Meta meta();

    /**
     * Final-only Gateway response.
     */
    @Builder
    record GatewaySingleResponse(
            Meta meta,
            Object body,
            List<GatewayEvent> events) implements GatewayResponse {

        public GatewaySingleResponse {
            Objects.requireNonNull(meta, "meta is required");
            events = events == null ? List.of() : List.copyOf(events);
        }
    }

    /**
     * Streaming Gateway response.
     */
    @Builder
    record GatewayStreamResponse(
            Meta meta,
            Flux<GatewayEvent> events) implements GatewayResponse {

        public GatewayStreamResponse {
            Objects.requireNonNull(meta, "meta is required");
            Objects.requireNonNull(events, "events is required");
        }
    }

    /**
     * Common Gateway response metadata.
     */
    @Builder
    record Meta(
            String commandId,
            String conversationId,
            String sessionUid,
            String runUid,
            boolean terminal,
            String message) {

        public Meta {
            // Every response is correlated to one normalized command and exposes a human-readable outcome label.
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(message)) {
                throw new IllegalArgumentException("Response command id and message are required");
            }
        }
    }
}
