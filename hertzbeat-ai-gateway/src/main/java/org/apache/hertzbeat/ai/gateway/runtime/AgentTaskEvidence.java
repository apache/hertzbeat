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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.json.JsonMapper;

import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Current-run durable facts, with observation, mutation and handoff meanings kept separate. */
final class AgentTaskEvidence {
    enum Kind {
        DISCOVERY,
        VALIDATION,
        OBSERVATION,
        MUTATION_RECEIPT,
        VERIFIED_POSTCONDITION,
        NATIVE_HANDOFF,
        UNKNOWN
    }

    record Fact(String id, Kind kind, String tool, Map<String, Object> values) {}

    private record Receipt(
            String id,
            String name,
            String app,
            String argumentsHash,
            AgentTaskAssessment.Operation operation,
            org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt.Target
                    target) {}

    private record GrafanaReceipt(
            String tool, Map<String, Object> args, Map<String, Object> data) {}

    private final Map<Long, GrafanaReceipt> grafanaReceipts = new LinkedHashMap<>();
    private final Set<String> grafanaPreviews = new java.util.HashSet<>();
    private final Map<String, String> grafanaBlockers = new LinkedHashMap<>();
    private Map<String, Object> grafanaFailure;

    private record LabelReceipt(String tool, Map<String, Object> args, Map<String, Object> data) {}

    private final Map<Long, LabelReceipt> labelReceipts = new LinkedHashMap<>();
    private final Map<String, LabelReceipt> noticeReceipts = new LinkedHashMap<>();

    private final Map<String, LabelReceipt> configurationReceipts = new LinkedHashMap<>();

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Set<String> DISCOVERY =
            Set.of("tool.search", "skill.load", "monitor.types", "monitor.type_params");
    private final List<Fact> facts = new ArrayList<>();
    private final Map<String, Receipt> receipts = new LinkedHashMap<>();
    private final Set<String> verified = new java.util.HashSet<>();
    private final Set<String> readbackAttempted = new java.util.HashSet<>();
    private final Set<String> calls = new java.util.HashSet<>();
    private boolean mutationAttempted;
    private boolean uncertain;
    private boolean denied;
    private boolean waiting;
    private boolean failed;
    private boolean websiteTypeDiscovered;
    private boolean websiteParametersDiscovered;
    private final Map<String, String> websiteDefaults = new LinkedHashMap<>();
    private final Set<String> websiteRequired = new java.util.HashSet<>();
    private final Set<String> websiteProbes = new java.util.HashSet<>();
    private final Set<String> definitionPreviews = new java.util.HashSet<>();
    private final Map<String, Map<String, Object>> definitionReceipts = new LinkedHashMap<>();
    private Map<String, Object> batchStatusReceipt;
    private final Map<String, LabelReceipt> inlineCollectionReceipts = new LinkedHashMap<>();
    private final java.util.Set<String> instrumentationBlockers = new java.util.LinkedHashSet<>();

    void observe(
            String callId,
            String tool,
            AgentToolRisk risk,
            AgentToolStatus status,
            Map<String, Object> args,
            String output,
            boolean durable) {
        observe(callId, tool, risk, status, args, output, durable, null);
    }

