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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionOperation;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionValidationRequest;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionWriteRequest;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.Map;

/** Exact native template commands; saved raw YAML is never returned to the model. */
@Service
public class AgentMonitorDefinitionWriteToolService {
    private final MonitorDefinitionService definitions;

    public AgentMonitorDefinitionWriteToolService(MonitorDefinitionService definitions) {
        this.definitions = definitions;
    }

    @Tool(
            name = "monitor.definition_preview",
            description =
                    "Validate a complete NEW or updated monitor template YAML before writing."
                        + " Credential values are forbidden; declare secret fields/placeholders and"
                        + " use the native secure editor for values. Exact app must match YAML. For"
                        + " update read current revision first; preview does not save or execute"
                        + " collectors. Returns content-bound previewHash, never raw saved YAML.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> preview(
            @ToolParam(description = "create or update.") String operation,
            @ToolParam(description = "Exact template app identifier, not a numeric monitor ID.")
                    String app,
            @ToolParam(description = "Full bounded non-secret native YAML, at most 64KiB.")
                    String definition,
            @ToolParam(
                            required = false,
                            description =
                                    "Current unquoted 64-character revision; required only for"
                                            + " update.")
                    String revision) {
        String hash = AgentMonitorDefinitionDraft.previewHash(operation, app, revision, definition);
        validate(operation, app, revision, definition);
        return Map.of(
                "previewVersion",
                "monitor-definition-preview.v1",
                "operation",
                operation.toUpperCase(java.util.Locale.ROOT),
                "app",
                app,
                "definitionHash",
                AgentMonitorDefinitionDraft.inspect(definition).definitionHash(),
                "previewHash",
                hash,
                "valid",
                true,
                "persisted",
                false,
                "inputHash",
                AgentToolContextSupport.invocation().getLedgerCall().getInputHash());
    }

    @Tool(
            name = "monitor.definition_create",
            description =
                    "Create one new monitor template using the exact validated non-secret YAML and"
                        + " previewHash from definition_preview. Native validation/conflict checks"
                        + " retained; creation does not instantiate monitors or prove collection."
                        + " Never repeat after an uncertain result; inspect native definition"
                        + " metadata.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> create(
            @ToolParam(description = "Exact new app identifier.") String app,
            @ToolParam(description = "Exact previewed YAML.") String definition,
            @ToolParam(description = "Exact previewHash from prior preview.") String previewHash) {
        requirePreview("create", app, null, definition, previewHash);
        validate("create", app, null, definition);
        definitions.create(new MonitorDefinitionWriteRequest(definition), "en-US");
        return readback("monitor.definition_create", "CREATE", app, definition);
    }

    @Tool(
            name = "monitor.definition_update",
            description =
                    "Update exactly one template using its current revision and identical previewed"
                            + " non-secret YAML. This can affect monitors using that template and"
                            + " requires explicit approval. Native conditional revision and target"
                            + " identity checks retained; never repeat an uncertain write.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> update(
            @ToolParam(description = "Exact existing template app.") String app,
            @ToolParam(description = "Unquoted current 64-character revision.") String revision,
            @ToolParam(description = "Exact previewed complete non-secret YAML.") String definition,
            @ToolParam(description = "Exact previewHash from prior update preview.")
                    String previewHash) {
        requirePreview("update", app, revision, definition, previewHash);
        validate("update", app, revision, definition);
        definitions.update(
                app,
                "\"" + revision + "\"",
                new MonitorDefinitionWriteRequest(definition),
                "en-US");
        return readback("monitor.definition_update", "UPDATE", app, definition);
    }

    private void requirePreview(
            String operation, String app, String revision, String definition, String supplied) {
        if (!AgentMonitorDefinitionDraft.previewHash(operation, app, revision, definition)
                .equals(supplied)) {
            throw new IllegalArgumentException(
                    "Template preview no longer matches the exact command");
        }
    }

    private void validate(String operation, String app, String revision, String definition) {
        var result =
                definitions.validate(
                        new MonitorDefinitionValidationRequest(
                                MonitorDefinitionOperation.fromValue(operation),
                                "create".equals(operation) ? null : app,
                                definition));
        if (!result.valid() || !app.equals(result.app())) {
            throw new IllegalArgumentException("Native template validation failed");
        }
        if ("update".equals(operation)
                && !revision.equals(definitions.detail(app, "en-US").revision())) {
            throw new IllegalArgumentException(
                    "Template revision changed; preview and approve again");
        }
    }

    private Map<String, Object> readback(
            String tool, String operation, String app, String definition) {
        var current = definitions.detail(app, "en-US");
        var draft = AgentMonitorDefinitionDraft.inspect(definition);
        if (!app.equals(current.app())
                || current.revision() == null
                || !current.revision().matches("[a-f0-9]{64}")
                || !draft.definitionHash()
                        .equals(
                                AgentMonitorDefinitionDraft.inspect(current.definition())
                                        .definitionHash())) {
            throw new IllegalStateException(
                    "Template write outcome requires native verification; do not retry");
        }
        return Map.of(
                "receiptVersion",
                "monitor-definition-mutation.v1",
                "toolName",
                tool,
                "operation",
                operation,
                "app",
                app,
                "revision",
                current.revision(),
                "definitionHash",
                draft.definitionHash(),
                "verified",
                true,
                "inputHash",
                AgentToolContextSupport.invocation().getLedgerCall().getInputHash());
    }
}
