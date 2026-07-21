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

package org.apache.hertzbeat.ai.sop.registry;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.lang.reflect.Method;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

/**
 * Verifies parameter validation and type conversion for registered tool methods.
 */
class ToolRegistryTest {

    @Test
    void invokeShouldRejectMissingRequiredParameter() throws NoSuchMethodException {
        ToolRegistry.ToolMethod toolMethod = toolMethod();

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> toolMethod.invoke(Map.of()));

        assertEquals("Required tool parameter is missing: monitorId", error.getMessage());
    }

    @Test
    void invokeShouldConvertNumericParameter() throws NoSuchMethodException {
        ToolRegistry.ToolMethod toolMethod = toolMethod();

        assertEquals("42", toolMethod.invoke(Map.of("monitorId", "42")));
    }

    private ToolRegistry.ToolMethod toolMethod() throws NoSuchMethodException {
        Method method = ToolFixture.class.getMethod("query", Long.class);
        return new ToolRegistry.ToolMethod(new ToolFixture(), method, method.getAnnotation(Tool.class));
    }

    private static final class ToolFixture {

        @Tool(name = "query", description = "测试工具")
        public String query(@ToolParam(description = "监控 ID", required = true) Long monitorId) {
            return String.valueOf(monitorId);
        }
    }
}