    void observe(
            String callId,
            String tool,
            AgentToolRisk risk,
            AgentToolStatus status,
            Map<String, Object> args,
            String output,
            boolean durable,
            String trustedHash) {
        if (callId == null || tool == null || !calls.add(callId)) {
            return;
        }
        if ("monitor.get".equals(tool) && args != null && positive(args.get("monitorId")) != null) {
            readbackAttempted.add(positive(args.get("monitorId")));
        }
        boolean validation = AgentMonitorMutationSemantics.isValidationTool(tool);
        boolean mutation =
                (risk == AgentToolRisk.CHANGE || risk == AgentToolRisk.DANGEROUS) && !validation;
        if (mutation
                && AgentMonitorMutationSemantics.supports(tool)
                && !"monitor.create".equals(tool)) {
            Set<String> touched = mutationIds(tool, args);
            if (!touched.isEmpty()) {
                verified.removeAll(touched);
            } else if (!durable || status != AgentToolStatus.SUCCEEDED) {
                verified.clear();
            }
        }
        // A missing durable transcript must never erase an attempted mutation or authorize its
        // retry.
        mutationAttempted |= mutation;
        denied |= mutation && status == AgentToolStatus.DENIED;
        waiting |= (mutation || validation) && status == AgentToolStatus.WAITING_APPROVAL;
        failed |= mutation && status == AgentToolStatus.FAILED;
        uncertain |=
                mutation
                        && (status == null
                                || status == AgentToolStatus.RUNNING
                                || status == AgentToolStatus.SUCCEEDED && !durable);
        if (validation && args != null && args.get("parameters") instanceof Map<?, ?> parameters) {
            Map<String, String> previous = new LinkedHashMap<>(websiteDefaults);
            parameters.forEach(
                    (key, value) -> previous.put(String.valueOf(key), String.valueOf(value)));
            websiteProbes.remove(
                    probeKey(
                            previous,
                            args.get("collector") == null
                                    ? ""
                                    : String.valueOf(args.get("collector"))));
        }
        if (mutation
                && AgentGrafanaMutationSemantics.supports(tool)
                && status == AgentToolStatus.FAILED) {
            var failure = object(output);
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            boolean noWrite =
                    durable
                            && failure != null
                            && org.apache.hertzbeat.ai.gateway.tool.application
                                    .AgentGrafanaFailureProof.matchesKnownNoWrite(
                                    tool, args, failure, hash);
            uncertain |= !noWrite;
            String code =
                    failure != null
                                    && failure.get("reasonCode") instanceof String value
                                    && org.apache.hertzbeat.ai.gateway.tool.application
                                            .AgentGrafanaFailureProof.definitelyNoWrite(value)
                            ? value
                            : "GRAFANA_OPERATION_UNVERIFIED_DO_NOT_RETRY";
            if (failure != null
                    && "GRAFANA_READBACK_UNVERIFIED_DO_NOT_RETRY".equals(failure.get("reasonCode")))
                code = "GRAFANA_READBACK_UNVERIFIED_DO_NOT_RETRY";
            grafanaFailure = Map.of("reasonCode", code, "outcomeUnknown", !noWrite);
        }
        if (mutation
                && (AgentLabelMutationSemantics.supports(tool)
                        || AgentNoticeMutationSemantics.supports(tool)
                        || AgentConfigurationMutationSemantics.supports(tool))
                && status == AgentToolStatus.FAILED) uncertain = true;
        if (!durable || status != AgentToolStatus.SUCCEEDED) {
            return;
        }
        if ("monitor.type_params".equals(tool)
                && args != null
                && "website".equalsIgnoreCase(String.valueOf(args.get("app")))) {
            try {
                Object definitions = JSON.readValue(output, Object.class);
                if (definitions instanceof List<?> list && list.size() <= 100) {
                    websiteDefaults.clear();
                    websiteRequired.clear();
                    websiteProbes.clear();
                    Set<String> found = new java.util.HashSet<>();
                    for (Object value : list) {
                        if (!(value instanceof Map<?, ?> field)
                                || !(field.get("field") instanceof String name)
                                || !org.apache.hertzbeat.ai.gateway.tool.monitor
                                        .AgentMonitorMutationReceipt.WEBSITE_FIELDS
                                        .contains(name)) {
                            continue;
                        }
                        found.add(name);
                        if (Boolean.TRUE.equals(field.get("required"))) {
                            websiteRequired.add(name);
                        }
                        if (field.get("defaultValue") != null
                                && !(field.get("defaultValue") instanceof Map<?, ?>)
                                && !(field.get("defaultValue") instanceof List<?>)) {
                            websiteDefaults.put(name, String.valueOf(field.get("defaultValue")));
                        }
                    }
                    websiteParametersDiscovered = found.containsAll(Set.of("host", "port", "ssl"));
                    add(
                            callId,
                            tool,
                            Kind.DISCOVERY,
                            Map.of(
                                    "app",
                                    "website",
                                    "parametersAvailable",
                                    websiteParametersDiscovered));
                    return;
                }
            } catch (Exception malformed) {
                /* Unusable discovery cannot authorize a create. */
            }
        }
        Map<String, Object> data = object(output);
        if (data == null) {
            uncertain |= mutation;
            add(callId, tool, Kind.UNKNOWN, Map.of());
            return;
        }
        if (AgentInlineCollectionSemantics.supports(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            if (AgentInlineCollectionSemantics.receipt(args, data, hash)) {
                inlineCollectionReceipts.put(
                        String.valueOf(data.get("planId")),
                        new LabelReceipt(tool, Map.copyOf(args), Map.copyOf(data)));
                add(
                        callId,
                        tool,
                        Kind.VERIFIED_POSTCONDITION,
                        Map.of(
                                "monitorId",
                                data.get("monitorId"),
                                "planHash",
                                data.get("planHash")));
            } else {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (org.apache.hertzbeat.ai.gateway.tool.application.AgentJsonImportProof.supports(tool)) {
            if (org.apache.hertzbeat.ai.gateway.tool.application.AgentJsonImportProof.matches(
                    tool, args, data)) {
                add(
                        callId,
                        tool,
                        Kind.VALIDATION,
                        Map.of(
                                "shapeValidatedCount",
                                data.get("count"),
                                "persisted",
                                false,
                                "nativeDomainValidationPending",
                                true));
            } else {
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (validation) {
            boolean binding =
                    trustedHash != null
                            ? trustedHash.equals(data.get("inputHash"))
                            : args != null
                                    && "website".equalsIgnoreCase(String.valueOf(args.get("app")))
                                    && org.apache.hertzbeat.ai.gateway.tool.core
                                            .AgentToolPayloadHasher.normalizedArgumentsHash(args)
                                            .equals(data.get("inputHash"));
            if (binding
                    && "monitor-probe.v1".equals(data.get("probeVersion"))
                    && "website".equals(data.get("app"))
                    && Boolean.TRUE.equals(data.get("probeCompleted"))
                    && Boolean.FALSE.equals(data.get("persisted"))
                    && data.get("parameters") instanceof Map<?, ?> parameters
                    && parameters.keySet().containsAll(Set.of("host", "port", "ssl"))
                    && org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt
                            .WEBSITE_FIELDS
                            .containsAll(parameters.keySet())) {
                Map<String, String> safe = new LinkedHashMap<>();
                parameters.forEach(
                        (key, value) -> safe.put(String.valueOf(key), String.valueOf(value)));
                websiteProbes.add(
                        probeKey(safe, String.valueOf(data.getOrDefault("collector", ""))));
                add(callId, tool, Kind.VALIDATION, Map.of("app", "website", "persisted", false));
            } else {
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if ("grafana.dashboard_preview".equals(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            try {
                var draft =
                        org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft
                                .fromArguments(tool, args);
                String key = "preview:" + draft.previewHash();
                if (AgentGrafanaMutationSemantics.preview(args, data, hash)) {
                    grafanaPreviews.add(draft.previewHash());
                    grafanaBlockers.remove(key);
                    add(
                            callId,
                            tool,
                            Kind.VALIDATION,
                            Map.of(
                                    "monitorId",
                                    draft.monitorId(),
                                    "previewHash",
                                    draft.previewHash(),
                                    "persisted",
                                    false));
                } else if (Boolean.FALSE.equals(data.get("valid"))
                        && hash.equals(data.get("inputHash"))
                        && data.get("reasonCode") instanceof String code
                        && org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaFailureProof
                                .definitelyNoWrite(code)) {
                    grafanaPreviews.remove(draft.previewHash());
                    grafanaBlockers.put(key, code);
                    add(
                            callId,
                            tool,
                            Kind.NATIVE_HANDOFF,
                            Map.of("reasonCode", code, "persisted", false));
                } else add(callId, tool, Kind.UNKNOWN, Map.of());
            } catch (RuntimeException invalid) {
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (AgentConfigurationMutationSemantics.supports(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            if (mutation && AgentConfigurationMutationSemantics.verified(tool, args, data, hash)) {
                Object id = AgentConfigurationMutationSemantics.identity(tool, data);
                configurationReceipts.put(
                        tool + ":" + id,
                        new LabelReceipt(
                                tool,
                                java.util.Collections.unmodifiableMap(new LinkedHashMap<>(args)),
                                java.util.Collections.unmodifiableMap(new LinkedHashMap<>(data))));
                var fields = Map.<String, Object>of("toolName", tool, "id", id);
                add(callId, tool, Kind.MUTATION_RECEIPT, fields);
                add(callId + "/verified", tool, Kind.VERIFIED_POSTCONDITION, fields);
            } else {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (AgentNoticeMutationSemantics.supports(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            if (mutation && AgentNoticeMutationSemantics.verified(tool, args, data, hash)) {
                long id = AgentLabelMutationSemantics.id(data.get("id"));
                noticeReceipts.put(
                        tool + ":" + id,
                        new LabelReceipt(
                                tool,
                                java.util.Collections.unmodifiableMap(new LinkedHashMap<>(args)),
                                java.util.Collections.unmodifiableMap(new LinkedHashMap<>(data))));
                var fields =
                        Map.<String, Object>of(
                                "resourceType",
                                tool.startsWith("notice.rule_") ? "notice_rule" : "notice_template",
                                "id",
                                id,
                                "toolName",
                                tool);
                add(callId, tool, Kind.MUTATION_RECEIPT, fields);
                add(callId + "/verified", tool, Kind.VERIFIED_POSTCONDITION, fields);
            } else {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (AgentLabelMutationSemantics.supports(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            if (mutation && AgentLabelMutationSemantics.verified(tool, args, data, hash)) {
                long id = AgentLabelMutationSemantics.id(data.get("labelId"));
                labelReceipts.put(
                        id,
                        new LabelReceipt(
                                tool,
                                java.util.Collections.unmodifiableMap(new LinkedHashMap<>(args)),
                                Map.copyOf(data)));
                var fields =
                        Map.<String, Object>of(
                                "resourceType", "label", "labelId", id, "toolName", tool);
                add(callId, tool, Kind.MUTATION_RECEIPT, fields);
                add(callId + "/verified", tool, Kind.VERIFIED_POSTCONDITION, fields);
            } else {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (AgentGrafanaMutationSemantics.supports(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            if (mutation && AgentGrafanaMutationSemantics.verified(tool, args, data, hash)) {
                Long id = AgentGrafanaMutationSemantics.number(data.get("monitorId"));
                grafanaReceipts.put(
                        id,
                        new GrafanaReceipt(
                                tool,
                                java.util.Collections.unmodifiableMap(new LinkedHashMap<>(args)),
                                Map.copyOf(data)));
                var fields =
                        Map.<String, Object>of(
                                "resourceType",
                                "grafana_dashboard",
                                "monitorId",
                                id,
                                "uid",
                                data.get("uid"),
                                "operation",
                                data.get("operation"),
                                "version",
                                data.get("version"));
                add(callId, tool, Kind.MUTATION_RECEIPT, fields);
                add(callId + "/verified", tool, Kind.VERIFIED_POSTCONDITION, fields);
            } else {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if ("monitor.definition_preview".equals(tool)) {
            try {
                String preview =
                        org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft
                                .previewHash(
                                        (String) args.get("operation"),
                                        (String) args.get("app"),
                                        (String) args.get("revision"),
                                        (String) args.get("definition"));
                if ("monitor-definition-preview.v1".equals(data.get("previewVersion"))
                        && Boolean.TRUE.equals(data.get("valid"))
                        && Boolean.FALSE.equals(data.get("persisted"))
                        && preview.equals(data.get("previewHash"))
                        && org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                .normalizedArgumentsHash(args)
                                .equals(data.get("inputHash"))) {
                    definitionPreviews.add(preview);
                    add(
                            callId,
                            tool,
                            Kind.VALIDATION,
                            Map.of(
                                    "resourceType",
                                    "monitor_definition",
                                    "app",
                                    args.get("app"),
                                    "previewHash",
                                    preview,
                                    "persisted",
                                    false));
                } else {
                    add(callId, tool, Kind.UNKNOWN, Map.of());
                }
            } catch (RuntimeException invalid) {
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (AgentDefinitionMutationSemantics.supports(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            if (mutation && AgentDefinitionMutationSemantics.verified(tool, args, data, hash)) {
                String app = (String) data.get("app");
                definitionReceipts.put(app, Map.copyOf(data));
                add(
                        callId,
                        tool,
                        Kind.MUTATION_RECEIPT,
                        Map.of(
                                "resourceKey",
                                app,
                                "resourceType",
                                "monitor_definition",
                                "operation",
                                data.get("operation"),
                                "revision",
                                data.get("revision")));
                add(
                        callId + "/verified",
                        tool,
                        Kind.VERIFIED_POSTCONDITION,
                        Map.of(
                                "resourceKey",
                                app,
                                "resourceType",
                                "monitor_definition",
                                "operation",
                                data.get("operation"),
                                "revision",
                                data.get("revision"),
                                "definitionHash",
                                data.get("definitionHash")));
            } else {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if ("native_handoff".equals(data.get("delivery"))
                && "NOT_EXECUTED".equals(data.get("executionStatus"))) {
            add(callId, tool, Kind.NATIVE_HANDOFF, Map.of("executionStatus", "NOT_EXECUTED"));
            return;
        }
        if (DISCOVERY.contains(tool) && !mutation) {
            if ("monitor.types".equals(tool)) {
                websiteTypeDiscovered = data.containsKey("website");
            }
            add(callId, tool, Kind.DISCOVERY, Map.of());
            return;
        }
        if ("monitor.create_batch".equals(tool)
                && "monitor-bulk.v1".equals(data.get("batchVersion"))) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            var contract = AgentMonitorMutationSemantics.parse("monitor.create_batch", data, hash);
            if (contract != null && AgentMonitorMutationSemantics.matchesRequest(contract, args)) {
                for (var target : contract.targets()) {
                    if (!(data.get("batch") instanceof Map<?, ?> batch)
                            || !(batch.get("items") instanceof List<?> results)
                            || results.stream()
                                    .noneMatch(
                                            value ->
                                                    value instanceof Map<?, ?> item
                                                            && "VERIFIED".equals(item.get("state"))
                                                            && target.monitorId()
                                                                    .toString()
                                                                    .equals(
                                                                            String.valueOf(
                                                                                    item.get(
                                                                                            "monitorId")))
                                                            && AgentMonitorMutationSemantics.same(
                                                                    target.fields(),
                                                                    item.get("fields"))
                                                            && AgentMonitorMutationSemantics.same(
                                                                    target.parameters(),
                                                                    item.get("parameters")))) {
                        uncertain = true;
                        continue;
                    }
                    String id = target.monitorId().toString();
                    receipts.put(
                            id,
                            new Receipt(
                                    id,
                                    String.valueOf(target.fields().get("name")),
                                    "website",
                                    hash,
                                    AgentTaskAssessment.Operation.CREATE,
                                    target));
                    verified.add(id);
                    readbackAttempted.add(id);
                    add(
                            callId + "/" + id,
                            tool,
                            Kind.MUTATION_RECEIPT,
                            Map.of(
                                    "resourceId",
                                    id,
                                    "operation",
                                    "CREATE",
                                    "resourceType",
                                    "monitor"));
                    add(
                            callId + "/" + id + "/verified",
                            tool,
                            Kind.VERIFIED_POSTCONDITION,
                            Map.of(
                                    "resourceId",
                                    id,
                                    "operation",
                                    "CREATE",
                                    "resourceType",
                                    "monitor"));
                }
            }
            return;
        }
        if (mutation && AgentMonitorMutationSemantics.supports(tool)) {
            String hash =
                    trustedHash != null
                            ? trustedHash
                            : org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                    .normalizedArgumentsHash(args);
            var contract = AgentMonitorMutationSemantics.parse(tool, data, hash);
            if (contract != null
                    && (trustedHash != null
                            || AgentMonitorMutationSemantics.matchesRequest(contract, args))) {
                for (var target : contract.targets()) {
                    String id = target.monitorId().toString();
                    Receipt receipt =
                            new Receipt(
                                    id,
                                    String.valueOf(target.fields().get("name")),
                                    String.valueOf(target.fields().get("app")),
                                    hash,
                                    AgentMonitorMutationSemantics.operation(tool),
                                    target);
                    Receipt previous = receipts.put(id, receipt);
                    if (previous != null
                            && previous.operation() == receipt.operation()
                            && !previous.argumentsHash().equals(hash)) {
                        // A later deliberate update is allowed; ambiguous creation of the same id
                        // is not.
                        uncertain |= receipt.operation() == AgentTaskAssessment.Operation.CREATE;
                    }
                    verified.remove(id);
                    readbackAttempted.remove(id);
                    add(
                            callId + "/" + id,
                            tool,
                            Kind.MUTATION_RECEIPT,
                            Map.of(
                                    "resourceId",
                                    id,
                                    "operation",
                                    receipt.operation().name(),
                                    "resourceType",
                                    "monitor"));
                }
                return;
            }
            if (data.containsKey("mutation")) {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
                return;
            }
        }
        if (mutation) {
            if ("monitor.create".equals(tool)
                    && args != null
                    && positive(data.get("monitorId")) != null
                    && data.get("name") instanceof String name
                    && name.equals(args.get("name"))
                    && data.get("app") instanceof String app
                    && app.equals(args.get("app"))) {
                String id = positive(data.get("monitorId"));
                Receipt receipt =
                        new Receipt(
                                id,
                                name,
                                app,
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                                        .normalizedArgumentsHash(args),
                                AgentTaskAssessment.Operation.CREATE,
                                null);
                Receipt previous = receipts.putIfAbsent(id, receipt);
                if (previous != null && !previous.equals(receipt)) {
                    uncertain = true;
                }
                // A new mutation attempt invalidates a previous readback even when its resource id
                // is reused.
                verified.remove(id);
                readbackAttempted.remove(id);
                add(
                        callId,
                        tool,
                        Kind.MUTATION_RECEIPT,
                        Map.of("resourceId", id, "operation", "CREATE", "resourceType", "monitor"));
            } else {
                uncertain = true;
                add(callId, tool, Kind.UNKNOWN, Map.of());
            }
            return;
        }
        if (risk != AgentToolRisk.READ) {
            return;
        }
        var call =
                AgentRuntimeToolCall.builder()
                        .toolCallId(callId)
                        .toolName(tool)
                        .arguments(args == null ? Map.of() : args)
                        .build();
        var observation = new AgentReadObservationClassifier().classify(call, output);
        if (observation == null) {
            add(callId, tool, Kind.UNKNOWN, Map.of());
            return;
        }
        if ("monitor.batch_status".equals(tool) && data.get("batch") instanceof Map<?, ?> batch) {
            batchStatusReceipt = new LinkedHashMap<>();
            batch.forEach((k, v) -> batchStatusReceipt.put(String.valueOf(k), v));
        }
        if ("instrumentation-blocked-not-applied".equals(observation.kind())
                && data.get("errorCode") instanceof String code) {
            instrumentationBlockers.add(code);
        }
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("observationKind", observation.kind());
        values.put("observationCount", observation.count());
        if (AgentMonitorBulkReadSemantics.supports(tool)
                && data.get("batch") instanceof Map<?, ?> batch) {
            values.put("verifiedItems", batch.get("verified"));
            values.put("failedItems", batch.get("failed"));
            values.put("pendingItems", batch.get("pending"));
            values.put("unknownItems", batch.get("unknown"));
        }
        if (AgentBusinessMetadataReadSemantics.supports(tool) && tool.endsWith(".list")) {
            var page = AgentBusinessMetadataReadSemantics.data(tool, data);
            values.put("matchingTotal", page.get("totalElements"));
            values.put("returnedRows", observation.count());
        }
        if ("monitor.definition_catalog".equals(tool)) {
            values.put("matchingTotal", data.get("total"));
            values.put("returnedRows", observation.count());
        }
        if (AgentInstrumentationReadSemantics.supports(tool)) {
            if (data.get("total") instanceof Number total
                    && data.get("items") instanceof List<?> list) {
                values.put("matchingTotal", total);
                values.put("returnedRows", list.size());
            }
            if ("telemetry.instrumentation_detect".equals(tool)) {
                values.put("receivedSignals", data.get("receivedSignalCount"));
            }
            if ("telemetry.instrumentation_render".equals(tool)) {
                values.put("guideApplied", false);
            }
        }
        if ("monitor.query".equals(tool)) {
            values.put("matchingTotal", data.get("totalElements"));
            values.put("returnedRows", ((List<?>) data.get("content")).size());
        } else if ("logs.analysis".equals(tool)) {
            Map<String, Object> envelope = object(String.valueOf(data.get("data")));
            if (envelope != null && envelope.get("data") instanceof Map<?, ?> aggregate) {
                values.put("matchingTotal", aggregate.get("matchingTotal"));
            }
        }
        // The output is already an approved model-visible READ contract; redact again at this
        // independent boundary.
        values.put("result", GatewaySecretRedactor.redactMap(data));
        add(callId, tool, Kind.OBSERVATION, values);
        if ("monitor.get".equals(tool)) {
            Receipt receipt = receipts.get(positive(data.get("monitorId")));
            if (receipt != null
                    && receipt.target() != null
                    && AgentMonitorMutationSemantics.matchesReadback(receipt.target(), data)) {
                verified.add(receipt.id());
                add(
                        callId + "/verified",
                        tool,
                        Kind.VERIFIED_POSTCONDITION,
                        Map.of(
                                "resourceId",
                                receipt.id(),
                                "operation",
                                receipt.operation().name(),
                                "resourceType",
                                "monitor"));
            }
        }
    }

    /**
     * Called only after the existing target evaluator and durable transcript have accepted this
     * READ.
     */
    void observeVerifiedRead(String callId, String tool, String output, AgentGroundingProof proof) {
        if (proof == null
                || proof.getObservationCount() == null
                || proof.getObservationCount() < 0
                || facts.stream()
                        .anyMatch(f -> f.id().equals(callId) && f.kind() == Kind.OBSERVATION)) {
            return;
        }
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("observationKind", proof.getObservationKind());
        values.put("observationCount", proof.getObservationCount());
        Map<String, Object> data = object(output);
        if (data != null) {
            values.put("result", GatewaySecretRedactor.redactMap(data));
        }
        add(callId, tool, Kind.OBSERVATION, values);
    }

    List<Fact> facts() {
        return List.copyOf(facts);
    }

    boolean hasObservation() {
        return facts.stream().anyMatch(f -> f.kind() == Kind.OBSERVATION);
    }

    boolean mutationAttempted() {
        return mutationAttempted;
    }

    boolean uncertain() {
        return uncertain;
    }

    boolean denied() {
        return denied;
    }

    boolean waiting() {
        return waiting;
    }

    boolean failed() {
        return failed;
    }

    int receiptCount() {
        return receipts.size()
                + definitionReceipts.size()
                + grafanaReceipts.size()
                + labelReceipts.size()
                + noticeReceipts.size()
                + configurationReceipts.size()
                + inlineCollectionReceipts.size();
    }

    int verifiedCount() {
        return verified.size()
                + definitionReceipts.size()
                + grafanaReceipts.size()
                + labelReceipts.size()
                + noticeReceipts.size()
                + configurationReceipts.size()
                + inlineCollectionReceipts.size();
    }

    Map<String, Object> definitionReceipt(AgentTaskAssessment.Goal goal) {
        if (goal == null || !"monitor_definition".equals(goal.resourceType()) || !completes(goal)) {
            return null;
        }
        return definitionReceipts.values().stream().findFirst().orElse(null);
    }

    boolean alertGroupBaseline(
            AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (tool.endsWith(".create")) return true;
        for (int i = facts.size() - 1; i >= 0; i--) {
            var fact = facts.get(i);
            if (fact.kind() == Kind.OBSERVATION
                    && fact.tool().equals("alert_group.get")
                    && fact.values().get("result") instanceof Map<?, ?> result
                    && AgentAlertGroupMutationSemantics.preserves(
                            goal, tool, args, (Map<String, Object>) result)) return true;
        }
        return false;
    }

    boolean alertInhibitBaseline(
            AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (tool.endsWith(".create")) return true;
        for (int i = facts.size() - 1; i >= 0; i--) {
            var fact = facts.get(i);
            if (fact.kind() == Kind.OBSERVATION
                    && fact.tool().equals("alert_inhibit.get")
                    && fact.values().get("result") instanceof Map<?, ?> result
                    && AgentAlertInhibitMutationSemantics.preserves(
                            goal, tool, args, (Map<String, Object>) result)) return true;
        }
        return false;
    }

    boolean statusPageBaseline(
            AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (AgentStatusPageMutationSemantics.create(tool, args)) return true;
        String source =
                "status_page."
                        + org.apache.hertzbeat.ai.gateway.tool.status.AgentStatusPageWriteProof
                                .kind(tool)
                        + ".get";
        for (int i = facts.size() - 1; i >= 0; i--) {
            var fact = facts.get(i);
            if (fact.kind() == Kind.OBSERVATION
                    && source.equals(fact.tool())
                    && fact.values().get("result") instanceof Map<?, ?> result
                    && AgentStatusPageMutationSemantics.preserves(
                            goal, tool, args, (Map<String, Object>) result)) return true;
        }
        return false;
    }

    boolean sharedAssetBaseline(
            AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        if (!AgentSharedAssetMutationSemantics.needsBaseline(tool, args)) return true;
        String source =
                tool.startsWith("dashboard.")
                        ? "dashboard.list_signal_dashboards"
                        : "saved_query.list_signal_saved_views";
        for (int i = facts.size() - 1; i >= 0; i--) {
            var fact = facts.get(i);
            if (fact.kind() != Kind.OBSERVATION
                    || !source.equals(fact.tool())
                    || !(fact.values().get("result") instanceof Map<?, ?> page)
                    || !(page.get("items") instanceof List<?> rows)) continue;
            for (Object value : rows)
                if (value instanceof Map<?, ?> row
                        && AgentSharedAssetMutationSemantics.preserves(goal, tool, args, row))
                    return true;
        }
        return false;
    }

    Map<String, Object> inlineCollectionReceipt(AgentTaskAssessment.Goal goal) {
        if (inlineCollectionReceipts.size() != 1
                || !AgentInlineCollectionSemantics.permits(
                        goal, inlineCollectionReceipts.values().iterator().next().args()))
            return null;
        return inlineCollectionReceipts.values().iterator().next().data();
    }

    Map<String, Object> configurationReceipt(AgentTaskAssessment.Goal goal) {
        if (goal == null
                || !AgentConfigurationMutationSemantics.resource(goal.resourceType())
                || !completes(goal)) return null;
        var receipt = configurationReceipts.values().iterator().next();
        return Map.of(
                "toolName",
                receipt.tool(),
                "id",
                AgentConfigurationMutationSemantics.identity(receipt.tool(), receipt.data()));
    }

    Map<String, Object> noticeReceipt(AgentTaskAssessment.Goal goal) {
        if (goal == null
                || !java.util.Set.of("notice_rule", "notice_template").contains(goal.resourceType())
                || !completes(goal)) return null;
        var receipt = noticeReceipts.values().iterator().next();
        return Map.of("toolName", receipt.tool(), "id", receipt.data().get("id"));
    }

    Map<String, Object> labelReceipt(AgentTaskAssessment.Goal goal) {
        if (goal == null || !"label".equals(goal.resourceType()) || !completes(goal)) return null;
        return labelReceipts.values().iterator().next().data();
    }

    Map<String, Object> grafanaReceipt(AgentTaskAssessment.Goal goal) {
        if (goal == null || !"grafana_dashboard".equals(goal.resourceType()) || !completes(goal))
            return null;
        return grafanaReceipts.values().iterator().next().data();
    }

    boolean hasGrafanaPreview(String tool, Map<String, Object> args) {
        try {
            return grafanaPreviews.contains(
                    org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft
                            .fromArguments(tool, args)
                            .previewHash());
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    boolean grafanaBlocked(String tool, Map<String, Object> args) {
        try {
            return grafanaBlockers.containsKey(
                    "preview:"
                            + org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft
                                    .fromArguments(tool, args)
                                    .previewHash());
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    String grafanaBlockedReply(AgentRuntimeContext context) {
        return AgentTaskFactualReply.grafanaBlocked(
                context, new java.util.TreeSet<>(grafanaBlockers.values()));
    }

    String grafanaFailureReply(AgentRuntimeContext context) {
        return grafanaFailure == null
                ? null
                : AgentTaskFactualReply.grafanaFailure(context, grafanaFailure);
    }

    String factualReadReply(AgentRuntimeContext context) {
        if (mutationAttempted) {
            return null;
        }
        if (!grafanaBlockers.isEmpty()) return grafanaBlockedReply(context);
        if (batchStatusReceipt != null) {
            return AgentTaskFactualReply.batchStatus(context, batchStatusReceipt);
        }
        return instrumentationBlockers.isEmpty()
                ? null
                : AgentTaskFactualReply.instrumentation(context, instrumentationBlockers);
    }

    boolean completesBatchStatusRead(AgentTaskAssessment.Goal goal) {
        return batchStatusReceipt != null
                && !mutationAttempted
                && goal != null
                && goal.type() == AgentTaskAssessment.Type.OBSERVATION
                && "monitor_batch".equals(goal.resourceType())
                && (goal.expectedCount() == null
                        || goal.expectedCount()
                                == ((List<?>) batchStatusReceipt.get("items")).size());
    }

    boolean hasDefinitionPreview(String tool, Map<String, Object> args) {
        try {
            return definitionPreviews.contains(
                    AgentDefinitionMutationSemantics.previewHash(args, tool));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    String monitorCreatePrerequisite(Map<String, Object> args) {
        if (!"website".equalsIgnoreCase(String.valueOf(args.get("app")))) {
            return null;
        }
        if (!websiteTypeDiscovered) {
            return "Discover monitor.types and confirm website is available.";
        }
        if (!websiteParametersDiscovered) {
            return "Load monitor.type_params(app=website), required fields and defaults.";
        }
        if (!(args.get("params") instanceof Map<?, ?> supplied)) {
            return "Provide declared website parameters.";
        }
        Map<String, String> parameters = new LinkedHashMap<>(websiteDefaults);
        supplied.forEach(
                (key, value) -> parameters.put(String.valueOf(key), String.valueOf(value)));
        if (!parameters.keySet().containsAll(websiteRequired)
                || !parameters.keySet().containsAll(Set.of("host", "port", "ssl"))) {
            return "Fill every required website parameter from the template before probing or"
                    + " creating.";
        }
        String collector =
                args.get("options") instanceof Map<?, ?> options && options.get("collector") != null
                        ? String.valueOf(options.get("collector"))
                        : "";
        return websiteProbes.contains(probeKey(parameters, collector))
                ? null
                : "Probe this exact website draft with monitor.detect_draft and the same declared"
                        + " parameters/collector. Existing approval rules apply; a probe does not"
                        + " save a monitor.";
    }

    private static String probeKey(Map<String, String> parameters, String collector) {
        return org.apache.hertzbeat.ai.gateway.text.GatewayText.sha256(
                org.apache.hertzbeat.common.util.JsonUtil.toJson(
                        Map.of(
                                "parameters",
                                new java.util.TreeMap<>(parameters),
                                "collector",
                                collector)));
    }

    boolean alreadyReceipted(String tool, Map<String, Object> args) {
        if (AgentInlineCollectionSemantics.supports(tool))
            return !inlineCollectionReceipts.isEmpty();
        // These contracts are bounded to one original operation, not one operation per argument
        // hash.
        if (AgentConfigurationMutationSemantics.supports(tool))
            return !configurationReceipts.isEmpty();
        if (AgentNoticeMutationSemantics.supports(tool)) return !noticeReceipts.isEmpty();
        if (AgentLabelMutationSemantics.supports(tool)) return !labelReceipts.isEmpty();
        if (AgentGrafanaMutationSemantics.supports(tool)) {
            try {
                return grafanaReceipts.containsKey(
                        org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft
                                .fromArguments(tool, args)
                                .monitorId());
            } catch (RuntimeException invalid) {
                return false;
            }
        }
        if (AgentDefinitionMutationSemantics.supports(tool)) {
            return args != null && definitionReceipts.containsKey(args.get("app"));
        }
        return mutationIds(tool, args).stream()
                .anyMatch(
                        id ->
                                receipts.containsKey(id)
                                        && receipts.get(id).operation()
                                                == AgentMonitorMutationSemantics.operation(tool));
    }

    private static Set<String> mutationIds(String tool, Map<String, Object> args) {
        Set<String> ids = new java.util.HashSet<>();
        if (args == null) {
            return ids;
        }
        if ("monitor.update".equals(tool) && positive(args.get("monitorId")) != null) {
            ids.add(positive(args.get("monitorId")));
        }
        if (("monitor.pause".equals(tool) || "monitor.resume".equals(tool))
                && args.get("monitorIds") instanceof List<?> values) {
            values.stream()
                    .map(AgentTaskEvidence::positive)
                    .filter(java.util.Objects::nonNull)
                    .forEach(ids::add);
        }
        return ids;
    }

    List<AgentRuntimeToolCall> pendingReadbacks(int maximum, int attemptCount) {
        return receipts.values().stream()
                .filter(
                        receipt ->
                                receipt.target() != null
                                        && !verified.contains(receipt.id())
                                        && !readbackAttempted.contains(receipt.id()))
                .limit(Math.max(0, maximum))
                .map(
                        receipt ->
                                AgentRuntimeToolCall.builder()
                                        .toolCallId(
                                                "verify-"
                                                        + receipt.argumentsHash().substring(0, 12)
                                                        + "-"
                                                        + receipt.id()
                                                        + "-"
                                                        + attemptCount)
                                        .toolName("monitor.get")
                                        .arguments(Map.of("monitorId", Long.valueOf(receipt.id())))
                                        .build())
                .toList();
    }

    boolean completes(AgentTaskAssessment.Goal goal) {
        if (goal != null
                && goal.operation() == AgentTaskAssessment.Operation.EXECUTE
                && "monitor".equals(goal.resourceType())) {
            return inlineCollectionReceipts.size() == 1
                    && AgentInlineCollectionSemantics.permits(
                            goal, inlineCollectionReceipts.values().iterator().next().args());
        }
        if (goal != null && AgentConfigurationMutationSemantics.resource(goal.resourceType())) {
            if (configurationReceipts.size() != 1) return false;
            var receipt = configurationReceipts.values().iterator().next();
            return AgentConfigurationMutationSemantics.permits(
                    goal, receipt.tool(), receipt.args());
        }

        if (goal != null
                && java.util.Set.of("notice_rule", "notice_template")
                        .contains(goal.resourceType())) {
            if (noticeReceipts.size() != 1) return false;
            var receipt = noticeReceipts.values().iterator().next();
            return AgentNoticeMutationSemantics.permits(goal, receipt.tool(), receipt.args());
        }
        if (goal != null && "label".equals(goal.resourceType())) {
            if (labelReceipts.size() != 1) return false;
            var receipt = labelReceipts.values().iterator().next();
            return AgentLabelMutationSemantics.permits(goal, receipt.tool(), receipt.args());
        }
        if (goal != null && "grafana_dashboard".equals(goal.resourceType())) {
            if (grafanaReceipts.size() != 1) return false;
            var receipt = grafanaReceipts.values().iterator().next();
            return AgentGrafanaMutationSemantics.permits(goal, receipt.tool(), receipt.args());
        }
        if ("monitor_definition".equals(goal.resourceType())) {
            var receipt =
                    definitionReceipts.entrySet().stream()
                            .filter(
                                    e ->
                                            goal.expectedChanges().get("app") instanceof String app
                                                    && app.equalsIgnoreCase(e.getKey()))
                            .map(Map.Entry::getValue)
                            .findFirst()
                            .orElse(null);
            return Integer.valueOf(1).equals(goal.expectedCount())
                    && definitionReceipts.size() == 1
                    && receipt != null
                    && goal.operation().name().equals(receipt.get("operation"))
                    && (!goal.expectedChanges().containsKey("definitionHash")
                            || goal.expectedChanges()
                                    .get("definitionHash")
                                    .equals(receipt.get("definitionHash")));
        }
        if (!"monitor".equals(goal.resourceType()) || goal.expectedCount() == null) {
            return false;
        }
        var matching =
                receipts.values().stream().filter(r -> r.operation() == goal.operation()).toList();
        if (matching.size() != goal.expectedCount()
                || matching.stream().anyMatch(r -> !verified.contains(r.id()))) {
            return false;
        }
        if (goal.operation() != AgentTaskAssessment.Operation.CREATE
                && !matching.stream()
                        .map(r -> Long.valueOf(r.id()))
                        .collect(java.util.stream.Collectors.toSet())
                        .equals(new java.util.HashSet<>(goal.resourceIds()))) {
            return false;
        }
        return goal.expectedChanges().isEmpty()
                || matching.stream()
                        .allMatch(
                                r ->
                                        r.target() != null
                                                && goal.expectedChanges().entrySet().stream()
                                                        .allMatch(
                                                                e ->
                                                                        AgentMonitorMutationSemantics
                                                                                .same(
                                                                                        e
                                                                                                .getValue(),
                                                                                        r.target()
                                                                                                .fields()
                                                                                                .get(
                                                                                                        e
                                                                                                                .getKey()))));
    }

    boolean claimsMatch(List<AgentTaskAssessment.Claim> claims) {
        return claims.stream()
                .allMatch(claim -> facts.stream().anyMatch(fact -> claimMatches(fact, claim)));
    }

    private boolean claimMatches(Fact fact, AgentTaskAssessment.Claim claim) {
        if (fact.values().entrySet().stream()
                .anyMatch(
                        value ->
                                (fact.id() + "/" + value.getKey()).equals(claim.factId())
                                        && String.valueOf(value.getValue()).equals(claim.value())))
            return true;
        String prefix = fact.id() + "/";
        return fact.kind() == Kind.OBSERVATION
                && claim.factId() != null
                && claim.factId().startsWith(prefix)
                && AgentScalarClaimPath.matches(
                        fact.values(), claim.factId().substring(prefix.length()), claim.value());
    }

    private void add(String id, String tool, Kind kind, Map<String, Object> values) {
        facts.add(
                new Fact(
                        id,
                        kind,
                        tool,
                        java.util.Collections.unmodifiableMap(new LinkedHashMap<>(values))));
    }

    private static Map<String, Object> object(String text) {
        try {
            return text == null
                    ? null
                    : JSON.readValue(text, new TypeReference<Map<String, Object>>() {});
        } catch (Exception invalid) {
            return null;
        }
    }

    private static String positive(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        try {
            long id = new java.math.BigDecimal(number.toString()).longValueExact();
            return id > 0 ? Long.toString(id) : null;
        } catch (ArithmeticException invalid) {
            return null;
        }
    }
}
