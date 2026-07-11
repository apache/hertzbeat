/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.config;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Collections;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate configuration using JDK native HttpClient for Spring 7.0.
 */
@Configuration
public class RestTemplateConfig {

    /**
     * Create RestTemplate with JDK native request factory and custom interceptors.
     */
    @Bean
    @Primary
    public RestTemplate restTemplate(
            @Qualifier("clientHttpRequestFactory") ClientHttpRequestFactory factory) {
        return createRestTemplate(factory);
    }

    @Bean(WarehouseConstants.GREPTIME_QUERY_REST_TEMPLATE)
    public RestTemplate greptimeQueryRestTemplate(
            @Qualifier("greptimeQueryClientHttpRequestFactory") ClientHttpRequestFactory factory) {
        return createRestTemplate(factory);
    }

    @Bean(WarehouseConstants.GREPTIME_WRITE_REST_TEMPLATE)
    public RestTemplate greptimeWriteRestTemplate(
            @Qualifier("greptimeWriteClientHttpRequestFactory") ClientHttpRequestFactory factory) {
        return createRestTemplate(factory);
    }

    @Bean(WarehouseConstants.GREPTIME_INIT_REST_TEMPLATE)
    public RestTemplate greptimeInitRestTemplate(
            @Qualifier("greptimeInitClientHttpRequestFactory") ClientHttpRequestFactory factory) {
        return createRestTemplate(factory);
    }

    private RestTemplate createRestTemplate(ClientHttpRequestFactory factory) {
        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.setInterceptors(Collections.singletonList(new HeaderRequestInterceptor()));
        return restTemplate;
    }

    @Bean
    @Primary
    public ClientHttpRequestFactory clientHttpRequestFactory() {
        return createRequestFactory(NetworkConstants.HttpClientConstants.CONNECT_TIMEOUT,
                NetworkConstants.HttpClientConstants.READ_TIMEOUT);
    }

    @Bean("greptimeQueryClientHttpRequestFactory")
    public ClientHttpRequestFactory greptimeQueryClientHttpRequestFactory() {
        return createRequestFactory(NetworkConstants.HttpClientConstants.GREPTIME_QUERY_CONNECT_TIMEOUT,
                NetworkConstants.HttpClientConstants.GREPTIME_QUERY_READ_TIMEOUT);
    }

    @Bean("greptimeWriteClientHttpRequestFactory")
    public ClientHttpRequestFactory greptimeWriteClientHttpRequestFactory() {
        return createRequestFactory(NetworkConstants.HttpClientConstants.GREPTIME_WRITE_CONNECT_TIMEOUT,
                NetworkConstants.HttpClientConstants.GREPTIME_WRITE_READ_TIMEOUT);
    }

    @Bean("greptimeInitClientHttpRequestFactory")
    public ClientHttpRequestFactory greptimeInitClientHttpRequestFactory() {
        return createRequestFactory(NetworkConstants.HttpClientConstants.GREPTIME_INIT_CONNECT_TIMEOUT,
                NetworkConstants.HttpClientConstants.GREPTIME_INIT_READ_TIMEOUT);
    }

    private ClientHttpRequestFactory createRequestFactory(Duration connectTimeout, Duration readTimeout) {
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(connectTimeout)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(readTimeout);
        return factory;
    }

}
