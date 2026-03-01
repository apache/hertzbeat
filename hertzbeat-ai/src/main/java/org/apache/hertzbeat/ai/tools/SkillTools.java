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

package org.apache.hertzbeat.ai.tools;

/**
 * Interface for AI Skill execution tools.
 * Provides methods to list available skills and execute them.
 */
public interface SkillTools {

    /**
     * List all available diagnostic skills.
     * @return JSON string containing skill metadata (name, description, parameters)
     */
    String listSkills();

    /**
     * Execute a diagnostic skill.
     * @param skillName Name of the skill to execute
     * @param paramsJson JSON string containing skill parameters (e.g., {"monitorId": 123})
     * @return Skill execution result. For report-type skills, returns "[[SKILL_REPORT]]\n{content}"
     */
    String executeSkill(String skillName, String paramsJson);
}
