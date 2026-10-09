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

package org.apache.hertzbeat.common.observability.dto.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class LogAnalysisTransformTest {
    @Test
    void sumIsAnExistingTypedMeasureAndOldCountJsonStaysUnchanged() {
        assertEquals("sum", new LogAnalysis.Measure("sum", "attribute:bytes").function());
        var old = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
        assertFalse(JsonUtil.toJson(old).contains("transform"));
    }

    @Test
    void rejectsUnsupportedTransformsAndRetainsEmptyResultMetadata() {
        for (String value : java.util.List.of("", "rate", "THROUGHPUT")) {
            org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                    () -> new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1, null, null, null, null, value));
        }
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> new LogAnalysis.Request(null, "groups", 20, "count-desc", 1, null, null, null, null, "throughput"));
        var result = new LogAnalysis.Result(new LogFacets.Window(1000, 1001), null, "timeseries", 20, "count-desc", 1,
                0, false, 1000L, java.util.List.of(), null, null, null, "throughput");
        assertEquals("throughput", result.transform());
        assertEquals(0, result.matchingTotal());
        assertTrue(JsonUtil.toJson(result).contains("\"transform\":\"throughput\""));
    }

    @Test
    void roundtripsOptionalTransformWithoutChangingRawMeasurements() {
        var request = JsonUtil.fromJson("""
                {"view":"timeseries","limit":20,"order":"count-desc","minCount":1,"transform":"throughput"}
                """, LogAnalysis.Request.class);
        assertTrue(JsonUtil.toJson(request).contains("\"transform\":\"throughput\""));
    }
}
