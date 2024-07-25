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

package org.apache.hertzbeat.common.entity.dto;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Alarm Report Content Entity
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

    @Schema(title = "Time when the log service receives the alarm message",
            description = "Time when the log service receives the alarm message",
            example = "1694589491000", accessMode = READ_WRITE)
    private long alertTime;

    @Schema(title = "Alarm priority. "
            + "0: high emergency alarm red "
            + "1: medium critical serious alarm Orange "
            + "2: low warning warning alarm yellow",
            description = "Alarm priority. 0: high emergency alarm red "
                    + "1: medium critical serious alarm Orange "
                    + "2: low warning warning alarm yellow",
            example = "1", accessMode = READ_WRITE)
    private Integer priority;

    @Schema(title = "Alarm type. 0: the default 1 is business system exception reporting",
            description = "Alarm type. 0: the default 1 is business system exception reporting",
            example = "0", accessMode = READ_WRITE)
    private Integer reportType;

    @Schema(title = "Alarm tag information",
            description = "Alarm label information((monitorId:xxx,monitorName:xxx))",
            example = "{\"key1\":\"value1\"}", accessMode = READ_WRITE)
    private Map<String, String> labels;

    @Schema(title = " Alarm marking (monitorId:xxx,monitorName:xxx)",
            description = "Alarm labeling",
            example = "{\"key1\":\"value1\"}"
            , accessMode = READ_WRITE)
    private Map<String, String> annotations;

    @Schema(title = " Alarm content",
            description = "Content of alarm",
            example = "External alarm content",
            accessMode = READ_WRITE)
    private String content;

}
