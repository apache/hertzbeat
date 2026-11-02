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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.alert.service.AlertGroupConvergeService;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;

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
        return AgentManagementOutputSupport.view(
                service.getAlertGroupConverges(
                        null,
                        search,
                        "gmtCreate",
                        "desc",
                        AgentToolContextSupport.bound(
                                pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE),
                        AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100)));
    }

    @Tool(name = "alert_group.get", description = "Get an exact alert grouping policy.")
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> get(Long groupId) {
        var value = requiredAlertGroupConverge(groupId);
        var result = AgentManagementOutputSupport.view(value);
        if (!Boolean.TRUE.equals(result.get("partial")))
            result.put("sourceHash", AgentAlertGroupWriteProof.sourceHash(value));
        return result;
    }

    private AlertGroupConverge requiredAlertGroupConverge(Long groupId) {
        if (groupId == null || groupId <= 0) {
            throw new IllegalArgumentException("groupId must be positive");
        }
        AlertGroupConverge value = service.getAlertGroupConverge(groupId);
        if (value == null || !groupId.equals(value.getId())) {
            throw new IllegalArgumentException("Grouping policy not found");
        }
        return value;
    }

    @Tool(
            name = "alert_group.create",
            description = "Create a grouping policy, changing notification grouping and timing.")
    @AgentToolPolicy(
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> create(Configuration configuration) {
        AlertGroupConverge value = apply(new AlertGroupConverge(), configuration);
        validateBean(value);
        service.validate(value, false);
        String expected = AgentAlertGroupWriteProof.contentHash(value);
        service.addAlertGroupConverge(value);
        return written(
                "alert_group.create",
                AgentToolContextSupport.arguments("configuration", configuration),
                expected,
                requiredAlertGroupConverge(value.getId()));
    }

    @Tool(
            name = "alert_group.update",
            description = "Replace grouping configuration, including enabled state, by exact id.")
    @AgentToolPolicy(
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> update(
            Long groupId,
            Configuration configuration,
            @ToolParam(
                            description =
                                    "Exact sourceHash from alert_group.get; snapshot condition, not"
                                        + " atomic CAS.")
                    String sourceHash) {
        AlertGroupConverge value = requiredAlertGroupConverge(groupId);
        AgentAlertGroupWriteProof.requireSource(value, sourceHash);
        value = apply(value, configuration);
        validateBean(value);
        service.validate(value, true);
        String expected = AgentAlertGroupWriteProof.contentHash(value);
        service.modifyAlertGroupConverge(value);
        return written(
                "alert_group.update",
                AgentToolContextSupport.arguments(
                        "groupId",
                        groupId,
                        "configuration",
                        configuration,
                        "sourceHash",
                        sourceHash),
                expected,
                requiredAlertGroupConverge(groupId));
    }

    @Tool(name = "alert_group.delete", description = "Permanently delete an exact grouping policy.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.ADMIN)
    public Map<String, Object> delete(
            Long groupId,
            String reason,
            @ToolParam(
                            description =
                                    "Exact sourceHash from alert_group.get; fixed destructive"
                                        + " target.")
                    String sourceHash) {
        AgentAlertGroupWriteProof.requireSource(requiredAlertGroupConverge(groupId), sourceHash);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Deletion reason is required");
        }
        service.deleteAlertGroupConverges(Set.of(groupId));
        if (service.getAlertGroupConverge(groupId) != null)
            throw new IllegalStateException("ALERT_GROUP_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        return Map.of(
                "deletedId",
                groupId,
                "mutationReceipt",
                AgentAlertGroupWriteProof.receipt(
                        "alert_group.delete",
                        groupId,
                        AgentToolContextSupport.arguments(
                                "groupId", groupId, "reason", reason, "sourceHash", sourceHash),
                        "absent",
                        true));
    }

    /**
     * Existing Java callers retain their signatures; model tools require explicit source snapshots.
     */
    public Map<String, Object> update(Long id, Configuration config) {
        return update(
                id, config, AgentAlertGroupWriteProof.sourceHash(requiredAlertGroupConverge(id)));
    }

    public Map<String, Object> delete(Long id, String reason) {
        return delete(
                id, reason, AgentAlertGroupWriteProof.sourceHash(requiredAlertGroupConverge(id)));
    }

    private Map<String, Object> written(
            String tool, Map<String, Object> args, String expected, AlertGroupConverge observed) {
        if (!expected.equals(AgentAlertGroupWriteProof.contentHash(observed)))
            throw new IllegalStateException("ALERT_GROUP_WRITE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(observed), Map.class);
        row.put(
                "mutationReceipt",
                AgentAlertGroupWriteProof.receipt(tool, observed.getId(), args, expected, false));
        return AgentManagementOutputSupport.view(row);
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
