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

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Typed display facts from the saved approval input, never executable input or model narrative. */
public record AgentApprovalSummary(
        String version,
        String operation,
        int targetCount,
        List<Target> targets,
        List<Change> changes,
        String inputHash,
        boolean complete,
        List<String> maskedFields,
        org.apache.hertzbeat.manager.monitor.collection.InlineCollectionPlanService.Preview
                collection,
        PersonalWorkspace personal,
        InhibitionPolicy inhibition) {
    /** Existing personal summaries retain their constructor and optional wire compatibility. */
    public AgentApprovalSummary(
            String version,
            String operation,
            int targetCount,
            List<Target> targets,
            List<Change> changes,
            String inputHash,
            boolean complete,
            List<String> maskedFields,
            org.apache.hertzbeat.manager.monitor.collection.InlineCollectionPlanService.Preview
                    collection,
            PersonalWorkspace personal) {
        this(
                version,
                operation,
                targetCount,
                targets,
                changes,
                inputHash,
                complete,
                maskedFields,
                collection,
                personal,
                null);
    }

    /** Exact saved native policy configuration; does not claim an atomic version precondition. */
    public record InhibitionPolicy(
            String targetId,
            String sourceHash,
            org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService.Configuration
                    configuration,
            org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService.Configuration
                    before) {
        /** Older saved proposals have no independently verified before-state. */
        public InhibitionPolicy(
                String targetId,
                String sourceHash,
                org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService
                                .Configuration
                        configuration) {
            this(targetId, sourceHash, configuration, null);
        }
    }

    /** Existing summaries keep their constructor and optional wire compatibility. */
    public AgentApprovalSummary(
            String version,
            String operation,
            int targetCount,
            List<Target> targets,
            List<Change> changes,
            String inputHash,
            boolean complete,
            List<String> maskedFields,
            org.apache.hertzbeat.manager.monitor.collection.InlineCollectionPlanService.Preview
                    collection) {
        this(
                version,
                operation,
                targetCount,
                targets,
                changes,
                inputHash,
                complete,
                maskedFields,
                collection,
                null);
    }

    /** Exact non-secret personal setting from the immutable saved invocation, not model prose. */
    public record PersonalWorkspace(
            String kind,
            String monitorId,
            String application,
            String metricsName,
            Boolean favorite,
            String expectedRevision,
            org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest request) {}

    private static final JsonMapper JSON =
            JsonMapper.builder()
                    .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();
    private static final int MAX_INPUT = 262144;

    static {
        JSON.getFactory()
                .setStreamReadConstraints(
                        StreamReadConstraints.builder()
                                .maxNestingDepth(20)
                                .maxStringLength(MAX_INPUT)
                                .build());
    }

    /** Safe target identity; arbitrary names, descriptions, paths and keys are not returned. */
    public record Target(
            String kind,
            String id,
            String origin,
            String pathFingerprint,
            String keyFingerprint,
            Long intervals,
            Long timeout) {}

    /** A requested scalar value, not a claim about the current resource's prior state. */
    public record Change(String field, String value) {}

    public static AgentApprovalSummary from(AgentToolCall row) {
        String hash = row.getInputHash();
        if (hash == null || !hash.matches("[a-f0-9]{64}")) hash = null;
        var hidden = new LinkedHashSet<String>();
        try {
            String json = row.getInputJson();
            if (json == null || json.length() > MAX_INPUT) throw new IllegalArgumentException();
            Object value = JSON.readValue(json, Object.class);
            if (!(value instanceof Map<?, ?> args)) throw new IllegalArgumentException();
            boolean bound =
                    hash != null
                            && hash.equals(
                                    AgentToolPayloadHasher.normalizedArgumentsHash(
                                            stringMap(args)));
            String operation = operation(row.getToolName(), args);
            if (bound
                    && org.apache.hertzbeat.ai.gateway.tool.monitor.AgentPersonalWorkspaceProof
                            .validArguments(row.getToolName(), stringMap(args))) {
                return personalSummary(row.getToolName(), stringMap(args), hash);
            }
            if (bound
                    && Set.of(
                                    "alert_inhibit.create",
                                    "alert_inhibit.update",
                                    "alert_inhibit.delete")
                            .contains(row.getToolName())) {
                var policy = inhibitionSummary(row.getToolName(), stringMap(args), hash);
                if (policy != null) return policy;
            }
            var targets = new ArrayList<Target>();
            var changes = new ArrayList<Change>();
            boolean supported = false;
            int count = 0;
            if ("monitor.create_batch".equals(row.getToolName())
                    && args.get("items") instanceof List<?> items) {
                count = items.size();
                supported = count > 0 && count <= 50;
                for (Object item : items.stream().limit(50).toList()) {
                    if (!(item instanceof Map<?, ?> map)) {
                        supported = false;
                        continue;
                    }
                    Target target = website(map, hidden);
                    targets.add(target);
                    if (target.origin() == null
                            || target.keyFingerprint() == null
                            || target.intervals() == null
                            || (map.containsKey("timeout") && target.timeout() == null))
                        supported = false;
                    if (!Set.of("idempotencyKey", "name", "url", "intervals", "timeout")
                            .containsAll(map.keySet())) supported = false;
                    if (map.containsKey("name")) hidden.add("FREE_TEXT");
                }
                if (!Set.of("items", "retryPreflightFailures").containsAll(args.keySet()))
                    supported = false;
                if (args.containsKey("retryPreflightFailures")
                        && !(args.get("retryPreflightFailures") instanceof Boolean))
                    supported = false;
                if (args.get("retryPreflightFailures") instanceof Boolean flag)
                    changes.add(new Change("RETRY_PREFLIGHT", flag.toString()));
            } else if (row.getToolName() != null && row.getToolName().startsWith("monitor.")) {
                if (args.get("monitorIds") instanceof List<?> ids) {
                    count = ids.size();
                    for (Object id : ids.stream().limit(100).toList())
                        targets.add(resource("MONITOR", id));
                } else if (args.containsKey("monitorId")) {
                    count = 1;
                    targets.add(resource("MONITOR", args.get("monitorId")));
                }
                Map<?, ?> fields = args.get("updates") instanceof Map<?, ?> patch ? patch : args;
                scalar(fields, "intervals", "INTERVALS", 1, 86400, changes);
                scalar(fields, "timeout", "TIMEOUT", 1, 10000, changes);
                supported =
                        Set.of(
                                                "monitor.pause",
                                                "monitor.resume",
                                                "monitor.delete",
                                                "monitor.update")
                                        .contains(row.getToolName())
                                && count > 0
                                && count <= 100
                                && targets.stream().allMatch(target -> target.id() != null);
                if (fields.containsKey("name")
                        || fields.containsKey("description")
                        || fields.containsKey("labels")
                        || fields.containsKey("annotations")) hidden.add("FREE_TEXT");
                if (args.containsKey("params")
                        || args.containsKey("parameters")
                        || args.containsKey("inputRef")) {
                    hidden.add("PARAMETERS");
                    supported = false;
                }
                if ("monitor.update".equals(row.getToolName())) {
                    if (!Set.of("monitorId", "updates").containsAll(args.keySet())
                            || !Set.of("intervals").containsAll(fields.keySet())
                            || (fields.containsKey("intervals")
                                    && positive(fields.get("intervals"), 86400) == null))
                        supported = false;
                } else if (!Set.of("monitorIds").containsAll(args.keySet())) supported = false;
            } else {
                Object id = args.containsKey("entityId") ? args.get("entityId") : args.get("id");
                if (id != null) {
                    count = 1;
                    targets.add(resource("RESOURCE", id));
                }
                hidden.add("UNSUPPORTED");
            }
            if (!bound) hidden.add("BOUND_INPUT_UNAVAILABLE");
            return new AgentApprovalSummary(
                    "approval-summary.v1",
                    operation,
                    count,
                    List.copyOf(targets),
                    List.copyOf(changes),
                    hash,
                    bound && supported,
                    List.copyOf(hidden),
                    null);
        } catch (RuntimeException | java.io.IOException unavailable) {
            return new AgentApprovalSummary(
                    "approval-summary.v1",
                    "REVIEW",
                    0,
                    List.of(),
                    List.of(),
                    hash,
                    false,
                    List.of("BOUND_INPUT_UNAVAILABLE"),
                    null);
        }
    }

    public AgentApprovalSummary withCollection(
            org.apache.hertzbeat.manager.monitor.collection.InlineCollectionPlanService.Preview
                    preview) {
        if (preview == null) return this;
        return new AgentApprovalSummary(
                version,
                "REVIEW",
                1,
                List.of(
                        new Target(
                                "MONITOR",
                                Long.toString(preview.monitorId()),
                                null,
                                null,
                                null,
                                null,
                                null)),
                List.of(),
                inputHash,
                true,
                List.of(),
                preview);
    }

    /**
     * Baseline is supplied only by the server receipt verifier; approved arguments are unchanged.
     */
    AgentApprovalSummary withInhibitionBefore(
            org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService.Configuration
                    before) {
        if (inhibition == null || inhibition.targetId() == null || before == null) return this;
        return new AgentApprovalSummary(
                version,
                operation,
                targetCount,
                targets,
                changes,
                inputHash,
                complete,
                maskedFields,
                collection,
                personal,
                new InhibitionPolicy(
                        inhibition.targetId(),
                        inhibition.sourceHash(),
                        inhibition.configuration(),
                        before));
    }

    private static AgentApprovalSummary inhibitionSummary(
            String tool, Map<String, Object> args, String hash) {
        boolean create = tool.endsWith(".create");
        boolean delete = tool.endsWith(".delete");
        if (!args.keySet()
                .equals(
                        create
                                ? Set.of("configuration")
                                : delete
                                        ? Set.of("inhibitId", "reason", "sourceHash")
                                        : Set.of("inhibitId", "configuration", "sourceHash")))
            return null;
        String id = null;
        String source = null;
        if (!create) {
            id =
                    Long.toString(
                            org.apache.hertzbeat.ai.gateway.tool.monitor.AgentPersonalWorkspaceProof
                                    .positive(args.get("inhibitId")));
            if (!(args.get("sourceHash") instanceof String snapshot)
                    || !snapshot.matches("[a-f0-9]{64}")) return null;
            source = snapshot;
        }
        org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService.Configuration
                config = null;
        if (!delete) {
            if (!(args.get("configuration") instanceof Map<?, ?> fields)
                    || !fields.keySet()
                            .equals(
                                    Set.of(
                                            "name",
                                            "sourceLabels",
                                            "targetLabels",
                                            "equalLabels",
                                            "enable"))) return null;
            String json = org.apache.hertzbeat.common.util.JsonUtil.toJson(fields);
            var request =
                    org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                            json, org.apache.hertzbeat.alert.dto.AlertInhibitRequest.class);
            var normalized =
                    new org.apache.hertzbeat.alert.service.AlertInhibitContractMapper()
                            .toNewEntity(request);
            var projection =
                    org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport.view(
                            fields);
            String expected =
                    org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof
                            .contentHash(fields);
            if (!Boolean.FALSE.equals(projection.get("partial"))
                    || !expected.equals(
                            org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof
                                    .contentHash(projection.get("data")))
                    || !expected.equals(
                            org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof
                                    .contentHash(normalized))) return null;
            config =
                    org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                            json,
                            org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService
                                    .Configuration.class);
        }
        return new AgentApprovalSummary(
                "approval-summary.v1",
                create ? "CREATE" : delete ? "DELETE" : "UPDATE",
                1,
                List.of(),
                List.of(),
                hash,
                true,
                List.of(),
                null,
                null,
                new InhibitionPolicy(id, source, config));
    }

    private static AgentApprovalSummary personalSummary(
            String tool, Map<String, Object> args, String hash) {
        boolean favorite = tool.equals("monitor.favorite_set");
        org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest request = null;
        String app = null;
        String revision = null;
        String operation = "UPDATE";
        if (!favorite) {
            app =
                    org.apache.hertzbeat.ai.gateway.tool.monitor.AgentPersonalWorkspaceProof
                            .application(args.get("application"));
            if (tool.equals("monitor.layout_save")) {
                request =
                        org.apache.hertzbeat.common.util.JsonUtil.fromJson(
                                org.apache.hertzbeat.common.util.JsonUtil.toJson(
                                        args.get("request")),
                                org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest
                                        .class);
                revision = request.expectedRevision();
                operation = "missing".equals(revision) ? "CREATE" : "UPDATE";
            } else {
                revision = (String) args.get("expectedRevision");
                operation = "DELETE";
            }
        }
        Long monitorId =
                favorite
                        ? org.apache.hertzbeat.ai.gateway.tool.monitor.AgentPersonalWorkspaceProof
                                .positive(args.get("monitorId"))
                        : null;
        var display =
                new PersonalWorkspace(
                        favorite ? "FAVORITE" : "LAYOUT",
                        monitorId == null ? null : Long.toString(monitorId),
                        app,
                        favorite ? (String) args.get("metricsName") : null,
                        favorite ? (Boolean) args.get("favorite") : null,
                        revision,
                        request);
        return new AgentApprovalSummary(
                "approval-summary.v1",
                operation,
                1,
                favorite ? List.of(resource("MONITOR", monitorId)) : List.of(),
                List.of(),
                hash,
                true,
                List.of(),
                null,
                display);
    }

    private static Target website(Map<?, ?> item, Set<String> hidden) {
        String origin = null;
        String path = null;
        if (item.get("url") instanceof String text && text.length() <= 4096) {
            try {
                URI uri = URI.create(text);
                if (Set.of("http", "https").contains(uri.getScheme())
                        && uri.getHost() != null
                        && uri.getRawUserInfo() == null) {
                    String host = uri.getHost();
                    if (host.contains(":") && !host.startsWith("[")) host = "[" + host + "]";
                    origin =
                            uri.getScheme()
                                    + "://"
                                    + host
                                    + (uri.getPort() < 0 ? "" : ":" + uri.getPort());
                    if (uri.getRawPath() != null
                            && !uri.getRawPath().isEmpty()
                            && !"/".equals(uri.getRawPath())) {
                        path = GatewayText.sha256(uri.getRawPath()).substring(0, 16);
                        hidden.add("URL_PATH");
                    }
                    if (uri.getRawQuery() != null || uri.getRawFragment() != null)
                        hidden.add("URL_QUERY");
                }
            } catch (IllegalArgumentException ignored) {
                hidden.add("UNSUPPORTED");
            }
        }
        String key =
                item.get("idempotencyKey") instanceof String value
                                && !value.isBlank()
                                && value.length() <= 1024
                        ? GatewayText.sha256(value).substring(0, 16)
                        : null;
        return new Target(
                "WEBSITE",
                null,
                origin,
                path,
                key,
                positive(item.get("intervals"), 86400),
                positive(item.get("timeout"), 10000));
    }

    private static Target resource(String kind, Object value) {
        Long id = positive(value, Long.MAX_VALUE);
        return new Target(kind, id == null ? null : id.toString(), null, null, null, null, null);
    }

    private static void scalar(
            Map<?, ?> args, String key, String field, long min, long max, List<Change> changes) {
        Long value = positive(args.get(key), max);
        if (value != null && value >= min) changes.add(new Change(field, value.toString()));
    }

    private static Long positive(Object value, long max) {
        if (!(value instanceof Number number)) return null;
        try {
            long exact = new java.math.BigDecimal(number.toString()).longValueExact();
            return exact > 0 && exact <= max ? exact : null;
        } catch (ArithmeticException invalid) {
            return null;
        }
    }

    private static String operation(String tool, Map<?, ?> args) {
        String name = tool == null ? "" : tool.toUpperCase(Locale.ROOT);
        for (String op : List.of("CREATE", "UPDATE", "DELETE", "PAUSE", "RESUME")) {
            if (name.endsWith("." + op)
                    || name.endsWith("_" + op)
                    || name.endsWith("." + op + "_BATCH")) return op;
        }
        return "REVIEW";
    }

    private static Map<String, Object> stringMap(Map<?, ?> values) {
        var result = new java.util.LinkedHashMap<String, Object>();
        for (var entry : values.entrySet()) {
            if (!(entry.getKey() instanceof String key)) throw new IllegalArgumentException();
            result.put(key, entry.getValue());
        }
        return result;
    }
}
