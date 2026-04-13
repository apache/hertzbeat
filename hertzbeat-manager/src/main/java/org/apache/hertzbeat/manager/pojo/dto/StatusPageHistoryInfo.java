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
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;

/**
 * Public status-page history DTO.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatusPageHistoryInfo {

    private Long id;

    private Long componentId;

    private byte state;

    private Long timestamp;

    private Double uptime;

    private Integer abnormal;

    private Integer unknowing;

    private Integer normal;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    public static StatusPageHistoryInfo fromEntity(StatusPageHistory history) {
        if (history == null) {
            return null;
        }
        StatusPageHistoryInfo info = new StatusPageHistoryInfo();
        info.setId(history.getId());
        info.setComponentId(history.getComponentId());
        info.setState(history.getState());
        info.setTimestamp(history.getTimestamp());
        info.setUptime(history.getUptime());
        info.setAbnormal(history.getAbnormal());
        info.setUnknowing(history.getUnknowing());
        info.setNormal(history.getNormal());
        info.setCreator(history.getCreator());
        info.setModifier(history.getModifier());
        info.setGmtCreate(history.getGmtCreate());
        info.setGmtUpdate(history.getGmtUpdate());
        return info;
    }

    public StatusPageHistory toEntity() {
        StatusPageHistory history = new StatusPageHistory();
        history.setId(id);
        history.setComponentId(componentId);
        history.setState(state);
        history.setTimestamp(timestamp);
        history.setUptime(uptime);
        history.setAbnormal(abnormal);
        history.setUnknowing(unknowing);
        history.setNormal(normal);
        history.setCreator(creator);
        history.setModifier(modifier);
        history.setGmtCreate(gmtCreate);
        history.setGmtUpdate(gmtUpdate);
        return history;
    }
}
