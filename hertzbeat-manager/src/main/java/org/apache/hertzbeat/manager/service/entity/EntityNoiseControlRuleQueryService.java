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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Query boundary for alert silence and inhibit rules used as entity noise-control evidence.
 */
@Service
public class EntityNoiseControlRuleQueryService {

    private static final Set<String> ALERT_WORKSPACE_LABEL_KEYS = Set.of(
            "hertzbeat.workspace_id",
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
    );

    private final AlertSilenceDao alertSilenceDao;
    private final AlertInhibitDao alertInhibitDao;

    public EntityNoiseControlRuleQueryService(AlertSilenceDao alertSilenceDao, AlertInhibitDao alertInhibitDao) {
        this.alertSilenceDao = alertSilenceDao;
        this.alertInhibitDao = alertInhibitDao;
    }

    public List<AlertSilence> findEnabledSilences(String requestWorkspaceId) {
        return alertSilenceDao.findAlertSilencesByEnableTrue().stream()
                .filter(rule -> matchesSilenceRuleRequestWorkspace(rule, requestWorkspaceId))
                .toList();
    }

    public List<AlertInhibit> findEnabledInhibits(String requestWorkspaceId) {
        return alertInhibitDao.findAlertInhibitsByEnableIsTrue().stream()
                .filter(rule -> matchesInhibitRuleRequestWorkspace(rule, requestWorkspaceId))
                .toList();
    }

    private boolean matchesSilenceRuleRequestWorkspace(AlertSilence silence, String requestWorkspaceId) {
        return matchesNoiseControlRuleRequestWorkspace(silence == null ? null : silence.getLabels(), requestWorkspaceId);
    }

    private boolean matchesInhibitRuleRequestWorkspace(AlertInhibit inhibit, String requestWorkspaceId) {
        if (inhibit == null) {
            return false;
        }
        Map<String, String> labels = new LinkedHashMap<>();
        if (!CollectionUtils.isEmpty(inhibit.getSourceLabels())) {
            labels.putAll(inhibit.getSourceLabels());
        }
        if (!CollectionUtils.isEmpty(inhibit.getTargetLabels())) {
            labels.putAll(inhibit.getTargetLabels());
        }
        return matchesNoiseControlRuleRequestWorkspace(labels, requestWorkspaceId);
    }

    private boolean matchesNoiseControlRuleRequestWorkspace(Map<String, String> labels, String requestWorkspaceId) {
        String normalizedRequestWorkspaceId = trimToNull(requestWorkspaceId);
        if (normalizedRequestWorkspaceId == null) {
            return true;
        }
        normalizedRequestWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(normalizedRequestWorkspaceId);
        Map<String, String> normalizedLabels = normalizeNoiseControlLabels(labels);
        boolean hasWorkspaceLabel = false;
        for (String key : ALERT_WORKSPACE_LABEL_KEYS) {
            String workspaceId = trimToNull(normalizedLabels.get(key));
            if (workspaceId == null) {
                continue;
            }
            hasWorkspaceLabel = true;
            if (!normalizedRequestWorkspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(workspaceId))) {
                return false;
            }
        }
        return hasWorkspaceLabel || AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(normalizedRequestWorkspaceId);
    }

    private Map<String, String> normalizeNoiseControlLabels(Map<String, String> labels) {
        if (CollectionUtils.isEmpty(labels)) {
            return Map.of();
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

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
