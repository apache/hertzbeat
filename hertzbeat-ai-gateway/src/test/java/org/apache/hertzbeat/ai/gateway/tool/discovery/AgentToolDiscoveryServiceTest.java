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

package org.apache.hertzbeat.ai.gateway.tool.discovery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

/** Test tool discovery results. */
class AgentToolDiscoveryServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void shouldOmitSchemaByDefault() {
        AgentToolRegistry registry = mock(AgentToolRegistry.class);
        ObjectProvider<AgentToolRegistry> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(registry);
        when(registry.discoverableDescriptors("jdbc", null)).thenReturn(List.of(descriptor()));
        AgentToolDiscoveryService service = new AgentToolDiscoveryService(provider);

        Map<String, Object> result = service.search("jdbc", null, null);

        assertEquals(1, result.get("count"));
        Map<String, Object> tool = ((List<Map<String, Object>>) result.get("tools")).getFirst();
        assertEquals("jdbc.query", tool.get("name"));
        assertFalse(tool.containsKey("inputSchema"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldIncludeSchemaWhenRequested() {
        AgentToolRegistry registry = mock(AgentToolRegistry.class);
        ObjectProvider<AgentToolRegistry> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(registry);
        when(registry.discoverableDescriptors("jdbc", null)).thenReturn(List.of(descriptor()));
        AgentToolDiscoveryService service = new AgentToolDiscoveryService(provider);

        Map<String, Object> result = service.search("jdbc", null, true);

        Map<String, Object> tool = ((List<Map<String, Object>>) result.get("tools")).getFirst();
        assertEquals("{\"type\":\"object\"}", tool.get("inputSchema"));
    }

    private AgentToolDescriptor descriptor() {
        return AgentToolDescriptor.builder()
            .name("jdbc.query")
            .description("Execute a JDBC query.")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.READ)
            .namespace("jdbc")
            .exposure(AgentToolExposure.MODEL_ON_DEMAND)
            .build();
    }
}
