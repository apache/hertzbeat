package com.usthe.collector.collect.http.promethus.exporter;

import com.usthe.collector.collect.http.promethus.ParseException;
import com.usthe.common.util.Pair;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author ceilzcx
 * @since 7/11/2022
 * 参考: prometheus的text_parse.go的代码, 入口: TextToMetricFamilies
 * todo 使用String.subString()的方式会生成很多的对象，后续改为buffer
 */
@Slf4j
public class ExporterParser {
    private static final String HELP = "HELP";
    private static final String TYPE = "TYPE";

    private static final String QUANTILE_LABEL = "quantile";
    private static final String BUCKET_LABEL = "le";
    private static final String SUM_SUFFIX = "_sum";
    private static final String COUNT_SUFFIX = "_count";
    private static final String BUCKET_SUFFIX = "_bucket";

    public Map<String, MetricFamily> textToMetric(String resp) {
        // key: metric name, value: metric family
        Map<String, MetricFamily> metricMap = new ConcurrentHashMap<>();
        String[] lines = resp.split("\n");
        for (String line : lines) {
            this.parseLine(metricMap, line);
        }
        return metricMap;
    }

    private void parseLine(Map<String, MetricFamily> metricMap, String line) {
        line = this.skipBlankTab(line);
        if (line == null) return;
        switch (line.charAt(0)) {
            case '#':
                this.parseComment(metricMap, line.substring(1));
                break;
            case '\n':
                break;
            default:
                this.parseMetric(metricMap, line);
        }
    }

    private void parseComment(Map<String, MetricFamily> metricMap, String line) {
        line = this.skipBlankTab(line);
        if (line == null) return;
        Pair<String, String> pair = this.readTokenUnitWhitespace(line);
        String token = pair.getLeft();
        String subLine = pair.getRight();
        if (!token.equals(HELP) && !token.equals(TYPE)) {
            // handle
            return;
        }
        pair = this.readTokenAsMetricName(subLine);
        String metricName = pair.getLeft();
        MetricFamily metricFamily = metricMap.computeIfAbsent(metricName, key -> new MetricFamily());
        metricFamily.setName(metricName);
        subLine = pair.getRight();
        switch (token) {
            case HELP:
                this.parseHelp(metricFamily, subLine);
                break;
            case TYPE:
                this.parseType(metricFamily, subLine);
                break;
            default:
        }
    }

    private void parseHelp(MetricFamily metricFamily, String line) {
        metricFamily.setHelp(this.skipBlankTab(line));
    }

    private void parseType(MetricFamily metricFamily, String line) {
        String type = this.skipBlankTab(line).toLowerCase();
        MetricType metricType = MetricType.getType(type);
        if (metricType == null) {
            throw new ParseException("pare type error");
        }
        metricFamily.setMetricType(metricType);
    }

    private void parseMetric(Map<String, MetricFamily> metricMap, String line) {
        Pair<String, String> pair = this.readTokenAsMetricName(line);
        String metricName = pair.getLeft();
        String subLine = pair.getRight();
        MetricFamily metricFamily = metricMap.get(metricName);
        if (metricFamily == null) {
            if (this.isCount(metricName)) {
                metricFamily = metricMap.get(metricName.substring(0, metricName.length() - COUNT_SUFFIX.length()));
            } else if (this.isSum(metricName)) {
                metricFamily = metricMap.get(metricName.substring(0, metricName.length() - SUM_SUFFIX.length()));
            } else if (this.isBucket(metricName)) {
                metricFamily = metricMap.get(metricName.substring(0, metricName.length() - BUCKET_SUFFIX.length()));
            }
            if (metricFamily == null) {
                log.error("line {} parse error, no such HELP and TYPE", line);
                return;
            } else if (this.isCount(metricName) || this.isSum(metricName)) {
                MetricFamily.Label label = new MetricFamily.Label();
                label.setName(metricName);
                this.readLabelValue(metricFamily, metricFamily.getMetricList().get(0), label, subLine);
            }
        }
        List<MetricFamily.Metric> metricList = metricFamily.getMetricList();
        if (metricList == null) {
            metricList = new ArrayList<>();
            metricFamily.setMetricList(metricList);
        }
        // todo 写死只创建一个metric, 为什么prometheus需要使用List?
        MetricFamily.Metric metric;
        if (metricList.isEmpty()) {
            metric = new MetricFamily.Metric();
            metricList.add(metric);
        } else {
            metric = metricList.get(0);
        }
        this.readLabels(metricFamily, metric, subLine);
    }

