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

package org.dromara.hertzbeat.manager.pojo.dto;

import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.manager.Param;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Monitoring Information External Interaction Entities
 * @author tomsun28
 */
@Data
@Schema(description = "Monitoring information entities | 监控信息实体")
public class MonitorDto {
    
    @Schema(description = "Monitor Content", accessMode = READ_WRITE)
    @NotNull
    @Valid
    private Monitor monitor;
    
    @Schema(description = "Monitor Params", accessMode = READ_WRITE)
    @NotNull
    @Valid
    private List<Param> params;
    
    @Schema(description = "Monitor Metrics", accessMode = READ_ONLY)
    private List<String> metrics;
    
    @Schema(description = "Whether to Detect", accessMode = READ_WRITE)
    private boolean detected;
    
    /**
     * which collector this monitoring want to pin
     */
    @Schema(description = "pinned collector, default null if system dispatch", accessMode = READ_WRITE)
    private String collector;
}
