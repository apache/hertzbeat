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

import com.usthe.sureness.mgt.SecurityManager;
import jakarta.servlet.Filter;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;

/**
 * Replaces only the servlet filter registration created by the Sureness starter.
 */
final class SurenessSpring7FilterRegistrationPostProcessor implements BeanPostProcessor {

    private static final String SURENESS_FILTER_NAME = "SurenessFilter";
    private static final String STARTER_FILTER_CLASS =
            "com.usthe.sureness.configuration.SurenessJakartaServletFilter";

    private final ObjectProvider<SecurityManager> securityManagerProvider;

    SurenessSpring7FilterRegistrationPostProcessor(ObjectProvider<SecurityManager> securityManagerProvider) {
        this.securityManagerProvider = securityManagerProvider;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof FilterRegistrationBean<?> registration
                && SURENESS_FILTER_NAME.equals(registration.getFilterName())
                && STARTER_FILTER_CLASS.equals(registration.getFilter().getClass().getName())) {
            replaceFilter(registration);
        }
        return bean;
    }

    @SuppressWarnings("unchecked")
    private void replaceFilter(FilterRegistrationBean<?> registration) {
        FilterRegistrationBean<Filter> filterRegistration = (FilterRegistrationBean<Filter>) registration;
        filterRegistration.setFilter(new SurenessSpring7ServletFilter(securityManagerProvider.getObject()));
    }
}
