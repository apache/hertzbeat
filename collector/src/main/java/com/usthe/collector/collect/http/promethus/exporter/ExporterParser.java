package com.usthe.collector.collect.http.promethus.exporter;

import com.usthe.collector.collect.http.promethus.ParseException;
import com.usthe.common.util.StrBuffer;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author ceilzcx
 * @since 7/11/2022
 * 解析prometheus的exporter接口传递的数据 http:xxx/metrics
 * 参考: prometheus的text_parse.go的代码, 入口: TextToMetricFamilies
 */
@Slf4j
public class ExporterParser {
    private static final String HELP = "HELP";
    private static final String TYPE = "TYPE";
    private static final String EOF = "EOF";

    private static final String QUANTILE_LABEL = "quantile";
    private static final String BUCKET_LABEL = "le";
    private static final String NAME_LABEL = "__name__";
    private static final String SUM_SUFFIX = "_sum";
    private static final String COUNT_SUFFIX = "_count";
//    private static final String BUCKET_SUFFIX = "_bucket";
//    private static final String INFO_SUFFIX = "_info";
//    private static final String TOTAL_SUFFIX = "_total";
//    private static final String CREATED_SUFFIX = "_created";

    private MetricFamily currentMetricFamily;
    private String currentQuantile;
    private String currentBucket;

    public Map<String, MetricFamily> textToMetric(String resp) {
        // key: metric name, value: metric family
        Map<String, MetricFamily> metricMap = new ConcurrentHashMap<>();
        String[] lines = resp.split("\n");
        for (String line : lines) {
            this.parseLine(metricMap, new StrBuffer(line));
        }
        return metricMap;
    }

    private void parseLine(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        switch (buffer.charAt(0)) {
            case '#':
                buffer.read();
                this.currentMetricFamily = null;
                this.parseComment(metricMap, buffer);
                break;
            case '\n':
                break;
            default:
                this.currentBucket = null;
                this.currentQuantile = null;
                this.parseMetric(buffer);
        }
    }

    private void parseComment(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        String token = this.readTokenUnitWhitespace(buffer);
        if (token.equals(EOF)) {
            return;
        }
        if (!token.equals(HELP) && !token.equals(TYPE)) {
            log.error("parse comment error {}, start without {} or {}", buffer.toStr(), HELP, TYPE);
            return;
        }
        String metricName = this.readTokenAsMetricName(buffer);
        this.currentMetricFamily = metricMap.computeIfAbsent(metricName, key -> new MetricFamily());
        this.currentMetricFamily.setName(metricName);
        switch (token) {
            case HELP:
                this.parseHelp(buffer);
                break;
            case TYPE:
                this.parseType(buffer);
                break;
            default:
        }
    }

    private void parseHelp(StrBuffer line) {
        line.skipBlankTabs();
        this.currentMetricFamily.setHelp(line.toStr());
    }

    private void parseType(StrBuffer line) {
        line.skipBlankTabs();
        String type = line.toStr().toLowerCase();
        MetricType metricType = MetricType.getType(type);
        if (metricType == null) {
            throw new ParseException("pare type error");
        }
        this.currentMetricFamily.setMetricType(metricType);
    }

    private void parseMetric(StrBuffer buffer) {
        String metricName = this.readTokenAsMetricName(buffer);
        if (StringUtils.isEmpty(metricName)) {
            log.error("error parse metric, metric name is null, line: {}", buffer.toStr());
            return;
        }
        List<MetricFamily.Metric> metricList = this.currentMetricFamily.getMetricList();
        if (metricList == null) {
            metricList = new ArrayList<>();
            this.currentMetricFamily.setMetricList(metricList);
        }
        // todo 这里可能存在问题, 目前逻辑是HISTOGRAM和SUMMARY只创建一个metric
        //  相比源码有所改动: 源码通过属性存储解析结果; 这边通过参数传递
        MetricFamily.Metric metric;
        if (!metricList.isEmpty() &&
                (this.currentMetricFamily.getMetricType().equals(MetricType.HISTOGRAM) ||
                        this.currentMetricFamily.getMetricType().equals(MetricType.SUMMARY))) {
            metric = metricList.get(0);
        } else {
            metric = new MetricFamily.Metric();
            metricList.add(metric);
        }

        this.readLabels(metric, buffer);
    }

