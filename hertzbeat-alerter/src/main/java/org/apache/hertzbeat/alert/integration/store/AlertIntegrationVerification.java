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

package org.apache.hertzbeat.alert.integration.store;

import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.VERIFIED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.WAITING;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus;

/**
 * Durable, workspace-scoped evidence for an explicit sender verification.
 */
@Entity
@Table(name = "hzb_alert_integration_verification")
public class AlertIntegrationVerification {

    @EmbeddedId
    private AlertIntegrationVerificationId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private VerificationStatus status;

    @Column(name = "started_at", nullable = false)
    private long startedAt;

    @Column(name = "verified_at")
    private Long verifiedAt;

    protected AlertIntegrationVerification() {
    }

    public static AlertIntegrationVerification waiting(String workspaceId, String source, long startedAt) {
        AlertIntegrationVerification verification = new AlertIntegrationVerification();
        verification.id = new AlertIntegrationVerificationId(workspaceId, source);
        verification.status = WAITING;
        verification.startedAt = startedAt;
        return verification;
    }

    public static AlertIntegrationVerification verified(
            String workspaceId, String source, long startedAt, long verifiedAt) {
        AlertIntegrationVerification verification = waiting(workspaceId, source, startedAt);
        verification.status = VERIFIED;
        verification.verifiedAt = verifiedAt;
        return verification;
    }

    public void restart(long timestamp) {
        status = WAITING;
        startedAt = timestamp;
        verifiedAt = null;
    }

    public AlertIntegrationVerificationId getId() {
        return id;
    }

    public VerificationStatus getStatus() {
        return status;
    }

    public long getStartedAt() {
        return startedAt;
    }

    public Long getVerifiedAt() {
        return verifiedAt;
    }
}
