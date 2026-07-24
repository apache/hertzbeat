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

package org.apache.hertzbeat.ai.gateway.tool.skill;

import org.apache.hertzbeat.ai.gateway.skill.AgentSkillRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/**
 * Progressive-disclosure Agent Skill tools.
 */
@Service
public class AgentSkillToolService {

    private final AgentSkillRegistry registry;

    public AgentSkillToolService(AgentSkillRegistry registry) {
        this.registry = registry;
    }

    @Tool(name = "skill.load", description = "Load the complete instructions for one HertzBeat Agent Skill.")
    @AgentToolPolicy
    public String loadSkill(@ToolParam(description = "Agent Skill name advertised in the runtime prompt.")
                            String skillName) {
        return registry.get(skillName).instructions();
    }
}
