/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.application.AgentSingleAlertTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.springframework.util.StringUtils;

/** Evaluates whether a tool result is an exact observation of the current target. */
final class AgentTargetGroundingEvaluator {

    private static final String MONITOR_GET = "monitor.get";
    private static final String METRICS_HISTORY = "metrics.history";
    private static final String ALERT_GET = "alert.get";
    private static final String SINGLE_ALERT = AgentSingleAlertTargetAuthorityService.ALERT_TYPE;
    private static final Set<String> SINGLE_ALERT_ROW_KEYS = Set.of(
            "id", "fingerprint", "status", "content", "triggerTimes", "startAt", "activeAt", "endAt",
            "labels", "annotations");
    private static final int MAX_ALERT_FINGERPRINT_LENGTH = 2_048;
    private static final int MAX_ALERT_CONTENT_LENGTH = 2_048;
    private static final int MAX_ALERT_LABELS_LENGTH = 2_048;
    private static final int MAX_ALERT_ANNOTATIONS_LENGTH = 4_096;
    private static final int MAX_ALERT_MAP_ENTRIES = 1_024;
    private static final ObjectMapper QUIET_JSON = JsonMapper.builder().build();
    private final AgentEntityTargetGroundingSemantics entitySemantics =
            new AgentEntityTargetGroundingSemantics();
    private final AgentTopologyTargetGroundingSemantics topologySemantics =
            new AgentTopologyTargetGroundingSemantics();
    private final AgentTraceTargetGroundingSemantics traceSemantics =
            new AgentTraceTargetGroundingSemantics();
    private final AgentLogTargetGroundingSemantics logSemantics =
            new AgentLogTargetGroundingSemantics();

    Optional<AgentGroundingProof> evaluate(String runUid, AgentTargetRef target,
                                            AgentRuntimeToolCall call, AgentToolExecutionResult result) {
        if (!baseResultMatches(call, result) || !StringUtils.hasText(runUid) || target == null) {
            return Optional.empty();
        }
        String targetFingerprint = fingerprint(target);
        if (!StringUtils.hasText(targetFingerprint)) {
            return Optional.empty();
        }
        Map<String, Object> output = object(result.getOutput());
        if (output == null) {
            return Optional.empty();
        }
        AgentSignalRef signal = target.getSignal();
        if (isCanonicalSingleAlert(target)) {
            return alertProof(runUid, target, targetFingerprint, call, result, output);
        }
        if (entitySemantics.isCanonicalTarget(target)) {
            return entityProof(runUid, target, targetFingerprint, call, result, output);
        }
        if (topologySemantics.isCanonicalTarget(target)) {
            return topologyProof(runUid, target, targetFingerprint, call, result, output);
        }
        if (traceSemantics.isCanonicalTarget(target)) {
            return traceProof(runUid, target, targetFingerprint, call, result, output);
        }
        if (logSemantics.isCanonicalTarget(target)) {
            return logProof(runUid, target, targetFingerprint, call, result, output);
        }
        if (signal == null && isMonitorOnly(target)) {
            return monitorProof(runUid, target, targetFingerprint, call, result, output);
        }
        if (!isExactMonitorMetric(target) && !isCanonicalEntityMetric(target)) {
            return Optional.empty();
        }
        return metricProof(runUid, target, targetFingerprint, call, result, output);
    }

    boolean restores(TranscriptMessage message, String runUid, AgentTargetRef target,
                     Map<String, Object> arguments) {
        return restoresVerifiedResult(message, runUid, target, arguments,
                AgentToolPayloadHasher.normalizedArgumentsHash(arguments));
    }

    boolean restoresVerifiedResult(TranscriptMessage message, String runUid, AgentTargetRef target,
                                   Map<String, Object> arguments, String trustedInputHash) {
        AgentGroundingProof proof = message == null ? null : message.getGroundingProof();
        if (proof == null || message.getRole() != TranscriptMessage.TranscriptRole.TOOL_RESULT
                || !AgentGroundingProof.VERSION.equals(proof.getVersion())
                || !Objects.equals(trustedInputHash, proof.getInputHash())
                || !Objects.equals(AgentToolPayloadHasher.normalizedArgumentsHash(arguments), trustedInputHash)) {
            return false;
        }
        AgentRuntimeToolCall call = AgentRuntimeToolCall.builder()
                .toolCallId(message.getToolCallId())
                .toolName(message.getToolName())
                .arguments(arguments)
                .build();
        AgentToolExecutionResult result = AgentToolExecutionResult.builder()
                .toolCallId(message.getToolCallId())
                .toolName(message.getToolName())
                .status(AgentToolStatus.SUCCEEDED)
                .risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(message.text())
                .build();
        return evaluate(runUid, target, call, result)
                .filter(proof::equals)
                .isPresent();
    }

