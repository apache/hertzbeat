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
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.manager.dao.DefineDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.apache.hertzbeat.warehouse.service.WarehouseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
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

        List<ParamDefine> params = new ArrayList<>();
        ParamDefine hostParam = new ParamDefine();
        hostParam.setField("host");
        hostParam.setType("host");
        hostParam.setRequired(true);
        params.add(hostParam);

        ParamDefine portParam = new ParamDefine();
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
}
