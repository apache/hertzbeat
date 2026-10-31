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

package org.apache.hertzbeat.ai.gateway.tool.application;

import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.service.ConditionalDashboardService;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Fixed Grafana domain operations. Both mutations retain explicit admin approval even in FULL mode.
 */
@Service
public class AgentGrafanaToolService {
    private final ConditionalDashboardService nativeService;
    private final DashboardService bindings;
    private final MonitorService monitors;
    private final GrafanaProperties properties;

    public AgentGrafanaToolService(
            ConditionalDashboardService nativeService,
            DashboardService bindings,
            MonitorService monitors,
            GrafanaProperties properties) {
        this.nativeService = nativeService;
        this.bindings = bindings;
        this.monitors = monitors;
        this.properties = properties;
    }

    @Tool(
            name = "grafana.dashboard_preview",
            description =
                    "Preview exactly one create/update/delete for a Grafana dashboard bound to an"
                        + " existing monitorId. Operation create/update/delete is case-insensitive."
                        + " Save JSON <=64KiB, <=20 panels, no server-owned identity, org, folder,"
                        + " permission fields or credential values. UPDATE REPLACES THE ENTIRE"
                        + " supplied dashboard, including panels; read dashboard_source to preserve"
                        + " other fields. Current expectedUid/version are required for"
                        + " update/delete. Native provider validation remains pending. DELETE"
                        + " checks a snapshot but has no atomic remote version precondition."
                        + " Neither preview nor FULL mode approves these dangerous operations. No"
                        + " URL, token or service account inputs.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> preview(
            String operation,
            Long monitorId,
            @ToolParam(required = false) String dashboardJson,
            @ToolParam(required = false) String expectedUid,
            @ToolParam(required = false) Long expectedVersion) {
        var scope = scope("grafana.dashboard_preview", false);
        var draft =
                draft(
                        scope,
                        "grafana.dashboard_preview",
                        operation,
                        monitorId,
                        dashboardJson,
                        expectedUid,
                        expectedVersion);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("previewVersion", "grafana-dashboard-preview.v1");
        result.put("monitorId", monitorId);
        result.put("operation", draft.operation());
        result.put("persisted", false);
        result.put("inputHash", scope.getLedgerCall().getInputHash());
        result.put("previewHash", draft.previewHash());
        result.put("definitionHash", draft.definitionHash());
        result.put("nativeDomainValidationPending", true);
        result.put("fullReplacement", "update".equals(draft.operation()));
        result.put("remoteDeleteAtomicVersionPrecondition", false);
        result.put("requiresExplicitAdminApproval", true);
        try {
            enabled();
            checkBinding(draft);
            if (!"delete".equals(draft.operation())) requireMonitor(monitorId);
            if (!"create".equals(draft.operation())) {
                var snapshot = snapshot(monitorId, expectedUid, expectedVersion);
                if ("update".equals(draft.operation())) editable(snapshot);
            }
            result.put("valid", true);
        } catch (RuntimeException blocked) {
            result.put("valid", false);
            result.put("reasonCode", AgentGrafanaFailureProof.safeReason(blocked));
        }
        return result;
    }

    @Tool(
            name = "grafana.dashboard_source",
            description =
                    "Read an exact bound Grafana UID/version from the configured integration for"
                        + " native JSON authoring. Removes only server-owned id/uid/version and"
                        + " returns their revision separately. No credential-bearing, oversized or"
                        + " transport-redacted editable source is returned. Requires admin; cannot"
                        + " read an arbitrary external URL or unbound UID. A source is metadata,"
                        + " never rendering/data health.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> source(Long monitorId, String expectedUid, Long expectedVersion) {
        var scope = scope("grafana.dashboard_source", false);
        if (monitorId == null
                || monitorId <= 0
                || expectedUid == null
                || !expectedUid.matches("[A-Za-z0-9_-]{1,40}")
                || expectedVersion == null
                || expectedVersion < 1)
            throw new IllegalArgumentException(
                    "Exact positive monitorId, UID and version are required");
        if (!AgentToolPayloadHasher.normalizedArgumentsHash(
                        Map.of(
                                "monitorId",
                                monitorId,
                                "expectedUid",
                                expectedUid,
                                "expectedVersion",
                                expectedVersion))
                .equals(scope.getLedgerCall().getInputHash()))
            throw new IllegalArgumentException("Grafana source arguments mismatch");
        try {
            var snapshot = snapshot(monitorId, expectedUid, expectedVersion);
            var source = editable(snapshot);
            return Map.of(
                    "monitorId",
                    monitorId,
                    "uid",
                    expectedUid,
                    "version",
                    expectedVersion,
                    "available",
                    true,
                    "dashboardJson",
                    source,
                    "definitionHash",
                    GatewayText.sha256(source));
        } catch (RuntimeException blocked) {
            return Map.of(
                    "available", false, "reasonCode", AgentGrafanaFailureProof.safeReason(blocked));
        }
    }

