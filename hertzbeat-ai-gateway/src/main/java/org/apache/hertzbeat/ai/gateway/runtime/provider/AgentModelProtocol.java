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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import java.util.Locale;
import org.springframework.util.StringUtils;

/** Explicit wire protocol; legacy configurations retain Chat Completions. */
public enum AgentModelProtocol {
    CHAT_COMPLETIONS("chat-completions"),
    RESPONSES("responses");

    private final String id;

    AgentModelProtocol(String id) {
        this.id = id;
    }

    public String id() {
        return id;
    }

    public static AgentModelProtocol parse(String value) {
        if (!StringUtils.hasText(value)) {
            return CHAT_COMPLETIONS;
        }
        String normalized = value.strip().toLowerCase(Locale.ROOT);
        for (AgentModelProtocol protocol : values()) {
            if (protocol.id.equals(normalized)) {
                return protocol;
            }
        }
        throw new IllegalArgumentException("Unsupported model API protocol: use chat-completions or responses");
    }
}
