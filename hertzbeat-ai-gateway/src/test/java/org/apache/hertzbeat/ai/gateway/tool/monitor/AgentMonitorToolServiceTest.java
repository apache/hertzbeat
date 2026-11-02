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

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Test case for {@link AgentMonitorToolService}.
 */
@ExtendWith(MockitoExtension.class)
class AgentMonitorToolServiceTest {

    @Mock private MonitorService monitorService;

    @Mock private AppService appService;

    private AgentMonitorToolService service;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient()
                .when(appService.getAppDefine(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(
                        org.apache.hertzbeat.common.entity.job.Job.builder()
                                .metrics(
                                        List.of(
                                                org.apache.hertzbeat.common.entity.job.Metrics
                                                        .builder()
                                                        .protocol("http")
                                                        .build()))
                                .build());
        service =
                new AgentMonitorToolService(
                        monitorService,
                        appService,
                        org.mockito.Mockito.mock(CollectorMonitorBindDao.class));
    }

    @Test
    void unsavedProbeUsesNativeValidationWithoutPersisting() {
        ParamDefineInfo host = new ParamDefineInfo();
        host.setField("host");
        host.setType("text");
        when(appService.getAppParamDefines("ping")).thenReturn(List.of(host));
        assertEquals(
                false,
                service.detectDraft("PING", Map.of("host", "example.test"), null).get("persisted"));
        verify(monitorService).validate(org.mockito.ArgumentMatchers.any(), isNull());
        verify(monitorService)
                .detectMonitor(
                        argThat(
                                monitor ->
                                        monitor.getId() == null && "ping".equals(monitor.getApp())),
                        org.mockito.ArgumentMatchers.anyList(),
                        isNull());
        org.mockito.Mockito.verify(monitorService, org.mockito.Mockito.never())
                .addMonitor(
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void unsavedProbeRejectsKnownCredentialQueryKeysIncludingEncodedNames() {
        ParamDefineInfo uri = new ParamDefineInfo();
        uri.setField("uri");
        uri.setType("text");
        when(appService.getAppParamDefines("website")).thenReturn(List.of(uri));
        for (String query :
                List.of(
                        "access_token=secret",
                        "client_secret=secret",
                        "api%5Fkey=secret",
                        "private-key=secret",
                        "X-Amz-Signature=secret")) {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> service.detectDraft("website", Map.of("uri", "/health?" + query), null));
        }
        org.mockito.Mockito.verifyNoInteractions(monitorService);
    }

    @Test
    void unsavedProbeStillAllowsOrdinaryQueryParameters() {
        ParamDefineInfo uri = new ParamDefineInfo();
        uri.setField("uri");
        uri.setType("text");
        when(appService.getAppParamDefines("website")).thenReturn(List.of(uri));
        assertEquals(
                false,
                service.detectDraft("website", Map.of("uri", "/health?format=json&limit=1"), null)
                        .get("persisted"));
        verify(monitorService)
                .detectMonitor(
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.anyList(),
                        isNull());
    }

    @Test
    void protocolPatchPreservesStoredSecretMarkersAndRejectsSecretChanges() {
        MonitorDto dto = new MonitorDto();
        dto.setMonitor(Monitor.builder().id(7L).app("linux").name("node").instance("host").build());
        dto.setParams(
                List.of(
                        Param.builder().field("host").type((byte) 1).paramValue("host").build(),
                        Param.builder()
                                .field("password")
                                .type((byte) 2)
                                .paramValue("encrypted")
                                .build()));
        ParamDefineInfo host = new ParamDefineInfo();
        host.setField("host");
        host.setType("text");
        ParamDefineInfo secret = new ParamDefineInfo();
        secret.setField("password");
        secret.setType("password");
        when(monitorService.getMonitorDto(7L)).thenReturn(dto);
        when(appService.getAppParamDefines("linux")).thenReturn(List.of(host, secret));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.protocolUpdate(7L, Map.of("password", "secret")));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.protocolUpdate(7L, Map.of("host", "https://u:p@host")));
        service.protocolUpdate(7L, Map.of("host", "new-host"));
        verify(monitorService)
                .modifyMonitor(
                        org.mockito.ArgumentMatchers.any(),
                        argThat(
                                params ->
                                        params.size() == 2
                                                && params.stream()
                                                        .anyMatch(
                                                                param ->
                                                                        "host"
                                                                                        .equals(
                                                                                                param
                                                                                                        .getField())
                                                                                && "new-host"
                                                                                        .equals(
                                                                                                param
                                                                                                        .getParamValue()))),
                        isNull(),
                        isNull());
    }