    @Tool(
            name = "grafana.dashboard_save",
            description =
                    "Create or UPDATE REPLACE exactly one bound Grafana dashboard after identical"
                        + " dashboard_preview and explicit admin approval. FULL mode does not"
                        + " bypass approval. Operation create/update is case-insensitive;"
                        + " dashboardJson contains complete replacement including all intended"
                        + " preserved panels. Target resourceType grafana_dashboard,"
                        + " resourceIds=[monitorId], expectedCount=1. Native optimistic version"
                        + " checking and an independent GET readback are required for verification."
                        + " A provider acknowledgment alone is not success. Unknown outcomes must"
                        + " not be retried automatically.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput save(
            String operation,
            Long monitorId,
            String dashboardJson,
            @ToolParam(required = false) String expectedUid,
            @ToolParam(required = false) Long expectedVersion,
            String previewHash) {
        var scope = scope("grafana.dashboard_save", true);
        var draft =
                draft(
                        scope,
                        "grafana.dashboard_save",
                        operation,
                        monitorId,
                        dashboardJson,
                        expectedUid,
                        expectedVersion);
        requirePreview(draft, previewHash);
        boolean wrote = false;
        try {
            enabled();
            requireMonitor(monitorId);
            if ("update".equals(draft.operation()))
                editable(snapshot(monitorId, expectedUid, expectedVersion));
            var saved =
                    nativeService.save(
                            monitorId,
                            dashboardJson,
                            expectedUid,
                            expectedVersion,
                            scope.getRequest().getExecutionGuard());
            wrote = true;
            String uid =
                    "create".equals(draft.operation()) ? "hb-monitor-" + monitorId : expectedUid;
            if (!monitorId.equals(saved.monitorId())
                    || !uid.equals(saved.uid())
                    || saved.version() < 1
                    || !saved.remoteWriteConfirmed()
                    || !saved.localBindingSaved()
                    || saved.automaticRetrySafe()
                    || "update".equals(draft.operation()) && saved.version() != expectedVersion + 1)
                throw unverified();
            String readback = editable(snapshot(monitorId, uid, saved.version()));
            if (!draft.matchesSaved(readback)) throw unverified();
            var result = receipt(scope, draft, "grafana.dashboard_save", uid, saved.version());
            result.put("readbackHash", GatewayText.sha256(readback));
            result.put("localBindingRemoved", false);
            result.put("remoteDashboardRemoved", false);
            return success(result);
        } catch (RuntimeException failure) {
            return failure(scope, draft, "grafana.dashboard_save", failure, wrote);
        }
    }

