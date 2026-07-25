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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentToolRegistry}.
 */
class AgentToolRegistryTest {

    @Test
    void shouldFindHandlersByExactToolName() {
        AgentToolRegistry registry = new AgentToolRegistry();
        RegisteredTool handler = handler("monitor.get");

        registry.register(handler);

        assertSame(handler, registry.find("monitor.get").orElseThrow());
        assertTrue(registry.find(" Monitor.Get ").isEmpty());
        assertEquals(1, registry.descriptors().size());
    }

    @Test
    void shouldRejectDuplicateExactNames() {
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(handler("remote.probe_http"));

        IllegalStateException exception = assertThrows(IllegalStateException.class,
            () -> registry.register(handler("remote.probe_http")));

        assertTrue(exception.getMessage().contains("remote.probe_http"));
    }

    @Test
    void shouldRejectMissingDescriptorAtRegistrationBoundary() {
        NullPointerException exception = assertThrows(NullPointerException.class,
            () -> new RegisteredTool(null, context -> AgentToolOutput.builder()
                    .status(AgentToolStatus.SUCCEEDED)
                    .build()));

        assertTrue(exception.getMessage().contains("descriptor"));
    }

    @Test
    void shouldSearchOnlyOnDemandTools() {
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(handler("jdbc.query", AgentToolExposure.MODEL_ON_DEMAND));
        registry.register(handler("jdbc.execute", AgentToolExposure.MODEL_ON_DEMAND));
        registry.register(handler("monitor.get", AgentToolExposure.MODEL_VISIBLE));
        assertEquals(java.util.List.of("jdbc.query", "jdbc.execute"),
            registry.discoverableDescriptors("jdbc", null).stream()
                .map(AgentToolDescriptor::getName).toList());
        assertEquals(java.util.List.of("jdbc.execute"),
            registry.discoverableDescriptors(null, "execute").stream()
                .map(AgentToolDescriptor::getName).toList());
    }

    @Test
    void shouldRejectUnscopedDiscovery() {
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(handler("jdbc.query", AgentToolExposure.MODEL_ON_DEMAND));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> registry.discoverableDescriptors(null, null));

        assertEquals("tool discovery requires namespace or query", exception.getMessage());
    }

    @Test
    void shouldLimitEachDiscoveryToTenTools() {
        AgentToolRegistry registry = new AgentToolRegistry();
        for (int index = 0; index < 12; index++) {
            registry.register(handler("jdbc.tool" + index, AgentToolExposure.MODEL_ON_DEMAND));
        }

        assertEquals(10, registry.discoverableDescriptors("jdbc", null).size());
    }

    private RegisteredTool handler(String name) {
        return handler(name, AgentToolExposure.MODEL_VISIBLE);
    }

    private RegisteredTool handler(String name, AgentToolExposure exposure) {
        AgentToolDescriptor descriptor = AgentToolDescriptor.builder()
            .name(name)
            .description("Test tool")
            .inputSchema("{\"type\":\"object\"}")
            .risk(AgentToolRisk.READ)
            .namespace(name.substring(0, name.indexOf('.')))
            .exposure(exposure)
            .build();
        return new RegisteredTool(descriptor, context -> AgentToolOutput.builder()
                .status(AgentToolStatus.SUCCEEDED)
                .build());
    }
}
