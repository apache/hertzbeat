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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.runtime.AgentBatchService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Resolve prior batch parameters from authoritative owner-bound state, not model recollection. */
@Service
public class AgentMonitorBatchPlanToolService {
    private final AgentRunDao runs;
    private final AgentSessionDao sessions;
    private final ObjectProvider<AgentBatchService> batches;

    public AgentMonitorBatchPlanToolService(
            AgentRunDao runs, AgentSessionDao sessions, ObjectProvider<AgentBatchService> batches) {
        this.runs = runs;
        this.sessions = sessions;
        this.batches = batches;
    }

    @Tool(
            name = "monitor.batch_plan",
            description =
                    "Read the exact frozen website batch items and original idempotency keys before"
                        + " replay/status checks. Supply runUid or omit it to resolve the most"
                        + " recent native batch in this same owned conversation (last 20 runs)."
                        + " Page all items; never invent missing keys or targets. This tool does"
                        + " not continue, retry or create anything; legacy batches are not exposed"
                        + " as native idempotent plans.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> plan(
            @ToolParam(
                            required = false,
                            description =
                                    "Original batch run UID; omit for the latest native batch in"
                                            + " this conversation.")
                    String runUid,
            @ToolParam(required = false, description = "Zero-based offset, 0 to 50.")
                    Integer offset,
            @ToolParam(required = false, description = "Page size, 1 to 20; default 10.")
                    Integer limit) {
        int start = offset == null ? 0 : offset;
        int size = limit == null ? 10 : limit;
        if (start < 0
                || start > 50
                || size < 1
                || size > 20
                || runUid != null && !runUid.matches("[A-Za-z0-9_.:-]{1,128}")) {
            throw new IllegalArgumentException("Bounded batch plan selection is required");
        }
        var request = AgentToolContextSupport.invocation().getRequest();
        var session = sessions.findById(request.getRunSessionId()).orElseThrow();
        if (!request.getSessionUid().equals(session.getSessionUid())) {
            throw new SecurityException("Current conversation identity mismatch");
        }
        var envelope =
                GatewayEnvelope.builder()
                        .channelId(session.getChannel())
                        .workspaceId(request.getWorkspaceId())
                        .actor(request.getActor())
                        .receivedAt(System.currentTimeMillis())
                        .build();
        var candidates =
                runUid == null
                        ? runs.findBySessionIdOrderByIdDesc(
                                session.getId(),
                                org.springframework.data.domain.PageRequest.of(0, 20))
                        : List.of(runs.findByRunUid(runUid).orElseThrow());
        for (var run : candidates) {
            if (runUid == null && request.getRunUid().equals(run.getRunUid())) {
                continue;
            }
            var found = batches.getObject().plan(session, run, envelope);
            if (found.isEmpty()) {
                continue;
            }
            var plan = found.get();
            int from = Math.min(start, plan.items().size());
            int to = Math.min(from + size, plan.items().size());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("planVersion", "monitor-batch-plan.v1");
            result.put("rootRunUid", plan.rootRunUid());
            result.put("selectedRunUid", run.getRunUid());
            result.put("planHash", plan.planHash());
            result.put("expectedCount", plan.expectedCount());
            result.put("items", plan.items().subList(from, to));
            result.put("offset", start);
            result.put("limit", size);
            result.put("total", plan.items().size());
            result.put("hasMore", to < plan.items().size());
            result.put("readOnly", true);
            result.put(
                    "inputHash",
                    AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments()));
            return result;
        }
        throw new IllegalArgumentException(
                "No owner-verified native batch manifest is available; do not invent replay"
                        + " parameters");
    }
}
