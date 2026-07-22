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

package org.apache.hertzbeat.manager.service;

import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.manager.Define;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.DefineDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.pojo.dto.FileDTO;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionSource;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.apache.hertzbeat.warehouse.service.WarehouseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.io.ByteArrayInputStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link AppService}
 */
@ExtendWith(MockitoExtension.class)
class AppServiceTest {

    @InjectMocks
    private AppServiceImpl appService;

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private DefineDao defineDao;

    @Mock
    private WarehouseService warehouseService;

    @Mock
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @Mock
    private ObjectProvider<ObjectStoreService> objectStoreServiceProvider;

    @Mock
    private ObjectStoreService objectStoreService;

    @BeforeEach
    void setUp() throws Exception {
        when(defineDao.findAll()).thenReturn(new ArrayList<>());
        appService.afterPropertiesSet();
    }

    @Test
    void getAppParamDefines() {
        assertDoesNotThrow(() -> appService.getAppParamDefines("jvm"));
    }

    @Test
    void getAppDefine() {
        assertDoesNotThrow(() -> appService.getAppDefine("jvm"));
        assertThrows(IllegalArgumentException.class, () -> appService.getAppDefine("unknown"));
    }

    @Test
    void getAppDefineMetricNames() {
        assertDoesNotThrow(() -> appService.getAppDefineMetricNames("jvm"));
    }

    @Test
    void getI18nResources() {
        assertDoesNotThrow(() -> appService.getI18nResources("en-US"));
    }

    @Test
    void getAllAppHierarchy() {
        when(monitorDao.findMonitorsByAppEquals(anyString())).thenReturn(Collections
                .singletonList(Monitor.builder().id(1L).build()));
        when(warehouseService.queryMonitorMetricsData(anyLong())).thenReturn(Collections.emptyList());
        assertDoesNotThrow(() -> appService.getAllAppHierarchy("en-US"));
    }

