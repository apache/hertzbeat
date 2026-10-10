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

package org.apache.hertzbeat.manager.ui.session;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Places the cookie bridge immediately before the Sureness filter.
 */
@Configuration
public class UiSessionSecurityConfiguration {

    @Bean
    public FilterRegistrationBean<UiSessionCookieAuthenticationFilter> uiSessionCookieFilter(
            UiSessionCookieManager cookies, UiSessionService service) {
        UiSessionCookieAuthenticationFilter filter = new UiSessionCookieAuthenticationFilter(cookies, service);
        FilterRegistrationBean<UiSessionCookieAuthenticationFilter> registration = new FilterRegistrationBean<>();
        registration.setName("UiSessionCookieAuthenticationFilter");
        registration.setFilter(filter);
        registration.addUrlPatterns("/*");
        registration.setOrder(Integer.MAX_VALUE - 1);
        return registration;
    }
}
