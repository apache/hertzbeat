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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/** Test bounded entity read tools. */
class AgentEntityToolServiceTest {

    private ObserveEntityService observeEntityService;
    private AgentEntityToolService service;

    @BeforeEach
    void setUp() {
        observeEntityService = mock(ObserveEntityService.class);
        service = new AgentEntityToolService(observeEntityService);
    }

    @Test
    void shouldProjectWorkspaceEntityWithoutPrivateExtensionPayloads() {
        EntityInfo info = new EntityInfo();
        info.setId(41L);
        info.setType("service");
        info.setName("checkout");
        info.setDescription("healthy password=private-value");
        info.setExtensions(tools.jackson.databind.json.JsonMapper.builder().build()
                .valueToTree(Map.of("apiKey", "extension-secret")));
        EntityDto entity = new EntityDto();
        entity.setEntityInfo(info);
        EntityDetailDto detail = new EntityDetailDto();
        detail.setEntity(entity);
        when(observeEntityService.getEntityDetail(41L)).thenReturn(detail);

        Map<String, Object> result = service.getEntity(41L);

        Map<?, ?> projected = (Map<?, ?>) result.get("entity");
        assertEquals("checkout", projected.get("name"));
        assertFalse(result.toString().contains("private-value"));
        assertFalse(result.toString().contains("extension-secret"));
        assertFalse(projected.containsKey("extensions"));
    }

    @Test
    void shouldBoundEntityQueryAndPreserveRealPageEvidence() {
        EntitySummaryInfo summary = new EntitySummaryInfo();
        when(observeEntityService.getEntities(null, "service", null, null, null, null,
                "prod", null, null, null, "gmtUpdate", "desc", 3, 50))
                .thenReturn(new PageImpl<>(List.of(summary), PageRequest.of(3, 50), 151));

        Map<String, Object> result = service.queryEntities(null, "service", null, null, null,
                null, "prod", null, null, null, null, null, 3, 500);

        assertEquals(151L, result.get("totalElements"));
        assertEquals(50, result.get("pageSize"));
        verify(observeEntityService).getEntities(null, "service", null, null, null, null,
                "prod", null, null, null, "gmtUpdate", "desc", 3, 50);
    }

    @Test
    void shouldRejectInvalidEntityIdentity() {
        assertThrows(IllegalArgumentException.class, () -> service.getEntity(0L));
    }
}
