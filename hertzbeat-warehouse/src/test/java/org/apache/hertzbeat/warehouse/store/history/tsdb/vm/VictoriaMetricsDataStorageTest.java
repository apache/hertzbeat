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

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.ArrowCell;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Test case for {@link VictoriaMetricsDataStorage}
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VictoriaMetricsDataStorageTest {

    @Mock
    private VictoriaMetricsProperties victoriaMetricsProperties;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ResponseEntity<String> responseEntity;

    private VictoriaMetricsDataStorage victoriaMetricsDataStorage;

    @BeforeEach
    void setUp() {
        when(victoriaMetricsProperties.enabled()).thenReturn(true);
        when(victoriaMetricsProperties.url()).thenReturn("http://localhost:8428");
        when(victoriaMetricsProperties.username()).thenReturn("root");
        when(victoriaMetricsProperties.password()).thenReturn("root");
        // on successful write, VictoriaMetrics returns HTTP 204 (No Content)
        when(responseEntity.getStatusCode()).thenReturn(HttpStatus.NO_CONTENT);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);
    }

    @Test
    void testSaveDataInitialization() {
        // using the default insertion policy, schedule a task once upon object instantiation (with second-level time granularity)
        victoriaMetricsDataStorage = new VictoriaMetricsDataStorage(victoriaMetricsProperties, restTemplate);
        // execute one-time data insertion
        victoriaMetricsDataStorage.saveData(generateMockedMetricsData());
        // wait for the timer's first insertion task execution and verify if it was called once
        Awaitility.await().atMost(5, TimeUnit.SECONDS).untilAsserted(() ->
                verify(restTemplate, times(1)).postForEntity(
                        startsWith(victoriaMetricsProperties.url()),
                        any(HttpEntity.class),
                        eq(String.class)
                )
        );
    }

    @Test
    void testSaveDataBySize() {
        // verify insert process for buffer size, with the flush interval defined as an unreachable state
        when(victoriaMetricsProperties.insert()).thenReturn(new VictoriaMetricsProperties.InsertConfig(
                10, Integer.MAX_VALUE, new VictoriaMetricsProperties.Compression(false)));
        victoriaMetricsDataStorage = new VictoriaMetricsDataStorage(victoriaMetricsProperties, restTemplate);

        victoriaMetricsDataStorage.saveData(generateMockedMetricsData());
        // wait for the timer to execute its first insertion task
        Awaitility.await().atMost(5, TimeUnit.SECONDS).untilAsserted(() ->
                verify(restTemplate, times(1)).postForEntity(
                        startsWith(victoriaMetricsProperties.url()),
                        any(HttpEntity.class),
                        eq(String.class)
                )
        );

        // triggers the buffer size insertion condition
        for (int i = 0; i < 10 * 0.8; i++) {
            victoriaMetricsDataStorage.saveData(generateMockedMetricsData());
        }
        // wait for the timer to execute the task again
        Awaitility.await().atMost(5, TimeUnit.SECONDS).untilAsserted(() ->
                verify(restTemplate, times(2)).postForEntity(
                        startsWith(victoriaMetricsProperties.url()),
                        any(HttpEntity.class),
                        eq(String.class)
                )
        );
    }

    @Test
    void testSaveDataByTime() {
        // verify insert process for flush interval and set the buffer size to an unreachable state
        when(victoriaMetricsProperties.insert()).thenReturn(new VictoriaMetricsProperties.InsertConfig(
                10000, 2, new VictoriaMetricsProperties.Compression(false)));
        victoriaMetricsDataStorage = new VictoriaMetricsDataStorage(victoriaMetricsProperties, restTemplate);

        victoriaMetricsDataStorage.saveData(generateMockedMetricsData());
        // wait for the timer to execute its first insertion task
        Awaitility.await().atMost(5, TimeUnit.SECONDS).untilAsserted(() ->
                verify(restTemplate, times(1)).postForEntity(
                        startsWith(victoriaMetricsProperties.url()),
                        any(HttpEntity.class),
                        eq(String.class)
                )
        );

        victoriaMetricsDataStorage.saveData(generateMockedMetricsData());
        // wait for the flush interval to be triggered
        Awaitility.await().atMost(5, TimeUnit.SECONDS).untilAsserted(() ->
                verify(restTemplate, times(2)).postForEntity(
                        startsWith(victoriaMetricsProperties.url()),
                        any(),
                        eq(String.class)
        ));
    }

    @AfterEach
    void stop() {
        if (victoriaMetricsDataStorage != null) {
            victoriaMetricsDataStorage.destroy();
        }
    }

    // for historical data insertion (which mandates preparatory steps), instantiate a mock MetricsData object
    public static CollectRep.MetricsData generateMockedMetricsData() {
        CollectRep.MetricsData mockMetricsData = Mockito.mock(CollectRep.MetricsData.class);

        when(mockMetricsData.getId()).thenReturn(0L);
        when(mockMetricsData.getMetrics()).thenReturn("cpu");
        when(mockMetricsData.getTime()).thenReturn(System.currentTimeMillis());
        when(mockMetricsData.getCode()).thenReturn(CollectRep.Code.SUCCESS);
        when(mockMetricsData.getApp()).thenReturn("app");

        CollectRep.ValueRow mockValueRow = Mockito.mock(CollectRep.ValueRow.class);
        List<String> columnValues = List.of("server-test-01", "68.7");
        when(mockValueRow.getColumnsList()).thenReturn(columnValues);
        when(mockValueRow.getColumns(0)).thenReturn("server-test-01");
        when(mockValueRow.getColumns(1)).thenReturn("68.7");
        List<CollectRep.ValueRow> mockValueRowsList = List.of(mockValueRow);
        when(mockMetricsData.getValues()).thenReturn(mockValueRowsList);

        CollectRep.Field instanceField = Mockito.mock(CollectRep.Field.class);
        when(instanceField.getName()).thenReturn("instance");
        CollectRep.Field usageField = Mockito.mock(CollectRep.Field.class);
        when(usageField.getName()).thenReturn("usage");
        CollectRep.Field systemField = Mockito.mock(CollectRep.Field.class);
        when(systemField.getName()).thenReturn("system");
        List<CollectRep.Field> mockFields = List.of(instanceField, usageField, systemField);
        when(mockMetricsData.getFields()).thenReturn(mockFields);

        ArrowType instanceArrowType = new ArrowType.Utf8();
        FieldType instanceFieldType = new FieldType(true, instanceArrowType, null, null);
        Field instanceRealField = new Field("instance", instanceFieldType, null);
        ArrowCell instanceCell = Mockito.mock(ArrowCell.class);
        when(instanceCell.getField()).thenReturn(instanceRealField);
        when(instanceCell.getValue()).thenReturn("server-test-01");
        when(instanceCell.getMetadataAsBoolean(MetricDataConstants.LABEL)).thenReturn(true);
        when(instanceCell.getMetadataAsByte(MetricDataConstants.TYPE)).thenReturn(CommonConstants.TYPE_STRING);

        ArrowCell usageCell = Mockito.mock(ArrowCell.class);
        when(usageCell.getField()).thenReturn(instanceRealField);
        when(usageCell.getValue()).thenReturn("68.7");
        when(usageCell.getMetadataAsBoolean(MetricDataConstants.LABEL)).thenReturn(false);
        when(usageCell.getMetadataAsByte(MetricDataConstants.TYPE)).thenReturn(CommonConstants.TYPE_NUMBER);
        List<ArrowCell> mockCells = List.of(instanceCell, usageCell);

        RowWrapper mockRowWrapper = Mockito.mock(RowWrapper.class);
        when(mockRowWrapper.hasNextRow()).thenReturn(true).thenReturn(false);
        when(mockRowWrapper.nextRow()).thenReturn(mockRowWrapper);
        when(mockRowWrapper.cellStream()).thenAnswer(invocation -> mockCells.stream());
        when(mockMetricsData.readRow()).thenReturn(mockRowWrapper);
        return mockMetricsData;
    }

}
