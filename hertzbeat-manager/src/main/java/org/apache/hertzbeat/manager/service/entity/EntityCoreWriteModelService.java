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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.dao.ObserveEntityDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Owns core catalog field application for entity writes.
 */
@Service
public class EntityCoreWriteModelService {

    private static final String STATUS_UNKNOWN = "unknown";
    private static final String SOURCE_MANUAL = "manual";

    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final ObserveEntityDao observeEntityDao;

    public EntityCoreWriteModelService(EntityWorkspaceAccessService entityWorkspaceAccessService,
                                       ObserveEntityDao observeEntityDao) {
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.observeEntityDao = observeEntityDao;
    }

    public ObserveEntity createEntity(ObserveEntity input, String fallbackSource) {
        ObserveEntity entity = new ObserveEntity();
        entity.setId(input.getId() == null ? SnowFlakeIdGenerator.generateId() : input.getId());
        return saveEntityCore(entity, input, fallbackSource);
    }

    public List<ObserveEntity> createEntities(List<ObserveEntity> inputs, String fallbackSource) {
        if (CollectionUtils.isEmpty(inputs)) {
            return Collections.emptyList();
        }
        List<ObserveEntity> entities = inputs.stream()
                .map(input -> {
                    ObserveEntity entity = new ObserveEntity();
                    entity.setId(input.getId() == null ? SnowFlakeIdGenerator.generateId() : input.getId());
                    applyEntityCore(entity, input, fallbackSource);
                    return entity;
                })
                .toList();
        return observeEntityDao.saveAll(entities);
    }

    public ObserveEntity saveEntityCore(ObserveEntity target, ObserveEntity source, String fallbackSource) {
        applyEntityCore(target, source, fallbackSource);
        return observeEntityDao.save(target);
    }

    public void deleteEntityById(long entityId) {
        observeEntityDao.deleteById(entityId);
    }

    public ObserveEntity persistStatus(ObserveEntity entity, String status) {
        entity.setStatus(status);
        return observeEntityDao.save(entity);
    }

    public void applyEntityCore(ObserveEntity target, ObserveEntity source, String fallbackSource) {
        target.setType(source.getType());
        target.setName(source.getName());
        target.setDisplayName(source.getDisplayName());
        target.setSubtype(source.getSubtype());
        target.setNamespace(source.getNamespace());
        target.setEnvironment(source.getEnvironment());
        target.setStatus(defaultText(source.getStatus(), STATUS_UNKNOWN));
        target.setCriticality(source.getCriticality());
        target.setOwner(source.getOwner());
        target.setAdditionalOwners(source.getAdditionalOwners());
        target.setRunbook(source.getRunbook());
        target.setLifecycle(source.getLifecycle());
        target.setTier(source.getTier());
        target.setSystem(source.getSystem());
        target.setComponentOf(source.getComponentOf());
        target.setComponents(source.getComponents());
        target.setImplementedBy(source.getImplementedBy());
        target.setApiInterface(source.getApiInterface());
        target.setInheritFrom(source.getInheritFrom());
        target.setLanguages(source.getLanguages());
        target.setLinks(source.getLinks());
        target.setContacts(source.getContacts());
        target.setIntegrations(source.getIntegrations());
        target.setExtensions(source.getExtensions());
        target.setHertzbeat(source.getHertzbeat());
        target.setSource(defaultText(source.getSource(), fallbackSource, SOURCE_MANUAL));
        target.setDescription(source.getDescription());
        target.setLabels(source.getLabels());
        target.setTags(normalizeTags(source.getTags(), source.getLabels()));
        target.setWorkspaceId(entityWorkspaceAccessService.resolveWriteWorkspaceId(
                source.getWorkspaceId(), target.getWorkspaceId()));
    }

    private List<String> normalizeTags(List<String> tags, Map<String, String> labels) {
        List<String> normalized = (tags == null ? Collections.<String>emptyList() : tags).stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
        if (!CollectionUtils.isEmpty(normalized)) {
            return normalized;
        }
        if (CollectionUtils.isEmpty(labels)) {
            return Collections.emptyList();
        }
        return labels.entrySet().stream()
                .filter(entry -> StringUtils.hasText(entry.getKey()))
                .map(entry -> StringUtils.hasText(entry.getValue())
                        ? entry.getKey().trim() + ":" + entry.getValue().trim()
                        : entry.getKey().trim())
                .toList();
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
