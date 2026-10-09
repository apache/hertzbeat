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

package org.apache.hertzbeat.ai.tools.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;

/**
 * Keeps the static system guidance aligned with the tools exposed to the model.
 */
class AiToolGuidanceContractTest {

    private static final Set<String> GUIDED_TOOLS = Set.of(
            "add_monitor",
            "bind_monitors_to_alert_rule",
            "create_alert_rule",
            "createScheduleWithConversation",
            "deleteSchedule",
            "executeSkill",
            "get_alerts_summary",
            "get_apps_metrics_hierarchy",
            "get_historical_metrics",
            "get_monitor_params",
            "list_monitor_types",
            "listSchedulesWithConversation",
            "listSkills",
            "query_alerts",
            "query_monitors",
            "query_realtime_metrics",
            "toggleSchedule");

    private static final Set<String> RETIRED_TOOL_NAMES = Set.of(
            "createScheduleForConversation",
            "get_monitor_additional_params",
            "get_realtime_metrics",
            "listSchedulesForConversation",
            "queryMonitors");

    @Test
    void systemGuidanceShouldReferenceOnlyCurrentToolNames() throws Exception {
        String guidance = readResource("/prompt/system-message.st");
        List<Tool> toolAnnotations = registeredToolAnnotations();
        Set<String> registeredTools = toolAnnotations.stream()
                .map(Tool::name)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());

        for (String toolName : GUIDED_TOOLS) {
            assertTrue(registeredTools.contains(toolName), () -> "Tool is not registered: " + toolName);
            assertTrue(guidance.contains("`" + toolName + "`"),
                    () -> "System guidance does not reference registered tool: " + toolName);
        }
        for (String toolName : RETIRED_TOOL_NAMES) {
            assertFalse(guidance.contains(toolName),
                    () -> "System guidance still references retired tool: " + toolName);
            assertTrue(toolAnnotations.stream()
                            .noneMatch(annotation -> annotation.description().contains(toolName)),
                    () -> "A tool description still references retired tool: " + toolName);
        }
    }

    @Test
    void skillExamplesShouldUseCurrentMonitorQueryTool() throws Exception {
        String examples = readResource("/skills/README.md") + readResource("/skills/README_ZH.md");

        assertTrue(examples.contains("tool: query_monitors"));
        assertFalse(examples.contains("tool: queryMonitors"));
    }

    @Test
    void compatibilityScheduleMethodsShouldNotBeExposedAsTools() throws Exception {
        Method createSchedule = ScheduleToolsImpl.class.getDeclaredMethod(
                "createSchedule", String.class, String.class, String.class);
        Method listSchedules = ScheduleToolsImpl.class.getDeclaredMethod("listSchedules");

        assertNull(createSchedule.getAnnotation(Tool.class));
        assertNull(listSchedules.getAnnotation(Tool.class));
    }

    private String readResource(String path) throws Exception {
        try (InputStream stream = getClass().getResourceAsStream(path)) {
            assertTrue(stream != null, () -> "Resource must exist: " + path);
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private List<Tool> registeredToolAnnotations() {
        return Stream.of(
                        AlertDefineToolsImpl.class,
                        AlertToolsImpl.class,
                        MetricsToolsImpl.class,
                        MonitorToolsImpl.class,
                        ScheduleToolsImpl.class,
                        SkillToolsImpl.class)
                .flatMap(toolClass -> Arrays.stream(toolClass.getDeclaredMethods()))
                .map(method -> method.getAnnotation(Tool.class))
                .filter(annotation -> annotation != null)
                .toList();
    }
}
