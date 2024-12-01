package org.apache.hertzbeat.collector.collect.prometheus.parser;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class OnlineParserTest {

    @Test
    void parseMetrics() {
        try {
            URL url = new URL("http://localhost:9090/metrics");
            InputStream inputStream = url.openStream();
            Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(inputStream);
            System.out.println(1);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Test
    void parseMetrics2() {
        try {
            String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n" +
                    "# TYPE go_gc_duration_seconds summary\n" +
                    "go_gc_duration_seconds {  quantile=\"0\"} 2.0209e-05 321312\n" +
                    "go_gc_duration_seconds{  quantile = \"0.25\"  }   6.6917e-05\n" +
                    "go_gc_duration_seconds{quantile=\"0.5\"} -Inf\n" +
                    "go_gc_duration_seconds{ quantile = \"0.75\"} +Inf\n" +
                    "go_gc_duration_seconds{quantile=\"1\"} NaN\n" +
                    "go_gc_duration_seconds_sum 0.001134793 321314\n" +
                    "go_gc_duration_seconds_count 5 43\n" +
                    "# HELP go_goroutines Number of goroutines that currently exist.\n" +
                    "# TYPE go_goroutines gauge\n" +
                    "go_goroutines 32\n" +
                    "# HELP go_info Information about the Go environment.\n" +
                    "# TYPE go_info gauge\n" +
                    "go_info{version=\"go1.21.6\"} 1\n" +
                    "# HELP go_memstats_alloc_bytes Number of bytes allocated and still in use.\n" +
                    "# TYPE go_memstats_alloc_bytes gauge\n" +
                    "go_memstats_alloc_bytes 1.5716224e+07\n" +
                    "# HELP go_memstats_alloc_bytes_total Total number of bytes allocated, even if freed.\n" +
                    "# TYPE go_memstats_alloc_bytes_total counter\n" +
                    "go_memstats_alloc_bytes_total 2.0707544e+07\n" +
                    "# HELP go_memstats_buck_hash_sys_bytes Number of bytes used by the profiling bucket hash table.\n" +
                    "# TYPE go_memstats_buck_hash_sys_bytes gauge\n" +
                    "go_memstats_buck_hash_sys_bytes 1.457881e+06\n" +
                    "# HELP go_memstats_frees_total Total number of frees.\n" +
                    "# TYPE go_memstats_frees_total counter\n" +
                    "go_memstats_frees_total 50438\n" +
                    "# HELP go_memstats_gc_sys_bytes Number of bytes used for garbage collection system metadata.\n" +
                    "# TYPE go_memstats_gc_sys_bytes gauge\n" +
                    "go_memstats_gc_sys_bytes 4.614808e+06";
            InputStream inputStream = new ByteArrayInputStream(str.getBytes());
            Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(inputStream);
            System.out.println(1);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}