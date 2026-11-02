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

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.dao.DashboardDao;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Conditional native operations using only the configured Grafana endpoint and existing token.
 * Remote save uses Grafana optimistic version checking. Legacy remote DELETE has no atomic version
 * precondition: it verifies a snapshot immediately before deleting, never claims CAS, and must
 * remain a separately approved destructive operation at every external entry point. No raw
 * dashboard, remote response, token or configured URL is logged or returned on failure.
 */
@Service
public class ConditionalDashboardService {
    private final DashboardDao dashboards;
    private final EntityManager entities;
    private final ServiceAccountService tokens;
    private final GrafanaProperties properties;
    private final RestTemplate http;

    public ConditionalDashboardService(
            DashboardDao dashboards,
            EntityManager entities,
            ServiceAccountService tokens,
            GrafanaProperties properties,
            RestTemplate http) {
        this.dashboards = dashboards;
        this.entities = entities;
        this.tokens = tokens;
        this.properties = properties;
        this.http = http;
    }

    /** Provider receipt, not rendering health or permission to automatically retry. */
    public record SaveReceipt(
            Long monitorId,
            String uid,
            long version,
            boolean remoteWriteConfirmed,
            boolean localBindingSaved,
            boolean automaticRetrySafe) {}

    /** Distinguishes local detachment of a shared dashboard from remote deletion. */
    public record DeleteReceipt(
            Long monitorId,
            String uid,
            boolean localBindingRemoved,
            boolean remoteDashboardRemoved,
            boolean atomicRemoteVersionPrecondition) {}

    /** Native save with an absent binding for create, or exact UID/version for update. */
    @Transactional(rollbackFor = Exception.class)
    public SaveReceipt save(
            Long monitorId, String dashboardJson, String expectedUid, Long expectedVersion) {
        return save(monitorId, dashboardJson, expectedUid, expectedVersion, () -> true);
    }

