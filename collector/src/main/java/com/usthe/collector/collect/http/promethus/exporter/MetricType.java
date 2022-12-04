package com.usthe.collector.collect.http.promethus.exporter;

/**
 * prometheus metrics type
 * @author ceilzcx
 * @since 7/11/2022
 */
public enum MetricType {
    // for string metric info
    INFO("info"),
    // 代表单调递增的计数器, 例: 统计次数
    COUNTER("counter"),
    // 任意上下波动的指标类型, 例: CPU的使用率
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
