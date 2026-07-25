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

package org.apache.hertzbeat.alert.service;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.AlertAnalysisPolicyDao;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Manages automatic alert analysis policies and their Agent client prerequisite. */
@Service
public class AlertAnalysisPolicyService {

    private final AlertAnalysisPolicyDao policyDao;
    private final ObjectProvider<AgentClientAvailability> agentClientAvailabilityProvider;

    public AlertAnalysisPolicyService(AlertAnalysisPolicyDao policyDao,
                                      ObjectProvider<AgentClientAvailability> agentClientAvailabilityProvider) {
        this.policyDao = policyDao;
        this.agentClientAvailabilityProvider = agentClientAvailabilityProvider;
    }

    @Transactional
    public AlertAnalysisPolicy create(String name, Map<String, String> matchLabels,
                                      List<String> groupByLabels, Long windowSeconds,
                                      Integer minimumAlertCount, Long cooldownSeconds) {
        requireAgentClientConfigured();
        // Tool and WebUI requests can omit grouping, but a policy without grouping cannot aggregate alerts.
        if (!StringUtils.hasText(name) || groupByLabels == null || groupByLabels.isEmpty()) {
            throw new IllegalArgumentException("Policy name and groupByLabels are required");
        }
        // Optional tuning values are defaulted at this request boundary before persistence.
        long window = positive(windowSeconds, 300, "windowSeconds");
        long cooldown = positive(cooldownSeconds, 1800, "cooldownSeconds");
        int alertCount = minimumAlertCount == null ? 2 : minimumAlertCount;
        if (alertCount < 1) {
            throw new IllegalArgumentException("minimumAlertCount must be positive");
        }
        return policyDao.save(AlertAnalysisPolicy.builder()
                .name(name)
                .enabled(true)
                // An omitted label filter intentionally means that the policy matches all alerts.
                .matchLabels(matchLabels == null ? Map.of() : Map.copyOf(matchLabels))
                .groupByLabels(List.copyOf(groupByLabels))
                .windowSeconds(window)
                .minimumAlertCount(alertCount)
                .cooldownSeconds(cooldown)
                .build());
    }

    public List<AlertAnalysisPolicy> findEnabled() {
        return policyDao.findByEnabledTrueOrderByIdAsc();
    }

    public List<AlertAnalysisPolicy> findAll() {
        return policyDao.findAllByOrderByIdAsc();
    }

    public boolean isAgentClientConfigured() {
        AgentClientAvailability availability = agentClientAvailabilityProvider.getIfAvailable();
        return availability != null && availability.isAgentClientConfigured();
    }

    @Transactional
    public AlertAnalysisPolicy toggle(Long id, boolean enabled) {
        if (enabled) {
            requireAgentClientConfigured();
        }
        AlertAnalysisPolicy policy = policyDao.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Alert analysis policy was not found: " + id));
        policy.setEnabled(enabled);
        return policyDao.save(policy);
    }

    @Transactional
    public void delete(Long id) {
        policyDao.deleteById(id);
    }

    private void requireAgentClientConfigured() {
        if (!isAgentClientConfigured()) {
            throw new IllegalStateException("Agent client is not configured");
        }
    }

    private long positive(Long value, long defaultValue, String field) {
        long resolved = value == null ? defaultValue : value;
        if (resolved < 1) {
            throw new IllegalArgumentException(field + " must be positive");
        }
        return resolved;
    }
}
