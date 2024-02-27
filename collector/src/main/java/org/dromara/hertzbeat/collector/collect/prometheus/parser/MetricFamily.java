package org.dromara.hertzbeat.collector.collect.prometheus.parser;

import lombok.Data;
import lombok.ToString;

import java.util.List;

/**
 * metric family
 * @author ceilzcx
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

    @Data
    public static class Metric {
        
        private List<Label> labels;

        private double value;

        private long timestamp;
    }

    @Data
    public static class Label {

        private String name;

        private String value;
    }
}
