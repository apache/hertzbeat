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

package org.apache.hertzbeat.ai.gateway.tool.core;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.application.AgentEntityTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentLogTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentSingleAlertTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentTopologyTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentTraceTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Restricts resource-reading tools to the durable target of a user investigation.
 */
@Service
public class AgentTargetToolAuthorizer {

    public static final String TARGET_DENIAL_REASON =
            "Tool access is outside the durable investigation target.";

    private static final Set<String> DISCOVERY_TOOLS = Set.of("tool.search", "skill.load");
    private static final Set<String> MONITOR_GET_ARGUMENTS = Set.of("monitorId");
    private static final Set<String> METRICS_HISTORY_ARGUMENTS = Set.of(
            "monitorId", "metricKey", "start", "end", "step", "interval", "maxPoints");
    private static final Set<String> ALERT_GET_ARGUMENTS = Set.of("alertId", "alertType");
    private static final Set<String> ENTITY_GET_ARGUMENTS = Set.of("entityId");

    private final AgentEntityMonitorMetricAuthorityVerifier authorityVerifier;
    private final AgentSingleAlertTargetAuthorityService alertAuthorityVerifier;
    private final AgentEntityTargetAuthorityService entityAuthorityVerifier;
    private final AgentTopologyTargetAuthorityService topologyAuthorityVerifier;
    private final AgentTraceTargetAuthorityService traceAuthorityVerifier;
    private final AgentLogTargetAuthorityService logAuthorityVerifier;

    /** Test-only compatibility constructor for legacy target contracts. */
    public AgentTargetToolAuthorizer() {
        this(null, null, null, null, null, null);
    }

    public AgentTargetToolAuthorizer(AgentEntityMonitorMetricAuthorityVerifier authorityVerifier) {
        this(authorityVerifier, null, null, null, null, null);
    }

    public AgentTargetToolAuthorizer(AgentEntityMonitorMetricAuthorityVerifier authorityVerifier,
                                     AgentSingleAlertTargetAuthorityService alertAuthorityVerifier) {
        this(authorityVerifier, alertAuthorityVerifier, null, null, null, null);
    }

    public AgentTargetToolAuthorizer(AgentEntityMonitorMetricAuthorityVerifier authorityVerifier,
                                     AgentSingleAlertTargetAuthorityService alertAuthorityVerifier,
                                     AgentEntityTargetAuthorityService entityAuthorityVerifier) {
        this(authorityVerifier, alertAuthorityVerifier, entityAuthorityVerifier, null, null, null);
    }

    public AgentTargetToolAuthorizer(AgentEntityMonitorMetricAuthorityVerifier authorityVerifier,
                                     AgentSingleAlertTargetAuthorityService alertAuthorityVerifier,
                                     AgentEntityTargetAuthorityService entityAuthorityVerifier,
                                     AgentTopologyTargetAuthorityService topologyAuthorityVerifier) {
        this(authorityVerifier, alertAuthorityVerifier, entityAuthorityVerifier, topologyAuthorityVerifier, null, null);
    }

    public AgentTargetToolAuthorizer(AgentEntityMonitorMetricAuthorityVerifier authorityVerifier,
                                     AgentSingleAlertTargetAuthorityService alertAuthorityVerifier,
                                     AgentEntityTargetAuthorityService entityAuthorityVerifier,
                                     AgentTopologyTargetAuthorityService topologyAuthorityVerifier,
                                     AgentTraceTargetAuthorityService traceAuthorityVerifier) {
        this(authorityVerifier, alertAuthorityVerifier, entityAuthorityVerifier, topologyAuthorityVerifier,
                traceAuthorityVerifier, null);
    }

    @Autowired
    public AgentTargetToolAuthorizer(AgentEntityMonitorMetricAuthorityVerifier authorityVerifier,
                                     AgentSingleAlertTargetAuthorityService alertAuthorityVerifier,
                                     AgentEntityTargetAuthorityService entityAuthorityVerifier,
                                     AgentTopologyTargetAuthorityService topologyAuthorityVerifier,
                                     AgentTraceTargetAuthorityService traceAuthorityVerifier,
                                     AgentLogTargetAuthorityService logAuthorityVerifier) {
        this.authorityVerifier = authorityVerifier;
        this.alertAuthorityVerifier = alertAuthorityVerifier;
        this.entityAuthorityVerifier = entityAuthorityVerifier;
        this.topologyAuthorityVerifier = topologyAuthorityVerifier;
        this.traceAuthorityVerifier = traceAuthorityVerifier;
        this.logAuthorityVerifier = logAuthorityVerifier;
    }

