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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

class AgentGrafanaEvidenceTest {
    private Map<String, Object> args() {
        var args =
                new HashMap<String, Object>(
                        Map.of(
                                "operation",
                                "create",
                                "monitorId",
                                7L,
                                "dashboardJson",
                                "{\"title\":\"AI fixture\",\"panels\":[]}"));
        args.put(
                "previewHash",
                AgentGrafanaDraft.fromArguments("grafana.dashboard_save", args).previewHash());
        return args;
    }

    private AgentTaskAssessment.Goal goal(long id) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "grafana_dashboard",
                1,
                List.of(id),
                Map.of("title", "AI fixture"));
    }

    private Map<String, Object> receipt(Map<String, Object> args) {
        var draft = AgentGrafanaDraft.fromArguments("grafana.dashboard_save", args);
        var data = new HashMap<String, Object>();
        data.put("receiptVersion", "grafana-dashboard-mutation.v1");
        data.put("toolName", "grafana.dashboard_save");
        data.put("operation", "CREATE");
        data.put("monitorId", 7L);
        data.put("uid", "hb-monitor-7");
        data.put("version", 1L);
        data.put("previousVersion", 0L);
        data.put("previewHash", draft.previewHash());
        data.put("definitionHash", draft.definitionHash());
        data.put("title", "AI fixture");
        data.put("inputHash", AgentToolPayloadHasher.normalizedArgumentsHash(args));
        data.put("readbackHash", "a".repeat(64));
        data.put("verified", true);
        data.put("automaticRetrySafe", false);
        data.put("atomicRemoteVersionPrecondition", false);
        data.put("localBindingRemoved", false);
        data.put("remoteDashboardRemoved", false);
        return data;
    }

    @Test
    void durableNativeReadbackCompletesOnlyTheExactOriginalBinding() {
        var evidence = new AgentTaskEvidence();
        var args = args();
        var data = receipt(args);
        evidence.observe(
                "save",
                "grafana.dashboard_save",
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(data),
                true,
                (String) data.get("inputHash"));
        assertTrue(evidence.completes(goal(7)));
        assertFalse(evidence.completes(goal(8)));
        assertEquals(1, evidence.verifiedCount());
        assertTrue(evidence.alreadyReceipted("grafana.dashboard_save", args));
    }

    @Test
    void providerAckOrLostTranscriptNeverCompletesAndStopsAutomaticRetry() {
        var args = args();
        var data = receipt(args);
        data.remove("readbackHash");
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "save",
                "grafana.dashboard_save",
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(data),
                true,
                (String) data.get("inputHash"));
        assertFalse(evidence.completes(goal(7)));
        assertTrue(evidence.uncertain());
        evidence = new AgentTaskEvidence();
        data = receipt(args);
        evidence.observe(
                "lost",
                "grafana.dashboard_save",
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(data),
                false,
                (String) data.get("inputHash"));
        assertFalse(evidence.completes(goal(7)));
        assertTrue(evidence.uncertain());
    }

    @Test
    void onlyAnExactDurablePreviewCanAuthorizePreparation() {
        var args = args();
        args.remove("previewHash");
        var draft = AgentGrafanaDraft.fromArguments("grafana.dashboard_preview", args);
        var preview =
                new HashMap<>(
                        Map.<String, Object>of(
                                "previewVersion",
                                "grafana-dashboard-preview.v1",
                                "monitorId",
                                7L,
                                "operation",
                                "create",
                                "valid",
                                true,
                                "persisted",
                                false,
                                "nativeDomainValidationPending",
                                true,
                                "requiresExplicitAdminApproval",
                                true,
                                "previewHash",
                                draft.previewHash(),
                                "definitionHash",
                                draft.definitionHash(),
                                "inputHash",
                                AgentToolPayloadHasher.normalizedArgumentsHash(args)));
        preview.put("fullReplacement", false);
        preview.put("remoteDeleteAtomicVersionPrecondition", false);
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "preview",
                "grafana.dashboard_preview",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(preview),
                true);
        var input = args();
        assertTrue(evidence.hasGrafanaPreview("grafana.dashboard_save", input));
        input.put("dashboardJson", "{\"title\":\"changed\",\"panels\":[]}");
        assertFalse(evidence.hasGrafanaPreview("grafana.dashboard_save", input));
        var lost = new AgentTaskEvidence();
        lost.observe(
                "lost",
                "grafana.dashboard_preview",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(preview),
                false);
        assertFalse(lost.hasGrafanaPreview("grafana.dashboard_save", args()));
    }

    @Test
    void knownNoWriteFailureIsDistinctFromUnknownPostWriteOutcome() {
        var args = args();
        String hash = AgentToolPayloadHasher.normalizedArgumentsHash(args);
        var failure =
                new HashMap<String, Object>(
                        Map.of(
                                "failureVersion",
                                "grafana-dashboard-failure.v1",
                                "toolName",
                                "grafana.dashboard_save",
                                "monitorId",
                                7L,
                                "operation",
                                "create",
                                "inputHash",
                                hash,
                                "reasonCode",
                                "GRAFANA_BINDING_ALREADY_EXISTS",
                                "outcomeUnknown",
                                false));
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "rejected",
                "grafana.dashboard_save",
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.FAILED,
                args,
                JsonUtil.toJson(failure),
                true,
                hash);
        assertTrue(evidence.failed());
        assertFalse(evidence.uncertain());
        failure.put("reasonCode", "GRAFANA_READBACK_UNVERIFIED_DO_NOT_RETRY");
        failure.put("outcomeUnknown", true);
        var unknown = new AgentTaskEvidence();
        unknown.observe(
                "unknown",
                "grafana.dashboard_save",
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.FAILED,
                args,
                JsonUtil.toJson(failure),
                true,
                hash);
        assertTrue(unknown.uncertain());
        assertFalse(unknown.completes(goal(7)));
    }
}
