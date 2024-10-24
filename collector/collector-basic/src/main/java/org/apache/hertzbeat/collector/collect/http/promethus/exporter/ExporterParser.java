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

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.http.promethus.ParseException;
import org.apache.hertzbeat.common.util.StrBuffer;

/**
 * Resolves the data passed by prometheus's exporter interface http:xxx/metrics
 * Reference: prometheus text_parse.go code, entry: TextToMetricFamilies
 */
@Slf4j
public class ExporterParser {
    private static final String HELP = "HELP";
    private static final String TYPE = "TYPE";
    private static final String EOF = "EOF";
    private static final String METRIC_NAME_LABEL = ".name";
    private static final String QUANTILE_LABEL = "quantile";
    private static final String BUCKET_LABEL = "le";
    private static final String NAME_LABEL = "__name__";
    private static final String SUM_SUFFIX = "_sum";
    private static final String COUNT_SUFFIX = "_count";

    private static final char LEFT_CURLY_BRACKET = '{';
    private static final char RIGHT_CURLY_BRACKET = '}';
    private static final char EQUALS = '=';
    private static final char QUOTES = '"';
    private static final char ENTER = '\n';
    private static final char SPACE = ' ';
    private static final char COMMA = ',';
    private final Lock lock = new ReentrantLock();
    private MetricFamily currentMetricFamily;
    private String currentQuantile;
    private String currentBucket;

    public Map<String, MetricFamily> textToMetric(String resp) {
        // key: metric name, value: metric family
        Map<String, MetricFamily> metricMap = new ConcurrentHashMap<>(10);
        lock.lock();
        try {
            String[] lines = resp.split("\n");
            for (String line : lines) {
                this.parseLine(metricMap, new StrBuffer(line));
            }
            return metricMap;
        } catch (Exception e) {
            log.error("parse prometheus exporter data error, msg: {}", e.getMessage());
        } finally {
            lock.unlock();
        }
        return metricMap;
    }

