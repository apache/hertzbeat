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

package org.apache.hertzbeat.ai.gateway.tool.label;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** Validated platform management tools. */
@Service
public class AgentLabelToolService {
    private final LabelService service;
    private final Validator validator;
    private final LabelDao labelDao;

    public AgentLabelToolService(LabelService service, Validator validator, LabelDao labelDao) {
        this.service = service;
        this.validator = validator;
        this.labelDao = labelDao;
    }

    @Tool(name = "label.list", description = "List platform labels with bounded pagination.")
    @AgentToolPolicy(
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.STANDARD)
    public Map<String, Object> list(
            @ToolParam(required = false) String search,
            @ToolParam(required = false) Byte type,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize) {
        return AgentManagementOutputSupport.view(
                service.getLabels(
                        search,
                        type,
                        AgentToolContextSupport.bound(
                                pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE),
                        AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100)));
    }

    @Tool(name = "label.get", description = "Get one label by its exact id.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> get(Long labelId) {
        return AgentManagementOutputSupport.view(requiredLabel(labelId));
    }

    private Label requiredLabel(Long labelId) {
        requireId(labelId);
        return labelDao.findById(labelId)
                .orElseThrow(() -> new IllegalArgumentException("Label not found"));
    }

    @Tool(name = "label.create", description = "Create a user label.")
    @AgentToolPolicy(
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> create(
            String name,
            @ToolParam(required = false) String value,
            @ToolParam(required = false) String description) {
        Label label = build(null, name, value, description);
        service.addLabel(label);
        return receipt(
                "label.create",
                label,
                AgentToolContextSupport.arguments(
                        "name", name, "value", value, "description", description));
    }

    @Tool(
            name = "label.update",
            description =
                    "Update provided fields of a label by exact id; omitted value/description are"
                        + " preserved. Use the native editor to clear them.")
    @AgentToolPolicy(
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> update(
            Long labelId,
            String name,
            @ToolParam(required = false) String value,
            @ToolParam(required = false) String description) {
        requireId(labelId);
        Label label = requiredLabel(labelId);
        Label validated = build(labelId, name, value, description);
        label.setName(validated.getName());
        if (value != null) label.setTagValue(validated.getTagValue());
        if (description != null) label.setDescription(validated.getDescription());
        service.modifyLabel(label);
        return receipt(
                "label.update",
                label,
                AgentToolContextSupport.arguments(
                        "labelId",
                        labelId,
                        "name",
                        name,
                        "value",
                        value,
                        "description",
                        description));
    }

    @Tool(
            name = "label.delete",
            description = "Delete one label and its associations. Requires explicit confirmation.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.ADMIN)
    public Map<String, Object> delete(Long labelId, String reason) {
        requireId(labelId);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Deletion reason is required");
        }
        requiredLabel(labelId);
        service.deleteLabels(new HashSet<>(Set.of(labelId)));
        if (labelDao.existsById(labelId))
            throw new IllegalStateException("LABEL_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        return Map.of(
                "deletedId",
                labelId,
                "receiptVersion",
                "label-mutation.v1",
                "toolName",
                "label.delete",
                "labelId",
                labelId,
                "verified",
                true,
                "deleted",
                true,
                "inputHash",
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(
                                AgentToolContextSupport.arguments(
                                        "labelId", labelId, "reason", reason)));
    }

    private Map<String, Object> receipt(String tool, Label requested, Map<String, Object> args) {
        Label stored = requiredLabel(requested.getId());
        if (!java.util.Objects.equals(requested.getId(), stored.getId())
                || !java.util.Objects.equals(requested.getName(), stored.getName())
                || !java.util.Objects.equals(requested.getTagValue(), stored.getTagValue())
                || !java.util.Objects.equals(requested.getDescription(), stored.getDescription())
                || !java.util.Objects.equals(requested.getType(), stored.getType())) {
            throw new IllegalStateException("LABEL_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        }
        Map<String, Object> result =
                new java.util.LinkedHashMap<>(AgentManagementOutputSupport.view(stored));
        result.put("receiptVersion", "label-mutation.v1");
        result.put("toolName", tool);
        result.put("labelId", stored.getId());
        result.put("verified", true);
        result.put("deleted", false);
        result.put(
                "inputHash",
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(args));
        return result;
    }

    private Label build(Long id, String name, String value, String description) {
        Label label =
                Label.builder()
                        .id(id)
                        .name(name)
                        .tagValue(value)
                        .description(description)
                        .type((byte) 1)
                        .build();
        if (!validator.validate(label).isEmpty() || (value != null && value.length() > 2048)) {
            throw new IllegalArgumentException("Invalid label fields");
        }
        return label;
    }

    private void requireId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("labelId must be positive");
        }
    }
}
