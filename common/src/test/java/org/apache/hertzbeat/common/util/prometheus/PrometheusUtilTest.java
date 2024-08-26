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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * test case for {@link PrometheusUtil}
 */

class PrometheusUtilTest {

    @Test
    void testParseMetricsNormalInput() throws IOException {

        String input = "metric_name{label1=\"value1\",label2=\"value2\"} 123.45 67890\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(1, metrics.size());

        Metric metric = metrics.get(0);
        assertEquals("metric_name", metric.getMetricName());
        assertEquals(123.45, metric.getValue());
        assertEquals(67890, metric.getTimestamp());

        List<Label> labels = metric.getLabelList();
        assertEquals(2, labels.size());
        assertEquals("label1", labels.get(0).getName());
        assertEquals("value1", labels.get(0).getValue());
        assertEquals("label2", labels.get(1).getName());
        assertEquals("value2", labels.get(1).getValue());
    }

    @Test
    void testParseMetricsComments() throws IOException {

        String input = "# This is a comment\nmetric_name{label1=\"value1\"} 123.45 67890\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(1, metrics.size());

        Metric metric = metrics.get(0);
        assertEquals("metric_name", metric.getMetricName());
        assertEquals(123.45, metric.getValue());
        assertEquals(67890, metric.getTimestamp());

        List<Label> labels = metric.getLabelList();
        assertEquals(1, labels.size());
        assertEquals("label1", labels.get(0).getName());
        assertEquals("value1", labels.get(0).getValue());
    }

    @Test
    void testParseMetricsMalformedInput() throws IOException {

        String input = "metric_name{label1=value1} 123.45 67890\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());
        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNull(metrics);
    }

    @Test
    void testParseMetricsNanValue() throws IOException {

        String input = "metric_name{label1=\"value1\"} NaN 67890\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(1, metrics.size());

        Metric metric = metrics.get(0);
        assertEquals("metric_name", metric.getMetricName());
        assertTrue(Double.isNaN(metric.getValue()));
        assertEquals(67890, metric.getTimestamp());
    }

    @Test
    void testParseMetricsPositiveInfinity() throws IOException {

        String input = "metric_name{label1=\"value1\"} +Inf 67890\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(1, metrics.size());

        Metric metric = metrics.get(0);
        assertEquals("metric_name", metric.getMetricName());
        assertEquals(Double.POSITIVE_INFINITY, metric.getValue());
        assertEquals(67890, metric.getTimestamp());
    }

    @Test
    void testParseMetricsNegativeInfinity() throws IOException {

        String input = "metric_name{label1=\"value1\"} -Inf 67890\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(1, metrics.size());

        Metric metric = metrics.get(0);
        assertEquals("metric_name", metric.getMetricName());
        assertEquals(Double.NEGATIVE_INFINITY, metric.getValue());
        assertEquals(67890, metric.getTimestamp());
    }

    @Test
    void testParseMetricsWithoutLabels() throws IOException {

        String input = "metric_name 123.45 67890\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(1, metrics.size());

        Metric metric = metrics.get(0);
        assertEquals("metric_name", metric.getMetricName());
        assertEquals(123.45, metric.getValue());
        assertEquals(67890, metric.getTimestamp());
        assertNull(metric.getLabelList());
    }

    @Test
    void testParseMetricsWithoutTimestamp() throws IOException {

        String input = "metric_name{label1=\"value1\"} 123.45\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(1, metrics.size());

        Metric metric = metrics.get(0);
        assertEquals("metric_name", metric.getMetricName());
        assertEquals(123.45, metric.getValue());
        assertEquals(null, metric.getTimestamp()); // Assuming 0 for no timestamp

        List<Label> labels = metric.getLabelList();
        assertEquals(1, labels.size());
        assertEquals("label1", labels.get(0).getName());
        assertEquals("value1", labels.get(0).getValue());
    }

    @Test
    void testParseMultipleMetrics() throws IOException {

        String input = "metric_name1{label1=\"value1\"} 123.45 67890\nmetric_name2 678.90 12345\n";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertEquals(2, metrics.size());

        Metric metric1 = metrics.get(0);
        assertEquals("metric_name1", metric1.getMetricName());
        assertEquals(123.45, metric1.getValue());
        assertEquals(67890, metric1.getTimestamp());

        List<Label> labels1 = metric1.getLabelList();
        assertEquals(1, labels1.size());
        assertEquals("label1", labels1.get(0).getName());
        assertEquals("value1", labels1.get(0).getValue());

        Metric metric2 = metrics.get(1);
        assertEquals("metric_name2", metric2.getMetricName());
        assertEquals(678.90, metric2.getValue());
        assertEquals(12345, metric2.getTimestamp());
        assertNull(metric2.getLabelList());
    }

    @Test
    void testParseEmptyInput() throws IOException {

        String input = "";
        InputStream inputStream = new ByteArrayInputStream(input.getBytes());

        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);

        assertNotNull(metrics);
        assertTrue(metrics.isEmpty());
    }

}