    private void readLabels(MetricFamily metricFamily, MetricFamily.Metric metric, String line) {
        metric.setLabelPair(new ArrayList<>());
        if (line.charAt(0) == '{') {
            this.startReadLabelName(metricFamily, metric, line.substring(1));
        } else {
            this.readLabelValue(metricFamily, metric, null, line);
        }
    }

    private void startReadLabelName(MetricFamily metricFamily, MetricFamily.Metric metric, String line) {
        String subLine = this.skipBlankTab(line);
        if (subLine == null) return;
        if (subLine.charAt(0) == '}') {
            subLine = this.skipBlankTab(line.substring(1));
            if (subLine.isEmpty()) return;
            this.startReadLabelValue(metricFamily, metric, new MetricFamily.Label(), subLine);
            return;
        }
        Pair<String, String> pair = this.readTokenAsLabelName(line);
        String labelName = pair.getLeft();
        subLine = pair.getRight();
        if (labelName == null || labelName.isEmpty() || labelName.equals("__name__")) {
            throw new ParseException("invalid label name, label name size = 0 or label name equals __name__");
        }
        MetricFamily.Label label = new MetricFamily.Label();
        label.setName(labelName);
        if (subLine.charAt(0) != '=') {
            throw new ParseException("parse error, not match the format of labelName=labelValue");
        }
        this.startReadLabelValue(metricFamily, metric, label, subLine.substring(1));
    }

    private void startReadLabelValue(MetricFamily metricFamily, MetricFamily.Metric metric, MetricFamily.Label label, String line) {
        String subLine = this.skipBlankTab(line);
        if (subLine == null) return;
        if (subLine.charAt(0) != '"') {
            throw new ParseException("expected '\"' at start of label value");
        }
        Pair<String, String> pair = this.readTokenAsLabelValue(line.substring(1));
        subLine = this.skipBlankTab(pair.getRight());
        label.setValue(pair.getLeft());
        if (!(metricFamily.getMetricType().equals(MetricType.SUMMARY) && label.getName().equals(QUANTILE_LABEL))
                && !(metricFamily.getMetricType().equals(MetricType.HISTOGRAM) && label.getName().equals(BUCKET_LABEL))) {
            metric.getLabelPair().add(label);
        }
        // todo add method: judge label value is valid
        if (!subLine.isEmpty()) {
            switch (subLine.charAt(0)) {
                case ',':
                    this.startReadLabelName(metricFamily, metric, subLine);
                    break;
                case '}':
                    subLine = this.skipBlankTab(subLine.substring(1));
                    if (subLine.isEmpty()) {
                        return;
                    }
                    this.readLabelValue(metricFamily, metric, label, subLine);
                    break;
                default:
                    throw new ParseException("expected '}' or ',' at end of label value");
            }
        }
    }

