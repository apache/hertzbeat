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

package org.dromara.hertzbeat.common.entity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;


/**
 * Alarm Report Content Entity
 * @author yuye
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alarm Report Content Entity")
public class AlertReport {

    @Schema(title = "Alert record saas index ID")
    private String alertId;

    @Schema(title = "Alert Name")
    private String alertName;

    @Schema(title = "Alarm evaluation interval")
    private Integer alertDuration;

    @Schema(title = "Time when the log service receives the alarm message", description = "日志服务接收到告警消息的时间",
            example = "1694589491000", accessMode = READ_WRITE)
    private long alertTime;

    @Schema(title = "Alarm priority. 0: high emergency alarm red 1: medium critical serious alarm Orange 2: low warning warning alarm yellow",
            description = "告警严重度。0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "1", accessMode = READ_WRITE)
    private Integer priority;

    @Schema(title = "Alarm type. 0: the default 1 is business system exception reporting",
            description = "告警类型。0:内部告警 1:外部系统上报", example = "0", accessMode = READ_WRITE)
    private Integer reportType;

    @Schema(title = "Alarm tag information", description = "告警标签信息((monitorId:xxx,monitorName:xxx))",
            example = "{\"key1\":\"value1\"}", accessMode = READ_WRITE)
    private Map<String, String> labels;

    @Schema(title = " Alarm marking (monitorId:xxx,monitorName:xxx)", description = "告警标注", example ="{\"key1\":\"value1\"}"
            , accessMode = READ_WRITE)
    private Map<String, String> annotations;

    @Schema(title = " Alarm content", description = "告警内容", example = "对外报警内容", accessMode = READ_WRITE)
    private String content;

}
