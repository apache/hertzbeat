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

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;

/**
 * Manager-side status-page incident DTO detached from JPA annotations.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatusPageIncidentInfo {

    private Long id;

    private Long orgId;

    @NotBlank
    private String name;

    private byte state;

    private Long startTime;

    private Long endTime;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    @Valid
    private List<StatusPageComponentInfo> components;

    @Valid
    private List<StatusPageIncidentContentInfo> contents;

    public static StatusPageIncidentInfo fromEntity(StatusPageIncident incident) {
        if (incident == null) {
            return null;
        }
        StatusPageIncidentInfo info = new StatusPageIncidentInfo();
        info.setId(incident.getId());
        info.setOrgId(incident.getOrgId());
        info.setName(incident.getName());
        info.setState(incident.getState());
        info.setStartTime(incident.getStartTime());
        info.setEndTime(incident.getEndTime());
        info.setCreator(incident.getCreator());
        info.setModifier(incident.getModifier());
        info.setGmtCreate(incident.getGmtCreate());
        info.setGmtUpdate(incident.getGmtUpdate());
        info.setComponents(incident.getComponents() == null ? null : incident.getComponents().stream()
                .filter(Objects::nonNull)
                .map(StatusPageComponentInfo::fromEntity)
                .toList());
        info.setContents(incident.getContents() == null ? null : incident.getContents().stream()
                .filter(Objects::nonNull)
                .map(StatusPageIncidentContentInfo::fromEntity)
                .toList());
        return info;
    }

    public StatusPageIncident toEntity() {
        StatusPageIncident incident = new StatusPageIncident();
        incident.setId(id);
        incident.setOrgId(orgId);
        incident.setName(name);
        incident.setState(state);
        incident.setStartTime(startTime);
        incident.setEndTime(endTime);
        incident.setCreator(creator);
        incident.setModifier(modifier);
        incident.setGmtCreate(gmtCreate);
        incident.setGmtUpdate(gmtUpdate);
        incident.setComponents(components == null ? null : components.stream()
                .filter(Objects::nonNull)
                .map(StatusPageComponentInfo::toEntity)
                .toList());
        incident.setContents(contents == null ? null : contents.stream()
                .filter(Objects::nonNull)
                .map(StatusPageIncidentContentInfo::toEntity)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
        return incident;
    }
}
