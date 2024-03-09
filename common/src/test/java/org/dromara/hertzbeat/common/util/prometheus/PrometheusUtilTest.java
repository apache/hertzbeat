package org.dromara.hertzbeat.common.util.prometheus;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;

class PrometheusUtilTest {

    @Test
    void parseMetric() throws IOException {
        String str = """
                # HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.
                # TYPE go_gc_duration_seconds summary
                go_gc_duration_seconds{quantile="0"} 3.5916e-05 32131
                go_gc_duration_seconds{quantile="0.25"} 0.000106208 432132
                go_gc_duration_seconds{quantile="0.5"} 0.000189209
                go_gc_duration_seconds{quantile="0.75"} 0.000214917
                go_gc_duration_seconds{quantile="1"} 0.002560458
                go_gc_duration_seconds_sum 0.008980749
                go_gc_duration_seconds_count 39
                # HELP go_goroutines Number of goroutines that currently exist.
                # TYPE go_goroutines gauge
                go_goroutines 32 321321
                # HELP go_info Information about the Go environment.
                # TYPE go_info gauge""";
//        String str = "go_gc_duration_seconds_sum 0.008980749";
        var a = PrometheusUtil.parseMetrics(new ByteArrayInputStream(str.getBytes()));
        System.out.println(a);
    }
}