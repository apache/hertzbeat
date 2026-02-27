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

package org.apache.hertzbeat.common.entity.dto.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Metric History Range Query Data
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Query Request Data")
public class DatasourceQuery {
    
    @Schema(title = "Ref Id, unique id for the query")
    private String refId;
    
    @Schema(title = "datasource name")
    private String datasource;
    
    @Schema(title = "query expr, like prometheus query")
    private String expr;
    
    @Schema(title = "query expr type, like promql or sql or influxql")
    private String exprType;
    
    @Schema(title = "query range type, like range or instant")
    private String timeType;

    @Schema(title = "query range start time")
    private Long start;

    @Schema(title = "query range end time")
    private Long end;
    
    @Schema(title = "query time step, like 5m or 1h")
    private String step;
}