    @Test
    void appDefineJexl() throws NoSuchMethodException {
        Job job = new Job();
        job.setApp("test-app");
        job.setCategory("service");
        job.setName(Map.of("k", "v"));

        List<RuntimeParamDefine> params = new ArrayList<>();
        RuntimeParamDefine hostParam = new RuntimeParamDefine();
        hostParam.setField("host");
        hostParam.setType("host");
        hostParam.setRequired(true);
        params.add(hostParam);

        RuntimeParamDefine portParam = new RuntimeParamDefine();
        portParam.setField("port");
        portParam.setType("number");
        portParam.setRequired(true);
        portParam.setDefaultValue("8080");
        params.add(portParam);

        job.setParams(params);

        List<Metrics> metrics = new ArrayList<>();

        Metrics otherMetrics = new Metrics();
        otherMetrics.setName("details");
        otherMetrics.setPriority((byte) 0);
        otherMetrics.setProtocol("http");

        List<Metrics.Field> fields = new ArrayList<>();
        fields.add(Metrics.Field.builder().field("size").build());
        otherMetrics.setFields(fields);

        metrics.add(otherMetrics);
        job.setMetrics(metrics);

        Method verifyMethod = AppServiceImpl.class.getDeclaredMethod("verifyDefineAppContent", Job.class, boolean.class);
        verifyMethod.setAccessible(true);
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            try {
                verifyMethod.invoke(appService, job, false);
            } catch (InvocationTargetException e) {
                if (e.getCause() instanceof RuntimeException) {
                    throw e.getCause();
                }
                throw new RuntimeException(e.getCause());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        assertTrue(exception.getMessage().contains("prohibited keywords"));
    }

    @Test
    void testRefreshStore() throws Exception {
        List<Define> defines = new ArrayList<>();
        Define define = Define.builder()
                .app("mysql")
                .content("""
                        app: mysql
                        params:
                          - field: host_test
                            name:
                              en-US: Target Host
                            type: host
                            required: true""")
                .build();
        defines.add(define);

        when(defineDao.findAll()).thenReturn(defines);

        ObjectStoreDTO<Object> objectStoreDTO = new ObjectStoreDTO<>();
        objectStoreDTO.setType(ObjectStoreDTO.Type.DATABASE);
        ObjectStoreConfigChangeEvent objectStoreConfigChangeEvent = new ObjectStoreConfigChangeEvent(objectStoreDTO);
        appService.onObjectStoreConfigChange(objectStoreConfigChangeEvent);

        List<ParamDefineInfo> appParamDefines = appService.getAppParamDefines(define.getApp());
        assertNotNull(appParamDefines);
        assertTrue(appParamDefines.stream().anyMatch(t -> t.getField().equals("host_test")));
    }

    @Test
    void monitorDefinitionSourceReportsActualBuiltinCustomIntersection() {
        Define custom = Define.builder()
                .app("custom_app")
                .content("app: custom_app\nname:\n  en-US: Custom")
                .build();
        Define override = Define.builder()
                .app("jvm")
                .content("app: jvm\nname:\n  en-US: JVM override")
                .build();
        when(defineDao.findAll()).thenReturn(List.of(custom, override));
        ObjectStoreDTO<Object> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.DATABASE);

        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config));
        clearInvocations(defineDao);

        Map<String, MonitorDefinitionSource> sources = appService.readAll().stream()
                .collect(java.util.stream.Collectors.toMap(source -> source.job().getApp(), source -> source));
        assertFalse(sources.get("custom_app").builtin());
        assertTrue(sources.get("custom_app").custom());
        assertTrue(sources.get("jvm").builtin());
        assertTrue(sources.get("jvm").custom());
        assertEquals(override.getContent(), sources.get("jvm").definition());
        verifyNoInteractions(defineDao);
    }

    @Test
    void monitorDefinitionSourceRefreshReplacesPriorActiveInventory() {
        Define previous = Define.builder().app("previous").content("app: previous").build();
        Define current = Define.builder().app("current").content("app: current").build();
        ObjectStoreDTO<Object> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.DATABASE);
        when(defineDao.findAll()).thenReturn(List.of(previous));
        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config));
        assertTrue(appService.readAll().stream().anyMatch(source -> source.job().getApp().equals("previous")));

        when(defineDao.findAll()).thenReturn(List.of(current));
        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config));

        assertFalse(appService.readAll().stream().anyMatch(source -> source.job().getApp().equals("previous")));
        assertTrue(appService.readAll().stream().anyMatch(source -> source.job().getApp().equals("current")));
    }

    @Test
    void failedMonitorDefinitionRefreshRestoresRegistryAndLegacyInventory() {
        Define previous = Define.builder().app("previous").content("app: previous").build();
        ObjectStoreDTO<Object> database = new ObjectStoreDTO<>();
        database.setType(ObjectStoreDTO.Type.DATABASE);
        when(defineDao.findAll()).thenReturn(List.of(previous));
        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(database));

        FileDTO partial = FileDTO.builder()
                .inputStream(new ByteArrayInputStream("app: partial".getBytes(StandardCharsets.UTF_8)))
                .build();
        FileDTO invalid = FileDTO.builder()
                .inputStream(new ByteArrayInputStream("app: [invalid".getBytes(StandardCharsets.UTF_8)))
                .build();
        ObjectStoreDTO<Object> objectStore = new ObjectStoreDTO<>();
        objectStore.setType(ObjectStoreDTO.Type.OBS);
        when(objectStoreServiceProvider.getIfAvailable()).thenReturn(objectStoreService);
        when(objectStoreService.list("define")).thenReturn(List.of(partial, invalid));

        assertThrows(RuntimeException.class,
                () -> appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(objectStore)));

        assertTrue(appService.getAllAppDefines().containsKey("previous"));
        assertFalse(appService.getAllAppDefines().containsKey("partial"));
        assertTrue(appService.readAll().stream().anyMatch(source -> source.job().getApp().equals("previous")));
        assertFalse(appService.readAll().stream().anyMatch(source -> source.job().getApp().equals("partial")));

        appService.deleteMonitorDefine("previous");
        verify(defineDao).deleteById("previous");
        verify(objectStoreService, never()).remove("define/app-previous.yml");
    }

    @Test
    void deletingOverrideRestoresBuiltinAsEffectiveDefinition() {
        Define override = Define.builder().app("jvm").content("app: jvm\nname:\n  en-US: Override").build();
        ObjectStoreDTO<Object> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.DATABASE);
        when(defineDao.findAll()).thenReturn(List.of(override));
        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config));

        appService.deleteMonitorDefine("jvm");

        MonitorDefinitionSource source = appService.readAll().stream()
                .filter(item -> item.job().getApp().equals("jvm"))
                .findFirst()
                .orElseThrow();
        assertTrue(source.builtin());
        assertFalse(source.custom());
        assertTrue(appService.getAllAppDefines().containsKey("jvm"));
        assertFalse(appService.getAllAppDefines().get("jvm").getName().containsValue("Override"));
    }

    @Test
    void deletingCustomRemovesEffectiveDefinition() {
        Define custom = Define.builder().app("custom-delete").content("app: custom-delete").build();
        ObjectStoreDTO<Object> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.DATABASE);
        when(defineDao.findAll()).thenReturn(List.of(custom));
        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config));

        appService.deleteMonitorDefine("custom-delete");

        assertFalse(appService.getAllAppDefines().containsKey("custom-delete"));
        assertFalse(appService.readAll().stream()
                .anyMatch(source -> source.job().getApp().equals("custom-delete")));
    }

    @Test
    void monitorDefinitionSourcePublishesRefreshAtomically() throws InterruptedException {
        Define previous = Define.builder().app("previous").content("app: previous").build();
        Define current = Define.builder().app("current").content("app: current").build();
        ObjectStoreDTO<Object> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.DATABASE);
        when(defineDao.findAll()).thenReturn(List.of(previous));
        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config));
        CountDownLatch reloadEntered = new CountDownLatch(1);
        CountDownLatch allowReload = new CountDownLatch(1);
        when(defineDao.findAll()).thenAnswer(invocation -> {
            reloadEntered.countDown();
            assertTrue(allowReload.await(10, TimeUnit.SECONDS));
            return List.of(current);
        });

        Thread refresh = Thread.startVirtualThread(
                () -> appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config)));
        assertTrue(reloadEntered.await(10, TimeUnit.SECONDS));
        try {
            List<String> duringRefresh = appService.readAll().stream()
                    .map(source -> source.job().getApp())
                    .toList();
            assertTrue(duringRefresh.contains("previous"));
            assertFalse(duringRefresh.contains("current"));
        } finally {
            allowReload.countDown();
        }
        refresh.join(TimeUnit.SECONDS.toMillis(10));

        assertFalse(refresh.isAlive());
        assertFalse(appService.readAll().stream().anyMatch(source -> source.job().getApp().equals("previous")));
        assertTrue(appService.readAll().stream().anyMatch(source -> source.job().getApp().equals("current")));
    }

    @Test
    void monitorDefinitionValidationHasNoStoreOrMonitorSideEffects() {
        String definition = appService.getMonitorDefineFileContent("jvm");
        clearInvocations(defineDao, monitorDao);

        Job validated = appService.validate(definition);

        assertEquals("jvm", validated.getApp());
        verifyNoInteractions(defineDao, monitorDao);
    }

    @Test
    void monitorDefinitionValidationAndLegacyMutationShareRiskyTokenGuard() {
        clearInvocations(defineDao, monitorDao);

        IllegalArgumentException validationError = assertThrows(
                IllegalArgumentException.class, () -> appService.validate("!!unsafe"));
        IllegalArgumentException mutationError = assertThrows(
                IllegalArgumentException.class, () -> appService.applyMonitorDefineYml("!!unsafe", false));

        assertEquals(validationError.getMessage(), mutationError.getMessage());
        verifyNoInteractions(defineDao, monitorDao);
    }
}
