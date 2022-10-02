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
 * 监控指标组指标字段
 * @author tom
 * @date 2021/12/5 17:29
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "监控指标组指标字段")
public class Field {

    @Schema(title = "指标采集字符名称")
    private String name;

    @Schema(title = "字段类型：0-number数字 1-string字符串")
    private Byte type;

    @Schema(title = "指标单位")
    private String unit;

    @Schema(title = "是否是实例字段")
    private Boolean instance;

}
