/*
 *
 *  * Licensed to the Apache Software Foundation (ASF) under one or more
 *  * contributor license agreements.  See the NOTICE file distributed with
 *  * this work for additional information regarding copyright ownership.
 *  * The ASF licenses this file to You under the Apache License, Version 2.0
 *  * (the "License"); you may not use this file except in compliance with
 *  * the License.  You may obtain a copy of the License at
 *  *
 *  *     http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software
 *  * distributed under the License is distributed on an "AS IS" BASIS,
 *  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the License for the specific language governing permissions and
 *  * limitations under the License.
 *
 *
 */

package org.apache.hertzbeat.common.entity.manager.bulletin;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Bulletin Metrics Data
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Bulletin Metrics Data")
public class BulletinMetricsData {

    @Schema(title = "Bulletin Name")
    private String name;

    @Schema(title = "Bulletin Column")
    private List<String> column;

    @Schema(title = "Bulletin Fields")
    private List<String> fields;

    @Schema(description = "Content Data")
    private List<Data> content;

    @lombok.Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Data {
        @Schema(title = "Monitor name")
        private String monitorName;

        @Schema(title = "Monitor ID")
        private Long monitorId;

        @Schema(title = "Monitor IP")
        private String host;

        @Schema(title = "Monitor Metrics")
        private List<Metric> metrics;
    }

    @lombok.Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @Schema(description = "Metrics Data")
    public static class Metric{

        @Schema(title = "Metric type")
        private String name;

        @Schema(title = "Metric fields")
        private List<List<Field>> fields;
    }

    @lombok.Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @Schema(description = "Metrics field")
    public static class Field{

        @Schema(title = "Field name")
        private String key;

        @Schema(title = "Field unit")
        private String unit;

        @Schema(title = "Field value")
        private String value;
    }
}
