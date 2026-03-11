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
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;

/**
 * Manager-side status-page org DTO detached from JPA annotations.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatusPageOrgInfo {

    private Long id;

    @NotBlank
    private String name;

    @NotBlank
    private String description;

    @NotBlank
    private String home;

    @NotBlank
    private String logo;

    private String feedback;

    private String color;

    private byte state;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    public static StatusPageOrgInfo fromEntity(StatusPageOrg statusPageOrg) {
        if (statusPageOrg == null) {
            return null;
        }
        StatusPageOrgInfo info = new StatusPageOrgInfo();
        info.setId(statusPageOrg.getId());
        info.setName(statusPageOrg.getName());
        info.setDescription(statusPageOrg.getDescription());
        info.setHome(statusPageOrg.getHome());
        info.setLogo(statusPageOrg.getLogo());
        info.setFeedback(statusPageOrg.getFeedback());
        info.setColor(statusPageOrg.getColor());
        info.setState(statusPageOrg.getState());
        info.setCreator(statusPageOrg.getCreator());
        info.setModifier(statusPageOrg.getModifier());
        info.setGmtCreate(statusPageOrg.getGmtCreate());
        info.setGmtUpdate(statusPageOrg.getGmtUpdate());
        return info;
    }

    public StatusPageOrg toEntity() {
        StatusPageOrg statusPageOrg = new StatusPageOrg();
        statusPageOrg.setId(id);
        statusPageOrg.setName(name);
        statusPageOrg.setDescription(description);
        statusPageOrg.setHome(home);
        statusPageOrg.setLogo(logo);
        statusPageOrg.setFeedback(feedback);
        statusPageOrg.setColor(color);
        statusPageOrg.setState(state);
        statusPageOrg.setCreator(creator);
        statusPageOrg.setModifier(modifier);
        statusPageOrg.setGmtCreate(gmtCreate);
        statusPageOrg.setGmtUpdate(gmtUpdate);
        return statusPageOrg;
    }
}