    private void readLabels(MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        metric.setLabelPair(new ArrayList<>());
        if (buffer.charAt(0) == '{') {
            buffer.read();
            this.startReadLabelName(metric, buffer);
        } else {
            this.readLabelValue(metric, null, buffer);
        }
    }

    private void startReadLabelName(MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        if (buffer.charAt(0) == '}') {
            buffer.read();
            buffer.skipBlankTabs();
            if (buffer.isEmpty()) return;
            this.readLabelValue(metric, new MetricFamily.Label(), buffer);
            return;
        }
        String labelName = this.readTokenAsLabelName(buffer);
        if (labelName.isEmpty() || labelName.equals(NAME_LABEL)) {
            throw new ParseException("invalid label name" + labelName + ", label name size = 0 or label name equals " + NAME_LABEL);
        }
        MetricFamily.Label label = new MetricFamily.Label();
        label.setName(labelName);
        if (buffer.read() != '=') {
            throw new ParseException("parse error, not match the format of labelName=labelValue");
        }
        this.startReadLabelValue(metric, label, buffer);
    }

    private void startReadLabelValue(MetricFamily.Metric metric, MetricFamily.Label label, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        char c = buffer.read();
        if (c != '"') {
            throw new ParseException("expected '\"' at start of label value, line: " + buffer.toStr());
        }
        String labelValue = this.readTokenAsLabelValue(buffer);
        label.setValue(labelValue);
        if (!this.isValidLabelValue(labelValue)) {
            throw new ParseException("no valid label value: " + labelValue);
        }
        if (this.currentMetricFamily.getMetricType().equals(MetricType.SUMMARY) && label.getName().equals(QUANTILE_LABEL)) {
            this.currentQuantile = labelValue;
        } else if (this.currentMetricFamily.getMetricType().equals(MetricType.HISTOGRAM) && label.getName().equals(BUCKET_LABEL)) {
            this.currentBucket = labelValue;
        } else {
            metric.getLabelPair().add(label);
        }
        if (buffer.isEmpty()) return;
        c = buffer.read();
        switch (c) {
            case ',':
                this.startReadLabelName(metric, buffer);
                break;
            case '}':
                this.readLabelValue(metric, label, buffer);
                break;
            default:
                throw new ParseException("expected '}' or ',' at end of label value, line: " + buffer.toStr());
        }
    }

    private void readLabelValue(MetricFamily.Metric metric, MetricFamily.Label label, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        switch (this.currentMetricFamily.getMetricType()) {
            case INFO:
                MetricFamily.Info info = new MetricFamily.Info();
                info.setValue(buffer.toDouble());
                metric.setInfo(info);
                break;
            case COUNTER:
                MetricFamily.Counter counter = new MetricFamily.Counter();
                counter.setValue(buffer.toDouble());
                metric.setCounter(counter);
                break;
            case GAUGE:
                MetricFamily.Gauge gauge = new MetricFamily.Gauge();
                gauge.setValue(buffer.toDouble());
                metric.setGauge(gauge);
                break;
            case UNTYPED:
                MetricFamily.Untyped untyped = new MetricFamily.Untyped();
                untyped.setValue(buffer.toDouble());
                metric.setUntyped(untyped);
                break;
            case SUMMARY:
                MetricFamily.Summary summary = metric.getSummary();
                if (summary == null) {
                    summary = new MetricFamily.Summary();
                    metric.setSummary(summary);
                }
                // 处理 xxx_sum 的数据
                if (label != null && this.isSum(label.getName())) {
                    summary.setSum(buffer.toDouble());
                }
                // 处理 xxx_count 的数据
                else if (label != null && this.isCount(label.getName())) {
                    summary.setCount(buffer.toLong());
                }
                // 处理 "xxx{quantile=\"0\"} 0" 的格式
                else if (StringUtils.isNotEmpty(this.currentQuantile)) {
                    List<MetricFamily.Quantile> quantileList = summary.getQuantileList();
                    MetricFamily.Quantile quantile = new MetricFamily.Quantile();
                    quantile.setXLabel(StrBuffer.parseDouble(this.currentQuantile));
                    quantile.setValue(buffer.toDouble());
                    quantileList.add(quantile);
                }
                break;
            case HISTOGRAM:
                MetricFamily.Histogram histogram = metric.getHistogram();
                if (histogram == null) {
                    histogram = new MetricFamily.Histogram();
                    metric.setHistogram(histogram);
                }
                if (label != null && this.isSum(label.getName())) {
                    histogram.setSum(buffer.toDouble());
                } else if (label != null && this.isCount(label.getName())) {
                    histogram.setCount(buffer.toLong());
                }
                // 处理 "xxx{quantile=\"0\"} 0" 的格式
                else if (StringUtils.isNotEmpty(this.currentBucket)) {
                    List<MetricFamily.Bucket> bucketList = histogram.getBucketList();
                    MetricFamily.Bucket bucket = new MetricFamily.Bucket();
                    bucket.setUpperBound(StrBuffer.parseDouble(this.currentBucket));
                    bucket.setCumulativeCount(buffer.toLong());
                    bucketList.add(bucket);
                }
                break;
            default:
                throw new ParseException("no such type in metricFamily");
        }
    }