    private Optional<AgentGroundingProof> monitorProof(String runUid, AgentTargetRef target, String targetFingerprint,
                                                        AgentRuntimeToolCall call, AgentToolExecutionResult result,
                                                        Map<String, Object> output) {
        Long monitorId = target.getMonitorId();
        if (!MONITOR_GET.equals(call.getToolName())
                || !equalsLong(call.getArguments().get("monitorId"), monitorId)
                || !equalsLong(output.get("monitorId"), monitorId)) {
            return Optional.empty();
        }
        return Optional.of(proof(runUid, target, targetFingerprint, call, result,
                "target-monitor", monitorId, null, null, null, null, null, 1));
    }

    private Optional<AgentGroundingProof> alertProof(String runUid, AgentTargetRef target, String targetFingerprint,
                                                      AgentRuntimeToolCall call, AgentToolExecutionResult result,
                                                      Map<String, Object> output) {
        Object singleValue = output.get("single");
        if (!ALERT_GET.equals(call.getToolName())
                || !Set.of("alertId", "alertType").equals(call.getArguments().keySet())
                || !equalsLong(call.getArguments().get("alertId"), target.getAlertId())
                || !Objects.equals(SINGLE_ALERT, call.getArguments().get("alertType"))
                || !Set.of("alertId", "alertType", "single").equals(output.keySet())
                || !equalsLong(output.get("alertId"), target.getAlertId())
                || !Objects.equals(SINGLE_ALERT, output.get("alertType"))
                || !(singleValue instanceof Map<?, ?> single)
                || !isSingleAlertRow(single, target.getAlertId())) {
            return Optional.empty();
        }
        return Optional.of(proof(runUid, target, targetFingerprint, call, result,
                "target-single-alert", null, target.getAlertId(), SINGLE_ALERT,
                null, null, null, 1));
    }

    private Optional<AgentGroundingProof> entityProof(String runUid, AgentTargetRef target, String targetFingerprint,
                                                       AgentRuntimeToolCall call, AgentToolExecutionResult result,
                                                       Map<String, Object> output) {
        if (!entitySemantics.matches(target, call, output)) {
            return Optional.empty();
        }
        return Optional.of(proof(runUid, target, targetFingerprint, call, result,
                "target-entity", null, null, null, null, null, null, 1));
    }

    private Optional<AgentGroundingProof> topologyProof(String runUid, AgentTargetRef target,
                                                         String targetFingerprint, AgentRuntimeToolCall call,
                                                         AgentToolExecutionResult result,
                                                         Map<String, Object> output) {
        int observations = topologySemantics.matchingObservationCount(target, call, output);
        if (observations <= 0) {
            return Optional.empty();
        }
        AgentTopologyRef topology = target.getTopology();
        return Optional.of(proof(runUid, target, targetFingerprint, call, result,
                "target-topology", null, null, null, null,
                topology.getStart(), topology.getEnd(), observations));
    }

    private Optional<AgentGroundingProof> metricProof(String runUid, AgentTargetRef target, String targetFingerprint,
                                                       AgentRuntimeToolCall call, AgentToolExecutionResult result,
                                                       Map<String, Object> output) {
        AgentSignalRef signal = target.getSignal();
        Map<String, Object> arguments = call.getArguments();
        int points = integer(output.get("returnedPoints"));
        if (!METRICS_HISTORY.equals(call.getToolName())
                || !equalsLong(arguments.get("monitorId"), target.getMonitorId())
                || !Objects.equals(arguments.get("metricKey"), signal.getQuery())
                || !equalsLong(arguments.get("start"), signal.getStart())
                || !equalsLong(arguments.get("end"), signal.getEnd())
                || !equalsLong(output.get("monitorId"), target.getMonitorId())
                || !Objects.equals(output.get("metricKey"), signal.getQuery())
                || !equalsLong(output.get("start"), signal.getStart())
                || !equalsLong(output.get("end"), signal.getEnd())
                || points <= 0) {
            return Optional.empty();
        }
        return Optional.of(proof(runUid, target, targetFingerprint, call, result,
                "target-metric-points", target.getMonitorId(), null, null, signal.getQuery(),
                signal.getStart(), signal.getEnd(), points));
    }

