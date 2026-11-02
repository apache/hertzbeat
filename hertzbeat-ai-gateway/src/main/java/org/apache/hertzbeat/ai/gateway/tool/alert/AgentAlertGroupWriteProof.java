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
 * Typed editable-state hashes and independent native readback receipts; snapshot checks are not
 * atomic CAS.
 */
public final class AgentAlertGroupWriteProof {
    private AgentAlertGroupWriteProof() {}

    public static Map<String, Object> fields(Object value) {
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
        var result = new LinkedHashMap<String, Object>();
        for (String name :
                List.of(
                        "name",
                        "groupLabels",
                        "groupWait",
                        "groupInterval",
                        "repeatInterval",
                        "enable")) result.put(name, row.get(name));
        return result;
    }

    public static String contentHash(Object value) {
        return AgentToolPayloadHasher.normalizedArgumentsHash(fields(value));
    }

    public static String sourceHash(Object value) {
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
        return AgentToolPayloadHasher.normalizedArgumentsHash(
                Map.of("id", row.get("id"), "configuration", fields(value)));
    }

    public static void requireSource(Object value, String source) {
        if (source == null || !source.matches("[a-f0-9]{64}") || !source.equals(sourceHash(value)))
            throw new IllegalStateException(
                    "ALERT_GROUP_SOURCE_CHANGED_OR_UNVERIFIED_BEFORE_WRITE");
    }

    public static Map<String, Object> receipt(
            String tool, long id, Map<String, Object> args, String postHash, boolean absent) {
        return Map.of(
                "version",
                "alert-group-write.v1",
                "toolName",
                tool,
                "id",
                id,
                "boundArgumentsHash",
                AgentAlertRuleWriteProof.argumentHash(args),
                "postReadHash",
                postHash,
                "absent",
                absent,
                "verified",
                true,
                "atomicVersionPrecondition",
                false);
    }
}
