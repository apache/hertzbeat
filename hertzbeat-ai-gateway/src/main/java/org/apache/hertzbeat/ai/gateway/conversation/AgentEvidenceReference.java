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

package org.apache.hertzbeat.ai.gateway.conversation;

import org.apache.hertzbeat.ai.gateway.runtime.AgentGroundingProof;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;

/** Safe replay projection: no raw output, authority hash, or model-provided link is exposed. */
public record AgentEvidenceReference(String evidenceId, String runUid, String toolCallId, String toolName,
                                     String signalType, String resourceType, String resourceId,
                                     Long start, Long end, Integer observationCount,
                                     String status, String summary, Boolean partial) {
    public static AgentEvidenceReference from(AgentGroundingProof proof) {
        String type = proof.getAlertId() != null ? "alert" : proof.getMonitorId() != null ? "monitor"
                : proof.getEntityId() != null ? "entity" : proof.getTraceId() != null ? "trace" : "read";
        Object id = switch (type) {
            case "alert" -> proof.getAlertId();
            case "monitor" -> proof.getMonitorId();
            case "entity" -> proof.getEntityId();
            case "trace" -> proof.getTraceId();
            default -> null;
        };
        String signal = proof.getToolName().startsWith("logs.") ? "logs"
                : proof.getToolName().startsWith("traces.") ? "traces"
                : proof.getToolName().startsWith("metrics.") ? "metrics" : type;
        String evidenceId = "evidence_" + GatewayText.sha256(proof.getRunUid() + ":" + proof.getToolCallId());
        return new AgentEvidenceReference(evidenceId, proof.getRunUid(), proof.getToolCallId(), proof.getToolName(),
                signal, type, id == null ? null : String.valueOf(id), proof.getStart(), proof.getEnd(),
                proof.getObservationCount(), "OBSERVED", proof.getObservationKind(), null);
    }
}
