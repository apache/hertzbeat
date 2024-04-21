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

package org.apache.hertzbeat.collector.collect.prometheus.parser;

import java.util.List;
import lombok.Data;
import lombok.ToString;

/**
 * metric family
 */
@Data
@ToString
public class MetricFamily {
    
    /**
     * metric name
     */
    private String name;

    /**
     * metrics
     */
    private List<Metric> metricList;

    /**
     * Metric
     */
    @Data
    public static class Metric {

        /**
         * labels
         */
        private List<Label> labels;

        /**
         * value
         */
        private double value;

        /**
         * timestamp
         */
        private long timestamp;
    }

    /**
     * Label
     */
    @Data
    public static class Label {

        /**
         * name
         */
        private String name;

        /**
         * value
         */
        private String value;
    }
}
