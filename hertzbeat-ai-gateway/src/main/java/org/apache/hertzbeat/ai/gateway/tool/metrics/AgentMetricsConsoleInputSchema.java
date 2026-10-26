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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import tools.jackson.core.type.TypeReference;

/** The console operation requires a real query; inventory deliberately does not. */
public final class AgentMetricsConsoleInputSchema {
    private AgentMetricsConsoleInputSchema() { }

    @SuppressWarnings("unchecked")
    public static String enrich(String name, String generated) {
        if (!"metrics.otlp_console".equals(name)) {
            return generated;
        }
        Map<String, Object> schema = JsonUtil.fromJson(generated, new TypeReference<>() { });
        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        Map<String, Object> q = (Map<String, Object>) properties.get("q");
        Map<String, Object> controls = (Map<String, Object>) q.get("properties");
        Map<String, Object> query = new LinkedHashMap<>((Map<String, Object>) controls.get("query"));
        query.put("type", "string");
        query.put("minLength", 1);
        query.put("description", "Required console query using an actually discovered metric name. "
                + "Do not call console with an empty query when the scoped inventory has no metric names.");
        controls.put("query", query);
        List<String> required = new ArrayList<>((List<String>) q.getOrDefault("required", List.of()));
        if (!required.contains("query")) {
            required.add("query");
        }
        q.put("required", required);
        return JsonUtil.toJson(schema);
    }
}
