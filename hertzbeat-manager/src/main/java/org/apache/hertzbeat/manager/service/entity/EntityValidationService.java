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

import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Owns entity request validation before catalog write orchestration.
 */
@Service
public class EntityValidationService {

    private static final String TYPE_SYSTEM = "system";
    private static final String TYPE_DATABASE = "database";
    private static final String TYPE_QUEUE = "queue";
    private static final String TYPE_API = "api";
    private static final String TYPE_ENDPOINT = "endpoint";
    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "service", "host", TYPE_SYSTEM, TYPE_DATABASE, TYPE_QUEUE, "middleware", "device", TYPE_API, TYPE_ENDPOINT, "k8s_workload"
    );
    private static final Set<String> SUPPORTED_STATUS = Set.of(
            "unknown", "healthy", "degraded", "critical", "paused"
    );
    private static final Set<String> SUPPORTED_CRITICALITY = Set.of("low", "medium", "high", "critical");

    public void validate(EntityDto entityDto, boolean isModify) {
        if (entityDto == null || entityDto.getEntity() == null) {
            throw new IllegalArgumentException("Entity can not be null.");
        }
        ObserveEntity entity = entityDto.getEntity();
        if (isModify && entity.getId() == null) {
            throw new IllegalArgumentException("Entity ID can not be null when modify.");
        }
        if (!StringUtils.hasText(entity.getType()) || !SUPPORTED_TYPES.contains(entity.getType())) {
            throw new IllegalArgumentException("Unsupported entity type.");
        }
        if (!StringUtils.hasText(entity.getName())) {
            throw new IllegalArgumentException("Entity name can not be blank.");
        }
        if (StringUtils.hasText(entity.getStatus()) && !SUPPORTED_STATUS.contains(entity.getStatus())) {
            throw new IllegalArgumentException("Unsupported entity status.");
        }
        if (StringUtils.hasText(entity.getCriticality()) && !SUPPORTED_CRITICALITY.contains(entity.getCriticality())) {
            throw new IllegalArgumentException("Unsupported entity criticality.");
        }
        if (!CollectionUtils.isEmpty(entityDto.getIdentities())) {
            for (EntityIdentity identity : entityDto.getIdentities()) {
                if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())) {
                    throw new IllegalArgumentException("Entity identity key and value can not be blank.");
                }
            }
        }
        if (!CollectionUtils.isEmpty(entityDto.getMonitorBinds())) {
            for (EntityMonitorBind bind : entityDto.getMonitorBinds()) {
                if (bind.getMonitorId() == null) {
                    throw new IllegalArgumentException("Monitor bind monitorId can not be null.");
                }
            }
        }
    }
}
