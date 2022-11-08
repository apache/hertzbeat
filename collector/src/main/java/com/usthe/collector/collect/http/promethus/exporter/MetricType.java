package com.usthe.collector.collect.http.promethus.exporter;

/**
 * @author ceilzcx
 * @since 7/11/2022
 */
public enum MetricType {
    COUNTER("counter"),
    GAUGE("gauge"),
    SUMMARY("summary"),
    UNTYPED("untyped"),
    HISTOGRAM("histogram");

    private final String value;

    MetricType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static MetricType getType(String value) {
        for (MetricType metricType : values()) {
            if (metricType.getValue().equals(value)) {
                return metricType;
            }
        }
        return null;
    }
}
