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

package org.apache.hertzbeat.ai.gateway.tool.metrics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.support.ToolDefinitions;

class AgentMetricsHistoryInputSchemaTest {
    @Test
    void generatedSchemaRequiresDisjointCompleteModes() {
        var method = Arrays.stream(AgentMetricsToolService.class.getDeclaredMethods())
                .filter(candidate -> candidate.isAnnotationPresent(Tool.class)
                        && "metrics.history".equals(candidate.getAnnotation(Tool.class).name()))
                .findFirst().orElseThrow();
        var schema = JsonUtil.fromJson(AgentMetricsHistoryInputSchema.enrich(ToolDefinitions.from(method).inputSchema()));
        assertEquals(2, schema.path("oneOf").size());
        assertEquals("[\"monitorId\",\"metricKey\",\"start\",\"end\"]",
                schema.path("oneOf").get(0).path("required").toString());
        assertEquals("[\"instance\",\"app\",\"metrics\",\"fieldParameter\"]",
                schema.path("oneOf").get(1).path("required").toString());
        assertEquals("null", schema.path("oneOf").get(0).path("properties").path("history").path("type").asText());
        assertEquals("null", schema.path("oneOf").get(1).path("properties").path("monitorId").path("type").asText());
        assertTrue(schema.path("properties").has("maxPoints"));
    }
}
