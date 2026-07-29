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

import static org.apache.hertzbeat.common.constants.CommonConstants.LOG_ALERT_THRESHOLD_TYPE_REALTIME;
import static org.apache.hertzbeat.common.constants.CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_PERIODIC;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.hertzbeat.alert.calculate.periodic.PeriodicAlertRuleScheduler;
import org.apache.hertzbeat.alert.controller.AlertDefineController;
import org.apache.hertzbeat.alert.controller.AlertDefinesController;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Isolated H2 proof for the public Alert Rule lifecycle.
 */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.datasource.url=jdbc:h2:mem:alert-rule-lifecycle;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false",
    "warehouse.store.duckdb.enabled=false"
})
class AlertRuleLifecycleIntegrationTest {

    private static final long TEMP_MONITOR_ID = 8_765_432_109L;
    private static final String DATASOURCE = "lifecycle-promql";
    private static final String EXPRESSION = "value > 80";
    private static final int PERIOD = 60;
    private static final int TIMES = 1;
    private static final Map<String, String> LABELS = Map.of("environment", "lifecycle");
    private static final Map<String, String> ANNOTATIONS = Map.of("summary", "Lifecycle threshold");
    private static final String INITIAL_TEMPLATE = "${instance} exceeded the lifecycle threshold";
    private static final String UPDATED_TEMPLATE = "updated ${instance}";

    private MockMvc mockMvc;

    @Autowired
    private AlertDefineController alertDefineController;

    @Autowired
    private AlertDefinesController alertDefinesController;

    @Autowired
    private AlertDefineDao alertDefineDao;

    @Autowired
    private MonitorDao monitorDao;

    @MockitoBean
    private PeriodicAlertRuleScheduler periodicAlertRuleScheduler;

    @BeforeEach
    void setUpMockMvc() {
        mockMvc = MockMvcBuilders.standaloneSetup(alertDefineController, alertDefinesController).build();
    }

