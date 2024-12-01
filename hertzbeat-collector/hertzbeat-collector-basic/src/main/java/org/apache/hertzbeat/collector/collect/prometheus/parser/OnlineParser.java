package org.apache.hertzbeat.collector.collect.prometheus.parser;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
public class OnlineParser {

    // An unknown format occurred during parsing because parsing cannot continue
    // or the end of the input stream has been reached
//    private static final int WRONG_FORMAT = -1;

    //The input stream ends normally
//    private static final int NORMAL_END = -2;

//    private static final int COMMENT_LINE = -3;

    private static final String HELP_PREFIX = "HELP";

    private static final String TYPE_PREFIX = "TYPE";

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
        //        private CharChecker NotEOF() throws FormatException {
//            if (i == -1) {
//                throw new FormatException();
//            }
//            return this;
//        }
//        private CharChecker NotEOL() throws FormatException {
//            if (i == '\n') {
//                throw new FormatException();
//            }
//            return this;
//        }
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

        private CharChecker maybeEOF() {
            if (i == -1) {
                satisfied = true;
            }
            return this;
        }

        private CharChecker maybeEOL() {
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

    private static CharChecker parseOneWord(InputStream inputStream, StringBuilder stringBuilder) throws IOException {
        int i = inputStream.read();
        while ((i >= 'a' && i <= 'z') || (i >= 'A' && i <= 'Z') || (i >= '0' && i <= '9') || i == '_' || i == ':') {
            stringBuilder.append((char) i);
            i = inputStream.read();
        }
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

    private static CharChecker parseLabelValue(InputStream inputStream, StringBuilder stringBuilder) throws IOException {
        int i = inputStream.read();
        while (i != '"' && i != -1) {
            stringBuilder.append((char) i);
            i = inputStream.read();
        }
        return new CharChecker(i);
    }

    private static CharChecker skipOneWord(InputStream inputStream) throws IOException {
        int i = inputStream.read();
        while ((i >= 'a' && i <= 'z') || (i >= 'A' && i <= 'Z') || (i >= '0' && i <= '9') || i == '_' || i == ':') {
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



    private static CharChecker skipCommentLine(InputStream inputStream) throws IOException, FormatException {
        // skip space after '#'
        int i = skipToLineEnd(inputStream).maybeEOL().maybeEOF().noElse();
        return new CharChecker(i);
    }

    private static CharChecker parseLabels(InputStream inputStream, StringBuilder stringBuilder, List<MetricFamily.Label> labelList) throws IOException, FormatException {
        int i;
        while (true) {
            MetricFamily.Label label = new MetricFamily.Label();
            parseLabelName(inputStream, stringBuilder).maybeEqualsSign().noElse();
            label.setName(stringBuilder.toString());
            stringBuilder.delete(0, stringBuilder.length());

            parseOneChar(inputStream).maybeQuotationMark().noElse();

            parseLabelValue(inputStream, stringBuilder).maybeQuotationMark().noElse();
            label.setValue(stringBuilder.toString());
            stringBuilder.delete(0, stringBuilder.length());

            i = parseOneChar(inputStream).maybeComma().maybeRightBracket().noElse();
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

        if (!metricFamilyMap.containsKey(stringBuilder.toString())) {
            metricFamily = new MetricFamily();
            metricFamily.setMetricList(new ArrayList<>());
            metricFamily.setName(metricName);
            metricFamilyMap.put(metricName, metricFamily);
        }
        else {
            metricFamily = metricFamilyMap.get(metricName);
        }

        if (i == '{') {
            List<MetricFamily.Label> labelList = new ArrayList<>();
            parseLabels(inputStream, stringBuilder, labelList);
            metric.setLabels(labelList);
        }

        stringBuilder.delete(0, stringBuilder.length());
        i = skipSpaces(inputStream).getInt();
        stringBuilder.append((char)i);

        i = parseOneDouble(inputStream, stringBuilder).maybeSpace().maybeEOL().maybeEOF().noElse();
        metric.setValue(toDouble(stringBuilder.toString()));
        stringBuilder.delete(0, stringBuilder.length());
        if (i == '\n') {
            metricFamily.getMetricList().add(metric);
            return new CharChecker(i);
        }

        i = skipSpaces(inputStream).getInt();
        i = skipOneWord(inputStream).maybeSpace().maybeEOL().maybeEOF().noElse();
        i = skipSpaces(inputStream).maybeEOL().maybeEOF().noElse();

        metricFamily.getMetricList().add(metric);
        return new CharChecker(i);
    }

    public static Map<String, MetricFamily> parseMetrics(InputStream inputStream) throws IOException {
        Map<String, MetricFamily> metricFamilyMap = new ConcurrentHashMap<>(10);
        int i = inputStream.read();
        try {
            while (i != -1) {
                if (i == '#') {
                    skipCommentLine(inputStream);
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
