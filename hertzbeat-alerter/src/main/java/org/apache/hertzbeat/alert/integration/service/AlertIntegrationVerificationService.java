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

package org.apache.hertzbeat.alert.integration.service;

import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.UNVERIFIED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.VERIFIED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.WAITING;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationVerification;
import org.apache.hertzbeat.alert.integration.store.AlertIntegrationVerification;
import org.apache.hertzbeat.alert.integration.store.AlertIntegrationVerificationDao;
import org.apache.hertzbeat.alert.integration.store.AlertIntegrationVerificationId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Starts explicit verification attempts and records matching accepted ingress.
 */
@Service
public class AlertIntegrationVerificationService {

    private final AlertIntegrationVerificationDao dao;
    private final Clock clock;

    @Autowired
    public AlertIntegrationVerificationService(AlertIntegrationVerificationDao dao) {
        this(dao, Clock.systemUTC());
    }

    AlertIntegrationVerificationService(AlertIntegrationVerificationDao dao, Clock clock) {
        this.dao = dao;
        this.clock = clock;
    }

    @Transactional
    public IntegrationVerification start(String workspaceId, String source) {
        String workspace = requireValue(workspaceId, "workspace_required");
        String publicSource = publicSource(requireValue(source, "source_required"));
        long startedAt = clock.millis();
        AlertIntegrationVerificationId id = new AlertIntegrationVerificationId(workspace, publicSource);
        AlertIntegrationVerification verification = dao.findById(id)
                .orElseGet(() -> AlertIntegrationVerification.waiting(workspace, publicSource, startedAt));
        verification.restart(startedAt);
        dao.save(verification);
        return evidence(verification);
    }

    @Transactional
    public void recordAcceptedIngress(String workspaceId, String source) {
        String workspace = requireValue(workspaceId, "workspace_required");
        String publicSource = publicSource(requireValue(source, "source_required"));
        dao.verifyWaiting(workspace, publicSource, clock.millis(), WAITING, VERIFIED);
    }

    @Transactional(readOnly = true)
    public Map<String, IntegrationVerification> evidenceBySource(String workspaceId) {
        String workspace = requireValue(workspaceId, "workspace_required");
        Map<String, IntegrationVerification> result = new LinkedHashMap<>();
        for (AlertIntegrationVerification verification : dao.findAllByWorkspaceId(workspace)) {
            result.put(verification.getId().getSource(), evidence(verification));
        }
        return Map.copyOf(result);
    }

    public IntegrationVerification unverified() {
        return new IntegrationVerification(UNVERIFIED, null, null);
    }

    private static IntegrationVerification evidence(AlertIntegrationVerification verification) {
        return new IntegrationVerification(
                verification.getStatus(), verification.getStartedAt(), verification.getVerifiedAt());
    }

    private static String publicSource(String source) {
        return "default".equals(source) ? "webhook" : source;
    }

    private static String requireValue(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }
}
