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

import java.util.List;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.springframework.stereotype.Component;

/**
 * Builds deterministic session keys for Agent Gateway user inputs.
 */
@Component
public class AgentSessionKeyBuilder {

    private static final String KEY_VERSION = "v1:";

    /**
     * Build a stable session key from transport metadata and user input identity.
     */
    public String build(GatewayEnvelope envelope, String conversationId) {
        AgentActor actor = envelope.getActor();
        String canonical = String.join("", List.of(
            component("channel", envelope.getChannelId()),
            component("actorType", actor.getType()),
            component("actorId", actor.getId()),
            component("conversation", conversationId)
        ));
        return KEY_VERSION + GatewayText.sha256(canonical);
    }

    private String component(String name, Object source) {
        // Channel identity fields may contain surrounding whitespace; the session-key boundary canonicalizes them.
        String normalized = source == null ? null : GatewayText.normalize(String.valueOf(source));
        String value = normalized == null ? "-" : normalized;
        return name + "=" + value.length() + ":" + value + ";";
    }
}
