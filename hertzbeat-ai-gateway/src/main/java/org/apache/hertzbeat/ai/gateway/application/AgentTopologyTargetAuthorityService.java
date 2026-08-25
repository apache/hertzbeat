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
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves a focused Topology scope through its workspace-owned root Entity. */
@Service
public class AgentTopologyTargetAuthorityService {

    public static final String TARGET_VERSION_PREFIX = "topology.";
    public static final String AUTHORITY_VERSION_PREFIX = "topology-authority.";
    public static final String TARGET_VERSION = "topology.v1";
    public static final String AUTHORITY_VERSION = "topology-authority.v1";

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final Set<String> SOURCE_KINDS = Set.of(
            "all", "alert-impact", "entity-relation", "monitor-bind", "monitor-ownership",
            "otlp-trace-call", "k8s-workload", "cmdb-manual-label", "database-middleware-connection",
            "template-dependency");

    private final AgentEntityTargetAuthorityService entityAuthorityService;

    public AgentTopologyTargetAuthorityService(AgentEntityTargetAuthorityService entityAuthorityService) {
        this.entityAuthorityService = entityAuthorityService;
    }

    public AgentTargetRef canonicalize(String workspaceId, AgentTopologyRef source) {
        AgentTopologyRef topology = normalizeSource(source);
        AgentTargetRef entityTarget;
        try {
            entityTarget = entityAuthorityService.canonicalize(workspaceId, topology.getRootEntityId());
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (!entityAuthorityService.isCanonicalTarget(entityTarget)
                || !Objects.equals(topology.getRootEntityId(), entityTarget.getEntityId())) {
            throw unavailable();
        }
        return AgentTargetRef.builder()
                .version(TARGET_VERSION)
                .entityId(topology.getRootEntityId())
                .topology(topology)
                .authority(AgentTargetAuthority.builder()
                        .bindingId(topology.getRootEntityId())
                        .version(AUTHORITY_VERSION)
                        .hash(authorityHash(entityTarget.getAuthority().getHash(), topology))
                        .build())
                .build();
    }

    public boolean verify(String workspaceId, AgentTargetRef target) {
        if (!isCanonicalTarget(target)) {
            return false;
        }
        try {
            return Objects.equals(target, canonicalize(workspaceId, target.getTopology()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        if (target == null || !TARGET_VERSION.equals(target.getVersion())
                || target.getEntityId() == null || target.getEntityId() <= 0
                || target.getTopology() == null || authority == null
                || !Objects.equals(target.getEntityId(), target.getTopology().getRootEntityId())
                || !Objects.equals(target.getEntityId(), authority.getBindingId())
                || !AUTHORITY_VERSION.equals(authority.getVersion())
                || authority.getHash() == null || !authority.getHash().matches("sha256:[0-9a-f]{64}")
                || target.getMonitorId() != null || target.getAlertId() != null || target.getAlertType() != null
                || target.getCollector() != null || target.getSignal() != null || target.getTrace() != null
                || target.getLog() != null
                || target.getService() != null) {
            return false;
        }
        try {
            return Objects.equals(target.getTopology(), normalizeSource(target.getTopology()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public AgentTopologyRef normalizeSource(AgentTopologyRef source) {
        if (source == null || source.getRootEntityId() == null || source.getRootEntityId() <= 0
                || source.getDepth() == null || source.getDepth() < 1 || source.getDepth() > 2
                || source.getNodeId() != null && source.getEdgeId() != null) {
            throw unavailable();
        }
        String nodeId = text(source.getNodeId(), 512);
        String edgeId = text(source.getEdgeId(), 512);
        String environment = text(source.getEnvironment(), 128);
        String relationType = text(source.getRelationType(), 128);
        String sourceKind = source.getSourceKind() == null
                ? "entity-relation" : text(source.getSourceKind(), 64);
        if (sourceKind == null || !SOURCE_KINDS.contains(sourceKind.toLowerCase(Locale.ROOT))) {
            throw unavailable();
        }
        sourceKind = sourceKind.toLowerCase(Locale.ROOT);
        validateRange(source.getStart(), source.getEnd());
        int pageIndex = source.getPageIndex() == null ? 0 : source.getPageIndex();
        int pageSize = source.getPageSize() == null ? 50 : source.getPageSize();
        if (pageIndex < 0 || pageIndex > 10_000 || pageSize < 1 || pageSize > 100) {
            throw unavailable();
        }
        return AgentTopologyRef.builder()
                .rootEntityId(source.getRootEntityId())
                .nodeId(nodeId)
                .edgeId(edgeId)
                .depth(source.getDepth())
                .environment(environment)
                .sourceKind(sourceKind)
                .start(source.getStart())
                .end(source.getEnd())
                .relationType(relationType)
                .hideInternal(Boolean.TRUE.equals(source.getHideInternal()))
                .pageIndex(pageIndex)
                .pageSize(pageSize)
                .build();
    }

    private void validateRange(Long start, Long end) {
        if (start == null && end == null) {
            return;
        }
        if (start == null || end == null || start <= 0 || end <= start || end - start > MAX_RANGE_MILLIS) {
            throw unavailable();
        }
    }

    private String text(String value, int maximumLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (!StringUtils.hasText(normalized) || normalized.length() > maximumLength
                || normalized.codePoints().anyMatch(code -> code < 32 || code == 127)) {
            throw unavailable();
        }
        return normalized;
    }

    private String authorityHash(String entityAuthorityHash, AgentTopologyRef topology) {
        StringBuilder material = new StringBuilder("topology-authority.v1;");
        append(material, "entityAuthority", entityAuthorityHash);
        append(material, "rootEntityId", topology.getRootEntityId());
        append(material, "nodeId", topology.getNodeId());
        append(material, "edgeId", topology.getEdgeId());
        append(material, "depth", topology.getDepth());
        append(material, "environment", topology.getEnvironment());
        append(material, "sourceKind", topology.getSourceKind());
        append(material, "start", topology.getStart());
        append(material, "end", topology.getEnd());
        append(material, "relationType", topology.getRelationType());
        append(material, "hideInternal", topology.getHideInternal());
        append(material, "pageIndex", topology.getPageIndex());
        append(material, "pageSize", topology.getPageSize());
        try {
            return "sha256:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(material.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required for topology target authority", exception);
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
            super("Topology target is unavailable");
        }
    }
}
