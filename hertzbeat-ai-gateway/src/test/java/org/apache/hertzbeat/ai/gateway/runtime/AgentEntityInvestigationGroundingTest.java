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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.conversation.AgentEvidenceReference;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.Test;

class AgentEntityInvestigationGroundingTest {
    @Test
    void traceQueryProducesScopeBoundEvidenceWithoutGenericFallback() {
        var proof = evaluate("traces.query", query(),
                "{\"content\":[{\"traceId\":\"abc\"}],\"start\":1000,\"end\":2000,"
                        + "\"pageIndex\":0,\"pageSize\":20,\"totalElements\":1}").orElseThrow();
        assertEquals("investigation-trace-records", proof.getObservationKind());
        assertEquals(42L, proof.getEntityId());
        assertEquals(1000L, proof.getStart());
        assertEquals(AgentEvidenceReference.from(proof), AgentEvidenceReference.from(proof));
        assertEquals("traces", AgentEvidenceReference.from(proof).signalType());
        assertTrue(evaluate("traces.query", query(),
                "{\"content\":[],\"start\":1000,\"end\":2000,\"pageIndex\":0,\"pageSize\":20,\"totalElements\":0}").isEmpty());
        assertTrue(evaluate("traces.query", query(),
                "{\"content\":[{\"traceId\":\"abc\"}],\"start\":1,\"end\":2000,"
                        + "\"pageIndex\":0,\"pageSize\":20,\"totalElements\":1}").isEmpty());
    }

    @Test
    void logEvidenceRequiresExactServiceAndActualRowsInWindow() {
        Map<String, Object> row = new java.util.LinkedHashMap<>();
        row.put("timeUnixNano", 1500000000L);
        row.put("observedTimeUnixNano", 1500000000L);
        row.put("severityNumber", 17);
        row.put("severityText", "ERROR");
        row.put("body", "failed");
        row.put("traceId", null);
        row.put("spanId", null);
        row.put("traceFlags", 0);
        row.put("attributes", "{}");
        row.put("resource", org.apache.hertzbeat.common.util.JsonUtil.toJson(Map.of(
                "service.name", "orders", "service.namespace", "ops", "deployment.environment.name", "prod")));
        String output = org.apache.hertzbeat.common.util.JsonUtil.toJson(Map.of("content", java.util.List.of(row),
                "start", 1000, "end", 2000, "pageIndex", 0, "pageSize", 20, "totalElements", 1, "totalPages", 1));
        assertTrue(evaluate("logs.query", query(), output).isPresent());
        assertTrue(evaluate("logs.query", query(), output.replace("orders", "foreign")).isEmpty());
        assertTrue(evaluate("logs.query", query(), output.replace("1500000000", "3000000000")).isEmpty());
    }

    private java.util.Optional<AgentGroundingProof> evaluate(String tool, Map<String, Object> args, String output) {
        var call = AgentRuntimeToolCall.builder().toolName(tool).toolCallId("call-1").arguments(args).build();
        var result = AgentToolExecutionResult.builder().toolName(tool).toolCallId("call-1")
                .risk(AgentToolRisk.READ).status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output(output).build();
        return new AgentTargetGroundingEvaluator().evaluate("run-1", target(), call, result);
    }

    private Map<String, Object> query() {
        return Map.of("start", 1000, "end", 2000, "serviceName", "orders", "serviceNamespace", "ops",
                "environment", "prod", "pageIndex", 0, "pageSize", 20);
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version("entity-investigation.v1").entityId(42L)
                .signal(AgentSignalRef.builder().type("investigation").start(1000L).end(2000L).timezone("UTC").build())
                .service(AgentServiceRef.builder().name("orders").namespace("ops").environment("prod").build())
                .authority(AgentTargetAuthority.builder().bindingId(42L).version("entity-investigation-authority.v1")
                        .hash("sha256:" + "a".repeat(64)).build()).build();
    }
}
