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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves and rechecks the persisted authority for an exact workspace-owned SingleAlert. */
@Service
public class AgentSingleAlertTargetAuthorityService {

    public static final String TARGET_VERSION_PREFIX = "single-alert.";
    public static final String AUTHORITY_VERSION_PREFIX = "single-alert-authority.";
    public static final String TARGET_VERSION = "single-alert.v1";
    public static final String AUTHORITY_VERSION = "single-alert-authority.v1";
    public static final String ALERT_TYPE = "single";

    private final AlertService alertService;

    public AgentSingleAlertTargetAuthorityService(AlertService alertService) {
        this.alertService = alertService;
    }

    public AgentTargetRef canonicalize(String workspaceId, long alertId) {
        if (!StringUtils.hasText(workspaceId) || alertId <= 0) {
            throw unavailable();
        }
        SingleAlert alert;
        try {
            alert = alertService.findSingleAlert(workspaceId, alertId)
                    .filter(candidate -> Objects.equals(workspaceId, candidate.getWorkspaceId()))
                    .filter(candidate -> Objects.equals(alertId, candidate.getId()))
                    .orElseThrow(this::unavailable);
        } catch (UnavailableException failure) {
            throw failure;
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        return AgentTargetRef.builder()
                .version(TARGET_VERSION)
                .alertId(alertId)
                .alertType(ALERT_TYPE)
                .authority(AgentTargetAuthority.builder()
                        .bindingId(alertId)
                        .version(AUTHORITY_VERSION)
                        .hash(authorityHash(workspaceId, alert))
                        .build())
                .build();
    }

    public boolean verify(String workspaceId, AgentTargetRef target) {
        if (!isCanonicalTarget(target)) {
            return false;
        }
        try {
            return matches(target, canonicalize(workspaceId, target.getAlertId()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        return target != null
                && TARGET_VERSION.equals(target.getVersion())
                && target.getAlertId() != null && target.getAlertId() > 0
                && ALERT_TYPE.equals(target.getAlertType())
                && authority != null
                && Objects.equals(target.getAlertId(), authority.getBindingId())
                && AUTHORITY_VERSION.equals(authority.getVersion())
                && StringUtils.hasText(authority.getHash())
                && target.getMonitorId() == null && target.getEntityId() == null
                && target.getCollector() == null && target.getSignal() == null
                && target.getTopology() == null && target.getTrace() == null && target.getLog() == null
                && target.getService() == null;
    }

    public boolean matches(AgentTargetRef expected, AgentTargetRef actual) {
        return isCanonicalTarget(expected) && Objects.equals(expected, actual);
    }

    private String authorityHash(String workspaceId, SingleAlert alert) {
        StringBuilder material = new StringBuilder("single-alert-authority.v1;");
        append(material, "workspace", workspaceId);
        append(material, "id", alert.getId());
        append(material, "fingerprint", alert.getFingerprint());
        append(material, "status", alert.getStatus());
        append(material, "content", alert.getContent());
        append(material, "triggerTimes", alert.getTriggerTimes());
        append(material, "startAt", alert.getStartAt());
        append(material, "activeAt", alert.getActiveAt());
        append(material, "endAt", alert.getEndAt());
        appendMap(material, "labels", alert.getLabels());
        appendMap(material, "annotations", alert.getAnnotations());
        try {
            return "sha256:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(material.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required for alert target authority", exception);
        }
    }

    private void appendMap(StringBuilder material, String field, Map<String, String> values) {
        append(material, field + "Size", values == null ? null : values.size());
        if (values != null) {
            new TreeMap<>(values).forEach((key, value) -> {
                append(material, field + "Key", key);
                append(material, field + "Value", value);
            });
        }
    }

    private void append(StringBuilder material, String field, Object value) {
        String text = value == null ? null : String.valueOf(value);
        material.append(field).append(':').append(text == null ? -1 : text.length()).append(':');
        if (text != null) {
            material.append(text);
        }
        material.append(';');
    }

    private UnavailableException unavailable() {
        return new UnavailableException();
    }

    /** Cause-free failure used at the channel boundary. */
    public static final class UnavailableException extends IllegalArgumentException {

        UnavailableException() {
            super("Single alert target is unavailable");
        }
    }
}
