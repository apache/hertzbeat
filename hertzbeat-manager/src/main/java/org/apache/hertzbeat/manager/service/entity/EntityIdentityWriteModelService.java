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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Owns normalized identity row writes for entities.
 */
@Service
public class EntityIdentityWriteModelService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String SOURCE_DERIVED = "derived";
    private static final String TYPE_QUEUE = "queue";
    private static final String TYPE_API = "api";

    private final EntityIdentityDao entityIdentityDao;
    private final EntityIdentityResolutionService entityIdentityResolutionService;

    public EntityIdentityWriteModelService(EntityIdentityDao entityIdentityDao,
                                           EntityIdentityResolutionService entityIdentityResolutionService) {
        this.entityIdentityDao = entityIdentityDao;
        this.entityIdentityResolutionService = entityIdentityResolutionService;
    }

    public void replaceIdentities(ObserveEntity entity, List<EntityIdentity> identities) {
        entityIdentityDao.deleteAllByEntityId(entity.getId());
        entityIdentityDao.flush();
        List<EntityIdentity> rows = new ArrayList<>();
        Set<String> dedupeKeys = new LinkedHashSet<>();
        if (!CollectionUtils.isEmpty(identities)) {
            for (EntityIdentity identity : identities) {
                if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())) {
                    continue;
                }
                String identityKey = identity.getIdentityKey().trim();
                String identityType = defaultText(identity.getIdentityType(), SOURCE_MANUAL);
                String identityValue = canonicalizeIdentityValue(
                        entity, identityKey, identity.getIdentityValue().trim(), identityType);
                if (!StringUtils.hasText(identityValue)) {
                    continue;
                }
                String normalizedValue = entityIdentityResolutionService.normalizeIdentityValue(identityKey, identityValue);
                String dedupeKey = identityKey + "\u0000" + normalizedValue;
                if (!dedupeKeys.add(dedupeKey)) {
                    continue;
                }
                rows.add(EntityIdentity.builder()
                        .entityId(entity.getId())
                        .identityType(identityType)
                        .identityKey(identityKey)
                        .identityValue(identityValue)
                        .normalizedValue(normalizedValue)
                        .priority(identity.getPriority() == null
                                ? entityIdentityResolutionService.defaultIdentityPriority(identityKey)
                                : identity.getPriority())
                        .primaryIdentity(identity.isPrimaryIdentity())
                        .build());
            }
        }
        if (rows.isEmpty()) {
            rows.addAll(buildDefaultIdentities(entity));
        }
        entityIdentityDao.saveAll(rows);
    }

    public void deleteIdentities(long entityId) {
        entityIdentityDao.deleteAllByEntityId(entityId);
    }

    private List<EntityIdentity> buildDefaultIdentities(ObserveEntity entity) {
        List<EntityIdentity> identities = new ArrayList<>();
        String name = StringUtils.hasText(entity.getName()) ? entity.getName() : entity.getDisplayName();
        String primaryKey = switch (entity.getType()) {
            case "host", "device" -> "host.name";
            case "endpoint" -> "endpoint.url";
            case TYPE_QUEUE -> "messaging.destination.name";
            case TYPE_API -> "service.name";
            case "k8s_workload" -> "k8s.workload.name";
            default -> "service.name";
        };
        if (StringUtils.hasText(name)) {
            identities.add(EntityIdentity.builder()
                    .entityId(entity.getId())
                    .identityType(SOURCE_DERIVED)
                    .identityKey(primaryKey)
                    .identityValue(name)
                    .normalizedValue(entityIdentityResolutionService.normalizeIdentityValue(primaryKey, name))
                    .priority(entityIdentityResolutionService.defaultIdentityPriority(primaryKey))
                    .primaryIdentity(true)
                    .build());
        }
        if (StringUtils.hasText(entity.getNamespace())) {
            identities.add(EntityIdentity.builder()
                    .entityId(entity.getId())
                    .identityType(SOURCE_DERIVED)
                    .identityKey("service.namespace")
                    .identityValue(entity.getNamespace())
                    .normalizedValue(entityIdentityResolutionService.normalizeIdentityValue(
                            "service.namespace", entity.getNamespace()))
                    .priority(entityIdentityResolutionService.defaultIdentityPriority("service.namespace"))
                    .primaryIdentity(false)
                    .build());
        }
        if (StringUtils.hasText(entity.getEnvironment())) {
            identities.add(EntityIdentity.builder()
                    .entityId(entity.getId())
                    .identityType(SOURCE_DERIVED)
                    .identityKey("deployment.environment.name")
                    .identityValue(entity.getEnvironment())
                    .normalizedValue(entityIdentityResolutionService.normalizeIdentityValue(
                            "deployment.environment.name", entity.getEnvironment()))
                    .priority(entityIdentityResolutionService.defaultIdentityPriority("deployment.environment.name"))
                    .primaryIdentity(false)
                    .build());
        }
        return identities;
    }

    private String canonicalizeIdentityValue(ObserveEntity entity, String identityKey, String identityValue, String identityType) {
        if (!StringUtils.hasText(identityType) || SOURCE_MANUAL.equalsIgnoreCase(identityType)) {
            return identityValue;
        }
        return switch (identityKey) {
            case "service.name" -> isServiceLikeEntity(entity) && StringUtils.hasText(entity.getName())
                    ? entity.getName()
                    : identityValue;
            case "messaging.destination.name" -> TYPE_QUEUE.equals(entity.getType()) && StringUtils.hasText(entity.getName())
                    ? entity.getName()
                    : identityValue;
            case "k8s.workload.name" -> StringUtils.hasText(entity.getName())
                    ? entity.getName()
                    : identityValue;
            case "display_name" -> StringUtils.hasText(entity.getDisplayName())
                    ? entity.getDisplayName()
                    : identityValue;
            default -> identityValue;
        };
    }

    private boolean isServiceLikeEntity(ObserveEntity entity) {
        if (entity == null || !StringUtils.hasText(entity.getType())) {
            return false;
        }
        return switch (entity.getType()) {
            case "service", "database", "middleware" -> true;
            default -> false;
        };
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