    // 读取第一个空格符前的token
    private String readTokenUnitWhitespace(StrBuffer buffer) {
        StringBuilder builder = new StringBuilder();
        while (!buffer.isEmpty()) {
            char c = buffer.read();
            if (c == ' ') {
                break;
            }
            builder.append(c);
        }
        return builder.toString();
    }

    // 获取指标的名称
    private String readTokenAsMetricName(StrBuffer buffer) {
        StringBuilder builder = new StringBuilder();
        if (this.isValidMetricNameStart(buffer.charAt(0))) {
            while (!buffer.isEmpty()) {
                char c = buffer.read();
                if (!this.isValidMetricNameContinuation(c)) {
                    buffer.rollback();
                    break;
                }
                builder.append(c);
            }
            return builder.toString();
        }
        throw new ParseException("parse metric name error");
    }

    // 获取Label的名称
    private String readTokenAsLabelName(StrBuffer buffer) {
        StringBuilder builder = new StringBuilder();
        char c = buffer.read();
        if (this.isValidLabelNameStart(c)) {
            builder.append(c);
            while (!buffer.isEmpty()) {
                c = buffer.read();
                if (!this.isValidLabelNameContinuation(c)) {
                    buffer.rollback();
                    break;
                }
                builder.append(c);
            }
            return builder.toString();
        }
        throw new ParseException("parse label name error");
    }

    // 获取Label的值
    private String readTokenAsLabelValue(StrBuffer buffer) {
        StringBuilder builder = new StringBuilder();
        boolean escaped = false;
        while (!buffer.isEmpty()) {
            char c = buffer.read();
            // 处理 '\\' 转义
            if (escaped) {
                switch (c) {
                    case '"':
                    case '\\':
                        builder.append(c);
                        break;
                    case 'n':
                        builder.append('\n');
                        break;
                    default:
                        throw new ParseException("parse label value error");
                }
            } else {
                switch (c) {
                    case '"':
                        return builder.toString();
                    case '\n':
                        throw new ParseException("parse label value error, next line");
                    case '\\':
                        escaped = true;
                        break;
                    default:
                        builder.append(c);
                }
            }
        }
        return builder.toString();
    }

    // 是否符合metric name首字符规则
    private boolean isValidMetricNameStart(char c) {
        return isValidLabelNameStart(c) || c == ':';
    }

    // 是否符合metric name除首字符其他字符规则
    private boolean isValidMetricNameContinuation(char c) {
        return isValidLabelNameContinuation(c) || c == ':';
    }

    // 是否符合label name首字符规则
    private boolean isValidLabelNameStart(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
    }

    // 是否符合label name除首字符其他字符规则
    private boolean isValidLabelNameContinuation(char c) {
        return isValidLabelNameStart(c) || (c >= '0' && c <= '9');
    }

    // 检测是否是有效的utf8编码的字符串
    private boolean isValidLabelValue(String s) {
        return s != null && s.equals(new String(s.getBytes(StandardCharsets.UTF_8)));
    }

    private boolean isSum(String s) {
        return s != null && s.endsWith(SUM_SUFFIX);
    }

    private boolean isCount(String s) {
        return s != null && s.endsWith(COUNT_SUFFIX);
    }

}
