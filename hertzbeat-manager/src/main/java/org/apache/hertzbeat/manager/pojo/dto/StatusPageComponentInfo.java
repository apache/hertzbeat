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

package org.apache.hertzbeat.manager.pojo.dto;

import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;

/**
 * Public status-page component DTO.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatusPageComponentInfo {

    private Long id;

    private Long orgId;

    private String name;

    private String description;

    private Map<String, String> labels;

    private byte method;

    private byte configState;

    private byte state;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    public static StatusPageComponentInfo fromEntity(StatusPageComponent component) {
        if (component == null) {
            return null;
        }
        StatusPageComponentInfo info = new StatusPageComponentInfo();
        info.setId(component.getId());
        info.setOrgId(component.getOrgId());
        info.setName(component.getName());
        info.setDescription(component.getDescription());
        info.setLabels(component.getLabels());
        info.setMethod(component.getMethod());
        info.setConfigState(component.getConfigState());
        info.setState(component.getState());
        info.setCreator(component.getCreator());
        info.setModifier(component.getModifier());
        info.setGmtCreate(component.getGmtCreate());
        info.setGmtUpdate(component.getGmtUpdate());
        return info;
    }

    public StatusPageComponent toEntity() {
        StatusPageComponent component = new StatusPageComponent();
        component.setId(id);
        component.setOrgId(orgId);
        component.setName(name);
        component.setDescription(description);
        component.setLabels(labels);
        component.setMethod(method);
        component.setConfigState(configState);
        component.setState(state);
        component.setCreator(creator);
        component.setModifier(modifier);
        component.setGmtCreate(gmtCreate);
        component.setGmtUpdate(gmtUpdate);
        return component;
    }
}