    /**
     * Returns a stable denial reason when the requested tool is not correlated with the durable target.
     */
    public Optional<String> denialReason(AgentToolExecutionRequest request, AgentToolDescriptor descriptor) {
        AgentTargetRef target = request.getEffectiveTarget();
        if (target == null) {
            return Optional.empty();
        }
        if (isCanonicalAlertTarget(target)) {
            return alertCanonicalDenialReason(request, descriptor, target);
        }
        if (DISCOVERY_TOOLS.contains(descriptor.getName())) {
            return Optional.empty();
        }
        if (isCanonicalTopologyTarget(target)) {
            return topologyCanonicalDenialReason(request, descriptor, target);
        }
        if (isCanonicalTraceTarget(target)) {
            return traceCanonicalDenialReason(request, descriptor, target);
        }
        if (isCanonicalLogTarget(target)) {
            return logCanonicalDenialReason(request, descriptor, target);
        }
        if (isCanonicalEntityTarget(target)) {
            return entityCanonicalDenialReason(request, descriptor, target);
        }
        if (isCanonicalTarget(target)) {
            return canonicalDenialReason(request, descriptor, target);
        }
        if (request.getEntryType() != AgentRuntimeEntryType.USER_INPUT
                || descriptor.getRisk() != AgentToolRisk.READ
                || !isExactMonitorMetricTarget(target)) {
            return Optional.of(TARGET_DENIAL_REASON);
        }
        boolean allowed = switch (descriptor.getName()) {
            case "monitor.get" -> matchesMonitorGet(request.getArguments(), target.getMonitorId());
            case "metrics.history" -> matchesMetricsHistory(request.getArguments(), target);
            default -> false;
        };
        return allowed ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
    }

    /** Rechecks manager authority after a canonical resource handler returns, before ledger completion. */
    public Optional<String> postExecutionDenialReason(AgentToolExecutionRequest request,
                                                       AgentToolDescriptor descriptor) {
        AgentTargetRef target = request.getEffectiveTarget();
        if ("alert.get".equals(descriptor.getName()) && isCanonicalAlertTarget(target)) {
            return alertAuthorityVerifier.verify(request.getWorkspaceId(), target)
                    ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
        }
        if ("entity.get".equals(descriptor.getName()) && isCanonicalEntityTarget(target)) {
            return entityAuthorityVerifier.verify(request.getWorkspaceId(), target)
                    ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
        }
        if ("topology.query".equals(descriptor.getName()) && isCanonicalTopologyTarget(target)) {
            return topologyAuthorityVerifier.verify(request.getWorkspaceId(), target)
                    ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
        }
        if ("traces.get".equals(descriptor.getName()) && isCanonicalTraceTarget(target)) {
            return traceAuthorityVerifier.verify(request.getWorkspaceId(), target)
                    ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
        }
        if ("logs.query".equals(descriptor.getName()) && isCanonicalLogTarget(target)) {
            return logAuthorityVerifier.verify(request.getWorkspaceId(), target)
                    ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
        }
        if (!("metrics.history".equals(descriptor.getName()) || "monitor.get".equals(descriptor.getName()))
                || !isCanonicalTarget(target)) {
            return Optional.empty();
        }
        return authorityVerifier != null && authorityVerifier.verify(request.getWorkspaceId(), target)
                ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
    }

    private Optional<String> canonicalDenialReason(AgentToolExecutionRequest request,
                                                    AgentToolDescriptor descriptor, AgentTargetRef target) {
        if (request.getEntryType() != AgentRuntimeEntryType.USER_INPUT
                || descriptor.getRisk() != AgentToolRisk.READ) {
            return Optional.of(TARGET_DENIAL_REASON);
        }
        boolean argumentsMatch = switch (descriptor.getName()) {
            case "monitor.get" -> matchesMonitorGet(request.getArguments(), target.getMonitorId());
            case "metrics.history" -> matchesMetricsHistory(request.getArguments(), target);
            default -> false;
        };
        if (!argumentsMatch || authorityVerifier == null
                || !authorityVerifier.verify(request.getWorkspaceId(), target)) {
            return Optional.of(TARGET_DENIAL_REASON);
        }
        return Optional.empty();
    }

    private Optional<String> alertCanonicalDenialReason(AgentToolExecutionRequest request,
                                                         AgentToolDescriptor descriptor, AgentTargetRef target) {
        boolean allowed = request.getEntryType() == AgentRuntimeEntryType.USER_INPUT
                && descriptor.getRisk() == AgentToolRisk.READ
                && "alert.get".equals(descriptor.getName())
                && matchesAlertGet(request.getArguments(), target)
                && alertAuthorityVerifier.verify(request.getWorkspaceId(), target);
        return allowed ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
    }

