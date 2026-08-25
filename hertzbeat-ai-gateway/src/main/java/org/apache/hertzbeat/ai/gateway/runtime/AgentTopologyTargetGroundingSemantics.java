/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.application.AgentTopologyTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.springframework.util.StringUtils;

/** Production-shaped output semantics for one canonical focused Topology observation. */
final class AgentTopologyTargetGroundingSemantics {

    private static final Set<String> SOURCE_KINDS = Set.of(
            "all", "alert-impact", "entity-relation", "monitor-bind", "monitor-ownership",
            "otlp-trace-call", "k8s-workload", "cmdb-manual-label", "database-middleware-connection",
            "template-dependency");
    private static final Set<String> OUTPUT_KEYS = Set.of(
            "apiBacked", "focusEntityId", "depth", "sourceKinds", "partial", "partialReasons",
            "edgePage", "nodes", "edges", "impactTimeline");
    private static final Set<String> PAGE_KEYS = Set.of("pageIndex", "pageSize", "totalElements", "hasNext");
    private static final Set<String> NODE_KEYS = Set.of(
            "id", "entityId", "entityName", "entityType", "namespace", "environment", "health", "focus",
            "evidenceBadges", "redMetrics");
    private static final Set<String> EDGE_KEYS = Set.of(
            "id", "relationId", "sourceNodeId", "targetNodeId", "sourceEntityId", "targetEntityId",
            "targetRef", "sampleTraceId", "sampleSpanId", "firstSeen", "lastSeen", "relationType",
            "relationSource", "status", "score", "evidenceBadges", "redMetrics");
    private static final Set<String> RED_KEYS = Set.of(
            "requestRatePerSecond", "requestCount", "errorRate", "errorCount", "latencyP95Ms", "latencyAvgMs");
    private static final Set<String> TIMELINE_KEYS = Set.of(
            "id", "edgeId", "entityId", "sourceKind", "eventType", "title", "detail", "actor", "occurredAt");
    private static final int MAX_COLLECTION_SIZE = 1_024;
    private static final int MAX_TEXT_LENGTH = 512;

    boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        AgentTopologyRef topology = target == null ? null : target.getTopology();
        return target != null
                && AgentTopologyTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && target.getEntityId() != null && target.getEntityId() > 0
                && topology != null && Objects.equals(target.getEntityId(), topology.getRootEntityId())
                && normalizedTopology(topology)
                && authority != null && Objects.equals(target.getEntityId(), authority.getBindingId())
                && AgentTopologyTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && authority.getHash() != null && authority.getHash().matches("sha256:[0-9a-f]{64}")
                && target.getMonitorId() == null && target.getAlertId() == null && target.getAlertType() == null
                && target.getCollector() == null && target.getSignal() == null && target.getTrace() == null
                && target.getLog() == null
                && target.getService() == null;
    }

    int matchingObservationCount(AgentTargetRef target, AgentRuntimeToolCall call, Map<String, Object> output) {
        if (!isCanonicalTarget(target) || !matchesCall(target.getTopology(), call)
                || !OUTPUT_KEYS.equals(output.keySet()) || !Boolean.TRUE.equals(output.get("apiBacked"))
                || !exactLong(output.get("focusEntityId"), target.getEntityId())
                || !exactLong(output.get("depth"), target.getTopology().getDepth())) {
            return -1;
        }
        List<?> sourceKinds = list(output.get("sourceKinds"));
        List<?> partialReasons = list(output.get("partialReasons"));
        List<?> nodes = list(output.get("nodes"));
        List<?> edges = list(output.get("edges"));
        List<?> timeline = list(output.get("impactTimeline"));
        if (!boundedStrings(sourceKinds) || !sourceKinds.contains(target.getTopology().getSourceKind())
                || !(output.get("partial") instanceof Boolean partial) || !boundedStrings(partialReasons)
                || !partial && !partialReasons.isEmpty()
                || nodes == null || nodes.isEmpty() || nodes.size() > MAX_COLLECTION_SIZE
                || edges == null || edges.size() > MAX_COLLECTION_SIZE
                || timeline == null || timeline.size() > MAX_COLLECTION_SIZE
                || !matchesPage(output.get("edgePage"), target.getTopology(), edges.size())) {
            return -1;
        }
        Set<String> nodeIds = new HashSet<>();
        int focusedRoots = 0;
        boolean selectedNodePresent = target.getTopology().getNodeId() == null;
        for (Object value : nodes) {
            if (!(value instanceof Map<?, ?> node) || !matchesNode(node, target.getTopology())) {
                return -1;
            }
            String nodeId = (String) node.get("id");
            if (!nodeIds.add(nodeId)) {
                return -1;
            }
            if (Boolean.TRUE.equals(node.get("focus"))) {
                focusedRoots++;
                if (!exactLong(node.get("entityId"), target.getEntityId())) {
                    return -1;
                }
            }
            selectedNodePresent |= Objects.equals(target.getTopology().getNodeId(), nodeId);
        }
        if (focusedRoots != 1 || !selectedNodePresent) {
            return -1;
        }
        Set<String> edgeIds = new HashSet<>();
        boolean selectedEdgePresent = target.getTopology().getEdgeId() == null;
        for (Object value : edges) {
            if (!(value instanceof Map<?, ?> edge) || !matchesEdge(edge, target.getTopology(), nodeIds)) {
                return -1;
            }
            String edgeId = (String) edge.get("id");
            if (!edgeIds.add(edgeId)) {
                return -1;
            }
            selectedEdgePresent |= Objects.equals(target.getTopology().getEdgeId(), edgeId);
        }
        if (!selectedEdgePresent || timeline.stream().anyMatch(value -> !(value instanceof Map<?, ?> event)
                || !matchesTimeline(event))) {
            return -1;
        }
        return nodes.size() + edges.size();
    }

    private boolean normalizedTopology(AgentTopologyRef topology) {
        return topology.getRootEntityId() != null && topology.getRootEntityId() > 0
                && topology.getDepth() != null && topology.getDepth() >= 1 && topology.getDepth() <= 2
                && !(topology.getNodeId() != null && topology.getEdgeId() != null)
                && normalizedOptionalText(topology.getNodeId(), 512)
                && normalizedOptionalText(topology.getEdgeId(), 512)
                && normalizedOptionalText(topology.getEnvironment(), 128)
                && normalizedOptionalText(topology.getRelationType(), 128)
                && SOURCE_KINDS.contains(topology.getSourceKind())
                && normalizedRange(topology.getStart(), topology.getEnd())
                && topology.getHideInternal() != null
                && topology.getPageIndex() != null && topology.getPageIndex() >= 0 && topology.getPageIndex() <= 10_000
                && topology.getPageSize() != null && topology.getPageSize() >= 1 && topology.getPageSize() <= 100;
    }

    private boolean normalizedOptionalText(String value, int maximumLength) {
        return value == null || StringUtils.hasText(value) && value.equals(value.trim())
                && value.length() <= maximumLength
                && value.codePoints().noneMatch(code -> code < 32 || code == 127);
    }

    private boolean normalizedRange(Long start, Long end) {
        return start == null && end == null || start != null && end != null && start > 0 && end > start
                && end - start <= java.time.Duration.ofDays(7).toMillis();
    }

    private boolean matchesCall(AgentTopologyRef topology, AgentRuntimeToolCall call) {
        if (!"topology.query".equals(call.getToolName())) {
            return false;
        }
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("entityId", topology.getRootEntityId());
        expected.put("depth", topology.getDepth());
        putIfPresent(expected, "environment", topology.getEnvironment());
        expected.put("sourceKind", topology.getSourceKind());
        putIfPresent(expected, "start", topology.getStart());
        putIfPresent(expected, "end", topology.getEnd());
        putIfPresent(expected, "relationType", topology.getRelationType());
        expected.put("hideInternal", topology.getHideInternal());
        expected.put("pageIndex", topology.getPageIndex());
        expected.put("pageSize", topology.getPageSize());
        if (!expected.keySet().equals(call.getArguments().keySet())) {
            return false;
        }
        return expected.entrySet().stream().allMatch(entry -> entry.getValue() instanceof Number expectedNumber
                ? exactLong(call.getArguments().get(entry.getKey()), expectedNumber.longValue())
                : Objects.equals(entry.getValue(), call.getArguments().get(entry.getKey())));
    }

    private boolean matchesPage(Object value, AgentTopologyRef topology, int visibleEdges) {
        if (!(value instanceof Map<?, ?> page) || !PAGE_KEYS.equals(page.keySet())
                || !exactLong(page.get("pageIndex"), topology.getPageIndex())
                || !exactLong(page.get("pageSize"), topology.getPageSize())
                || !(page.get("hasNext") instanceof Boolean hasNext)) {
            return false;
        }
        long total = nonnegativeLong(page.get("totalElements"));
        if (total < visibleEdges) {
            return false;
        }
        long nextOffset = ((long) topology.getPageIndex() + 1) * topology.getPageSize();
        return hasNext == (nextOffset < total);
    }

    private boolean matchesNode(Map<?, ?> node, AgentTopologyRef topology) {
        return NODE_KEYS.equals(node.keySet())
                && requiredText(node.get("id"))
                && positiveLong(node.get("entityId"))
                && requiredText(node.get("entityName"))
                && requiredText(node.get("entityType"))
                && nullableText(node.get("namespace"))
                && nullableText(node.get("environment"))
                && (topology.getEnvironment() == null
                || Objects.equals(topology.getEnvironment(), node.get("environment")))
                && nullableText(node.get("health"))
                && node.get("focus") instanceof Boolean
                && boundedStrings(list(node.get("evidenceBadges")))
                && redMetrics(node.get("redMetrics"));
    }

    private boolean matchesEdge(Map<?, ?> edge, AgentTopologyRef topology, Set<String> nodeIds) {
        Object targetNodeId = edge.get("targetNodeId");
        boolean targetReferenceValid = requiredText(targetNodeId) && nodeIds.contains(targetNodeId)
                || targetNodeId == null && edge.get("targetEntityId") == null && requiredText(edge.get("targetRef"));
        return EDGE_KEYS.equals(edge.keySet())
                && requiredText(edge.get("id"))
                && nullablePositiveLong(edge.get("relationId"))
                && requiredText(edge.get("sourceNodeId")) && nodeIds.contains(edge.get("sourceNodeId"))
                && targetReferenceValid
                && positiveLong(edge.get("sourceEntityId"))
                && nullablePositiveLong(edge.get("targetEntityId"))
                && nullableText(edge.get("targetRef"))
                && nullableText(edge.get("sampleTraceId"))
                && nullableText(edge.get("sampleSpanId"))
                && nullableText(edge.get("firstSeen"))
                && nullableText(edge.get("lastSeen"))
                && requiredText(edge.get("relationType"))
                && (topology.getRelationType() == null
                || Objects.equals(topology.getRelationType(), edge.get("relationType")))
                && requiredText(edge.get("relationSource"))
                && requiredText(edge.get("status"))
                && nullableNonnegativeLong(edge.get("score"))
                && boundedStrings(list(edge.get("evidenceBadges")))
                && redMetrics(edge.get("redMetrics"));
    }

    private boolean redMetrics(Object value) {
        if (!(value instanceof Map<?, ?> metrics) || !RED_KEYS.equals(metrics.keySet())) {
            return false;
        }
        return metrics.values().stream().allMatch(this::nullableNonnegativeNumber);
    }

    private boolean matchesTimeline(Map<?, ?> event) {
        return TIMELINE_KEYS.equals(event.keySet())
                && requiredText(event.get("id"))
                && nullableText(event.get("edgeId"))
                && nullablePositiveLong(event.get("entityId"))
                && requiredText(event.get("sourceKind"))
                && requiredText(event.get("eventType"))
                && requiredText(event.get("title"))
                && nullableText(event.get("detail"))
                && nullableText(event.get("actor"))
                && nullableText(event.get("occurredAt"));
    }

    private void putIfPresent(Map<String, Object> values, String field, Object value) {
        if (value != null) {
            values.put(field, value);
        }
    }

    private List<?> list(Object value) {
        return value instanceof List<?> values ? values : null;
    }

    private boolean boundedStrings(List<?> values) {
        return values != null && values.size() <= MAX_COLLECTION_SIZE
                && values.stream().allMatch(value -> value instanceof String text
                && StringUtils.hasText(text) && text.length() <= MAX_TEXT_LENGTH);
    }

    private boolean requiredText(Object value) {
        return value instanceof String text && StringUtils.hasText(text) && text.length() <= MAX_TEXT_LENGTH;
    }

    private boolean nullableText(Object value) {
        return value == null || value instanceof String text && text.length() <= MAX_TEXT_LENGTH;
    }

    private boolean exactLong(Object value, long expected) {
        return number(value, true) != null && number(value, true).longValue() == expected;
    }

    private boolean positiveLong(Object value) {
        Long converted = number(value, true);
        return converted != null && converted > 0;
    }

    private boolean nullablePositiveLong(Object value) {
        return value == null || positiveLong(value);
    }

    private boolean nullableNonnegativeLong(Object value) {
        Long converted = value == null ? 0L : number(value, true);
        return converted != null && converted >= 0;
    }

    private long nonnegativeLong(Object value) {
        Long converted = number(value, true);
        return converted == null || converted < 0 ? -1 : converted;
    }

    private boolean nullableNonnegativeNumber(Object value) {
        return value == null || number(value, false) != null && new BigDecimal(value.toString()).signum() >= 0;
    }

    private Long number(Object value, boolean exactLong) {
        if (!(value instanceof Number number)) {
            return null;
        }
        try {
            BigDecimal decimal = new BigDecimal(number.toString());
            return exactLong ? decimal.longValueExact() : decimal.signum() >= 0 ? 0L : null;
        } catch (ArithmeticException | NumberFormatException ignored) {
            return null;
        }
    }
}
