package org.dromara.hertzbeat.collector.collect.prometheus.parser;

import lombok.Data;
import lombok.ToString;

import java.util.List;

/**
 * metric family
 *
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
