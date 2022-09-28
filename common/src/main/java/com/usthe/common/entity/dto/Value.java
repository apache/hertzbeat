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

package com.usthe.common.entity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 监控指标组指标值
 * @author tom
 * @date 2021/12/5 17:43
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "监控指标组指标值")
public class Value {

    public Value(String origin) {
        this.origin = origin;
    }

    public Value(String origin, long time) {
        this.origin = origin;
        this.time = time;
    }

    @Schema(title = "原始值")
    private String origin;

    @Schema(title = "平均值")
    private String mean;

    @Schema(title = "中位数值,暂不支持")
    private String median;

    @Schema(title = "最小值")
    private String min;

    @Schema(title = "最大值")
    private String max;

    @Schema(title = "数据采集时间,此字段查历史数据时有效")
    private Long time;
}
