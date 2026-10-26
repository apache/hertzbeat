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

package org.apache.hertzbeat.ai.gateway.tool.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisGroupingParser;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisMeasureParser;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.support.ToolDefinitions;

class AgentLogAnalysisContractTest {
    @Test
    void schemaExamplesUseTheSameStructuredControlsAsTheProductParsers() throws Exception {
        var method = AgentLogToolService.class.getMethod("analysis", AgentLogQuery.class);
        var schema = JsonUtil.fromJson(AgentLogToolInputSchema.enrich("logs.analysis",
                ToolDefinitions.from(method).inputSchema())).path("properties").path("q").path("properties");
        assertEquals("builtin:serviceName", schema.path("field").path("examples").get(0).asText());
        var grouping = LogAnalysisGroupingParser.parse(schema.path("grouping").path("examples").get(0).asText());
        assertEquals("builtin:serviceName", grouping.dimensions().getFirst().field());
        assertEquals(5, grouping.limit());
        assertNull(LogAnalysisMeasureParser.parse(schema.path("measure").path("examples").get(0).asText()));
        assertTrue(schema.path("view").path("enum").toString().contains("groups"));
        assertTrue(schema.path("order").path("enum").toString().contains("count-desc"));
    }

    @Test
    void actualPlainGroupingFailureIsRejectedWithRepairableGuidanceBeforeNativeQuery() {
        var query = query(Map.of("start", 1792250622000L, "end", 1792251522006L,
                "grouping", "serviceName", "measure", "count", "order", "desc", "limit", 5));
        var failure = assertThrows(IllegalArgumentException.class, () -> query.validateOperation("analysis"));
        assertTrue(failure.getMessage().contains("JSON"));
        assertTrue(failure.getMessage().contains("field"));
    }

    @Test
    void validSingleFieldCountsAndStructuredGroupingRemainSupported() {
        query(Map.of("start", 1000, "end", 2000, "field", "builtin:serviceName", "limit", 5,
                "minCount", 2, "order", "count-desc")).validateOperation("analysis");
        query(Map.of("start", 1000, "end", 2000,
                "grouping", "{\"version\":1,\"dimensions\":[{\"field\":\"builtin:serviceName\",\"limit\":5}]}"))
                .validateOperation("analysis");
    }

    @Test
    void conflictingGroupingAndLimitAreNotSilentlyReinterpreted() {
        var query = query(Map.of("start", 1000, "end", 2000, "limit", 5,
                "grouping", "{\"version\":1,\"dimensions\":[{\"field\":\"builtin:serviceName\",\"limit\":5}]}"));
        assertThrows(IllegalArgumentException.class, () -> query.validateOperation("analysis"));
    }

    private AgentLogQuery query(Map<String, Object> values) {
        return JsonUtil.fromJson(JsonUtil.toJson(values), AgentLogQuery.class);
    }
}
