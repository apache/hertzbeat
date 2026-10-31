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

package org.apache.hertzbeat.ai.gateway.tool.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceResumeInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionWorkspaceTemplateInfo;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.junit.jupiter.api.Test;

class AgentEntityGovernanceToolServiceTest {
    private final ObserveEntityService entities = mock(ObserveEntityService.class);
    private final AgentEntityGovernanceToolService service = new AgentEntityGovernanceToolService(
            entities, mock(AgentEntityDefinitionToolService.class));

    @Test
    void templateReadOmitsNestedJsonCredentialsAndRetainsMetadata() {
        EntityDefinitionWorkspaceTemplateInfo template = new EntityDefinitionWorkspaceTemplateInfo();
        template.setId("template-1");
        template.setName("Checkout");
        template.setContent("{\"integrations\":{\"oauth\":{\"clientSecret\":\"sensitive-client-value\","
                + "\"privateKey\":\"sensitive-private-value\"}}}");
        when(entities.getDefinitionWorkspaceTemplates(null, 10)).thenReturn(List.of(template));

        Map<String, Object> result = service.templates(null, null);
        Map<?, ?> item = (Map<?, ?>) ((List<?>) result.get("data")).getFirst();
        assertEquals("Checkout", item.get("name"));
        assertEquals(true, item.get("contentOmitted"));
        assertFalse(item.containsKey("content"));
        assertFalse(JsonUtil.toJson(result).contains("sensitive-client-value"));
        assertFalse(JsonUtil.toJson(result).contains("sensitive-private-value"));
    }

    @Test
    void resumeReadOmitsMalformedContentWithoutFallingBackToRawText() {
        EntityDefinitionWorkspaceResumeInfo resume = new EntityDefinitionWorkspaceResumeInfo();
        resume.setToken("resume-1");
        resume.setContent("{\"clientSecret\":\"malformed-sensitive-value\"");
        when(entities.getDefinitionWorkspaceResume("resume-1")).thenReturn(resume);

        Map<String, Object> result = service.resume("resume-1");
        Map<?, ?> item = (Map<?, ?>) result.get("data");
        assertEquals(true, item.get("contentOmitted"));
        assertFalse(item.containsKey("content"));
        assertFalse(JsonUtil.toJson(result).contains("malformed-sensitive-value"));
    }
}
