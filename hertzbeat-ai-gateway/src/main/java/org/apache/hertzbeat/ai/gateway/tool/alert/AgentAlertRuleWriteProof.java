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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Native rule write attestation from exact independent readback; contains no original arguments.
 */
public final class AgentAlertRuleWriteProof {
    private AgentAlertRuleWriteProof() {}

    public static String argumentHash(Map<String, Object> args) {
        Map<String, Object> json = JsonUtil.fromJson(JsonUtil.toJson(args), Map.class);
        return AgentToolPayloadHasher.normalizedArgumentsHash(
                (Map<String, Object>) withoutNulls(json));
    }

    private static Object withoutNulls(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> clean = new LinkedHashMap<>();
            map.forEach(
                    (key, child) -> {
                        if (child != null) clean.put(String.valueOf(key), withoutNulls(child));
                    });
            return clean;
        }
        if (value instanceof List<?> list)
            return list.stream().map(AgentAlertRuleWriteProof::withoutNulls).toList();
        return value;
    }

    public static String contentHash(Map<String, Object> row) {
        var fields = new LinkedHashMap<>(row);
        fields.remove("ruleId");
        fields.remove("mutationReceipt");
        return AgentToolPayloadHasher.normalizedArgumentsHash(fields);
    }

    public static String nativeHash(Map<String, Object> row) {
        Map<String, Object> fields = new LinkedHashMap<>();
        for (String name :
                List.of(
                        "ruleId",
                        "name",
                        "type",
                        "expression",
                        "period",
                        "times",
                        "labels",
                        "annotations",
                        "template",
                        "datasource",
                        "enabled")) fields.put(name, row.get(name));
        return AgentToolPayloadHasher.normalizedArgumentsHash(fields);
    }

    public static Map<String, Object> receipt(
            String tool,
            Long id,
            Map<String, Object> args,
            Map<String, Object> stored,
            boolean absent) {
        return Map.of(
                "version",
                "alert-rule-write.v1",
                "toolName",
                tool,
                "ruleId",
                id,
                "boundArgumentsHash",
                argumentHash(args),
                "postReadHash",
                nativeHash(stored),
                "absent",
                absent,
                "verified",
                true);
    }
}
