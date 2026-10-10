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

package org.apache.hertzbeat.ai.gateway.tool.protocol;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

/** Test protocol primitive Spring AI tool registration. */
class AgentProtocolPrimitiveRegistrationTest {

    @Test
    void shouldRegisterProtocolPrimitivesAsOnDemandTools() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            AgentProtocolPrimitiveSupport support = mock(AgentProtocolPrimitiveSupport.class);
            context.registerBean(AgentProtocolPrimitiveToolService.class,
                () -> new AgentProtocolPrimitiveToolService(support));
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());
            Map<String, AgentToolDescriptor> descriptors = registry.descriptors().stream()
                .collect(Collectors.toMap(AgentToolDescriptor::getName, descriptor -> descriptor));

            assertEquals(Set.of("jdbc.query", "jdbc.execute", "http.get", "http.request",
                    "dns.query", "ssh.inspect", "ssh.execute"),
                registry.descriptors().stream().map(AgentToolDescriptor::getName).collect(Collectors.toSet()));
            assertTrue(descriptors.values().stream()
                .allMatch(descriptor -> descriptor.getExposure() == AgentToolExposure.MODEL_ON_DEMAND));
            assertEquals(AgentToolRisk.DANGEROUS, descriptors.get("jdbc.query").getRisk());
            assertEquals(AgentToolRisk.DANGEROUS, descriptors.get("jdbc.execute").getRisk());
            assertEquals(AgentToolRisk.DANGEROUS, descriptors.get("http.request").getRisk());
            assertEquals(AgentToolRisk.DANGEROUS, descriptors.get("ssh.inspect").getRisk());
            assertEquals(AgentToolRisk.DANGEROUS, descriptors.get("ssh.execute").getRisk());
            assertTrue(descriptors.get("jdbc.query").getInputSchema().contains("columns"));
            assertTrue(descriptors.get("http.request").getInputSchema().contains("reason"));
        }
    }
}
