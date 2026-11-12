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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;

import java.util.LinkedHashMap;
import java.util.Map;

/** Trusted scope and explicit sampling semantics, never a claim of exhaustive ingestion data. */
public final class AgentTelemetryReadOutput {
    private AgentTelemetryReadOutput() {}

    public static Map<String, Object> bound(
            String tool, Map<String, Object> value, Map<String, Object> args) {
        var request = AgentToolContextSupport.invocation().getRequest();
        var result = new LinkedHashMap<String, Object>(value);
        result.put("telemetryReadVersion", "telemetry-intake-read.v1");
        result.put("toolName", tool);
        result.put("workspaceId", request.getWorkspaceId());
        result.put("inputHash", AgentToolPayloadHasher.normalizedArgumentsHash(args));
        if (tool.equals("telemetry.overview") || tool.equals("telemetry.bindings")) {
            result.put("coverageKind", "NATIVE_LAST_24H_SAMPLED");
            result.put("lookbackMillis", 86400000L);
        } else if (tool.equals("telemetry.intake_red_summary")) {
            result.put("coverageKind", "NATIVE_AUDIT_SAMPLE_MAX_256");
            result.put("sampleLimit", 256);
            result.put("start", args.get("start"));
            result.put("end", args.get("end"));
        } else result.put("coverageKind", "NATIVE_READINESS_CONFIGURATION");
        return result;
    }

    /** Redact string leaves before JSON encoding so secret patterns cannot consume JSON syntax. */
    public static Object sanitizeStrings(Object value) {
        if (value instanceof String text) {
            String safe = org.apache.hertzbeat.ai.gateway.text.GatewayText.redactSecrets(text);
            // Repeated ledger/transcript text redaction must not consume an escaped JSON delimiter.
            // Collapse an already-redacted leaf rather than retaining a credential-shaped prefix.
            return !safe.equals(text) || safe.contains("[REDACTED")
                    ? org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor.REDACTED
                    : text;
        }
        if (value instanceof Map<?, ?> map) {
            var safe = new LinkedHashMap<String, Object>();
            map.forEach((key, child) -> safe.put(String.valueOf(key), sanitizeStrings(child)));
            return safe;
        }
        if (value instanceof java.util.List<?> list) {
            return list.stream().map(AgentTelemetryReadOutput::sanitizeStrings).toList();
        }
        return value;
    }
}
