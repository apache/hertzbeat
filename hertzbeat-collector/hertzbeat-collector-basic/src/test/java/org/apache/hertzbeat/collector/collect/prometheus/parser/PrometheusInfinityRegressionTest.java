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

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PrometheusInfinityRegressionTest {

    static Stream<Arguments> samples() {
        return Stream.of(Arguments.of("+Inf", Double.POSITIVE_INFINITY),
                Arguments.of("-Inf", Double.NEGATIVE_INFINITY), Arguments.of("NaN", Double.NaN),
                Arguments.of("17.5", 17.5), Arguments.of("-3.25", -3.25), Arguments.of("0", 0.0));
    }

    @ParameterizedTest
    @MethodSource("samples")
    void preservesSampleValuesInBothProductionParsers(String sample, double expected) throws Exception {
        String payload = """
                # TYPE regression_gauge gauge
                regression_gauge{source="fixture"} %s
                # TYPE regression_duration histogram
                regression_duration_bucket{le="0.5"} 2
                regression_duration_bucket{le="+Inf"} %s
                regression_duration_sum 1.25
                regression_duration_count 3
                """.formatted(sample, sample);
        Map<String, MetricFamily> online = OnlineParser.parseMetrics(
                new ByteArrayInputStream(payload.getBytes(StandardCharsets.UTF_8)));
        Map<String, MetricFamily> text = TextParser.textToMetricFamilies(payload);

        assertAll(() -> assertSamples(online, expected), () -> assertSamples(text, expected));
    }

    private void assertSamples(Map<String, MetricFamily> families, double expected) {
        assertEquals(4, families.size());
        assertEquals(expected, families.get("regression_gauge").getMetricList().getFirst().getValue());
        var buckets = families.get("regression_duration_bucket").getMetricList();
        assertEquals(2, buckets.size());
        assertEquals(2.0, buckets.getFirst().getValue());
        assertEquals(expected, buckets.getLast().getValue());
        assertEquals("+Inf", buckets.getLast().getLabels().stream()
                .filter(label -> label.getName().equals("le")).findFirst().orElseThrow().getValue());
        assertEquals(1.25, families.get("regression_duration_sum").getMetricList().getFirst().getValue());
        assertEquals(3.0, families.get("regression_duration_count").getMetricList().getFirst().getValue());
    }
}
