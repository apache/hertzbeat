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

package org.apache.hertzbeat.grafana.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.dao.DashboardDao;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class ConditionalDashboardServiceTest {
    private final DashboardDao dao = mock(DashboardDao.class);
    private final EntityManager entities = mock(EntityManager.class);
    private final ServiceAccountService tokens = mock(ServiceAccountService.class);
    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer remote = MockRestServiceServer.bindTo(http).build();

    private ConditionalDashboardService service(boolean enabled) {
        return new ConditionalDashboardService(
                dao,
                entities,
                tokens,
                new GrafanaProperties(
                        enabled,
                        "http://grafana.invalid",
                        "http://grafana.invalid",
                        "fixture",
                        "fixture"),
                http);
    }

    @Test
    void disabledIntegrationNeverReadsTokenOrSendsHttp() {
        assertThrows(IllegalStateException.class, () -> service(false).save(7L, "{}", null, null));
        verifyNoInteractions(tokens, dao, entities);
        remote.verify();
    }

    @Test
    void staleBindingAndSharedUpdateAreRejectedBeforeRemoteAccess() {
        var binding = GrafanaDashboard.builder().monitorId(7L).uid("bound-uid").version(3L).build();
        when(entities.find(GrafanaDashboard.class, 7L, LockModeType.PESSIMISTIC_WRITE))
                .thenReturn(binding);
        assertThrows(
                IllegalStateException.class, () -> service(true).save(7L, "{}", "another", 3L));
        when(dao.findByUid("bound-uid"))
                .thenReturn(java.util.List.of(binding, binding.toBuilder().monitorId(8L).build()));
        assertThrows(
                IllegalStateException.class, () -> service(true).save(7L, "{}", "bound-uid", 3L));
        verifyNoInteractions(tokens);
        remote.verify();
    }

    @Test
    void updatePreservesRemoteIdAndUsesOverwriteFalseWithExactVersion() {
        var binding = GrafanaDashboard.builder().monitorId(7L).uid("bound-uid").version(3L).build();
        when(entities.find(GrafanaDashboard.class, 7L, LockModeType.PESSIMISTIC_WRITE))
                .thenReturn(binding);
        when(dao.findByUid("bound-uid")).thenReturn(java.util.List.of(binding));
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(
                        withSuccess(
                                "{\"dashboard\":{\"id\":19,\"uid\":\"bound-uid\",\"version\":3}}",
                                MediaType.APPLICATION_JSON));
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/db"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(
                        content()
                                .json(
                                        "{\"overwrite\":false,\"dashboard\":{\"id\":19,\"uid\":\"bound-uid\",\"version\":3,\"title\":\"AI"
                                            + " fixture\",\"panels\":[]}}"))
                .andRespond(
                        withSuccess(
                                "{\"uid\":\"bound-uid\",\"version\":4,\"status\":\"success\",\"url\":\"/d/bound-uid/fixture\"}",
                                MediaType.APPLICATION_JSON));
        var result =
                service(true).save(7L, "{\"title\":\"AI fixture\",\"panels\":[]}", "bound-uid", 3L);
        assertEquals(4L, result.version());
        assertEquals("bound-uid", result.uid());
        assertFalse(result.automaticRetrySafe());
        remote.verify();
    }

    @Test
    void deleteSharedBindingDetachesOnlyAndNeverSendsRemoteDelete() {
        var binding = GrafanaDashboard.builder().monitorId(7L).uid("bound-uid").version(3L).build();
        when(entities.find(GrafanaDashboard.class, 7L, LockModeType.PESSIMISTIC_WRITE))
                .thenReturn(binding);
        when(dao.findByUid("bound-uid"))
                .thenReturn(java.util.List.of(binding, binding.toBuilder().monitorId(8L).build()));
        var result = service(true).delete(7L, "bound-uid", 3L);
        assertTrue(result.localBindingRemoved());
        assertFalse(result.remoteDashboardRemoved());
        verifyNoInteractions(tokens);
        remote.verify();
    }

    @Test
    void createUsesDeterministicUidAndNeverOverwritesExistingRemoteDashboard() {
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/db"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(
                        content()
                                .json(
                                        "{\"overwrite\":false,\"dashboard\":{\"id\":null,\"uid\":\"hb-monitor-7\",\"version\":0,\"title\":\"AI"
                                            + " fixture\",\"panels\":[]}}"))
                .andRespond(
                        withSuccess(
                                "{\"uid\":\"hb-monitor-7\",\"version\":1,\"status\":\"success\"}",
                                MediaType.APPLICATION_JSON));
        var result = service(true).save(7L, "{\"title\":\"AI fixture\",\"panels\":[]}", null, null);
        assertEquals("hb-monitor-7", result.uid());
        assertFalse(result.automaticRetrySafe());
        remote.verify();
    }

    @Test
    void versionConflictDoesNotExposeRemoteErrorBodyOrSaveBinding() {
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/db"))
                .andRespond(
                        withStatus(HttpStatus.PRECONDITION_FAILED).body("private-server-response"));
        var error =
                assertThrows(
                        IllegalStateException.class,
                        () ->
                                service(true)
                                        .save(
                                                7L,
                                                "{\"title\":\"AI fixture\",\"panels\":[]}",
                                                null,
                                                null));
        assertEquals("GRAFANA_VERSION_CONFLICT", error.getMessage());
        assertEquals(null, error.getCause());
        verify(dao, never()).saveAndFlush(any());
        remote.verify();
    }

    @Test
    void remoteVersionChangePreventsDelete() {
        var binding = GrafanaDashboard.builder().monitorId(7L).uid("bound-uid").version(3L).build();
        when(entities.find(GrafanaDashboard.class, 7L, LockModeType.PESSIMISTIC_WRITE))
                .thenReturn(binding);
        when(dao.findByUid("bound-uid")).thenReturn(java.util.List.of(binding));
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andRespond(
                        withSuccess(
                                "{\"dashboard\":{\"id\":19,\"uid\":\"bound-uid\",\"version\":4}}",
                                MediaType.APPLICATION_JSON));
        var error =
                assertThrows(
                        IllegalStateException.class,
                        () -> service(true).delete(7L, "bound-uid", 3L));
        assertEquals("GRAFANA_REMOTE_VERSION_MISMATCH", error.getMessage());
        verify(dao, never()).delete(any(GrafanaDashboard.class));
        remote.verify();
    }

    @Test
    void soleBindingDeleteChecksSnapshotAndReportsLackOfAtomicRemoteCas() {
        var binding = GrafanaDashboard.builder().monitorId(7L).uid("bound-uid").version(3L).build();
        when(entities.find(GrafanaDashboard.class, 7L, LockModeType.PESSIMISTIC_WRITE))
                .thenReturn(binding);
        when(dao.findByUid("bound-uid")).thenReturn(java.util.List.of(binding));
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(
                        withSuccess(
                                "{\"dashboard\":{\"id\":19,\"uid\":\"bound-uid\",\"version\":3}}",
                                MediaType.APPLICATION_JSON));
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));
        var receipt = service(true).delete(7L, "bound-uid", 3L);
        assertTrue(receipt.remoteDashboardRemoved());
        assertFalse(receipt.atomicRemoteVersionPrecondition());
        verify(dao).delete(binding);
        remote.verify();
    }

    @Test
    void callerOwnedRemoteIdentityAndUidPathAreRejectedBeforeCredentialRead() {
        assertThrows(
                IllegalStateException.class,
                () ->
                        service(true)
                                .save(
                                        7L,
                                        "{\"title\":\"AI"
                                                + " fixture\",\"panels\":[],\"uid\":\"override\"}",
                                        null,
                                        null));
        assertThrows(IllegalStateException.class, () -> service(true).delete(7L, "../another", 3L));
        verifyNoInteractions(tokens);
        remote.verify();
    }

    @Test
    void malformedProviderReceiptAfterWriteIsUnknownAndNeverLocalSuccess() {
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/db"))
                .andRespond(
                        withSuccess(
                                "{\"uid\":\"hb-monitor-7\",\"version\":\"not-a-version\",\"status\":\"success\"}",
                                MediaType.APPLICATION_JSON));
        var error =
                assertThrows(
                        IllegalStateException.class,
                        () ->
                                service(true)
                                        .save(
                                                7L,
                                                "{\"title\":\"AI fixture\",\"panels\":[]}",
                                                null,
                                                null));
        assertEquals("GRAFANA_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY", error.getMessage());
        verify(dao, never()).saveAndFlush(any());
        remote.verify();
    }

    @Test
    void snapshotRequiresExactLocalAndRemoteBindingVersions() {
        var binding = GrafanaDashboard.builder().monitorId(7L).uid("bound-uid").version(3L).build();
        when(entities.find(GrafanaDashboard.class, 7L)).thenReturn(binding);
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andRespond(
                        withSuccess(
                                "{\"dashboard\":{\"id\":19,\"uid\":\"bound-uid\",\"version\":3,\"title\":\"AI"
                                    + " fixture\",\"panels\":[]}}",
                                MediaType.APPLICATION_JSON));
        var snapshot = service(true).inspect(7L, "bound-uid", 3L);
        assertEquals("bound-uid", snapshot.uid());
        assertEquals(3L, snapshot.version());
        assertTrue(snapshot.dashboardJson().contains("AI fixture"));
        remote.verify();
    }

    @Test
    void absenceProofNeedsAnAuthoritativeNotFoundAndNeverTreatsForbiddenAsAbsent() {
        when(tokens.getToken()).thenReturn("fixture-token");
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andRespond(withStatus(HttpStatus.FORBIDDEN));
        assertTrue(service(true).verifyAbsent("bound-uid"));
        assertFalse(service(true).verifyAbsent("bound-uid"));
        remote.verify();
    }

    @Test
    void cancellationAfterSnapshotPreventsTheRemoteWrite() {
        var binding = GrafanaDashboard.builder().monitorId(7L).uid("bound-uid").version(3L).build();
        when(entities.find(GrafanaDashboard.class, 7L, LockModeType.PESSIMISTIC_WRITE))
                .thenReturn(binding);
        when(dao.findByUid("bound-uid")).thenReturn(java.util.List.of(binding));
        when(tokens.getToken()).thenReturn("fixture-token");
        var permitted = new java.util.concurrent.atomic.AtomicBoolean(true);
        remote.expect(requestTo("http://grafana.invalid/api/dashboards/uid/bound-uid"))
                .andRespond(
                        request -> {
                            permitted.set(false);
                            return withSuccess(
                                            "{\"dashboard\":{\"id\":19,\"uid\":\"bound-uid\",\"version\":3}}",
                                            MediaType.APPLICATION_JSON)
                                    .createResponse(request);
                        });
        assertThrows(
                IllegalStateException.class,
                () ->
                        service(true)
                                .save(
                                        7L,
                                        "{\"title\":\"AI fixture\",\"panels\":[]}",
                                        "bound-uid",
                                        3L,
                                        permitted::get));
        verify(dao, never()).saveAndFlush(any());
        remote.verify();
    }
}
