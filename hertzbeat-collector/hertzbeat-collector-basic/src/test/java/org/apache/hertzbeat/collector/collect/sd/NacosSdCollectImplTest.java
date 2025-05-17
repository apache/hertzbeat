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

package org.apache.hertzbeat.collector.collect.sd;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.SneakyThrows;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClientManagement;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NacosSdProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Test case for {@link NacosSdCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class NacosSdCollectImplTest {

    @InjectMocks
    private NacosSdCollectImpl nacosSdCollectImpl;

    @Mock
    private DiscoveryClientManagement discoveryClientManagement;

    @Mock
    private DiscoveryClient discoveryClient;

    private Metrics metrics;
    private NacosSdProtocol nacosSdProtocol;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        nacosSdProtocol = NacosSdProtocol.builder()
                .host("localhost")
                .port("8848")
                .username("nacos")
                .password("nacos")
                .build();

        metrics = Metrics.builder()
                .nacos_sd(nacosSdProtocol)
                .build();

        builder = CollectRep.MetricsData.newBuilder();

        ReflectionTestUtils.setField(nacosSdCollectImpl, "discoveryClientManagement", discoveryClientManagement);
    }
    
    @Test
    void testPreCheckWithNullMetrics() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, 
                () -> nacosSdCollectImpl.preCheck(null));

        assertEquals("Nacos service discovery monitoring, the config is null", exception.getMessage());
    }
    
    @Test
    void testPreCheckWithNullNacosSdConfig() {
        Metrics metricsWithoutNacosSd = Metrics.builder().build();

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, 
                () -> nacosSdCollectImpl.preCheck(metricsWithoutNacosSd));

        assertEquals("Nacos service discovery monitoring, the config is null", exception.getMessage());
    }
    
    @Test
    void testPreCheckWithInvalidNacosSdConfig() {
        NacosSdProtocol invalidNacosSdProtocol = NacosSdProtocol.builder()
                .host("")
                .port("8848")
                .build();

        Metrics metricsWithInvalidNacosSd = Metrics.builder()
                .nacos_sd(invalidNacosSdProtocol)
                .build();

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> nacosSdCollectImpl.preCheck(metricsWithInvalidNacosSd));

        assertEquals("Nacos service discovery monitoring, the config is invalid", exception.getMessage());

        NacosSdProtocol portInvalidNacosSdProtocol = NacosSdProtocol.builder()
                .host("localhost")
                .port("")
                .build();

        Metrics portMetricsWithInvalidNacosSd = Metrics.builder()
                .nacos_sd(portInvalidNacosSdProtocol)
                .build();

        exception = assertThrows(IllegalArgumentException.class,
                () -> nacosSdCollectImpl.preCheck(portMetricsWithInvalidNacosSd));

        assertEquals("Nacos service discovery monitoring, the config is invalid", exception.getMessage());
    }
    
    @Test
    void testPreCheckWithValidConfig() {
        assertDoesNotThrow(() -> nacosSdCollectImpl.preCheck(metrics));
    }
    
    @Test
    void testCollectSuccess() throws Exception {
        List<ServiceInstance> services = new ArrayList<>();
        services.add(ServiceInstance.builder()
                .serviceId("service-1")
                .serviceName("user-service")
                .address("192.168.1.10")
                .port(8080)
                .healthStatus("UP")
                .build());
        services.add(ServiceInstance.builder()
                .serviceId("service-2")
                .serviceName("order-service")
                .address("192.168.1.11")
                .port(8081)
                .healthStatus("UP")
                .build());

        when(discoveryClientManagement.getClient(any(RegistryProtocol.class))).thenReturn(discoveryClient);

        when(discoveryClient.getServices()).thenReturn(services);

        nacosSdCollectImpl.collect(builder, metrics);
        

        verify(discoveryClient, times(1)).close();

        assertEquals(2, builder.getValuesCount());

        CollectRep.ValueRow firstRow = builder.getValues(0);
        assertEquals("192.168.1.10", firstRow.getColumns(0));
        assertEquals("8080", firstRow.getColumns(1));
        assertEquals("user-service", firstRow.getColumns(2));
        assertEquals("UP", firstRow.getColumns(3));

        CollectRep.ValueRow secondRow = builder.getValues(1);
        assertEquals("192.168.1.11", secondRow.getColumns(0));
        assertEquals("8081", secondRow.getColumns(1));
        assertEquals("order-service", secondRow.getColumns(2));
        assertEquals("UP", secondRow.getColumns(3));
    }
    
    @Test
    void testCollectClientNull() {
        when(discoveryClientManagement.getClient(any(RegistryProtocol.class))).thenReturn(null);

        nacosSdCollectImpl.collect(builder, metrics);

        assertEquals(CollectRep.Code.FAIL, builder.getCode());
        assertEquals("Failed to get Nacos discovery client", builder.getMsg());
    }
    
    @SneakyThrows
    @Test
    void testCollectWithException() {
        String exceptionMessage = "Connection refused";
        Exception testException = new RuntimeException(exceptionMessage);

        when(discoveryClientManagement.getClient(any(RegistryProtocol.class))).thenReturn(discoveryClient);
        when(discoveryClient.getServices()).thenThrow(testException);

        try (MockedStatic<CommonUtil> mockedCommonUtil = Mockito.mockStatic(CommonUtil.class)) {
            mockedCommonUtil.when(() -> CommonUtil.getMessageFromThrowable(any(Throwable.class)))
                    .thenReturn(exceptionMessage);

            nacosSdCollectImpl.collect(builder, metrics);

            assertEquals(CollectRep.Code.FAIL, builder.getCode());
            assertEquals(exceptionMessage, builder.getMsg());

            verify(discoveryClient, times(1)).close();
        }
    }
    
    @Test
    void testCollectWithEmptyServiceList() throws Exception {
        when(discoveryClientManagement.getClient(any(RegistryProtocol.class))).thenReturn(discoveryClient);
        when(discoveryClient.getServices()).thenReturn(Collections.emptyList());

        nacosSdCollectImpl.collect(builder, metrics);

        assertEquals(0, builder.getValuesCount());

        verify(discoveryClient, times(1)).close();
    }
    
    @Test
    void testSupportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_NACOS_SD, nacosSdCollectImpl.supportProtocol());
    }
}
