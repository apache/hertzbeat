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

package org.apache.hertzbeat.collector.collect.http.promethus.exporter;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import lombok.ToString;

/**
 * MetricFamily.
 */
@Data
@ToString
public class MetricFamily {
    /**
     * metric name
     */
    private String name;

    /**
     * metric help
     */
    private String help;

    /**
     * metric type
     */
    private MetricType metricType;

    /**
     * Specific metric
     */
    private List<Metric> metricList;

    /**
     * Metric
     */
    @Data
    public static class Metric {

        /**
         * Label data, mainly corresponding to the content within {}
         */
        private List<Label> labelPair;

        /**
         * info
         */
        private Info info;

        /**
         * gauge
         */
        private Gauge gauge;

        /**
         * counter
         */
        private Counter counter;

        /**
         * summary
         */
        private Summary summary;

        /**
         * untyped
         */
        private Untyped untyped;

        /**
         * histogram
         */
        private Histogram histogram;

        /**
         * timestampMs
         */
        private Long timestampMs;
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

    /**
     * Info
     */
    @Data
    public static class Info {

        /**
         * value
         */
        private double value;

    }

    /**
     * Counter
     */
    @Data
    public static class Counter {

        /**
         * value
         */
        private double value;

        // Exemplar
    }

    /**
     * Gauge
     */
    @Data
    public static class Gauge {

        /**
         * value
         */
        private double value;
    }

    /**
     * untyped
     */
    @Data
    public static class Untyped {

        /**
         * value
         */
        private double value;
    }

    /**
     * Summary
     */
    @Data
    public static class Summary {

        /**
         * value
         */
        private double value;

        /**
         * count
         */
        private long count;

        /**
         * sum
         */
        private double sum;

        /**
         * quantileList
         */
        private List<Quantile> quantileList = new ArrayList<>();
    }

    /**
     * Quantile
     */
    @Data
    public static class Quantile {
        /**
         * Corresponding to the quantile field in Prometheus
         */
        private double xLabel;

        /**
         * value
         */
        private double value;
    }

    /**
     * Histogram
     */
    @Data
    public static class Histogram {

        /**
         * value
         */
        private double value;

        /**
         * count
         */
        private long count;

        /**
         * sum
         */
        private double sum;

        /**
         * bucketList
         */
        private List<Bucket> bucketList = new ArrayList<>();
    }

    /**
     * Bucket
     */
    @Data
    public static class Bucket {

        /**
         * cumulativeCount
         */
        private long cumulativeCount;

        /**
         * upperBound
         */
        private double upperBound;
    }
}
