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

import java.time.Duration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.manager.pojo.dto.EntityTopologyGraphInfo;
import org.apache.hertzbeat.manager.service.entity.EntityTopologyQueryService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Bounded workspace-aware entity and trace-call topology tools. */
@Service
public class AgentTopologyToolService {

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();

    private final EntityTopologyQueryService topologyQueryService;

    public AgentTopologyToolService(EntityTopologyQueryService topologyQueryService) {
        this.topologyQueryService = topologyQueryService;
    }

    @Tool(name = "topology.query",
            description = "Query a bounded entity topology graph with persisted relation and trace-call evidence.")
    @AgentToolPolicy
    public EntityTopologyGraphInfo queryTopology(
            @ToolParam(required = false, description = "Focus entity id; omit for a bounded overview.") Long entityId,
            @ToolParam(required = false, description = "Traversal depth; maximum 2.") Integer depth,
            @ToolParam(required = false, description = "Deployment environment.") String environment,
            @ToolParam(required = false,
                    description = "Source kind: entity-relation, monitor-bind, otlp-trace-call, or k8s-workload.")
            String sourceKind,
            @ToolParam(required = false, description = "Start Unix timestamp in milliseconds.") Long start,
            @ToolParam(required = false, description = "End Unix timestamp in milliseconds.") Long end,
            @ToolParam(required = false, description = "Exact relation type.") String relationType,
            @ToolParam(required = false, description = "Hide internal trace calls.") Boolean hideInternal,
            @ToolParam(required = false, description = "Zero-based edge page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Edge page size; maximum 100.") Integer pageSize) {
        validateRange(start, end);
        int resolvedDepth = AgentToolContextSupport.bound(depth == null ? 1 : depth, 1, 2);
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, 10_000);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 50 : pageSize, 1, 100);
        return topologyQueryService.buildFocusedTopology(entityId, resolvedDepth, environment, sourceKind,
                start, end, relationType, hideInternal, resolvedPageIndex, resolvedPageSize);
    }

    private void validateRange(Long start, Long end) {
        if (start == null && end == null) {
            return;
        }
        if (start == null || end == null || start < 0 || end <= start || end - start > MAX_RANGE_MILLIS) {
            throw new IllegalArgumentException(
                    "Topology time range must be complete, positive, ordered, and no longer than 7 days");
        }
    }
}
