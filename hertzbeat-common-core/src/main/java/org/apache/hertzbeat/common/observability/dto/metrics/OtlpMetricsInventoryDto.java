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

package org.apache.hertzbeat.common.observability.dto.metrics;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Source-backed OTLP metrics inventory for a workspace and optional resource context.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class OtlpMetricsInventoryDto {

    private OtlpMetricsConsoleDto.Context context;

    private String source;

    private int limit;

    private boolean truncated;

    private List<Item> items;

    /**
     * Metric name discovered from persisted samples in the requested scope.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Item {

        private String metricName;

        private String family;

        private Metadata metadata;

        public Item(String metricName, String family) {
            this(metricName, family, Metadata.unavailable());
        }
    }

    /** Declared table metadata; its unit is not an inferred unit of derived sample values. */
    public record Metadata(String state, String source, String quality, String originalName,
                           String declaredType, String declaredUnit, String temporality,
                           String description, String sampleRole, String sampleUnit) {
        public static Metadata unavailable() {
            return new Metadata("unavailable", null, null, null, null, null, null, null, "unknown", null);
        }
    }
}
