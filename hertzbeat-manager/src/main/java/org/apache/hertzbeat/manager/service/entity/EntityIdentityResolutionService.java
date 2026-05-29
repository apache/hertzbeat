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

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Resolves entity identity matches and monitor binding candidates.
 */
@Service
public class EntityIdentityResolutionService {

    private static final String RECOMMEND_DIRECT = "direct";
    private static final String RECOMMEND_SUGGESTED = "suggested";

    private static final Set<String> HOST_LIKE_APPS = Set.of(
            "linux", "windows", "macos", "darwin", "centos", "debian", "ubuntu", "almalinux",
            "redhat", "rockylinux", "opensuse", "euleros", "coreos", "freebsd"
    );
    private static final Set<String> SERVICE_LIKE_APPS = Set.of(
            "springboot2", "springboot3", "jvm", "jetty", "tomcat", "nginx", "hertzbeat", "api",
            "api_code", "fullsite", "website", "prometheus", "registry"
    );
    private static final Set<String> DATABASE_LIKE_APPS = Set.of(
            "mysql", "postgresql", "postgres", "oracle", "sqlserver", "mongodb", "opengauss",
            "tidb", "db2", "dm", "clickhouse", "elasticsearch"
    );
    private static final Set<String> MIDDLEWARE_LIKE_APPS = Set.of(
            "redis", "kafka", "rabbitmq", "rocketmq", "zookeeper", "consul", "nacos",
            "etcd", "memcached", "emq", "activemq"
    );
    private static final Set<String> QUEUE_LIKE_APPS = Set.of(
            "kafka", "rabbitmq", "rocketmq", "emq", "activemq"
    );
    private static final Set<String> ENDPOINT_LIKE_APPS = Set.of(
            "api", "api_code", "dns", "website", "fullsite", "port", "udp_port", "ping", "ssl_cert",
            "websocket"
    );
    private static final Set<String> SYNTHETIC_IDENTITY_KEYS = Set.of(
            "monitor.instance", "monitor.name", "monitor.app", "endpoint.url", "k8s.workload.name",
            "messaging.destination.name"
    );
    private static final Map<String, Integer> IDENTITY_SCORES = Map.ofEntries(
            Map.entry("endpoint.url", 120),
            Map.entry("messaging.destination.name", 120),
            Map.entry("monitor.instance", 80),
            Map.entry("monitor.name", 50),
            Map.entry("monitor.app", 20),
            Map.entry("k8s.workload.name", 90)
    );

