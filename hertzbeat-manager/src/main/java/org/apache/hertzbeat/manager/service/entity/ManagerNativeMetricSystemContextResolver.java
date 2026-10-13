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

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.metric.NativeMetricSystemContext;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.NativeMetricSystemContextResolver;
import org.springframework.stereotype.Service;

/** Resolves the single active monitor-to-entity authority for native metric persistence. */
@Slf4j
@Service
public class ManagerNativeMetricSystemContextResolver implements NativeMetricSystemContextResolver {

    private static final String ACTIVE = "active";
    private static final long MAXIMUM_MONITOR_AUTHORITIES = 100_000;
    private static final Duration AUTHORITY_REFRESH_INTERVAL = Duration.ofSeconds(5);
    private static final AtomicLong AUTHORITY_LOOKUP_FAILURE_COUNT = new AtomicLong();

    private final EntityMonitorBindQueryService bindQueryService;
    private final EntityWorkspaceQueryService entityQueryService;
    private final Cache<Long, EntityAuthority> authorityCache = Caffeine.newBuilder()
            .maximumSize(MAXIMUM_MONITOR_AUTHORITIES)
            .expireAfterWrite(AUTHORITY_REFRESH_INTERVAL)
            .build();

    public ManagerNativeMetricSystemContextResolver(EntityMonitorBindQueryService bindQueryService,
                                                    EntityWorkspaceQueryService entityQueryService) {
        this.bindQueryService = bindQueryService;
        this.entityQueryService = entityQueryService;
    }

    @Override
    public NativeMetricSystemContext resolve(
            CollectRep.MetricsData metricsData, NativeMetricSystemContext intrinsic) {
        if (intrinsic == null || intrinsic.monitorId() == null) {
            return intrinsic;
        }
        EntityAuthority authority = authorityCache.get(intrinsic.monitorId(), this::loadAuthority);
        if (authority == null || authority.entityId() == null) {
            return intrinsic;
        }
        return new NativeMetricSystemContext(
                authority.workspaceId(),
                authority.entityId(),
                authority.entityType(),
                intrinsic.monitorId(),
                intrinsic.collectorId(),
                intrinsic.instance());
    }

    private EntityAuthority loadAuthority(Long monitorId) {
        try {
            return loadAuthorityFromMetadata(monitorId);
        } catch (RuntimeException exception) {
            long failureCount = AUTHORITY_LOOKUP_FAILURE_COUNT.incrementAndGet();
            if (Long.bitCount(failureCount) == 1) {
                log.warn("Native metric authority lookup failed for monitor {}; failures={}; exception={}",
                        monitorId, failureCount, exception.getClass().getName());
            }
            return EntityAuthority.ABSENT;
        }
    }

    private EntityAuthority loadAuthorityFromMetadata(Long monitorId) {
        List<EntityMonitorBind> bindings = bindQueryService.findMonitorBindsByMonitorId(monitorId);
        List<EntityMonitorBind> activeBindings = bindings == null
                ? List.of()
                : bindings.stream()
                        .filter(Objects::nonNull)
                        .filter(binding -> Objects.equals(monitorId, binding.getMonitorId()))
                        .filter(binding -> binding.getEntityId() != null)
                        .filter(binding -> ACTIVE.equalsIgnoreCase(binding.getStatus()))
                        .toList();
        if (activeBindings.size() != 1) {
            return EntityAuthority.ABSENT;
        }
        EntityMonitorBind binding = activeBindings.getFirst();
        ObserveEntity entity = entityQueryService.findEntityById(binding.getEntityId()).orElse(null);
        if (entity == null || !Objects.equals(binding.getEntityId(), entity.getId())) {
            return EntityAuthority.ABSENT;
        }
        return new EntityAuthority(entity.getWorkspaceId(), entity.getId(), entity.getType());
    }

    private record EntityAuthority(String workspaceId, Long entityId, String entityType) {

        private static final EntityAuthority ABSENT = new EntityAuthority(null, null, null);
    }
}
