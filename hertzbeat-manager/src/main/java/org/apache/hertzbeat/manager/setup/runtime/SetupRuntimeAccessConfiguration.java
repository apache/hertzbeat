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

package org.apache.hertzbeat.manager.setup.runtime;

import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/** Registers the runtime boundary before authentication and business filters. */
@Configuration(proxyBeanMethods = false)
public class SetupRuntimeAccessConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public SetupRuntimeAccessFilter setupRuntimeAccessFilter(BusinessRuntimeGate gate) {
        return new SetupRuntimeAccessFilter(gate);
    }

    @Bean
    public FilterRegistrationBean<SetupRuntimeAccessFilter> setupRuntimeAccessFilterRegistration(
            SetupRuntimeAccessFilter filter) {
        FilterRegistrationBean<SetupRuntimeAccessFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        registration.addUrlPatterns("/*");
        return registration;
    }
}
