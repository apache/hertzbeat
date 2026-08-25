/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.application.AgentEntityTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.springframework.util.StringUtils;

/** Production-shaped output semantics for one canonical Entity observation. */
final class AgentEntityTargetGroundingSemantics {

    private static final Set<String> OUTPUT_KEYS = Set.of(
            "entity", "status", "evidenceSummary", "alertSummary", "monitorSummary", "logSummary",
            "traceSummary", "signalEvidence", "triageRecommendation", "opsSummary", "nextActions",
            "topologyNeighbors");
    private static final Set<String> OUTPUT_REQUIRED_KEYS = Set.of("entity", "nextActions", "topologyNeighbors");
    private static final Set<String> ROW_KEYS = Set.of(
            "id", "type", "name", "displayName", "subtype", "namespace", "environment", "status",
            "criticality", "owner", "lifecycle", "tier", "system", "source", "description", "labels", "tags");
    private static final Set<String> ROW_REQUIRED_KEYS = Set.of("id", "type", "name", "labels", "tags");
    private static final int MAX_TEXT_LENGTH = 256;
    private static final int MAX_DESCRIPTION_LENGTH = 1_024;
    private static final int MAX_LABELS_LENGTH = 16_384;
    private static final int MAX_TAG_LENGTH = 128;
    private static final int MAX_COLLECTION_SIZE = 1_024;
    private static final ObjectMapper QUIET_JSON = JsonMapper.builder().build();

    boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        return target != null
                && AgentEntityTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && target.getEntityId() != null && target.getEntityId() > 0
                && authority != null && Objects.equals(target.getEntityId(), authority.getBindingId())
                && AgentEntityTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && authority.getHash() != null && authority.getHash().matches("sha256:[0-9a-f]{64}")
                && target.getMonitorId() == null && target.getAlertId() == null
                && target.getAlertType() == null && target.getCollector() == null
                && target.getTopology() == null && target.getTrace() == null && target.getLog() == null
                && target.getSignal() == null && target.getService() == null;
    }

    boolean matches(AgentTargetRef target, AgentRuntimeToolCall call, Map<String, Object> output) {
        Object entityValue = output.get("entity");
        return "entity.get".equals(call.getToolName())
                && Set.of("entityId").equals(call.getArguments().keySet())
                && exactLong(call.getArguments().get("entityId"), target.getEntityId())
                && OUTPUT_KEYS.containsAll(output.keySet())
                && output.keySet().containsAll(OUTPUT_REQUIRED_KEYS)
                && entityValue instanceof Map<?, ?> entity
                && entityRow(entity, target.getEntityId())
                && output.get("nextActions") instanceof List<?>
                && output.get("topologyNeighbors") instanceof List<?>;
    }

    private boolean entityRow(Map<?, ?> row, Long expectedId) {
        return ROW_KEYS.containsAll(row.keySet())
                && row.keySet().containsAll(ROW_REQUIRED_KEYS)
                && exactLong(row.get("id"), expectedId)
                && requiredText(row.get("type"), MAX_TEXT_LENGTH)
                && requiredText(row.get("name"), MAX_TEXT_LENGTH)
                && nullableText(row.get("displayName"), MAX_TEXT_LENGTH)
                && nullableText(row.get("subtype"), MAX_TEXT_LENGTH)
                && nullableText(row.get("namespace"), MAX_TEXT_LENGTH)
                && nullableText(row.get("environment"), MAX_TEXT_LENGTH)
                && nullableText(row.get("status"), MAX_TEXT_LENGTH)
                && nullableText(row.get("criticality"), MAX_TEXT_LENGTH)
                && nullableText(row.get("owner"), MAX_TEXT_LENGTH)
                && nullableText(row.get("lifecycle"), MAX_TEXT_LENGTH)
                && nullableText(row.get("tier"), MAX_TEXT_LENGTH)
                && nullableText(row.get("system"), MAX_TEXT_LENGTH)
                && nullableText(row.get("source"), MAX_TEXT_LENGTH)
                && nullableText(row.get("description"), MAX_DESCRIPTION_LENGTH)
                && stringMap(row.get("labels"), MAX_LABELS_LENGTH)
                && boundedStringList(row.get("tags"));
    }

    private boolean exactLong(Object value, Long expected) {
        if (expected == null || !(value instanceof Number number)) {
            return false;
        }
        try {
            return new BigDecimal(number.toString()).longValueExact() == expected;
        } catch (ArithmeticException | NumberFormatException ignored) {
            return false;
        }
    }

    private boolean requiredText(Object value, int maximumLength) {
        return value instanceof String text && StringUtils.hasText(text) && text.length() <= maximumLength;
    }

    private boolean nullableText(Object value, int maximumLength) {
        return value == null || value instanceof String text && text.length() <= maximumLength;
    }

    private boolean stringMap(Object value, int maximumSerializedLength) {
        if (!(value instanceof Map<?, ?> map) || map.size() > MAX_COLLECTION_SIZE
                || map.entrySet().stream().anyMatch(entry -> !(entry.getKey() instanceof String key)
                || key.length() > maximumSerializedLength
                || !(entry.getValue() == null || entry.getValue() instanceof String text
                && text.length() <= maximumSerializedLength))) {
            return false;
        }
        try {
            return QUIET_JSON.writeValueAsString(map).length() <= maximumSerializedLength;
        } catch (JsonProcessingException ignored) {
            return false;
        }
    }

    private boolean boundedStringList(Object value) {
        return value instanceof List<?> values
                && values.size() <= MAX_COLLECTION_SIZE
                && values.stream().allMatch(item -> item instanceof String text && text.length() <= MAX_TAG_LENGTH);
    }
}
