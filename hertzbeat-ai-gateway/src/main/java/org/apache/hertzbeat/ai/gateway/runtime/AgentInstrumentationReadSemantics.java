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

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Metadata, guide delivery and signal reception are distinct, argument-bound observations. */
final class AgentInstrumentationReadSemantics {
    private static final Set<String> TOOLS =
            Set.of(
                    "telemetry.instrumentation_catalog",
                    "telemetry.intake_profiles",
                    "telemetry.instrumentation_render",
                    "telemetry.instrumentation_detect");

    static boolean supports(String tool) {
        return TOOLS.contains(tool);
    }

    AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, Map<String, Object> data) {
        if (call == null || data == null || number(data.get("schemaVersion")) != 2) {
            return null;
        }
        var args = call.getArguments();
        if ("BLOCKED".equals(data.get("executionStatus"))) {
            return Boolean.FALSE.equals(data.get("applied"))
                            && args.get("request") instanceof Map<?, ?> request
                            && org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args)
                                    .equals(data.get("inputHash"))
                            && request.equals(data.get("request"))
                            && Set.of(
                                            "instrumentation_v2_schema_unsupported",
                                            "instrumentation_v2_selection_invalid",
                                            "instrumentation_v2_context_invalid",
                                            "instrumentation_v2_intake_profile_not_found",
                                            "instrumentation_v2_intake_profile_unavailable")
                                    .contains(data.get("errorCode"))
                    ? new AgentReadObservationClassifier.Observation(
                            "instrumentation-blocked-not-applied", 0)
                    : null;
        }

        if ("telemetry.instrumentation_detect".equals(call.getToolName())) {
            return detect(args, data);
        }
        int count =
                page(
                        args,
                        data,
                        "telemetry.instrumentation_render".equals(call.getToolName()) ? 1 : 5);
        if (count < 0) {
            return null;
        }
        return switch (call.getToolName()) {
            case "telemetry.instrumentation_catalog" ->
                    Objects.equals(args.get("section"), data.get("section"))
                                    && Set.of("groups", "sources", "recipes")
                                            .contains(data.get("section"))
                            ? new AgentReadObservationClassifier.Observation(
                                    "instrumentation-catalog-items", count)
                            : null;
            case "telemetry.intake_profiles" ->
                    Set.of("available", "unconfigured").contains(data.get("status"))
                            ? new AgentReadObservationClassifier.Observation(
                                    "instrumentation-intake-profile-items", count)
                            : null;
            case "telemetry.instrumentation_render" -> render(args, data, count);
            default -> null;
        };
    }

    private AgentReadObservationClassifier.Observation render(
            Map<String, Object> args, Map<String, Object> data, int count) {
        if (!(args.get("request") instanceof Map<?, ?> request)
                || number(request.get("schemaVersion")) != 2
                || !identity(request.get("service"), data.get("service"))
                || !Objects.equals(request.get("recipeId"), data.get("recipeId"))
                || !Objects.equals(request.get("sourceKind"), data.get("sourceKind"))
                || !(data.get("intakeProfile") instanceof Map<?, ?> profile)
                || !Objects.equals(request.get("intakeProfileId"), profile.get("id"))
                || !"GUIDE_RENDERED".equals(data.get("executionStatus"))
                || !Boolean.FALSE.equals(data.get("applied"))) {
            return null;
        }
        return new AgentReadObservationClassifier.Observation(
                "instrumentation-guide-blocks-not-applied", count);
    }

    private AgentReadObservationClassifier.Observation detect(
            Map<String, Object> args, Map<String, Object> data) {
        if (!(args.get("request") instanceof Map<?, ?> request)
                || number(request.get("schemaVersion")) != 2
                || !(data.get("detection") instanceof Map<?, ?> detection)
                || number(detection.get("schemaVersion")) != 2
                || !(detection.get("context") instanceof Map<?, ?> context)
                || !identity(request.get("service"), context.get("service"))) {
            return null;
        }
        for (String field :
                List.of(
                        "sourceKind",
                        "recipeId",
                        "language",
                        "framework",
                        "method",
                        "environment",
                        "platform",
                        "intakeProfileId")) {
            if (!Objects.equals(request.get(field), context.get(field))) {
                return null;
            }
        }
        long start = number(request.get("startedAt"));
        long end = number(context.get("windowEndAt"));
        long observed = number(detection.get("detectedAt"));
        if (start <= 0
                || number(context.get("startedAt")) != start
                || end < start
                || observed < start
                || !(detection.get("signals") instanceof Map<?, ?> signals)
                || !signals.keySet().equals(Set.of("metrics", "logs", "traces"))) {
            return null;
        }
        int received = 0;
        for (Object value : signals.values()) {
            if (!(value instanceof Map<?, ?> signal)) {
                return null;
            }
            if ("received".equals(signal.get("status"))) {
                long timestamp = number(signal.get("lastReceivedAt"));
                if (timestamp < start
                        || timestamp > Math.min(end, observed)
                        || signal.get("errorCode") != null) {
                    return null;
                }
                received++;
            } else if (!Set.of("waiting", "unsupported").contains(signal.get("status"))) {
                return null;
            }
        }
        return received == number(data.get("receivedSignalCount"))
                ? new AgentReadObservationClassifier.Observation(
                        "instrumentation-received-signal-kinds", received)
                : null;
    }

    private boolean identity(Object requested, Object actual) {
        if (!(requested instanceof Map<?, ?> request) || !(actual instanceof Map<?, ?> result)) {
            return false;
        }
        for (String field :
                List.of("name", "namespace", "environment", "serviceInstanceId", "endpoint")) {
            if (!Objects.equals(request.get(field), result.get(field))) {
                return false;
            }
            if (Set.of("name", "namespace", "environment").contains(field)
                    && (!(request.get(field) instanceof String text) || text.isBlank())) {
                return false;
            }
        }
        return true;
    }

    private int page(Map<String, Object> args, Map<String, Object> data, int defaultSize) {
        long offset = args.get("offset") == null ? 0 : number(args.get("offset"));
        long limit = args.get("limit") == null ? defaultSize : number(args.get("limit"));
        long total = number(data.get("total"));
        long returned = number(data.get("returnedCount"));
        if (offset < 0
                || limit < 1
                || total < 0
                || total > 10000
                || number(data.get("offset")) != offset
                || number(data.get("limit")) != limit
                || !(data.get("items") instanceof List<?> items)
                || returned != items.size()
                || returned != Math.max(0, Math.min(limit, total - offset))
                || !Objects.equals(data.get("hasMore"), offset + returned < total)) {
            return -1;
        }
        return (int) returned;
    }

    private long number(Object value) {
        if (!(value instanceof Number number)) {
            return -1;
        }
        try {
            return new java.math.BigDecimal(number.toString()).longValueExact();
        } catch (ArithmeticException | NumberFormatException invalid) {
            return -1;
        }
    }
}
