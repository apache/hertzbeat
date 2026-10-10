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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link AgentMonitorToolService}.
 */
@ExtendWith(MockitoExtension.class)
class AgentMonitorToolServiceTest {

    @Mock
    private MonitorService monitorService;

    @Mock
    private AppService appService;

    private AgentMonitorToolService service;

    @BeforeEach
    void setUp() {
        service = new AgentMonitorToolService(monitorService, appService,
                org.mockito.Mockito.mock(CollectorMonitorBindDao.class));
    }

    @Test
    void shouldCreateWithValidatedMonitorAndEncryptedParams() {
        ParamDefineInfo passwordDefinition = new ParamDefineInfo();
        passwordDefinition.setField("password");
        passwordDefinition.setType("password");
        when(appService.getAppParamDefines("linux")).thenReturn(List.of(passwordDefinition));
        doAnswer(invocation -> {
            MonitorDto dto = invocation.getArgument(0);
            Monitor validatedMonitor = dto.getMonitor();
            validatedMonitor.setId(42L);
            validatedMonitor.setName("validated-name");
            dto.setMonitor(validatedMonitor);
            List<Param> validatedParams = dto.getParams();
            validatedParams.get(0).setParamValue("encrypted-password");
            dto.setParams(validatedParams);
            return null;
        }).when(monitorService).validate(org.mockito.ArgumentMatchers.any(MonitorDto.class),
                org.mockito.ArgumentMatchers.eq(false));

        Map<String, Object> result = service.createMonitor("raw-name", "LINUX", 60,
                Map.of("password", "plain-password"), null, Map.of("environment", "production"), null);

        verify(monitorService).addMonitor(
                argThat(monitor -> monitor.getId() == 42L && "validated-name".equals(monitor.getName())
                        && "production".equals(monitor.getLabels().get("environment"))),
                argThat(params -> params.size() == 1
                        && "encrypted-password".equals(params.get(0).getParamValue())),
                isNull(), isNull());
        assertEquals(42L, result.get("monitorId"));
        assertEquals("validated-name", result.get("name"));
    }

    @Test
    void shouldApplyCatalogDefaultsWithoutOverridingExplicitParams() {
        ParamDefineInfo hostDefinition = definition("host", "host", null);
        ParamDefineInfo portDefinition = definition("port", "number", "22");
        ParamDefineInfo reuseConnectionDefinition = definition("reuseConnection", "boolean", "true");
        ParamDefineInfo useProxyDefinition = definition("useProxy", "boolean", "false");
        when(appService.getAppParamDefines("linux")).thenReturn(List.of(
                hostDefinition, portDefinition, reuseConnectionDefinition, useProxyDefinition));
        doAnswer(invocation -> {
            Monitor monitor = invocation.getArgument(0);
            monitor.setId(42L);
            return null;
        }).when(monitorService).addMonitor(org.mockito.ArgumentMatchers.any(Monitor.class),
                org.mockito.ArgumentMatchers.anyList(), isNull(), isNull());

        service.createMonitor("server", "linux", 60,
                Map.of("host", "127.0.0.1", "useProxy", true), null, null, null);

        verify(monitorService).validate(argThat(dto -> {
            Map<String, String> values = dto.getParams().stream()
                    .collect(java.util.stream.Collectors.toMap(Param::getField, Param::getParamValue));
            return "127.0.0.1".equals(values.get("host"))
                    && "22".equals(values.get("port"))
                    && "true".equals(values.get("reuseConnection"))
                    && "true".equals(values.get("useProxy"));
        }), org.mockito.ArgumentMatchers.eq(false));
    }

    @Test
    void shouldUpdateMonitorMetadataWithoutReplacingParams() {
        Monitor monitor = Monitor.builder()
                .id(42L)
                .name("old-name")
                .app("linux")
                .instance("server-a:22")
                .intervals(60)
                .labels(Map.of())
                .build();
        List<Param> params = List.of(Param.builder().field("port").paramValue("22").type((byte) 0).build());
        MonitorDto dto = new MonitorDto();
        dto.setMonitor(monitor);
        dto.setParams(params);
        when(monitorService.getMonitorDto(42L)).thenReturn(dto);

        Map<String, Object> result = service.updateMonitor(42L,
                Map.of("name", "server-a", "labels", Map.of("environment", "production")), null);

        verify(monitorService).validate(dto, true);
        verify(monitorService).modifyMonitor(
                argThat(value -> "server-a".equals(value.getName())
                        && "server-a".equals(value.getInstance())
                        && "production".equals(value.getLabels().get("environment"))),
                argThat(value -> value.size() == 1 && "port".equals(value.get(0).getField())
                        && "22".equals(value.get(0).getParamValue())), isNull(), isNull());
        assertEquals("server-a", result.get("name"));
    }

    @Test
    void shouldPauseValidatedMonitorBatch() {
        Map<String, Object> result = service.pauseMonitors(List.of(42L, 43L, 42L));

        verify(monitorService).cancelManageMonitors(Set.of(42L, 43L));
        assertEquals(2, result.get("requestedCount"));
    }

    @Test
    void shouldRequireReasonBeforeDeletingMonitors() {
        assertThrows(IllegalArgumentException.class,
                () -> service.deleteMonitors(List.of(42L), " "));
    }

    private ParamDefineInfo definition(String field, String type, String defaultValue) {
        ParamDefineInfo definition = new ParamDefineInfo();
        definition.setField(field);
        definition.setType(type);
        definition.setDefaultValue(defaultValue);
        return definition;
    }
}
