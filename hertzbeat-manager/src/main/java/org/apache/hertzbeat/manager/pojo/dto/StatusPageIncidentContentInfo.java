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

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncidentContent;

/**
 * Manager-side status-page incident content DTO detached from JPA annotations.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatusPageIncidentContentInfo {

    private Long id;

    private Long incidentId;

    @NotBlank
    private String message;

    private byte state;

    private Long timestamp;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    public static StatusPageIncidentContentInfo fromEntity(StatusPageIncidentContent content) {
        if (content == null) {
            return null;
        }
        StatusPageIncidentContentInfo info = new StatusPageIncidentContentInfo();
        info.setId(content.getId());
        info.setIncidentId(content.getIncidentId());
        info.setMessage(content.getMessage());
        info.setState(content.getState());
        info.setTimestamp(content.getTimestamp());
        info.setCreator(content.getCreator());
        info.setModifier(content.getModifier());
        info.setGmtCreate(content.getGmtCreate());
        info.setGmtUpdate(content.getGmtUpdate());
        return info;
    }

    public StatusPageIncidentContent toEntity() {
        StatusPageIncidentContent content = new StatusPageIncidentContent();
        content.setId(id);
        content.setIncidentId(incidentId);
        content.setMessage(message);
        content.setState(state);
        content.setTimestamp(timestamp);
        content.setCreator(creator);
        content.setModifier(modifier);
        content.setGmtCreate(gmtCreate);
        content.setGmtUpdate(gmtUpdate);
        return content;
    }
}
