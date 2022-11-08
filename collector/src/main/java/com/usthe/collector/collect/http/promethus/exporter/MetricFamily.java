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

        private Object gauge;

        private Object counter;

        private Object summary;

        private Object untyped;

        private Object histogram;

        private Long timestampMs;
    }

    @Data
    static class Label {

        private String name;

        private String value;
    }
}
