/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.collector.collect.registry.discovery.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.api.naming.NamingFactory;
import com.alibaba.nacos.api.naming.NamingService;
import com.alibaba.nacos.api.naming.pojo.Instance;
import com.alibaba.nacos.api.naming.pojo.ListView;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.collector.collect.registry.constant.DiscoveryClientHealthStatus;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ConnectConfig;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Test case for {@link NacosDiscoveryClient}
 */
@ExtendWith(MockitoExtension.class)
class NacosDiscoveryClientTest {

    private NacosDiscoveryClient nacosDiscoveryClient;

    @Mock
    private NamingService namingService;

    private static final String HOST = "127.0.0.1";
    private static final int PORT = 8848;

    @BeforeEach
    void setUp() {
        nacosDiscoveryClient = new NacosDiscoveryClient();
    }

    @Test
    void testBuildConnectConfig() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host(HOST)
                .port(String.valueOf(PORT))
                .build();

        ConnectConfig config = nacosDiscoveryClient.buildConnectConfig(protocol);

        assertNotNull(config);
        assertEquals(HOST, config.getHost());
        assertEquals(PORT, config.getPort());
    }

    @Test
    void testInitClientSuccess() throws NacosException {
        ConnectConfig config = ConnectConfig.builder().host(HOST).port(PORT).build();

        try (MockedStatic<NamingFactory> mockedFactory = Mockito.mockStatic(NamingFactory.class)) {
            mockedFactory.when(() -> NamingFactory.createNamingService(HOST + ":" + PORT))
                    .thenReturn(namingService);

            nacosDiscoveryClient.initClient(config);

            mockedFactory.verify(() -> NamingFactory.createNamingService(HOST + ":" + PORT));
        }
    }

    @Test
    void testInitClientFailed() throws NacosException {
        ConnectConfig config = ConnectConfig.builder().host(HOST).port(PORT).build();

        try (MockedStatic<NamingFactory> mockedFactory = Mockito.mockStatic(NamingFactory.class)) {
            mockedFactory.when(() -> NamingFactory.createNamingService(anyString()))
                    .thenThrow(new NacosException(500, "connection refused"));

            assertThrows(RuntimeException.class, () -> nacosDiscoveryClient.initClient(config));
        }
    }

    @Test
    void testGetServerInfoWithNullNamingService() {
        assertThrows(NullPointerException.class, () -> nacosDiscoveryClient.getServerInfo());
    }

    @Test
    void testGetServerInfoWhenHealthy() {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.UP);

        ServerInfo serverInfo = nacosDiscoveryClient.getServerInfo();

        assertNotNull(serverInfo);
        assertEquals(HOST, serverInfo.getAddress());
        assertEquals(String.valueOf(PORT), serverInfo.getPort());
    }

    @Test
    void testGetServerInfoWhenNotHealthy() {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.DOWN);

        assertThrows(RuntimeException.class, () -> nacosDiscoveryClient.getServerInfo());
    }

    @Test
    void testGetServicesWithNullNamingService() {
        List<ServiceInstance> result = nacosDiscoveryClient.getServices();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetServicesWhenNotHealthy() {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.DOWN);

        List<ServiceInstance> result = nacosDiscoveryClient.getServices();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetServicesSuccess() throws NacosException {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.UP);

        ListView<String> serviceNames = new ListView<>();
        serviceNames.setData(Collections.singletonList("test-service"));
        when(namingService.getServicesOfServer(0, 9999)).thenReturn(serviceNames);

        Instance instance = new Instance();
        instance.setInstanceId("inst-1");
        instance.setServiceName("test-service");
        instance.setIp("192.168.1.1");
        instance.setPort(9090);
        instance.setWeight(1.0);
        Map<String, String> metadata = new HashMap<>();
        metadata.put("version", "1.0");
        instance.setMetadata(metadata);
        instance.setHealthy(true);

        when(namingService.getAllInstances("test-service")).thenReturn(Collections.singletonList(instance));

        List<ServiceInstance> result = nacosDiscoveryClient.getServices();

        assertNotNull(result);
        assertEquals(1, result.size());
        ServiceInstance serviceInstance = result.get(0);
        assertEquals("inst-1", serviceInstance.getServiceId());
        assertEquals("test-service", serviceInstance.getServiceName());
        assertEquals("192.168.1.1", serviceInstance.getAddress());
        assertEquals(9090, serviceInstance.getPort());
        assertEquals(DiscoveryClientHealthStatus.UP, serviceInstance.getHealthStatus());
    }

    @Test
    void testGetServicesWithUnhealthyInstance() throws NacosException {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.UP);

        ListView<String> serviceNames = new ListView<>();
        serviceNames.setData(Collections.singletonList("test-service"));
        when(namingService.getServicesOfServer(0, 9999)).thenReturn(serviceNames);

        Instance instance = new Instance();
        instance.setInstanceId("inst-down");
        instance.setServiceName("test-service");
        instance.setIp("10.0.0.1");
        instance.setPort(8080);
        instance.setWeight(1.0);
        instance.setHealthy(false);

        when(namingService.getAllInstances("test-service")).thenReturn(Collections.singletonList(instance));

        List<ServiceInstance> result = nacosDiscoveryClient.getServices();

        assertEquals(1, result.size());
        assertEquals(DiscoveryClientHealthStatus.DOWN, result.get(0).getHealthStatus());
    }

    @Test
    void testGetServicesThrowsNacosException() throws NacosException {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.UP);
        when(namingService.getServicesOfServer(anyInt(), anyInt()))
                .thenThrow(new NacosException(500, "server error"));

        assertThrows(RuntimeException.class, () -> nacosDiscoveryClient.getServices());
    }

    @Test
    void testHealthCheckReturnsTrue() {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.UP);

        assertTrue(nacosDiscoveryClient.healthCheck());
    }

    @Test
    void testHealthCheckReturnsFalse() {
        injectNamingServiceAndConfig();
        when(namingService.getServerStatus()).thenReturn(DiscoveryClientHealthStatus.DOWN);

        assertFalse(nacosDiscoveryClient.healthCheck());
    }

    @Test
    void testCloseWithNullNamingService() {
        nacosDiscoveryClient.close();
    }

    @Test
    void testCloseSuccess() throws NacosException {
        injectNamingServiceAndConfig();

        nacosDiscoveryClient.close();

        verify(namingService).shutDown();
    }

    @Test
    void testCloseThrowsNacosException() throws NacosException {
        injectNamingServiceAndConfig();
        doThrow(new NacosException(500, "shutdown error")).when(namingService).shutDown();

        nacosDiscoveryClient.close();

        verify(namingService).shutDown();
    }

    private void injectNamingServiceAndConfig() {
        ReflectionTestUtils.setField(nacosDiscoveryClient, "namingService", namingService);
        ConnectConfig config = ConnectConfig.builder().host(HOST).port(PORT).build();
        ReflectionTestUtils.setField(nacosDiscoveryClient, "localConnectConfig", config);
    }
}
