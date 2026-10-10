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

package org.apache.hertzbeat.ai.sop.executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.ai.sop.model.SopStep;
import org.apache.hertzbeat.ai.sop.registry.ToolRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ToolExecutorTest {

    @Mock
    private ToolRegistry toolRegistry;

    @Test
    void shouldPreservePlaceholderTypesAndResolveMissingOptionalValues() {
        ToolExecutor executor = new ToolExecutor(toolRegistry);
        SopStep step = SopStep.builder()
                .id("typed_tool")
                .type("tool")
                .tool("typed_tool")
                .args(Map.of(
                        "host", "${host}",
                        "port", "${port}",
                        "timeoutMs", "${timeoutMs}",
                        "command", "echo ${service}"
                ))
                .build();
        Map<String, Object> context = new HashMap<>();
        context.put("host", "127.0.0.1");
        context.put("port", 22);
        context.put("service", "demo");
        when(toolRegistry.invoke(eq("typed_tool"), anyMap())).thenReturn("{}");

        executor.execute(step, context);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> argsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(toolRegistry).invoke(eq("typed_tool"), argsCaptor.capture());
        Map<String, Object> resolvedArgs = argsCaptor.getValue();
        assertThat(resolvedArgs.get("host")).isEqualTo("127.0.0.1");
        assertThat(resolvedArgs.get("port")).isEqualTo(22);
        assertThat(resolvedArgs.get("timeoutMs")).isNull();
        assertThat(resolvedArgs.get("command")).isEqualTo("echo demo");
    }
}
