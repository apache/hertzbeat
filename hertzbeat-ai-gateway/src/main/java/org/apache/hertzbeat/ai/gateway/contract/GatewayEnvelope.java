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

package org.apache.hertzbeat.ai.gateway.contract;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.Objects;
import lombok.Builder;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.springframework.util.StringUtils;

/**
 * Trusted invocation metadata supplied by a channel boundary.
 */
@Builder(toBuilder = true)
public record GatewayEnvelope(
        @Size(max = 64) String channelId,
        Long receivedAt,
        @Valid AgentActor actor,
        @Size(max = 16) String preferredLanguage) {

    public GatewayEnvelope {
        if (!StringUtils.hasText(channelId)) {
            throw new IllegalArgumentException("Gateway envelope channel id is required");
        }
        receivedAt = Objects.requireNonNull(receivedAt, "Gateway envelope received time is required");
        if (receivedAt < 0) {
            throw new IllegalArgumentException("Gateway envelope received time must not be negative");
        }
    }

    public String getChannelId() {
        return channelId;
    }

    public Long getReceivedAt() {
        return receivedAt;
    }

    public AgentActor getActor() {
        return actor;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }
}
