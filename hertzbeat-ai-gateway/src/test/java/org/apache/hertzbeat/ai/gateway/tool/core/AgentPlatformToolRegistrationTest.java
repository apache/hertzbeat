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

package org.apache.hertzbeat.ai.gateway.tool.core;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.stereotype.Service;
import org.springframework.util.ClassUtils;

/** Schema and metadata contract only; no business handler or external model is invoked. */
class AgentPlatformToolRegistrationTest {

    @Test
    void shouldRegisterPlatformSchemasWithoutDuplicateNames() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Service.class));
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            for (var bean : scanner.findCandidateComponents("org.apache.hertzbeat.ai.gateway.tool")) {
                registerMock(context, ClassUtils.forName(bean.getBeanClassName(), getClass().getClassLoader()));
            }
            context.refresh();
            AgentToolRegistry registry = new AgentToolConfiguration()
                    .agentToolRegistry(context.getDefaultListableBeanFactory());
            Map<String, AgentToolDescriptor> tools = registry.descriptors().stream()
                    .collect(Collectors.toMap(AgentToolDescriptor::getName, Function.identity()));
            for (String name : new String[] {"logs.analysis", "metrics.otlp_console", "dashboard.list_signal_dashboards",
                    "dashboard.upsert_signal_dashboard", "saved_query.list_signal_saved_views", "label.list"}) {
                AgentToolDescriptor descriptor = tools.get(name);
                assertNotNull(descriptor, name);
                assertFalse(descriptor.getInputSchema().isBlank(), name);
                assertNotNull(descriptor.getAccess(), name);
                assertNotNull(descriptor.getRisk(), name);
            }
            assertTrue(tools.size() > 72);
        }
    }

    private <T> void registerMock(GenericApplicationContext context, Class<T> type) {
        context.registerBean(type, () -> mock(type));
    }
}
