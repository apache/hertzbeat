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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.junit.jupiter.api.Test;

class AgentEntityDefinitionToolServiceTest {
    private final ObserveEntityService entities = mock(ObserveEntityService.class);
    private final AgentEntityDefinitionToolService service = new AgentEntityDefinitionToolService(entities);

    @Test
    void rejectsUnsupportedFormatAndOversizedDefinitionsBeforeParsing() {
        assertThrows(IllegalArgumentException.class, () -> service.preview("curl https://example.test", "curl", null));
        assertThrows(IllegalArgumentException.class, () -> service.preview("a".repeat(131073), "yaml", null));
        verifyNoInteractions(entities);
    }

    @Test
    void validatesPreviewAndAppliesTheExactPayload() {
        EntityDto dto = new EntityDto();
        dto.setEntityInfo(new EntityInfo());
        dto.getEntityInfo().setName("checkout");
        when(entities.parseEntityDefinitionBundle(any())).thenReturn(List.of(dto));
        when(entities.addEntitiesByDefinitionBundle(any())).thenReturn(List.of(17L));
        Map<String, Object> preview = service.preview("metadata: {name: checkout}", "yaml", null);
        verify(entities).validate(dto, false);
        assertEquals(1, preview.get("count"));
        assertEquals(List.of(17L), service.apply("metadata: {name: checkout}", "yaml", null,
                (String) preview.get("payloadSha256")).get("entityIds"));
    }

    @Test
    void refusesTamperedDefinitionBeforeServiceInvocation() {
        assertThrows(IllegalArgumentException.class, () -> service.apply("metadata: {name: changed}", "yaml", null, "bad-hash"));
        verifyNoInteractions(entities);
    }

    @Test
    void applyRejectsSecretBearingDefinitionsEvenWithMatchingHash() {
        EntityDto dto = new EntityDto();
        dto.setEntityInfo(new EntityInfo());
        dto.getEntityInfo().setLabels(Map.of("password", "sensitive-label-value"));
        when(entities.parseEntityDefinitionBundle(any())).thenReturn(List.of(dto));
        Map<String, Object> preview = service.preview("metadata: {name: checkout}", "yaml", null);
        assertThrows(IllegalArgumentException.class, () -> service.apply("metadata: {name: checkout}", "yaml", null,
                (String) preview.get("payloadSha256")));
        org.mockito.Mockito.verify(entities, org.mockito.Mockito.never()).addEntitiesByDefinitionBundle(any());
    }

    @Test
    void previewRedactsCredentialLabels() {
        EntityDto dto = new EntityDto();
        dto.setEntityInfo(new EntityInfo());
        dto.getEntityInfo().setLabels(Map.of("password", "sensitive-label-value"));
        when(entities.parseEntityDefinitionBundle(any())).thenReturn(List.of(dto));
        String preview = service.preview("metadata: {name: checkout}", "yaml", null).toString();
        org.junit.jupiter.api.Assertions.assertFalse(preview.contains("sensitive-label-value"));
    }
}
