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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageCompletedPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageDeltaPayload;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.MessageStartedPayload;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;

/**
 * Holds one assistant message until complete-text redaction can protect the outbound event stream.
 */
final class AgentGatewayMessageBuffer {

    // Match the existing transcript MySQL TEXT budget; never truncate raw text before redaction.
    private static final int MAX_UTF8_BYTES = 65_535;

    private GatewayEvent started;
    private final StringBuilder text = new StringBuilder();
    private int utf8Bytes;

    List<GatewayEvent> accept(GatewayEvent event) {
        return switch (event.type()) {
            case MESSAGE_STARTED -> {
                if (started != null) {
                    throw new IllegalStateException("Assistant messages must not overlap.");
                }
                started = event;
                yield List.of(event);
            }
            case MESSAGE_DELTA -> {
                MessageDeltaPayload payload = (MessageDeltaPayload) event.payload();
                requireMessage(event, payload.traceId());
                append(payload.delta());
                yield List.of();
            }
            case MESSAGE_COMPLETED -> complete(event);
            case ERROR, RUN_COMPLETED -> {
                clear();
                yield List.of(event);
            }
            default -> List.of(event);
        };
    }

    void clear() {
        started = null;
        text.setLength(0);
        utf8Bytes = 0;
    }

    private List<GatewayEvent> complete(GatewayEvent event) {
        MessageCompletedPayload payload = (MessageCompletedPayload) event.payload();
        requireMessage(event, payload.traceId());
        String safeText = GatewayText.redactSecrets(text.toString());
        clear();
        if (safeText.getBytes(StandardCharsets.UTF_8).length > MAX_UTF8_BYTES) {
            throw new IllegalStateException("Redacted assistant message exceeds the Gateway text budget.");
        }
        if (safeText.isEmpty()) {
            return List.of(event);
        }
        GatewayEvent redacted = new GatewayEvent(GatewayEventType.MESSAGE_DELTA, event.eventId() + ":redacted",
                event.conversationId(), event.sessionUid(), event.runUid(), event.itemId(),
                new MessageDeltaPayload(payload.traceId(), 0, safeText), event.timestamp());
        return List.of(redacted, event);
    }

    private void requireMessage(GatewayEvent event, String traceId) {
        if (started == null || !Objects.equals(started.itemId(), event.itemId())
                || !Objects.equals(started.conversationId(), event.conversationId())
                || !Objects.equals(started.sessionUid(), event.sessionUid())
                || !Objects.equals(started.runUid(), event.runUid())
                || !Objects.equals(((MessageStartedPayload) started.payload()).traceId(), traceId)) {
            throw new IllegalStateException("Assistant message event does not match its start.");
        }
    }

    private void append(String delta) {
        if (delta == null || delta.isEmpty()) {
            return;
        }
        if (delta.length() > MAX_UTF8_BYTES - text.length()) {
            throw new IllegalStateException("Assistant message exceeds the Gateway text budget.");
        }
        int additionalBytes = delta.getBytes(StandardCharsets.UTF_8).length;
        if (!text.isEmpty() && Character.isHighSurrogate(text.charAt(text.length() - 1))
                && Character.isLowSurrogate(delta.charAt(0))) {
            // Two replacement bytes become one four-byte code point when a surrogate pair spans chunks.
            additionalBytes += 2;
        }
        if (additionalBytes > MAX_UTF8_BYTES - utf8Bytes) {
            throw new IllegalStateException("Assistant message exceeds the Gateway text budget.");
        }
        text.append(delta);
        utf8Bytes += additionalBytes;
    }
}