    @Test
    void shouldCreateWithValidatedMonitorAndEncryptedParams() {
        ParamDefineInfo passwordDefinition = new ParamDefineInfo();
        passwordDefinition.setField("password");
        passwordDefinition.setType("password");
        when(appService.getAppParamDefines("linux")).thenReturn(List.of(passwordDefinition));
        doAnswer(
                        invocation -> {
                            MonitorDto dto = invocation.getArgument(0);
                            Monitor validatedMonitor = dto.getMonitor();
                            validatedMonitor.setId(42L);
                            validatedMonitor.setName("validated-name");
                            dto.setMonitor(validatedMonitor);
                            List<Param> validatedParams = dto.getParams();
                            validatedParams.get(0).setParamValue("encrypted-password");
                            dto.setParams(validatedParams, false);
                            return null;
                        })
                .when(monitorService)
                .validate(
                        org.mockito.ArgumentMatchers.any(MonitorDto.class),
                        org.mockito.ArgumentMatchers.eq(false));

        Map<String, Object> result =
                service.createMonitor(
                        "raw-name",
                        "LINUX",
                        60,
                        Map.of("password", "plain-password"),
                        null,
                        Map.of("environment", "production"),
                        null);

        verify(monitorService)
                .addMonitor(
                        argThat(
                                monitor ->
                                        monitor.getId() == 42L
                                                && "validated-name".equals(monitor.getName())
                                                && "production"
                                                        .equals(
                                                                monitor.getLabels()
                                                                        .get("environment"))),
                        argThat(
                                params ->
                                        params.size() == 1
                                                && "encrypted-password"
                                                        .equals(params.get(0).getParamValue())),
                        isNull(),
                        isNull());
        assertEquals(42L, result.get("monitorId"));
        assertEquals("validated-name", result.get("name"));
    }

    @Test
    void shouldApplyCatalogDefaultsWithoutOverridingExplicitParams() {
        ParamDefineInfo hostDefinition = definition("host", "host", null);
        ParamDefineInfo portDefinition = definition("port", "number", "22");
        ParamDefineInfo reuseConnectionDefinition =
                definition("reuseConnection", "boolean", "true");
        ParamDefineInfo useProxyDefinition = definition("useProxy", "boolean", "false");
        when(appService.getAppParamDefines("linux"))
                .thenReturn(
                        List.of(
                                hostDefinition,
                                portDefinition,
                                reuseConnectionDefinition,
                                useProxyDefinition));
        doAnswer(
                        invocation -> {
                            Monitor monitor = invocation.getArgument(0);
                            monitor.setId(42L);
                            return null;
                        })
                .when(monitorService)
                .addMonitor(
                        org.mockito.ArgumentMatchers.any(Monitor.class),
                        org.mockito.ArgumentMatchers.anyList(),
                        isNull(),
                        isNull());

        service.createMonitor(
                "server",
                "linux",
                60,
                Map.of("host", "127.0.0.1", "useProxy", true),
                null,
                null,
                null);

        verify(monitorService)
                .validate(
                        argThat(
                                dto -> {
                                    Map<String, String> values =
                                            dto.getParams().stream()
                                                    .collect(
                                                            java.util.stream.Collectors.toMap(
                                                                    Param::getField,
                                                                    Param::getParamValue));
                                    return "127.0.0.1".equals(values.get("host"))
                                            && "22".equals(values.get("port"))
                                            && "true".equals(values.get("reuseConnection"))
                                            && "true".equals(values.get("useProxy"));
                                }),
                        org.mockito.ArgumentMatchers.eq(false));
    }

    @Test
    void shouldUpdateMonitorMetadataWithoutReplacingParams() {
        Monitor monitor =
                Monitor.builder()
                        .id(42L)
                        .name("old-name")
                        .app("linux")
                        .instance("server-a:22")
                        .intervals(60)
                        .labels(Map.of())
                        .build();
        List<Param> params =
                List.of(Param.builder().field("port").paramValue("22").type((byte) 0).build());
        MonitorDto dto = new MonitorDto();
        dto.setMonitor(monitor);
        dto.setParams(params);
        when(monitorService.getMonitorDto(42L)).thenReturn(dto);

        Map<String, Object> result =
                service.updateMonitor(
                        42L,
                        Map.of("name", "server-a", "labels", Map.of("environment", "production")),
                        null);

        verify(monitorService).validate(dto, true);
        verify(monitorService)
                .modifyMonitor(
                        argThat(
                                value ->
                                        "server-a".equals(value.getName())
                                                && "server-a".equals(value.getInstance())
                                                && "production"
                                                        .equals(
                                                                value.getLabels()
                                                                        .get("environment"))),
                        argThat(
                                value ->
                                        value.size() == 1
                                                && "port".equals(value.get(0).getField())
                                                && "22".equals(value.get(0).getParamValue())),
                        isNull(),
                        isNull());
        assertEquals("server-a", result.get("name"));
    }

