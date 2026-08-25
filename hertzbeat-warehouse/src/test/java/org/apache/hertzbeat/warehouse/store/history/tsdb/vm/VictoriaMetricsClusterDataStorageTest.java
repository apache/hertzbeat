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

package org.apache.hertzbeat.warehouse.store.history.tsdb.vm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link VictoriaMetricsClusterDataStorage}.
 */
@ExtendWith(MockitoExtension.class)
class VictoriaMetricsClusterDataStorageTest {

    private static final long MONITOR_ID = 599733946907392L;
    private static final String INSTANCE = "hdp-hadoop2:10003";

    @Mock
    private RestTemplate restTemplate;

    private VictoriaMetricsClusterDataStorage dataStorage;

    @BeforeEach
    void setUp() {
        VictoriaMetricsInsertProperties insertProperties = new VictoriaMetricsInsertProperties(
                "http://localhost:8480", "", "", 1, 0);
        VictoriaMetricsSelectProperties selectProperties = new VictoriaMetricsSelectProperties(
                "http://localhost:8481", "", "");
        VictoriaMetricsClusterProperties clusterProperties = new VictoriaMetricsClusterProperties(
                true, "42", insertProperties, selectProperties);
        when(restTemplate.exchange(
                anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"status\":\"success\"}"));
        dataStorage = new VictoriaMetricsClusterDataStorage(clusterProperties, restTemplate);
    }

    @Test
    void shouldQueryHistoryByMonitorIdInsteadOfInstance() {
        when(restTemplate.exchange(
                any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(""));

        dataStorage.getHistoryMetricData(
                MONITOR_ID, INSTANCE, "flink", "taskmanager", "value", "6h");

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).exchange(
                uriCaptor.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class));
        assertUsesMonitorId(uriCaptor.getValue());
    }

    @Test
    void shouldQueryIntervalHistoryByMonitorIdInsteadOfInstance() {
        when(restTemplate.exchange(
                any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(PromQlQueryContent.class)))
                .thenReturn(new ResponseEntity<>(HttpStatus.OK));

        dataStorage.getHistoryIntervalMetricData(
                MONITOR_ID, INSTANCE, "flink", "taskmanager", "value", "1w");

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate, times(4)).exchange(
                uriCaptor.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(PromQlQueryContent.class));
        assertThat(uriCaptor.getAllValues()).allSatisfy(this::assertUsesMonitorId);
    }

    private void assertUsesMonitorId(URI uri) {
        assertThat(uri.getQuery())
                .contains("__monitor_id__=\"" + MONITOR_ID + "\"")
                .doesNotContain("instance=\"" + INSTANCE + "\"");
    }
}
