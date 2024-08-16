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

import java.util.Collections;
import java.util.concurrent.TimeUnit;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.io.HttpClientConnectionManager;
import org.apache.hc.core5.util.Timeout;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * restTemplate config
 * todo thread pool
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(ClientHttpRequestFactory factory) {
        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.setInterceptors(Collections.singletonList(new HeaderRequestInterceptor()));
        return restTemplate;
    }
    
    @Bean
    public ClientHttpRequestFactory httpComponentsClientHttpRequestFactory() {
        ConnectionConfig connectionConfig = ConnectionConfig
                .custom()
                .setConnectTimeout(Timeout.of(15, TimeUnit.SECONDS))
                .setSocketTimeout(Timeout.of(20, TimeUnit.SECONDS))
                .setValidateAfterInactivity(Timeout.of(20, TimeUnit.SECONDS))
                .build();
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectionRequestTimeout(15, TimeUnit.SECONDS)
                .setResponseTimeout(20, TimeUnit.SECONDS)
                .build();
        HttpClientConnectionManager connectionManager = PoolingHttpClientConnectionManagerBuilder
                .create()
                .setDefaultConnectionConfig(connectionConfig)
                .setMaxConnTotal(200)
                .setMaxConnPerRoute(20)
                .build();
        CloseableHttpClient httpClient = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(requestConfig)
                .build();
        return new HttpComponentsClientHttpRequestFactory(httpClient);
    }

}
