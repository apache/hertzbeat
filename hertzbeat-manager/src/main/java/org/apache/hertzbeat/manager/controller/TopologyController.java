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

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.EntityTopologyGraphInfo;
import org.apache.hertzbeat.manager.service.entity.EntityTopologyQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Topology read API.
 */
@Tag(name = "Topology API")
@RestController
@RequestMapping(path = "/api/topology", produces = {APPLICATION_JSON_VALUE})
public class TopologyController {

    private final EntityTopologyQueryService entityTopologyQueryService;

    public TopologyController(EntityTopologyQueryService entityTopologyQueryService) {
        this.entityTopologyQueryService = entityTopologyQueryService;
    }

    @GetMapping
    @Operation(summary = "Get topology graph", description = "Get an API-backed entity topology graph")
    public ResponseEntity<Message<EntityTopologyGraphInfo>> getTopologyGraph(
            @Parameter(description = "Focus entity ID", example = "87584674384")
            @RequestParam(required = false) Long focusEntityId,
            @Parameter(description = "Topology traversal depth", example = "1")
            @RequestParam(defaultValue = "1") int depth,
            @Parameter(description = "Deployment environment", example = "prod")
            @RequestParam(required = false) String environment,
            @Parameter(description = "Topology source kind", example = "entity-relation")
            @RequestParam(required = false) String sourceKind,
            @Parameter(description = "Start time in epoch milliseconds", example = "1710000000000")
            @RequestParam(required = false) Long start,
            @Parameter(description = "End time in epoch milliseconds", example = "1710003600000")
            @RequestParam(required = false) Long end,
            @Parameter(description = "Relationship type filter", example = "depends_on")
            @RequestParam(required = false) String relationType,
            @Parameter(description = "Hide internal telemetry relationships", example = "true")
            @RequestParam(required = false) Boolean hideInternal,
            @Parameter(description = "Edge page index", example = "0")
            @RequestParam(required = false) Integer pageIndex,
            @Parameter(description = "Edge page size", example = "50")
            @RequestParam(required = false) Integer pageSize) {
        EntityTopologyGraphInfo graph = entityTopologyQueryService.buildFocusedTopology(
                focusEntityId, depth, environment, sourceKind, start, end,
                relationType, hideInternal, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(graph));
    }
}
