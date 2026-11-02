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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import tools.jackson.core.type.TypeReference;

/** Disjoint relative and exact modes for the public metrics.history tool contract. */
public final class AgentMetricsHistoryInputSchema {
    private static final List<String> EXACT = List.of("monitorId", "metricKey", "start", "end", "step");
    private static final List<String> RELATIVE = List.of("instance", "app", "metrics", "fieldParameter", "history");

    private AgentMetricsHistoryInputSchema() { }

    public static String enrich(String generated) {
        Map<String, Object> schema = new LinkedHashMap<>(JsonUtil.fromJson(generated, new TypeReference<>() { }));
        schema.put("oneOf", List.of(
                mode(List.of("monitorId", "metricKey", "start", "end"), RELATIVE),
                mode(List.of("instance", "app", "metrics", "fieldParameter"), EXACT)));
        return JsonUtil.toJson(schema);
    }

    private static Map<String, Object> mode(List<String> required, List<String> forbidden) {
        Map<String, Object> properties = new LinkedHashMap<>();
        forbidden.forEach(field -> properties.put(field, Map.of("type", "null")));
        required.forEach(field -> properties.put(field, Map.of("not", Map.of("type", "null"))));
        return Map.of("required", required, "properties", properties);
    }
}
