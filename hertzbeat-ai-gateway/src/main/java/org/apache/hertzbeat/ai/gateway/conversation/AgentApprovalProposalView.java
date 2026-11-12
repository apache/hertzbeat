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

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;

/**
 * Optional presentation only: no native reads, changes to saved arguments, or approval decisions.
 */
@Service
public final class AgentApprovalProposalView {
    private final AgentToolCallDao calls;

    public AgentApprovalProposalView(AgentToolCallDao calls) {
        this.calls = calls;
    }

    public AgentApprovalSummary summary(AgentToolCall proposal) {
        var summary = AgentApprovalSummary.from(proposal);
        if (summary.inhibition() == null
                || summary.inhibition().targetId() == null
                || !summary.complete()
                || proposal.getId() == null
                || proposal.getRunId() == null) return summary;
        try {
            for (var row :
                    calls.findByRunIdAndIdLessThanOrderByIdDesc(
                            proposal.getRunId(), proposal.getId(), PageRequest.of(0, 64))) {
                var before = baseline(proposal, summary, row);
                if (before != null) return summary.withInhibitionBefore(before);
            }
        } catch (RuntimeException unavailable) {
            /* No unverified before-state is displayed. */
        }
        return summary;
    }

    private AgentAlertInhibitToolService.Configuration baseline(
            AgentToolCall proposal, AgentApprovalSummary summary, AgentToolCall row) {
        try {
            if (row.getId() == null
                    || row.getId() >= proposal.getId()
                    || !Objects.equals(row.getRunId(), proposal.getRunId())
                    || !Objects.equals(row.getRunUid(), proposal.getRunUid())
                    || !Objects.equals(row.getSessionId(), proposal.getSessionId())
                    || !Objects.equals(row.getSessionUid(), proposal.getSessionUid())
                    || !"alert_inhibit.get".equals(row.getToolName())
                    || !"READ".equals(row.getRisk())
                    || !"SUCCEEDED".equals(row.getStatus())
                    || row.getInputJson() == null
                    || row.getInputJson().length() > 4096
                    || row.getResultOutput() == null
                    || row.getResultOutput().length() > 24000) return null;
            Map<String, Object> args = JsonUtil.fromJson(row.getInputJson(), Map.class);
            if (args == null
                    || !args.keySet().equals(java.util.Set.of("inhibitId"))
                    || !AgentToolPayloadHasher.normalizedArgumentsHash(args)
                            .equals(row.getInputHash())
                    || !summary.inhibition()
                            .targetId()
                            .equals(String.valueOf(args.get("inhibitId")))) return null;
            Map<String, Object> out = JsonUtil.fromJson(row.getResultOutput(), Map.class);
            if (out == null
                    || !"alert-inhibit-read.v1".equals(out.get("readVersion"))
                    || !Boolean.FALSE.equals(out.get("partial"))
                    || !Boolean.TRUE.equals(out.get("redactionApplied"))
                    || !(out.get("data") instanceof Map<?, ?> data)
                    || !summary.inhibition().targetId().equals(String.valueOf(data.get("id")))
                    || !summary.inhibition().sourceHash().equals(out.get("sourceHash"))
                    || !summary.inhibition()
                            .sourceHash()
                            .equals(AgentAlertInhibitWriteProof.sourceHash(data))) return null;
            var fields = AgentAlertInhibitWriteProof.fields(data);
            var projected = AgentManagementOutputSupport.view(fields);
            if (!Boolean.FALSE.equals(projected.get("partial"))
                    || !AgentAlertInhibitWriteProof.contentHash(fields)
                            .equals(AgentAlertInhibitWriteProof.contentHash(projected.get("data"))))
                return null;
            // Reuse the native full-configuration validator via a synthetic saved create proposal;
            // it cannot execute.
            var candidateArgs = Map.<String, Object>of("configuration", fields);
            var candidate =
                    AgentToolCall.builder()
                            .toolName("alert_inhibit.create")
                            .inputJson(JsonUtil.toJson(candidateArgs))
                            .inputHash(
                                    AgentToolPayloadHasher.normalizedArgumentsHash(candidateArgs))
                            .build();
            var safe = AgentApprovalSummary.from(candidate);
            return safe.complete() && safe.inhibition() != null
                    ? safe.inhibition().configuration()
                    : null;
        } catch (RuntimeException invalid) {
            return null;
        }
    }
}