    @Tool(
            name = "grafana.dashboard_delete",
            description =
                    "Destructively remove exactly one approved monitor Grafana binding with current"
                        + " expectedUid/version and identical delete previewHash. Always needs"
                        + " explicit admin approval, including FULL mode. Shared UIDs detach this"
                        + " binding only; otherwise native DELETE follows a version snapshot, which"
                        + " is NOT atomic remote CAS. Exact local absence and, when remotely"
                        + " deleted, a following authoritative 404 must verify completion."
                        + " 403/timeout is never absence. Do not retry an unknown outcome.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput delete(
            Long monitorId, String expectedUid, Long expectedVersion, String previewHash) {
        var scope = scope("grafana.dashboard_delete", true);
        var draft =
                draft(
                        scope,
                        "grafana.dashboard_delete",
                        "delete",
                        monitorId,
                        null,
                        expectedUid,
                        expectedVersion);
        requirePreview(draft, previewHash);
        boolean wrote = false;
        try {
            enabled();
            var removed =
                    nativeService.delete(
                            monitorId,
                            expectedUid,
                            expectedVersion,
                            scope.getRequest().getExecutionGuard());
            wrote = true;
            if (!monitorId.equals(removed.monitorId())
                    || !expectedUid.equals(removed.uid())
                    || !removed.localBindingRemoved()
                    || removed.atomicRemoteVersionPrecondition()
                    || bindings.getDashboardByMonitorId(monitorId) != null
                    || removed.remoteDashboardRemoved() && !nativeService.verifyAbsent(expectedUid))
                throw unverified();
            var result =
                    receipt(scope, draft, "grafana.dashboard_delete", expectedUid, expectedVersion);
            result.put("localBindingRemoved", true);
            result.put("remoteDashboardRemoved", removed.remoteDashboardRemoved());
            return success(result);
        } catch (RuntimeException failure) {
            return failure(scope, draft, "grafana.dashboard_delete", failure, wrote);
        }
    }

