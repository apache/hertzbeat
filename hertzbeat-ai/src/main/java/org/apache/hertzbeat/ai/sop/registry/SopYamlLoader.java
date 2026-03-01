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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Loader for AI SOP definitions from YAML files.
 */
@Slf4j
@Service
public class SopYamlLoader {

    private static final String SKILLS_PATH_PATTERN = "classpath:skills/*.yml";
    private final ObjectMapper yamlMapper;

    public SopYamlLoader() {
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
    }

    /**
     * Load all SOP definitions from the classpath.
     * @return List of loaded SopDefinition objects.
     */
    public List<SopDefinition> loadAllSkills() {
        List<SopDefinition> skills = new ArrayList<>();
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        
        try {
            Resource[] resources = resolver.getResources(SKILLS_PATH_PATTERN);
            log.info("Found {} SOP definition files", resources.length);
            
            for (Resource resource : resources) {
                try {
                    SopDefinition definition = yamlMapper.readValue(resource.getInputStream(), SopDefinition.class);
                    if (definition != null) {
                        skills.add(definition);
                        log.info("Loaded SOP skill: {}", definition.getName());
                    }
                } catch (Exception e) {
                    log.error("Failed to parse SOP definition from {}: {}", resource.getFilename(), e.getMessage());
                }
            }
        } catch (IOException e) {
            log.error("Failed to scan for SOP definition files: {}", e.getMessage());
        }
        
        return skills;
    }
}
