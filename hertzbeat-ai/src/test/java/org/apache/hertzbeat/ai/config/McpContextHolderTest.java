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

package org.apache.hertzbeat.ai.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

/**
 * Verifies the security context scope used when model tools execute across threads.
 */
class McpContextHolderTest {

    @AfterEach
    void clearContext() {
        McpContextHolder.clear();
        SurenessContextHolder.clear();
    }

    @Test
    void callWithSubjectShouldBindAndClearBothContexts() {
        SubjectSum subject = mock(SubjectSum.class);

        String result = McpContextHolder.callWithSubject(subject, () -> {
            assertSame(subject, McpContextHolder.getSubject());
            assertSame(subject, SurenessContextHolder.getBindSubject());
            return "result";
        });

        assertEquals("result", result);
        assertNull(McpContextHolder.getSubject());
        assertNull(SurenessContextHolder.getBindSubject());
    }

    @Test
    void callWithSubjectShouldRestoreIndependentPreviousContexts() {
        SubjectSum previousMcpSubject = mock(SubjectSum.class);
        SubjectSum previousSurenessSubject = mock(SubjectSum.class);
        SubjectSum currentSubject = mock(SubjectSum.class);
        McpContextHolder.setSubject(previousMcpSubject);
        SurenessContextHolder.bindSubject(previousSurenessSubject);

        McpContextHolder.callWithSubject(currentSubject, () -> {
            assertSame(currentSubject, McpContextHolder.getSubject());
            assertSame(currentSubject, SurenessContextHolder.getBindSubject());
            return null;
        });

        assertSame(previousMcpSubject, McpContextHolder.getSubject());
        assertSame(previousSurenessSubject, SurenessContextHolder.getBindSubject());
    }

    @Test
    void callWithSubjectShouldRestoreContextsAfterFailure() {
        SubjectSum previousSubject = mock(SubjectSum.class);
        SubjectSum currentSubject = mock(SubjectSum.class);
        McpContextHolder.setSubject(previousSubject);
        SurenessContextHolder.bindSubject(previousSubject);

        assertThrows(IllegalStateException.class, () ->
            McpContextHolder.callWithSubject(currentSubject, () -> {
                throw new IllegalStateException("tool failed");
            }));

        assertSame(previousSubject, McpContextHolder.getSubject());
        assertSame(previousSubject, SurenessContextHolder.getBindSubject());
    }

    @Test
    void toolContextShouldCarryOnlyValidSubject() {
        SubjectSum subject = mock(SubjectSum.class);
        ToolContext toolContext = new ToolContext(McpContextHolder.createToolContext(subject));

        assertSame(subject, McpContextHolder.getSubject(toolContext));
        assertNull(McpContextHolder.getSubject(null));
        assertNull(McpContextHolder.getSubject(new ToolContext(
                java.util.Map.of(McpContextHolder.SUBJECT_CONTEXT_KEY, "invalid"))));
        assertEquals(java.util.Map.of(), McpContextHolder.createToolContext(null));
    }

    @Test
    void callbackShouldExposeSubjectOnlyDuringDelegateCall() {
        SubjectSum subject = mock(SubjectSum.class);
        ToolContext toolContext = new ToolContext(McpContextHolder.createToolContext(subject));
        ToolCallback delegate = new ToolCallback() {
            @Override
            public ToolDefinition getToolDefinition() {
                return ToolDefinition.builder()
                        .name("test")
                        .description("test")
                        .inputSchema("{}")
                        .build();
            }

            @Override
            public String call(String input) {
                return input;
            }

            @Override
            public String call(String input, ToolContext context) {
                if (context == null) {
                    return input;
                }
                assertSame(subject, McpContextHolder.getSubject());
                assertSame(subject, SurenessContextHolder.getBindSubject());
                return "ok";
            }
        };
        SecurityContextToolCallback callback = new SecurityContextToolCallback(delegate);

        assertEquals("test", callback.getToolDefinition().name());
        assertEquals(delegate.getToolMetadata().returnDirect(), callback.getToolMetadata().returnDirect());
        assertEquals("plain", callback.call("plain"));
        String result = callback.call("{}", toolContext);

        assertEquals("ok", result);
        assertNull(McpContextHolder.getSubject());
        assertNull(SurenessContextHolder.getBindSubject());
    }
}