    private Optional<AgentGroundingProof> traceProof(String runUid, AgentTargetRef target, String targetFingerprint,
                                                      AgentRuntimeToolCall call, AgentToolExecutionResult result,
                                                      Map<String, Object> output) {
        int observations = traceSemantics.matchingObservationCount(target, call, output);
        if (observations <= 0) {
            return Optional.empty();
        }
        AgentTraceRef trace = target.getTrace();
        AgentTargetAuthority authority = target.getAuthority();
        return Optional.of(AgentGroundingProof.builder()
                .version(AgentGroundingProof.VERSION)
                .runUid(runUid)
                .targetFingerprint(targetFingerprint)
                .targetVersion(target.getVersion())
                .toolName(call.getToolName())
                .toolCallId(call.getToolCallId())
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .outputHash(GatewayText.sha256(AgentRuntimeTextSanitizer.redact(result.getOutput())))
                .observationKind("target-trace")
                .traceId(trace.getTraceId())
                .spanId(trace.getSpanId())
                .start(trace.getStart())
                .end(trace.getEnd())
                .authorityHash(authority.getHash())
                .observationCount(observations)
                .build());
    }

    private Optional<AgentGroundingProof> logProof(String runUid, AgentTargetRef target, String targetFingerprint,
                                                    AgentRuntimeToolCall call, AgentToolExecutionResult result,
                                                    Map<String, Object> output) {
        int observations = logSemantics.matchingObservationCount(target, call, output);
        if (observations <= 0) {
            return Optional.empty();
        }
        AgentLogRef log = target.getLog();
        AgentTargetAuthority authority = target.getAuthority();
        return Optional.of(AgentGroundingProof.builder()
                .version(AgentGroundingProof.VERSION)
                .runUid(runUid)
                .targetFingerprint(targetFingerprint)
                .targetVersion(target.getVersion())
                .toolName(call.getToolName())
                .toolCallId(call.getToolCallId())
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .outputHash(GatewayText.sha256(AgentRuntimeTextSanitizer.redact(result.getOutput())))
                .observationKind("target-log-page")
                .traceId(log.getTraceId())
                .spanId(log.getSpanId())
                .start(log.getStart())
                .end(log.getEnd())
                .authorityHash(authority.getHash())
                .observationCount(observations)
                .build());
    }

    private AgentGroundingProof proof(String runUid, AgentTargetRef target, String targetFingerprint,
                                      AgentRuntimeToolCall call, AgentToolExecutionResult result,
                                      String observationKind,
                                      Long monitorId,
                                      Long alertId,
                                      String alertType,
                                      String metricKey, Long start, Long end, int count) {
        AgentSignalRef signal = target.getSignal();
        AgentTargetAuthority authority = target.getAuthority();
        return AgentGroundingProof.builder()
                .version(AgentGroundingProof.VERSION)
                .runUid(runUid)
                .targetFingerprint(targetFingerprint)
                .targetVersion(target.getVersion())
                .entityId(target.getEntityId())
                .toolName(call.getToolName())
                .toolCallId(call.getToolCallId())
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .outputHash(GatewayText.sha256(AgentRuntimeTextSanitizer.redact(result.getOutput())))
                .observationKind(observationKind)
                .monitorId(monitorId)
                .alertId(alertId)
                .alertType(alertType)
                .metricKey(metricKey)
                .start(start)
                .end(end)
                .timezone(signal == null ? null : signal.getTimezone())
                .authorityHash(authority == null ? null : authority.getHash())
                .observationCount(count)
                .build();
    }

    private boolean baseResultMatches(AgentRuntimeToolCall call, AgentToolExecutionResult result) {
        return result != null
                && result.getStatus() == AgentToolStatus.SUCCEEDED
                && result.getRisk() == AgentToolRisk.READ
                && !"tool.search".equals(result.getToolName())
                && Objects.equals(call.getToolCallId(), result.getToolCallId())
                && Objects.equals(call.getToolName(), result.getToolName())
                && StringUtils.hasText(result.getOutput());
    }

    private boolean isMonitorOnly(AgentTargetRef target) {
        return target.getMonitorId() != null && target.getAlertId() == null && target.getEntityId() == null
                && target.getCollector() == null && target.getTopology() == null && target.getTrace() == null
                && target.getLog() == null;
    }

