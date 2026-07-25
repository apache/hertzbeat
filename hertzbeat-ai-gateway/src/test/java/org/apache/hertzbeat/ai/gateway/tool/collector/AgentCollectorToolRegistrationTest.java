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

package org.apache.hertzbeat.ai.gateway.tool.collector;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.CollectorService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

/** Test collector tool registration. */
class AgentCollectorToolRegistrationTest {

    @Test
    void shouldRegisterCollectorToolsInCollectorNamespace() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(AgentCollectorToolService.class, () -> new AgentCollectorToolService(
                mock(CollectorService.class), mock(MonitorService.class), mock(AppService.class),
                mock(CollectJobScheduling.class)));
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());

            assertEquals(List.of("collector.assign_monitor", "collector.collect_once", "collector.delete",
                    "collector.detect", "collector.list", "collector.set_state", "collector.unassign_monitor"),
                registry.descriptors().stream().map(AgentToolDescriptor::getName).sorted().toList());
        }
    }
}
