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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class AgentParameterMetadataPrivacyTest {
    private static final String SYNTHETIC = "synthetic-private-default-4638";

    private ParamDefineInfo param(String field, String type, String value) {
        var p = new ParamDefineInfo();
        p.setField(field);
        p.setType(type);
        p.setDefaultValue(value);
        p.setPlaceholder(SYNTHETIC);
        p.setOptions(List.of(new ParamDefineInfo.OptionInfo("choice", SYNTHETIC)));
        p.setDepend(Map.of("input", List.of(SYNTHETIC)));
        p.setName(Map.of("en-US", field));
        return p;
    }

    @Test
    void credentialAndFreeTextDefaultsOptionsAndDependenciesNeverReachModelMetadata() {
        var apps = mock(AppService.class);
        var password = param("password", "password", SYNTHETIC);
        var text = param("choice", "text", SYNTHETIC);
        when(apps.getAppParamDefines("fixture")).thenReturn(List.of(password, text));
        var svc =
                new AgentMonitorToolService(
                        mock(MonitorService.class), apps, mock(CollectorMonitorBindDao.class));
        assertFalse(JsonUtil.toJson(svc.getMonitorTypeParams("fixture")).contains(SYNTHETIC));
        assertEquals(SYNTHETIC, password.getDefaultValue());
        assertEquals(SYNTHETIC, text.getOptions().getFirst().getValue());
    }

    @Test
    void existingMonitorDefinitionProjectionKeepsOnlySafeScalarDefaults() {
        var apps = mock(AppService.class);
        var monitors = mock(MonitorService.class);
        var port = param("port", "number", "80");
        var ssl = param("ssl", "boolean", "false");
        var password = param("access_key", "text", SYNTHETIC);
        when(apps.getAppParamDefines("fixture")).thenReturn(List.of(port, ssl, password));
        var dto = new MonitorDto();
        dto.setMonitor(
                Monitor.builder().id(7L).app("fixture").name("fixture").status((byte) 0).build());
        dto.setParams(List.of(), false);
        when(monitors.getMonitorDto(7L)).thenReturn(dto);
        var svc = new AgentMonitorToolService(monitors, apps, mock(CollectorMonitorBindDao.class));
        assertFalse(JsonUtil.toJson(svc.monitorParams(7L, null)).contains(SYNTHETIC));
        var definitions = svc.getMonitorTypeParams("fixture");
        assertEquals("80", definitions.get(0).getDefaultValue());
        assertEquals("false", definitions.get(1).getDefaultValue());
        assertFalse(JsonUtil.toJson(definitions).contains(SYNTHETIC));
    }
}