    private Optional<String> entityCanonicalDenialReason(AgentToolExecutionRequest request,
                                                          AgentToolDescriptor descriptor, AgentTargetRef target) {
        boolean allowed = request.getEntryType() == AgentRuntimeEntryType.USER_INPUT
                && descriptor.getRisk() == AgentToolRisk.READ
                && "entity.get".equals(descriptor.getName())
                && matchesEntityGet(request.getArguments(), target)
                && entityAuthorityVerifier.verify(request.getWorkspaceId(), target);
        return allowed ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
    }

    private Optional<String> topologyCanonicalDenialReason(AgentToolExecutionRequest request,
                                                            AgentToolDescriptor descriptor, AgentTargetRef target) {
        boolean allowed = request.getEntryType() == AgentRuntimeEntryType.USER_INPUT
                && descriptor.getRisk() == AgentToolRisk.READ
                && "topology.query".equals(descriptor.getName())
                && matchesTopologyQuery(request.getArguments(), target)
                && topologyAuthorityVerifier.verify(request.getWorkspaceId(), target);
        return allowed ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
    }

    private Optional<String> traceCanonicalDenialReason(AgentToolExecutionRequest request,
                                                         AgentToolDescriptor descriptor, AgentTargetRef target) {
        boolean allowed = request.getEntryType() == AgentRuntimeEntryType.USER_INPUT
                && descriptor.getRisk() == AgentToolRisk.READ
                && "traces.get".equals(descriptor.getName())
                && matchesTraceGet(request.getArguments(), target)
                && traceAuthorityVerifier.verify(request.getWorkspaceId(), target);
        return allowed ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
    }

    private Optional<String> logCanonicalDenialReason(AgentToolExecutionRequest request,
                                                        AgentToolDescriptor descriptor, AgentTargetRef target) {
        boolean allowed = request.getEntryType() == AgentRuntimeEntryType.USER_INPUT
                && descriptor.getRisk() == AgentToolRisk.READ
                && "logs.query".equals(descriptor.getName())
                && matchesLogQuery(request.getArguments(), target)
                && logAuthorityVerifier.verify(request.getWorkspaceId(), target);
        return allowed ? Optional.empty() : Optional.of(TARGET_DENIAL_REASON);
    }

    private boolean isCanonicalTarget(AgentTargetRef target) {
        return authorityVerifier != null && authorityVerifier.isCanonicalTarget(target);
    }

    private boolean isCanonicalAlertTarget(AgentTargetRef target) {
        return alertAuthorityVerifier != null && alertAuthorityVerifier.isCanonicalTarget(target);
    }

    private boolean isCanonicalEntityTarget(AgentTargetRef target) {
        return entityAuthorityVerifier != null && entityAuthorityVerifier.isCanonicalTarget(target);
    }

    private boolean isCanonicalTopologyTarget(AgentTargetRef target) {
        return topologyAuthorityVerifier != null && topologyAuthorityVerifier.isCanonicalTarget(target);
    }

    private boolean isCanonicalTraceTarget(AgentTargetRef target) {
        return traceAuthorityVerifier != null && traceAuthorityVerifier.isCanonicalTarget(target);
    }

    private boolean isCanonicalLogTarget(AgentTargetRef target) {
        return logAuthorityVerifier != null && logAuthorityVerifier.isCanonicalTarget(target);
    }

    private boolean isExactMonitorMetricTarget(AgentTargetRef target) {
        AgentSignalRef signal = target.getSignal();
        return target.getMonitorId() != null
                && target.getMonitorId() > 0
                && target.getAlertId() == null
                && target.getEntityId() == null
                && target.getCollector() == null
                && target.getTopology() == null
                && target.getTrace() == null
                && target.getLog() == null
                && signal != null
                && "metrics".equals(signal.getType())
                && isMetricKey(signal.getQuery())
                && signal.getStart() != null
                && signal.getStart() > 0
                && signal.getEnd() != null
                && signal.getStart() < signal.getEnd();
    }

    private boolean matchesMonitorGet(Map<String, Object> arguments, long monitorId) {
        return MONITOR_GET_ARGUMENTS.containsAll(arguments.keySet())
                && arguments.size() == 1
                && exactLong(arguments.get("monitorId"), monitorId);
    }

    private boolean matchesMetricsHistory(Map<String, Object> arguments, AgentTargetRef target) {
        AgentSignalRef signal = target.getSignal();
        return METRICS_HISTORY_ARGUMENTS.containsAll(arguments.keySet())
                && exactLong(arguments.get("monitorId"), target.getMonitorId())
                && signal.getQuery().equals(arguments.get("metricKey"))
                && exactLong(arguments.get("start"), signal.getStart())
                && exactLong(arguments.get("end"), signal.getEnd());
    }