    /** Recheck cancellation immediately before the native irreversible request. */
    @Transactional(rollbackFor = Exception.class)
    public SaveReceipt save(
            Long monitorId,
            String dashboardJson,
            String expectedUid,
            Long expectedVersion,
            java.util.function.BooleanSupplier permitted) {
        allowed(permitted);
        enabled();
        positive(monitorId);
        var binding =
                entities.find(GrafanaDashboard.class, monitorId, LockModeType.PESSIMISTIC_WRITE);
        boolean create = expectedUid == null && expectedVersion == null;
        if (create && binding != null) throw failure("GRAFANA_BINDING_ALREADY_EXISTS");
        if (!create) {
            matches(binding, expectedUid, expectedVersion);
            uniqueBinding(binding);
        }
        Map<String, Object> payload = object(dashboardJson);
        if (payload.containsKey("id")
                || payload.containsKey("uid")
                || payload.containsKey("version")
                || !(payload.get("title") instanceof String title)
                || title.isBlank()
                || title.length() > 200
                || !(payload.get("panels") instanceof java.util.List<?> panels)
                || panels.size() > 20) throw failure("GRAFANA_DRAFT_INVALID");
        String uid = create ? "hb-monitor-" + monitorId : expectedUid;
        HttpHeaders headers = headers();
        if (create) {
            payload.put("id", null);
            payload.put("version", 0);
        } else {
            var current = remoteMetadata(uid, headers);
            checkRemote(current, uid, expectedVersion);
            payload.put("id", integer(current.get("id"), true));
            payload.put("version", expectedVersion);
        }
        payload.put("uid", uid);
        var request =
                new HttpEntity<>(
                        JsonUtil.toJson(Map.of("dashboard", payload, "overwrite", false)), headers);
        Map<String, Object> response;
        allowed(permitted);
        try {
            var result = http.postForEntity(endpoint("/api/dashboards/db"), request, String.class);
            if (!result.getStatusCode().is2xxSuccessful())
                throw failure("GRAFANA_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
            response = object(result.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException rejected) {
            if (rejected.getStatusCode().value() == 409 || rejected.getStatusCode().value() == 412)
                throw failure("GRAFANA_VERSION_CONFLICT");
            throw failure("GRAFANA_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        } catch (RuntimeException unknown) {
            throw failure("GRAFANA_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        }
        long version;
        try {
            version = integer(response.get("version"), true);
        } catch (RuntimeException invalidReceipt) {
            throw failure("GRAFANA_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        }
        if (!uid.equals(response.get("uid"))
                || !"success".equals(response.get("status"))
                || !create && version != expectedVersion + 1)
            throw failure("GRAFANA_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        var saved = binding == null ? new GrafanaDashboard() : binding;
        saved.setMonitorId(monitorId);
        saved.setUid(uid);
        saved.setVersion(version);
        saved.setEnabled(true);
        saved.setStatus("success");
        saved.setUrl(
                properties.exposeUrl().replaceAll("/+$", "")
                        + "/d/"
                        + uid
                        + "?kiosk&var-instance="
                        + monitorId);
        try {
            dashboards.saveAndFlush(saved);
        } catch (RuntimeException localFailure) {
            throw failure("GRAFANA_REMOTE_SAVED_LOCAL_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        }
        return new SaveReceipt(monitorId, uid, version, true, true, false);
    }

    /**
     * Explicit destructive native operation. A shared binding is detached without remote deletion.
     */
    @Transactional(rollbackFor = Exception.class)
    public DeleteReceipt delete(Long monitorId, String expectedUid, Long expectedVersion) {
        return delete(monitorId, expectedUid, expectedVersion, () -> true);
    }

    /** Preserve a cancelled operation before remote deletion or local detachment starts. */
    @Transactional(rollbackFor = Exception.class)
    public DeleteReceipt delete(
            Long monitorId,
            String expectedUid,
            Long expectedVersion,
            java.util.function.BooleanSupplier permitted) {
        allowed(permitted);
        enabled();
        positive(monitorId);
        var binding =
                entities.find(GrafanaDashboard.class, monitorId, LockModeType.PESSIMISTIC_WRITE);
        matches(binding, expectedUid, expectedVersion);
        var bindings = dashboards.findByUid(expectedUid);
        if (bindings == null
                || bindings.isEmpty()
                || bindings.stream().noneMatch(d -> monitorId.equals(d.getMonitorId())))
            throw failure("GRAFANA_BINDING_SET_INVALID");
        boolean shared = bindings.size() > 1;
        if (!shared) {
            var headers = headers();
            checkRemote(remoteMetadata(expectedUid, headers), expectedUid, expectedVersion);
            allowed(permitted);
            try {
                var response =
                        http.exchange(
                                endpoint("/api/dashboards/uid/" + expectedUid),
                                HttpMethod.DELETE,
                                new HttpEntity<Void>(headers),
                                String.class);
                if (!response.getStatusCode().is2xxSuccessful())
                    throw failure("GRAFANA_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
            } catch (RuntimeException unknown) {
                throw failure("GRAFANA_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
            }
        }
        if (shared) allowed(permitted);
        try {
            dashboards.delete(binding);
            dashboards.flush();
        } catch (RuntimeException localFailure) {
            throw failure(
                    shared
                            ? "GRAFANA_LOCAL_DETACH_OUTCOME_UNVERIFIED"
                            : "GRAFANA_REMOTE_DELETED_LOCAL_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        }
        return new DeleteReceipt(monitorId, expectedUid, true, !shared, false);
    }

    /**
     * Readback is internal domain data; callers must redact before offering editable content to a
     * model.
     */
    public record Snapshot(Long monitorId, String uid, long version, String dashboardJson) {}

    /** Read an exact current local/remote binding without changing either version. */
    @Transactional(readOnly = true)
    public Snapshot inspect(Long monitorId, String uid, Long version) {
        enabled();
        positive(monitorId);
        var binding = entities.find(GrafanaDashboard.class, monitorId);
        matches(binding, uid, version);
        var document = remoteDocument(uid, headers());
        checkRemote(document, uid, version);
        return new Snapshot(monitorId, uid, version, JsonUtil.toJson(document));
    }

    /**
     * Verify remote absence after a separately authorized deletion; 403/transport errors are not
     * absence.
     */
    public boolean verifyAbsent(String uid) {
        enabled();
        if (uid == null || !uid.matches("[A-Za-z0-9_-]{1,40}"))
            throw failure("GRAFANA_UID_INVALID");
        try {
            http.exchange(
                    endpoint("/api/dashboards/uid/" + uid),
                    HttpMethod.GET,
                    new HttpEntity<Void>(headers()),
                    String.class);
            return false;
        } catch (org.springframework.web.client.HttpClientErrorException response) {
            return response.getStatusCode().value() == 404;
        } catch (RuntimeException unavailable) {
            return false;
        }
    }

    private void allowed(java.util.function.BooleanSupplier permitted) {
        if (permitted == null || !permitted.getAsBoolean())
            throw failure("GRAFANA_OPERATION_CANCELLED_BEFORE_WRITE");
    }

    private void enabled() {
        if (!properties.enabled()) throw failure("GRAFANA_INTEGRATION_DISABLED");
    }

    private void positive(Long monitorId) {
        if (monitorId == null || monitorId <= 0) throw failure("GRAFANA_MONITOR_ID_INVALID");
    }

    private void matches(GrafanaDashboard binding, String uid, Long version) {
        if (uid == null
                || !uid.matches("[A-Za-z0-9_-]{1,40}")
                || version == null
                || version < 1
                || version == Long.MAX_VALUE
                || binding == null
                || !uid.equals(binding.getUid())
                || !version.equals(binding.getVersion()))
            throw failure("GRAFANA_BINDING_VERSION_MISMATCH");
    }

    private void uniqueBinding(GrafanaDashboard binding) {
        var linked = dashboards.findByUid(binding.getUid());
        if (linked == null
                || linked.size() != 1
                || !binding.getMonitorId().equals(linked.getFirst().getMonitorId()))
            throw failure("GRAFANA_SHARED_UPDATE_REQUIRES_NATIVE_EDITOR");
    }

    private HttpHeaders headers() {
        String token = tokens.getToken();
        if (token == null || token.isBlank()) throw failure("GRAFANA_EXISTING_TOKEN_UNAVAILABLE");
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    private String endpoint(String path) {
        return properties.getPrefix() + properties.getUrl().replaceAll("/+$", "") + path;
    }

    private Map<String, Object> remoteMetadata(String uid, HttpHeaders headers) {
        var document = remoteDocument(uid, headers);
        Map<String, Object> metadata = new LinkedHashMap<>();
        for (String key : java.util.List.of("uid", "id", "version"))
            metadata.put(key, document.get(key));
        return metadata;
    }

    private Map<String, Object> remoteDocument(String uid, HttpHeaders headers) {
        try {
            var response =
                    http.exchange(
                            endpoint("/api/dashboards/uid/" + uid),
                            HttpMethod.GET,
                            new HttpEntity<Void>(headers),
                            String.class);
            if (!response.getStatusCode().is2xxSuccessful())
                throw failure("GRAFANA_SNAPSHOT_UNAVAILABLE");
            Object value = object(response.getBody()).get("dashboard");
            if (!(value instanceof Map<?, ?> fields)) throw failure("GRAFANA_SNAPSHOT_INVALID");
            Map<String, Object> document = new LinkedHashMap<>();
            fields.forEach((key, item) -> document.put((String) key, item));
            return document;
        } catch (RuntimeException invalid) {
            throw failure("GRAFANA_SNAPSHOT_UNAVAILABLE");
        }
    }

    private void checkRemote(Map<String, Object> snapshot, String uid, Long version) {
        if (!uid.equals(snapshot.get("uid")) || version != integer(snapshot.get("version"), true))
            throw failure("GRAFANA_REMOTE_VERSION_MISMATCH");
        integer(snapshot.get("id"), true);
    }

    private Map<String, Object> object(String json) {
        if (json == null || json.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 131072)
            throw failure("GRAFANA_JSON_INVALID");
        try {
            Map<String, Object> value = JsonUtil.fromJson(json, Map.class);
            if (value == null) throw failure("GRAFANA_JSON_INVALID");
            return new LinkedHashMap<>(value);
        } catch (RuntimeException invalid) {
            throw failure("GRAFANA_JSON_INVALID");
        }
    }

    private long integer(Object value, boolean positive) {
        try {
            long n = new java.math.BigDecimal(String.valueOf(value)).longValueExact();
            if (positive && n < 1) throw failure("GRAFANA_SNAPSHOT_INVALID");
            return n;
        } catch (RuntimeException invalid) {
            throw failure("GRAFANA_SNAPSHOT_INVALID");
        }
    }

    private IllegalStateException failure(String code) {
        return new IllegalStateException(code);
    }
}
