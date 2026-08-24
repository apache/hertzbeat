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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.ai.tool.execution.ToolExecutionException;
import org.springframework.context.support.GenericApplicationContext;

/**
 * Verifies tool discovery, argument validation, and type conversion by Spring AI callbacks.
 */
class ToolRegistryTest {

    @Test
    void invokeShouldConvertStructuredArguments() {
        try (GenericApplicationContext context = contextWith(ToolFixture.class)) {
            ToolRegistry registry = new ToolRegistry(context);

            String result = registry.invoke("inspect", Map.of(
                    "monitorId", 42,
                    "ids", List.of(1, 2),
                    "enabled", true));

            assertEquals("Long|Long|Boolean", result);
            assertTrue(registry.hasMethod("inspect"));
            assertEquals(Set.of("inspect", "optional"), registry.getToolNames());
        }
    }

    @Test
    void invokeShouldRejectMissingRequiredParameter() {
        try (GenericApplicationContext context = contextWith(ToolFixture.class)) {
            ToolRegistry registry = new ToolRegistry(context);

            IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                    () -> registry.invoke("inspect", Map.of("ids", List.of(1), "enabled", true)));

            assertEquals("Required tool parameter is missing: monitorId", error.getMessage());
        }
    }

    @Test
    void invokeShouldRejectInvalidBooleanInsteadOfSilentlyUsingFalse() {
        try (GenericApplicationContext context = contextWith(ToolFixture.class)) {
            ToolRegistry registry = new ToolRegistry(context);

            assertThrows(ToolExecutionException.class, () -> registry.invoke("inspect", Map.of(
                    "monitorId", 42,
                    "ids", List.of(1),
                    "enabled", "not-a-boolean")));
        }
    }

    @Test
    void initializationShouldRejectDuplicateToolNames() {
        try (GenericApplicationContext context = contextWith(ToolFixture.class, DuplicateToolFixture.class)) {
            ToolRegistry registry = new ToolRegistry(context);

            IllegalArgumentException error = assertThrows(
                    IllegalArgumentException.class, registry::getToolNames);

            assertTrue(error.getMessage().contains("inspect"));
        }
    }

    @Test
    void emptyRegistryShouldReportUnknownTool() {
        try (GenericApplicationContext context = contextWith()) {
            ToolRegistry registry = new ToolRegistry(context);

            assertTrue(registry.getToolNames().isEmpty());
            assertThrows(IllegalArgumentException.class, () -> registry.invoke("missing", null));
        }
    }

    private GenericApplicationContext contextWith(Class<?>... beanTypes) {
        GenericApplicationContext context = new GenericApplicationContext();
        for (Class<?> beanType : beanTypes) {
            context.registerBean(beanType);
        }
        context.refresh();
        return context;
    }

    public static final class ToolFixture {

        @Tool(name = "inspect", description = "Inspect argument types")
        public String inspect(
                @ToolParam(description = "Monitor ID", required = true) Long monitorId,
                @ToolParam(description = "Monitor ID list", required = false) List<Long> ids,
                @ToolParam(description = "Whether enabled", required = true) Boolean enabled) {
            return "%s|%s|%s".formatted(
                    monitorId.getClass().getSimpleName(),
                    ids.getFirst().getClass().getSimpleName(),
                    enabled.getClass().getSimpleName());
        }

        @Tool(name = "optional", description = "Tool without arguments")
        public String optional() {
            return "optional";
        }
    }

    public static final class DuplicateToolFixture {

        @Tool(name = "inspect", description = "Duplicate-name test tool")
        public String inspect() {
            return "duplicate";
        }
    }

}
