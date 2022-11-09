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
    /**
     * 指标名称
     * metric name
     */
    private String name;

    /**
     * 指标描述
     * metric help
     */
    private String help;

    /**
     * 指标类型
     * metric type
     */
    private MetricType metricType;

    /**
     * 具体的指标
     */
    private List<Metric> metricList;

    @Data
    static class Metric {

        /**
         * 标签数据, 主要对应{}内容
         */
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
        // 对应 prometheus 的 quantile 字段
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
