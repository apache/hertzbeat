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
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Data;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;

/**
 * Monitoring Information External Interaction Entities
 */
@Data
@Schema(description = "Monitoring information entities")
public class MonitorDto {
    
    @Schema(description = "Monitor Content", accessMode = READ_WRITE)
    @NotNull
    @Valid
    private Monitor monitor;
    
    @Schema(description = "Monitor Params", accessMode = READ_WRITE)
    @NotEmpty
    @Valid
    private List<Param> params;
    
    @Schema(description = "Monitor Metrics", accessMode = READ_ONLY)
    private List<String> metrics;
    
    @Schema(description = "pinned collector, default null if system dispatch", accessMode = READ_WRITE)
    private String collector;
    
    @Schema(description = "grafana dashboard")
    private GrafanaDashboard grafanaDashboard;
}
