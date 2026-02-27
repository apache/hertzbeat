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

package org.apache.hertzbeat.push.config;

import org.apache.hertzbeat.push.service.PushGatewayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 *
 */
@Configuration
public class PushFilterConfig {

    @Autowired
    private PushGatewayService pushGatewayService;

    private static final String URI_PREFIX = "/api/push/prometheus/*";

    @Bean
    public FilterRegistrationBean<PushPrometheusStreamReadingFilter> contentTypeFilter() {
        FilterRegistrationBean<PushPrometheusStreamReadingFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new PushPrometheusStreamReadingFilter(pushGatewayService));
        registrationBean.addUrlPatterns(URI_PREFIX);
        registrationBean.setOrder(Integer.MIN_VALUE);
        return registrationBean;
    }
}
