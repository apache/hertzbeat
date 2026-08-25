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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves and rechecks persisted authority for an exact workspace-owned Entity. */
@Service
public class AgentEntityTargetAuthorityService {

    public static final String TARGET_VERSION_PREFIX = "entity.";
    public static final String AUTHORITY_VERSION_PREFIX = "entity-authority.";
    public static final String TARGET_VERSION = "entity.v1";
    public static final String AUTHORITY_VERSION = "entity-authority.v1";

    private final EntityWorkspaceQueryService entityWorkspaceQueryService;

    public AgentEntityTargetAuthorityService(EntityWorkspaceQueryService entityWorkspaceQueryService) {
        this.entityWorkspaceQueryService = entityWorkspaceQueryService;
    }

    public AgentTargetRef canonicalize(String workspaceId, long entityId) {
        if (!StringUtils.hasText(workspaceId) || entityId <= 0) {
            throw unavailable();
        }
        ObserveEntity entity;
        try {
            entity = entityWorkspaceQueryService.findEntityById(workspaceId, entityId)
                    .filter(candidate -> Objects.equals(workspaceId, candidate.getWorkspaceId()))
                    .filter(candidate -> Objects.equals(entityId, candidate.getId()))
                    .orElseThrow(this::unavailable);
        } catch (UnavailableException failure) {
            throw failure;
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        return AgentTargetRef.builder()
                .version(TARGET_VERSION)
                .entityId(entityId)
                .authority(AgentTargetAuthority.builder()
                        .bindingId(entityId)
                        .version(AUTHORITY_VERSION)
                        .hash(authorityHash(workspaceId, entity))
                        .build())
                .build();
    }

    public boolean verify(String workspaceId, AgentTargetRef target) {
        if (!isCanonicalTarget(target)) {
            return false;
        }
        try {
            return Objects.equals(target, canonicalize(workspaceId, target.getEntityId()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        return target != null
                && TARGET_VERSION.equals(target.getVersion())
                && target.getEntityId() != null && target.getEntityId() > 0
                && authority != null
                && Objects.equals(target.getEntityId(), authority.getBindingId())
                && AUTHORITY_VERSION.equals(authority.getVersion())
                && StringUtils.hasText(authority.getHash())
                && target.getMonitorId() == null && target.getAlertId() == null
                && target.getAlertType() == null && target.getCollector() == null
                && target.getSignal() == null && target.getTopology() == null
                && target.getTrace() == null && target.getLog() == null && target.getService() == null;
    }

    private String authorityHash(String workspaceId, ObserveEntity entity) {
        StringBuilder material = new StringBuilder("entity-authority.v1;");
        append(material, "workspace", workspaceId);
        append(material, "id", entity.getId());
        append(material, "type", entity.getType());
        append(material, "name", entity.getName());
        append(material, "displayName", entity.getDisplayName());
        append(material, "subtype", entity.getSubtype());
        append(material, "namespace", entity.getNamespace());
        append(material, "environment", entity.getEnvironment());
        append(material, "status", entity.getStatus());
        append(material, "criticality", entity.getCriticality());
        append(material, "owner", entity.getOwner());
        append(material, "lifecycle", entity.getLifecycle());
        append(material, "tier", entity.getTier());
        append(material, "system", entity.getSystem());
        append(material, "source", entity.getSource());
        append(material, "description", entity.getDescription());
        appendMap(material, "labels", entity.getLabels());
        appendList(material, "tags", entity.getTags());
        append(material, "updatedAt", entity.getGmtUpdate());
        try {
            return "sha256:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(material.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required for entity target authority", exception);
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

    private void appendList(StringBuilder material, String field, List<String> values) {
        append(material, field + "Size", values == null ? null : values.size());
        if (values != null) {
            values.forEach(value -> append(material, field + "Value", value));
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
            super("Entity target is unavailable");
        }
    }
}