    private boolean isExactMonitorMetric(AgentTargetRef target) {
        AgentSignalRef signal = target.getSignal();
        return target.getMonitorId() != null && target.getAlertId() == null && target.getEntityId() == null
                && target.getCollector() == null && target.getTopology() == null && target.getTrace() == null
                && target.getLog() == null
                && signal != null && "metrics".equals(signal.getType())
                && StringUtils.hasText(signal.getQuery()) && signal.getStart() != null && signal.getEnd() != null
                && signal.getStart() < signal.getEnd();
    }

    private boolean isCanonicalEntityMetric(AgentTargetRef target) {
        AgentSignalRef signal = target.getSignal();
        return EntityMonitorMetricTargetCanonicalizer.TARGET_VERSION.equals(target.getVersion())
                && target.getEntityId() != null && target.getEntityId() > 0
                && target.getMonitorId() != null && target.getMonitorId() > 0
                && target.getService() != null && target.getAuthority() != null
                && target.getAlertId() == null && target.getCollector() == null && target.getTopology() == null
                && target.getTrace() == null && target.getLog() == null
                && signal != null && "metrics".equals(signal.getType())
                && StringUtils.hasText(signal.getQuery()) && signal.getStart() != null && signal.getEnd() != null
                && signal.getStart() < signal.getEnd() && StringUtils.hasText(signal.getTimezone());
    }

    private boolean isCanonicalSingleAlert(AgentTargetRef target) {
        AgentTargetAuthority authority = target.getAuthority();
        return AgentSingleAlertTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && target.getAlertId() != null && target.getAlertId() > 0
                && SINGLE_ALERT.equals(target.getAlertType())
                && authority != null && Objects.equals(target.getAlertId(), authority.getBindingId())
                && AgentSingleAlertTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && authority.getHash() != null && authority.getHash().matches("sha256:[0-9a-f]{64}")
                && target.getMonitorId() == null && target.getEntityId() == null
                && target.getCollector() == null && target.getTopology() == null
                && target.getTrace() == null && target.getLog() == null && target.getSignal() == null
                && target.getService() == null;
    }

