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

package org.apache.hertzbeat.ai.gateway.tool.status;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertGroupToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService;
import org.apache.hertzbeat.ai.gateway.tool.bulletin.AgentBulletinToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentLabelToolService;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.apache.hertzbeat.alert.service.AlertGroupConvergeService;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageComponentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentContentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentInfo;
import org.apache.hertzbeat.manager.pojo.dto.StatusPageOrgInfo;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;

/** Management tools call real manager contracts and preserve authorization metadata. */
class AgentManagementToolServiceTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void labelValidationRejectsBlankNameBeforeService() {
        LabelService service = mock(LabelService.class);
        AgentLabelToolService tools = new AgentLabelToolService(service, validator, mock(LabelDao.class));
        assertThrows(IllegalArgumentException.class, () -> tools.create(" ", "v", "description"));
        verify(service, never()).addLabel(any());
    }

    @Test
    void labelUpdatePreservesSystemTypeAndAudit() {
        LabelService service = mock(LabelService.class);
        LabelDao dao = mock(LabelDao.class);
        Label label = Label.builder().id(4L).name("old").type((byte) 2).creator("original").build();
        when(dao.findById(4L)).thenReturn(Optional.of(label));
        AgentLabelToolService tools = new AgentLabelToolService(service, validator, dao);
        tools.update(4L, "new", "value", "description");
        verify(service).modifyLabel(argThat(value -> value.getType() == 2 && "original".equals(value.getCreator())));
    }

    @Test
    void inhibitRejectsConflictingIdentity() {
        AlertInhibitService service = mock(AlertInhibitService.class);
        AgentAlertInhibitToolService tools = new AgentAlertInhibitToolService(service);
        AlertInhibitRequest request = new AlertInhibitRequest();
        request.setId(9L);
        assertThrows(IllegalArgumentException.class, () -> tools.update(8L, request));
        assertThrows(IllegalArgumentException.class, () -> tools.create(request));
        verify(service, never()).update(any());
        verify(service, never()).create(any());
    }

    @Test
    void groupRejectsInvalidTimingAndUsesServiceValidation() {
        AlertGroupConvergeService service = mock(AlertGroupConvergeService.class);
        AgentAlertGroupToolService tools = new AgentAlertGroupToolService(service, validator);
        assertThrows(IllegalArgumentException.class, () -> tools.create(
                new AgentAlertGroupToolService.Configuration("policy", List.of("env"), -1L, 30L, 0L, true)));
        tools.create(new AgentAlertGroupToolService.Configuration("policy", List.of("env"), 0L, 30L, 0L, true));
        verify(service).validate(any(AlertGroupConverge.class), org.mockito.ArgumentMatchers.eq(false));
        verify(service).addAlertGroupConverge(argThat(value -> value.getRepeatInterval() == 0L));
    }

    @Test
    void bulletinValidatesBeforePublication() {
        BulletinService service = mock(BulletinService.class);
        AgentBulletinToolService tools = new AgentBulletinToolService(service);
        tools.create(new AgentBulletinToolService.Configuration("dashboard", "linux", List.of(2L), Map.of("cpu", List.of("usage"))));
        var ordered = org.mockito.Mockito.inOrder(service);
        ordered.verify(service).validate(any(), org.mockito.ArgumentMatchers.eq(false));
        ordered.verify(service).addBulletin(any());
        assertThrows(IllegalArgumentException.class, () -> tools.delete(2L, ""));
        verify(service, never()).deleteBulletins(any());
    }

    @Test
    void statusOrgUsesBeanValidationBeforePublication() {
        StatusPageService service = mock(StatusPageService.class);
        AgentStatusPageToolService tools = new AgentStatusPageToolService(service, validator);
        assertThrows(IllegalArgumentException.class, () -> tools.saveOrganization(
                new AgentStatusPageToolService.Organization("", "description", "https://example.com", "logo", null, null, (byte) 0)));
        verify(service, never()).saveStatusPageOrg(any());
    }

    @Test
    void statusIncidentRejectsComponentsFromAnotherOrganization() {
        StatusPageService service = mock(StatusPageService.class);
        StatusPageOrgInfo org = new StatusPageOrgInfo();
        org.setId(1L);
        when(service.queryStatusPageOrg()).thenReturn(org);
        StatusPageComponentInfo component = new StatusPageComponentInfo();
        component.setId(2L);
        component.setOrgId(3L);
        when(service.queryStatusPageComponent(2L)).thenReturn(component);
        AgentStatusPageToolService tools = new AgentStatusPageToolService(service, validator);
        assertThrows(IllegalArgumentException.class, () -> tools.createIncident(
                new AgentStatusPageToolService.Incident(1L, "incident", (byte) 0, List.of(2L), "Investigating")));
        verify(service, never()).newStatusPageIncident(any());
    }

    @Test
    void statusIncidentUpdateAppendsRatherThanErasingHistory() {
        StatusPageService service = mock(StatusPageService.class);
        StatusPageOrgInfo org = new StatusPageOrgInfo();
        org.setId(1L);
        when(service.queryStatusPageOrg()).thenReturn(org);
        StatusPageIncidentInfo incident = new StatusPageIncidentInfo();
        incident.setId(5L);
        StatusPageIncidentContentInfo prior = new StatusPageIncidentContentInfo();
        prior.setMessage("Investigating");
        incident.setContents(List.of(prior));
        when(service.queryStatusPageIncident(5L)).thenReturn(incident);
        AgentStatusPageToolService tools = new AgentStatusPageToolService(service, validator);
        tools.updateIncident(5L, new AgentStatusPageToolService.Incident(1L, "incident", (byte) 3, List.of(), "Resolved"));
        verify(service).updateStatusPageIncident(argThat(value -> value.getContents().size() == 2
                && "Investigating".equals(value.getContents().get(0).getMessage())
                && value.getContents().get(1).getIncidentId() == 5L));
    }

    @Test
    void managementToolsAreOnDemandAndPublicationRequiresDangerousPolicy() {
        for (Class<?> type : List.of(AgentLabelToolService.class, AgentAlertGroupToolService.class,
                AgentAlertInhibitToolService.class, AgentBulletinToolService.class, AgentStatusPageToolService.class)) {
            for (Method method : type.getMethods()) {
                Tool tool = method.getAnnotation(Tool.class);
                if (tool == null) {
                    continue;
                }
                AgentToolPolicy policy = method.getAnnotation(AgentToolPolicy.class);
                assertEquals(AgentToolExposure.MODEL_ON_DEMAND, policy.exposure(), tool.name());
                if (tool.name().endsWith("delete")) {
                    assertEquals(AgentToolAccess.ADMIN, policy.access(), tool.name());
                    assertEquals(AgentToolRisk.DANGEROUS, policy.risk(), tool.name());
                }
                if (type == AgentStatusPageToolService.class || type == AgentBulletinToolService.class) {
                    assertTrue(policy.risk() == AgentToolRisk.READ || policy.risk() == AgentToolRisk.DANGEROUS, tool.name());
                }
            }
        }
    }

    @Test
    void componentListingIsPagedAndDisclosesFullSourceRead() {
        StatusPageService service = mock(StatusPageService.class);
        List<StatusPageComponentInfo> all = java.util.stream.IntStream.range(0, 125).mapToObj(index -> {
            StatusPageComponentInfo value = new StatusPageComponentInfo();
            value.setId((long) index + 1);
            value.setName("component-" + index);
            return value;
        }).toList();
        when(service.queryStatusPageComponents()).thenReturn(all);
        AgentStatusPageToolService tools = new AgentStatusPageToolService(service, validator);
        Map<String, Object> result = tools.components(1, 20);
        Map<?, ?> data = (Map<?, ?>) result.get("data");
        assertEquals(20, ((List<?>) data.get("content")).size());
        assertEquals(125, data.get("totalElements"));
        assertEquals(true, result.get("hasMore"));
        assertTrue(result.get("sourceReadScope").toString().contains("all components"));
        Map<?, ?> beyond = (Map<?, ?>) tools.components(Integer.MAX_VALUE, 100).get("data");
        assertTrue(((List<?>) beyond.get("content")).isEmpty());
        assertEquals(125, all.size());
    }

    @Test
    void incidentHistoryIsExplicitlyPartialWithoutMutatingSource() {
        StatusPageService service = mock(StatusPageService.class);
        StatusPageIncidentInfo incident = new StatusPageIncidentInfo();
        incident.setId(8L);
        incident.setName("incident");
        List<StatusPageIncidentContentInfo> history = java.util.stream.IntStream.range(0, 45).mapToObj(index -> {
            StatusPageIncidentContentInfo content = new StatusPageIncidentContentInfo();
            content.setId((long) index);
            content.setMessage("message-" + index);
            return content;
        }).toList();
        incident.setContents(history);
        when(service.queryStatusPageIncident(8L)).thenReturn(incident);
        Map<String, Object> result = new AgentStatusPageToolService(service, validator).incident(8L);
        Map<?, ?> data = (Map<?, ?>) result.get("data");
        assertEquals(true, result.get("partial"));
        assertEquals(45, data.get("contentCount"));
        assertEquals(20, ((List<?>) data.get("contents")).size());
        assertEquals(45, incident.getContents().size());
        assertTrue(result.get("sourceReadScope").toString().contains("full incident history"));
    }

    @Test
    void outputProjectionBoundsNestedCollectionsAndRedactsNamedLabelSecrets() {
        Map<String, Object> result = org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(
                Map.of("name", "api_key", "tagValue", "must-not-reach-model", "password", "also-secret",
                        "rows", java.util.Collections.nCopies(150, "x"), "text", "x".repeat(4000)));
        Map<?, ?> data = (Map<?, ?>) result.get("data");
        assertEquals("[REDACTED]", data.get("tagValue"));
        assertEquals("[REDACTED]", data.get("password"));
        assertEquals(100, ((List<?>) data.get("rows")).size());
        assertEquals(2048, data.get("text").toString().length());
        assertEquals(true, result.get("partial"));
    }

    @Test
    void projectedReadDoesNotTruncateHistoryDuringSubsequentUpdate() {
        StatusPageService service = mock(StatusPageService.class);
        StatusPageOrgInfo org = new StatusPageOrgInfo();
        org.setId(1L);
        when(service.queryStatusPageOrg()).thenReturn(org);
        StatusPageIncidentInfo incident = new StatusPageIncidentInfo();
        incident.setId(5L);
        List<StatusPageIncidentContentInfo> history = java.util.stream.IntStream.range(0, 30).mapToObj(index -> {
            StatusPageIncidentContentInfo content = new StatusPageIncidentContentInfo();
            content.setMessage("entry-" + index);
            return content;
        }).toList();
        incident.setContents(history);
        when(service.queryStatusPageIncident(5L)).thenReturn(incident);
        AgentStatusPageToolService tools = new AgentStatusPageToolService(service, validator);
        tools.incident(5L);
        tools.updateIncident(5L, new AgentStatusPageToolService.Incident(1L, "incident", (byte) 3, List.of(), "Resolved"));
        verify(service).updateStatusPageIncident(argThat(value -> value.getContents().size() == 31
                && "entry-0".equals(value.getContents().get(0).getMessage())));
    }

}
