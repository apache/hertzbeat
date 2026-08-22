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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

import java.net.http.HttpClient;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.util.ReflectionTestUtils;

class RestTemplateConfigTest {

    @Test
    void greptimeQueryRequestFactoryUsesDedicatedTimeouts() {
        ClientHttpRequestFactory factory = new RestTemplateConfig().greptimeQueryClientHttpRequestFactory();

        JdkClientHttpRequestFactory jdkFactory = assertInstanceOf(JdkClientHttpRequestFactory.class, factory);
        assertEquals(NetworkConstants.HttpClientConstants.GREPTIME_QUERY_READ_TIMEOUT,
                ReflectionTestUtils.getField(jdkFactory, "readTimeout"));

        HttpClient httpClient = (HttpClient) ReflectionTestUtils.getField(jdkFactory, "httpClient");
        assertEquals(NetworkConstants.HttpClientConstants.GREPTIME_QUERY_CONNECT_TIMEOUT,
                httpClient.connectTimeout().orElseThrow());
    }
}
