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
import java.util.Objects;
import lombok.Builder;
import lombok.Value;
import org.springframework.util.StringUtils;

/**
 * Model-neutral prompt payload for a runtime model request.
 */
@Value
public class RuntimePrompt {

    String instructions;

    List<Block> blocks;

    @Builder
    private RuntimePrompt(String instructions, List<Block> blocks) {
        // Prompt drafts always materialize instruction text, including an intentionally empty string.
        this.instructions = java.util.Objects.requireNonNull(instructions, "Runtime prompt instructions are required");
        // Frames are optional, but supplied blocks must be complete immutable values.
        this.blocks = blocks == null ? List.of() : List.copyOf(blocks);
    }

    /**
     * Model-neutral prompt block.
     */
    @Value
    public static class Block {

        Role role;

        Frame frame;

        String content;

        @Builder
        private Block(Role role, Frame frame, String content) {
            this.role = Objects.requireNonNull(role, "Runtime prompt block role is required");
            this.frame = Objects.requireNonNull(frame, "Runtime prompt block frame is required");
            if (!StringUtils.hasText(content)) {
                throw new IllegalArgumentException("Runtime prompt block content is required");
            }
            this.content = content;
        }

        public String frameId() {
            return frame.id();
        }
    }

    /**
     * Model-neutral prompt input role.
     */
    public enum Role {
        SYSTEM,
        USER
    }

    /**
     * Runtime prompt frame identity.
     */
    public enum Frame {
        BASE_INSTRUCTIONS("base_instructions", "Base Instructions"),
        RUNTIME("runtime", "Runtime"),
        INCIDENT("incident", "Incident"),
        TOOL_PROTOCOL("tool_protocol", "Tool Protocol");

        private final String id;
        private final String title;

        Frame(String id, String title) {
            this.id = id;
            this.title = title;
        }

        public String id() {
            return id;
        }

        public String title() {
            return title;
        }
    }

}
