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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;


/**
 * Resolves the data passed by prometheus's exporter interface http:xxx/metrics
 */
@Slf4j
public class OnlineParser {

    private static final Map<Integer, Integer> escapeMap = new HashMap<>(8);

    private static final char RIGHT_BRACKET = '}';
    private static final char LEFT_BRACKET = '{';

    static {
        escapeMap.put((int) 'n', (int) '\n');
        escapeMap.put((int) 'b', (int) '\b');
        escapeMap.put((int) 't', (int) '\t');
        escapeMap.put((int) 'r', (int) '\r');
        escapeMap.put((int) 'f', (int) '\f');
        escapeMap.put((int) '\'', (int) '\'');
        escapeMap.put((int) '\"', (int) '\"');
        escapeMap.put((int) '\\', (int) '\\');
    }

    private OnlineParser() {
    }

    public static Map<String, MetricFamily> parseMetrics(InputStream inputStream) throws IOException {
        Map<String, MetricFamily> metricFamilyMap = new ConcurrentHashMap<>(10);
        try {
            int i = getChar(inputStream);
            while (i != -1) {
                if (i == '#' || i == '\n') {
                    skipToLineEnd(inputStream).maybeEol().maybeEof().noElse();
                } else {
                    StringBuilder stringBuilder = new StringBuilder();
                    stringBuilder.append((char) i);
                    parseMetric(inputStream, metricFamilyMap, stringBuilder);
                }
                i = getChar(inputStream);
            }
        } catch (FormatException e) {
            log.error("prometheus parser failed because of wrong input format. {}", e.getMessage());
            return null;
        }
        return metricFamilyMap;
    }

    private static class FormatException extends Exception {

        public FormatException() {
        }

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
            if (i == LEFT_BRACKET) {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeRightBracket() {
            if (i == RIGHT_BRACKET) {
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

        private int getInt() {
            return this.i;
        }

    }

    private static int getChar(InputStream inputStream) throws IOException, FormatException {
        int i = inputStream.read();
        if (i == '\\') {
            i = inputStream.read();
            if (escapeMap.containsKey(i)) {
                return escapeMap.get(i);
            } else {
                throw new FormatException("Escape character failed.");
            }
        } else {
            return i;
        }
    }

    private static CharChecker parseOneDouble(InputStream inputStream, StringBuilder stringBuilder) throws IOException, FormatException {
        int i = getChar(inputStream);
        while (i >= '0' && i <= '9' || i >= 'a' && i <= 'z' || i >= 'A' && i <= 'Z' || i == '-' || i == '+' || i == '.') {
            stringBuilder.append((char) i);
            i = getChar(inputStream);
        }
        return new CharChecker(i);
    }

    private static CharChecker skipOneLong(InputStream inputStream) throws IOException, FormatException {
        int i = getChar(inputStream);
        while (i >= '0' && i <= '9') {
            i = getChar(inputStream);
        }
        return new CharChecker(i);
    }

    private static CharChecker parseMetricName(InputStream inputStream, StringBuilder stringBuilder) throws IOException, FormatException {
        int i = getChar(inputStream);
        while ((i >= 'a' && i <= 'z') || (i >= 'A' && i <= 'Z') || (i >= '0' && i <= '9') || i == '_' || i == ':') {
            stringBuilder.append((char) i);
            i = getChar(inputStream);
        }
        return new CharChecker(i);
    }

    private static CharChecker parseLabelName(InputStream inputStream, StringBuilder stringBuilder) throws IOException, FormatException {
        int i = getChar(inputStream);
        while ((i >= 'a' && i <= 'z') || (i >= 'A' && i <= 'Z') || (i >= '0' && i <= '9') || i == '_') {
            stringBuilder.append((char) i);
            i = getChar(inputStream);
        }
        return new CharChecker(i);
    }

    private static CharChecker parseLabelValue(InputStream inputStream, StringBuilder stringBuilder) throws IOException, FormatException {
        int i = getChar(inputStream);
        while (i != '"' && i != -1) {
            if (i == '\\') {
                i = getChar(inputStream);
                switch (i) {
                    case 'n' -> stringBuilder.append('\n');
                    case '\\' -> stringBuilder.append('\\');
                    case '\"' -> stringBuilder.append('\"');
                    default -> throw new FormatException();
                }
            } else {
                stringBuilder.append((char) i);
            }
            i = getChar(inputStream);
        }
        return new CharChecker(i);
    }

    private static CharChecker skipSpaces(InputStream inputStream) throws IOException, FormatException {
        int i = getChar(inputStream);
        while (i == ' ') {
            i = getChar(inputStream);
        }
        return new CharChecker(i);
    }

    private static CharChecker skipToLineEnd(InputStream inputStream) throws IOException, FormatException {
        int i = getChar(inputStream);
        while (i != '\n' && i != -1) {
            i = getChar(inputStream);
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


    /**
     * parse single label like  label_name="label_value"
     */
    private static CharChecker parseLabel(InputStream inputStream, StringBuilder stringBuilder, List<MetricFamily.Label> labelList) throws IOException, FormatException {
        int i;
        MetricFamily.Label label = new MetricFamily.Label();
        i = skipSpaces(inputStream).getInt();
        if (i == RIGHT_BRACKET) {
            return new CharChecker(i);
        }
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
        labelList.add(label);
        return new CharChecker(i);
    }


    private static void parseLabels(InputStream inputStream, StringBuilder stringBuilder, List<MetricFamily.Label> labelList) throws IOException, FormatException {
        int i;
        while (true) {
            // deal with labels like {label1="aaa",label2=bbb",}
            CharChecker charChecker = parseLabel(inputStream, stringBuilder, labelList);
            if (charChecker.i == RIGHT_BRACKET) {
                return;
            }
            //deal with labels like {label1="aaa",label2=bbb"}
            i = skipSpaces(inputStream).maybeSpace().maybeComma().maybeRightBracket().noElse();
            if (i == RIGHT_BRACKET) {
                return;
            }
        }
    }

    private static CharChecker parseMetric(InputStream inputStream, Map<String, MetricFamily> metricFamilyMap, StringBuilder stringBuilder) throws IOException, FormatException {
        MetricFamily metricFamily;
        MetricFamily.Metric metric = new MetricFamily.Metric();
        int i = parseMetricName(inputStream, stringBuilder).maybeSpace().maybeLeftBracket().noElse();
        String metricName = stringBuilder.toString();
        stringBuilder.delete(0, stringBuilder.length());

        if (!metricFamilyMap.containsKey(metricName)) {
            metricFamily = new MetricFamily();
            metricFamily.setMetricList(new ArrayList<>());
            metricFamily.setName(metricName);
            metricFamilyMap.put(metricName, metricFamily);
        } else {
            metricFamily = metricFamilyMap.get(metricName);
        }

        if (i == ' ') {
            i = skipSpaces(inputStream).getInt();
        }

        List<MetricFamily.Label> labelList = new LinkedList<>();
        metric.setLabels(labelList);
        if (i == '{') {
            parseLabels(inputStream, stringBuilder, labelList);
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
}
