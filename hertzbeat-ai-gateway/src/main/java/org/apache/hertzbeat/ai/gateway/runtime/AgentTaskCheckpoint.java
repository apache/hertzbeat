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

import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Original-goal checkpoint written before a monitor mutation, never a completion or approval token.
 */
public record AgentTaskCheckpoint(
        String version,
        String runUid,
        String requestBinding,
        AgentTaskAssessment.Goal goal,
        int toolBudget,
        AgentMonitorBatch.Snapshot monitorBatch,
        int modelRequests,
        AgentExplicitManifestPlan.Reference manifestReference) {
    public AgentTaskCheckpoint(
            String version,
            String runUid,
            String requestBinding,
            AgentTaskAssessment.Goal goal,
            int toolBudget,
            AgentMonitorBatch.Snapshot monitorBatch,
            int modelRequests) {
        this(version, runUid, requestBinding, goal, toolBudget, monitorBatch, modelRequests, null);
    }

    public AgentTaskCheckpoint(
            String version,
            String runUid,
            String requestBinding,
            AgentTaskAssessment.Goal goal,
            int toolBudget) {
        this(version, runUid, requestBinding, goal, toolBudget, null, 0);
    }

    public static final String VERSION = "task-checkpoint.v1";
    public static final String MANIFEST_VERSION = "task-checkpoint.manifest.v1";

    static AgentTaskCheckpoint forContext(
            AgentRuntimeContext context, AgentTaskAssessment.Goal goal, int budget) {
        return new AgentTaskCheckpoint(
                VERSION, context.getRunUid(), binding(context), goal, budget);
    }

    static AgentTaskCheckpoint forRuntime(
            AgentRuntimeContext context,
            AgentTaskAssessment.Goal goal,
            int budget,
            AgentMonitorBatch.Snapshot batch,
            int modelRequests) {
        return new AgentTaskCheckpoint(
                VERSION, context.getRunUid(), binding(context), goal, budget, batch, modelRequests);
    }

    boolean validFor(AgentRuntimeContext context) {
        return validFor(context, java.time.Clock.systemUTC());
    }

    boolean validFor(AgentRuntimeContext context, java.time.Clock clock) {
        return validBinding(context, clock, false);
    }

    boolean validForObservation(AgentRuntimeContext context) {
        return validBinding(context, java.time.Clock.systemUTC(), true);
    }

    private boolean validBinding(
            AgentRuntimeContext context, java.time.Clock clock, boolean observationOnly) {
        return (manifestReference == null
                        ? VERSION.equals(version)
                        : MANIFEST_VERSION.equals(version))
                && context.getRunUid().equals(runUid)
                && binding(context).equals(requestBinding)
                && goal != null
                && goal.valid()
                && validPlan()
                && (manifestReference == null
                        || manifestReference.preflightComplete()
                                && (observationOnly
                                        ? manifestReference.validForObservation(
                                                context, goal, clock)
                                        : manifestReference.validFor(context, goal, clock)))
                && modelRequests >= 0
                && toolBudget >= 0
                && goal.expectedChanges()
                        .equals(GatewaySecretRedactor.redactMap(goal.expectedChanges()));
    }

    private boolean validPlan() {
        if (goal.createTargets().isEmpty()) {
            return true;
        }
        try {
            new AgentMonitorBatch(runUid).initialize(goal);
            return true;
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static String binding(AgentRuntimeContext context) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("actorType", context.getActor().getType());
        fields.put("actorId", context.getActor().getId());
        fields.put("workspace", context.getWorkspaceId());
        fields.put("channel", context.getChannelId());
        fields.put("session", context.getSessionUid());
        fields.put("run", context.getRunUid());
        fields.put("entry", context.getEntryType());
        fields.put("question", context.getUserMessage());
        fields.put("target", context.getEffectiveTarget());
        return GatewayText.sha256(JsonUtil.toJson(fields));
    }
}
