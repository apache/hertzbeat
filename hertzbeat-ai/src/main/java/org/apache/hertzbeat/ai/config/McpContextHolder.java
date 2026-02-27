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
import org.springframework.core.NamedInheritableThreadLocal;

/**
 * Context holder for AI agent security context.
 */
public final class McpContextHolder {
    private static final ThreadLocal<SubjectSum> subjectHolder =
            new NamedInheritableThreadLocal<>("MCP Security and User Identification Context");

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
     * Clears the context from the thread to prevent memory leaks.
     */
    public static void clear() {
        subjectHolder.remove();
    }
}
