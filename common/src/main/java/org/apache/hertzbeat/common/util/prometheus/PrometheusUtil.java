/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.util.prometheus;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * prometheus metric sparser
 */
public final class PrometheusUtil {

    //An unknown format occurred during parsing because parsing cannot continue
    // or the end of the input stream has been reached
    private static final int ERROR_FORMAT = -1;

    //The input stream ends normally
    private static final int NORMAL_END = -2;

    private static final int COMMENT_LINE = -3;

    private PrometheusUtil() {
    }

    private static int parseMetricName(InputStream inputStream, Metric.MetricBuilder metricBuilder) throws IOException {
        StringBuilder stringBuilder = new StringBuilder();
        int i;
        i = inputStream.read();
        if (i == -1) {
            return NORMAL_END;
        }
        else if (i == '#') {
            return COMMENT_LINE;
        }

        while (i != -1) {
            if (i == ' ' || i == '{') {
                metricBuilder.metricName(stringBuilder.toString());
                return i;
            }
            stringBuilder.append((char) i);
            i = inputStream.read();
        }

        return ERROR_FORMAT;
    }

    private static int parseLabel(InputStream inputStream, List<Label> labelList) throws IOException {
        Label.LabelBuilder labelBuilder = new Label.LabelBuilder();
        int i;

        StringBuilder labelName = new StringBuilder();
        i = inputStream.read();
        while (i != -1 && i != '=') {
            labelName.append((char) i);
            i = inputStream.read();
        }
        if (i == -1) {
            return ERROR_FORMAT;
        }
        labelBuilder.name(labelName.toString());

        if (inputStream.read() != '\"') {
            return ERROR_FORMAT;
        }

        StringBuilder labelValue = new StringBuilder();
        i = inputStream.read();
        while (i != -1 && i != ',' && i != '}') {
            labelValue.append((char) i);
            i = inputStream.read();
        }
        if (i == -1 || labelValue.charAt(labelValue.length() - 1) != '\"') {
            return ERROR_FORMAT;
        }

        // skip space only in this condition
        if (i == '}' && inputStream.read() != ' ') {
            return ERROR_FORMAT;
        }

        labelValue.deleteCharAt(labelValue.length() - 1);
        labelBuilder.value(labelValue.toString());

        labelList.add(labelBuilder.build());
        return i;
    }

    private static int parseLabelList(InputStream inputStream, Metric.MetricBuilder metricBuilder) throws IOException {
        List<Label> labelList = new ArrayList<>();
        int i;

        i = parseLabel(inputStream, labelList);
        while (i == ',') {
            i = parseLabel(inputStream, labelList);
        }
        if (i == -1) {
            return ERROR_FORMAT;
        }

        metricBuilder.labelList(labelList);
        return i;
    }

    private static int parseValue(InputStream inputStream, Metric.MetricBuilder metricBuilder) throws IOException {
        int i;

        StringBuilder stringBuilder = new StringBuilder();
        i = inputStream.read();
        while (i != -1 && i != ' ' && i != '\n') {
            stringBuilder.append((char) i);
            i = inputStream.read();
        }

        String string = stringBuilder.toString();

        switch (string) {
            case "NaN":
                metricBuilder.value(Double.NaN);
                break;
            case "+Inf":
                metricBuilder.value(Double.POSITIVE_INFINITY);
                break;
            case "-Inf":
                metricBuilder.value(Double.NEGATIVE_INFINITY);
                break;
            default:
                try {
                    BigDecimal bigDecimal = new BigDecimal(string);
                    metricBuilder.value(bigDecimal.doubleValue());
                } catch (NumberFormatException e) {
                    return ERROR_FORMAT;
                }
                break;
        }

        if (i == -1) {
            return NORMAL_END;
        }
        else {
            return i; // ' ' or \n'
        }
    }

    private static int parseTimestamp(InputStream inputStream, Metric.MetricBuilder metricBuilder) throws IOException {
        int i;

        StringBuilder stringBuilder = new StringBuilder();
        i = inputStream.read();
        while (i != -1 && i != '\n') {
            stringBuilder.append((char) i);
            i = inputStream.read();
        }

        String string = stringBuilder.toString();
        try {
            metricBuilder.timestamp(Long.parseLong(string));
        } catch (NumberFormatException e) {
            return ERROR_FORMAT;
        }

        if (i == -1) {
            return NORMAL_END;
        }
        else {
            return i; // '\n'
        }
    }

    // return value:
    // -1: error format
    // -2: normal end
    // '\n': more lines
    private static int parseMetric(InputStream inputStream, List<Metric> metrics) throws IOException {
        Metric.MetricBuilder metricBuilder = new Metric.MetricBuilder();

        int i = parseMetricName(inputStream, metricBuilder); // RET: -1, -2, -3, '{', ' '
        if (i == ERROR_FORMAT || i == NORMAL_END || i == COMMENT_LINE) {
            return i;
        }

        if (i == '{') {
            i = parseLabelList(inputStream, metricBuilder); // RET: -1, '}'
            if (i == ERROR_FORMAT) {
                return i;
            }
        }


        i = parseValue(inputStream, metricBuilder); // RET: -1, -2, '\n', ' '
        if (i != ' ') {
            metrics.add(metricBuilder.build());
            return i;
        }

        i = parseTimestamp(inputStream, metricBuilder); // RET: -1, -2, '\n'

        metrics.add(metricBuilder.build());
        return i;

    }

    private static int skipCommentLine(InputStream inputStream) throws IOException {
        int i = inputStream.read();
        while (i != -1 && i != '\n') {
            i = inputStream.read();
        }
        if (i == -1) {
            return NORMAL_END;
        }
        return i;
    }

    public static List<Metric> parseMetrics(InputStream inputStream) throws IOException {
        List<Metric> metricList = new ArrayList<>();
        int i = parseMetric(inputStream, metricList);
        while (i == '\n' || i == COMMENT_LINE) {
            if (i == COMMENT_LINE) {
                if (skipCommentLine(inputStream) == NORMAL_END) {
                    return metricList;
                }

            }
            i = parseMetric(inputStream, metricList);
        }
        if (i == NORMAL_END) {
            return metricList;
        }
        else {
            return null;
        }
    }


}
