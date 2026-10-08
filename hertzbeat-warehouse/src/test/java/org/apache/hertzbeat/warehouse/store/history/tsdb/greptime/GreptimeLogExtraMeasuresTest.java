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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.junit.jupiter.api.Test;

class GreptimeLogExtraMeasuresTest {
    @Test
    void extraMeasuresAreAnExplicitImmutableContract() throws Exception {
        assertEquals(List.class, LogAnalysis.Request.class.getMethod("additionalMeasures").getReturnType());
        assertEquals(List.class, LogAnalysis.Group.class.getMethod("additionalMeasurements").getReturnType());
    }

    @Test
    void descriptorsAreBoundedDistinctImmutableAndOldJsonIsUnchanged() throws Exception {
        var avg = new LogAnalysis.Measure("avg", "attribute:x");
        var source = new ArrayList<>(List.of(avg));
        var request = request(source);
        source.clear();
        assertEquals(List.of(avg), request.additionalMeasures());
        var mapper = new ObjectMapper();
        assertTrue(mapper.readTree(mapper.writeValueAsString(request)).has("additionalMeasures"));
        assertTrue(!mapper.readTree(mapper.writeValueAsString(new LogAnalysis.Request(null, "groups", 1, "count-desc", 1)))
                .has("additionalMeasures"));
        for (var invalid : List.of(List.<LogAnalysis.Measure>of(), List.of(avg, avg), List.of(avg, avg, avg, avg))) {
            assertThrows(IllegalArgumentException.class, () -> request(invalid));
        }
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Request(null, "timeseries", 1, "count-desc", 1,
                null, null, null, List.of(avg)));
        assertThrows(IllegalArgumentException.class, () -> new LogAnalysis.Request(null, "groups", 1, "measure-desc", 1,
                avg, null, null, List.of(avg)));
    }

    @Test
    void cellsRequireAlignedMetadataAndFunctionStatesEvenWhenPrimaryAbsent() {
        var avg = new LogAnalysis.Measure("avg", "attribute:x");
        var unique = new LogAnalysis.Measure("unique", "attribute:x");
        var values = List.of(new LogAnalysis.Measurement("no_samples", 0, null), new LogAnalysis.Measurement("ready", 0, 0.0));
        var a = new LogComparison.Cell(1, null, values);
        var b = new LogComparison.Cell(0, null, values);
        var group = new LogComparison.Group(List.of(), a, b, List.of());
        var window = new LogFacets.Window(1, 999);
        new LogComparison.Result(window, request(List.of(avg, unique)), 1, 0, false, null, List.of(group), "a/b");
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(window, request(List.of(unique, avg)),
                1, 0, false, null, List.of(group), null));
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(window, request(List.of(avg)),
                1, 0, false, null, List.of(group), null));
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Cell(0, null,
                List.of(new LogAnalysis.Measurement("ready", 1, 2.0))));
        var empty = new LogAnalysis.Result(window, null, "groups", 1, "count-desc", 1, 0, false, null, List.of(),
                null, null, List.of(avg));
        assertEquals(List.of(avg), empty.additionalMeasures());
    }

    @Test
    void mapperRejectsOmittedColumnsAndPreservesMissingVersusIndeterminate() {
        var measures = List.of(new LogAnalysis.Measure("avg", "attribute:x"), new LogAnalysis.Measure("unique", "attribute:x"));
        var row = new HashMap<String, Object>();
        assertThrows(IllegalArgumentException.class, () -> GreptimeLogAdditionalMeasurements.read(row, "b_", measures));
        row.put("b_extra0_samples", 0L);
        row.put("b_extra0_measurement", null);
        row.put("b_extra1_samples", 0L);
        row.put("b_extra1_measurement", 0.0);
        assertEquals(List.of(new LogAnalysis.Measurement("no_samples", 0, null), new LogAnalysis.Measurement("ready", 0, 0.0)),
                GreptimeLogAdditionalMeasurements.read(row, "b_", measures));
        row.put("b_extra0_samples", 2L);
        assertEquals("non_finite", GreptimeLogAdditionalMeasurements.read(row, "b_", measures).getFirst().state());
    }

    private static LogAnalysis.Request request(List<LogAnalysis.Measure> extras) {
        return new LogAnalysis.Request(null, "groups", 1, "count-desc", 1, null, null, null, extras);
    }
}
