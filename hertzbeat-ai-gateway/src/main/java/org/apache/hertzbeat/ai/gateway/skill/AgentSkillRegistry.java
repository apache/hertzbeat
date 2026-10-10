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

package org.apache.hertzbeat.ai.gateway.skill;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.Data;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

/**
 * Loads Agent Skills from classpath {@code SKILL.md} resources.
 */
@Service
public class AgentSkillRegistry {

    private static final String SKILL_PATTERN = "classpath*:agent-skills/*/SKILL.md";
    // Classpath resources preserve checkout line endings, so frontmatter accepts both LF and CRLF.
    private static final Pattern FRONTMATTER_PATTERN =
            Pattern.compile("\\A---\\R(.*?)\\R---(?:\\R|\\z)", Pattern.DOTALL);

    private final Map<String, AgentSkillDefinition> definitions = new LinkedHashMap<>();

    @PostConstruct
    void load() throws IOException {
        ObjectMapper mapper = new ObjectMapper(new YAMLFactory());
        Resource[] resources = new PathMatchingResourcePatternResolver().getResources(SKILL_PATTERN);
        for (Resource resource : resources) {
            String document = resource.getContentAsString(StandardCharsets.UTF_8);
            Matcher frontmatter = FRONTMATTER_PATTERN.matcher(document);
            if (!frontmatter.find()) {
                throw new IllegalStateException("Agent Skill frontmatter is required: " + resource.getDescription());
            }
            SkillMetadata metadata = mapper.readValue(frontmatter.group(1), SkillMetadata.class);
            String instructions = document.substring(frontmatter.end()).stripLeading();
            AgentSkillDefinition definition = new AgentSkillDefinition(
                    metadata.getName(), metadata.getDescription(), instructions);
            AgentSkillDefinition previous = definitions.putIfAbsent(definition.name(), definition);
            if (previous != null) {
                throw new IllegalStateException("Duplicate Agent Skill: " + definition.name());
            }
        }
    }

    public List<AgentSkillDefinition> definitions() {
        return List.copyOf(definitions.values());
    }

    public AgentSkillDefinition get(String name) {
        AgentSkillDefinition definition = definitions.get(name);
        if (definition == null) {
            throw new IllegalArgumentException("Unknown Gateway skill: " + name);
        }
        return definition;
    }

    /** Required Agent Skills frontmatter. */
    @Data
    private static class SkillMetadata {
        private String name;
        private String description;
    }
}
