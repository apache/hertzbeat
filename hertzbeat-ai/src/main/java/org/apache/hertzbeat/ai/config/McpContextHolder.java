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

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.core.NamedThreadLocal;

/**
 * Context holder for AI agent security context.
 */
public final class McpContextHolder {

    static final String SUBJECT_CONTEXT_KEY = McpContextHolder.class.getName() + ".subject";

    private static final ThreadLocal<SubjectSum> subjectHolder =
            new NamedThreadLocal<>("MCP Security and User Identification Context");

    private McpContextHolder() {}

    /**
     * Attaches the user's context to the current thread.
     */
    public static void setSubject(SubjectSum subject) {

        subjectHolder.set(subject);
    }

    /**
     * Retrieves the context from the current thread.
     */
    public static SubjectSum getSubject() {
        return subjectHolder.get();
    }

    /**
     * Creates a security context that is propagated only through the Spring AI tool invocation chain.
     *
     * @param subject current authenticated subject, may be {@code null}
     * @return tool context without null values
     */
    public static Map<String, Object> createToolContext(SubjectSum subject) {
        return subject == null ? Map.of() : Map.of(SUBJECT_CONTEXT_KEY, subject);
    }

    /**
     * Retrieves and validates the authenticated subject from the Spring AI tool context.
     *
     * @param toolContext Spring AI tool context
     * @return authenticated subject, or {@code null} when absent
     */
    public static SubjectSum getSubject(ToolContext toolContext) {
        if (toolContext == null) {
            return null;
        }
        Object subject = toolContext.getContext().get(SUBJECT_CONTEXT_KEY);
        return subject instanceof SubjectSum subjectSum ? subjectSum : null;
    }

    /**
     * Executes a synchronous tool invocation within the given subject scope and restores the original thread
     * contexts afterward.
     *
     * <p>Spring AI tool callbacks may run on pooled threads, so they cannot rely on a {@link ThreadLocal} left on
     * the Servlet request thread. This method binds both MCP and Sureness contexts so the tool and downstream
     * services observe the same user identity.</p>
     *
     * @param subject current request subject, may be {@code null}
     * @param operation synchronous tool invocation
     * @param <T> tool result type
     * @return tool invocation result
     */
    public static <T> T callWithSubject(SubjectSum subject, Supplier<T> operation) {
        SubjectSum previousMcpSubject = getSubject();
        SubjectSum previousSurenessSubject = SurenessContextHolder.getBindSubject();
        replaceSubjects(subject);
        try {
            return operation.get();
        } finally {
            replaceSubjects(previousMcpSubject, previousSurenessSubject);
        }
    }

    /**
     * Clears the context from the thread to prevent memory leaks.
     */
    public static void clear() {
        subjectHolder.remove();
    }

    private static void replaceSubjects(SubjectSum subject) {
        replaceSubjects(subject, subject);
    }

    private static void replaceSubjects(SubjectSum mcpSubject, SubjectSum surenessSubject) {
        clear();
        SurenessContextHolder.unbindSubject();
        if (mcpSubject != null) {
            setSubject(mcpSubject);
        }
        if (surenessSubject != null) {
            SurenessContextHolder.bindSubject(surenessSubject);
        }
    }
}
