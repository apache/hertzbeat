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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

class AgentQueryCoverageProjectorTest {
    private final AgentQueryCoverageProjector projector = new AgentQueryCoverageProjector();

    @Test
    void actualTenOfEightyFivePageRetainsOffsetTotalWindowAndScopeLimit() {
        String content = java.util.stream.IntStream.range(0, 10).mapToObj(i -> "{}").collect(java.util.stream.Collectors.joining(","));
        var call = call("traces.query", "{\"content\":[" + content + "],\"pageIndex\":0,\"pageSize\":10,"
                + "\"totalElements\":85,\"start\":1000,\"end\":2000,\"partial\":true}");
        var coverage = projector.project(call);
        assertEquals(10L, coverage.returned());
        assertEquals(85L, coverage.total());
        assertEquals(0L, coverage.offset());
        assertEquals(1000L, coverage.start());
        assertEquals("PARTIAL_PAGE", coverage.state());
        assertTrue(coverage.partial());
    }

    @Test
    void successfulEmptyMetricsIsDistinctFromUnknownOrFailedContext() {
        var empty = projector.project(call("metrics.history", "{\"returnedPoints\":0,\"totalPoints\":0}"));
        assertEquals("EMPTY_RESULT", empty.state());
        assertEquals(0L, empty.returned());
        assertEquals(0L, empty.total());
        assertFalse(empty.partial());
        var invalid = call("logs.group_by_stats", "observability_query_context_invalid");
        invalid.setStatus("FAILED");
        assertNull(projector.project(invalid));
        var unknown = projector.project(call("metrics.history", "{}"));
        assertEquals("UNKNOWN", unknown.state());
        assertNull(unknown.returned());
        assertNull(unknown.total());
    }

    @Test
    void logProjectionDoesNotExposeSearchBodyOrInventGlobalTotal() {
        var call = call("logs.group_by_stats", "{\"format\":\"json_text\",\"partial\":false,"
                + "\"data\":\"{\\\"code\\\":0,\\\"data\\\":{\\\"groupBy\\\":\\\"severity\\\",\\\"groups\\\":[]}}\"}");
        call.setInputJson("{\"q\":{\"start\":1000,\"end\":2000,\"groupBy\":\"severity\",\"search\":\"private body\"}}");
        var result = projector.project(call);
        assertEquals("EMPTY_RESULT", result.state());
        assertEquals(0L, result.returned());
        assertNull(result.total());
        assertEquals("true", result.scope().get("additionalFiltersPresent"));
        assertFalse(result.toString().contains("private body"));
    }

    @Test
    void envelopeTruncationAndNonreadyStateNeverBecomeHealthyEmptyWindows() {
        var unavailable = projector.project(call("logs.repeated_errors.summary", "{\"state\":\"unavailable\",\"groups\":[]}"));
        assertEquals("UNKNOWN", unavailable.state());
        assertNull(unavailable.returned());
        var truncated = projector.project(call("metrics.history", "{\"truncated\":true,\"returnedPoints\":0,\"totalPoints\":0}"));
        assertEquals("PARTIAL_PAGE", truncated.state());
        assertTrue(truncated.truncated());
    }

    private AgentToolCall call(String name, String output) {
        return AgentToolCall.builder().toolCallId("query").toolName(name).risk("READ").status("SUCCEEDED")
                .inputJson("{\"start\":1000,\"end\":2000}").resultOutput(output).build();
    }
}
