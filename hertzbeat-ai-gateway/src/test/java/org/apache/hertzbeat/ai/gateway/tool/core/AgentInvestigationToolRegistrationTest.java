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
import static org.mockito.Mockito.mock;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.entity.AgentEntityToolService;
import org.apache.hertzbeat.ai.gateway.tool.topology.AgentTopologyToolService;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolService;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityTopologyQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

/** Test discovery metadata for the cross-signal investigation tools. */
class AgentInvestigationToolRegistrationTest {

    @Test
    void shouldRegisterReadOnlyEntityTraceAndTopologyNamespaces() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(AgentEntityToolService.class,
                    () -> new AgentEntityToolService(mock(ObserveEntityService.class)));
            context.registerBean(AgentTraceToolService.class,
                    () -> new AgentTraceToolService(mock(EntityTraceQueryService.class)));
            context.registerBean(AgentTopologyToolService.class,
                    () -> new AgentTopologyToolService(mock(EntityTopologyQueryService.class)));
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                    .agentToolRegistry(context.getDefaultListableBeanFactory());

            assertEquals(List.of("entity.get", "entity.query", "topology.query", "traces.get", "traces.query"),
                    registry.descriptors().stream().map(AgentToolDescriptor::getName).sorted().toList());
            assertEquals(List.of(AgentToolRisk.READ, AgentToolRisk.READ, AgentToolRisk.READ,
                            AgentToolRisk.READ, AgentToolRisk.READ),
                    registry.descriptors().stream().map(AgentToolDescriptor::getRisk).toList());
        }
    }
}
