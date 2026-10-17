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

package org.apache.hertzbeat.ai.gateway.application;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentIncidentScope;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Validates an automatic incident without treating label similarity as entity authority. */
@Service
public class AgentIncidentTargetAuthorityService {
    public static final String TARGET_VERSION = "incident.v1";
    public static final String AUTHORITY_VERSION = "incident-authority.v1";
    private static final long MAX_WINDOW_SECONDS = 86_400;
    private final AlertAnalysisPolicyService policies;
    private final AlertService alerts;
    private final AgentSingleAlertTargetAuthorityService singleAlerts;

    public AgentIncidentTargetAuthorityService(AlertAnalysisPolicyService policies, AlertService alerts,
                                               AgentSingleAlertTargetAuthorityService singleAlerts) {
        this.policies = policies;
        this.alerts = alerts;
        this.singleAlerts = singleAlerts;
    }

    public AgentTargetRef canonicalize(String workspace, AgentAlertIncidentContext incident, long end) {
        if (!StringUtils.hasText(workspace) || incident == null || incident.analysisPolicyId() <= 0
                || incident.triggerAlertId() == null || incident.triggerAlertId() <= 0
                || incident.alertIds().isEmpty() || incident.alertIds().size() > 256
                || incident.alertCount() != incident.alertIds().size()
                || new HashSet<>(incident.alertIds()).size() != incident.alertIds().size()
                || !incident.alertIds().contains(incident.triggerAlertId())
                || incident.alertIds().stream().anyMatch(id -> id == null || id <= 0)
                || end < incident.windowStartedAt()) {
            throw unavailable();
        }
        AlertAnalysisPolicy policy = policies.findEnabled(workspace).stream()
                .filter(value -> Objects.equals(value.getId(), incident.analysisPolicyId())
                        && Objects.equals(workspace, value.getWorkspaceId()) && value.isEnabled())
                .findFirst().orElseThrow(AgentIncidentTargetAuthorityService::unavailable);
        if (policy.getWindowSeconds() <= 0
                || policy.getWindowSeconds() > MAX_WINDOW_SECONDS || policy.getMinimumAlertCount() <= 0
                || incident.alertCount() < policy.getMinimumAlertCount()
                || end - incident.windowStartedAt() > policy.getWindowSeconds() * 1000) {
            throw unavailable();
        }
        List<Long> ids = incident.alertIds().stream().sorted().toList();
        StringBuilder material = new StringBuilder(AUTHORITY_VERSION).append(';')
                .append(policy.getId()).append(';').append(policy.getWindowSeconds()).append(';')
                .append(policy.getMinimumAlertCount()).append(';').append(incident.triggerAlertId()).append(';')
                .append(incident.windowStartedAt()).append(';').append(end).append(';');
        Map<String, String> group = null;
        for (Long id : ids) {
            SingleAlert alert = alerts.findSingleAlert(workspace, id)
                    .filter(value -> Objects.equals(workspace, value.getWorkspaceId()) && Objects.equals(id, value.getId()))
                    .orElseThrow(AgentIncidentTargetAuthorityService::unavailable);
            Map<String, String> labels = alert.getLabels() == null ? Map.of() : alert.getLabels();
            if (policy.getMatchLabels() == null || policy.getGroupByLabels() == null
                    || !policy.getMatchLabels().entrySet().stream()
                    .allMatch(entry -> Objects.equals(entry.getValue(), labels.get(entry.getKey())))
                    || policy.getGroupByLabels().stream().anyMatch(key -> labels.get(key) == null)) {
                throw unavailable();
            }
            Map<String, String> currentGroup = new java.util.TreeMap<>();
            policy.getGroupByLabels().forEach(key -> currentGroup.put(key, labels.get(key)));
            if (group != null && !group.equals(currentGroup)) {
                throw unavailable();
            }
            group = currentGroup;
            Long observed = alert.getActiveAt() == null ? alert.getStartAt() : alert.getActiveAt();
            long earliest = Math.max(0, incident.windowStartedAt() - policy.getWindowSeconds() * 1000);
            if (observed == null || observed < earliest || observed > end) {
                throw unavailable();
            }
            material.append(id).append(':').append(singleAlerts.canonicalize(workspace, id).getAuthority().getHash())
                    .append(';');
        }
        // Include policy selectors; changing grouping or matching during execution invalidates the authority.
        material.append(GatewayText.sha256(org.apache.hertzbeat.common.util.JsonUtil.toJson(new java.util.TreeMap<>(policy.getMatchLabels()))))
                .append(';').append(GatewayText.sha256(org.apache.hertzbeat.common.util.JsonUtil.toJson(policy.getGroupByLabels())));
        return AgentTargetRef.builder().version(TARGET_VERSION).alertId(incident.triggerAlertId()).alertType("single")
                .incident(new AgentIncidentScope(incident.analysisPolicyId(), ids, incident.windowStartedAt(), end))
                .authority(AgentTargetAuthority.builder().bindingId(incident.analysisPolicyId())
                        .version(AUTHORITY_VERSION).hash("sha256:" + GatewayText.sha256(material.toString())).build())
                .build();
    }