    private final EntityIdentityReadModelService entityIdentityReadModelService;
    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityIdentityResolutionService(EntityIdentityReadModelService entityIdentityReadModelService,
                                           EntityMonitorBindService entityMonitorBindService,
                                           EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityIdentityReadModelService = entityIdentityReadModelService;
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public List<EntityMonitorBindingCandidate> resolveMonitorBindingCandidates(Monitor monitor) {
        return resolveMonitorBindingCandidates(monitor, null, true);
    }

    public List<EntityMonitorBindingCandidate> resolveMonitorBindingCandidates(Monitor monitor,
                                                                               String requestWorkspaceId) {
        return resolveMonitorBindingCandidates(monitor, requestWorkspaceId, false);
    }

    private List<EntityMonitorBindingCandidate> resolveMonitorBindingCandidates(Monitor monitor,
                                                                                String requestWorkspaceId,
                                                                                boolean useRequestWorkspace) {
        if (monitor == null || monitor.getId() == null) {
            return Collections.emptyList();
        }
        Map<String, String> monitorIdentities = extractMonitorIdentityCandidates(monitor);
        if (monitorIdentities.isEmpty()) {
            return Collections.emptyList();
        }
        List<EntityIdentity> matchedIdentities = entityIdentityReadModelService.findMatchingIdentities(
                monitorIdentities.keySet(), new HashSet<>(monitorIdentities.values())
        );
        Set<Long> boundEntityIds = entityMonitorBindService.findMonitorBindsByMonitorId(monitor.getId()).stream()
                .map(EntityMonitorBind::getEntityId)
                .collect(Collectors.toSet());
        Map<Long, BindingCandidateAccumulator> candidates = new LinkedHashMap<>();
        for (EntityIdentity identity : matchedIdentities) {
            String candidateValue = monitorIdentities.get(identity.getIdentityKey());
            if (!Objects.equals(candidateValue, identity.getNormalizedValue())) {
                continue;
            }
            BindingCandidateAccumulator accumulator = candidates.computeIfAbsent(identity.getEntityId(),
                    key -> new BindingCandidateAccumulator());
            accumulator.score += matchScore(identity);
            accumulator.matchedIdentities.computeIfAbsent(identity.getIdentityKey(), key -> new ArrayList<>())
                    .add(identity.getIdentityValue());
        }
        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }
        List<ObserveEntity> accessibleEntities = useRequestWorkspace
                ? entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(candidates.keySet())
                : entityWorkspaceAccessService.findAccessibleEntitiesByIds(candidates.keySet(), requestWorkspaceId);
        Map<Long, ObserveEntity> entityMap = accessibleEntities
                .stream()
                .collect(Collectors.toMap(ObserveEntity::getId, item -> item));
        return candidates.entrySet().stream()
                .map(entry -> toBindingCandidate(entry.getKey(), entry.getValue(), entityMap, boundEntityIds))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(EntityMonitorBindingCandidate::getScore).reversed())
                .toList();
    }

    public int defaultIdentityPriority(String identityKey) {
        if (EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identityKey)) {
            return EntityCanonicalIdentityRegistry.defaultPriority(identityKey);
        }
        if (identityKey != null && identityKey.startsWith("k8s.")) {
            return 70;
        }
        return IDENTITY_SCORES.getOrDefault(identityKey, 40);
    }

    public String normalizeIdentityValue(String identityKey, String identityValue) {
        if (!StringUtils.hasText(identityValue)) {
            return identityValue;
        }
        if ("monitor.app".equals(identityKey)) {
            return identityValue.trim().toLowerCase(Locale.ROOT);
        }
        return identityValue.trim().toLowerCase(Locale.ROOT);
    }

    private EntityMonitorBindingCandidate toBindingCandidate(Long entityId,
                                                             BindingCandidateAccumulator accumulator,
                                                             Map<Long, ObserveEntity> entityMap,
                                                             Set<Long> boundEntityIds) {
        ObserveEntity entity = entityMap.get(entityId);
        if (entity == null) {
            return null;
        }
        int score = accumulator.finalScore();
        return new EntityMonitorBindingCandidate(
                entity.getId(),
                entity.getDisplayName() == null ? entity.getName() : entity.getDisplayName(),
                entity.getType(),
                score,
                score >= 100 ? RECOMMEND_DIRECT : RECOMMEND_SUGGESTED,
                boundEntityIds.contains(entity.getId()),
                accumulator.matchedIdentities
        );
    }

    private Map<String, String> extractMonitorIdentityCandidates(Monitor monitor) {
        Map<String, String> identities = new LinkedHashMap<>();
        putSupportedCandidates(identities, monitor.getLabels());
        putSupportedCandidates(identities, monitor.getAnnotations());
        String app = monitor.getApp() == null ? null : monitor.getApp().toLowerCase(Locale.ROOT);
        if (StringUtils.hasText(app) && HOST_LIKE_APPS.contains(app)) {
            putIdentityCandidate(identities, "host.name", monitor.getName());
            putIdentityCandidate(identities, "host.id", monitor.getInstance());
        }
        if (StringUtils.hasText(app) && QUEUE_LIKE_APPS.contains(app)) {
            putIdentityCandidate(identities, "messaging.destination.name", defaultText(monitor.getName(), monitor.getInstance()));
        }
        if (StringUtils.hasText(app) && (SERVICE_LIKE_APPS.contains(app) || DATABASE_LIKE_APPS.contains(app)
                || (MIDDLEWARE_LIKE_APPS.contains(app) && !QUEUE_LIKE_APPS.contains(app)))) {
            putIdentityCandidate(identities, "service.name", monitor.getName());
        }
        if (StringUtils.hasText(app) && ENDPOINT_LIKE_APPS.contains(app)) {
            putIdentityCandidate(identities, "endpoint.url", monitor.getInstance());
        }
        if (containsK8sSignal(monitor.getLabels()) || containsK8sSignal(monitor.getAnnotations())) {
            putIdentityCandidate(identities, "k8s.workload.name", monitor.getName());
        }
        putIdentityCandidate(identities, "monitor.instance", monitor.getInstance());
        putIdentityCandidate(identities, "monitor.name", monitor.getName());
        putIdentityCandidate(identities, "monitor.app", monitor.getApp());
        return identities;
    }

    private void putSupportedCandidates(Map<String, String> target, Map<String, String> source) {
        if (source == null || source.isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> entry : source.entrySet()) {
            if (!StringUtils.hasText(entry.getKey()) || !StringUtils.hasText(entry.getValue())) {
                continue;
            }
            if (isOtelResourceIdentity(entry.getKey()) || SYNTHETIC_IDENTITY_KEYS.contains(entry.getKey())) {
                putIdentityCandidate(target, entry.getKey(), entry.getValue());
            }
        }
    }

    private void putIdentityCandidate(Map<String, String> target, String key, String value) {
        if (!StringUtils.hasText(key) || !StringUtils.hasText(value) || target.containsKey(key)) {
            return;
        }
        target.put(key, normalizeIdentityValue(key, value));
    }

    private int matchScore(EntityIdentity identity) {
        int base = identity.getPriority() == null ? defaultIdentityPriority(identity.getIdentityKey()) : identity.getPriority();
        if (identity.isPrimaryIdentity()) {
            base += 10;
        }
        return base;
    }

    private boolean containsK8sSignal(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            return false;
        }
        return values.keySet().stream().anyMatch(key -> key != null && key.startsWith("k8s."));
    }

    private boolean isOtelResourceIdentity(String identityKey) {
        if (!StringUtils.hasText(identityKey)) {
            return false;
        }
        return EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(identityKey);
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private static final class BindingCandidateAccumulator {
        private int score;
        private final Map<String, List<String>> matchedIdentities = new LinkedHashMap<>();

        private int finalScore() {
            int finalScore = score;
            if (matchedIdentities.containsKey("service.name") && matchedIdentities.containsKey("service.namespace")) {
                finalScore += 30;
            }
            if (matchedIdentities.containsKey("host.id") && matchedIdentities.containsKey("host.name")) {
                finalScore += 20;
            }
            if (matchedIdentities.keySet().stream().anyMatch(key -> key.startsWith("k8s."))) {
                finalScore += 20;
            }
            return finalScore;
        }
    }
}
