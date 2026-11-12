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

import java.util.List;
import org.springframework.ai.chat.messages.part.MessagePart;
import org.springframework.util.StringUtils;

/** Ordered provider transcript, replayable only to the exact originating model binding. */
public record AgentModelParts(String binding, List<MessagePart> parts) {
    public AgentModelParts {
        if (!StringUtils.hasText(binding)) {
            throw new IllegalArgumentException("Model part binding is required");
        }
        parts = List.copyOf(parts);
    }
}
