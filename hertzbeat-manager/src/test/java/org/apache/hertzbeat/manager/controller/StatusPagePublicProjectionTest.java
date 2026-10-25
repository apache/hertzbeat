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

package org.apache.hertzbeat.manager.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.ComponentStatus;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageComponentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageHistoryInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentContentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageOrgInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPagePublicResponse;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

/** Public routes serialize only public projections, including nested incident objects. */
class StatusPagePublicProjectionTest {

    private static final LocalDateTime TIME = LocalDateTime.of(2026, 1, 2, 3, 4, 5);
    private final StatusPageService service = mock(StatusPageService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        StatusPagePublicController controller = new StatusPagePublicController();
        ReflectionTestUtils.setField(controller, "statusPageService", service);
        mvc = standaloneSetup(controller).build();
    }

    @Test
    void organizationKeepsPublicBrandingAndUpdateTimeWithoutAuditIdentities() throws Exception {
        StatusPageOrgInfo org = new StatusPageOrgInfo();
        org.setId(1L);
        org.setName("Public service");
        org.setDescription("Public description");
        org.setHome("https://example.invalid");
        org.setLogo("public-logo");
        org.setFeedback("public-feedback");
        org.setColor("blue");
        org.setState((byte) 1);
        org.setCreator("internal-creator");
        org.setModifier("internal-modifier");
        org.setGmtCreate(TIME);
        org.setGmtUpdate(TIME);
        when(service.queryStatusPageOrg()).thenReturn(org);
        String json = mvc.perform(get("/api/status/page/public/org"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("Public service"))
                .andExpect(jsonPath("$.data.home").value("https://example.invalid"))
                .andExpect(jsonPath("$.data.logo").value("public-logo"))
                .andExpect(jsonPath("$.data.feedback").value("public-feedback"))
                .andExpect(jsonPath("$.data.color").value("blue"))
                .andExpect(jsonPath("$.data.gmtUpdate").exists())
                .andReturn().getResponse().getContentAsString();
        assertPublicOnly(json);
        assertEquals(TIME, StatusPagePublicResponse.org(org).gmtUpdate());
        assertTrue(JsonUtil.toJson(org).contains("internal-creator"));
    }

    @Test
    void componentListAndDetailPreserveInfoHistoryContract() throws Exception {
        ComponentStatus value = componentStatus();
        when(service.queryComponentsStatus(7)).thenReturn(List.of(value));
        when(service.queryComponentStatus(2L, 7)).thenReturn(value);
        for (boolean detail : new boolean[]{false, true}) {
            String path = "/api/status/page/public/component" + (detail ? "/2" : "");
            String prefix = detail ? "$.data" : "$.data[0]";
            String json = mvc.perform(get(path).param("days", "7"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath(prefix + ".info.id").value(2))
                    .andExpect(jsonPath(prefix + ".info.orgId").value(1))
                    .andExpect(jsonPath(prefix + ".info.name").value("API"))
                    .andExpect(jsonPath(prefix + ".info.description").value("Public API"))
                    .andExpect(jsonPath(prefix + ".info.state").value(1))
                    .andExpect(jsonPath(prefix + ".history[0].componentId").value(2))
                    .andExpect(jsonPath(prefix + ".history[0].timestamp").value(1234))
                    .andExpect(jsonPath(prefix + ".history[0].uptime").value(0.995))
                    .andExpect(jsonPath(prefix + ".history[0].abnormal").value(1))
                    .andExpect(jsonPath(prefix + ".history[0].unknowing").value(2))
                    .andExpect(jsonPath(prefix + ".history[0].normal").value(97))
                    .andReturn().getResponse().getContentAsString();
            assertPublicOnly(json);
        }
        String managementJson = JsonUtil.toJson(value);
        assertTrue(managementJson.contains("internal-creator"));
        assertTrue(managementJson.contains("private-selector"));
        assertEquals(Map.of("private-selector", "internal-monitor"), value.getComponentInfo().getLabels());
    }

    @Test
    void incidentPageKeepsPaginationAndTimelineButProjectsAllNestedPaths() throws Exception {
        StatusPageIncidentInfo incident = incident();
        when(service.queryStatusPageIncidents("API", 1L, 9L, 1, 1))
                .thenReturn(new PageImpl<>(List.of(incident), PageRequest.of(1, 1), 3));
        String json = mvc.perform(get("/api/status/page/public/incident").param("search", "API")
                        .param("startTime", "1").param("endTime", "9").param("pageIndex", "1").param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(3))
                .andExpect(jsonPath("$.data.number").value(1))
                .andExpect(jsonPath("$.data.size").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(4))
                .andExpect(jsonPath("$.data.content[0].startTime").value(1))
                .andExpect(jsonPath("$.data.content[0].endTime").value(9))
                .andExpect(jsonPath("$.data.content[0].components[0].id").value(2))
                .andExpect(jsonPath("$.data.content[0].contents[0].incidentId").value(4))
                .andExpect(jsonPath("$.data.content[0].contents[0].message").value("Investigating"))
                .andExpect(jsonPath("$.data.content[0].contents[0].timestamp").value(2))
                .andExpect(jsonPath("$.data.content[0].contents[0].state").value(1))
                .andReturn().getResponse().getContentAsString();
        assertPublicOnly(json);
        String managementJson = JsonUtil.toJson(incident);
        assertTrue(managementJson.contains("internal-creator"));
        assertTrue(managementJson.contains("private-selector"));
    }

    @Test
    void projectionsRetainNullAndEmptyShapeWithoutMutatingServiceDtos() {
        assertNull(StatusPagePublicResponse.org(null));
        assertNull(StatusPagePublicResponse.incident(null));
        assertNull(StatusPagePublicResponse.componentStatus(null));
        assertNull(StatusPagePublicResponse.componentStatuses(null));
        assertTrue(StatusPagePublicResponse.componentStatuses(List.of()).isEmpty());
        var projected = StatusPagePublicResponse.componentStatuses(Arrays.asList(null, new ComponentStatus()));
        assertNull(projected.get(0));
        assertNull(projected.get(1).info());
        assertNull(projected.get(1).history());
        StatusPageIncidentInfo empty = new StatusPageIncidentInfo();
        assertNull(StatusPagePublicResponse.incident(empty).components());
        assertNull(StatusPagePublicResponse.incident(empty).contents());
    }

    private ComponentStatus componentStatus() {
        StatusPageComponentInfo component = new StatusPageComponentInfo();
        component.setId(2L);
        component.setOrgId(1L);
        component.setName("API");
        component.setDescription("Public API");
        component.setLabels(Map.of("private-selector", "internal-monitor"));
        component.setMethod((byte) 1);
        component.setConfigState((byte) 1);
        component.setState((byte) 1);
        component.setCreator("internal-creator");
        component.setModifier("internal-modifier");
        component.setGmtCreate(TIME);
        component.setGmtUpdate(TIME);
        StatusPageHistoryInfo history = new StatusPageHistoryInfo();
        history.setId(3L);
        history.setComponentId(2L);
        history.setState((byte) 1);
        history.setTimestamp(1234L);
        history.setUptime(0.995);
        history.setAbnormal(1);
        history.setUnknowing(2);
        history.setNormal(97);
        history.setCreator("internal-creator");
        history.setModifier("internal-modifier");
        history.setGmtCreate(TIME);
        history.setGmtUpdate(TIME);
        ComponentStatus value = new ComponentStatus();
        value.setComponentInfo(component);
        value.setHistoryItems(List.of(history));
        return value;
    }

    private StatusPageIncidentInfo incident() {
        StatusPageIncidentInfo incident = new StatusPageIncidentInfo();
        incident.setId(4L);
        incident.setOrgId(1L);
        incident.setName("API interruption");
        incident.setState((byte) 1);
        incident.setStartTime(1L);
        incident.setEndTime(9L);
        incident.setCreator("internal-creator");
        incident.setModifier("internal-modifier");
        incident.setGmtCreate(TIME);
        incident.setGmtUpdate(TIME);
        incident.setComponents(List.of(componentStatus().getComponentInfo()));
        StatusPageIncidentContentInfo content = new StatusPageIncidentContentInfo();
        content.setId(5L);
        content.setIncidentId(4L);
        content.setMessage("Investigating");
        content.setState((byte) 1);
        content.setTimestamp(2L);
        content.setCreator("internal-creator");
        content.setModifier("internal-modifier");
        content.setGmtCreate(TIME);
        content.setGmtUpdate(TIME);
        incident.setContents(List.of(content));
        return incident;
    }

    private void assertPublicOnly(String json) {
        for (String field : List.of("creator", "modifier", "labels")) {
            assertFalse(json.contains("\"" + field + "\":"), json);
        }
        assertFalse(json.contains("internal-creator"), json);
        assertFalse(json.contains("internal-modifier"), json);
        assertFalse(json.contains("private-selector"), json);
    }
}
