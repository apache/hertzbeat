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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskStatus;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Native bounded JSON imports with honest acceptance/verification boundaries and no automatic
 * retry.
 */
@Service
public class AgentJsonImportToolService {
    private final MonitorService monitors;
    private final AlertDefineService alerts;

    public AgentJsonImportToolService(MonitorService monitors, AlertDefineService alerts) {
        this.monitors = monitors;
        this.alerts = alerts;
    }

    @Tool(
            name = "monitor.import_preview_json",
            description =
                    "Validate a non-secret native JSON monitor import document without queuing or"
                        + " writing. Maximum 20 unique entries and 64 KiB. Root is an array of"
                        + " {monitor:{name,app,host,intervals,status,description,labels,annotations,scheduleType,cronExpression,collector},params:[{field,type,value}]}."
                        + " No ids, file paths, credentials or Grafana operations. Returns exact"
                        + " previewHash. Native domain validation still occurs during import.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorPreview(String content) {
        return preview(AgentJsonImportDocument.parse(content, true));
    }

    @Tool(
            name = "alert_rule.import_preview_json",
            description =
                    "Validate native JSON alert-rule import shape without writing:"
                        + " [{alertDefine:{name,type,datasource,expr,period,times,labels,annotations,template,enable,queryLanguage}}]."
                        + " Maximum 20 unique non-secret rules and 64 KiB; enable must be explicit."
                        + " No ids. Native domain validation occurs on submission.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> alertPreview(String content) {
        return preview(AgentJsonImportDocument.parse(content, false));
    }

    @Tool(
            name = "monitor.import_submit_json",
            description =
                    "Submit exactly previewed non-secret native JSON monitor import through the"
                        + " existing manager service. Maximum 20 entries. Native import is"
                        + " asynchronous and cannot be cancelled once queued; acceptance is NOT"
                        + " completion. Check monitor.import_status, then verify created monitors."
                        + " History is process-local. Partial/unknown outcomes must not be"
                        + " automatically resubmitted; this operation has no cross-run idempotency"
                        + " key. Uses trusted workspace and normal approval.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorSubmit(String content, String previewHash) {
        var document = verified(content, previewHash, true);
        guard();
        var task = monitors.importConfig(new AgentInlineImportFile(document.bytes()));
        if (task == null || task.taskId() == null)
            throw new IllegalStateException("Native import outcome is unknown; do not retry");
        return Map.of(
                "taskId",
                task.taskId(),
                "status",
                task.status().name(),
                "accepted",
                task.status() != ImportTaskStatus.FAILED,
                "completed",
                task.status() == ImportTaskStatus.COMPLETED,
                "verified",
                false,
                "requestedCount",
                document.names().size(),
                "safeToResubmit",
                false,
                "readbackRequired",
                true,
                "historyDurable",
                false);
    }

    @Tool(
            name = "alert_rule.import_submit_json",
            description =
                    "Import exactly previewed bounded non-secret JSON alert rules using native"
                        + " validation and import. Native import may write some rules before"
                        + " failing; never automatically retry. A successful return is not verified"
                        + " creation: read alert_rule.list/get for each exact requested name."
                        + " Maximum 20 entries. Does not send a test notification. Enabled rules"
                        + " follow the user's explicit enable setting and normal approval.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> alertSubmit(String content, String previewHash) {
        var document = verified(content, previewHash, false);
        guard();
        try {
            alerts.importConfig(new AgentInlineImportFile(document.bytes()));
        } catch (Exception failed) {
            throw new IllegalStateException(
                    "Native rule import may have partial effects; inspect exact names and do not"
                        + " retry automatically");
        }
        return Map.of(
                "submittedCount",
                document.names().size(),
                "names",
                document.names(),
                "verified",
                false,
                "readbackRequired",
                true,
                "safeToResubmit",
                false);
    }

    private AgentJsonImportDocument.Document verified(
            String content, String previewHash, boolean monitor) {
        var document = AgentJsonImportDocument.parse(content, monitor);
        if (!document.hash().equals(previewHash))
            throw new IllegalArgumentException("Import differs from exact preview");
        return document;
    }

    private Map<String, Object> preview(AgentJsonImportDocument.Document document) {
        return Map.of(
                "format",
                "native-json",
                "count",
                document.names().size(),
                "names",
                document.names(),
                "previewHash",
                document.hash(),
                "persisted",
                false,
                "nativeDomainValidationPending",
                true);
    }

    private void guard() {
        var request = AgentToolContextSupport.invocation().getRequest();
        String workspace = request.getWorkspaceId();
        if (workspace == null
                || workspace.isBlank()
                || !workspace.equals(AuthTokenRequestContext.currentWorkspaceId()))
            throw new IllegalArgumentException("Trusted import workspace mismatch");
        if (!request.getExecutionGuard().getAsBoolean())
            throw new IllegalStateException("Import was stopped before native submission");
    }
}
