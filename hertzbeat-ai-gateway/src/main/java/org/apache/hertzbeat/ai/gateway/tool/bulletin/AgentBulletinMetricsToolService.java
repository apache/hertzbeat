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

package org.apache.hertzbeat.ai.gateway.tool.bulletin;

import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

/** Existing bulletin real-time projection with explicit store-unavailable state. */
@Service
public class AgentBulletinMetricsToolService {
    private final BulletinService service;
    private final RealTimeDataReader reader;

    public AgentBulletinMetricsToolService(BulletinService service, RealTimeDataReader reader) {
        this.service = service;
        this.reader = reader;
    }

    @Tool(name = "bulletin.metrics", description = "Read an exact bulletin's real-time metrics, with bounded redacted output and explicit storage availability.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> metrics(Long bulletinId) {
        if (bulletinId == null || bulletinId <= 0) {
            throw new IllegalArgumentException("Positive bulletinId is required");
        }
        if (!reader.isServerAvailable()) {
            return Map.of("available", false, "partial", true, "reason", "Real-time store unavailable");
        }
        return AgentManagementOutputSupport.view(service.buildBulletinMetricsData(bulletinId));
    }
}
