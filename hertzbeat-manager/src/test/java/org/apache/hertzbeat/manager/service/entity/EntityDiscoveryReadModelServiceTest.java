/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryReadModel;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class EntityDiscoveryReadModelServiceTest {

    @Mock
    private MonitorService monitorService;

    @Mock
    private ObserveEntityService observeEntityService;

    private EntityDiscoveryReadModelService service;

    @BeforeEach
    void setUp() {
        service = new EntityDiscoveryReadModelService(monitorService, observeEntityService);
    }

    @Test
    void buildsSafePagedDiscoveryRowsWithBoundDirectAndSuggestedCandidates() {
        Monitor monitor = Monitor.builder()
                .id(41L)
                .name("checkout")
                .app("springboot3")
                .instance("checkout.internal:8080")
                .status((byte) 1)
                .labels(Map.of("service.name", "secret-label-value"))
                .annotations(Map.of("authorization", "Bearer caller-token"))
                .description("telemetry body must not escape")
                .build();
        Page<Monitor> page = new PageImpl<>(List.of(monitor), PageRequest.of(2, 10), 21);
        when(monitorService.getMonitors(null, null, "checkout", null, "id", "desc", 2, 10, null))
                .thenReturn(page);

        List<EntityMonitorBindingCandidate> candidates = new ArrayList<>();
        Map<String, List<String>> directMatches = new LinkedHashMap<>();
        directMatches.put("service.name", List.of("secret-identity-value"));
        directMatches.put(" service.name ", List.of("duplicate-secret-value"));
        directMatches.put("host.id", List.of("10.0.0.7"));
        candidates.add(candidate(101L, "Checkout", "service", "direct", false, directMatches));
        candidates.add(candidate(102L, "Payments", "service", "suggested", false,
                Map.of("service.namespace", List.of("private-namespace"))));
        candidates.add(candidate(103L, "Bound checkout", "service", "direct", true, Map.of()));
        for (long id = 104; id <= 110; id++) {
            candidates.add(candidate(id, "Candidate " + id, "service", "suggested", false, Map.of()));
        }
        when(observeEntityService.getMonitorBindingCandidates(List.of(41L)))
                .thenReturn(Map.of(41L, candidates));

        EntityDiscoveryReadModel result = service.getDiscovery("checkout", 2, 10);

        assertEquals(1, result.schemaVersion());
        assertEquals(2, result.pageIndex());
        assertEquals(10, result.pageSize());
        assertEquals(21, result.totalElements());
        assertEquals(3, result.totalPages());
        assertEquals(1, result.content().size());
        EntityDiscoveryReadModel.DiscoveryRow row = result.content().getFirst();
        assertEquals(new EntityDiscoveryReadModel.MonitorSummary(
                41L, "checkout", "springboot3", "checkout.internal:8080", (byte) 1), row.monitor());
        assertEquals(8, row.candidates().size());
        assertEquals("direct", row.candidates().get(0).match());
        assertEquals(List.of("host.id", "service.name"), row.candidates().get(0).matchedKeys());
        assertEquals("suggested", row.candidates().get(1).match());
        assertEquals("already_bound", row.candidates().get(2).match());

        String json = JsonUtil.toJson(result);
        assertFalse(json.contains("secret-label-value"));
        assertFalse(json.contains("Bearer caller-token"));
        assertFalse(json.contains("secret-identity-value"));
        assertFalse(json.contains("duplicate-secret-value"));
        assertFalse(json.contains("private-namespace"));
        assertFalse(json.contains("telemetry body must not escape"));
        assertFalse(json.contains("score"));
        assertFalse(json.contains("alreadyBound"));
        assertFalse(json.contains("matchedIdentities"));
    }

    @Test
    void emptyPageReturnsStableSuccessfulReadModel() {
        when(monitorService.getMonitors(null, null, null, null, "id", "desc", 3, 10, null))
                .thenReturn(Page.empty(PageRequest.of(3, 10)));

        EntityDiscoveryReadModel result = service.getDiscovery(null, 3, 10);

        assertEquals(3, result.pageIndex());
        assertEquals(10, result.pageSize());
        assertEquals(0, result.totalElements());
        assertEquals(0, result.totalPages());
        assertEquals(List.of(), result.content());
        verify(observeEntityService).getMonitorBindingCandidates(List.of());
    }

    @Test
    void dependencyFailuresBecomeGenericSafeCommonExceptions() {
        when(monitorService.getMonitors(null, null, null, null, "id", "desc", 0, 8, null))
                .thenThrow(new IllegalStateException("jdbc://user:password@private-host"));

        CommonException monitorFailure = assertThrows(
                CommonException.class, () -> service.getDiscovery(null, 0, 8));
        assertEquals("entity_discovery_unavailable", monitorFailure.getMessage());
        assertFalse(monitorFailure.toString().contains("password"));

        Monitor monitor = Monitor.builder().id(42L).name("checkout").build();
        when(monitorService.getMonitors(null, null, "entity", null, "id", "desc", 0, 8, null))
                .thenReturn(new PageImpl<>(List.of(monitor)));
        when(observeEntityService.getMonitorBindingCandidates(anyList()))
                .thenThrow(new IllegalStateException("identity-value=secret"));

        CommonException candidateFailure = assertThrows(
                CommonException.class, () -> service.getDiscovery("entity", 0, 8));
        assertEquals("entity_discovery_unavailable", candidateFailure.getMessage());
        assertFalse(candidateFailure.toString().contains("identity-value"));
    }

    private static EntityMonitorBindingCandidate candidate(
            long id, String name, String type, String recommendation, boolean alreadyBound,
            Map<String, List<String>> matches) {
        return new EntityMonitorBindingCandidate(id, name, type, 120, recommendation, alreadyBound, matches);
    }
}
