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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.OutputType;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Verifies that skill parameter errors and report execution failures return accurate, identifiable results.
 */
@ExtendWith(MockitoExtension.class)
class SkillToolsImplTest {

    private static final String SKILL_NAME = "diagnose";

    @Mock
    private SkillRegistry skillRegistry;

    @Mock
    private SopEngine sopEngine;

    private SkillToolsImpl skillTools;

    @BeforeEach
    void setUp() {
        skillTools = new SkillToolsImpl(skillRegistry, sopEngine);
    }

    @Test
    void executeSkillShouldRejectInvalidJsonObject() {
        when(skillRegistry.getSkill(SKILL_NAME)).thenReturn(skill());

        String response = skillTools.executeSkill(SKILL_NAME, "not-json");

        assertEquals("Error: Skill parameters must be a valid JSON object.", response);
        verifyNoInteractions(sopEngine);
    }

    @Test
    void executeSkillShouldRejectBlankRequiredParameter() {
        when(skillRegistry.getSkill(SKILL_NAME)).thenReturn(skill());

        String response = skillTools.executeSkill(SKILL_NAME, "{\"monitorId\":\"  \"}");

        assertTrue(response.contains("Required parameter 'monitorId' is missing"));
        verifyNoInteractions(sopEngine);
    }

    @Test
    void executeSkillShouldNotMarkFailedReportForDirectDisplay() {
        SopDefinition skill = skill();
        SopResult failedResult = SopResult.builder()
                .sopName(SKILL_NAME)
                .status("FAILED")
                .outputType(OutputType.REPORT)
                .error("database unavailable")
                .build();
        when(skillRegistry.getSkill(SKILL_NAME)).thenReturn(skill);
        when(sopEngine.executeSync(skill, java.util.Map.of("monitorId", 1))).thenReturn(failedResult);

        String response = skillTools.executeSkill(SKILL_NAME, "{\"monitorId\":1}");

        assertFalse(response.startsWith(SkillToolsImpl.SKILL_REPORT_MARKER));
        assertTrue(response.contains("database unavailable"));
    }

    @Test
    void executeSkillShouldMarkSuccessfulReportForDirectDisplay() {
        SopDefinition skill = skill();
        SopResult successResult = SopResult.builder()
                .status("SUCCESS")
                .outputType(OutputType.REPORT)
                .content("diagnostic report")
                .build();
        when(skillRegistry.getSkill(SKILL_NAME)).thenReturn(skill);
        when(sopEngine.executeSync(skill, java.util.Map.of("monitorId", 1))).thenReturn(successResult);

        String response = skillTools.executeSkill(SKILL_NAME, "{\"monitorId\":1}");

        assertEquals(SkillToolsImpl.SKILL_REPORT_MARKER + "\ndiagnostic report", response);
    }

    private SopDefinition skill() {
        return SopDefinition.builder()
                .name(SKILL_NAME)
                .parameters(List.of(SopParameter.builder()
                        .name("monitorId")
                        .required(true)
                        .description("Monitor ID")
                        .build()))
                .build();
    }
}
