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

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.Map;

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
            String str = """
                    # HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.
                    # TYPE go_gc_duration_seconds summary
                    go_gc_duration_seconds {  quantile="0"} 2.0209e-05 321312
                    go_gc_duration_seconds{  quantile = "0.25"  }   6.6917e-05
                    go_gc_duration_seconds{quantile="0.5"} -Inf
                    go_gc_duration_seconds{ quantile = "0.75"} +Inf
                    go_gc_duration_seconds{quantile="1"} NaN
                    go_gc_duration_seconds_sum 0.001134793 321314
                    go_gc_duration_seconds_count 5 43
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
            InputStream inputStream = new ByteArrayInputStream(str.getBytes());
            Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(inputStream);
            System.out.println(1);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}