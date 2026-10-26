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

package org.apache.hertzbeat.ai.gateway.tool.system;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2;

import tools.jackson.core.type.TypeReference;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Native JSON vocabulary and genuinely optional service query-context fields. */
public final class AgentInstrumentationInputSchema {
    private AgentInstrumentationInputSchema() {}

    public static String enrich(String tool, String generated) {
        if (!List.of("telemetry.instrumentation_render", "telemetry.instrumentation_detect")
                .contains(tool)) {
            return generated;
        }
        Map<String, Object> schema = JsonUtil.fromJson(generated, new TypeReference<>() {});
        var request = object(object(schema.get("properties")).get("request"));
        var fields = object(request.get("properties"));
        enums(fields, "sourceKind", InstrumentationCatalogV2.SourceKind.values());
        enums(fields, "language", InstrumentationApiContract.Language.values());
        enums(fields, "framework", InstrumentationApiContract.Framework.values());
        enums(fields, "method", InstrumentationApiContract.Method.values());
        enums(fields, "environment", InstrumentationApiContract.Environment.values());
        enums(fields, "platform", InstrumentationApiContract.Platform.values());
        request.put(
                "required",
                "telemetry.instrumentation_detect".equals(tool)
                        ? List.of(
                                "schemaVersion",
                                "sourceKind",
                                "recipeId",
                                "intakeProfileId",
                                "service",
                                "startedAt")
                        : List.of(
                                "schemaVersion",
                                "sourceKind",
                                "recipeId",
                                "intakeProfileId",
                                "service"));
        object(fields.get("schemaVersion")).put("const", 2);
        var service = object(fields.get("service"));
        service.put("required", List.of("name", "namespace", "environment"));
        var identity = object(service.get("properties"));
        object(identity.get("serviceInstanceId"))
                .put(
                        "description",
                        "Optional exact service.instance.id. Omit when unscoped; never invent"
                                + " placeholder values.");
        object(identity.get("endpoint"))
                .put(
                        "description",
                        "Optional low-cardinality HTTP ROUTE TEMPLATE, e.g. /orders/{id}. Omit when"
                                + " unscoped. Never a full URL, host:port, query string or HTTP"
                                + " method.");
        object(identity.get("name"))
                .put(
                        "description",
                        "Exact service.name resource value; required, at most128 safe characters.");
        return JsonUtil.toJson(schema);
    }

    private static void enums(Map<String, Object> fields, String field, Object[] values) {
        object(fields.get(field))
                .put(
                        "enum",
                        Arrays.stream(values)
                                .map(
                                        value ->
                                                JsonUtil.fromJson(
                                                        JsonUtil.toJson(value), String.class))
                                .toList());
    }

    private static Map<String, Object> object(Object value) {
        return (Map<String, Object>) value;
    }
}
