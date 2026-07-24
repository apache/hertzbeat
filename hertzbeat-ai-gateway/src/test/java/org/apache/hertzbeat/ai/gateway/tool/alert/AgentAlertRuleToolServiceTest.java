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
        service = new AgentAlertRuleToolService(alertDefineService, appService);
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
}
