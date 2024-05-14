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

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Monitoring Metrics Data
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Monitoring Metrics Data")
public class MetricsData {

    @Schema(title = "Monitoring Task ID")
    private Long id;

    @Schema(title = "Monitoring Type")
    private String app;

    @Schema(title = "Monitoring Metrics")
    private String metrics;

    @Schema(title = "Latest Collect Time")
    private Long time;

    @Schema(description = "Monitoring Metrics fields")
    private List<Field> fields;

    @Schema(description = "Monitoring Metrics DataRow")
    private List<ValueRow> valueRows;
}
