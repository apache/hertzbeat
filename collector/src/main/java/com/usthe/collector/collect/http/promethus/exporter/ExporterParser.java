package com.usthe.collector.collect.http.promethus.exporter;

import com.usthe.collector.collect.http.promethus.ParseException;
import com.usthe.common.util.StrBuffer;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author ceilzcx
 * @since 7/11/2022
 * 参考: prometheus的text_parse.go的代码, 入口: TextToMetricFamilies
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
                this.parseComment(metricMap, buffer);
                break;
            case '\n':
                break;
            default:
                this.parseMetric(metricMap, buffer);
        }
    }

    private void parseComment(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        String token = this.readTokenUnitWhitespace(buffer);
        if (!token.equals(HELP) && !token.equals(TYPE)) {
            // handle
            return;
        }
        String metricName = this.readTokenAsMetricName(buffer);
        MetricFamily metricFamily = metricMap.computeIfAbsent(metricName, key -> new MetricFamily());
        metricFamily.setName(metricName);
        switch (token) {
            case HELP:
                this.parseHelp(metricFamily, buffer);
                break;
            case TYPE:
                this.parseType(metricFamily, buffer);
                break;
            default:
        }
    }

    private void parseHelp(MetricFamily metricFamily, StrBuffer line) {
        line.skipBlankTabs();
        metricFamily.setHelp(line.toStr());
    }

    private void parseType(MetricFamily metricFamily, StrBuffer line) {
        line.skipBlankTabs();
        String type = line.toStr().toLowerCase();
        MetricType metricType = MetricType.getType(type);
        if (metricType == null) {
            throw new ParseException("pare type error");
        }
        metricFamily.setMetricType(metricType);
    }

    private void parseMetric(Map<String, MetricFamily> metricMap, StrBuffer buffer) {
        String metricName = this.readTokenAsMetricName(buffer);
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
                log.error("line {} parse error, no such HELP and TYPE", buffer.toStr());
                return;
            } else if (this.isCount(metricName) || this.isSum(metricName)) {
                MetricFamily.Label label = new MetricFamily.Label();
                label.setName(metricName);
                this.readLabelValue(metricFamily, metricFamily.getMetricList().get(0), label, buffer);
            }
        }
        List<MetricFamily.Metric> metricList = metricFamily.getMetricList();
        if (metricList == null) {
            metricList = new ArrayList<>();
            metricFamily.setMetricList(metricList);
        }
        // todo 这里可能存在问题, 目前逻辑是HISTOGRAM和SUMMARY只创建一个metric, 不知道是否合理, 还需要参照源码
        MetricFamily.Metric metric;
        if (metricList.isEmpty()) {
            metric = new MetricFamily.Metric();
            metricList.add(metric);
        } else {
            if (metricFamily.getMetricType().equals(MetricType.HISTOGRAM) || metricFamily.getMetricType().equals(MetricType.SUMMARY)) {
                metric = metricList.get(0);
            } else {
                metric = new MetricFamily.Metric();
                metricList.add(metric);
            }
        }
        this.readLabels(metricFamily, metric, buffer);
    }

    private void readLabels(MetricFamily metricFamily, MetricFamily.Metric metric, StrBuffer buffer) {
        metric.setLabelPair(new ArrayList<>());
        if (buffer.charAt(0) == '{') {
            buffer.read();
            this.startReadLabelName(metricFamily, metric, buffer);
        } else {
            this.readLabelValue(metricFamily, metric, null, buffer);
        }
    }

    private void startReadLabelName(MetricFamily metricFamily, MetricFamily.Metric metric, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        if (buffer.charAt(0) == '}') {
            buffer.read();
            buffer.skipBlankTabs();
            if (buffer.isEmpty()) return;
            this.startReadLabelValue(metricFamily, metric, new MetricFamily.Label(), buffer);
            return;
        }
        String labelName = this.readTokenAsLabelName(buffer);
        if (labelName.isEmpty() || labelName.equals("__name__")) {
            throw new ParseException("invalid label name, label name size = 0 or label name equals __name__");
        }
        MetricFamily.Label label = new MetricFamily.Label();
        label.setName(labelName);
        if (buffer.read() != '=') {
            throw new ParseException("parse error, not match the format of labelName=labelValue");
        }
        this.startReadLabelValue(metricFamily, metric, label, buffer);
    }

    private void startReadLabelValue(MetricFamily metricFamily, MetricFamily.Metric metric, MetricFamily.Label label, StrBuffer buffer) {
        buffer.skipBlankTabs();
        if (buffer.isEmpty()) return;
        char c = buffer.read();
        if (c != '"') {
            throw new ParseException("expected '\"' at start of label value");
        }
        String labelValue = this.readTokenAsLabelValue(buffer);
        label.setValue(labelValue);
        if (!(metricFamily.getMetricType().equals(MetricType.SUMMARY) && label.getName().equals(QUANTILE_LABEL))
                && !(metricFamily.getMetricType().equals(MetricType.HISTOGRAM) && label.getName().equals(BUCKET_LABEL))) {
            metric.getLabelPair().add(label);
        }
        // todo add method: judge label value is valid
        if (!buffer.isEmpty()) {
            switch (buffer.charAt(0)) {
                case ',':
                    buffer.read();
                    this.startReadLabelName(metricFamily, metric, buffer);
                    break;
                case '}':
                    buffer.read();
                    buffer.skipBlankTabs();
                    if (buffer.isEmpty()) {
                        return;
                    }
                    this.readLabelValue(metricFamily, metric, label, buffer);
                    break;
                default:
                    throw new ParseException("expected '}' or ',' at end of label value");
            }
        }
    }

    private void readLabelValue(MetricFamily metricFamily, MetricFamily.Metric metric, MetricFamily.Label label, StrBuffer buffer) {
        buffer.skipBlankTabs();
        switch (metricFamily.getMetricType()) {
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
                // 处理 "xxx{quantile=\"0\"} 0" 的格式
                if (label != null && label.getName().equals(QUANTILE_LABEL)) {
                    List<MetricFamily.Quantile> quantileList = summary.getQuantileList();
                    if (quantileList == null) {
                        quantileList = new ArrayList<>();
                        summary.setQuantileList(quantileList);
                    }
                    MetricFamily.Quantile quantile = new MetricFamily.Quantile();
                    if (!label.getValue().equals("+Inf")) {
                        quantile.setXLabel(Double.parseDouble(label.getValue()));
                    }
                    quantile.setValue(buffer.toDouble());
                    quantileList.add(quantile);
                }
                // 处理 xxx_sum 的数据
                if (label != null && this.isSum(label.getName())) {
                    summary.setSum(buffer.toDouble());
                }
                // 处理 xxx_count 的数据
                if (label != null && this.isCount(label.getName())) {
                    summary.setCount(buffer.toLong());
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
                    if (!label.getValue().equals("+Inf")) {
                        bucket.setUpperBound(Double.parseDouble(label.getValue()));
                    }
                    bucket.setCumulativeCount(buffer.toLong());
                    bucketList.add(bucket);
                }
                if (label != null && this.isSum(label.getName())) {
                    histogram.setSum(buffer.toDouble());
                }
                if (label != null && this.isCount(label.getName())) {
                    histogram.setCount(buffer.toLong());
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
                "go_gc_heap_allocs_by_size_bytes_total_bucket{le=\"+Inf\"} 23474\n" +
                "go_gc_heap_allocs_by_size_bytes_total_sum 2.5694e+06\n" +
                "go_gc_heap_allocs_by_size_bytes_total_count 23474\n" +
                "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n" +
                "# TYPE go_gc_duration_seconds summary\n" +
                "go_gc_duration_seconds{quantile=\"0\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"0.25\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"0.5\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"0.75\"} 0\n" +
                "go_gc_duration_seconds{quantile=\"1\"} 0\n" +
                "go_gc_duration_seconds_sum 0\n" +
                "go_gc_duration_seconds_count 0\n" +
                "# HELP go_gc_heap_allocs_bytes_total Cumulative sum of memory allocated to the heap by the application.\n" +
                "# TYPE go_gc_heap_allocs_bytes_total counter\n" +
                "go_gc_heap_allocs_bytes_total 2.5694e+06\n" +
                "# HELP go_gc_heap_allocs_objects_total Cumulative count of heap allocations triggered by the application. Note that this does not include tiny objects as defined by /gc/heap/tiny/allocs:objects, only tiny blocks.\n" +
                "# TYPE go_gc_heap_allocs_objects_total counter\n" +
                "go_gc_heap_allocs_objects_total 23474\n" +
                "# HELP go_gc_heap_frees_by_size_bytes_total Distribution of freed heap allocations by approximate size. Note that this does not include tiny objects as defined by /gc/heap/tiny/allocs:objects, only tiny blocks.\n" +
                "# TYPE go_gc_heap_frees_by_size_bytes_total histogram\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"8.999999999999998\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"24.999999999999996\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"64.99999999999999\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"144.99999999999997\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"320.99999999999994\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"704.9999999999999\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"1536.9999999999998\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"3200.9999999999995\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"6528.999999999999\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"13568.999999999998\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"27264.999999999996\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_bucket{le=\"+Inf\"} 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_sum 0\n" +
                "go_gc_heap_frees_by_size_bytes_total_count 0\n" +
                "# HELP go_gc_heap_frees_bytes_total Cumulative sum of heap memory freed by the garbage collector.\n" +
                "# TYPE go_gc_heap_frees_bytes_total counter\n" +
                "go_gc_heap_frees_bytes_total 0\n" +
                "# HELP go_gc_heap_frees_objects_total Cumulative count of heap allocations whose storage was freed by the garbage collector. Note that this does not include tiny objects as defined by /gc/heap/tiny/allocs:objects, only tiny blocks.\n" +
                "# TYPE go_gc_heap_frees_objects_total counter\n" +
                "go_gc_heap_frees_objects_total 0\n" +
                "# HELP go_gc_heap_goal_bytes Heap size target for the end of the GC cycle.\n" +
                "# TYPE go_gc_heap_goal_bytes gauge\n" +
                "go_gc_heap_goal_bytes 4.473924e+06\n" +
                "# HELP go_gc_heap_objects_objects Number of objects, live or unswept, occupying heap memory.\n" +
                "# TYPE go_gc_heap_objects_objects gauge\n" +
                "go_gc_heap_objects_objects 23474\n" +
                "# HELP go_gc_heap_tiny_allocs_objects_total Count of small allocations that are packed together into blocks. These allocations are counted separately from other allocations because each individual allocation is not tracked by the runtime, only their block. Each block is already accounted for in allocs-by-size and frees-by-size.\n" +
                "# TYPE go_gc_heap_tiny_allocs_objects_total counter\n" +
                "go_gc_heap_tiny_allocs_objects_total 301\n" +
                "# HELP go_memory_classes_metadata_mcache_free_bytes Memory that is reserved for runtime mcache structures, but not in-use.\n" +
                "# TYPE go_memory_classes_metadata_mcache_free_bytes gauge\n" +
                "go_memory_classes_metadata_mcache_free_bytes 7040\n" +
                "# HELP go_memory_classes_metadata_mcache_inuse_bytes Memory that is occupied by runtime mcache structures that are currently being used.\n" +
                "# TYPE go_memory_classes_metadata_mcache_inuse_bytes gauge\n" +
                "go_memory_classes_metadata_mcache_inuse_bytes 9344\n" +
                "# HELP go_memory_classes_metadata_mspan_free_bytes Memory that is reserved for runtime mspan structures, but not in-use.\n" +
                "# TYPE go_memory_classes_metadata_mspan_free_bytes gauge\n" +
                "go_memory_classes_metadata_mspan_free_bytes 2640\n" +
                "# HELP go_memory_classes_metadata_mspan_inuse_bytes Memory that is occupied by runtime mspan structures that are currently being used.\n" +
                "# TYPE go_memory_classes_metadata_mspan_inuse_bytes gauge\n" +
                "go_memory_classes_metadata_mspan_inuse_bytes 46512\n" +
                "# HELP go_memory_classes_metadata_other_bytes Memory that is reserved for or used to hold runtime metadata.\n" +
                "# TYPE go_memory_classes_metadata_other_bytes gauge\n" +
                "go_memory_classes_metadata_other_bytes 1.536992e+06\n" +
                "# HELP go_memory_classes_os_stacks_bytes Stack memory allocated by the underlying operating system.\n" +
                "# TYPE go_memory_classes_os_stacks_bytes gauge\n" +
                "go_memory_classes_os_stacks_bytes 0\n" +
                "# HELP go_memory_classes_other_bytes Memory used by execution trace buffers, structures for debugging the runtime, finalizer and profiler specials, and more.\n" +
                "# TYPE go_memory_classes_other_bytes gauge\n" +
                "go_memory_classes_other_bytes 1.163635e+06\n" +
                "# HELP go_memory_classes_profiling_buckets_bytes Memory that is used by the stack trace hash map used for profiling.\n" +
                "# TYPE go_memory_classes_profiling_buckets_bytes gauge\n" +
                "go_memory_classes_profiling_buckets_bytes 7037\n" +
                "# HELP go_memory_classes_total_bytes All memory mapped by the Go runtime into the current process as read-write. Note that this does not include memory mapped by code called via cgo or via the syscall package. Sum of all metrics in /memory/classes.\n" +
                "# TYPE go_memory_classes_total_bytes gauge\n" +
                "go_memory_classes_total_bytes 6.967504e+06\n" +
                "# HELP go_memstats_alloc_bytes Number of bytes allocated and still in use.\n" +
                "# TYPE go_memstats_alloc_bytes gauge\n" +
                "go_memstats_alloc_bytes 2.5694e+06\n" +
                "# HELP go_memstats_alloc_bytes_total Total number of bytes allocated, even if freed.\n" +
                "# TYPE go_memstats_alloc_bytes_total counter\n" +
                "go_memstats_alloc_bytes_total 2.5694e+06\n" +
                "# HELP go_memstats_buck_hash_sys_bytes Number of bytes used by the profiling bucket hash table.\n" +
                "# TYPE go_memstats_buck_hash_sys_bytes gauge\n" +
                "go_memstats_buck_hash_sys_bytes 7037\n" +
                "# HELP go_memstats_frees_total Total number of frees.\n" +
                "# TYPE go_memstats_frees_total counter\n" +
                "go_memstats_frees_total 301\n" +
                "# HELP go_memstats_last_gc_time_seconds Number of seconds since 1970 of last garbage collection.\n" +
                "# TYPE go_memstats_last_gc_time_seconds gauge\n" +
                "go_memstats_last_gc_time_seconds 0\n" +
                "# HELP go_memstats_mcache_inuse_bytes Number of bytes in use by mcache structures.\n" +
                "# TYPE go_memstats_mcache_inuse_bytes gauge\n" +
                "go_memstats_mcache_inuse_bytes 9344\n" +
                "# HELP go_memstats_mcache_sys_bytes Number of bytes used for mcache structures obtained from system.\n" +
                "# TYPE go_memstats_mcache_sys_bytes gauge\n" +
                "go_memstats_mcache_sys_bytes 16384\n" +
                "# HELP go_memstats_mspan_inuse_bytes Number of bytes in use by mspan structures.\n" +
                "# TYPE go_memstats_mspan_inuse_bytes gauge\n" +
                "go_memstats_mspan_inuse_bytes 46512\n" +
                "# HELP go_memstats_mspan_sys_bytes Number of bytes used for mspan structures obtained from system.\n" +
                "# TYPE go_memstats_mspan_sys_bytes gauge\n" +
                "go_memstats_mspan_sys_bytes 49152\n" +
                "# HELP go_memstats_next_gc_bytes Number of heap bytes when next garbage collection will take place.\n" +
                "# TYPE go_memstats_next_gc_bytes gauge\n" +
                "go_memstats_next_gc_bytes 4.473924e+06\n" +
                "# HELP go_memstats_other_sys_bytes Number of bytes used for other system allocations.\n" +
                "# TYPE go_memstats_other_sys_bytes gauge\n" +
                "go_memstats_other_sys_bytes 1.163635e+06\n" +
                "# HELP go_memstats_stack_inuse_bytes Number of bytes in use by the stack allocator.\n" +
                "# TYPE go_memstats_stack_inuse_bytes gauge\n" +
                "go_memstats_stack_inuse_bytes 163840\n" +
                "# HELP go_memstats_stack_sys_bytes Number of bytes obtained from system for stack allocator.\n" +
                "# TYPE go_memstats_stack_sys_bytes gauge\n" +
                "go_memstats_stack_sys_bytes 163840\n" +
                "# HELP go_memstats_sys_bytes Number of bytes obtained from system.\n" +
                "# TYPE go_memstats_sys_bytes gauge\n" +
                "go_memstats_sys_bytes 6.967504e+06\n" +
                "# HELP go_sched_goroutines_goroutines Count of live goroutines.\n" +
                "# TYPE go_sched_goroutines_goroutines gauge\n" +
                "go_sched_goroutines_goroutines 6\n" +
                "# HELP go_sched_latencies_seconds Distribution of the time goroutines have spent in the scheduler in a runnable state before actually running.\n" +
                "# TYPE go_sched_latencies_seconds histogram\n" +
                "go_sched_latencies_seconds_bucket{le=\"-5e-324\"} 0\n" +
                "go_sched_latencies_seconds_bucket{le=\"9.999999999999999e-10\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"9.999999999999999e-09\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"9.999999999999998e-08\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"1.0239999999999999e-06\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"1.0239999999999999e-05\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"0.00010239999999999998\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"0.0010485759999999998\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"0.010485759999999998\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"0.10485759999999998\"} 34\n" +
                "go_sched_latencies_seconds_bucket{le=\"+Inf\"} 34\n" +
                "go_sched_latencies_seconds_sum NaN\n" +
                "go_sched_latencies_seconds_count 34\n" +
                "# HELP go_threads Number of OS threads created.\n" +
                "# TYPE go_threads gauge\n" +
                "go_threads 7\n" +
                "# HELP mysql_exporter_collector_duration_seconds Collector time duration.\n" +
                "# TYPE mysql_exporter_collector_duration_seconds gauge\n" +
                "mysql_exporter_collector_duration_seconds{collector=\"collect.global_status\"} 0.0573716\n" +
                "mysql_exporter_collector_duration_seconds{collector=\"collect.global_variables\"} 0.0401132\n" +
                "mysql_exporter_collector_duration_seconds{collector=\"collect.info_schema.innodb_cmp\"} 0.0605768\n" +
                "mysql_exporter_collector_duration_seconds{collector=\"collect.info_schema.innodb_cmpmem\"} 0.0607512\n" +
                "mysql_exporter_collector_duration_seconds{collector=\"collect.info_schema.query_response_time\"} 0.0010332\n" +
                "mysql_exporter_collector_duration_seconds{collector=\"collect.slave_status\"} 0.0667714\n" +
                "mysql_exporter_collector_duration_seconds{collector=\"connection\"} 0.0160176\n" +
                "# HELP mysql_exporter_last_scrape_error Whether the last scrape of metrics from MySQL resulted in an error (1 for error, 0 for success).\n" +
                "# TYPE mysql_exporter_last_scrape_error gauge\n" +
                "mysql_exporter_last_scrape_error 0\n" +
                "# HELP mysql_exporter_scrapes_total Total number of times MySQL was scraped for metrics.\n" +
                "# TYPE mysql_exporter_scrapes_total counter\n" +
                "mysql_exporter_scrapes_total 1\n" +
                "# HELP mysql_global_status_aborted_clients Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_aborted_clients untyped\n" +
                "mysql_global_status_aborted_clients 0\n" +
                "# HELP mysql_global_status_aborted_connects Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_aborted_connects untyped\n" +
                "mysql_global_status_aborted_connects 0\n" +
                "# HELP mysql_global_status_acl_cache_items_count Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_acl_cache_items_count untyped\n" +
                "mysql_global_status_acl_cache_items_count 0\n" +
                "# HELP mysql_global_status_binlog_cache_disk_use Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_binlog_cache_disk_use untyped\n" +
                "mysql_global_status_binlog_cache_disk_use 0\n" +
                "# HELP mysql_global_status_binlog_cache_use Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_binlog_cache_use untyped\n" +
                "mysql_global_status_binlog_cache_use 0\n" +
                "# HELP mysql_global_status_binlog_stmt_cache_disk_use Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_binlog_stmt_cache_disk_use untyped\n" +
                "mysql_global_status_binlog_stmt_cache_disk_use 0\n" +
                "# HELP mysql_global_status_binlog_stmt_cache_use Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_binlog_stmt_cache_use untyped\n" +
                "mysql_global_status_binlog_stmt_cache_use 0\n" +
                "# HELP mysql_global_status_buffer_pool_dirty_pages Innodb buffer pool dirty pages.\n" +
                "# TYPE mysql_global_status_buffer_pool_dirty_pages gauge\n" +
                "mysql_global_status_buffer_pool_dirty_pages 0\n" +
                "# HELP mysql_global_status_buffer_pool_page_changes_total Innodb buffer pool page state changes.\n" +
                "# TYPE mysql_global_status_buffer_pool_page_changes_total counter\n" +
                "mysql_global_status_buffer_pool_page_changes_total{operation=\"flushed\"} 163\n" +
                "# HELP mysql_global_status_buffer_pool_pages Innodb buffer pool pages by state.\n" +
                "# TYPE mysql_global_status_buffer_pool_pages gauge\n" +
                "mysql_global_status_buffer_pool_pages{state=\"data\"} 1135\n" +
                "mysql_global_status_buffer_pool_pages{state=\"free\"} 7053\n" +
                "mysql_global_status_buffer_pool_pages{state=\"misc\"} 4\n" +
                "# HELP mysql_global_status_bytes_received Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_bytes_received untyped\n" +
                "mysql_global_status_bytes_received 262\n" +
                "# HELP mysql_global_status_bytes_sent Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_bytes_sent untyped\n" +
                "mysql_global_status_bytes_sent 21209\n" +
                "# HELP mysql_global_status_commands_total Total number of executed MySQL commands.\n" +
                "# TYPE mysql_global_status_commands_total counter\n" +
                "mysql_global_status_commands_total{command=\"admin_commands\"} 1\n" +
                "mysql_global_status_commands_total{command=\"alter_db\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_event\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_function\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_instance\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_procedure\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_resource_group\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_server\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_table\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_tablespace\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_user\"} 0\n" +
                "mysql_global_status_commands_total{command=\"alter_user_default_role\"} 0\n" +
                "mysql_global_status_commands_total{command=\"analyze\"} 0\n" +
                "mysql_global_status_commands_total{command=\"assign_to_keycache\"} 0\n" +
                "mysql_global_status_commands_total{command=\"begin\"} 0\n" +
                "mysql_global_status_commands_total{command=\"binlog\"} 0\n" +
                "mysql_global_status_commands_total{command=\"call_procedure\"} 0\n" +
                "mysql_global_status_commands_total{command=\"change_db\"} 1\n" +
                "mysql_global_status_commands_total{command=\"change_master\"} 0\n" +
                "mysql_global_status_commands_total{command=\"change_repl_filter\"} 0\n" +
                "mysql_global_status_commands_total{command=\"change_replication_source\"} 0\n" +
                "mysql_global_status_commands_total{command=\"check\"} 0\n" +
                "mysql_global_status_commands_total{command=\"checksum\"} 0\n" +
                "mysql_global_status_commands_total{command=\"clone\"} 0\n" +
                "mysql_global_status_commands_total{command=\"commit\"} 0\n" +
                "mysql_global_status_commands_total{command=\"create_db\"} 1\n" +
                "mysql_global_status_commands_total{command=\"drop_db\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_event\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_function\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_index\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_procedure\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_resource_group\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_role\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_server\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_spatial_reference_system\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_table\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_trigger\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_user\"} 0\n" +
                "mysql_global_status_commands_total{command=\"drop_view\"} 0\n" +
                "mysql_global_status_commands_total{command=\"empty_query\"} 0\n" +
                "mysql_global_status_commands_total{command=\"execute_sql\"} 0\n" +
                "mysql_global_status_commands_total{command=\"explain_other\"} 0\n" +
                "mysql_global_status_commands_total{command=\"optimize\"} 0\n" +
                "mysql_global_status_commands_total{command=\"preload_keys\"} 0\n" +
                "mysql_global_status_commands_total{command=\"prepare_sql\"} 0\n" +
                "mysql_global_status_commands_total{command=\"purge\"} 0\n" +
                "mysql_global_status_commands_total{command=\"purge_before_date\"} 0\n" +
                "mysql_global_status_commands_total{command=\"release_savepoint\"} 0\n" +
                "mysql_global_status_commands_total{command=\"rename_table\"} 0\n" +
                "mysql_global_status_commands_total{command=\"rename_user\"} 0\n" +
                "mysql_global_status_commands_total{command=\"repair\"} 0\n" +
                "mysql_global_status_commands_total{command=\"replace\"} 0\n" +
                "mysql_global_status_commands_total{command=\"replace_select\"} 0\n" +
                "mysql_global_status_commands_total{command=\"replica_start\"} 0\n" +
                "mysql_global_status_commands_total{command=\"slave_start\"} 0\n" +
                "mysql_global_status_commands_total{command=\"slave_stop\"} 0\n" +
                "mysql_global_status_commands_total{command=\"stmt_close\"} 0\n" +
                "mysql_global_status_commands_total{command=\"stmt_execute\"} 0\n" +
                "mysql_global_status_commands_total{command=\"stmt_fetch\"} 0\n" +
                "mysql_global_status_commands_total{command=\"stmt_prepare\"} 0\n" +
                "mysql_global_status_commands_total{command=\"stmt_reprepare\"} 0\n" +
                "mysql_global_status_commands_total{command=\"stmt_reset\"} 0\n" +
                "mysql_global_status_commands_total{command=\"stmt_send_long_data\"} 0\n" +
                "mysql_global_status_commands_total{command=\"truncate\"} 0\n" +
                "mysql_global_status_commands_total{command=\"uninstall_component\"} 0\n" +
                "mysql_global_status_commands_total{command=\"uninstall_plugin\"} 0\n" +
                "mysql_global_status_commands_total{command=\"xa_start\"} 0\n" +
                "# HELP mysql_global_status_error_log_latest_write Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_error_log_latest_write untyped\n" +
                "mysql_global_status_error_log_latest_write 1.667889270142246e+15\n" +
                "# HELP mysql_global_status_flush_commands Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_flush_commands untyped\n" +
                "mysql_global_status_flush_commands 3\n" +
                "# HELP mysql_global_status_handlers_total Total number of executed MySQL handlers.\n" +
                "# TYPE mysql_global_status_handlers_total counter\n" +
                "mysql_global_status_handlers_total{handler=\"commit\"} 597\n" +
                "mysql_global_status_handlers_total{handler=\"delete\"} 0\n" +
                "mysql_global_status_handlers_total{handler=\"discover\"} 0\n" +
                "mysql_global_status_handlers_total{handler=\"external_lock\"} 6135\n" +
                "mysql_global_status_handlers_total{handler=\"mrr_init\"} 0\n" +
                "mysql_global_status_handlers_total{handler=\"prepare\"} 0\n" +
                "mysql_global_status_handlers_total{handler=\"read_first\"} 43\n" +
                "mysql_global_status_handlers_total{handler=\"read_key\"} 1706\n" +
                "# HELP mysql_global_status_innodb_dblwr_pages_written Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_innodb_dblwr_pages_written untyped\n" +
                "mysql_global_status_innodb_dblwr_pages_written 22\n" +
                "# HELP mysql_global_status_innodb_os_log_fsyncs Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_innodb_os_log_fsyncs untyped\n" +
                "mysql_global_status_innodb_os_log_fsyncs 8\n" +
                "# HELP mysql_global_status_innodb_os_log_pending_fsyncs Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_innodb_os_log_pending_fsyncs untyped\n" +
                "mysql_global_status_innodb_os_log_pending_fsyncs 0\n" +
                "# HELP mysql_global_status_innodb_os_log_pending_writes Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_innodb_os_log_pending_writes untyped\n" +
                "mysql_global_status_innodb_os_log_pending_writes 0\n" +
                "# HELP mysql_global_status_innodb_os_log_written Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_innodb_os_log_written untyped\n" +
                "mysql_global_status_innodb_os_log_written 29184\n" +
                "# HELP mysql_global_status_innodb_page_size Generic metric from SHOW GLOBAL STATUS.\n" +
                "# TYPE mysql_global_status_innodb_page_size untyped\n" +
                "mysql_global_status_innodb_page_size 16384\n" +
                "# HELP mysql_info_schema_innodb_cmp_uncompress_time_seconds_total Total time in seconds spent in uncompressing B-tree pages.\n" +
                "# TYPE mysql_info_schema_innodb_cmp_uncompress_time_seconds_total counter\n" +
                "mysql_info_schema_innodb_cmp_uncompress_time_seconds_total{page_size=\"1024\"} 0\n" +
                "mysql_info_schema_innodb_cmp_uncompress_time_seconds_total{page_size=\"16384\"} 0\n" +
                "mysql_info_schema_innodb_cmp_uncompress_time_seconds_total{page_size=\"2048\"} 0\n" +
                "mysql_info_schema_innodb_cmp_uncompress_time_seconds_total{page_size=\"4096\"} 0\n" +
                "mysql_info_schema_innodb_cmp_uncompress_time_seconds_total{page_size=\"8192\"} 0\n" +
                "# HELP mysql_transaction_isolation MySQL transaction isolation.\n" +
                "# TYPE mysql_transaction_isolation gauge\n" +
                "mysql_transaction_isolation{level=\"REPEATABLE-READ\"} 1\n" +
                "# HELP mysql_up Whether the MySQL server is up.\n" +
                "# TYPE mysql_up gauge\n" +
                "mysql_up 1\n" +
                "# HELP mysql_version_info MySQL version and distribution.\n" +
                "# TYPE mysql_version_info gauge\n" +
                "mysql_version_info{innodb_version=\"8.0.25\",version=\"8.0.25\",version_comment=\"MySQL Community Server - GPL\"} 1\n" +
                "# HELP mysqld_exporter_build_info A metric with a constant '1' value labeled by version, revision, branch, and goversion from which mysqld_exporter was built.\n" +
                "# TYPE mysqld_exporter_build_info gauge\n" +
                "mysqld_exporter_build_info{branch=\"HEAD\",goversion=\"go1.17.8\",revision=\"ca1b9af82a471c849c529eb8aadb1aac73e7b68c\",version=\"0.14.0\"} 1\n" +
                "# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.\n" +
                "# TYPE process_cpu_seconds_total counter\n" +
                "process_cpu_seconds_total 0.015625\n" +
                "# HELP process_max_fds Maximum number of open file descriptors.\n" +
                "# TYPE process_max_fds gauge\n" +
                "process_max_fds 1.6777216e+07\n" +
                "# HELP process_open_fds Number of open file descriptors.\n" +
                "# TYPE process_open_fds gauge\n" +
                "process_open_fds 102\n" +
                "# HELP process_resident_memory_bytes Resident memory size in bytes.\n" +
                "# TYPE process_resident_memory_bytes gauge\n" +
                "process_resident_memory_bytes 1.0862592e+07\n" +
                "# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.\n" +
                "# TYPE process_start_time_seconds gauge\n" +
                "process_start_time_seconds 1.667908248e+09\n" +
                "# HELP process_virtual_memory_bytes Virtual memory size in bytes.\n" +
                "# TYPE process_virtual_memory_bytes gauge\n" +
                "process_virtual_memory_bytes 1.6044032e+07\n" +
                "# HELP promhttp_metric_handler_requests_in_flight Current number of scrapes being served.\n" +
                "# TYPE promhttp_metric_handler_requests_in_flight gauge\n" +
                "promhttp_metric_handler_requests_in_flight 1\n" +
                "# HELP promhttp_metric_handler_requests_total Total number of scrapes by HTTP status code.\n" +
                "# TYPE promhttp_metric_handler_requests_total counter\n" +
                "promhttp_metric_handler_requests_total{code=\"200\"} 0\n" +
                "promhttp_metric_handler_requests_total{code=\"500\"} 0\n" +
                "promhttp_metric_handler_requests_total{code=\"503\"} 0";
        ExporterParser parser = new ExporterParser();
        Map<String, MetricFamily> metricFamilyMap = parser.textToMetric(resp);
        for (MetricFamily metricFamily : metricFamilyMap.values()) {
            System.out.println(metricFamily);
        }
    }
}
