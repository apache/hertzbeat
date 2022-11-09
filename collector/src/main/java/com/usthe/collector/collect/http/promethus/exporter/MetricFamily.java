package com.usthe.collector.collect.http.promethus.exporter;

import lombok.Data;
import lombok.ToString;

import java.util.List;

/**
 * @author ceilzcx
 * @since 7/11/2022
 */
@Data
@ToString
public class MetricFamily {

    private String name;

    private String help;

    private MetricType metricType;

    private List<Metric> metricList;

    @Data
    static class Metric {

        private List<Label> labelPair;

        private Gauge gauge;

        private Counter counter;

        private Summary summary;

        private Untyped untyped;

        private Histogram histogram;

        private Long timestampMs;
    }

    @Data
    static class Label {

        private String name;

        private String value;
    }

    @Data
    static class Counter {

        private double value;

        // Exemplar
    }

    @Data
    static class Gauge {

        private double value;
    }

    @Data
    static class Untyped {

        private double value;
    }

    @Data
    static class Summary {

        private long count;

        private double sum;

        private List<Quantile> quantileList;
    }

    @Data
    static class Quantile {

        private double xLabel;

        private double value;
    }

    @Data
    static class Histogram {

        private long count;

        private double sum;

        private List<Bucket> bucketList;
    }

    @Data
    static class Bucket {

        private long cumulativeCount;

        private double upperBound;
    }
}
