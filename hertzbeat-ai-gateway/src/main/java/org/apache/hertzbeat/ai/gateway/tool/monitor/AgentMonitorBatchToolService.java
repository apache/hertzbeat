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

import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatch;
import org.apache.hertzbeat.manager.monitor.batch.WebsiteMonitorBatchService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Typed native batch execution; no arbitrary URLs, authority overrides or credential-bearing
 * parameters.
 */
@Service
public class AgentMonitorBatchToolService {
    private final WebsiteMonitorBatchService batches;
    private final org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao runs;

    public AgentMonitorBatchToolService(
            WebsiteMonitorBatchService batches,
            org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao runs) {
        this.batches = batches;
        this.runs = runs;
    }

    @Tool(
            name = "monitor.plan_websites",
            description =
                    "Propose 2 to 50 website monitors using a compact list of distinct real public"
                        + " domains, including when the user asks you to choose any/random public"
                        + " sites. Choose the domains yourself when authorized. Omitted shared"
                        + " settings default to 600 seconds and 3000ms; explicit user settings take"
                        + " priority. Return domains only, not 50 repeated item objects. This is"
                        + " planning only, never creation. If valid=false, correct the reported"
                        + " candidate errors without changing explicit user targets/settings;"
                        + " replenish duplicates to the original requested count. On server"
                        + " replacement feedback provide only the missing1..50 new domains; the"
                        + " server retains validated unmonitored candidates and revalidates the"
                        + " complete plan. fragmentValid is planning-only, never creation"
                        + " authority. The server verifies original intent, freezes a complete plan"
                        + " and requires manual approval before native batch creation. For"
                        + " user-supplied custom paths, credentials or per-item differences use the"
                        + " existing precise native plan/editor instead.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_VISIBLE)
    public Map<String, Object> planWebsites(
            @ToolParam(
                            description =
                                    "Distinct real public domain names, 2 to 50. No URL scheme,"
                                            + " path, port or credential.")
                    List<String> domains,
            @ToolParam(
                            required = false,
                            description =
                                    "Shared collection interval in seconds; omit for native"
                                            + " default600. Preserve explicit user value.")
                    Integer intervals,
            @ToolParam(
                            required = false,
                            description =
                                    "Shared HTTP timeout in milliseconds; omit for default3000."
                                            + " Preserve explicit user value.")
                    Integer timeout) {
        return org.apache.hertzbeat.ai.gateway.runtime.AgentWebsiteBatchProposal.inspect(
                AgentToolContextSupport.invocation().getRequest().getArguments());
    }

    @Tool(
            name = "monitor.preflight_websites",
            description =
                    "Prepare a reviewed website candidate plan using structure and existing-host"
                        + " checks only. Never resolves DNS or performs network requests."
                        + " Reachability remains unverified. Normal collector execution follows"
                        + " separately approved native creation; availability is not a create gate."
                        + " No creation, claims or scheduling; this result is not persistence or"
                        + " health proof.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> preflightWebsites(
            @ToolParam(
                            description =
                                    "Reviewed credential-free HTTPS root website items; at most50.")
                    List<WebsiteMonitorBatch.Item> items,
            @ToolParam(description = "Remaining bounded sample budget, 1..20000 milliseconds.")
                    Long budgetMillis) {
        var request = AgentToolContextSupport.invocation().getRequest();
        var result =
                new java.util.LinkedHashMap<String, Object>(
                        batches.preflight(
                                caller(),
                                new WebsiteMonitorBatch.Request(items, false),
                                budgetMillis,
                                request.getExecutionGuard()));
        result.put(
                "inputHash",
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(request.getArguments()));
        return Map.copyOf(result);
    }

    @Tool(
            name = "monitor.create_batch",
            description =
                    "Create 1 to 50 planned credential-free website monitors through the native"
                        + " batch API. Each item needs a stable idempotencyKey, unique name, full"
                        + " HTTP URL, intervals in seconds, optional timeout at most 10000ms."
                        + " Native configuration validation precedes each write; availability is"
                        + " reported later by normal collection and is not a create prerequisite."
                        + " VERIFIED proves persistence/readback, never healthy HTTP responses."
                        + " Independent failures do not stop other items. Returns exact per-item"
                        + " persistence/readback receipts; never blindly retry unknown writes.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> createBatch(
            @ToolParam(description = "Complete bounded frozen website items; at most 50.")
                    List<WebsiteMonitorBatch.Item> items,
            @ToolParam(
                            required = false,
                            description =
                                    "True only for explicit retry of known preflight failures,"
                                            + " never uncertain writes.")
                    Boolean retryPreflightFailures) {
        var execution = AgentToolContextSupport.invocation().getRequest();
        return output(
                batches.createUniqueHosts(
                        caller(),
                        new WebsiteMonitorBatch.Request(
                                items, Boolean.TRUE.equals(retryPreflightFailures)),
                        () ->
                                execution.getExecutionGuard().getAsBoolean()
                                        && runs.findByRunUid(execution.getRunUid())
                                                .filter(
                                                        run ->
                                                                execution
                                                                                .getRunId()
                                                                                .equals(run.getId())
                                                                        && execution
                                                                                .getRunSessionId()
                                                                                .equals(
                                                                                        run
                                                                                                .getSessionId())
                                                                        && "RUNNING"
                                                                                .equals(
                                                                                        run
                                                                                                .getStatus()))
                                                .isPresent()));
    }

    @Tool(
            name = "monitor.batch_status",
            description =
                    "For a no-write replay/status verification, first use monitor.batch_plan to"
                        + " recover exact prior items/keys, then read durable batch item claims and"
                        + " exact native monitor readback without any write or new claim. Supply"
                        + " the same planned arguments and idempotency keys. Unknown/absent claims"
                        + " are not creation proof.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> batchStatus(
            @ToolParam(description = "Exact previously planned website items, at most 50.")
                    List<WebsiteMonitorBatch.Item> items,
            @ToolParam(
                            required = false,
                            description = "Ignored for read-only status; no retry is performed.")
                    Boolean retryPreflightFailures) {
        return output(batches.status(caller(), new WebsiteMonitorBatch.Request(items, false)));
    }

    private WebsiteMonitorBatch.Caller caller() {
        var request = AgentToolContextSupport.invocation().getRequest();
        var actor = request.getActor();
        if (!ActorSupport.TYPE_USER.equals(actor.getType())) {
            throw new SecurityException(
                    "A trusted user actor is required for website batch access");
        }
        return new WebsiteMonitorBatch.Caller(
                actor.getId(), request.getWorkspaceId(), actor.getRoles());
    }

    private Map<String, Object> output(WebsiteMonitorBatch.Result result) {
        String hash = AgentToolContextSupport.invocation().getLedgerCall().getInputHash();
        var targets =
                result.items().stream()
                        .filter(item -> "VERIFIED".equals(item.state()))
                        .map(
                                item ->
                                        new AgentMonitorMutationReceipt.Target(
                                                Long.valueOf(item.monitorId()),
                                                item.fields(),
                                                item.parameters()))
                        .toList();
        return Map.of(
                "healthVerified",
                false,
                "batchVersion",
                "monitor-bulk.v1",
                "batch",
                result,
                "mutation",
                new AgentMonitorMutationReceipt(
                        AgentMonitorMutationReceipt.VERSION,
                        "monitor.create_batch",
                        hash,
                        targets));
    }
}
