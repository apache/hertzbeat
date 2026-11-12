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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Map;

class AgentWebsiteExclusionToolServiceTest {
    private Map<String, Object> invoke(
            AgentWebsiteExclusionToolService service, List<String> roles, boolean active) {
        var request =
                AgentToolExecutionRequest.builder()
                        .sessionUid("test-session")
                        .runId(1L)
                        .runUid("test-run")
                        .runSessionId(1L)
                        .entryType(
                                org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType
                                        .USER_INPUT)
                        .approvalHandling(
                                org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling
                                        .WAIT_FOR_DECISION)
                        .toolCallId("test-read")
                        .actor(AgentActor.builder().id("owner").type("user").roles(roles).build())
                        .workspaceId("isolated")
                        .toolName("monitor.website_exclusions")
                        .arguments(Map.of())
                        .executionGuard(() -> active)
                        .build();
        return AgentToolContextSupport.withInvocation(
                new AgentToolExecutionContext(request, new AgentToolCall()),
                service::websiteExclusions);
    }

    private Monitor row(long id) {
        return Monitor.builder().id(id).app("website").build();
    }

    @Test
    void nativeHttpUrlsPortsAndLiteralIpsProjectSafelyWithoutForwardingUrlData() {
        var monitors = mock(MonitorService.class);
        var params = mock(ParamDao.class);
        when(monitors.getMonitors(null, "website", null, null, "id", "asc", 0, 100, null))
                .thenReturn(new PageImpl<>(List.of(row(1)), PageRequest.of(0, 100), 1));
        var inputs = new java.util.LinkedHashMap<String, java.util.List<String>>();
        inputs.put(
                "HTTP://WWW.Example.Org.:8080/path?key=not-forwarded#fragment",
                List.of("www.example.org"));
        inputs.put("www.example.org:8443", List.of("www.example.org"));
        inputs.put("https://127.0.0.1:8443/", List.of());
        inputs.put("https://[::1]/", List.of());
        for (var input : inputs.entrySet()) {
            when(params.findWebsiteHostProjection(List.of(1L)))
                    .thenReturn(
                            java.util.Collections.singletonList(new Object[] {1L, input.getKey()}));
            var result =
                    invoke(
                            new AgentWebsiteExclusionToolService(monitors, params),
                            List.of("user"),
                            true);
            assertEquals(true, result.get("complete"), input.getKey());
            assertEquals(input.getValue(), result.get("domains"));
            assertFalse(result.toString().contains("not-forwarded"));
            assertFalse(result.toString().contains("fragment"));
        }
        for (String invalid :
                List.of(
                        "ftp://example.org/",
                        "https://owner:never-copy@example.org/",
                        "example.org/path",
                        "example.org:99999")) {
            when(params.findWebsiteHostProjection(List.of(1L)))
                    .thenReturn(java.util.Collections.singletonList(new Object[] {1L, invalid}));
            var result =
                    invoke(
                            new AgentWebsiteExclusionToolService(monitors, params),
                            List.of("user"),
                            true);
            assertEquals(false, result.get("complete"));
            assertEquals(List.of(), result.get("domains"));
            assertFalse(result.toString().contains("never-copy"));
        }
    }

