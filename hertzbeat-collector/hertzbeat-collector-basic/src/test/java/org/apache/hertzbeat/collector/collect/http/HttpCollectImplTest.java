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

package org.apache.hertzbeat.collector.collect.http;

import com.google.common.collect.Lists;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test case for {@link HttpCollectImpl}
 */
class HttpCollectImplTest {
    private HttpCollectImpl httpCollectImpl;

    @BeforeEach
    void setUp() {
        httpCollectImpl = new HttpCollectImpl();
    }

    @Test
    void preCheck() {
        assertThrows(IllegalArgumentException.class, () -> {
            httpCollectImpl.preCheck(null);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = Metrics.builder().build();
            httpCollectImpl.preCheck(metrics);
        });
    }

    @Test
    void collect() {
        HttpProtocol http = HttpProtocol.builder().build();
        http.setMethod("POST");
        Metrics metrics = Metrics.builder()
                .http(http)
                .build();
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        httpCollectImpl.collect(builder, metrics);
    }

    @Test
    void supportProtocol() {
        String protocol = httpCollectImpl.supportProtocol();
        assert "http".equals(protocol);
    }

    @Test
    void parseResponseByWebsite() {
        HttpProtocol http = HttpProtocol.builder().build();
        http.setMethod("GET");
        http.setHost("http://127.0.0.1");
        http.setUrl("/");
        http.setPort("8428");
        http.setParseType("website");
        http.setEnableUrlEncoding("true");
        Metrics metrics = Metrics.builder()
                .http(http)
                .aliasFields(Lists.newArrayList("responseTime", "keyword", "statusCode"))
                .build();
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        httpCollectImpl.collect(builder, metrics);

        assertNotNull(builder.getValuesList());
        for (CollectRep.ValueRow row : builder.getValuesList()) {
            assertNotNull(row.getColumns(0));
            assertEquals(row.getColumns(1), "0");
            assertEquals(row.getColumns(2), "200");
        }
    }

    @Test
    void parseResponseByXmlPath() throws Exception {
        // Create a sample XML response
        String xmlResponse = """
                <?xml version="1.0" encoding="UTF-8"?>
                <root>
                    <server>
                        <name>Server1</name>
                        <status>Running</status>
                        <metrics>
                            <cpu>75.5</cpu>
                            <memory>1024</memory>
                            <disk>500</disk>
                        </metrics>
                    </server>
                    <server>
                        <name>Server2</name>
                        <status>Stopped</status>
                        <metrics>
                            <cpu>0.0</cpu>
                            <memory>0</memory>
                            <disk>500</disk>
                        </metrics>
                    </server>
                </root>
                """;
    
        // Set up HttpProtocol with XML path parsing
        HttpProtocol http = HttpProtocol.builder()
                .parseType(DispatchConstants.PARSE_XML_PATH)
                .parseScript("//server")  // XPath to select all server nodes
                .build();
    
        // Set up Metrics with fields that have XPath expressions
        List<Metrics.Field> fields = new ArrayList<>();
        fields.add(Metrics.Field.builder().field("name").build());
        fields.add(Metrics.Field.builder().field("status").build());
        fields.add(Metrics.Field.builder().field("metrics/cpu").build());
        fields.add(Metrics.Field.builder().field("metrics/memory").build());
    
        Metrics metrics = Metrics.builder()
                .http(http)
                .fields(fields)
                .aliasFields(Arrays.asList("name", "status", "metrics/cpu", "metrics/memory"))
                .build();
    
        // Create a custom builder that captures added rows
        List<CollectRep.ValueRow> capturedRows = new ArrayList<>();
        CollectRep.MetricsData.Builder builder = new CollectRep.MetricsData.Builder() {
            @Override
            public CollectRep.MetricsData.Builder addValueRow(CollectRep.ValueRow valueRow) {
                capturedRows.add(valueRow);
                return super.addValueRow(valueRow);
            }
        };
    
        // Use reflection to access the private parseResponseByXmlPath method
        Method parseMethod = HttpCollectImpl.class.getDeclaredMethod(
                "parseResponseByXmlPath", 
                String.class, 
                Metrics.class, 
                CollectRep.MetricsData.Builder.class, 
                Long.class);
        parseMethod.setAccessible(true);
    
        // Call the method
        parseMethod.invoke(httpCollectImpl, xmlResponse, metrics, builder, 100L);
    
        // Verify the results
        assertEquals(2, capturedRows.size(), "Should have parsed 2 server nodes");
    
        // Check first server
        CollectRep.ValueRow firstRow = capturedRows.get(0);
        assertEquals(4, firstRow.getColumnsCount(), "First row should have 4 columns");
        assertEquals("Server1", firstRow.getColumns(0), "First server name should be Server1");
        assertEquals("Running", firstRow.getColumns(1), "First server status should be Running");
        assertEquals("75.5", firstRow.getColumns(2), "First server CPU should be 75.5");
        assertEquals("1024", firstRow.getColumns(3), "First server memory should be 1024");
    
        // Check second server
        CollectRep.ValueRow secondRow = capturedRows.get(1);
        assertEquals(4, secondRow.getColumnsCount(), "Second row should have 4 columns");
        assertEquals("Server2", secondRow.getColumns(0), "Second server name should be Server2");
        assertEquals("Stopped", secondRow.getColumns(1), "Second server status should be Stopped");
        assertEquals("0.0", secondRow.getColumns(2), "Second server CPU should be 0.0");
        assertEquals("0", secondRow.getColumns(3), "Second server memory should be 0");
    }

