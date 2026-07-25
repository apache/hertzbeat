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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.util.Arrays;
import org.apache.hertzbeat.ai.gateway.runtime.RuntimePromptBuilder.PromptText;
import org.apache.hertzbeat.ai.gateway.runtime.RuntimePromptBuilder.RuntimePromptDraft;
import org.junit.jupiter.api.Test;

/**
 * Test case for prompt draft builders.
 */
class RuntimePromptDraftTest {

    @Test
    void shouldBuildPromptBlocksWithMarkdownText() {
        RuntimePrompt prompt = RuntimePromptDraft.create()
                .instructions("system password=hunter2")
                .system(RuntimePrompt.Frame.RUNTIME, PromptText.create()
                        .line("Use this as grounding data.")
                        .section("Time", section -> section
                                .line("Current time", "1970-01-01T00:00:00Z")
                                .line("Blank", "")))
                .system(RuntimePrompt.Frame.TOOL_PROTOCOL, PromptText.create()
                        .section("Tool", section -> section
                                .line("Tool context", "context apiKey=context-key"))
                        .bullet("Keep structured boundaries outside prompt text."))
                .build();
        String runtimeContext = prompt.getBlocks().get(0).getContent();

        assertEquals("system password=hunter2", prompt.getInstructions());
        assertEquals(2, prompt.getBlocks().size());
        assertTrue(runtimeContext.contains("## Runtime"));
        assertTrue(runtimeContext.contains("Use this as grounding data."));
        assertFalse(runtimeContext.contains("<runtime_context>"));
        assertFalse(runtimeContext.contains("Trusted"));
        assertTrue(runtimeContext.contains("### Time"));
        assertTrue(runtimeContext.contains("Current time: 1970-01-01T00:00:00Z"));
        assertFalse(runtimeContext.contains("Blank:"));
        String toolProtocol = prompt.getBlocks().get(1).getContent();
        assertTrue(toolProtocol.contains("## Tool Protocol"));
        assertTrue(toolProtocol.contains("Tool context: context apiKey=context-key"));
        assertTrue(toolProtocol.contains("- Keep structured boundaries outside prompt text."));
        assertFalse(runtimeContext.contains("should not be included"));
    }

    @Test
    void shouldNotExposeConditionalFrameMethods() {
        assertFalse(Arrays.stream(RuntimePromptDraft.class.getDeclaredMethods())
                .map(Method::getName)
                .anyMatch(name -> name.endsWith("When")));
    }
}
