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

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Provider-neutral content block stored inside a transcript message.
 */
@Data
@Builder(toBuilder = true)
@AllArgsConstructor
@NoArgsConstructor
public class TranscriptContent {

    public static final String TYPE_TEXT = "text";
    public static final String TYPE_TOOL_CALL = "toolCall";

    private String type;

    private String text;

    private String id;

    private String name;

    @Builder.Default
    private Map<String, Object> input = new LinkedHashMap<>();

    public static TranscriptContent text(String text) {
        return TranscriptContent.builder()
            .type(TYPE_TEXT)
            .text(text)
            .build();
    }

    public static TranscriptContent toolCall(String id, String name, Map<String, Object> input) {
        return TranscriptContent.builder()
            .type(TYPE_TOOL_CALL)
            .id(id)
            .name(name)
            .input(input == null ? new LinkedHashMap<>() : new LinkedHashMap<>(input))
            .build();
    }

    public boolean isText() {
        return TYPE_TEXT.equals(type);
    }

    public boolean isToolCall() {
        return TYPE_TOOL_CALL.equals(type);
    }
}
