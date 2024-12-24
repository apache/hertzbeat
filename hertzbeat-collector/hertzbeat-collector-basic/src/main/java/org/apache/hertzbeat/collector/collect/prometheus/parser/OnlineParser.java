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

package org.apache.hertzbeat.collector.collect.prometheus.parser;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


/**
 * Resolves the data passed by prometheus's exporter interface http:xxx/metrics
 */
@Slf4j
public class OnlineParser {

    private static class FormatException extends Exception {

        public FormatException() {}

        public FormatException(String message) {
            super(message);
        }
    }

    private static class CharChecker {
        int i;
        boolean satisfied;

        CharChecker(int i) {
            this.i = i;
            this.satisfied = false;
        }

        private CharChecker maybeLeftBracket() {
            if (i == '{') {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeRightBracket() {
            if (i == '}') {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeEqualsSign() {
            if (i == '=') {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeQuotationMark() {
            if (i == '"') {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeSpace() {
            if (i == ' ') {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeComma() {
            if (i == ',') {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeEof() {
            if (i == -1) {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeEol() {
            if (i == '\n') {
                satisfied = true;
            }
            return this;
        }

        private int noElse() throws FormatException {
            if (!satisfied) {
                throw new FormatException();
            }
            return this.i;
        }

        private int getInt() throws FormatException {
            return this.i;
        }

    }

    private static CharChecker parseOneChar(InputStream inputStream) throws IOException {
        int i = inputStream.read();
        return new CharChecker(i);
    }

    private static CharChecker parseOneDouble(InputStream inputStream, StringBuilder stringBuilder) throws IOException {
        int i = inputStream.read();
        while ((i >= '0' && i <= '9') || (i >= 'a' && i <= 'z') || (i >= 'A' && i <= 'Z') || i == '-' || i == '+' || i == 'e' || i == '.') {
            stringBuilder.append((char) i);
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static CharChecker skipOneLong(InputStream inputStream) throws IOException {
        int i = inputStream.read();
        while (i >= '0' && i <= '9') {
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static CharChecker parseMetricName(InputStream inputStream, StringBuilder stringBuilder) throws IOException {
        int i = inputStream.read();
        while ((i >= 'a' && i <= 'z') || (i >= 'A' && i <= 'Z') || (i >= '0' && i <= '9') || i == '_' || i == ':') {
            stringBuilder.append((char) i);
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static CharChecker parseLabelName(InputStream inputStream, StringBuilder stringBuilder) throws IOException {
        int i = inputStream.read();
        while ((i >= 'a' && i <= 'z') || (i >= 'A' && i <= 'Z') || (i >= '0' && i <= '9') || i == '_') {
            stringBuilder.append((char) i);
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static CharChecker parseLabelValue(InputStream inputStream, StringBuilder stringBuilder) throws IOException, FormatException {
        int i = inputStream.read();
        while (i != '"' && i != -1) {
            if (i == '\\') {
                i = inputStream.read();
                switch (i) {
                    case 'n':
                        stringBuilder.append('\n');
                        break;
                    case '\\':
                        stringBuilder.append('\\');
                        break;
                    case '\"':
                        stringBuilder.append('\"');
                        break;
                    default:
                        throw new FormatException();
                }
            }
            else {
                stringBuilder.append((char) i);
            }
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static CharChecker skipSpaces(InputStream inputStream) throws IOException {
        int i = inputStream.read();
        while (i == ' ') {
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static CharChecker skipToLineEnd(InputStream inputStream) throws IOException {
        int i = inputStream.read();
        while (i != '\n' && i != -1) {
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static Double toDouble(String string) throws FormatException {
        switch (string) {
            case "+Inf":
                return Double.POSITIVE_INFINITY;
            case "-Inf":
                return Double.NEGATIVE_INFINITY;
            case "NaN":
                return Double.NaN;
            default:
                try {
                    BigDecimal bigDecimal = new BigDecimal(string);
                    return bigDecimal.doubleValue();
                } catch (NumberFormatException e) {
                    throw new FormatException();
                }
        }
    }

    private static CharChecker parseLabels(InputStream inputStream, StringBuilder stringBuilder, List<MetricFamily.Label> labelList) throws IOException, FormatException {
        int i;
        while (true) {
            MetricFamily.Label label = new MetricFamily.Label();
            i = skipSpaces(inputStream).getInt();
            stringBuilder.append((char) i);
            i = parseLabelName(inputStream, stringBuilder).maybeSpace().maybeEqualsSign().noElse();
            label.setName(stringBuilder.toString());
            stringBuilder.delete(0, stringBuilder.length());
            if (i == ' ') {
                skipSpaces(inputStream).maybeEqualsSign().noElse();
            }

            skipSpaces(inputStream).maybeQuotationMark().noElse();
            parseLabelValue(inputStream, stringBuilder).maybeQuotationMark().noElse();
            String labelValue = stringBuilder.toString();
            if (!labelValue.equals(new String(labelValue.getBytes(StandardCharsets.UTF_8)))) {
                throw new FormatException();
            }
            label.setValue(labelValue);
            stringBuilder.delete(0, stringBuilder.length());

            i = skipSpaces(inputStream).maybeSpace().maybeComma().maybeRightBracket().noElse();
            labelList.add(label);
            if (i == '}') {
                break;
            }
        }
        return new CharChecker(i);
    }

    private static CharChecker parseMetric(InputStream inputStream, Map<String, MetricFamily> metricFamilyMap, StringBuilder stringBuilder) throws IOException, FormatException {
        MetricFamily metricFamily = null;
        MetricFamily.Metric metric = new MetricFamily.Metric();
        int i = parseMetricName(inputStream, stringBuilder).maybeSpace().maybeLeftBracket().noElse();
        String metricName = stringBuilder.toString();
        stringBuilder.delete(0, stringBuilder.length());

        if (!metricFamilyMap.containsKey(metricName)) {
            metricFamily = new MetricFamily();
            metricFamily.setMetricList(new ArrayList<>());
            metricFamily.setName(metricName);
            metricFamilyMap.put(metricName, metricFamily);
        }
        else {
            metricFamily = metricFamilyMap.get(metricName);
        }

        if (i == ' ') {
            i = skipSpaces(inputStream).getInt();
        }
        if (i == '{') {
            List<MetricFamily.Label> labelList = new LinkedList<>();
            parseLabels(inputStream, stringBuilder, labelList);
            metric.setLabels(labelList);
            i = skipSpaces(inputStream).getInt();
        }

        stringBuilder.delete(0, stringBuilder.length());
        stringBuilder.append((char) i);
        i = parseOneDouble(inputStream, stringBuilder).maybeSpace().maybeEol().maybeEof().noElse();
        metric.setValue(toDouble(stringBuilder.toString()));
        if (i == '\n' || i == -1) {
            metricFamily.getMetricList().add(metric);
            return new CharChecker(i);
        }

        i = skipSpaces(inputStream).getInt();
        stringBuilder.delete(0, stringBuilder.length());
        stringBuilder.append((char) i);
        i = skipOneLong(inputStream).maybeSpace().maybeEol().maybeEof().noElse();
        if (i == '\n' || i == -1) {
            metricFamily.getMetricList().add(metric);
            return new CharChecker(i);
        }
        i = skipSpaces(inputStream).maybeEol().maybeEof().noElse();

        metricFamily.getMetricList().add(metric);
        return new CharChecker(i);
    }

    public static Map<String, MetricFamily> parseMetrics(InputStream inputStream) throws IOException {
        Map<String, MetricFamily> metricFamilyMap = new ConcurrentHashMap<>(10);
        int i = inputStream.read();
        try {
            while (i != -1) {
                if (i == '#' || i == '\n') {
                    skipToLineEnd(inputStream).maybeEol().maybeEof().noElse();
                } else {
                    StringBuilder stringBuilder = new StringBuilder();
                    stringBuilder.append((char) i);
                    parseMetric(inputStream, metricFamilyMap, stringBuilder);
                }
                i = inputStream.read();
            }
        } catch (FormatException e) {
            log.error("prometheus parser failed because of wrong input format. {}", e.getMessage());
            return null;
        }
        return metricFamilyMap;
    }

}
