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

package org.apache.hertzbeat.grafana.service;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.dao.DashboardDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

/**
 * Test case for {@link DashboardService}
 */
@ExtendWith(MockitoExtension.class)
public class DashboardServiceTest {

    @Mock
    private ServiceAccountService serviceAccountService;

    @Mock
    private DashboardDao dashboardDao;

    @Mock
    private GrafanaProperties grafanaProperties;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private DatasourceService datasourceService;

    @Mock
    private GeneralConfigDao generalConfigDao;

    @InjectMocks
    private DashboardService dashboardService;

    static final String GRAFANA_API_RESULT = "{"
            + "  \"folderUid\": \"\","
            + "  \"id\": 3,"
            + "  \"slug\": \"prometheus-dashboard\","
            + "  \"status\": \"success\","
            + "  \"uid\": \"5d7d89b0-b273-40fe-bb30-d652b82f47eb\","
            + "  \"url\": \"/d/5d7d89b0-b273-40fe-bb30-d652b82f47eb/prometheus-dashboard\","
            + "  \"version\": 3"
            + "}";



    @BeforeEach
    void setUp() {
        lenient().when(datasourceService.getCurrentDatasourceName()).thenReturn("hertzbeat-vm-localhost-8428");
        lenient().when(grafanaProperties.enabled()).thenReturn(Boolean.TRUE);
        lenient().when(grafanaProperties.getPrefix()).thenReturn("");
        lenient().when(grafanaProperties.getUrl()).thenReturn("http://127.0.0.1:3000");
        lenient().when(grafanaProperties.exposeUrl()).thenReturn("http://127.0.0.1:3000");
        lenient().when(serviceAccountService.getToken()).thenReturn("test-token");
    }


    @Test
    void testCreateOrUpdateDashboard() {
        ResponseEntity<String> responseEntity = new ResponseEntity<>(GRAFANA_API_RESULT, HttpStatus.OK);

        when(restTemplate.postForEntity(
                eq("http://127.0.0.1:3000/api/dashboards/db"), any(HttpEntity.class), eq(String.class)
        )).thenReturn(responseEntity);

        ArgumentCaptor<GrafanaDashboard> dashboardCaptor = ArgumentCaptor.forClass(GrafanaDashboard.class);
        dashboardService.createOrUpdateDashboard("{\"id\":11}", 1L);
        verify(dashboardDao).save(dashboardCaptor.capture());

        GrafanaDashboard savedDashboard = dashboardCaptor.getValue();
        assertNotNull(savedDashboard);
        assertNotNull(savedDashboard.getUrl());

        String expectedBaseUrl = "http://127.0.0.1:3000/d/5d7d89b0-b273-40fe-bb30-d652b82f47eb";

        // Verify that the URL begins with the expected base URL.
        assertTrue(savedDashboard.getUrl().startsWith(expectedBaseUrl), "URL should start with: " + expectedBaseUrl + ", but was: " + savedDashboard.getUrl());

        assertTrue(savedDashboard.getUrl().contains("kiosk=tv"), "URL should contain kiosk parameter");
        assertTrue(savedDashboard.getUrl().contains("refresh=15s"), "URL should contain refresh parameter");
        assertTrue(savedDashboard.getUrl().contains("var-instance=1"), "URL should contain instance parameter");
    }

    @Test
    void testCreateOrUpdateDashboardWithTrailingSlash() {
        when(grafanaProperties.exposeUrl()).thenReturn("http://127.0.0.1:3000/");

        ResponseEntity<String> responseEntity = new ResponseEntity<>(GRAFANA_API_RESULT, HttpStatus.OK);

        when(restTemplate.postForEntity(
                eq("http://127.0.0.1:3000/api/dashboards/db"), any(HttpEntity.class), eq(String.class)
        )).thenReturn(responseEntity);

        ArgumentCaptor<GrafanaDashboard> dashboardCaptor = ArgumentCaptor.forClass(GrafanaDashboard.class);
        dashboardService.createOrUpdateDashboard("{\"id\":11}", 1L);
        verify(dashboardDao).save(dashboardCaptor.capture());

        GrafanaDashboard savedDashboard = dashboardCaptor.getValue();
        assertNotNull(savedDashboard);
        assertNotNull(savedDashboard.getUrl());

        String expectedBaseUrl = "http://127.0.0.1:3000/d/5d7d89b0-b273-40fe-bb30-d652b82f47eb";

        // Verify that the URL begins with the expected base URL.
        assertTrue(savedDashboard.getUrl().startsWith(expectedBaseUrl), "URL should start with: " + expectedBaseUrl + ", but was: " + savedDashboard.getUrl());

        assertTrue(savedDashboard.getUrl().contains("kiosk=tv"), "URL should contain kiosk parameter");
        assertTrue(savedDashboard.getUrl().contains("refresh=15s"), "URL should contain refresh parameter");
        assertTrue(savedDashboard.getUrl().contains("var-instance=1"), "URL should contain instance parameter");
    }


    @Test
    void testGetDashboardByMonitorId() {
        Long monitorId = 1L;
        String originalUrl = "http://localhost:3000/d/123/my-dashboard?kiosk";
        GrafanaDashboard originalDashboard = GrafanaDashboard.builder()
                .monitorId(monitorId)
                .url(originalUrl)
                .build();

        when(dashboardDao.findByMonitorId(eq(monitorId))).thenReturn(originalDashboard);

        String themeConfigJson = "{\"theme\":\"light\"}";
        org.apache.hertzbeat.common.entity.manager.GeneralConfig runConfig = new org.apache.hertzbeat.common.entity.manager.GeneralConfig();
        runConfig.setContent(themeConfigJson);

        when(generalConfigDao.findByType(eq(org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum.system.name())))
                .thenReturn(runConfig);

        GrafanaDashboard resultDashboard = dashboardService.getDashboardByMonitorId(monitorId);

        assertNotNull(resultDashboard);
        assertTrue(resultDashboard.getUrl().contains("&theme=light"));
        assertTrue(originalDashboard.getUrl().endsWith("?kiosk"));
        assertFalse(originalDashboard.getUrl().contains("&theme="));
    }

}
