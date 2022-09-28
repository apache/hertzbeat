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

package com.usthe.manager.pojo.dto;

import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.Param;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Monitoring Information External Interaction Entities
 * 监控信息对外交互实体
 *
 * @author tomsun28
 * @date 2021/11/14 10:13
 */
@Data
@Schema(description = "Monitoring information entities | 监控信息实体")
public class MonitorDto {

    /**
     * Monitoring entity
     * 监控实体
     */
    @Schema(description = "监控实体", accessMode = READ_WRITE)
    @NotNull
    @Valid
    private Monitor monitor;

    /**
     * Params 参数
     */
    @Schema(description = "监控参数", accessMode = READ_WRITE)
    @NotNull
    @Valid
    private List<Param> params;

    /**
     * List of indicator groups
     * 指标组列表
     */
    @Schema(description = "指标组列表", accessMode = READ_ONLY)
    private List<String> metrics;

    /**
     * Whether to detect
     * 是否探测
     */
    @Schema(description = "是否进行探测", accessMode = READ_WRITE)
    private boolean detected;
}
