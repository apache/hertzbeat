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

package org.apache.hertzbeat.ai.gateway.skill;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentSkillRegistry}.
 */
class AgentSkillRegistryTest {

    @Test
    void shouldLoadGatewaySkillResources() throws Exception {
        AgentSkillRegistry registry = new AgentSkillRegistry();

        registry.load();

        assertEquals(List.of("daily-inspection", "mysql-slow-query-diagnosis"),
                registry.definitions().stream().map(AgentSkillDefinition::name).sorted().toList());
        assertTrue(registry.get("mysql-slow-query-diagnosis").instructions()
                .contains("database.mysql_slow_queries"));
    }
}