    @Test
    void parseResponseByJsonPath() throws Exception {
        String jsonResponse = "{"
                + "  \"name\": \"jvm.memory.used\","
                + "  \"description\": \"The amount of used memory\","
                + "  \"baseUnit\": \"bytes\","
                + "  \"measurements\": ["
                + "    {"
                + "      \"statistic\": \"VALUE\","
                + "      \"value\": 90282296"
                + "    }"
                + "  ],"
                + "  \"availableTags\": ["
                + "    {"
                + "      \"tag\": \"area\","
                + "      \"values\": ["
                + "        \"heap\","
                + "        \"nonheap\""
                + "      ]"
                + "    },"
                + "    {"
                + "      \"tag\": \"id\","
                + "      \"values\": ["
                + "        \"G1 Survivor Space\","
                + "        \"G1 Eden Space\""
                + "      ]"
                + "    }"
                + "  ]"
                + "}";

        HttpProtocol http = HttpProtocol.builder()
                .parseType(DispatchConstants.PARSE_JSON_PATH)
                .parseScript("$.availableTags[?(@.tag == \"id\")].values[*]")
                .build();
        List<CollectRep.ValueRow> capturedRows = new ArrayList<>();
        CollectRep.MetricsData.Builder builder = new CollectRep.MetricsData.Builder() {
            @Override
            public CollectRep.MetricsData.Builder addValueRow(CollectRep.ValueRow valueRow) {
                capturedRows.add(valueRow);
                return super.addValueRow(valueRow);
            }
        };
        Method parseMethod = HttpCollectImpl.class.getDeclaredMethod(
                "parseResponseByJsonPath",
                String.class,
                List.class,
                HttpProtocol.class,
                CollectRep.MetricsData.Builder.class,
                Long.class);
        parseMethod.setAccessible(true);

        // Call the method
        parseMethod.invoke(httpCollectImpl, jsonResponse, Lists.newArrayList("id"), http, builder, 100L);

        // Verify the results
        assertEquals(2, capturedRows.size());
        CollectRep.ValueRow firstRow = capturedRows.get(0);
        assertEquals("G1 Survivor Space", firstRow.getColumns(0));
        CollectRep.ValueRow secondRow = capturedRows.get(1);
        assertEquals("G1 Eden Space", secondRow.getColumns(0));

        // number
        String numberJson = "{"
                + "  \"name\": \"system.cpu.usage\","
                + "  \"description\": \"The \\\"recent cpu usage\\\" of the system the application is running in\","
                + "  \"measurements\": ["
                + "    {"
                + "      \"statistic\": \"VALUE\","
                + "      \"value\": 0.268751364291017"
                + "    }"
                + "  ],"
                + "  \"availableTags\": []"
                + "}";
        http = HttpProtocol.builder()
                .parseType(DispatchConstants.PARSE_JSON_PATH)
                .parseScript("$.measurements[?(@.statistic == \"VALUE\")].value")
                .build();
        capturedRows.clear();
        builder = new CollectRep.MetricsData.Builder() {
            @Override
            public CollectRep.MetricsData.Builder addValueRow(CollectRep.ValueRow valueRow) {
                capturedRows.add(valueRow);
                return super.addValueRow(valueRow);
            }
        };
        parseMethod = HttpCollectImpl.class.getDeclaredMethod(
                "parseResponseByJsonPath",
                String.class,
                List.class,
                HttpProtocol.class,
                CollectRep.MetricsData.Builder.class,
                Long.class);
        parseMethod.setAccessible(true);

        // Call the method
        parseMethod.invoke(httpCollectImpl, numberJson, Lists.newArrayList("usage"), http, builder, 100L);

        // Verify the results
        assertEquals(1, capturedRows.size());
        firstRow = capturedRows.get(0);
        assertEquals("0.268751364291017", firstRow.getColumns(0));
    }
}
