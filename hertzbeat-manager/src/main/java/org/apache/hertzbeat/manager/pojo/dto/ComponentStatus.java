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

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;
import java.util.Objects;

/**
 * status page's component status dto
 */
@Schema(description = "Status Page's Component Status")
public class ComponentStatus {

    private StatusPageComponentInfo componentInfo;

    private List<StatusPageHistoryInfo> historyItems;

    @Schema(description = "Component Info")
    @JsonProperty("info")
    public StatusPageComponentInfo getComponentInfo() {
        return componentInfo;
    }

    @JsonProperty("info")
    public void setComponentInfo(StatusPageComponentInfo componentInfo) {
        this.componentInfo = componentInfo;
    }

    @Schema(description = "Component History")
    @JsonProperty("history")
    public List<StatusPageHistoryInfo> getHistoryItems() {
        return historyItems;
    }

    @JsonProperty("history")
    public void setHistoryItems(List<StatusPageHistoryInfo> historyItems) {
        this.historyItems = historyItems;
    }

    @JsonIgnore
    public StatusPageComponent getInfo() {
        return componentInfo == null ? null : componentInfo.toEntity();
    }

    public void setInfo(StatusPageComponent info) {
        this.componentInfo = StatusPageComponentInfo.fromEntity(info);
    }

    @JsonIgnore
    public List<StatusPageHistory> getHistory() {
        return historyItems == null ? null : historyItems.stream()
                .filter(Objects::nonNull)
                .map(StatusPageHistoryInfo::toEntity)
                .toList();
    }

    public void setHistory(List<StatusPageHistory> history) {
        this.historyItems = history == null ? null : history.stream()
                .filter(Objects::nonNull)
                .map(StatusPageHistoryInfo::fromEntity)
                .toList();
    }
}
