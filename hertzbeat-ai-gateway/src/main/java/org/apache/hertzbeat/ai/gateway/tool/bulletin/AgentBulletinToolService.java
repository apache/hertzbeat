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

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Bulletin;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.BulletinService;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;

/** Validated platform management tools. */
@Service
public class AgentBulletinToolService {
    private final BulletinService service;

    public AgentBulletinToolService(BulletinService service) {
        this.service = service;
    }

    /** Public dashboard settings; never accepts persistence audit fields. */
    public record Configuration(String name, String app, List<Long> monitorIds, Map<String, List<String>> fields) { }

    @Tool(name = "bulletin.list", description = "List bulletin dashboards with bounded pagination.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> list(@ToolParam(required = false) String search,
            @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        return AgentManagementOutputSupport.view(service.getBulletins(search, AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE),
                AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100)));
    }

    @Tool(name = "bulletin.get", description = "Read an exact bulletin dashboard configuration.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> get(Long bulletinId) {
        return AgentManagementOutputSupport.view(requiredBulletin(bulletinId));
    }

    private Bulletin requiredBulletin(Long bulletinId) {
        if (bulletinId == null || bulletinId <= 0) {
            throw new IllegalArgumentException("bulletinId must be positive");
        }
        return service.getBulletinById(bulletinId).orElseThrow(() -> new IllegalArgumentException("Bulletin not found"));
    }

    @Tool(name = "bulletin.create", description = "Publish a bulletin dashboard. Selected monitor metrics may become publicly visible. "
                    + "AI execution requires administrator confirmation; ordinary users use the native bulletin page.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> create(Configuration configuration) {
        Bulletin bulletin = apply(new Bulletin(), configuration);
        service.validate(bulletin, false);
        service.addBulletin(bulletin);
        return AgentManagementOutputSupport.view(bulletin);
    }

    @Tool(name = "bulletin.update", description = "Replace a bulletin dashboard configuration. This changes publicly visible monitor metrics. "
                    + "AI execution requires administrator confirmation; ordinary users use the native bulletin page.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> update(Long bulletinId, Configuration configuration) {
        Bulletin bulletin = apply(requiredBulletin(bulletinId), configuration);
        service.validate(bulletin, true);
        service.editBulletin(bulletin);
        return AgentManagementOutputSupport.view(bulletin);
    }

    @Tool(name = "bulletin.delete", description = "Permanently delete an exact bulletin dashboard.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.ADMIN)
    public Map<String, Object> delete(Long bulletinId, String reason) {
        requiredBulletin(bulletinId);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Deletion reason is required");
        }
        service.deleteBulletins(List.of(bulletinId));
        return Map.of("deletedId", bulletinId);
    }

    private Bulletin apply(Bulletin value, Configuration config) {
        if (config == null || config.name() == null || config.name().isBlank() || config.name().length() > 255
                || config.app() == null || config.app().isBlank() || config.monitorIds() == null
                || config.monitorIds().isEmpty() || config.monitorIds().size() > 100
                || config.monitorIds().stream().anyMatch(id -> id == null || id <= 0)
                || config.fields() == null || JsonUtil.toJson(config.fields()).length() > 4096) {
            throw new IllegalArgumentException("Invalid bulletin configuration");
        }
        value.setName(config.name());
        value.setApp(config.app());
        value.setMonitorIds(List.copyOf(config.monitorIds()));
        value.setFields(config.fields());
        return value;
    }

}
