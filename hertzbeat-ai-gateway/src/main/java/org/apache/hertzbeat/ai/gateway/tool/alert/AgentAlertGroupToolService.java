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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import jakarta.validation.Validator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.service.AlertGroupConvergeService;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.util.JsonUtil;

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
public class AgentAlertGroupToolService {
    private final AlertGroupConvergeService service;
    private final Validator validator;

    public AgentAlertGroupToolService(AlertGroupConvergeService service, Validator validator) {
        this.service = service;
        this.validator = validator;
    }

    /** Editable group settings, excluding persistence audit fields. */
    public record Configuration(String name, List<String> groupLabels, Long groupWait,
                                Long groupInterval, Long repeatInterval, Boolean enable) { }

    @Tool(name = "alert_group.list", description = "List alert grouping policies.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> list(@ToolParam(required = false) String search,
            @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        return AgentManagementOutputSupport.view(service.getAlertGroupConverges(null, search, "gmtCreate", "desc",
                AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE),
                AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100)));
    }

    @Tool(name = "alert_group.get", description = "Get an exact alert grouping policy.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> get(Long groupId) {
        return AgentManagementOutputSupport.view(requiredAlertGroupConverge(groupId));
    }

    private AlertGroupConverge requiredAlertGroupConverge(Long groupId) {
        if (groupId == null || groupId <= 0) {
            throw new IllegalArgumentException("groupId must be positive");
        }
        AlertGroupConverge value = service.getAlertGroupConverge(groupId);
        if (value == null) {
            throw new IllegalArgumentException("Grouping policy not found");
        }
        return value;
    }

    @Tool(name = "alert_group.create", description = "Create a grouping policy, changing notification grouping and timing.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> create(Configuration configuration) {
        AlertGroupConverge value = apply(new AlertGroupConverge(), configuration);
        validateBean(value);
        service.validate(value, false);
        service.addAlertGroupConverge(value);
        return AgentManagementOutputSupport.view(value);
    }

    @Tool(name = "alert_group.update", description = "Replace grouping configuration, including enabled state, by exact id.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> update(Long groupId, Configuration configuration) {
        AlertGroupConverge value = apply(requiredAlertGroupConverge(groupId), configuration);
        validateBean(value);
        service.validate(value, true);
        service.modifyAlertGroupConverge(value);
        return AgentManagementOutputSupport.view(value);
    }

    @Tool(name = "alert_group.delete", description = "Permanently delete an exact grouping policy.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.ADMIN)
    public Map<String, Object> delete(Long groupId, String reason) {
        requiredAlertGroupConverge(groupId);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Deletion reason is required");
        }
        service.deleteAlertGroupConverges(Set.of(groupId));
        return Map.of("deletedId", groupId);
    }

    private AlertGroupConverge apply(AlertGroupConverge value, Configuration config) {
        if (config == null || config.name() == null || config.name().isBlank() || config.name().length() > 100
                || config.groupLabels() == null || config.groupLabels().size() > 50
                || config.groupLabels().stream().anyMatch(label -> label == null || label.isBlank())
                || JsonUtil.toJson(config.groupLabels()).length() > 1024
                || config.groupWait() == null || config.groupWait() < 0
                || config.groupInterval() == null || config.groupInterval() <= 0
                || config.repeatInterval() == null || config.repeatInterval() < 0 || config.enable() == null) {
            throw new IllegalArgumentException("Invalid grouping configuration");
        }
        value.setName(config.name());
        value.setGroupLabels(List.copyOf(config.groupLabels()));
        value.setGroupWait(config.groupWait());
        value.setGroupInterval(config.groupInterval());
        value.setRepeatInterval(config.repeatInterval());
        value.setEnable(config.enable());
        return value;
    }

    private void validateBean(Object value) {
        if (!validator.validate(value).isEmpty()) {
            throw new IllegalArgumentException("Invalid configuration fields");
        }
    }
}