    // todo golang对于无限大的字符为 +INF/-INF, 需要单独处理
    private void readLabelValue(MetricFamily metricFamily, MetricFamily.Metric metric, MetricFamily.Label label, String line) {
        String subLine = this.skipBlankTab(line);
        switch (metricFamily.getMetricType()) {
            case COUNTER:
                MetricFamily.Counter counter = new MetricFamily.Counter();
                counter.setValue(Double.parseDouble(subLine));
                metric.setCounter(counter);
                break;
            case GAUGE:
                MetricFamily.Gauge gauge = new MetricFamily.Gauge();
                gauge.setValue(Double.parseDouble(subLine));
                metric.setGauge(gauge);
                break;
            case UNTYPED:
                MetricFamily.Untyped untyped = new MetricFamily.Untyped();
                untyped.setValue(Double.parseDouble(subLine));
                metric.setUntyped(untyped);
                break;
            case SUMMARY:
                MetricFamily.Summary summary = metric.getSummary();
                if (summary == null) {
                    summary = new MetricFamily.Summary();
                    metric.setSummary(summary);
                }
                // 处理 "xxx{quantile=\"0\"} 0" 的格式
                if (label != null && label.getName().equals(QUANTILE_LABEL)) {
                    List<MetricFamily.Quantile> quantileList = summary.getQuantileList();
                    if (quantileList == null) {
                        quantileList = new ArrayList<>();
                        summary.setQuantileList(quantileList);
                    }
                    MetricFamily.Quantile quantile = new MetricFamily.Quantile();
                    quantile.setXLabel(Double.parseDouble(label.getValue()));
                    quantile.setValue(Double.parseDouble(subLine));
                    quantileList.add(quantile);
                }
                // 处理 xxx_sum 的数据
                if (label != null && this.isSum(label.getName())) {
                    summary.setSum(Double.parseDouble(subLine));
                }
                // 处理 xxx_count 的数据
                if (label != null && this.isCount(label.getName())) {
                    summary.setCount(Long.parseLong(subLine));
                }
                break;
            case HISTOGRAM:
                MetricFamily.Histogram histogram = metric.getHistogram();
                if (histogram == null) {
                    histogram = new MetricFamily.Histogram();
                    metric.setHistogram(histogram);
                }
                // 处理 "xxx{quantile=\"0\"} 0" 的格式
                if (label != null && label.getName().equals(BUCKET_LABEL)) {
                    List<MetricFamily.Bucket> bucketList = histogram.getBucketList();
                    if (bucketList == null) {
                        bucketList = new ArrayList<>();
                        histogram.setBucketList(bucketList);
                    }
                    MetricFamily.Bucket bucket = new MetricFamily.Bucket();
                    bucket.setUpperBound(Double.parseDouble(label.getValue()));
                    bucket.setCumulativeCount(Long.parseLong(subLine));
                    bucketList.add(bucket);
                }
                if (label != null && this.isSum(label.getName())) {
                    histogram.setSum(Double.parseDouble(subLine));
                }
                if (label != null && this.isCount(label.getName())) {
                    histogram.setCount(Long.parseLong(subLine));
                }
                break;
            default:
                throw new ParseException("no such type in metricFamily");
        }
    }

    /**
     * 读取第一个空格符前的token
     *
     * @return Pair<Left: token, right: sub line>
     */
    private Pair<String, String> readTokenUnitWhitespace(String s) {
        int whitespaceIndex = s.indexOf(" ");
        if (whitespaceIndex < 0 || whitespaceIndex > s.length()) {
            return Pair.of(s, null);
        }
        return Pair.of(s.substring(0, whitespaceIndex).trim(), s.substring(whitespaceIndex).trim());
    }

    /**
     * 获取指标的名称
     *
     * @return Pair<left: metricName, right: sub line>
     */
    private Pair<String, String> readTokenAsMetricName(String s) {
        if (this.isValidMetricNameStart(s.charAt(0))) {
            int i;
            for (i = 1; i < s.length(); i++) {
                if (!this.isValidMetricNameContinuation(s.charAt(i))) {
                    break;
                }
            }
            return Pair.of(s.substring(0, i), s.substring(i));
        }
        throw new ParseException("parse metric name error");
    }

    /**
     * 获取Label的名称
     *
     * @return Pair<left: LabelName, right: sub line>
     */
    private Pair<String, String> readTokenAsLabelName(String s) {
        if (this.isValidLabelNameStart(s.charAt(0))) {
            int i;
            for (i = 1; i < s.length(); i++) {
                if (!this.isValidLabelNameContinuation(s.charAt(i))) {
                    break;
                }
            }
            return Pair.of(s.substring(0, i), s.substring(i));
        }
        throw new ParseException("parse label name error");
    }