    private AgentToolExecutionContext scope(String tool, boolean write) {
        var scope = AgentToolContextSupport.invocation();
        var request = scope.getRequest();
        var actor = request.getActor();
        if (!tool.equals(request.getToolName())
                || actor == null
                || !"user".equals(actor.getType())
                || actor.getRoles() == null
                || !actor.getRoles().contains("admin")
                || request.getWorkspaceId() == null
                || !request.getWorkspaceId().equals(AuthTokenRequestContext.currentWorkspaceId())
                || !request.getExecutionGuard().getAsBoolean()
                || !AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments())
                        .equals(scope.getLedgerCall().getInputHash()))
            throw new IllegalStateException("Grafana trusted scope or input changed");
        if (write
                && (!"APPROVED".equals(request.getApprovalStatus())
                        || !"APPROVED".equals(scope.getLedgerCall().getApprovalStatus())))
            throw new IllegalStateException(
                    "Explicit admin approval is required for this exact Grafana operation");
        return scope;
    }

    private AgentGrafanaDraft draft(
            AgentToolExecutionContext scope,
            String tool,
            String operation,
            Long id,
            String json,
            String uid,
            Long version) {
        var draft = AgentGrafanaDraft.fromArguments(tool, scope.getRequest().getArguments());
        if (operation == null
                || !operation.strip().equalsIgnoreCase(draft.operation())
                || !java.util.Objects.equals(id, draft.monitorId())
                || !java.util.Objects.equals(json, draft.dashboardJson())
                || !java.util.Objects.equals(uid, draft.expectedUid())
                || !java.util.Objects.equals(version, draft.expectedVersion()))
            throw new IllegalArgumentException("Grafana typed arguments changed");
        return draft;
    }

    private void requirePreview(AgentGrafanaDraft draft, String hash) {
        if (!draft.previewHash().equals(hash))
            throw new IllegalArgumentException("Grafana draft differs from exact preview");
    }

    private void enabled() {
        if (!properties.enabled()) throw new IllegalStateException("GRAFANA_INTEGRATION_DISABLED");
    }

    private void requireMonitor(Long id) {
        try {
            var monitor = monitors.getMonitor(id);
            if (monitor == null || !id.equals(monitor.getId())) throw new IllegalStateException();
        } catch (RuntimeException unavailable) {
            throw new IllegalStateException("GRAFANA_MONITOR_NOT_AVAILABLE");
        }
    }

    private void checkBinding(AgentGrafanaDraft draft) {
        var current = bindings.getDashboardByMonitorId(draft.monitorId());
        if ("create".equals(draft.operation())) {
            if (current != null) throw new IllegalStateException("GRAFANA_BINDING_ALREADY_EXISTS");
        } else if (current == null
                || !draft.expectedUid().equals(current.getUid())
                || !draft.expectedVersion().equals(current.getVersion()))
            throw new IllegalStateException("GRAFANA_BINDING_VERSION_MISMATCH");
    }

    private ConditionalDashboardService.Snapshot snapshot(Long id, String uid, Long version) {
        var snapshot = nativeService.inspect(id, uid, version);
        if (snapshot == null
                || !id.equals(snapshot.monitorId())
                || !uid.equals(snapshot.uid())
                || version.longValue() != snapshot.version())
            throw new IllegalStateException("GRAFANA_SNAPSHOT_INVALID");
        return snapshot;
    }

    private String editable(ConditionalDashboardService.Snapshot snapshot) {
        try {
            Map<String, Object> document = JsonUtil.fromJson(snapshot.dashboardJson(), Map.class);
            if (!snapshot.uid().equals(document.get("uid"))
                    || new java.math.BigDecimal(document.get("version").toString()).longValueExact()
                            != snapshot.version()
                    || new java.math.BigDecimal(document.get("id").toString()).longValueExact() < 1)
                throw new IllegalArgumentException();
            document.remove("id");
            document.remove("uid");
            document.remove("version");
            String json = JsonUtil.toJson(document);
            AgentGrafanaDraft.fromArguments(
                    "grafana.dashboard_preview",
                    Map.of(
                            "operation",
                            "update",
                            "monitorId",
                            snapshot.monitorId(),
                            "dashboardJson",
                            json,
                            "expectedUid",
                            snapshot.uid(),
                            "expectedVersion",
                            snapshot.version()));
            String encoded = JsonUtil.toJson(Map.of("dashboardJson", json));
            if (!encoded.equals(GatewayText.redactSecrets(encoded)))
                throw new IllegalArgumentException();
            return json;
        } catch (RuntimeException unsafe) {
            throw new IllegalStateException("GRAFANA_NATIVE_SECURE_EDITOR_REQUIRED");
        }
    }

    private Map<String, Object> receipt(
            AgentToolExecutionContext scope,
            AgentGrafanaDraft draft,
            String tool,
            String uid,
            long version) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("receiptVersion", "grafana-dashboard-mutation.v1");
        result.put("toolName", tool);
        result.put("monitorId", draft.monitorId());
        result.put("uid", uid);
        result.put("version", version);
        result.put(
                "previousVersion", draft.expectedVersion() == null ? 0L : draft.expectedVersion());
        result.put("operation", draft.operation().toUpperCase(java.util.Locale.ROOT));
        result.put("definitionHash", draft.definitionHash());
        result.put("title", draft.title());
        result.put("previewHash", draft.previewHash());
        result.put("inputHash", scope.getLedgerCall().getInputHash());
        result.put("verified", true);
        result.put("automaticRetrySafe", false);
        result.put("atomicRemoteVersionPrecondition", false);
        return result;
    }

    private AgentToolOutput success(Map<String, Object> output) {
        return AgentToolOutput.builder()
                .status(AgentToolStatus.SUCCEEDED)
                .modelContent(JsonUtil.toJson(output))
                .build();
    }

    private AgentToolOutput failure(
            AgentToolExecutionContext scope,
            AgentGrafanaDraft draft,
            String tool,
            RuntimeException failure,
            boolean wrote) {
        String code = AgentGrafanaFailureProof.safeReason(failure);
        boolean unknown = wrote || !AgentGrafanaFailureProof.definitelyNoWrite(code);
        return AgentToolOutput.builder()
                .status(AgentToolStatus.FAILED)
                .errorMessage(code)
                .modelContent(
                        JsonUtil.toJson(
                                Map.of(
                                        "failureVersion",
                                        "grafana-dashboard-failure.v1",
                                        "toolName",
                                        tool,
                                        "monitorId",
                                        draft.monitorId(),
                                        "operation",
                                        draft.operation(),
                                        "inputHash",
                                        scope.getLedgerCall().getInputHash(),
                                        "reasonCode",
                                        code,
                                        "outcomeUnknown",
                                        unknown,
                                        "verified",
                                        false,
                                        "automaticRetrySafe",
                                        false)))
                .build();
    }

    private IllegalStateException unverified() {
        return new IllegalStateException("GRAFANA_READBACK_UNVERIFIED_DO_NOT_RETRY");
    }
}
