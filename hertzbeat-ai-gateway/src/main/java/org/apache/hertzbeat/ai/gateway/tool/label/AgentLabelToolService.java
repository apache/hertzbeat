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

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import jakarta.validation.Validator;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.common.entity.manager.Label;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

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
    @AgentToolPolicy(risk = AgentToolRisk.READ, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.STANDARD)
    public Map<String, Object> list(@ToolParam(required = false) String search, @ToolParam(required = false) Byte type,
                            @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        return AgentManagementOutputSupport.view(service.getLabels(search, type, AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE),
                AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100)));
    }

    @Tool(name = "label.get", description = "Get one label by its exact id.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> get(Long labelId) {
        return AgentManagementOutputSupport.view(requiredLabel(labelId));
    }

    private Label requiredLabel(Long labelId) {
        requireId(labelId);
        return labelDao.findById(labelId).orElseThrow(() -> new IllegalArgumentException("Label not found"));
    }

    @Tool(name = "label.create", description = "Create a user label.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> create(String name, @ToolParam(required = false) String value, @ToolParam(required = false) String description) {
        Label label = build(null, name, value, description);
        service.addLabel(label);
        return AgentManagementOutputSupport.view(label);
    }

    @Tool(name = "label.update", description = "Replace the editable fields of a user label by exact id.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.USER)
    public Map<String, Object> update(Long labelId, String name, @ToolParam(required = false) String value,
                        @ToolParam(required = false) String description) {
        requireId(labelId);
        Label label = requiredLabel(labelId);
        Label validated = build(labelId, name, value, description);
        label.setName(validated.getName());
        label.setTagValue(validated.getTagValue());
        label.setDescription(validated.getDescription());
        service.modifyLabel(label);
        return AgentManagementOutputSupport.view(label);
    }

    @Tool(name = "label.delete", description = "Delete one label and its associations. Requires explicit confirmation.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND, access = AgentToolAccess.ADMIN)
    public Map<String, Object> delete(Long labelId, String reason) {
        requireId(labelId);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Deletion reason is required");
        }
        requiredLabel(labelId);
        service.deleteLabels(new HashSet<>(Set.of(labelId)));
        return Map.of("deletedId", labelId);
    }

    private Label build(Long id, String name, String value, String description) {
        Label label = Label.builder().id(id).name(name).tagValue(value).description(description).type((byte) 1).build();
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
