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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import tools.jackson.databind.JsonNode;

/** Native alert single/group/both page envelopes projected without inferring time or identity bindings. */
public final class AgentAlertQueryPage {
    private AgentAlertQueryPage() { }

    public static JsonNode page(JsonNode node) {
        if (valid(node)) {
            return node;
        }
        String type = node.path("alertType").asText("");
        if (List.of("single", "group").contains(type) && valid(node.path("result"))) {
            return node.path("result");
        }
        if (!"both".equals(type) || !valid(node.path("single")) || !valid(node.path("group"))) {
            return null;
        }
        var single = node.path("single");
        var group = node.path("group");
        long first = single.path("totalElements").asLong();
        long second = group.path("totalElements").asLong();
        if (Long.MAX_VALUE - first < second) {
            return null;
        }
        List<JsonNode> rows = new ArrayList<>();
        single.path("content").forEach(rows::add);
        group.path("content").forEach(rows::add);
        return JsonUtil.fromJson(JsonUtil.toJson(Map.of("content", rows, "totalElements", first + second,
                "partial", partial(single) || partial(group))));
    }

    private static boolean valid(JsonNode node) {
        return node != null && node.isObject() && node.path("content").isArray()
                && node.path("totalElements").isIntegralNumber()
                && node.path("totalElements").asLong(-1) >= node.path("content").size();
    }

    private static boolean partial(JsonNode node) {
        return node.path("partial").asBoolean() || node.path("truncated").asBoolean() || node.path("hasMore").asBoolean()
                || node.path("pageIndex").asLong(0) > 0
                || node.path("totalElements").asLong() > node.path("content").size();
    }
}
