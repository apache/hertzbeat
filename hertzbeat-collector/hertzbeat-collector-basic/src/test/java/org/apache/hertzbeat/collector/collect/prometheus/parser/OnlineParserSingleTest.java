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
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Parse a Single metric in prometheus test
 */
public class OnlineParserSingleTest {

    @Disabled // Disabled due to the fact that the URL is not reachable unless you have the Prometheus server running
    @Test
    void parseMetrics() throws Exception {
        URL url = new URL("http://localhost:9090/metrics");
        InputStream inputStream = url.openStream();
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "go_gc_duration_seconds");
        assertNotNull(metricFamilyMap);
    }

    @Disabled // because unless you have already saved the locally tested files
    @Test
    void parseTestFile() throws Exception {
        InputStream inputStream = this.getClass().getClassLoader().getResourceAsStream("test_file.txt");
        assertNotNull(inputStream, "Failed to load test_file.txt resource");
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "windows_textfile_scrape_error");
        assertNotNull(metricFamilyMap);
    }


    @Test
    void parseMetricsOutOfOrder() throws Exception {
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
        Map<String, MetricFamily> metricFamilyMap1 = parseMetrics(inputStream, "go_memstats_buck_hash_sys_bytes");
        assertNotNull(metricFamilyMap1);
        MetricFamily metricFamily = metricFamilyMap1.get("go_memstats_buck_hash_sys_bytes");
        assertNotNull(metricFamily);
        assertNotNull(metricFamily.getName());
        assertEquals("go_memstats_buck_hash_sys_bytes", metricFamily.getName());
        assertEquals(1, metricFamily.getMetricList().size());
        assertEquals(1457881.0, metricFamily.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithCrLf() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\r\n"
                + "jvm_gc_pause_seconds_count{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 1.0\r\n"
                + "jvm_gc_pause_seconds_sum{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 0.139\r\n";
        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\r\n"
                + "jvm_gc_pause_seconds_count{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 1.0 1234567890\r\n"
                + "jvm_gc_pause_seconds_sum{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 0.139 1234567890\r\n";
        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");
        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily.getName());
        assertEquals(0.139, metricFamily.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithLf() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "jvm_gc_pause_seconds_count{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 1.0\n"
                + "jvm_gc_pause_seconds_sum{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 0.139\n";
        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");
        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "jvm_gc_pause_seconds_count{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 1.0 1234567890\n"
                + "jvm_gc_pause_seconds_sum{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 0.139 1234567890\n";
        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");
        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily.getName());
        assertEquals(0.139, metricFamily.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithoutFinalNewline() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\r\n"
                + "jvm_gc_pause_seconds_count{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 1.0\r\n"
                + "jvm_gc_pause_seconds_sum{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 0.139";

        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "jvm_gc_pause_seconds_count{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 1.0\n"
                + "jvm_gc_pause_seconds_sum{action=\"end of major GC\",cause=\"Metadata GC Threshold\",} 0.139";

        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily.getName());
        assertEquals(0.139, metricFamily.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithEmptyLabelsAndCrLf() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\r\n"
                + "jvm_gc_pause_seconds_count 1.0\r\n"
                + "jvm_gc_pause_seconds_sum{} 0.139";

        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");
        assertNotNull(metricFamilyMap);
        MetricFamily metricFamily1 = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily1.getName());
        assertEquals(0.139, metricFamily1.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithEmptyLabelsAndLf() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "jvm_gc_pause_seconds_count 1.0\n"
                + "jvm_gc_pause_seconds_sum{} 0.139";

        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");
        assertNotNull(metricFamilyMap);

        MetricFamily metricFamily1 = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily1.getName());
        assertEquals(0.139, metricFamily1.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithMixedLineEndings() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "jvm_gc_pause_seconds_count 1.0\n"
                + "jvm_gc_pause_seconds_sum{} 0.139\r\n";

        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");
        assertNotNull(metricFamilyMap);

        MetricFamily metricFamily1 = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily1.getName());
        assertEquals(0.139, metricFamily1.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithLfCrLineEnding() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\n\r"
                + "# TYPE go_gc_duration_seconds summary\n\r"
                + "jvm_gc_pause_seconds_count 1.0\n\r"
                + "jvm_gc_pause_seconds_sum{} 0.139\n\r";

        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");
        assertNotNull(metricFamilyMap);

        MetricFamily metricFamily1 = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily1.getName());
        assertEquals(0.139, metricFamily1.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithMixedLineEndingsIncludingLfCr() throws Exception {
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "jvm_gc_pause_seconds_count 1.0\n\r"
                + "jvm_gc_pause_seconds_sum{} 0.139\r\n"
                + "jvm_gc_pause_seconds_max{} 0.139\n";

        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_count");
        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());
        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_count");
        assertEquals("jvm_gc_pause_seconds_count", metricFamily.getName());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");
        assertNotNull(metricFamilyMap);
        MetricFamily metricFamily1 = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily1.getName());
        assertEquals(0.139, metricFamily1.getMetricList().get(0).getValue());

        inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_max");
        assertNotNull(metricFamilyMap);
        MetricFamily metricFamily2 = metricFamilyMap.get("jvm_gc_pause_seconds_max");
        assertEquals("jvm_gc_pause_seconds_max", metricFamily2.getName());
        assertEquals(0.139, metricFamily2.getMetricList().get(0).getValue());
    }

    @Test
    void testParseMetricsWithOnlyLfCr() throws Exception {
        String str = "jvm_gc_pause_seconds_sum 42.0\n\r";
        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));
        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "jvm_gc_pause_seconds_sum");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("jvm_gc_pause_seconds_sum");
        assertEquals("jvm_gc_pause_seconds_sum", metricFamily.getName());
        assertEquals(42.0, metricFamily.getMetricList().get(0).getValue());
    }


    @Test
    void testParseMetricEscape1() throws Exception {
        // test  escape '\\'
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "windows_service_info{display_name=\"\\\\Application Layer \nGateway Service\",name=\"alg\\\\\",process_id=\"0\",run_as=\"NT AUTHORITY\\\\LocalService\"} 1\n";
        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));

        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "windows_service_info");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("windows_service_info");
        assertEquals("windows_service_info", metricFamily.getName());
        assertNotNull(metricFamily.getMetricList().get(0).getLabels());
        assertEquals(4, metricFamily.getMetricList().get(0).getLabels().size());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        assertEquals("display_name", metricFamily.getMetricList().get(0).getLabels().get(0).getName());
        assertEquals("\\Application Layer \nGateway Service", metricFamily.getMetricList().get(0).getLabels().get(0).getValue());

        assertEquals("name", metricFamily.getMetricList().get(0).getLabels().get(1).getName());
        assertEquals("alg\\", metricFamily.getMetricList().get(0).getLabels().get(1).getValue());

        assertEquals("process_id", metricFamily.getMetricList().get(0).getLabels().get(2).getName());
        assertEquals("0", metricFamily.getMetricList().get(0).getLabels().get(2).getValue());

        assertEquals("run_as", metricFamily.getMetricList().get(0).getLabels().get(3).getName());
        assertEquals("NT AUTHORITY\\LocalService", metricFamily.getMetricList().get(0).getLabels().get(3).getValue());
    }

    @Test
    void testParseMetricEscape2() throws Exception {
        // test  escape '\"'
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "windows_service_info{display_name=\"\\\"Application Layer \\\"Gateway Service\",name=\"alg\\\"\",process_id=\"0\",run_as=\"NT AUTHORITY\\\"LocalService\"} 1\n";
        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));

        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "windows_service_info");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("windows_service_info");
        assertEquals("windows_service_info", metricFamily.getName());
        assertNotNull(metricFamily.getMetricList().get(0).getLabels());
        assertEquals(4, metricFamily.getMetricList().get(0).getLabels().size());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        assertEquals("display_name", metricFamily.getMetricList().get(0).getLabels().get(0).getName());
        assertEquals("\"Application Layer \"Gateway Service", metricFamily.getMetricList().get(0).getLabels().get(0).getValue());

        assertEquals("name", metricFamily.getMetricList().get(0).getLabels().get(1).getName());
        assertEquals("alg\"", metricFamily.getMetricList().get(0).getLabels().get(1).getValue());

        assertEquals("process_id", metricFamily.getMetricList().get(0).getLabels().get(2).getName());
        assertEquals("0", metricFamily.getMetricList().get(0).getLabels().get(2).getValue());

        assertEquals("run_as", metricFamily.getMetricList().get(0).getLabels().get(3).getName());
        assertEquals("NT AUTHORITY\"LocalService", metricFamily.getMetricList().get(0).getLabels().get(3).getValue());


    }

    @Test
    void testParseMetricEscape3() throws Exception {
        // test  escape '\n'
        String str = "# HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.\r\n"
                + "# TYPE go_gc_duration_seconds summary\n"
                + "windows_service_info{display_name=\"\nApplication Layer \nGateway Service\",name=\"alg\n\",process_id=\"0\",run_as=\"NT AUTHORITY\nLocalService\"} 1\n";
        InputStream inputStream = new ByteArrayInputStream(str.getBytes(StandardCharsets.UTF_8));

        Map<String, MetricFamily> metricFamilyMap = parseMetrics(inputStream, "windows_service_info");

        assertNotNull(metricFamilyMap);
        assertEquals(1, metricFamilyMap.values().size());

        MetricFamily metricFamily = metricFamilyMap.get("windows_service_info");
        assertEquals("windows_service_info", metricFamily.getName());
        assertNotNull(metricFamily.getMetricList().get(0).getLabels());
        assertEquals(4, metricFamily.getMetricList().get(0).getLabels().size());
        assertEquals(1.0, metricFamily.getMetricList().get(0).getValue());

        assertEquals("display_name", metricFamily.getMetricList().get(0).getLabels().get(0).getName());
        assertEquals("\nApplication Layer \nGateway Service", metricFamily.getMetricList().get(0).getLabels().get(0).getValue());

        assertEquals("name", metricFamily.getMetricList().get(0).getLabels().get(1).getName());
        assertEquals("alg\n", metricFamily.getMetricList().get(0).getLabels().get(1).getValue());

        assertEquals("process_id", metricFamily.getMetricList().get(0).getLabels().get(2).getName());
        assertEquals("0", metricFamily.getMetricList().get(0).getLabels().get(2).getValue());

        assertEquals("run_as", metricFamily.getMetricList().get(0).getLabels().get(3).getName());
        assertEquals("NT AUTHORITY\nLocalService", metricFamily.getMetricList().get(0).getLabels().get(3).getValue());
    }

    private Map<String, MetricFamily> parseMetrics(InputStream inputStream, String metric) throws IOException {
        return OnlineParser.parseMetrics(inputStream, metric);
    }
}