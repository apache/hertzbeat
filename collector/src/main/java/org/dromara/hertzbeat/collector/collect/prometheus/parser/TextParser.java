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

package org.dromara.hertzbeat.collector.collect.prometheus.parser;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.collect.http.promethus.ParseException;
import org.dromara.hertzbeat.common.util.StrBuffer;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author ceilzcx
 *
 * 解析prometheus的exporter接口传递的数据 http:xxx/metrics
 * 参考: prometheus的text_parse.go的代码, 入口: TextToMetricFamilies
 */
@Slf4j
public class TextParser {
    private static final String NAME_LABEL = "__name__";
    private static final char LEFT_CURLY_BRACKET = '{';
    private static final char RIGHT_CURLY_BRACKET = '}';
    private static final char EQUALS = '=';
    private static final char QUOTES = '"';
    private static final char ENTER = '\n';
    private static final char SPACE = ' ';
    private static final char COMMA = ',';


    /**
     * parser prometheus exporter text metrics data
     * todo use inputStream bytebuffer instead of resp string
     * @param resp txt data
     * @return metrics family
     */
    public static Map<String, MetricFamily> textToMetricFamilies(String resp) {
        // key: metric name, value: metric family
        Map<String, MetricFamily> metricMap = new ConcurrentHashMap<>(10);
        try {
            String[] lines = resp.split("\n");
            for (String line : lines) {
                parseLine(metricMap, new StrBuffer(line));
            }
            return metricMap;
        } catch (Exception e) {
            log.error("parse prometheus exporter data error, msg: {}", e.getMessage(), e);
        }
        return metricMap;
    }

    private static void parseLine(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        switch (buffer.charAt(0)) {
            case '#':
            case ENTER:
                break;
            default:
                parseMetric(metricMap, buffer);
        }
    }

    private static void parseMetric(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        String metricName = readTokenAsMetricName(buffer);
        if (metricName.isEmpty()) {
            log.error("error parse metric, metric name is null, line: {}", buffer.toStr());
            return;
        }
        MetricFamily currentMetricFamily = metricMap.computeIfAbsent(metricName, key -> new MetricFamily());
        List<MetricFamily.Metric> metricList = currentMetricFamily.getMetricList();
        if (metricList == null) {
            metricList = new ArrayList<>();
            currentMetricFamily.setMetricList(metricList);
        }
        MetricFamily.Metric metric = new MetricFamily.Metric();
        metricList.add(metric);
        readLabels(metric, buffer);
    }

    private static void readLabels(MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        metric.setLabels(new LinkedList<>());
        if (buffer.charAt(0) == LEFT_CURLY_BRACKET) {
            buffer.read();
            startReadLabelName(metric, buffer);
        } else {
            readLabelValue(metric, buffer);
        }
    }

    private static void startReadLabelName(MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        if (buffer.charAt(0) == RIGHT_CURLY_BRACKET) {
            buffer.read();
            buffer.skipBlankTabs();
            if (buffer.isEmpty()) return;
            readLabelValue(metric, buffer);
            return;
        }
        String labelName = readTokenAsLabelName(buffer);
        if (labelName.isEmpty() || NAME_LABEL.equals(labelName)) {
            throw new ParseException("invalid label name" + labelName + ", label name size = 0 or label name equals " + NAME_LABEL);
        }
        MetricFamily.Label label = new MetricFamily.Label();
        label.setName(labelName);
        if (buffer.read() != EQUALS) {
            throw new ParseException("parse error, not match the format of labelName=labelValue");
        }
        startReadLabelValue(metric, label, buffer);
    }

    private static void startReadLabelValue(MetricFamily.Metric metric, MetricFamily.Label label, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        char c = buffer.read();
        if (c != QUOTES) {
            throw new ParseException("expected '\"' at start of label value, line: " + buffer.toStr());
        }
        String labelValue = readTokenAsLabelValue(buffer);
        label.setValue(labelValue);
        if (!isValidLabelValue(labelValue)) {
            throw new ParseException("no valid label value: " + labelValue);
        }
        metric.getLabels().add(label);
        if (buffer.isEmpty()) return;
        c = buffer.read();
        switch (c) {
            case COMMA:
                startReadLabelName(metric, buffer);
                break;
            case RIGHT_CURLY_BRACKET:
                readLabelValue(metric, buffer);
                break;
            default:
                throw new ParseException("expected '}' or ',' at end of label value, line: " + buffer.toStr());
        }
    }

    private static void readLabelValue(MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        metric.setValue(buffer.toDouble());
    }

    /**
     * 获取指标的名称
     *
     * @param buffer 行数据对象
     * @return token name
     */
    private static String readTokenAsMetricName(StrBuffer buffer) {
        buffer.skipBlankTabs();
        StringBuilder builder = new StringBuilder();
        if (isValidMetricNameStart(buffer.charAt(0))) {
            while (!buffer.isEmpty()) {
                char c = buffer.read();
                if (!isValidMetricNameContinuation(c)) {
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
     * 获取label的名称
     *
     * @param buffer 行数据对象
     * @return label name
     */
    private static String readTokenAsLabelName(StrBuffer buffer) {
        buffer.skipBlankTabs();
        StringBuilder builder = new StringBuilder();
        char c = buffer.read();
        if (isValidLabelNameStart(c)) {
            builder.append(c);
            while (!buffer.isEmpty()) {
                c = buffer.read();
                if (!isValidLabelNameContinuation(c)) {
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
     * 获取Label的值
     *
     * @param buffer 行数据对象
     * @return label value
     */
    private static String readTokenAsLabelValue(StrBuffer buffer) {
        StringBuilder builder = new StringBuilder();
        boolean escaped = false;
        while (!buffer.isEmpty()) {
            char c = buffer.read();
            // 处理 '\\' 转义
            if (escaped) {
                switch (c) {
                    case QUOTES:
                    case '\\':
                        builder.append(c);
                        break;
                    case 'n':
                        builder.append('\n');
                        break;
                    default:
                        throw new ParseException("parse label value error");
                }
                escaped = false;
            } else {
                switch (c) {
                    case QUOTES:
                        return builder.toString();
                    case ENTER:
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

    /**
     * 是否符合metric name首字符规则
     *
     * @param c metric字符
     * @return true/false
     */
    private static boolean isValidMetricNameStart(char c) {
        return isValidLabelNameStart(c) || c == ':';
    }

    /**
     * 是否符合metric name除首字符其他字符规则
     *
     * @param c metric字符
     * @return true/false
     */
    private static boolean isValidMetricNameContinuation(char c) {
        return isValidLabelNameContinuation(c) || c == ':';
    }

    /**
     * 是否符合label name首字符规则
     *
     * @param c metric字符
     * @return true/false
     */
    private static boolean isValidLabelNameStart(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
    }

    /**
     * 是否符合label name除首字符其他字符规则
     *
     * @param c metric字符
     * @return true/false
     */
    private static boolean isValidLabelNameContinuation(char c) {
        return isValidLabelNameStart(c) || (c >= '0' && c <= '9');
    }

    /**
     * 检测是否是有效的utf8编码的字符串
     *
     * @param s label value
     * @return true/false
     */
    private static boolean isValidLabelValue(String s) {
        return s != null && s.equals(new String(s.getBytes(StandardCharsets.UTF_8)));
    }
}