    public boolean verify(String workspace, AgentTargetRef target) {
        if (!isCanonicalTarget(target)) {
            return false;
        }
        try {
            AgentIncidentScope scope = target.getIncident();
            return target.equals(canonicalize(workspace, new AgentAlertIncidentContext(scope.analysisPolicyId(),
                    target.getAlertId(), scope.alertIds(), scope.alertIds().size(), scope.windowStartedAt()), scope.end()));
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    public static boolean isCanonicalTarget(AgentTargetRef target) {
        if (target == null || !TARGET_VERSION.equals(target.getVersion()) || target.getIncident() == null
                || target.getAuthority() == null || !AUTHORITY_VERSION.equals(target.getAuthority().getVersion())
                || target.getAuthority().getHash() == null
                || !target.getAuthority().getHash().matches("sha256:[0-9a-f]{64}")) {
            return false;
        }
        AgentIncidentScope scope = target.getIncident();
        return scope.analysisPolicyId() != null && scope.analysisPolicyId() > 0
                && Objects.equals(scope.analysisPolicyId(), target.getAuthority().getBindingId())
                && target.getAlertId() != null && "single".equals(target.getAlertType())
                && !scope.alertIds().isEmpty() && scope.alertIds().size() <= 256
                && scope.alertIds().stream().allMatch(id -> id != null && id > 0)
                && new HashSet<>(scope.alertIds()).size() == scope.alertIds().size()
                && scope.alertIds().contains(target.getAlertId()) && scope.windowStartedAt() >= 0
                && scope.end() >= scope.windowStartedAt()
                && scope.end() - scope.windowStartedAt() <= MAX_WINDOW_SECONDS * 1000
                && target.getEntityId() == null && target.getMonitorId() == null && target.getService() == null
                && target.getCollector() == null && target.getSignal() == null && target.getTopology() == null
                && target.getTrace() == null && target.getLog() == null;
    }

    public static boolean permits(AgentTargetRef target, String tool, Map<String, Object> arguments) {
        if (!isCanonicalTarget(target) || arguments == null) {
            return false;
        }
        if (Set.of("tool.search", "skill.load").contains(tool)) {
            return true;
        }
        if (!"alert.get".equals(tool) || !Set.of("alertId", "alertType").equals(arguments.keySet())
                || !"single".equals(arguments.get("alertType")) || !(arguments.get("alertId") instanceof Number id)) {
            return false;
        }
        try {
            return target.getIncident().alertIds().contains(new BigDecimal(id.toString()).longValueExact());
        } catch (ArithmeticException | NumberFormatException ignored) {
            return false;
        }
    }

    private static IllegalArgumentException unavailable() {
        return new IllegalArgumentException("Alert incident authority is unavailable");
    }
}
