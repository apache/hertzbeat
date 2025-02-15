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

package org.apache.hertzbeat.collector.collect.nebulagraph;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NgqlProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link NgqlCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class NgqlCollectImplTest {

    @InjectMocks
    private NgqlCollectImpl ngqlCollect;

    private NgqlProtocol ngqlProtocol;

    @BeforeEach
    public void init() {
        ngqlProtocol = NgqlProtocol.builder()
                .host("127.0.0.1")
                .port("9669")
                .password("123456")
                .username("root")
                .timeout("60000").build();
    }

    @Test
    void testOneRowCollect() {
        String ngql = "SHOW COLLATION;";
        String charset = "utf8";
        String collation = "utf8_bin";
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        ngqlProtocol.setCommands(Collections.singletonList(ngql));
        ngqlProtocol.setParseType("oneRow");
        List<String> aliasField = Arrays.asList("Collation", "Charset");

        List<Map<String, Object>> result = new ArrayList<>();
        Map<String, Object> data = new HashMap<>();
        data.put("Collation", "utf8_bin");
        data.put("Charset", "utf8");
        result.add(data);

        MockedConstruction<NebulaTemplate> mocked =
                Mockito.mockConstruction(NebulaTemplate.class, (template, context) -> {
                    Mockito.doNothing().when(template).closeSessionAndPool();
                    Mockito.when(template.initSession(ngqlProtocol)).thenReturn(true);
                    Mockito.when(template.executeCommand(ngql)).thenReturn(result);
                });

        Metrics metrics = new Metrics();
        metrics.setNgql(ngqlProtocol);
        metrics.setAliasFields(aliasField);
        ngqlCollect.preCheck(metrics);
        ngqlCollect.collect(builder, metrics);
        Assertions.assertEquals(builder.getValuesCount(), 1);
        Assertions.assertEquals(builder.getValues(0).getColumns(0), collation);
        Assertions.assertEquals(builder.getValues(0).getColumns(1), charset);
        mocked.close();
    }

    @Test
    void testFilterCountCollect() {
        String command = "offline#SHOW HOSTS#Status#OFFLINE";
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        ngqlProtocol.setCommands(Collections.singletonList(command));
        ngqlProtocol.setParseType("filterCount");
        List<String> aliasField = Collections.singletonList("offline");

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Map<String, Object> data = new HashMap<>();
            data.put("Host", "graph" + 0);
            data.put("Port", "9669");
            data.put("Status", i == 0 ? "OFFLINE" : "ONLINE");
            result.add(data);
        }
        MockedConstruction<NebulaTemplate> mocked =
                Mockito.mockConstruction(NebulaTemplate.class, (template, context) -> {
                    Mockito.doNothing().when(template).closeSessionAndPool();
                    Mockito.when(template.initSession(ngqlProtocol)).thenReturn(true);
                    Mockito.when(template.executeCommand("SHOW HOSTS")).thenReturn(result);
                });

        Metrics metrics = new Metrics();
        metrics.setNgql(ngqlProtocol);
        metrics.setAliasFields(aliasField);
        ngqlCollect.preCheck(metrics);
        ngqlCollect.collect(builder, metrics);
        Assertions.assertEquals(1, builder.getValuesCount());
        Assertions.assertEquals("1", builder.getValues(0).getColumns(0));
        mocked.close();
    }

    @Test
    void testMultiRowCollect() {
        String command = "SHOW HOSTS";
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        ngqlProtocol.setCommands(Collections.singletonList(command));
        ngqlProtocol.setParseType("multiRow");
        List<String> aliasField = Arrays.asList("Host", "Port", "Status");

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("Host", "graph" + i);
            data.put("Port", "9669");
            data.put("Status", i == 0 ? "OFFLINE" : "ONLINE");
            result.add(data);
        }
        MockedConstruction<NebulaTemplate> mocked =
                Mockito.mockConstruction(NebulaTemplate.class, (template, context) -> {
                    Mockito.doNothing().when(template).closeSessionAndPool();
                    Mockito.when(template.initSession(ngqlProtocol)).thenReturn(true);
                    Mockito.when(template.executeCommand(command)).thenReturn(result);
                });

        Metrics metrics = new Metrics();
        metrics.setNgql(ngqlProtocol);
        metrics.setAliasFields(aliasField);
        ngqlCollect.preCheck(metrics);
        ngqlCollect.collect(builder, metrics);
        Assertions.assertEquals(3, builder.getValuesCount());
        for (int i = 0; i < result.size(); i++) {
            List<Map.Entry<String, Object>> list = new ArrayList<>(result.get(i).entrySet());
            for (int j = 0; j < list.size(); j++) {
                Assertions.assertEquals(list.get(j).getValue().toString(), builder.getValues(i).getColumns(j));
            }
        }
        mocked.close();
    }

    @Test
    void testColumnsCollect() {
        String command = "SHOW HOSTS";
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        ngqlProtocol.setCommands(Collections.singletonList(command));
        ngqlProtocol.setParseType("columns");
        List<String> aliasField = Arrays.asList("graph0", "graph1", "graph2");

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("Host", "graph" + i);
            data.put("Port", "9669" + i);
            data.put("Status", i == 0 ? "OFFLINE" : "ONLINE");
            result.add(data);
        }
        MockedConstruction<NebulaTemplate> mocked =
                Mockito.mockConstruction(NebulaTemplate.class, (template, context) -> {
                    Mockito.doNothing().when(template).closeSessionAndPool();
                    Mockito.when(template.initSession(ngqlProtocol)).thenReturn(true);
                    Mockito.when(template.executeCommand(command)).thenReturn(result);
                });

        Metrics metrics = new Metrics();
        metrics.setNgql(ngqlProtocol);
        metrics.setAliasFields(aliasField);
        ngqlCollect.preCheck(metrics);
        ngqlCollect.collect(builder, metrics);
        Assertions.assertEquals(1, builder.getValuesCount());
        for (int i = 0; i < 3; i++) {
            Assertions.assertEquals("9669" + i, builder.getValues(0).getColumns(i));
        }
        mocked.close();
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_NGQL, ngqlCollect.supportProtocol());
    }
}
