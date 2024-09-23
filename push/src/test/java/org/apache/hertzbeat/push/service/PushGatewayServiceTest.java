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

package org.apache.hertzbeat.push.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.util.prometheus.Metric;
import org.apache.hertzbeat.common.util.prometheus.PrometheusUtil;
import org.apache.hertzbeat.push.service.impl.PushGatewayServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link PushGatewayServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class PushGatewayServiceTest {

    @InjectMocks
    private PushGatewayServiceImpl pushGatewayService;

    private MockedStatic<PrometheusUtil> prometheusUtilMock;

    @BeforeEach
    void setUp() {

        prometheusUtilMock = mockStatic(PrometheusUtil.class);
    }

    @AfterEach
    void tearDown() {

        prometheusUtilMock.close();
    }

    @Test
    void testPushMetricsDataSuccess() throws IOException {

        String mockData = "some metric data";
        InputStream inputStream = new ByteArrayInputStream(mockData.getBytes());
        List<Metric> mockMetrics = Collections.singletonList(new Metric());

        prometheusUtilMock.when(
                () -> PrometheusUtil.parseMetrics(any(InputStream.class))
        ).thenReturn(mockMetrics);

        boolean result = pushGatewayService.pushMetricsData(inputStream);

        assertTrue(result);
        prometheusUtilMock.verify(
                () -> PrometheusUtil.parseMetrics(any(InputStream.class)),
                times(1)
        );
    }

    @Test
    void testPushMetricsDataFailure() throws IOException {

        String mockData = "some metric data";
        InputStream inputStream = new ByteArrayInputStream(mockData.getBytes());

        prometheusUtilMock.when(() -> PrometheusUtil.parseMetrics(any(InputStream.class))).thenReturn(null);

        boolean result = pushGatewayService.pushMetricsData(inputStream);

        assertFalse(result);
        prometheusUtilMock.verify(
                () -> PrometheusUtil.parseMetrics(any(InputStream.class)),
                times(1)
        );
    }

}
