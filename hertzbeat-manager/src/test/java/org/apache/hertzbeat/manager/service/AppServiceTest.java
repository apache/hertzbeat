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

import org.apache.hertzbeat.common.entity.manager.Monitor;
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

import java.util.ArrayList;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
}
