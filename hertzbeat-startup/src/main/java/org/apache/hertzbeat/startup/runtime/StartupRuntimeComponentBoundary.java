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

package org.apache.hertzbeat.startup.runtime;

import java.util.HashSet;
import java.util.Set;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor;
import org.springframework.core.Ordered;

/** Enforces package-level component ownership before a gated context instantiates business beans. */
final class StartupRuntimeComponentBoundary implements BeanDefinitionRegistryPostProcessor, Ordered {

    private static final String AGENT_GATEWAY_PACKAGE = "org.apache.hertzbeat.ai.gateway";
    private static final String AGENT_GATEWAY_RESOURCE = "org/apache/hertzbeat/ai/gateway";
    private static final Set<String> AGENT_GATEWAY_INFRASTRUCTURE = Set.of(
            "agentGatewayRuntimeConfiguration", "agentRunDao", "agentSessionDao",
            "agentTranscriptEntryDao", "agentScheduledCommandDao", "agentToolCallDao");

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException {
        Set<String> gatewayDefinitions = new HashSet<>();
        for (String beanName : registry.getBeanDefinitionNames()) {
            BeanDefinition definition = registry.getBeanDefinition(beanName);
            if (AGENT_GATEWAY_INFRASTRUCTURE.contains(beanName) || isGatewayDefinition(definition)) {
                gatewayDefinitions.add(beanName);
            }
        }
        for (String beanName : registry.getBeanDefinitionNames()) {
            BeanDefinition definition = registry.getBeanDefinition(beanName);
            if (gatewayDefinitions.contains(definition.getFactoryBeanName())) {
                gatewayDefinitions.add(beanName);
            }
        }
        gatewayDefinitions.forEach(registry::removeBeanDefinition);
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        // The gated boundary is fully applied while definitions are still mutable.
    }

    private static boolean isGatewayDefinition(BeanDefinition definition) {
        String beanClassName = definition.getBeanClassName();
        if (beanClassName != null && beanClassName.startsWith(AGENT_GATEWAY_PACKAGE)) {
            return true;
        }
        String resource = definition.getResourceDescription();
        return resource != null && resource.contains(AGENT_GATEWAY_RESOURCE);
    }
}
