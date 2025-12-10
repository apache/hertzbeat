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
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;


/**
 * Resolves the data passed by prometheus's exporter interface http:xxx/metrics
 */
@Slf4j
public class OnlineParser {

    private static final Map<Integer, Integer> escapeMap = new HashMap<>(8);

    private static final char RIGHT_BRACKET = '}';
    private static final char LEFT_BRACKET = '{';
    private static final char UTF8_REPLACEMENT_CHARACTER = '\uFFFD';

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
                // To address the `\n\r` scenario, it is necessary to skip
                if (i == '\r') {
                    i = getChar(inputStream);
                }
            }
        } catch (FormatException e) {
            log.error("prometheus parser failed because of wrong input format. {}", e.getMessage());
            return null;
        }
        return metricFamilyMap;
    }

    /**
     * Parses Prometheus metrics from the given {@link InputStream}, but only for the specified metric name.
     * <p>
     * This method differs from {@link #parseMetrics(InputStream)} in that it filters and parses only the metric
     * with the given name, rather than parsing all available metrics from the input stream.
     *
     * @param inputStream the input stream containing Prometheus metrics data
     * @param metric the name of the metric to filter and parse (case-insensitive)
     * @return a map of metric family names to {@link MetricFamily} objects, or {@code null} if parsing fails
     * @throws IOException if an I/O error occurs while reading from the input stream
     */
    public static Map<String, MetricFamily> parseMetrics(InputStream inputStream, String metric) throws IOException {
        Map<String, MetricFamily> metricFamilyMap = new ConcurrentHashMap<>(10);
        try {
            int i = getChar(inputStream);
            while (i != -1) {
                if (i == '#' || i == '\n') {
                    skipToLineEnd(inputStream).maybeEol().maybeEof().noElse();
                } else {
                    StringBuilder stringBuilder = new StringBuilder();
                    stringBuilder.append((char) i);

                    // parse the metricName to filter.
                    int next = parseMetricName(inputStream, stringBuilder).maybeSpace().maybeLeftBracket().noElse();
                    String metricName = stringBuilder.toString();
                    stringBuilder.delete(0, stringBuilder.length());

                    // step2: Determine whether this metric should be parsed.
                    if (metric.equals(metricName)) {
                        parseMetricFromName(inputStream, stringBuilder, metricFamilyMap, metricName, next);
                    } else {
                        skipToLineEnd(inputStream).maybeEol().maybeEof().noElse();
                    }
                }
                i = getChar(inputStream);
                // To address the `\n\r` scenario, it is necessary to skip
                if (i == '\r') {
                    i = getChar(inputStream);
                }
            }
        } catch (FormatException e) {
            log.error("prometheus parser failed because of wrong input format. {}", e.getMessage());
            return null;
        }
        return metricFamilyMap;
    }

    /**
     * Start parsing the complete metric from the already parsed metric name.
     *
     * @param inputStream      the input stream containing the metric data
     * @param stringBuilder    the StringBuilder used for parsing and temporary storage
     * @param metricFamilyMap  the map to store parsed MetricFamily objects, keyed by metric name
     * @param metricName       the name of the metric to parse
     * @param next             the next character to process from the input stream
     * @return a CharChecker containing the next character after parsing the metric
     * @throws IOException     if an I/O error occurs while reading the input stream
     * @throws FormatException if the input format is invalid
     */
    private static CharChecker parseMetricFromName(InputStream inputStream, StringBuilder stringBuilder,
                                                   Map<String, MetricFamily> metricFamilyMap,
                                                   String metricName, int next) throws IOException, FormatException {
        MetricFamily metricFamily;
        MetricFamily.Metric metric = new MetricFamily.Metric();

        if (!metricFamilyMap.containsKey(metricName)) {
            metricFamily = new MetricFamily();
            metricFamily.setMetricList(new ArrayList<>());
            metricFamily.setName(metricName);
            metricFamilyMap.put(metricName, metricFamily);
        } else {
            metricFamily = metricFamilyMap.get(metricName);
        }
        int i = next;
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
        // Skip \r character to handle Windows line endings
        if (i == '\r') {
            i = getChar(inputStream);
        }
        return new CharChecker(i);
    }

    private static CharChecker skipOneLong(InputStream inputStream) throws IOException, FormatException {
        int i = getChar(inputStream);
        while (i >= '0' && i <= '9') {
            i = getChar(inputStream);
        }
        // Skip \r character to handle Windows line endings
        if (i == '\r') {
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
        int i = inputStream.read();
        while (i != '"' && i != -1) {
            if (i == '\\') {
                i = inputStream.read();
                switch (i) {
                    case 'n' -> stringBuilder.append('\n');
                    case '\\' -> stringBuilder.append('\\');
                    case '\"' -> stringBuilder.append('\"');
                    default -> {
                        // Unknown escape, keep as-is
                        // https://github.com/VictoriaMetrics/VictoriaMetrics/blob/master/lib/protoparser/prometheus/parser.go#L419
                        stringBuilder.append('\\');
                        if (i != -1) {
                            stringBuilder.append((char) i);
                        }
                    }
                }
            } else if (i <= 127) {
                stringBuilder.append((char) i);
            } else {
                handleUtf8Character(i, inputStream, stringBuilder);
            }
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    /**
     * Handles multi-byte UTF-8 character parsing from input stream.
     * Reads additional bytes based on the first byte and validates the UTF-8 sequence.
     * Appends the decoded character to the string builder or replacement character if invalid.
     *
     * @param firstByte the first byte of the UTF-8 character sequence
     * @param inputStream the input stream to read additional bytes from
     * @param stringBuilder the string builder to append the decoded character to
     * @throws IOException if an I/O error occurs while reading from the input stream
     */
    private static void handleUtf8Character(int firstByte, InputStream inputStream, StringBuilder stringBuilder) throws IOException {
        byte[] byteArray = new byte[4];
        byteArray[0] = (byte) firstByte;
        int additionalBytes = calculateUtf8ContinuationBytes(firstByte);
        if (additionalBytes == -1) {
            appendInvalidCharacters(stringBuilder);
            return;
        }
        int totalBytes = 1;

        for (int i = 0; i < additionalBytes; i++) {
            int nextByte = inputStream.read();
            if (nextByte == -1) {
                appendInvalidCharacters(stringBuilder);
                return;
            }
            // Verify subsequent byte format:10xxxxxx
            if ((nextByte & 0xC0) != 0x80) {
                appendInvalidCharacters(stringBuilder);
                return;
            }
            byteArray[i + 1] = (byte) nextByte;
            totalBytes++;
        }
        try {
            // todo: If stricter UTF-8 semantic validation is required，boundary conditions are slightly strengthened.
            String utf8Chars = new String(byteArray, 0, totalBytes, StandardCharsets.UTF_8);
            stringBuilder.append(utf8Chars);
        } catch (Exception e) {
            log.debug("Invalid UTF-8 sequence detected at firstByte: {}", Integer.toHexString(firstByte));
            appendInvalidCharacters(stringBuilder);
        }
    }

    /**
     * Appends the UTF-8 replacement character (\uFFFD) to the StringBuilder.
     * This method is used to append the replacement character to the string builder
     * when invalid UTF-8 byte sequences are encountered during parsing.
     * The replacement character (U+FFFD) is a special Unicode character used to
     * represent characters that cannot be decoded properly.
     *
     * @param stringBuilder the string builder to append to, no operation if null
     */
    private static void appendInvalidCharacters(StringBuilder stringBuilder) {
        Optional.ofNullable(stringBuilder).ifPresent(t -> t.append(UTF8_REPLACEMENT_CHARACTER));
    }

    /**
     * Checks if a label value contains invalid characters.
     * This method is used to validate the validity of Prometheus label values.
     * If the label value contains the UTF-8 replacement character (\uFFFD),
     * it is considered invalid because the replacement character indicates that
     * byte sequences that could not be properly decoded were encountered during parsing.
     * 
     * According to Prometheus specifications, label values should not contain
     * replacement characters as this would cause data inconsistency and query issues.
     *
     * @param labelValue the label value to check
     * @return true if the label value is not blank and contains UTF-8 replacement character, false otherwise
     */
    private static boolean isInvalidLabelValue(String labelValue) {
        return StringUtils.isNotBlank(labelValue) && labelValue.contains(String.valueOf(UTF8_REPLACEMENT_CHARACTER));
    }

    /**
     * Calculates the number of continuation bytes needed for a UTF-8 character.
     * This method analyzes the first byte of a UTF-8 encoding to determine how many
     * continuation bytes (10xxxxxx pattern) are required to complete the character.
     * 
     * UTF-8 encoding rules:
     * - 1-byte character: 0xxxxxxx (ASCII characters, this method won't be called)
     * - 2-byte character: 110xxxxx 10xxxxxx (returns 1 continuation byte)
     * - 3-byte character: 1110xxxx 10xxxxxx 10xxxxxx (returns 2 continuation bytes)
     * - 4-byte character: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (returns 3 continuation bytes)
     * 
     * Also validates byte sequences:
     * - 0xC0 and 0xC1: overlong encoding, invalid
     * - 0xF5-0xFF: out of Unicode range, invalid
     *
     * Note: A basic Overlong Encoding check has been added here.
     * If stricter and more comprehensive validation is required later,
     * this method should be separated out to serve solely as a check for the first character.
     *
     * @param firstByte the first byte of the UTF-8 character sequence
     * @return the number of continuation bytes needed, or -1 if the first byte is invalid
     *         - returns 1: 2-byte character (needs 1 continuation byte)
     *         - returns 2: 3-byte character (needs 2 continuation bytes)
     *         - returns 3: 4-byte character (needs 3 continuation bytes)
     *         - returns -1: invalid first byte
     */
    private static int calculateUtf8ContinuationBytes(int firstByte) {
        if ((firstByte & 0xE0) == 0xC0) {
            if (firstByte <= 0xC1) {
                return -1;
            }
            return 1;
        }
        if ((firstByte & 0xF0) == 0xE0) {
            return 2;
        }
        if ((firstByte & 0xF8) == 0xF0) {
            if (firstByte >= 0xF5) {
                return -1;
            }
            return 3;
        }
        return -1;
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
        if (isInvalidLabelValue(labelValue)) {
            log.error("Invalid UTF-8 sequence detected at labelValue.");
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
