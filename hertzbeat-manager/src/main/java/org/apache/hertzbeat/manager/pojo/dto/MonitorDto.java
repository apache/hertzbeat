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

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import java.util.Objects;

/**
 * Monitoring Information External Interaction Entities
 */
@Schema(description = "Monitoring information entities")
public class MonitorDto {

    @NotNull
    @Valid
    private MonitorInfo monitorInfo;

    @NotEmpty
    @Valid
    private List<MonitorParam> paramInfos;

    private List<MetricsInfo> metrics;

    private String collector;

    private GrafanaDashboard grafanaDashboard;

    @Schema(description = "monitor content", accessMode = READ_WRITE)
    @JsonProperty("monitor")
    public MonitorInfo getMonitorInfo() {
        return monitorInfo;
    }

    @JsonProperty("monitor")
    public void setMonitorInfo(MonitorInfo monitorInfo) {
        this.monitorInfo = monitorInfo;
    }

    @Schema(description = "monitor params", accessMode = READ_WRITE)
    @JsonProperty("params")
    public List<MonitorParam> getParamInfos() {
        return paramInfos;
    }

    @JsonProperty("params")
    public void setParamInfos(List<MonitorParam> paramInfos) {
        this.paramInfos = paramInfos;
    }

    @JsonIgnore
    public Monitor getMonitor() {
        return monitorInfo == null ? null : monitorInfo.toEntity();
    }

    public void setMonitor(Monitor monitor) {
        this.monitorInfo = MonitorInfo.fromEntity(monitor);
    }

    @JsonIgnore
    public List<Param> getParams() {
        return paramInfos == null ? null : paramInfos.stream()
                .filter(Objects::nonNull)
                .map(MonitorParam::toEntity)
                .toList();
    }

    public void setParams(List<Param> params) {
        this.paramInfos = params == null ? null : params.stream()
                .filter(Objects::nonNull)
                .map(MonitorParam::fromEntity)
                .toList();
    }

    @Schema(description = "Monitor Metrics", accessMode = READ_ONLY)
    public List<MetricsInfo> getMetrics() {
        return metrics;
    }

    public void setMetrics(List<MetricsInfo> metrics) {
        this.metrics = metrics;
    }

    @Schema(description = "pinned collector, default null if system dispatch", accessMode = READ_WRITE)
    public String getCollector() {
        return collector;
    }

    public void setCollector(String collector) {
        this.collector = collector;
    }

    @Schema(description = "grafana dashboard")
    public GrafanaDashboard getGrafanaDashboard() {
        return grafanaDashboard;
    }

    public void setGrafanaDashboard(GrafanaDashboard grafanaDashboard) {
        this.grafanaDashboard = grafanaDashboard;
    }
}