    /**
     * 获取Label的值
     *
     * @return Pair<left: LabelValue, right: sub line>
     */
    private Pair<String, String> readTokenAsLabelValue(String s) {
        StringBuilder builder = new StringBuilder();
        boolean escaped = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
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
                        return Pair.of(builder.toString(), s.substring(i + 1));
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
        return Pair.of(builder.toString(), "");
    }

    // 清除字符两边空格
    private String skipBlankTab(String s) {
        if (s == null) {
            return null;
        }
        s = s.trim();
        return s.isEmpty() ? null : s;
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

    private boolean isSum(String s) {
        return s != null && s.endsWith(SUM_SUFFIX);
    }

    private boolean isCount(String s) {
        return s != null && s.endsWith(COUNT_SUFFIX);
    }

    private boolean isBucket(String s) {
        return s != null && s.endsWith(BUCKET_SUFFIX);
    }

    public static void main(String[] args) {
        String resp = "# HELP go_gc_cycles_automatic_gc_cycles_total Count of completed GC cycles generated by the Go runtime.\n" +
                "# TYPE go_gc_cycles_automatic_gc_cycles_total counter\n" +
                "go_gc_cycles_automatic_gc_cycles_total 0\n" +
                "# HELP go_gc_cycles_forced_gc_cycles_total Count of completed GC cycles forced by the application.\n" +
                "# TYPE go_gc_cycles_forced_gc_cycles_total counter\n" +
                "go_gc_cycles_forced_gc_cycles_total 0\n" +
                "# HELP go_gc_cycles_total_gc_cycles_total Count of all completed GC cycles.\n" +
                "# TYPE go_gc_cycles_total_gc_cycles_total counter\n" +
                "go_gc_cycles_total_gc_cycles_total 0\n" +
                "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n" +
                "# TYPE go_gc_duration_seconds summary\n" +
                "go_gc_duration_seconds{quantile=\"0\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"0.25\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"0.5\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"0.75\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"1\"} 0\n" +
                "go_gc_duration_seconds_sum 0\n" +
                "go_gc_duration_seconds_count 0\n" +
                "# HELP go_gc_heap_allocs_by_size_bytes_total Distribution of heap allocations by approximate size. Note that this does not include tiny objects as defined by /gc/heap/tiny/allocs:objects, only tiny blocks.\n" +
                "# TYPE go_gc_heap_allocs_by_size_bytes_total histogram\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"8.999999999999998\"} 4096\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"24.999999999999996\"} 12285\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"64.99999999999999\"} 17695\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"144.99999999999997\"} 20775\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"320.99999999999994\"} 22503\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"704.9999999999999\"} 23097\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"1536.9999999999998\"} 23285\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"3200.9999999999995\"} 23386\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"6528.999999999999\"} 23436\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"13568.999999999998\"} 23466\n" +
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"27264.999999999996\"} 23472\n" +
//                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"+Inf\"} 23474\n" +
                "go_gc_heap_allocs_by_size_bytes_total_sum 2.5694e+06\n" +
                "go_gc_heap_allocs_by_size_bytes_total_count 23474\n" +
                "# HELP go_memstats_mspan_inuse_bytes Number of bytes in use by mspan structures.\n" +
                "# TYPE go_memstats_mspan_inuse_bytes gauge\n" +
                "go_memstats_mspan_inuse_bytes 46512\n" +
                "# HELP mysql_global_status_aborted_connects Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_aborted_connects untyped\n" +
                "mysql_global_status_aborted_connects 0";
        ExporterParser parser = new ExporterParser();
        Map<String, MetricFamily> metricFamilyMap = parser.textToMetric(resp);
        for (MetricFamily metricFamily : metricFamilyMap.values()) {
            System.out.println(metricFamily);
        }
    }
}
