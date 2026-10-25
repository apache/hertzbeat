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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.apache.hertzbeat.ai.sop.model.SopStep;
import org.apache.hertzbeat.ai.sop.registry.ToolRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.context.support.GenericApplicationContext;

class ToolExecutorArgumentTypesTest {

    static Stream<Object> typedValues() {
        return Stream.of(List.of(1, 2), Map.of("limit", 2), 7, true);
    }

    @ParameterizedTest
    @MethodSource("typedValues")
    void completePlaceholderPreservesExistingValueTypeAndIdentity(Object value) {
        Map<String, Object> context = Map.of("value", value);
        Map<String, Object> args = Map.of("argument", "${value}");
        Map<String, Object> resolved = invoke(args, context);
        assertSame(value, resolved.get("argument"));
        assertEquals("${value}", args.get("argument"));
        assertSame(value, context.get("value"));
    }

    @Test
    void embeddedPlaceholderKeepsStringReplacement() {
        assertEquals("ids=[1, 2]", invoke(Map.of("argument", "ids=${ids}"), Map.of("ids", List.of(1, 2))).get("argument"));
    }

    @Test
    void ordinaryAdjacentPlaceholdersRemainString() {
        assertEquals("AB", invoke(Map.of("argument", "${a}${b}"), Map.of("a", "A", "b", "B")).get("argument"));
    }

    @Test
    void ordinarySeparatedPlaceholdersRemainString() {
        assertEquals("A-B", invoke(Map.of("argument", "${a}-${b}"), Map.of("a", "A", "b", "B")).get("argument"));
    }

    @Test
    void adjacentPlaceholdersKeepStringReplacementBeforeCompositeContextKey() {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("a", "A");
        context.put("b", "B");
        context.put("a}${b", List.of("combined"));
        assertEquals("AB", invoke(Map.of("argument", "${a}${b}"), context).get("argument"));
    }

    @Test
    void separatedPlaceholdersKeepStringReplacementBeforeCompositeContextKey() {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("a", "A");
        context.put("b", "B");
        context.put("a}-${b", List.of("combined"));
        assertEquals("A-B", invoke(Map.of("argument", "${a}-${b}"), context).get("argument"));
    }

    @Test
    void adjacentCompositeKeyFirstKeepsExistingStringResult() {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("a}${b", List.of("combined"));
        context.put("a", "A");
        context.put("b", "B");
        assertEquals("[combined]", invoke(Map.of("argument", "${a}${b}"), context).get("argument"));
    }

    @Test
    void separatedCompositeKeyFirstKeepsExistingStringResult() {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("a}-${b", List.of("combined"));
        context.put("a", "A");
        context.put("b", "B");
        assertEquals("[combined]", invoke(Map.of("argument", "${a}-${b}"), context).get("argument"));
    }

    @Test
    void missingVariableRemainsLiteral() {
        assertEquals("${missing}", invoke(Map.of("argument", "${missing}"), Map.of()).get("argument"));
    }

    @Test
    void nullVariableKeepsExistingStringNullContract() {
        Map<String, Object> context = new HashMap<>();
        context.put("value", null);
        assertEquals("null", invoke(Map.of("argument", "${value}"), context).get("argument"));
    }

    @Test
    void stringValuesKeepExistingOrderedSubstitution() {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("alias", "${label}");
        context.put("label", "fixture");
        assertEquals("fixture", invoke(Map.of("argument", "${alias}"), context).get("argument"));
    }

    @Test
    void existingNonStringArgumentIsUntouched() {
        List<Integer> ids = List.of(1, 2);
        assertSame(ids, invoke(Map.of("argument", ids), Map.of()).get("argument"));
    }

    @Test
    void absentArgumentMapStaysEmpty() {
        assertEquals(Map.of(), invoke(null, Map.of()));
    }

    @Test
    void structuredValuesReachRealRegisteredToolThroughJsonConversion() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(FixtureTools.class);
            context.refresh();
            ToolExecutor executor = new ToolExecutor(new ToolRegistry(context));
            SopStep step = new SopStep();
            step.setTool("fixtureInspect");
            step.setArgs(Map.of("ids", "${ids}", "options", "${options}"));
            assertEquals("Long:2", executor.execute(step, Map.of("ids", List.of(1, 2), "options", Map.of("limit", 2))));
        }
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private Map<String, Object> invoke(Map<String, Object> args, Map<String, Object> context) {
        ToolRegistry registry = mock(ToolRegistry.class);
        when(registry.invoke(eq("fixture"), anyMap())).thenReturn("fixture-result");
        SopStep step = new SopStep();
        step.setTool("fixture");
        step.setArgs(args);
        assertEquals("fixture-result", new ToolExecutor(registry).execute(step, context));
        ArgumentCaptor<Map> captured = ArgumentCaptor.forClass(Map.class);
        verify(registry).invoke(eq("fixture"), captured.capture());
        return captured.getValue();
    }

    public static final class FixtureTools {
        @Tool(name = "fixtureInspect", description = "Inspect local fixture argument types")
        public String inspect(@ToolParam(description = "IDs") List<Long> ids,
                              @ToolParam(description = "Options") Map<String, Object> options) {
            return ids.get(0).getClass().getSimpleName() + ":" + options.get("limit");
        }
    }
}