    @Test
    void shouldPauseValidatedMonitorBatch() {
        when(monitorService.getMonitor(42L))
                .thenReturn(Monitor.builder().id(42L).status((byte) 0).build());
        when(monitorService.getMonitor(43L))
                .thenReturn(Monitor.builder().id(43L).status((byte) 0).build());
        Map<String, Object> result = service.pauseMonitors(List.of(42L, 43L, 42L));

        verify(monitorService).cancelManageMonitors(Set.of(42L, 43L));
        assertEquals(2, result.get("requestedCount"));
    }

    @Test
    void shouldRequireReasonBeforeDeletingMonitors() {
        assertThrows(
                IllegalArgumentException.class, () -> service.deleteMonitors(List.of(42L), " "));
    }

    @Test
    void copyUsesNativeServiceWithoutPretendingToKnowNewId() {
        when(monitorService.getMonitor(42L))
                .thenReturn(Monitor.builder().id(42L).app("website").build());
        Map<String, Object> result = service.copyMonitor(42L);
        verify(monitorService).copyMonitor(42L);
        assertEquals(true, result.get("verificationRequired"));
        assertThrows(IllegalArgumentException.class, () -> service.copyMonitor(0L));
    }

    @Test
    void batchPauseReportsActualReadback() {
        when(monitorService.getMonitor(42L))
                .thenReturn(Monitor.builder().id(42L).status((byte) 0).build());
        when(monitorService.getMonitor(43L))
                .thenReturn(Monitor.builder().id(43L).status((byte) 1).build(), null);
        Map<String, Object> result = service.pauseMonitors(List.of(42L, 43L));
        assertEquals(
                List.of(
                        Map.of("monitorId", 42L, "state", "paused", "verified", true),
                        Map.of("monitorId", 43L, "state", "absent", "verified", false)),
                result.get("outcomes"));
    }

    @Test
    void missingBatchTargetStopsBeforeAnyCollectionChange() {
        when(monitorService.getMonitor(42L))
                .thenReturn(Monitor.builder().id(42L).status((byte) 1).build());
        assertThrows(
                IllegalArgumentException.class, () -> service.pauseMonitors(List.of(42L, 43L)));
        org.mockito.Mockito.verify(monitorService, org.mockito.Mockito.never())
                .cancelManageMonitors(org.mockito.ArgumentMatchers.anySet());
    }

    @Test
    void fractionalOrOverflowedIntervalIsRejectedWithoutModification() {
        var dto = new MonitorDto();
        dto.setMonitor(
                Monitor.builder()
                        .id(42L)
                        .name("demo")
                        .app("website")
                        .instance("127.0.0.1")
                        .intervals(60)
                        .build());
        when(monitorService.getMonitorDto(42L)).thenReturn(dto);
        for (Number value : List.of(30.5, Long.MAX_VALUE, Double.NaN)) {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> service.updateMonitor(42L, Map.of("intervals", value), null));
        }
        org.mockito.Mockito.verify(monitorService, org.mockito.Mockito.never())
                .modifyMonitor(
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any());
    }

    @Test
    void readbackExposesOnlyDeclaredWebsiteValuesAndNeverObtainsSecretFieldValue() {
        var dto = org.mockito.Mockito.mock(MonitorDto.class);
        when(dto.getMonitor())
                .thenReturn(
                        Monitor.builder()
                                .id(42L)
                                .name("demo")
                                .app("website")
                                .instance("127.0.0.1")
                                .intervals(30)
                                .status((byte) 0)
                                .build());
        var secret = org.mockito.Mockito.mock(Param.class);
        when(secret.getField()).thenReturn("password");
        when(secret.getType()).thenReturn((byte) 2);
        when(dto.getParams())
                .thenReturn(
                        List.of(
                                Param.builder()
                                        .field("host")
                                        .type((byte) 1)
                                        .paramValue("127.0.0.1")
                                        .build(),
                                secret));
        when(monitorService.getMonitorDto(42L)).thenReturn(dto);
        var readback = service.monitorGet(42L);
        assertEquals(Map.of("host", "127.0.0.1"), readback.get("parameters"));
        assertEquals("paused", readback.get("collectionState"));
        assertEquals(30, readback.get("intervals"));
        org.mockito.Mockito.verify(secret, org.mockito.Mockito.never()).getParamValue();
    }

    private ParamDefineInfo definition(String field, String type, String defaultValue) {
        ParamDefineInfo definition = new ParamDefineInfo();
        definition.setField(field);
        definition.setType(type);
        definition.setDefaultValue(defaultValue);
        return definition;
    }
}