    @Test
    void alertRuleLifecyclePersistsAuthoritativeStateAndRoundTripsYaml() throws Exception {
        String ruleName = "lifecycle-" + UUID.randomUUID();
        Long activeRuleId = null;
        try {
            monitorDao.saveAndFlush(Monitor.builder()
                    .id(TEMP_MONITOR_ID)
                    .name("alert-rule-lifecycle-monitor")
                    .app("api")
                    .instance("127.0.0.1")
                    .intervals(60)
                    .status((byte) 0)
                    .type((byte) 0)
                    .build());

            AlertDefine createRequest = rule(ruleName, false);
            mockMvc.perform(post("/api/alert/define")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(JsonUtil.toJson(createRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0));

            AlertDefine created = alertDefineDao.findAlertDefineByName(ruleName).orElseThrow();
            activeRuleId = created.getId();
            LocalDateTime createTimestamp = created.getGmtUpdate();
            assertNotNull(createTimestamp);
            assertTrue(monitorDao.existsById(TEMP_MONITOR_ID));

            mockMvc.perform(get("/api/alert/defines")
                            .param("search", JsonUtil.toJson(List.of(ruleName)))
                            .param("sort", "id")
                            .param("order", "desc")
                            .param("pageIndex", "0")
                            .param("pageSize", "8"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.totalElements").value(1))
                    .andExpect(jsonPath("$.data.content[0].id").value(activeRuleId))
                    .andExpect(jsonPath("$.data.content[0].name").value(ruleName));

            assertDefinition(created, ruleName, false, INITIAL_TEMPLATE);
            assertAuthoritativeRead(activeRuleId, ruleName, false, INITIAL_TEMPLATE);
            assertRealtimePreviewEvaluates();

            AlertDefine updateRequest = alertDefineDao.findById(activeRuleId).orElseThrow();
            updateRequest.setTemplate(UPDATED_TEMPLATE);
            updateRequest.setEnable(true);
            mockMvc.perform(put("/api/alert/define")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(JsonUtil.toJson(updateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0));

            AlertDefine updated = alertDefineDao.findById(activeRuleId).orElseThrow();
            assertTrue(updated.isEnable());
            // H2/JPA audit timestamps may share one clock tick, so prove time does not move backward
            // and rely on the authoritative business-field reread below instead of claiming strict revision growth.
            assertFalse(updated.getGmtUpdate().isBefore(createTimestamp));
            assertDefinition(updated, ruleName, true, UPDATED_TEMPLATE);
            assertAuthoritativeRead(activeRuleId, ruleName, true, UPDATED_TEMPLATE);

            LocalDateTime updateTimestamp = updated.getGmtUpdate();
            updated.setEnable(false);
            mockMvc.perform(put("/api/alert/define")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(JsonUtil.toJson(updated)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0));

            AlertDefine disabled = alertDefineDao.findById(activeRuleId).orElseThrow();
            assertFalse(disabled.isEnable());
            assertFalse(disabled.getGmtUpdate().isBefore(updateTimestamp));
            assertDefinition(disabled, ruleName, false, UPDATED_TEMPLATE);
            assertAuthoritativeRead(activeRuleId, ruleName, false, UPDATED_TEMPLATE);

            activeRuleId = roundTripExport(activeRuleId, ruleName, "JSON", "json");
            activeRuleId = roundTripExport(activeRuleId, ruleName, "EXCEL", "xlsx");
            activeRuleId = roundTripExport(activeRuleId, ruleName, "YAML", "yaml");
            activeRuleId = roundTripExport(activeRuleId, ruleName, "YAML", "yml");
        } finally {
            if (activeRuleId != null) {
                alertDefineDao.deleteById(activeRuleId);
            }
            alertDefineDao.findAlertDefineByName(ruleName).ifPresent(alertDefineDao::delete);
            monitorDao.deleteById(TEMP_MONITOR_ID);
            assertTrue(alertDefineDao.findAlertDefineByName(ruleName).isEmpty());
            assertFalse(monitorDao.existsById(TEMP_MONITOR_ID));
        }
    }

    private void assertRealtimePreviewEvaluates() throws Exception {
        mockMvc.perform(get("/api/alert/define/preview/promql")
                        .param("type", LOG_ALERT_THRESHOLD_TYPE_REALTIME)
                        .param("expr", "log.severityText == 'ERROR'"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").isArray());
    }

    private Long roundTripExport(Long ruleId, String ruleName, String type, String extension) throws Exception {
        MvcResult export = mockMvc.perform(get("/api/alert/defines/export")
                        .param("ids", String.valueOf(ruleId))
                        .param("type", type))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_OCTET_STREAM))
                .andReturn();
        byte[] payload = export.getResponse().getContentAsByteArray();

        mockMvc.perform(delete("/api/alert/defines").param("ids", String.valueOf(ruleId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
        assertFalse(alertDefineDao.existsById(ruleId));

        MockMultipartFile importFile = new MockMultipartFile(
                "file", "alert-rule-lifecycle." + extension, MediaType.APPLICATION_OCTET_STREAM_VALUE, payload);
        mockMvc.perform(multipart("/api/alert/defines/import").file(importFile))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));

        AlertDefine imported = alertDefineDao.findAlertDefineByName(ruleName).orElseThrow();
        assertDefinition(imported, ruleName, false, UPDATED_TEMPLATE);
        assertAuthoritativeRead(imported.getId(), ruleName, false, UPDATED_TEMPLATE);
        return imported.getId();
    }

    private void assertAuthoritativeRead(Long ruleId, String ruleName, boolean enabled, String template)
            throws Exception {
        mockMvc.perform(get("/api/alert/define/{id}", ruleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.id").value(ruleId))
                .andExpect(jsonPath("$.data.name").value(ruleName))
                .andExpect(jsonPath("$.data.type").value(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC))
                .andExpect(jsonPath("$.data.datasource").value(DATASOURCE))
                .andExpect(jsonPath("$.data.expr").value(EXPRESSION))
                .andExpect(jsonPath("$.data.period").value(PERIOD))
                .andExpect(jsonPath("$.data.times").value(TIMES))
                .andExpect(jsonPath("$.data.labels.environment").value("lifecycle"))
                .andExpect(jsonPath("$.data.annotations.summary").value("Lifecycle threshold"))
                .andExpect(jsonPath("$.data.template").value(template))
                .andExpect(jsonPath("$.data.enable").value(enabled))
                .andExpect(jsonPath("$.data.gmtUpdate").isNotEmpty());
    }

    private static void assertDefinition(AlertDefine actual, String name, boolean enabled, String template) {
        assertEquals(name, actual.getName());
        assertEquals(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC, actual.getType());
        assertEquals(DATASOURCE, actual.getDatasource());
        assertEquals(EXPRESSION, actual.getExpr());
        assertEquals(PERIOD, actual.getPeriod());
        assertEquals(TIMES, actual.getTimes());
        assertEquals(LABELS, actual.getLabels());
        assertEquals(ANNOTATIONS, actual.getAnnotations());
        assertEquals(template, actual.getTemplate());
        assertEquals(enabled, actual.isEnable());
    }

    private static AlertDefine rule(String name, boolean enabled) {
        return AlertDefine.builder()
                .name(name)
                .type(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC)
                .datasource(DATASOURCE)
                .expr(EXPRESSION)
                .period(PERIOD)
                .times(TIMES)
                .labels(LABELS)
                .annotations(ANNOTATIONS)
                .template(INITIAL_TEMPLATE)
                .enable(enabled)
                .build();
    }
}
