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

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.fail;

class OnlineParserTest {

    @Disabled // Disabled due to the fact that the URL is not reachable unless you have the Prometheus server running
    @Test
    void parseMetrics() throws Exception {
        URL url = new URL("http://localhost:9090/metrics");
        InputStream inputStream = url.openStream();
        Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(inputStream);
        assertNotNull(metricFamilyMap);
    }

    @Test
    void parseMetrics2() throws Exception {
        String str = """
                # HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.
                # TYPE go_gc_duration_seconds summary
                jvm_gc_pause_seconds_count{action="end of major GC",cause="Metadata GC Threshold",} 1.0
                jvm_gc_pause_seconds_sum{action="end of major GC",cause="Metadata GC Threshold",} 0.139
                jvm_gc_pause_seconds_count{action="end of minor GC",cause="Metadata GC Threshold",} 1.0
                jvm_gc_pause_seconds_sum{action="end of minor GC",cause="Metadata GC Threshold",} 0.02
                jvm_gc_pause_seconds_count{action="end of minor GC",cause="Allocation Failure",} 5.0
                jvm_gc_pause_seconds_sum{action="end of minor GC",cause="Allocation Failure",} 0.082
                go_gc_duration_seconds{quantile="0"} 2.0209e-05
                go_gc_duration_seconds{quantile="0"} 2.0209e-05
                go_gc_duration_seconds{quantile="0.25"} 6.6917e-05
                go_gc_duration_seconds{quantile="0.5"} -Inf
                go_gc_duration_seconds{quantile="0.75"} +Inf
                go_gc_duration_seconds{quantile="1"} NaN
                go_gc_duration_seconds_sum 0.001134793
                go_gc_duration_seconds_count 5
                # HELP go_goroutines Number of goroutines that currently exist.
                # TYPE go_goroutines gauge
                go_goroutines 32
                # HELP go_info Information about the Go environment.
                # TYPE go_info gauge
                go_info{version="go1.21.6"} 1
                # HELP go_memstats_alloc_bytes Number of bytes allocated and still in use.
                # TYPE go_memstats_alloc_bytes gauge
                go_memstats_alloc_bytes 1.5716224e+07
                # HELP go_memstats_alloc_bytes_total Total number of bytes allocated, even if freed.
                # TYPE go_memstats_alloc_bytes_total counter
                go_memstats_alloc_bytes_total 2.0707544e+07
                # HELP go_memstats_buck_hash_sys_bytes Number of bytes used by the profiling bucket hash table.
                # TYPE go_memstats_buck_hash_sys_bytes gauge
                go_memstats_buck_hash_sys_bytes 1.457881e+06
                # HELP go_memstats_frees_total Total number of frees.
                # TYPE go_memstats_frees_total counter
                go_memstats_frees_total 50438
                # HELP go_memstats_gc_sys_bytes Number of bytes used for garbage collection system metadata.
                # TYPE go_memstats_gc_sys_bytes gauge
                go_memstats_gc_sys_bytes 4.614808e+06""";
        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap1 = OnlineParser.parseMetrics(inputStream);
        Map<String, MetricFamily> metricFamilyMap2 = TextParser.textToMetricFamilies(str);
        assertNotNull(metricFamilyMap1);
        assertNotNull(metricFamilyMap2);
        assertEquals(metricFamilyMap1.size(), metricFamilyMap2.size());
        metricFamilyMap2.forEach((metricFamilyName, metricFamily2) -> {
            if (!metricFamilyMap1.containsKey(metricFamilyName)) {
                fail("parse failed, different result from two parser.");
            }
            MetricFamily metricFamily1 = metricFamilyMap1.get(metricFamilyName);
            Set<Double> metricValueSet = metricFamily2.getMetricList().stream().map(MetricFamily.Metric::getValue).collect(Collectors.toSet());
            metricFamily1.getMetricList().forEach(metric -> {
                // this is for something different between two algorithms above, and both of them is current on this parsing behavior.
                if (!(metric.getValue() == Double.POSITIVE_INFINITY || metric.getValue() == Double.NEGATIVE_INFINITY)) {
                    if (!metricValueSet.contains(metric.getValue())) {
                        fail();
                    }
                }
            });
        });
    }
}