    private String fingerprint(AgentTargetRef target) {
        if (target == null) {
            return null;
        }
        AgentSignalRef signal = target.getSignal();
        AgentTopologyRef topology = target.getTopology();
        AgentTraceRef trace = target.getTrace();
        AgentLogRef log = target.getLog();
        AgentServiceRef service = target.getService();
        AgentTargetAuthority authority = target.getAuthority();
        StringBuilder canonical = new StringBuilder("target.v1;");
        append(canonical, "version", target.getVersion());
        append(canonical, "monitorId", target.getMonitorId());
        append(canonical, "alertId", target.getAlertId());
        append(canonical, "alertType", target.getAlertType());
        append(canonical, "entityId", target.getEntityId());
        append(canonical, "collector", target.getCollector());
        append(canonical, "signalType", signal == null ? null : signal.getType());
        append(canonical, "signalQuery", signal == null ? null : signal.getQuery());
        append(canonical, "signalTimeRange", signal == null ? null : signal.getTimeRange());
        append(canonical, "signalStart", signal == null ? null : signal.getStart());
        append(canonical, "signalEnd", signal == null ? null : signal.getEnd());
        append(canonical, "signalTimezone", signal == null ? null : signal.getTimezone());
        append(canonical, "serviceName", service == null ? null : service.getName());
        append(canonical, "serviceNamespace", service == null ? null : service.getNamespace());
        append(canonical, "serviceEnvironment", service == null ? null : service.getEnvironment());
        append(canonical, "authorityBindingId", authority == null ? null : authority.getBindingId());
        append(canonical, "authorityVersion", authority == null ? null : authority.getVersion());
        append(canonical, "authorityHash", authority == null ? null : authority.getHash());
        append(canonical, "topologyRoot", topology == null ? null : topology.getRootEntityId());
        append(canonical, "topologyNode", topology == null ? null : topology.getNodeId());
        append(canonical, "topologyEdge", topology == null ? null : topology.getEdgeId());
        append(canonical, "topologyDepth", topology == null ? null : topology.getDepth());
        append(canonical, "topologyEnvironment", topology == null ? null : topology.getEnvironment());
        append(canonical, "topologySourceKind", topology == null ? null : topology.getSourceKind());
        append(canonical, "topologyStart", topology == null ? null : topology.getStart());
        append(canonical, "topologyEnd", topology == null ? null : topology.getEnd());
        append(canonical, "topologyRelationType", topology == null ? null : topology.getRelationType());
        append(canonical, "topologyHideInternal", topology == null ? null : topology.getHideInternal());
        append(canonical, "topologyPageIndex", topology == null ? null : topology.getPageIndex());
        append(canonical, "topologyPageSize", topology == null ? null : topology.getPageSize());
        append(canonical, "traceId", trace == null ? null : trace.getTraceId());
        append(canonical, "traceSpanId", trace == null ? null : trace.getSpanId());
        append(canonical, "traceStart", trace == null ? null : trace.getStart());
        append(canonical, "traceEnd", trace == null ? null : trace.getEnd());
        append(canonical, "traceServiceName", trace == null ? null : trace.getServiceName());
        append(canonical, "traceServiceNamespace", trace == null ? null : trace.getServiceNamespace());
        append(canonical, "traceEnvironment", trace == null ? null : trace.getEnvironment());
        append(canonical, "traceResourceFilter", trace == null ? null : trace.getResourceFilter());
        append(canonical, "traceAttributeFilter", trace == null ? null : trace.getAttributeFilter());
        append(canonical, "traceMinDuration", trace == null ? null : trace.getMinDurationMs());
        append(canonical, "traceMaxDuration", trace == null ? null : trace.getMaxDurationMs());
        append(canonical, "logStart", log == null ? null : log.getStart());
        append(canonical, "logEnd", log == null ? null : log.getEnd());
        append(canonical, "logTraceId", log == null ? null : log.getTraceId());
        append(canonical, "logSpanId", log == null ? null : log.getSpanId());
        append(canonical, "logSeverityNumber", log == null ? null : log.getSeverityNumber());
        append(canonical, "logSeverityText", log == null ? null : log.getSeverityText());
        append(canonical, "logSearch", log == null ? null : log.getSearch());
        append(canonical, "logServiceName", log == null ? null : log.getServiceName());
        append(canonical, "logServiceNamespace", log == null ? null : log.getServiceNamespace());
        append(canonical, "logEnvironment", log == null ? null : log.getEnvironment());
        append(canonical, "logResourceFilter", log == null ? null : log.getResourceFilter());
        append(canonical, "logAttributeFilter", log == null ? null : log.getAttributeFilter());
        append(canonical, "logHideInternal", log == null ? null : log.getHideInternal());
        append(canonical, "logHideNoise", log == null ? null : log.getHideNoise());
        append(canonical, "logPageIndex", log == null ? null : log.getPageIndex());
        append(canonical, "logPageSize", log == null ? null : log.getPageSize());
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            return null;
        }
    }

    private void append(StringBuilder canonical, String field, Object value) {
        String text = value == null ? null : String.valueOf(value);
        canonical.append(field).append(':').append(text == null ? -1 : text.length()).append(':');
        if (text != null) {
            canonical.append(text);
        }
        canonical.append(';');
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> object(String json) {
        try {
            Object value = QUIET_JSON.readValue(json, Object.class);
            return value instanceof Map<?, ?> map ? (Map<String, Object>) map : null;
        } catch (IOException exception) {
            return null;
        }
    }

    private boolean equalsLong(Object value, Long expected) {
        if (expected == null || !(value instanceof Number number)) {
            return false;
        }
        try {
            return new BigDecimal(number.toString()).longValueExact() == expected;
        } catch (ArithmeticException | NumberFormatException ignored) {
            return false;
        }
    }

    private boolean isSingleAlertRow(Map<?, ?> row, Long expectedId) {
        return SINGLE_ALERT_ROW_KEYS.equals(row.keySet())
                && equalsLong(row.get("id"), expectedId)
                && nullableText(row.get("fingerprint"), MAX_ALERT_FINGERPRINT_LENGTH)
                && alertStatus(row.get("status"))
                && nullableText(row.get("content"), MAX_ALERT_CONTENT_LENGTH)
                && nullableNonnegativeInteger(row.get("triggerTimes"))
                && nullableNonnegativeLong(row.get("startAt"))
                && nullableNonnegativeLong(row.get("activeAt"))
                && nullableNonnegativeLong(row.get("endAt"))
                && stringMap(row.get("labels"), MAX_ALERT_LABELS_LENGTH)
                && stringMap(row.get("annotations"), MAX_ALERT_ANNOTATIONS_LENGTH);
    }

    private boolean alertStatus(Object value) {
        return CommonConstants.ALERT_STATUS_PENDING.equals(value)
                || CommonConstants.ALERT_STATUS_FIRING.equals(value)
                || CommonConstants.ALERT_STATUS_ACKNOWLEDGED.equals(value)
                || CommonConstants.ALERT_STATUS_RESOLVED.equals(value);
    }

    private boolean nullableText(Object value, int maximumLength) {
        return value == null || value instanceof String text && text.length() <= maximumLength;
    }

    private boolean nullableNonnegativeLong(Object value) {
        if (value == null) {
            return true;
        }
        if (!(value instanceof Number number)) {
            return false;
        }
        try {
            return new BigDecimal(number.toString()).longValueExact() >= 0;
        } catch (ArithmeticException | NumberFormatException ignored) {
            return false;
        }
    }

    private boolean nullableNonnegativeInteger(Object value) {
        if (value == null) {
            return true;
        }
        if (!(value instanceof Number number)) {
            return false;
        }
        try {
            int converted = new BigDecimal(number.toString()).intValueExact();
            return converted >= 0;
        } catch (ArithmeticException | NumberFormatException ignored) {
            return false;
        }
    }

    private boolean stringMap(Object value, int maximumSerializedLength) {
        if (!(value instanceof Map<?, ?> map) || map.size() > MAX_ALERT_MAP_ENTRIES) {
            return false;
        }
        boolean typed = map.entrySet().stream().allMatch(entry -> entry.getKey() instanceof String key
                && key.length() <= maximumSerializedLength
                && (entry.getValue() == null || entry.getValue() instanceof String text
                && text.length() <= maximumSerializedLength));
        if (!typed) {
            return false;
        }
        try {
            return QUIET_JSON.writeValueAsString(map).length() <= maximumSerializedLength;
        } catch (IOException ignored) {
            return false;
        }
    }

    private int integer(Object value) {
        if (!(value instanceof Number number)) {
            return -1;
        }
        long converted = number.longValue();
        return converted > 0 && converted <= Integer.MAX_VALUE && number.doubleValue() == converted
                ? (int) converted : -1;
    }

    private boolean proofScopeMatches(AgentGroundingProof proof, AgentTargetRef target) {
        if (target == null) {
            return false;
        }
        if (isCanonicalSingleAlert(target)) {
            return ALERT_GET.equals(proof.getToolName())
                    && Objects.equals(target.getVersion(), proof.getTargetVersion())
                    && Objects.equals(target.getAlertId(), proof.getAlertId())
                    && Objects.equals(SINGLE_ALERT, proof.getAlertType())
                    && Objects.equals(target.getAuthority().getHash(), proof.getAuthorityHash())
                    && proof.getMonitorId() == null && proof.getEntityId() == null
                    && proof.getMetricKey() == null && proof.getStart() == null && proof.getEnd() == null;
        }
        if (target.getSignal() == null && isMonitorOnly(target)) {
            return MONITOR_GET.equals(proof.getToolName())
                    && Objects.equals(target.getMonitorId(), proof.getMonitorId())
                    && proof.getMetricKey() == null && proof.getStart() == null && proof.getEnd() == null;
        }
        if (!isExactMonitorMetric(target)) {
            return canonicalProofScopeMatches(proof, target);
        }
        AgentSignalRef signal = target.getSignal();
        return METRICS_HISTORY.equals(proof.getToolName())
                && Objects.equals(target.getMonitorId(), proof.getMonitorId())
                && Objects.equals(signal.getQuery(), proof.getMetricKey())
                && Objects.equals(signal.getStart(), proof.getStart())
                && Objects.equals(signal.getEnd(), proof.getEnd())
                && proof.getTargetVersion() == null && proof.getEntityId() == null
                && proof.getTimezone() == null && proof.getAuthorityHash() == null;
    }

    private boolean canonicalProofScopeMatches(AgentGroundingProof proof, AgentTargetRef target) {
        if (!isCanonicalEntityMetric(target)) {
            return false;
        }
        AgentSignalRef signal = target.getSignal();
        return METRICS_HISTORY.equals(proof.getToolName())
                && Objects.equals(target.getVersion(), proof.getTargetVersion())
                && Objects.equals(target.getEntityId(), proof.getEntityId())
                && Objects.equals(target.getMonitorId(), proof.getMonitorId())
                && Objects.equals(signal.getQuery(), proof.getMetricKey())
                && Objects.equals(signal.getStart(), proof.getStart())
                && Objects.equals(signal.getEnd(), proof.getEnd())
                && Objects.equals(signal.getTimezone(), proof.getTimezone())
                && Objects.equals(target.getAuthority().getHash(), proof.getAuthorityHash());
    }
}
