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

package org.apache.hertzbeat.manager.service.entity;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Builds entity noise-control evidence from real alert, monitor, and rule labels.
 */
@Service
public class EntityNoiseControlReadModelService {

    private static final int NOISE_CONTROL_PREVIEW_LIMIT = 3;

    private static final List<String> ALERT_WORKSPACE_LABEL_KEYS = List.of(
            "hertzbeat.workspace_id",
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
    );

    private final EntityNoiseControlRuleQueryService entityNoiseControlRuleQueryService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityNoiseControlReadModelService(EntityNoiseControlRuleQueryService entityNoiseControlRuleQueryService,
                                              EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityNoiseControlRuleQueryService = entityNoiseControlRuleQueryService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public EntityDetailDto.EntityNoiseControlSummaryInfo buildNoiseControlSummary(EntityDto entityDto,
                                                                                  List<Monitor> monitors,
                                                                                  List<SingleAlert> activeAlerts) {
        return buildNoiseControlSummary(
                entityDto, monitors, activeAlerts, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public EntityDetailDto.EntityNoiseControlSummaryInfo buildNoiseControlSummary(EntityDto entityDto,
                                                                                  List<Monitor> monitors,
                                                                                  List<SingleAlert> activeAlerts,
                                                                                  String requestWorkspaceId) {
        List<Map<String, String>> candidateLabels = buildNoiseControlCandidateLabels(
                entityDto, monitors, activeAlerts, requestWorkspaceId);
        List<EntityDetailDto.EntityNoiseControlRuleInfo> matchedSilences =
                entityNoiseControlRuleQueryService.findEnabledSilences(requestWorkspaceId).stream()
                .map(rule -> matchSilenceRule(rule, candidateLabels))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(EntityDetailDto.EntityNoiseControlRuleInfo::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        List<EntityDetailDto.EntityNoiseControlRuleInfo> matchedInhibits =
                entityNoiseControlRuleQueryService.findEnabledInhibits(requestWorkspaceId).stream()
                .map(rule -> matchInhibitRule(rule, candidateLabels))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(EntityDetailDto.EntityNoiseControlRuleInfo::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        boolean possibleAlertSuppression = CollectionUtils.isEmpty(activeAlerts)
                && (!matchedSilences.isEmpty() || !matchedInhibits.isEmpty());
        return new EntityDetailDto.EntityNoiseControlSummaryInfo(
                matchedSilences.size(),
                matchedInhibits.size(),
                matchedSilences.stream().limit(NOISE_CONTROL_PREVIEW_LIMIT).toList(),
                matchedInhibits.stream().limit(NOISE_CONTROL_PREVIEW_LIMIT).toList(),
                possibleAlertSuppression
        );
    }

    private List<Map<String, String>> buildNoiseControlCandidateLabels(EntityDto entityDto,
                                                                       List<Monitor> monitors,
                                                                       List<SingleAlert> activeAlerts,
                                                                       String requestWorkspaceId) {
        List<Map<String, String>> candidates = new ArrayList<>();
        if (!CollectionUtils.isEmpty(activeAlerts)) {
            activeAlerts.stream()
                    .map(SingleAlert::getLabels)
                    .map(this::normalizeNoiseControlLabels)
                    .filter(labels -> !labels.isEmpty())
                    .forEach(candidates::add);
        }
        if (!candidates.isEmpty()) {
            return candidates;
        }
        Map<String, String> entityLabels = new LinkedHashMap<>();
        if (entityDto != null && entityDto.getEntity() != null) {
            String entityName = trimToNull(entityDto.getEntity().getName());
            if (entityName != null) {
                entityLabels.put("service.name", entityName);
            }
            String environment = trimToNull(entityDto.getEntity().getEnvironment());
            if (environment != null) {
                entityLabels.put("env", environment);
            }
            addNoiseControlWorkspaceLabels(entityLabels, defaultText(entityDto.getEntity().getWorkspaceId(), requestWorkspaceId));
        }
        if (!CollectionUtils.isEmpty(entityDto == null ? null : entityDto.getIdentities())) {
            entityDto.getIdentities().forEach(identity -> {
                String key = trimToNull(identity.getIdentityKey());
                String value = trimToNull(identity.getIdentityValue());
                if (key != null && value != null) {
                    entityLabels.put(key, value);
                }
            });
        }
        Map<String, String> normalizedEntityLabels = normalizeNoiseControlLabels(entityLabels);
        if (!normalizedEntityLabels.isEmpty()) {
            candidates.add(normalizedEntityLabels);
        }
        if (!CollectionUtils.isEmpty(monitors)) {
            monitors.stream()
                    .map(monitor -> buildMonitorNoiseControlLabels(monitor, requestWorkspaceId))
                    .filter(labels -> !labels.isEmpty())
                    .forEach(candidates::add);
        }
        return candidates;
    }

    private Map<String, String> buildMonitorNoiseControlLabels(Monitor monitor, String requestWorkspaceId) {
        Map<String, String> labels = new LinkedHashMap<>();
        if (monitor == null) {
            return labels;
        }
        if (!CollectionUtils.isEmpty(monitor.getLabels())) {
            labels.putAll(monitor.getLabels());
        }
        String instance = trimToNull(monitor.getInstance());
        if (instance != null) {
            labels.put(CommonConstants.LABEL_INSTANCE, instance);
            labels.put("service.name", instance);
        }
        String name = trimToNull(monitor.getName());
        if (name != null) {
            labels.put(CommonConstants.LABEL_INSTANCE_NAME, name);
        }
        String app = trimToNull(monitor.getApp());
        if (app != null) {
            labels.put("job", app);
        }
        addNoiseControlWorkspaceLabels(labels, requestWorkspaceId);
        return normalizeNoiseControlLabels(labels);
    }

    private Map<String, String> normalizeNoiseControlLabels(Map<String, String> labels) {
        if (CollectionUtils.isEmpty(labels)) {
            return Collections.emptyMap();
        }
        Map<String, String> normalizedLabels = new LinkedHashMap<>();
        labels.forEach((key, value) -> {
            String normalizedKey = trimToNull(key);
            String normalizedValue = trimToNull(value);
            if (normalizedKey != null && normalizedValue != null) {
                normalizedLabels.putIfAbsent(normalizedKey, normalizedValue);
            }
        });
        return normalizedLabels;
    }

    private EntityDetailDto.EntityNoiseControlRuleInfo matchSilenceRule(AlertSilence silence,
                                                                        List<Map<String, String>> candidateLabels) {
        if (silence == null) {
            return null;
        }
        if (Boolean.TRUE.equals(silence.isMatchAll())) {
            return new EntityDetailDto.EntityNoiseControlRuleInfo(
                    silence.getId(),
                    silence.getName(),
                    "silence",
                    true,
                    Collections.emptyList(),
                    toEpochMillis(silence.getGmtUpdate() == null ? silence.getGmtCreate() : silence.getGmtUpdate())
            );
        }
        Map<String, String> labels = normalizeNoiseControlLabels(silence.getLabels());
        if (labels.isEmpty()) {
            return null;
        }
        return candidateLabels.stream()
                .filter(candidate -> labels.entrySet().stream()
                        .allMatch(entry -> Objects.equals(candidate.get(entry.getKey()), entry.getValue())))
                .findFirst()
                .map(candidate -> new EntityDetailDto.EntityNoiseControlRuleInfo(
                        silence.getId(),
                        silence.getName(),
                        "silence",
                        false,
                        new ArrayList<>(labels.keySet()),
                        toEpochMillis(silence.getGmtUpdate() == null ? silence.getGmtCreate() : silence.getGmtUpdate())
                ))
                .orElse(null);
    }

    private EntityDetailDto.EntityNoiseControlRuleInfo matchInhibitRule(AlertInhibit inhibit,
                                                                        List<Map<String, String>> candidateLabels) {
        if (inhibit == null) {
            return null;
        }
        Map<String, String> labels = normalizeNoiseControlLabels(inhibit.getTargetLabels());
        if (labels.isEmpty()) {
            return null;
        }
        return candidateLabels.stream()
                .filter(candidate -> labels.entrySet().stream()
                        .allMatch(entry -> Objects.equals(candidate.get(entry.getKey()), entry.getValue())))
                .findFirst()
                .map(candidate -> new EntityDetailDto.EntityNoiseControlRuleInfo(
                        inhibit.getId(),
                        inhibit.getName(),
                        "inhibit",
                        false,
                        new ArrayList<>(labels.keySet()),
                        toEpochMillis(inhibit.getGmtUpdate() == null ? inhibit.getGmtCreate() : inhibit.getGmtUpdate())
                ))
                .orElse(null);
    }

    private void addNoiseControlWorkspaceLabels(Map<String, String> labels, String workspaceId) {
        String normalizedWorkspaceId = trimToNull(workspaceId);
        if (labels == null || normalizedWorkspaceId == null) {
            return;
        }
        for (String key : ALERT_WORKSPACE_LABEL_KEYS) {
            labels.putIfAbsent(key, AuthTokenScopes.normalizeWorkspaceId(normalizedWorkspaceId));
        }
    }

    private String defaultText(String value, String fallback) {
        String normalized = trimToNull(value);
        return normalized == null ? trimToNull(fallback) : normalized;
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private Long toEpochMillis(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }
}
