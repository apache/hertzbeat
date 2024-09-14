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

package org.apache.hertzbeat.manager.pojo.dto;

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

    /**
     * Bulletin Name
     */
    @Schema(title = "Bulletin Name")
    private String name;

    /**
     * Content Data
     */
    @Schema(description = "Content Data")
    private List<Data> content;

    /**
     * Bulletin Metrics Data
     */
    @lombok.Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Data {

        /**
         * Monitor Name
         */
        @Schema(title = "Monitor name")
        private String monitorName;

        /**
         * Monitor ID
         */
        @Schema(title = "Monitor ID")
        private Long monitorId;

        /**
         * Monitor IP
         */
        @Schema(title = "Monitor IP")
        private String host;

        /**
         * Monitor Metrics
         */
        @Schema(title = "Monitor Metrics")
        private List<Metric> metrics;
    }

    /**
     * Metrics Data
     */
    @lombok.Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @Schema(description = "Metrics Data")
    public static class Metric{

        /**
         * Metric type
         */
        @Schema(title = "Metric type")
        private String name;

        /**
         * Metric fields
         */
        @Schema(title = "Metric fields")
        private List<List<Field>> fields;
    }


    /**
     * Metrics field
     */
    @lombok.Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @Schema(description = "Metrics field")
    public static class Field{

        /**
         * Field name
         */
        @Schema(title = "Field name")
        private String key;

        /**
         * Field unit
         */
        @Schema(title = "Field unit")
        private String unit;

        /**
         * Field value
         */
        @Schema(title = "Field value")
        private String value;
    }
}
