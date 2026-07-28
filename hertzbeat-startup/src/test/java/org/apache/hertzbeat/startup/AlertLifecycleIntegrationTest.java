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

package org.apache.hertzbeat.startup;

import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_ACKNOWLEDGED;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_FIRING;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_RESOLVED;
import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.SUCCESS_CODE;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.alert.controller.AlertsController;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.service.AlertGroupMutationPublisher;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.type.TypeReference;

/**
 * Isolated H2 proof for public alert event and group lifecycle contracts.
 */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:alert-lifecycle;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false",
    "warehouse.store.duckdb.enabled=false"
})
class AlertLifecycleIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private AlertsController alertsController;

    @Autowired
    private GroupAlertDao groupAlertDao;

    @Autowired
    private SingleAlertDao singleAlertDao;

    @Autowired
    private AlertGroupMutationPublisher alertGroupMutationPublisher;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoSpyBean
    private AlertSseManager alertSseManager;

    @BeforeEach
    void setUpMockMvc() {
        mockMvc = MockMvcBuilders.standaloneSetup(alertsController).build();
    }

    @Test
    void alertLifecyclePersistsPagesDetailsTransitionsAndExactDelete() throws Exception {
        assertRollbackDoesNotPublishMutation();
        String marker = "alert-lifecycle-" + UUID.randomUUID();
        SingleAlert targetAlert = singleAlertDao.saveAndFlush(singleAlert(marker, "target"));
        SingleAlert retainedAlert = singleAlertDao.saveAndFlush(singleAlert(marker, "retained"));
        GroupAlert targetGroup = groupAlertDao.saveAndFlush(groupAlert(marker, "target", targetAlert));
        GroupAlert retainedGroup = groupAlertDao.saveAndFlush(groupAlert(marker, "retained", retainedAlert));
        long missingId = Math.max(targetGroup.getId(), retainedGroup.getId()) + 1_000_000L;

        assertNonEmptyPagesAndNestedDetail(marker, targetAlert, targetGroup);

        applyStatus(targetGroup.getId(), ALERT_STATUS_ACKNOWLEDGED);
        assertStatus(targetGroup.getId(), targetAlert.getId(), ALERT_STATUS_ACKNOWLEDGED, false);

        applyStatus(targetGroup.getId(), ALERT_STATUS_RESOLVED);
        assertStatus(targetGroup.getId(), targetAlert.getId(), ALERT_STATUS_RESOLVED, true);

        mockMvc.perform(put("/api/alerts/group/status/firing")
                        .param("ids", String.valueOf(targetGroup.getId()))
                        .param("ids", String.valueOf(missingId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert group was not found."))
                .andExpect(content().string(not(containsString(String.valueOf(missingId)))));
        assertStatus(targetGroup.getId(), targetAlert.getId(), ALERT_STATUS_RESOLVED, true);
        verify(alertSseManager, timeout(5_000).times(2)).broadcastGroupMutation(anyString());

        mockMvc.perform(delete("/api/alerts/group").param("ids", String.valueOf(targetGroup.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE));

        assertFalse(groupAlertDao.existsById(targetGroup.getId()));
        assertFalse(singleAlertDao.existsById(targetAlert.getId()));
        assertTrue(groupAlertDao.existsById(retainedGroup.getId()));
        assertTrue(singleAlertDao.existsById(retainedAlert.getId()));
        assertCommittedMutationEvents();
    }

    private void assertNonEmptyPagesAndNestedDetail(
            String marker, SingleAlert targetAlert, GroupAlert targetGroup) throws Exception {
        mockMvc.perform(get("/api/alerts")
                        .param("search", marker)
                        .param("sort", "id")
                        .param("order", "asc")
                        .param("pageIndex", "0")
                        .param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].content").value(containsString(marker)));

        mockMvc.perform(get("/api/alerts/group")
                        .param("search", marker + "-target")
                        .param("sort", "id")
                        .param("order", "asc")
                        .param("pageIndex", "0")
                        .param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(targetGroup.getId()))
                .andExpect(jsonPath("$.data.content[0].alerts.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].alerts[0].id").value(targetAlert.getId()))
                .andExpect(jsonPath("$.data.content[0].alerts[0].fingerprint").value(targetAlert.getFingerprint()))
                .andExpect(jsonPath("$.data.content[0].alerts[0].labels['service.name']").value("checkout"))
                .andExpect(jsonPath("$.data.content[0].alerts[0].annotations.summary")
                        .value(containsString(marker)));
    }

    private void applyStatus(Long groupId, String nextStatus) throws Exception {
        mockMvc.perform(put("/api/alerts/group/status/{status}", nextStatus)
                        .param("ids", String.valueOf(groupId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE));
    }

    private void assertStatus(Long groupId, Long alertId, String expectedStatus, boolean resolved) {
        GroupAlert group = groupAlertDao.findById(groupId).orElseThrow();
        SingleAlert alert = singleAlertDao.findById(alertId).orElseThrow();
        assertEquals(expectedStatus, group.getStatus());
        assertEquals(expectedStatus, alert.getStatus());
        if (resolved) {
            assertNull(alert.getActiveAt());
            assertNotNull(alert.getEndAt());
        } else {
            assertNotNull(alert.getActiveAt());
            assertNull(alert.getEndAt());
        }
    }

    private static SingleAlert singleAlert(String marker, String suffix) {
        return SingleAlert.builder()
                .fingerprint(marker + '-' + suffix)
                .labels(Map.of("service.name", "checkout", "severity", "critical"))
                .annotations(Map.of("summary", marker + '-' + suffix))
                .content(marker + '-' + suffix)
                .status(ALERT_STATUS_FIRING)
                .triggerTimes(1)
                .startAt(1_000L)
                .activeAt(1_000L)
                .build();
    }

    private static GroupAlert groupAlert(String marker, String suffix, SingleAlert alert) {
        return GroupAlert.builder()
                .groupKey(marker + '-' + suffix)
                .status(ALERT_STATUS_FIRING)
                .groupLabels(Map.of("alertname", marker + '-' + suffix))
                .commonLabels(Map.of("service.name", "checkout", "severity", "critical"))
                .commonAnnotations(Map.of("summary", marker + '-' + suffix))
                .alertFingerprints(List.of(alert.getFingerprint()))
                .build();
    }

    private void assertCommittedMutationEvents() {
        ArgumentCaptor<String> events = ArgumentCaptor.forClass(String.class);
        verify(alertSseManager, timeout(5_000).times(3)).broadcastGroupMutation(events.capture());
        List<String> payloads = events.getAllValues();
        Set<String> mutations = payloads.stream()
                .map(payload -> JsonUtil.fromJson(payload, new TypeReference<Map<String, Object>>() {
                }))
                .peek(event -> {
                    assertNull(event.get("content"));
                    assertNull(event.get("annotations"));
                })
                .map(event -> event.get("mutation") + ":" + event.get("status"))
                .collect(java.util.stream.Collectors.toSet());
        assertEquals(Set.of(
                "GROUP_STATUS_CHANGED:acknowledged",
                "GROUP_STATUS_CHANGED:resolved",
                "GROUP_DELETED:null"), mutations);
    }

    private void assertRollbackDoesNotPublishMutation() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            alertGroupMutationPublisher.publishDeleted(List.of(Long.MAX_VALUE));
            status.setRollbackOnly();
        });
        verify(alertSseManager, never()).broadcastGroupMutation(anyString());
    }
}
