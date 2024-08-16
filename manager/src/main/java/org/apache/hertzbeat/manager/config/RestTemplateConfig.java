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
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.OkHttp3ClientHttpRequestFactory;
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
    public ClientHttpRequestFactory simpleClientHttpRequestFactory() {

        return new OkHttp3ClientHttpRequestFactory(
               new OkHttpClient.Builder()
                       .readTimeout(NetworkConstants.HttpClientConstants.READ_TIME_OUT, TimeUnit.SECONDS)
                        .writeTimeout(NetworkConstants.HttpClientConstants.WRITE_TIME_OUT, TimeUnit.SECONDS)
                        .connectTimeout(NetworkConstants.HttpClientConstants.CONNECT_TIME_OUT, TimeUnit.SECONDS)
                        .connectionPool(new ConnectionPool(
                                NetworkConstants.HttpClientConstants.MAX_IDLE_CONNECTIONS,
                                NetworkConstants.HttpClientConstants.KEEP_ALIVE_TIMEOUT,
                                TimeUnit.SECONDS)
                        ).build()
        );
    }

}
