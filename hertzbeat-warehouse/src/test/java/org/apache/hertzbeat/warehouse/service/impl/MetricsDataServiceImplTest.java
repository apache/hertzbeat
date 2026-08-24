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

package org.apache.hertzbeat.warehouse.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link MetricsDataServiceImpl}.
 *
 * <p>The history query inputs arrive from rest path variables and a query parameter and are
 * interpolated into native queries by every time series storage: the range lands unquoted
 * in the time predicate, while the app, metrics group, metric and instance land as table
 * and column identifiers or as promql label values. The only storage that parses the range
 * instead of interpolating it is questdb, and the default duckdb storage uses prepared
 * statements, so validating here is what covers tdengine, influxdb, iotdb and victoria
 * metrics at once.
 */
@ExtendWith(MockitoExtension.class)
class MetricsDataServiceImplTest {

    @Mock
    private RealTimeDataReader realTimeDataReader;

    @Mock
    private HistoryDataReader historyDataReader;

    private MetricsDataServiceImpl metricsDataService;

    @BeforeEach
    void setUp() {
        metricsDataService = new MetricsDataServiceImpl(realTimeDataReader, Optional.of(historyDataReader));
    }

    @Test
    void testHistoryRangeBreakingOutOfTheTimePredicateIsRejected() {
        // reproduces the reported payload: the range closes `ts >= now - ?` and continues the statement
        assertRejected("1s union all select ts, metric_labels, `usage` from `other_table` where ts>=now-1w");
        assertRejected("1h; drop table cpu");
        assertRejected("1h' or '1'='1");
        assertRejected("1h)--");
    }

    @Test
    void testMalformedHistoryRangeIsRejected() {
        assertRejected("");
        assertRejected("6");
        assertRejected("hh");
        assertRejected("-1h");
        assertRejected("1 h");
    }

    @Test
    void testRangesTheUiSendsAreAccepted() {
        // the periods behind the chart buttons, plus the default applied when none is given
        for (String range : List.of("1h", "6h", "1D", "1W", "4W", "12W")) {
            when(historyDataReader.getHistoryMetricData("127.0.0.1", "linux", "cpu", "usage", range))
                    .thenReturn(Map.of("", List.of(new Value("1", 1L))));

            MetricsHistoryData data = metricsDataService.getMetricHistoryData(
                    "127.0.0.1", "linux", "cpu", "usage", range, false);

            assertEquals("cpu", data.getMetrics());
        }
    }

    @Test
    void testMissingRangeFallsBackToTheDefault() {
        when(historyDataReader.getHistoryMetricData("127.0.0.1", "linux", "cpu", "usage", "6h"))
                .thenReturn(Map.of("", List.of(new Value("1", 1L))));

        metricsDataService.getMetricHistoryData("127.0.0.1", "linux", "cpu", "usage", null, false);

        verify(historyDataReader).getHistoryMetricData("127.0.0.1", "linux", "cpu", "usage", "6h");
    }

    @Test
    void testIdentifierEscapingTheQuotingIsRejected() {
        // a backtick closes a tdengine identifier, a double quote closes a questdb one
        assertThrows(IllegalArgumentException.class, () -> metricsDataService.getMetricHistoryData(
                "127.0.0.1", "linux`,(select 1) `x", "cpu", "usage", "6h", false));
        assertThrows(IllegalArgumentException.class, () -> metricsDataService.getMetricHistoryData(
                "127.0.0.1", "linux", "cpu\" or \"1\"=\"1", "usage", "6h", false));
        assertThrows(IllegalArgumentException.class, () -> metricsDataService.getMetricHistoryData(
                "127.0.0.1", "linux", "cpu", "usage`", "6h", false));
        // the instance lands inside a promql label selector in victoria metrics
        assertThrows(IllegalArgumentException.class, () -> metricsDataService.getMetricHistoryData(
                "127.0.0.1\",__name__=~\".*", "linux", "cpu", "usage", "6h", false));

        verify(historyDataReader, never()).getHistoryMetricData(anyString(), anyString(), anyString(),
                anyString(), anyString());
    }

    @Test
    void testNamesUsedByTheShippedTemplatesAreAccepted() {
        // dashes appear in template field names, an instance is usually an address
        when(historyDataReader.getHistoryMetricData("[::1]:8080", "hugegraph", "cache", "edge-hugegraph-hits", "6h"))
                .thenReturn(Map.of("", List.of(new Value("1", 1L))));

        MetricsHistoryData data = metricsDataService.getMetricHistoryData(
                "[::1]:8080", "hugegraph", "cache", "edge-hugegraph-hits", "6h", false);

        assertEquals("cache", data.getMetrics());
    }

    @Test
    void testIntervalQueriesAreValidatedTheSameWay() {
        assertThrows(IllegalArgumentException.class, () -> metricsDataService.getMetricHistoryData(
                "127.0.0.1", "linux", "cpu", "usage", "1h; drop table cpu", true));

        verify(historyDataReader, never()).getHistoryIntervalMetricData(anyString(), anyString(), anyString(),
                anyString(), anyString());
    }

    private void assertRejected(String history) {
        assertThrows(IllegalArgumentException.class, () -> metricsDataService.getMetricHistoryData(
                "127.0.0.1", "linux", "cpu", "usage", history, false), "expected rejection of: " + history);
    }
}
