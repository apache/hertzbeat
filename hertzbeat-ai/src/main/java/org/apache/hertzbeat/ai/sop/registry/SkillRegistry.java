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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry for AI SOP skills.
 * Manages the lifecycle of SOPs and exposes them as Spring AI tools.
 */
@Slf4j
@Service
@Configuration
public class SkillRegistry implements ToolCallbackProvider {

    private final SopYamlLoader yamlLoader;
    private final SopEngine sopEngine;
    private final Map<String, SopDefinition> skillMap = new ConcurrentHashMap<>();

    @Autowired
    public SkillRegistry(SopYamlLoader yamlLoader, SopEngine sopEngine) {
        this.yamlLoader = yamlLoader;
        this.sopEngine = sopEngine;
    }

    @PostConstruct
    public void init() {
        refreshSkills();
    }

    /**
     * Reload all skills from YAML files.
     */
    public void refreshSkills() {
        List<SopDefinition> loadedSkills = yamlLoader.loadAllSkills();
        skillMap.clear();
        for (SopDefinition skill : loadedSkills) {
            skillMap.put(skill.getName(), skill);
        }
        log.info("SkillRegistry initialized with {} skills", skillMap.size());
    }

    /**
     * Get a specific SOP definition by name.
     * @param name Skill name.
     * @return SopDefinition or null if not found.
     */
    public SopDefinition getSkill(String name) {
        return skillMap.get(name);
    }

    /**
     * Get all registered SOP definitions.
     * @return Collection of all SopDefinitions.
     */
    public List<SopDefinition> getAllSkills() {
        return new ArrayList<>(skillMap.values());
    }

    /**
     * Provides the SOP skills as ToolCallbacks for Spring AI.
     * @return Array of ToolCallbacks.
     */
    @Override
    public ToolCallback[] getToolCallbacks() {
        List<ToolCallback> callbacks = new ArrayList<>();
        
        for (SopDefinition skill : skillMap.values()) {
            log.debug("Registering SOP as tool: {}", skill.getName());
            callbacks.add(new SopToolCallback(skill, sopEngine));
        }
        
        return callbacks.toArray(new ToolCallback[0]);
    }
}
