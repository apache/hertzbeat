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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import lombok.SneakyThrows;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryResponseEntity;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.HttpEntity;
import org.apache.http.ProtocolVersion;
import org.apache.http.StatusLine;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.message.BasicStatusLine;
import org.apache.http.protocol.HttpContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link HttpSdCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class HttpSdCollectImplTest {

    @InjectMocks
    private HttpSdCollectImpl httpSdCollectImpl;

    @Mock
    private CloseableHttpClient httpClient;

    @Mock
    private CloseableHttpResponse httpResponse;

    private Metrics metrics;
    private HttpProtocol httpProtocol;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        httpProtocol = HttpProtocol.builder()
                .url("http://localhost:8080/services")
                .build();

        metrics = Metrics.builder()
                .http_sd(httpProtocol)
                .build();

        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void testCollectSuccess() throws IOException {
        List<ServiceDiscoveryResponseEntity> responseEntities = new ArrayList<>();

        ServiceDiscoveryResponseEntity entity1 = new ServiceDiscoveryResponseEntity();
        entity1.setTarget(Arrays.asList("192.168.1.10:8080", "192.168.1.11:8081"));

        ServiceDiscoveryResponseEntity entity2 = new ServiceDiscoveryResponseEntity();
        entity2.setTarget(Arrays.asList("192.168.1.12:8082"));

        responseEntities.add(entity1);
        responseEntities.add(entity2);

        String jsonResponse = JsonUtil.toJson(responseEntities);

        try (MockedStatic<CommonHttpClient> mockedHttpClient = Mockito.mockStatic(CommonHttpClient.class)) {
            mockedHttpClient.when(CommonHttpClient::getHttpClient).thenReturn(httpClient);

            when(httpClient.execute(any(HttpUriRequest.class), nullable(HttpContext.class))).thenReturn(httpResponse);

            StatusLine statusLine = new BasicStatusLine(new ProtocolVersion("HTTP", 1, 1), 200, "OK");
            when(httpResponse.getStatusLine()).thenReturn(statusLine);

            HttpEntity entity = new StringEntity(jsonResponse, ContentType.APPLICATION_JSON);
            when(httpResponse.getEntity()).thenReturn(entity);

            httpSdCollectImpl.collect(builder, metrics);

            assertEquals(3, builder.getValuesCount());

            CollectRep.ValueRow firstRow = builder.getValues(0);
            assertEquals("192.168.1.10", firstRow.getColumns(0));
            assertEquals("8080", firstRow.getColumns(1));

            CollectRep.ValueRow secondRow = builder.getValues(1);
            assertEquals("192.168.1.11", secondRow.getColumns(0));
            assertEquals("8081", secondRow.getColumns(1));

            CollectRep.ValueRow thirdRow = builder.getValues(2);
            assertEquals("192.168.1.12", thirdRow.getColumns(0));
            assertEquals("8082", thirdRow.getColumns(1));
        }
    }

    @Test
    void testCollectWithNon200Status() throws IOException {
        try (MockedStatic<CommonHttpClient> mockedHttpClient = Mockito.mockStatic(CommonHttpClient.class)) {
            mockedHttpClient.when(CommonHttpClient::getHttpClient).thenReturn(httpClient);

            when(httpClient.execute(any(HttpUriRequest.class), nullable(HttpContext.class))).thenReturn(httpResponse);

            StatusLine statusLine = new BasicStatusLine(new ProtocolVersion("HTTP", 1, 1), 404, "Not Found");
            when(httpResponse.getStatusLine()).thenReturn(statusLine);

            httpSdCollectImpl.collect(builder, metrics);

            assertEquals(CollectRep.Code.FAIL, builder.getCode());
            assertEquals("StatusCode 404", builder.getMsg());
        }
    }

    @SneakyThrows
    @Test
    void testCollectWithException() {
        String exceptionMessage = "Connection refused";
        IOException testException = new IOException(exceptionMessage);

        try (MockedStatic<CommonHttpClient> mockedHttpClient = Mockito.mockStatic(CommonHttpClient.class);
             MockedStatic<CommonUtil> mockedCommonUtil = Mockito.mockStatic(CommonUtil.class)) {

            mockedHttpClient.when(CommonHttpClient::getHttpClient).thenReturn(httpClient);

            when(httpClient.execute(any(HttpUriRequest.class), nullable(HttpContext.class))).thenThrow(testException);
            mockedCommonUtil.when(() -> CommonUtil.getMessageFromThrowable(any(Throwable.class)))
                    .thenReturn(exceptionMessage);

            httpSdCollectImpl.collect(builder, metrics);

            assertEquals(CollectRep.Code.FAIL, builder.getCode());
            assertEquals(exceptionMessage, builder.getMsg());
        }
    }

    @Test
    void testCollectWithEmptyServiceList() throws IOException {
        List<ServiceDiscoveryResponseEntity> emptyList = Collections.emptyList();
        String jsonResponse = JsonUtil.toJson(emptyList);

        try (MockedStatic<CommonHttpClient> mockedHttpClient = Mockito.mockStatic(CommonHttpClient.class)) {
            mockedHttpClient.when(CommonHttpClient::getHttpClient).thenReturn(httpClient);

            when(httpClient.execute(any(HttpUriRequest.class), nullable(HttpContext.class))).thenReturn(httpResponse);

            StatusLine statusLine = new BasicStatusLine(new ProtocolVersion("HTTP", 1, 1), 200, "OK");
            when(httpResponse.getStatusLine()).thenReturn(statusLine);

            HttpEntity entity = new StringEntity(jsonResponse, ContentType.APPLICATION_JSON);
            when(httpResponse.getEntity()).thenReturn(entity);

            httpSdCollectImpl.collect(builder, metrics);

            assertEquals(0, builder.getValuesCount());
        }
    }

    @Test
    void testSupportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_HTTP_SD, httpSdCollectImpl.supportProtocol());
    }
}