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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Test alert-rule lifecycle contracts. */
class AgentAlertRuleToolServiceTest {

    private AlertDefineService alertDefineService;
    private AppService appService;
    private AgentAlertRuleToolService service;

    @BeforeEach
    void setUp() {
        alertDefineService = mock(AlertDefineService.class);
        appService = mock(AppService.class);
        service = new AgentAlertRuleToolService(alertDefineService, appService,
                jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator());
    }

    @Test
    void shouldCreateRuleWithCalculatorRecognizedType() {
        when(appService.getAppHierarchy("linux", "en-US"))
                .thenReturn(List.of(new Hierarchy("metrics", "cpu", "CPU", true, null, null, null, List.of())));

        Map<String, Object> result = service.createAlertRule("cpu-high", "LINUX", "cpu", "usage > 90",
                "realtime", null, 3, 0, null, null, null, null, null, true);

        verify(alertDefineService).validate(argThat(rule ->
                CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_REALTIME.equals(rule.getType())), eq(false));
        verify(alertDefineService).addAlertDefine(argThat(rule ->
                CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_REALTIME.equals(rule.getType())));
        assertEquals(CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_REALTIME, result.get("type"));
    }

    @Test
    void shouldReplaceExistingMonitorScopeByDefault() {
        AlertDefine rule = AlertDefine.builder().id(9L).name("cpu-high")
                .type(CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_REALTIME)
                .expr("equals(__app__,\"linux\") && equals(__metrics__,\"cpu\") && "
                        + "equals(__instance__, \"1\") && usage > 90")
                .labels(Map.of()).annotations(Map.of()).build();
        when(alertDefineService.getAlertDefine(9L)).thenReturn(rule);

        Map<String, Object> result = service.bindMonitors(9L, List.of(2L, 3L), null);

        verify(alertDefineService).modifyAlertDefine(argThat(updated ->
                !updated.getExpr().contains("\"1\"")
                        && updated.getExpr().contains("\"2\"")
                        && updated.getExpr().contains("\"3\"")));
        assertEquals(rule.getExpr(), result.get("expression"));
    }

    @Test
    void shouldCreateCompleteLogRuleThroughManagerValidation() {
        Map<String, Object> result = service.createConfigured(new AgentAlertRuleToolService.Configuration(
                "errors", "periodic_log", "count > 10", 300, 1, Map.of("severity", "warning"),
                Map.of("summary", "Error count"), "Errors detected", "log", true));
        verify(alertDefineService).validate(argThat(rule -> "periodic_log".equals(rule.getType())
                && "count > 10".equals(rule.getExpr())), eq(false));
        verify(alertDefineService).addAlertDefine(argThat(rule -> "log".equals(rule.getDatasource())));
        assertEquals("periodic_log", ((Map<?, ?>) result.get("data")).get("type"));
    }

    @Test
    void shouldUpdateExpressionTypeAndDatasource() {
        AlertDefine rule = AlertDefine.builder().id(9L).name("rule").build();
        when(alertDefineService.getAlertDefine(9L)).thenReturn(rule);
        service.updateAlertRule(9L, Map.of("expression", "count > 20", "type", "periodic_log", "datasource", "log"));
        verify(alertDefineService).modifyAlertDefine(argThat(updated -> "count > 20".equals(updated.getExpr())
                && "periodic_log".equals(updated.getType()) && "log".equals(updated.getDatasource())));
    }

    @Test
    void shouldRejectFractionalIntegerConfiguration() {
        when(alertDefineService.getAlertDefine(9L)).thenReturn(AlertDefine.builder().id(9L).name("rule").build());
        assertThrows(IllegalArgumentException.class, () -> service.updateAlertRule(9L, Map.of("times", 1.5)));
    }
}
