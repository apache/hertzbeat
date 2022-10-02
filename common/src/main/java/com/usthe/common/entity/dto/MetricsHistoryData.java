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

import java.util.List;
import java.util.Map;

/**
 * 历史单指标数据
 * @author tom
 * @date 2022/1/21 09:58
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "历史单指标数据")
public class MetricsHistoryData {

    @Schema(title = "监控ID")
    private Long id;

    @Schema(title = "监控类型")
    private String app;

    @Schema(title = "监控指标组")
    private String metric;

    @Schema(title = "监控指标")
    private Field field;

    @Schema(description = "监控指标历史值 instance<==>values")
    private Map<String, List<Value>> values;
}