    private void parseLine(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) {
            return;
        }
        switch (buffer.charAt(0)) {
            case '#' -> {
                buffer.read();
                this.currentMetricFamily = null;
                this.parseComment(metricMap, buffer);
            }
            case ENTER -> {
            }
            default -> {
                this.currentBucket = null;
                this.currentQuantile = null;
                this.parseMetric(buffer);
            }
        }
    }

    private void parseComment(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) {
            return;
        }
        String token = this.readTokenUnitWhitespace(buffer);
        if (EOF.equals(token)) {
            return;
        }
        if (!HELP.equals(token) && !TYPE.equals(token)) {
            log.error("parse comment error {}, start without {} or {}", buffer.toStr(), HELP, TYPE);
            return;
        }
        String metricName = this.readTokenAsMetricName(buffer);
        this.currentMetricFamily = metricMap.computeIfAbsent(metricName, key -> new MetricFamily());
        this.currentMetricFamily.setName(metricName);
        switch (token) {
            case HELP -> this.parseHelp(buffer);
            case TYPE -> this.parseType(buffer);
            default -> {
            }
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
        MetricFamily.Label label = new MetricFamily.Label();
        label.setName(METRIC_NAME_LABEL);
        label.setValue(metricName);

        if (metricName.isEmpty()) {
            log.error("error parse metric, metric name is null, line: {}", buffer.toStr());
            return;
        }

        List<MetricFamily.Metric> metricList = this.currentMetricFamily.getMetricList();
        if (metricList == null) {
            metricList = new ArrayList<>();
            this.currentMetricFamily.setMetricList(metricList);
        }

        // TODO For the time being, the data is displayed in the form of labels. If there is a better chart display method in the future, we will optimize it.
        MetricFamily.Metric metric = new MetricFamily.Metric();
        metricList.add(metric);

        metric.setLabelPair(new ArrayList<>());
        metric.getLabelPair().add(label);
        this.readLabels(metric, buffer);
    }

    private void readLabels(MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) {
            return;
        }
        if (buffer.charAt(0) == LEFT_CURLY_BRACKET) {
            buffer.read();
            this.startReadLabelName(metric, buffer);
        } else {
            this.readLabelValue(metric, null, buffer);
        }
    }

    private void startReadLabelName(MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) {
            return;
        }
        if (buffer.charAt(0) == RIGHT_CURLY_BRACKET) {
            buffer.read();
            buffer.skipBlankTabs();
            if (buffer.isEmpty()) {
                return;
            }
            this.readLabelValue(metric, new MetricFamily.Label(), buffer);
            return;
        }
        String labelName = this.readTokenAsLabelName(buffer);
        if (labelName.isEmpty() || labelName.equals(NAME_LABEL)) {
            throw new ParseException("invalid label name" + labelName + ", label name size = 0 or label name equals " + NAME_LABEL);
        }
        MetricFamily.Label label = new MetricFamily.Label();
        label.setName(labelName);
        if (buffer.read() != EQUALS) {
            throw new ParseException("parse error, not match the format of labelName=labelValue");
        }
        this.startReadLabelValue(metric, label, buffer);
    }

    private void startReadLabelValue(MetricFamily.Metric metric, MetricFamily.Label label, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) {
            return;
        }
        char c = buffer.read();
        if (c != QUOTES) {
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
        }
        metric.getLabelPair().add(label);

        if (buffer.isEmpty()) {
            return;
        }
        c = buffer.read();
        switch (c) {
            case COMMA -> this.startReadLabelName(metric, buffer);
            case RIGHT_CURLY_BRACKET -> this.readLabelValue(metric, label, buffer);
            default -> throw new ParseException("expected '}' or ',' at end of label value, line: " + buffer.toStr());
        }
    }

    private void readLabelValue(MetricFamily.Metric metric, MetricFamily.Label label, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) {
            return;
        }
        switch (this.currentMetricFamily.getMetricType()) {
            case INFO -> {
                MetricFamily.Info info = new MetricFamily.Info();
                info.setValue(buffer.toDouble());
                metric.setInfo(info);
            }
            case COUNTER -> {
                MetricFamily.Counter counter = new MetricFamily.Counter();
                counter.setValue(buffer.toDouble());
                metric.setCounter(counter);
            }
            case GAUGE -> {
                MetricFamily.Gauge gauge = new MetricFamily.Gauge();
                gauge.setValue(buffer.toDouble());
                metric.setGauge(gauge);
            }
            case UNTYPED -> {
                MetricFamily.Untyped untyped = new MetricFamily.Untyped();
                untyped.setValue(buffer.toDouble());
                metric.setUntyped(untyped);
            }
            case SUMMARY -> {
                // For the time being, the data is displayed in the form of labels. If there is a better chart display method in the future, we will optimize it.
                MetricFamily.Summary summary = new MetricFamily.Summary();
                summary.setValue(buffer.toDouble());
                metric.setSummary(summary);
            }
            case HISTOGRAM -> {
                // For the time being, the data is displayed in the form of labels. If there is a better chart display method in the future, we will optimize it.
                MetricFamily.Histogram histogram = new MetricFamily.Histogram();
                histogram.setValue(buffer.toDouble());
                metric.setHistogram(histogram);
            }
            default -> throw new ParseException("no such type in metricFamily");
        }
    }

    /**
     * Reads the token before the first whitespace
     *
     * @param buffer A line data object
     * @return token unit
     */
    private String readTokenUnitWhitespace(StrBuffer buffer) {
        StringBuilder builder = new StringBuilder();
        while (!buffer.isEmpty()) {
            char c = buffer.read();
            if (c == SPACE) {
                break;
            }
            builder.append(c);
        }
        return builder.toString();
    }

    /**
     * Gets the name of the metric
     *
     * @param buffer A line data object
     * @return token name
     */
    private String readTokenAsMetricName(StrBuffer buffer) {
        buffer.skipBlankTabs();
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

    /**
     * Gets the name of the label
     *
     * @param buffer A line data object
     * @return label name
     */
    private String readTokenAsLabelName(StrBuffer buffer) {
        buffer.skipBlankTabs();
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

    /**
     * Gets the value of the label
     *
     * @param buffer A line data object
     * @return label value
     */
    private String readTokenAsLabelValue(StrBuffer buffer) {
        StringBuilder builder = new StringBuilder();
        boolean escaped = false;
        while (!buffer.isEmpty()) {
            char c = buffer.read();
            // Handle '\\' escape sequences
            if (escaped) {
                switch (c) {
                    case QUOTES, '\\' -> builder.append(c);
                    case 'n' -> builder.append('\n');
                    default -> throw new ParseException("parse label value error");
                }
                escaped = false;
            } else {
                switch (c) {
                    case QUOTES -> {
                        return builder.toString();
                    }
                    case ENTER -> throw new ParseException("parse label value error, next line");
                    case '\\' -> escaped = true;
                    default -> builder.append(c);
                }
            }
        }
        return builder.toString();
    }

    /**
     * Checks whether a character conforms to the first character rule for metric names
     *
     * @param c metric character
     * @return true/false
     */
    private boolean isValidMetricNameStart(char c) {
        return isValidLabelNameStart(c) || c == ':';
    }

    /**
     * Checks whether a character conforms to rules for metric name characters other than the first
     *
     * @param c metric character
     * @return true/false
     */
    private boolean isValidMetricNameContinuation(char c) {
        return isValidLabelNameContinuation(c) || c == ':';
    }

    /**
     * Checks whether a character conforms to the first character rule for label names
     *
     * @param c metric character
     * @return true/false
     */
    private boolean isValidLabelNameStart(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
    }

    /**
     * Checks whether a character conforms to rules for label name characters other than the first
     *
     * @param c metric character
     * @return true/false
     */
    private boolean isValidLabelNameContinuation(char c) {
        return isValidLabelNameStart(c) || (c >= '0' && c <= '9');
    }

    /**
     * Checks if a string is a valid UTF-8 encoded string
     *
     * @param s label value
     * @return true/false
     */
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