    @Test
    void legacyNativeHttpHostUrlProjectsOnlyTheCanonicalDomain() throws Exception {
        var monitors = mock(MonitorService.class);
        var params = mock(ParamDao.class);
        when(monitors.getMonitors(null, "website", null, null, "id", "asc", 0, 100, null))
                .thenReturn(new PageImpl<>(List.of(row(1)), PageRequest.of(0, 100), 1));
        Map<?, ?> shape;
        try (var input =
                getClass().getResourceAsStream("/fixtures/website-exclusion-native-shapes.json")) {
            org.junit.jupiter.api.Assertions.assertNotNull(input);
            shape =
                    org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                            new String(
                                    input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8),
                            Map.class);
        }
        assertEquals(216, shape.get("nativeHostProjectionRows"));
        assertEquals(1, shape.get("legacyUrlHostCount"));
        assertEquals(false, shape.get("complete"));
        assertEquals(true, shape.get("sampleHostIsSynthetic"));
        when(params.findWebsiteHostProjection(List.of(1L)))
                .thenReturn(
                        java.util.Collections.singletonList(
                                new Object[] {1L, shape.get("sampleHost")}));
        var result =
                invoke(
                        new AgentWebsiteExclusionToolService(monitors, params),
                        List.of("user"),
                        true);
        assertEquals(true, result.get("complete"));
        assertEquals(List.of("www.example.org"), result.get("domains"));
        assertEquals(1, result.get("visibleMonitorCount"));
        assertFalse(result.toString().contains("https://"));
    }

    @Test
    void nativeVisibleIdsAreTheOnlyProjectionScopeAndOnlyDomainsLeaveTheService() {
        var monitors = mock(MonitorService.class);
        var params = mock(ParamDao.class);
        when(monitors.getMonitors(null, "website", null, null, "id", "asc", 0, 100, null))
                .thenReturn(
                        new PageImpl<>(List.of(row(1), row(3), row(4)), PageRequest.of(0, 100), 3));
        when(params.findWebsiteHostProjection(List.of(1L, 3L, 4L)))
                .thenReturn(
                        List.of(
                                new Object[] {1L, "VISIBLE.Example.COM."},
                                new Object[] {3L, "127.0.0.1"},
                                new Object[] {4L, "visible.example.com"}));
        var result =
                invoke(
                        new AgentWebsiteExclusionToolService(monitors, params),
                        List.of("user"),
                        true);
        assertEquals(true, result.get("complete"));
        assertEquals(List.of("visible.example.com"), result.get("domains"));
        assertEquals(3, result.get("visibleMonitorCount"));
        assertFalse(result.containsKey("parameters"));
        assertFalse(result.containsKey("monitorIds"));
        verify(params).findWebsiteHostProjection(List.of(1L, 3L, 4L));
        verifyNoMoreInteractions(params);
    }

    @Test
    void roleDeniedCancelledTooLargeChangedAndCrossScopeProjectionReturnNoPartialDomains() {
        var monitors = mock(MonitorService.class);
        var params = mock(ParamDao.class);
        var service = new AgentWebsiteExclusionToolService(monitors, params);
        assertThrows(SecurityException.class, () -> invoke(service, List.of("guest"), true));
        assertThrows(RuntimeException.class, () -> invoke(service, List.of("user"), false));
        verifyNoInteractions(monitors, params);
        when(monitors.getMonitors(null, "website", null, null, "id", "asc", 0, 100, null))
                .thenReturn(new PageImpl<>(List.of(row(1)), PageRequest.of(0, 100), 513));
        assertEquals(false, invoke(service, List.of("user"), true).get("complete"));
        verifyNoInteractions(params);
        when(monitors.getMonitors(null, "website", null, null, "id", "asc", 0, 100, null))
                .thenReturn(new PageImpl<>(List.of(row(1)), PageRequest.of(0, 100), 1));
        when(params.findWebsiteHostProjection(List.of(1L)))
                .thenReturn(
                        java.util.Collections.singletonList(new Object[] {2L, "not-visible.com"}));
        var denied = invoke(service, List.of("user"), true);
        assertEquals(false, denied.get("complete"));
        assertEquals(List.of(), denied.get("domains"));
    }

    @Test
    void changingPageCountNeverPublishesAnIncompleteExclusionSet() {
        var monitors = mock(MonitorService.class);
        var params = mock(ParamDao.class);
        var first = java.util.stream.LongStream.rangeClosed(1, 100).mapToObj(this::row).toList();
        when(monitors.getMonitors(null, "website", null, null, "id", "asc", 0, 100, null))
                .thenReturn(new PageImpl<>(first, PageRequest.of(0, 100), 101));
        when(monitors.getMonitors(null, "website", null, null, "id", "asc", 1, 100, null))
                .thenReturn(
                        new PageImpl<>(List.of(row(101), row(102)), PageRequest.of(1, 100), 102));
        assertEquals(
                false,
                invoke(
                                new AgentWebsiteExclusionToolService(monitors, params),
                                List.of("admin"),
                                true)
                        .get("complete"));
        verifyNoInteractions(params);
    }
}
