/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.alert.integration.service;

import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.UNVERIFIED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.VERIFIED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.WAITING;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.alert.integration.store.AlertIntegrationVerification;
import org.apache.hertzbeat.alert.integration.store.AlertIntegrationVerificationDao;
import org.apache.hertzbeat.alert.integration.store.AlertIntegrationVerificationId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AlertIntegrationVerificationServiceTest {

    private static final long NOW = 1_787_500_000_000L;
    private static final String WORKSPACE = "workspace-a";

    @Mock
    private AlertIntegrationVerificationDao dao;

    @Test
    void startsWorkspaceScopedVerificationWithoutClaimingSuccess() {
        AlertIntegrationVerificationId id = new AlertIntegrationVerificationId(WORKSPACE, "volcengine");
        when(dao.findById(id)).thenReturn(Optional.empty());
        AlertIntegrationVerificationService service = service();

        var evidence = service.start(WORKSPACE, "volcengine");

        assertEquals(WAITING, evidence.status());
        assertEquals(NOW, evidence.startedAt());
        assertNull(evidence.verifiedAt());
        ArgumentCaptor<AlertIntegrationVerification> captor =
                ArgumentCaptor.forClass(AlertIntegrationVerification.class);
        verify(dao).save(captor.capture());
        assertEquals(id, captor.getValue().getId());
        assertEquals(WAITING, captor.getValue().getStatus());
        assertEquals(NOW, captor.getValue().getStartedAt());
        assertNull(captor.getValue().getVerifiedAt());
    }

    @Test
    void marksOnlyAnExistingWaitingVerificationAfterSuccessfulIngress() {
        AlertIntegrationVerificationService service = service();

        service.recordAcceptedIngress(WORKSPACE, "default");

        verify(dao).verifyWaiting(WORKSPACE, "webhook", NOW, WAITING, VERIFIED);
    }

    @Test
    void exposesUnverifiedWaitingAndVerifiedEvidenceWithoutCrossWorkspaceLeakage() {
        when(dao.findAllByWorkspaceId(WORKSPACE)).thenReturn(List.of(
                AlertIntegrationVerification.waiting(WORKSPACE, "prometheus", NOW - 2_000),
                AlertIntegrationVerification.verified(WORKSPACE, "volcengine", NOW - 4_000, NOW - 1_000)));
        AlertIntegrationVerificationService service = service();

        Map<String, org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationVerification>
                evidence = service.evidenceBySource(WORKSPACE);

        assertEquals(WAITING, evidence.get("prometheus").status());
        assertEquals(VERIFIED, evidence.get("volcengine").status());
        assertEquals(NOW - 1_000, evidence.get("volcengine").verifiedAt());
        assertEquals(UNVERIFIED, service.evidenceBySource("workspace-b")
                .getOrDefault("volcengine", service.unverified()).status());
    }

    private AlertIntegrationVerificationService service() {
        return new AlertIntegrationVerificationService(
                dao, Clock.fixed(Instant.ofEpochMilli(NOW), ZoneOffset.UTC));
    }
}
