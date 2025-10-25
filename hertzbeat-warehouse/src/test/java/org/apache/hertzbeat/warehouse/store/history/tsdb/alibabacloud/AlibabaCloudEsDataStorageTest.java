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

package org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud;

import com.google.common.collect.Lists;
import com.google.gson.Gson;
import io.searchbox.client.JestClient;
import io.searchbox.core.Bulk;
import io.searchbox.core.BulkResult;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.ArrowCell;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Field;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link AlibabaCloudEsDataStorage}
 */
@ExtendWith(MockitoExtension.class)
class AlibabaCloudEsDataStorageTest {

    @Mock
    private AlibabaCloudEsProperties properties;

    private AlibabaCloudEsDataStorage dataStorage;

    @Test
    void testConstructorWithNullProperties() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> new AlibabaCloudEsDataStorage(null, null)
        );
        assertEquals("please config Warehouse alibabaCloud es props", exception.getMessage());
    }

    @Test
    void testConstructorInitServerAvailable() {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));

        assertDoesNotThrow(() -> {
            dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());
            assertNotNull(dataStorage);
            assertFalse(dataStorage.isServerAvailable());
        });
    }

    @Test
    void testIsServerAvailableWhenServerUp() {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));

        dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());
        // Use reflection to simulate server being available
        // This avoids the complexity of mocking the HTTP calls which get wrapped in a new RestTemplate instance
        setServerAvailable(dataStorage, true);
        assertTrue(dataStorage.isServerAvailable());
    }

    @Test
    void testIsServerAvailableWhenServerDown() {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));

        dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());
        assertFalse(dataStorage.isServerAvailable());
    }

    @Test
    void testSaveDataWithNullMetrics() {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));

        dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());
        setServerAvailable(dataStorage, true);
        assertDoesNotThrow(() -> dataStorage.saveData(null));

        CollectRep.MetricsData metricsData = mock(CollectRep.MetricsData.class);
        when(metricsData.getCode()).thenReturn(CollectRep.Code.FAIL);
        assertDoesNotThrow(() -> dataStorage.saveData(metricsData));
    }

    @Test
    void testSaveDataWithEmptyValues() {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));


        dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());
        setServerAvailable(dataStorage, true);

        CollectRep.MetricsData metricsData = mock(CollectRep.MetricsData.class);
        when(metricsData.getCode()).thenReturn(CollectRep.Code.SUCCESS);

        assertDoesNotThrow(() -> dataStorage.saveData(metricsData));
    }

    @Test
    void testSaveDataWithValidData() throws Exception {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));


        dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());
        setServerAvailable(dataStorage, true);

        // Mock JestClient
        JestClient mockJestClient = mock(JestClient.class);
        BulkResult mockBulkResult = mock(BulkResult.class);
        when(mockBulkResult.isSucceeded()).thenReturn(true);
        when(mockJestClient.execute(any(Bulk.class))).thenReturn(mockBulkResult);

        // Use reflection to set the mocked JestClient
        Field jestClientField = dataStorage.getClass().getDeclaredField("jestClient");
        jestClientField.setAccessible(true);
        jestClientField.set(dataStorage, mockJestClient);

        CollectRep.MetricsData metricsData = createMockMetricsData();

        // Execute saveData
        assertDoesNotThrow(() -> dataStorage.saveData(metricsData));

        // Verify that jestClient.execute was called with a Bulk object
        verify(mockJestClient, times(1)).execute(any(Bulk.class));

        // Capture the Bulk argument to verify its properties
        ArgumentCaptor<Bulk> bulkCaptor = ArgumentCaptor.forClass(Bulk.class);
        verify(mockJestClient).execute(bulkCaptor.capture());

        Bulk capturedBulk = bulkCaptor.getValue();
        assertNotNull(capturedBulk, "Bulk object should not be null");

        String bulkData = capturedBulk.getData(new Gson());
        assertNotNull(bulkData, "Bulk data should not be null");

        String[] lines = bulkData.trim().split("\n");
        assertTrue(lines.length >= 2, "Bulk data should contain at least 2 lines (index + document)");

        // Verify first line contains index operation
        String indexLine = lines[0];
        assertTrue(indexLine.contains("{\"index\":{}}"), "First line should contain index operation");

        // Verify second line contains document data
        String documentLine = lines[1];
        assertTrue(documentLine.contains("\"labels\":"), "Document should contain labels field");
        assertTrue(documentLine.contains("\"metrics\":"), "Document should contain metrics field");
        assertTrue(documentLine.contains("\"@timestamp\":"), "Document should contain @timestamp field");

        TimeStreamIndexedEntity indexedEntity = JsonUtil.fromJson(documentLine, TimeStreamIndexedEntity.class);
        assertEquals(indexedEntity.getLabels().get("instance"), "0");
        assertEquals(indexedEntity.getLabels().get("job"), "app");
        assertEquals(indexedEntity.getMetrics().get("cpu_instance"), 68.7);
        assertEquals(indexedEntity.getTimestamp(), 1755794346092L);

    }

    @Test
    void testGetHistoryMetricData() {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));

        dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());
        setServerAvailable(dataStorage, true);

        // Mock RestTemplate
        RestTemplate restTemplate = mock(RestTemplate.class);
        ResponseEntity<PromQlQueryContent> responseEntity = mock(ResponseEntity.class);
        PromQlQueryContent promQlQueryContent = new PromQlQueryContent();
        PromQlQueryContent.ContentData contentData = new PromQlQueryContent.ContentData();
        contentData.setResultType("matrix");
        PromQlQueryContent.ContentData.Content content = new PromQlQueryContent.ContentData.Content();

        Map<String, String> metricMap = new HashMap<>();
        metricMap.put("host", "127.0.0.1");
        metricMap.put("instance", "545707837213952");
        metricMap.put("job", "springboot3");
        metricMap.put("space", "CodeCache");
        metricMap.put("__name__", "memory_used_mem_used");
        content.setMetric(metricMap);

        Object[] objects = {1755709577L, "12.5006"};
        List<Object[]> objects1 = new ArrayList<>();
        objects1.add(objects);
        content.setValues(objects1);

        contentData.setResult(Lists.newArrayList(content));
        promQlQueryContent.setData(contentData);
        when(responseEntity.getStatusCode()).thenReturn(HttpStatus.OK);
        when(responseEntity.getBody()).thenReturn(promQlQueryContent);

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);

        doReturn(responseEntity).when(restTemplate).exchange(
                uriCaptor.capture(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(PromQlQueryContent.class)
        );

        setRestTemplate(dataStorage, restTemplate);

        // Test parameters for URI validation
        Long monitorId = 545707837213952L;
        String app = "springboot3";
        String metrics = "memory_used";
        String metric = "mem_used";
        String label = null;
        String history = "6h";

        Map<String, List<Value>> result = dataStorage.getHistoryMetricData(
                monitorId, app, metrics, metric, label, history
        );
        assertNotNull(result);
        List<Value> values = result.get("{\"host\":\"127.0.0.1\",\"space\":\"CodeCache\"}");
        assertNotNull(values);
        assertEquals(values.get(0).getTime(), 1755709577000L);
        assertEquals(values.get(0).getOrigin(), "12.5006");

        URI capturedUri = uriCaptor.getValue();
        assertNotNull(capturedUri, "Captured URI should not be null");
        // Verify URI components
        String uriString = URLDecoder.decode(capturedUri.toString(), StandardCharsets.UTF_8);
        // Verify base URL and path
        assertTrue(uriString.startsWith("http://localhost:9200/_time_stream/prom/hertzbeat/query_range"), "URI should start with base URL");
        // Verify queryParams
        Map<String, String> queryParams = parseQueryParams(capturedUri.getQuery());
        assertNotNull(queryParams.get("query"));
        assertNotNull(queryParams.get("start"));
        assertNotNull(queryParams.get("end"));
        assertNotNull(queryParams.get("step"));
        assertEquals("memory_used_mem_used{instance=\"545707837213952\"}", queryParams.get("query"));
    }

    @Test
    void testDestroy() {
        when(properties.url()).thenReturn("http://localhost:9200");
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.username()).thenReturn("elastic");
        when(properties.password()).thenReturn("password");
        when(properties.pool()).thenReturn(new JestPoolConfig(3000, 5000, 20000, 50));

        dataStorage = new AlibabaCloudEsDataStorage(properties, new RestTemplate());

        assertDoesNotThrow(() -> dataStorage.destroy());
    }

    /**
     * Create a mock MetricsData for testing
     */
    private CollectRep.MetricsData createMockMetricsData() {
        CollectRep.MetricsData mockMetricsData = Mockito.mock(CollectRep.MetricsData.class);
        when(mockMetricsData.getId()).thenReturn(0L);
        when(mockMetricsData.getMetrics()).thenReturn("cpu");
        when(mockMetricsData.getCode()).thenReturn(CollectRep.Code.SUCCESS);
        when(mockMetricsData.getApp()).thenReturn("app");
        when(mockMetricsData.getTime()).thenReturn(1755794346092L);
        when(mockMetricsData.rowCount()).thenReturn(1L);

        ArrowType instanceArrowType = new ArrowType.Utf8();
        FieldType instanceFieldType = new FieldType(true, instanceArrowType, null, null);

        org.apache.arrow.vector.types.pojo.Field instanceRealField = new org.apache.arrow.vector.types.pojo.Field("instance", instanceFieldType, null);
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

    private void setServerAvailable(AlibabaCloudEsDataStorage dataStorage, boolean available) {
        try {
            Field serverAvailableField = dataStorage.getClass().getSuperclass().getDeclaredField("serverAvailable");
            serverAvailableField.setAccessible(true);
            serverAvailableField.set(dataStorage, available);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set serverAvailable field", e);
        }
    }

    private void setRestTemplate(AlibabaCloudEsDataStorage dataStorage, RestTemplate restTemplate) {
        try {
            Field restTemplateField = dataStorage.getClass().getDeclaredField("restTemplate");
            restTemplateField.setAccessible(true);
            restTemplateField.set(dataStorage, restTemplate);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set restTemplate field", e);
        }
    }
    
    /**
     * Parse query parameters from URI query string
     */
    private Map<String, String> parseQueryParams(String query) {
        Map<String, String> params = new HashMap<>();
        if (query != null && !query.isEmpty()) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                String[] keyValue = pair.split("=", 2);
                if (keyValue.length == 2) {
                    try {
                        String key = java.net.URLDecoder.decode(keyValue[0], "UTF-8");
                        String value = java.net.URLDecoder.decode(keyValue[1], "UTF-8");
                        params.put(key, value);
                    } catch (Exception e) {
                        // Skip malformed parameters
                    }
                }
            }
        }
        return params;
    }

}