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

package org.apache.hertzbeat.collector.collect.httpsd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClientManagement;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpsdProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link HttpsdImpl}
 */
@ExtendWith(MockitoExtension.class)
class HttpsdImplTest {
    @InjectMocks
    @Spy
    private HttpsdImpl httpsd;

    @Mock
    private DiscoveryClient client;

    @Mock
    private DiscoveryClientManagement discoveryClientManagement;

    @Test
    void testServerCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        String port = "123";
        String host = "127.0.0.1";
        HttpsdProtocol httpsdProtocol = HttpsdProtocol.builder()
                .port(port)
                .host(host)
                .discoveryClientTypeName("consul")
                .build();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("address");
        aliasField.add("port");
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setName("server");
        metrics.setHttpsd(httpsdProtocol);
        metrics.setAliasFields(aliasField);

        Mockito.when(discoveryClientManagement.getClient(httpsdProtocol)).thenReturn(client);
        ServerInfo serverInfo = ServerInfo.builder()
                .address(host)
                .port(port)
                .build();
        Mockito.when(client.getServerInfo()).thenReturn(serverInfo);
        httpsd.setDiscoveryClientManagement(discoveryClientManagement);
        httpsd.preCheck(metrics);
        httpsd.collect(builder, 1L, "test", metrics);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertEquals(host, valueRow.getColumns(0));
            assertEquals(port, valueRow.getColumns(1));
            assertNotNull(valueRow.getColumns(2));
        }
    }

    @Test
    void testServiceCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();

        String port = "123";
        String host = "127.0.0.1";
        HttpsdProtocol httpsdProtocol = HttpsdProtocol.builder()
                .port(port)
                .host(host)
                .discoveryClientTypeName("consul")
                .build();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("serviceId");
        aliasField.add("serviceName");
        aliasField.add("address");
        aliasField.add("port");
        Metrics metrics = new Metrics();
        metrics.setName("service");
        metrics.setHttpsd(httpsdProtocol);
        metrics.setAliasFields(aliasField);

        Mockito.when(discoveryClientManagement.getClient(httpsdProtocol)).thenReturn(client);

        String serviceId = "test";
        String serviceName = "service";
        List<ServiceInstance> serviceInstances = new ArrayList<>();
        serviceInstances.add(ServiceInstance.builder()
                .serviceId(serviceId)
                .serviceName(serviceName)
                .address(host)
                .port(Integer.parseInt(port))
                .build());

        Mockito.when(client.getServices()).thenReturn(serviceInstances);
        httpsd.setDiscoveryClientManagement(discoveryClientManagement);
        httpsd.preCheck(metrics);
        httpsd.collect(builder, 1L, "test", metrics);
        assertEquals(builder.getValuesCount(), 1);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertEquals(serviceId, valueRow.getColumns(0));
            assertEquals(serviceName, valueRow.getColumns(1));
            assertEquals(host, valueRow.getColumns(2));
            assertEquals(port, valueRow.getColumns(3));
        }
    }

}