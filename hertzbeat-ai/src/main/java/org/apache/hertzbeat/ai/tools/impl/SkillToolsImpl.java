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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.OutputType;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.apache.hertzbeat.ai.tools.SkillTools;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

/**
 * Implementation of SkillTools for AI-driven skill execution.
 * Provides a unified interface for AI to discover and execute diagnostic skills.
 */
@Slf4j
@Service
public class SkillToolsImpl implements SkillTools {

    /**
     * Marker prefix for report-type outputs that should be displayed directly to users.
     * When AI returns content with this prefix, frontend should render it directly
     * without waiting for AI to process it further.
     */
    public static final String SKILL_REPORT_MARKER = "[[SKILL_REPORT]]";

    private final SkillRegistry skillRegistry;
    private final SopEngine sopEngine;

    @Autowired
    public SkillToolsImpl(@Lazy SkillRegistry skillRegistry, @Lazy SopEngine sopEngine) {
        this.skillRegistry = skillRegistry;
        this.sopEngine = sopEngine;
    }

    @Override
    @Tool(name = "listSkills",
          description = "List all available diagnostic skills. Returns skill names, descriptions, "
                  + "and required parameters. Use this to discover what diagnostic capabilities are available "
                  + "before executing a skill with executeSkill.")
    public String listSkills() {
        List<SopDefinition> skills = skillRegistry.getAllSkills();
        
        if (skills.isEmpty()) {
            return "No diagnostic skills available.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Available Diagnostic Skills:\n\n");

        for (SopDefinition skill : skills) {
            sb.append("- **").append(skill.getName()).append("**\n");
            sb.append("  Description: ").append(skill.getDescription()).append("\n");
            sb.append("  Version: ").append(skill.getVersion()).append("\n");
            
            // List required parameters
            if (skill.getParameters() != null && !skill.getParameters().isEmpty()) {
                sb.append("  Parameters:\n");
                for (SopParameter param : skill.getParameters()) {
                    sb.append("    - ").append(param.getName());
                    if (param.isRequired()) {
                        sb.append(" (required)");
                    }
                    sb.append(": ").append(param.getDescription()).append("\n");
                }
            }
            sb.append("\n");
        }

        sb.append("Usage: Call executeSkill with skillName and params (JSON format).\n");
        sb.append("Example: executeSkill(\"mysql_slow_query_diagnosis\", \"{\\\"monitorId\\\": 123}\")");

        return sb.toString();
    }


    @Override
    @Tool(name = "executeSkill",
          description = "Execute a diagnostic skill. For skills requiring monitorId, first use queryMonitors "
                  + "to find the target monitor's ID. Report-type skills will return results directly to the user "
                  + "without further AI processing. Use listSkills to see available skills.")
    public String executeSkill(
            @ToolParam(description = "Name of the skill to execute (e.g., mysql_slow_query_diagnosis)", 
                       required = true) String skillName,
            @ToolParam(description = "JSON string with skill parameters (e.g., {\"monitorId\": 123})", 
                       required = false) String paramsJson) {

        log.info("Executing skill: {} with params: {}", skillName, paramsJson);

        // Get skill definition
        SopDefinition skill = skillRegistry.getSkill(skillName);
        if (skill == null) {
            String available = skillRegistry.getAllSkills().stream()
                    .map(SopDefinition::getName)
                    .collect(Collectors.joining(", "));
            return "Error: Skill '" + skillName + "' not found. Available skills: " + available;
        }

        // Parse parameters
        Map<String, Object> params = parseParams(paramsJson);

        // Validate required parameters
        if (skill.getParameters() != null) {
            for (SopParameter paramDef : skill.getParameters()) {
                if (paramDef.isRequired()) {
                    if (!params.containsKey(paramDef.getName()) || params.get(paramDef.getName()) == null) {
                        return "Error: Required parameter '" + paramDef.getName() + "' is missing. "
                                + "Description: " + paramDef.getDescription();
                    }
                }
            }
        }

        try {
            // Execute the skill
            SopResult result = sopEngine.executeSync(skill, params);

            // Check output type
            if (result.getOutputType() == OutputType.REPORT) {
                // Report type: return with marker for direct display to user
                log.info("Skill {} returned report-type output, marking for direct display", skillName);
                return SKILL_REPORT_MARKER + "\n" + result.getContent();
            }

            // For other types, return AI-friendly format for further processing
            return result.toAiResponse();

        } catch (Exception e) {
            log.error("Failed to execute skill {}: {}", skillName, e.getMessage(), e);
            return "Error executing skill '" + skillName + "': " + e.getMessage();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseParams(String paramsJson) {
        if (paramsJson == null || paramsJson.trim().isEmpty()) {
            return new HashMap<>();
        }

        try {
            return JsonUtil.fromJson(paramsJson, Map.class);
        } catch (Exception e) {
            log.warn("Failed to parse params JSON: {}, returning empty map", paramsJson);
            return new HashMap<>();
        }
    }
}
