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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.configuration.SurenessJakartaServletFilter;
import com.usthe.sureness.mgt.SecurityManager;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.web.servlet.FilterRegistrationBean;

class SurenessSpring7CompatibilityConfigurationTest {

    @Test
    void replacesOnlyTheStarterSurenessRegistrationAndPreservesItsMetadata() {
        SecurityManager securityManager = mock(SecurityManager.class);
        ObjectProvider<SecurityManager> provider = providerFor(securityManager);
        SurenessSpring7FilterRegistrationPostProcessor postProcessor =
                new SurenessSpring7FilterRegistrationPostProcessor(provider);
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();
        registration.setName("SurenessFilter");
        registration.setFilter(new SurenessJakartaServletFilter(securityManager));
        registration.addUrlPatterns("/*");
        registration.setOrder(Integer.MAX_VALUE);

        Object processed = postProcessor.postProcessAfterInitialization(registration, "filterRegistration");

        assertThat(processed).isSameAs(registration);
        assertThat(registration.getFilter()).isInstanceOf(SurenessSpring7ServletFilter.class);
        assertThat(registration.getFilterName()).isEqualTo("SurenessFilter");
        assertThat(registration.getUrlPatterns()).containsExactly("/*");
        assertThat(registration.getOrder()).isEqualTo(Integer.MAX_VALUE);
    }

    @Test
    void leavesRegistrationsWithAnotherNameOrFilterTypeUntouched() {
        SecurityManager securityManager = mock(SecurityManager.class);
        SurenessSpring7FilterRegistrationPostProcessor postProcessor =
                new SurenessSpring7FilterRegistrationPostProcessor(providerFor(securityManager));
        Filter firstFilter = mock(Filter.class);
        FilterRegistrationBean<Filter> wrongName = registration("AnotherFilter",
                new SurenessJakartaServletFilter(securityManager));
        FilterRegistrationBean<Filter> wrongType = registration("SurenessFilter", firstFilter);

        postProcessor.postProcessAfterInitialization(wrongName, "wrongName");
        postProcessor.postProcessAfterInitialization(wrongType, "wrongType");

        assertThat(wrongName.getFilter()).isInstanceOf(SurenessJakartaServletFilter.class);
        assertThat(wrongType.getFilter()).isSameAs(firstFilter);
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<SecurityManager> providerFor(SecurityManager securityManager) {
        ObjectProvider<SecurityManager> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(securityManager);
        return provider;
    }

    private static FilterRegistrationBean<Filter> registration(String name, Filter filter) {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();
        registration.setName(name);
        registration.setFilter(filter);
        return registration;
    }
}
