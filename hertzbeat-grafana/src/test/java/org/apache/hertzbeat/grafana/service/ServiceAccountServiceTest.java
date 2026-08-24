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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.dao.GrafanaConfigDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link ServiceAccountService}.
 */
@ExtendWith(MockitoExtension.class)
class ServiceAccountServiceTest {

    @Mock
    private GrafanaProperties grafanaProperties;

    @Mock
    private GrafanaConfigDao grafanaConfigDao;

    @Mock
    private RestTemplate restTemplate;

    private ServiceAccountService serviceAccountService;

    @BeforeEach
    void setUp() {
        when(grafanaProperties.getPrefix()).thenReturn("https://");
        when(grafanaProperties.getUrl()).thenReturn("grafana.example");
        when(grafanaProperties.username()).thenReturn("admin");
        when(grafanaProperties.password()).thenReturn("password");
        serviceAccountService = new ServiceAccountService(grafanaProperties, grafanaConfigDao, restTemplate);
        serviceAccountService.init();
    }

    @Test
    void keepsGrafanaAuthenticationScopedToTheRequest() {
        when(restTemplate.exchange(
                eq("https://grafana.example/api/serviceaccounts/search"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"serviceAccounts\":[]}"));

        serviceAccountService.getAccounts();

        verify(restTemplate, never()).getInterceptors();
        ArgumentCaptor<HttpEntity<String>> requestCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                eq("https://grafana.example/api/serviceaccounts/search"),
                eq(HttpMethod.GET),
                requestCaptor.capture(),
                eq(String.class));
        assertEquals(
                "Basic YWRtaW46cGFzc3dvcmQ=",
                requestCaptor.getValue().getHeaders().getFirst(NetworkConstants.AUTHORIZATION));
    }
}
