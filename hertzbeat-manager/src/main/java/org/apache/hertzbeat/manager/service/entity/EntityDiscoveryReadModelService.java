/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.entity;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryReadModel;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Composes monitor pagination and entity binding hints into a safe UI read model.
 */
@Service
public class EntityDiscoveryReadModelService {

    private static final int SCHEMA_VERSION = 1;
    private static final int CANDIDATE_LIMIT = 8;
    private static final String MATCH_ALREADY_BOUND = "already_bound";
    private static final String MATCH_DIRECT = "direct";
    private static final String MATCH_SUGGESTED = "suggested";
    private static final String UNAVAILABLE = "entity_discovery_unavailable";

    private final MonitorService monitorService;
    private final ObserveEntityService observeEntityService;

    public EntityDiscoveryReadModelService(
            MonitorService monitorService, ObserveEntityService observeEntityService) {
        this.monitorService = monitorService;
        this.observeEntityService = observeEntityService;
    }

    public EntityDiscoveryReadModel getDiscovery(String search, int pageIndex, int pageSize) {
        try {
            Page<Monitor> page = monitorService.getMonitors(
                    null, null, search, null, "id", "desc", pageIndex, pageSize, null);
            if (page == null) {
                return empty(pageIndex, pageSize);
            }
            List<Monitor> monitors = page.getContent().stream().filter(Objects::nonNull).toList();
            List<Long> monitorIds = monitors.stream()
                    .map(Monitor::getId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            Map<Long, List<EntityMonitorBindingCandidate>> candidates =
                    observeEntityService.getMonitorBindingCandidates(monitorIds);
            Map<Long, List<EntityMonitorBindingCandidate>> safeCandidates =
                    candidates == null ? Collections.emptyMap() : candidates;
            List<EntityDiscoveryReadModel.DiscoveryRow> content = monitors.stream()
                    .map(monitor -> row(monitor, safeCandidates.get(monitor.getId())))
                    .toList();
            return new EntityDiscoveryReadModel(
                    SCHEMA_VERSION,
                    page.getNumber(),
                    page.getSize(),
                    page.getTotalElements(),
                    page.getTotalPages(),
                    content);
        } catch (RuntimeException ignored) {
            throw new CommonException(UNAVAILABLE);
        }
    }

    private static EntityDiscoveryReadModel empty(int pageIndex, int pageSize) {
        return new EntityDiscoveryReadModel(SCHEMA_VERSION, pageIndex, pageSize, 0, 0, List.of());
    }

    private static EntityDiscoveryReadModel.DiscoveryRow row(
            Monitor monitor, List<EntityMonitorBindingCandidate> candidates) {
        EntityDiscoveryReadModel.MonitorSummary summary = new EntityDiscoveryReadModel.MonitorSummary(
                monitor.getId(), monitor.getName(), monitor.getApp(), monitor.getInstance(), monitor.getStatus());
        List<EntityDiscoveryReadModel.Candidate> mappedCandidates = candidates == null
                ? List.of()
                : candidates.stream()
                        .filter(Objects::nonNull)
                        .limit(CANDIDATE_LIMIT)
                        .map(EntityDiscoveryReadModelService::candidate)
                        .toList();
        return new EntityDiscoveryReadModel.DiscoveryRow(summary, mappedCandidates);
    }

    private static EntityDiscoveryReadModel.Candidate candidate(EntityMonitorBindingCandidate candidate) {
        List<String> matchedKeys = candidate.getMatchedIdentities() == null
                ? List.of()
                : candidate.getMatchedIdentities().keySet().stream()
                        .filter(StringUtils::hasText)
                        .map(String::trim)
                        .distinct()
                        .sorted()
                        .toList();
        return new EntityDiscoveryReadModel.Candidate(
                candidate.getEntityId(),
                candidate.getEntityName(),
                candidate.getEntityType(),
                match(candidate),
                matchedKeys);
    }

    private static String match(EntityMonitorBindingCandidate candidate) {
        if (candidate.isAlreadyBound() || MATCH_ALREADY_BOUND.equals(candidate.getRecommendation())) {
            return MATCH_ALREADY_BOUND;
        }
        return MATCH_DIRECT.equals(candidate.getRecommendation()) ? MATCH_DIRECT : MATCH_SUGGESTED;
    }
}
