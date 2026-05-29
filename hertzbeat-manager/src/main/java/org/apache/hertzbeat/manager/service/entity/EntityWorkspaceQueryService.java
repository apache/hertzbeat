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

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Query boundary for raw persisted entity catalog rows.
 */
@Service
public class EntityWorkspaceQueryService {

    private final ObserveEntityDao observeEntityDao;

    public EntityWorkspaceQueryService(ObserveEntityDao observeEntityDao) {
        this.observeEntityDao = observeEntityDao;
    }

    public List<ObserveEntity> findEntitiesByIds(Collection<Long> entityIds) {
        return observeEntityDao.findAllById(entityIds);
    }

    public List<ObserveEntity> findEntities(String workspaceId, Sort sort) {
        if (StringUtils.hasText(workspaceId)) {
            return observeEntityDao.findAllByWorkspaceId(workspaceId, sort);
        }
        return observeEntityDao.findAll(sort);
    }

    public Page<ObserveEntity> findEntityPage(Specification<ObserveEntity> specification, Pageable pageable) {
        return observeEntityDao.findAll(specification, pageable);
    }

    public Optional<ObserveEntity> findEntityById(long entityId) {
        return observeEntityDao.findById(entityId);
    }

    public Optional<ObserveEntity> findEntityByReference(String workspaceId,
                                                         String type,
                                                         String namespace,
                                                         String name) {
        if (StringUtils.hasText(workspaceId)) {
            return observeEntityDao.findFirstByWorkspaceIdAndTypeAndNamespaceAndName(
                    workspaceId, type, namespace, name);
        }
        return observeEntityDao.findFirstByTypeAndNamespaceAndName(type, namespace, name);
    }

    public Optional<ObserveEntity> findEntityByReference(String workspaceId, String type, String name) {
        if (StringUtils.hasText(workspaceId)) {
            return observeEntityDao.findFirstByWorkspaceIdAndTypeAndName(workspaceId, type, name);
        }
        return observeEntityDao.findFirstByTypeAndName(type, name);
    }
}
