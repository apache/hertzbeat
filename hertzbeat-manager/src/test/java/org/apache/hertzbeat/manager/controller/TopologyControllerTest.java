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

package org.apache.hertzbeat.manager.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.pojo.dto.EntityTopologyGraphInfo;
import org.apache.hertzbeat.manager.service.entity.EntityTopologyQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for topology read API.
 */
@ExtendWith(MockitoExtension.class)
class TopologyControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private TopologyController topologyController;

    @Mock
    private EntityTopologyQueryService entityTopologyQueryService;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(topologyController).build();
    }

    @Test
    void returnsApiBackedFocusedTopologyGraph() throws Exception {
        EntityTopologyGraphInfo graph = new EntityTopologyGraphInfo();
        graph.setApiBacked(true);
        graph.setFocusEntityId(10L);
        graph.setDepth(2);
        graph.setSourceKinds(List.of("entity-relation"));
        graph.setNodes(List.of(new EntityTopologyGraphInfo.Node(
                "10", 10L, "checkout-api", "service", "commerce", "prod", "warning", true,
                List.of("entity-relation"), new EntityTopologyGraphInfo.RedMetrics())));
        graph.setEdges(List.of(new EntityTopologyGraphInfo.Edge(
                "101", 101L, "10", "20", 10L, 20L, null, null, null, null, null, "depends_on", "manual", "confirmed", 92,
                List.of("entity-relation", "manual"), new EntityTopologyGraphInfo.RedMetrics())));
        when(entityTopologyQueryService.buildFocusedTopology(
                10L, 2, "prod", "entity-relation", 1710000000000L, 1710003600000L,
                "depends_on", true, 1, 25)).thenReturn(graph);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/topology")
                        .param("focusEntityId", "10")
                        .param("depth", "2")
                        .param("environment", "prod")
                        .param("sourceKind", "entity-relation")
                        .param("start", "1710000000000")
                        .param("end", "1710003600000")
                        .param("relationType", "depends_on")
                        .param("hideInternal", "true")
                        .param("pageIndex", "1")
                        .param("pageSize", "25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.apiBacked").value(true))
                .andExpect(jsonPath("$.data.focusEntityId").value(10))
                .andExpect(jsonPath("$.data.depth").value(2))
                .andExpect(jsonPath("$.data.nodes[0].entityName").value("checkout-api"))
                .andExpect(jsonPath("$.data.edges[0].relationType").value("depends_on"));

        verify(entityTopologyQueryService).buildFocusedTopology(
                10L, 2, "prod", "entity-relation", 1710000000000L, 1710003600000L,
                "depends_on", true, 1, 25);
    }
}