    private boolean matchesAlertGet(Map<String, Object> arguments, AgentTargetRef target) {
        return ALERT_GET_ARGUMENTS.equals(arguments.keySet())
                && exactLong(arguments.get("alertId"), target.getAlertId())
                && AgentSingleAlertTargetAuthorityService.ALERT_TYPE.equals(arguments.get("alertType"));
    }

    private boolean matchesEntityGet(Map<String, Object> arguments, AgentTargetRef target) {
        return ENTITY_GET_ARGUMENTS.equals(arguments.keySet())
                && exactLong(arguments.get("entityId"), target.getEntityId());
    }

    private boolean matchesTopologyQuery(Map<String, Object> arguments, AgentTargetRef target) {
        AgentTopologyRef topology = target.getTopology();
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
        if (!arguments.keySet().equals(expected.keySet())) {
            return false;
        }
        return expected.entrySet().stream().allMatch(entry -> {
            Object actual = arguments.get(entry.getKey());
            Object value = entry.getValue();
            return value instanceof Number number
                    ? exactLong(actual, number.longValue()) : Objects.equals(value, actual);
        });
    }

    private boolean matchesTraceGet(Map<String, Object> arguments, AgentTargetRef target) {
        AgentTraceRef trace = target.getTrace();
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("traceId", trace.getTraceId());
        putIfPresent(expected, "spanId", trace.getSpanId());
        expected.put("start", trace.getStart());
        expected.put("end", trace.getEnd());
        putIfPresent(expected, "serviceName", trace.getServiceName());
        putIfPresent(expected, "serviceNamespace", trace.getServiceNamespace());
        putIfPresent(expected, "environment", trace.getEnvironment());
        putIfPresent(expected, "resourceFilter", trace.getResourceFilter());
        putIfPresent(expected, "attributeFilter", trace.getAttributeFilter());
        putIfPresent(expected, "minDurationMs", trace.getMinDurationMs());
        putIfPresent(expected, "maxDurationMs", trace.getMaxDurationMs());
        if (!arguments.keySet().equals(expected.keySet())) {
            return false;
        }
        return expected.entrySet().stream().allMatch(entry -> {
            Object actual = arguments.get(entry.getKey());
            Object value = entry.getValue();
            return value instanceof Number number
                    ? exactLong(actual, number.longValue()) : Objects.equals(value, actual);
        });
    }

    private boolean matchesLogQuery(Map<String, Object> arguments, AgentTargetRef target) {
        AgentLogRef log = target.getLog();
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("start", log.getStart());
        expected.put("end", log.getEnd());
        putIfPresent(expected, "traceId", log.getTraceId());
        putIfPresent(expected, "spanId", log.getSpanId());
        putIfPresent(expected, "severityNumber", log.getSeverityNumber());
        putIfPresent(expected, "severityText", log.getSeverityText());
        putIfPresent(expected, "search", log.getSearch());
        putIfPresent(expected, "serviceName", log.getServiceName());
        putIfPresent(expected, "serviceNamespace", log.getServiceNamespace());
        putIfPresent(expected, "environment", log.getEnvironment());
        putIfPresent(expected, "resourceFilter", log.getResourceFilter());
        putIfPresent(expected, "attributeFilter", log.getAttributeFilter());
        expected.put("hideInternal", log.getHideInternal());
        expected.put("hideNoise", log.getHideNoise());
        expected.put("pageIndex", log.getPageIndex());
        expected.put("pageSize", log.getPageSize());
        if (!arguments.keySet().equals(expected.keySet())) {
            return false;
        }
        return expected.entrySet().stream().allMatch(entry -> {
            Object actual = arguments.get(entry.getKey());
            Object value = entry.getValue();
            return value instanceof Number number
                    ? exactLong(actual, number.longValue()) : Objects.equals(value, actual);
        });
    }

    private void putIfPresent(Map<String, Object> values, String field, Object value) {
        if (value != null) {
            values.put(field, value);
        }
    }

    private boolean exactLong(Object value, long expected) {
        if (!(value instanceof Number number)) {
            return false;
        }
        try {
            return new BigDecimal(number.toString()).longValueExact() == expected;
        } catch (ArithmeticException | NumberFormatException ignored) {
            return false;
        }
    }

    private boolean isMetricKey(String metricKey) {
        if (!StringUtils.hasText(metricKey)) {
            return false;
        }
        int separator = metricKey.indexOf('.');
        return separator > 0 && separator == metricKey.lastIndexOf('.') && separator < metricKey.length() - 1;
    }
}
