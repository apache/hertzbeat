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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.junit.jupiter.api.Test;

class GreptimeLogRollupTest {
    @Test
    void subminuteNativeSqlAndResultIntervalsAreAcceptedWithoutChangingAuto() {
        assertEquals(List.of(60000L, 300000L, 900000L, 1800000L, 3600000L, 21600000L, 86400000L),
                LogTrend.SUPPORTED_INTERVALS_MS);
        var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1);
        for (long interval : List.of(1000L, 5000L, 10000L, 30000L)) {
            String sql = GreptimeLogAnalysis.sql(request, interval, " WHERE workspace='bound'", "logs");
            assertTrue(sql.contains("date_bin('" + interval / 1000 + " seconds'"));
            assertEquals(interval, new LogTrend(1, 999, interval, List.of()).intervalMs());
        }
    }

    @Test
    void explicitIntervalIsOptionalStrictAndEchoed() throws Exception {
        var mapper = new ObjectMapper();
        var legacy = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1);
        assertTrue(!mapper.readTree(mapper.writeValueAsString(legacy)).has("intervalMs"));
        for (long interval : LogTrend.EXPLICIT_INTERVALS_MS) {
            var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1, null, null, interval);
            assertEquals(interval, mapper.readTree(mapper.writeValueAsString(request)).get("intervalMs").asLong());
            assertTrue(GreptimeLogComparison.sql(request, interval, " WHERE true", " WHERE true", "logs")
                    .contains("date_bin('" + interval / 1000 + " seconds'"));
            assertThrows(IllegalArgumentException.class, () -> GreptimeLogAnalysis.sql(request, interval + 1, "", "logs"));
            assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Request(null, "groups", 20,
                    "count-desc", 1, null, null, interval));
        }
        for (long interval : List.of(0L, -1L, 1001L, 2000L)) {
            assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Request(null, "timeseries", 20,
                    "count-desc", 1, null, null, interval));
        }
        var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1, null, null, 1000L);
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(new LogFacets.Window(1, 999),
                request, 0, 0, false, 5000L, List.of(), null));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Result(new LogFacets.Window(1, 60000),
                null, "timeseries", 20, "count-desc", 1, 0, false, 1000L, List.of()));
    }

    @Test
    void completeGridRejectsSixtyOneEvenWithoutObservedBuckets() {
        assertThrows(IllegalArgumentException.class, () -> new LogTrend(1, 3600000, 60000, List.of()));
    }
}
