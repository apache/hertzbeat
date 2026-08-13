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

package org.apache.hertzbeat.ai.gateway.tool.topology;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.apache.hertzbeat.manager.pojo.dto.EntityTopologyGraphInfo;
import org.apache.hertzbeat.manager.service.entity.EntityTopologyQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Test bounded topology read tools. */
class AgentTopologyToolServiceTest {

    private EntityTopologyQueryService topologyQueryService;
    private AgentTopologyToolService service;

    @BeforeEach
    void setUp() {
        topologyQueryService = mock(EntityTopologyQueryService.class);
        service = new AgentTopologyToolService(topologyQueryService);
    }

    @Test
    void shouldDelegateToWorkspaceAwareTopologyReadModelWithBounds() {
        EntityTopologyGraphInfo graph = new EntityTopologyGraphInfo();
        when(topologyQueryService.buildFocusedTopology(
                11L, 2, "prod", "otlp-trace-call", 1_000L, 2_000L,
                "trace-call", true, 0, 100)).thenReturn(graph);

        EntityTopologyGraphInfo result = service.queryTopology(11L, 50, "prod", "otlp-trace-call",
                1_000L, 2_000L, "trace-call", true, 0, 500);

        assertSame(graph, result);
        verify(topologyQueryService).buildFocusedTopology(
                11L, 2, "prod", "otlp-trace-call", 1_000L, 2_000L,
                "trace-call", true, 0, 100);
    }

    @Test
    void shouldRejectUnboundedTopologyRange() {
        assertThrows(IllegalArgumentException.class,
                () -> service.queryTopology(null, null, null, null, 1_000L,
                        1_000L + Duration.ofDays(8).toMillis(), null, null, null, null));
    }
}
