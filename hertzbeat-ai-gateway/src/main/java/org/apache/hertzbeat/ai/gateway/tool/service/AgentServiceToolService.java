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

package org.apache.hertzbeat.ai.gateway.tool.service;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.manager.pojo.dto.EntityApmRedView;
import org.apache.hertzbeat.manager.pojo.dto.EntityServicePerformancePage;
import org.apache.hertzbeat.manager.service.entity.EntityApmRedReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityServicePerformanceReadModelService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Service catalog RED evidence, using the same bounded read models as the HTTP APIs. */
@Service
public class AgentServiceToolService {
    private final EntityServicePerformanceReadModelService performance;
    private final EntityApmRedReadModelService red;

    public AgentServiceToolService(EntityServicePerformanceReadModelService performance, EntityApmRedReadModelService red) {
        this.performance = performance;
        this.red = red;
    }

    @Tool(name = "services.red", description = "Rank authorized service entities by bounded RED evidence; unavailable and scope-too-large are not empty success.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public EntityServicePerformancePage rank(
            @ToolParam(required = false) String search, @ToolParam(required = false) String environment,
            long start, long end,
            @ToolParam(required = false, description = "requestCount, errorCount, errorRate, latencyP95Ms, name") String sort,
            @ToolParam(required = false, description = "asc or desc") String order,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false, description = "10, 20 or 50") Integer pageSize) {
        return performance.query(search, environment, start, end, sort == null ? "errorCount" : sort,
                order == null ? "desc" : order, pageIndex == null ? 0 : pageIndex, pageSize == null ? 10 : pageSize);
    }

    @Tool(name = "entity.red", description = "Read bounded APM RED evidence for an authorized entity, including service identity resolution.")
    @AgentToolPolicy(access = AgentToolAccess.STANDARD, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public EntityApmRedView red(long entityId, long start, long end) {
        if (entityId <= 0) {
            throw new IllegalArgumentException("entityId must be positive");
        }
        return red.query(entityId, start, end);
    }
}
