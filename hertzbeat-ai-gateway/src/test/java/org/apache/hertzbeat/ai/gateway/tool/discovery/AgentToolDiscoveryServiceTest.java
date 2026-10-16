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
        when(registry.discoverablePage("jdbc", null, 0))
                .thenReturn(new AgentToolRegistry.DiscoveryPage(List.of(descriptor()), 0, 1, false));
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
        when(registry.discoverablePage("jdbc", null, 0))
                .thenReturn(new AgentToolRegistry.DiscoveryPage(List.of(descriptor()), 0, 1, false));
        AgentToolDiscoveryService service = new AgentToolDiscoveryService(provider);

        Map<String, Object> result = service.search("jdbc", null, true);

        Map<String, Object> tool = ((List<Map<String, Object>>) result.get("tools")).getFirst();
        assertEquals("{\"type\":\"object\"}", tool.get("inputSchema"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void exposesBoundedPageMetadataAndTheActualLaterTools() {
        AgentToolRegistry registry = new AgentToolRegistry();
        for (int index = 0; index < 12; index++) {
            AgentToolDescriptor descriptor = AgentToolDescriptor.builder().name("logs.op" + index)
                    .description("Log operation").namespace("logs").inputSchema("{}")
                    .risk(AgentToolRisk.READ).exposure(AgentToolExposure.MODEL_ON_DEMAND).build();
            registry.register(new AgentToolRegistry.RegisteredTool(descriptor, ignored -> null));
        }
        ObjectProvider<AgentToolRegistry> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(registry);
        AgentToolDiscoveryService service = new AgentToolDiscoveryService(provider);
        Map<String, Object> first = service.search("logs", null, null, 0);
        assertEquals(true, first.get("hasMore"));
        assertEquals(10, first.get("nextOffset"));
        assertEquals(12, first.get("total"));
        Map<String, Object> last = service.search("logs", null, null, 10);
        assertEquals(false, last.get("hasMore"));
        assertEquals(2, last.get("count"));
        assertEquals("logs.op10", ((List<Map<String, Object>>) last.get("tools")).getFirst().get("name"));
        assertFalse(((List<Map<String, Object>>) last.get("tools")).getFirst().containsKey("inputSchema"));
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
