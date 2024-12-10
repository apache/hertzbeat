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

package org.apache.hertzbeat.collector.collect.registry;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import java.util.ArrayList;
import java.util.List;

import org.apache.hertzbeat.collector.collect.common.MetricsDataBuilder;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClientManagement;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorReader;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorReaderImpl;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorWriterImpl;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link RegistryImpl}
 */
@ExtendWith(MockitoExtension.class)
class RegistryImplTest {
    @InjectMocks
    @Spy
    private RegistryImpl registry;

    @Mock
    private DiscoveryClient client;

    @Mock
    private DiscoveryClientManagement discoveryClientManagement;

    @Test
    void testServerCollect() throws Exception {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder().setId(1L).setApp("test");

        String port = "123";
        String host = "127.0.0.1";
        RegistryProtocol registryProtocol = RegistryProtocol.builder()
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
        metrics.setRegistry(registryProtocol);
        metrics.setAliasFields(aliasField);

        Mockito.when(discoveryClientManagement.getClient(registryProtocol)).thenReturn(client);
        ServerInfo serverInfo = ServerInfo.builder()
                .address(host)
                .port(port)
                .build();
        Mockito.when(client.getServerInfo()).thenReturn(serverInfo);
        registry.setDiscoveryClientManagement(discoveryClientManagement);
        registry.preCheck(metrics);

        try (final ArrowVectorWriterImpl arrowVectorWriter = new ArrowVectorWriterImpl(metrics.getAliasFields())) {
            final MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(builder, arrowVectorWriter);
            registry.collect(metricsDataBuilder, metrics);

            final CollectRep.MetricsData metricsData = metricsDataBuilder.build();
            try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(metricsData.getData().toByteArray())) {
                RowWrapper rowWrapper = arrowVectorReader.readRow();
                while (rowWrapper.hasNextRow()) {
                    rowWrapper = rowWrapper.nextRow();

                    assertEquals(host, rowWrapper.nextCell().getValue());
                    assertEquals(port, rowWrapper.nextCell().getValue());
                    assertNotNull(rowWrapper.nextCell().getValue());
                }
            }
        }
    }

    @Test
    void testServiceCollect() throws Exception {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder().setId(1L).setApp("test");

        String port = "123";
        String host = "127.0.0.1";
        RegistryProtocol registryProtocol = RegistryProtocol.builder()
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
        metrics.setRegistry(registryProtocol);
        metrics.setAliasFields(aliasField);

        Mockito.when(discoveryClientManagement.getClient(registryProtocol)).thenReturn(client);

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
        registry.setDiscoveryClientManagement(discoveryClientManagement);
        registry.preCheck(metrics);
        try (final ArrowVectorWriterImpl arrowVectorWriter = new ArrowVectorWriterImpl(metrics.getAliasFields())) {
            final MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(builder, arrowVectorWriter);
            registry.collect(metricsDataBuilder, metrics);

            final CollectRep.MetricsData metricsData = metricsDataBuilder.build();
            try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(metricsData.getData().toByteArray())) {
                assertEquals(arrowVectorReader.getRowCount(), 1);

                RowWrapper rowWrapper = arrowVectorReader.readRow();
                while (rowWrapper.hasNextRow()) {
                    rowWrapper = rowWrapper.nextRow();

                    assertEquals(serviceId, rowWrapper.nextCell().getValue());
                    assertEquals(serviceName, rowWrapper.nextCell().getValue());
                    assertEquals(host, rowWrapper.nextCell().getValue());
                    assertEquals(port, rowWrapper.nextCell().getValue());
                }
            }
        }
    }

}