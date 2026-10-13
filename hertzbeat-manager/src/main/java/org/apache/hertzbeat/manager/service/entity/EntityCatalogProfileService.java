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

import java.util.LinkedHashSet;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityCatalogSuggestionsInfo;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Builds catalog profile suggestions from existing entity rows.
 */
@Service
public class EntityCatalogProfileService {

    private static final String TYPE_DATABASE = "database";
    private static final String TYPE_API = "api";
    private static final String KIND_DATASTORE = "datastore";
    private static final String KIND_API = "api";

    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityCatalogProfileService(EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public EntityCatalogSuggestionsInfo getCatalogSuggestions(int limit) {
        int suggestionLimit = limit <= 0 ? 12 : Math.min(limit, 200);
        Sort sort = Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"));
        return buildSuggestions(entityWorkspaceAccessService.findAccessibleEntitiesForRequestWorkspace(sort),
                suggestionLimit);
    }

    public EntityCatalogSuggestionsInfo getCatalogSuggestions(int limit, String requestWorkspaceId) {
        int suggestionLimit = limit <= 0 ? 12 : Math.min(limit, 200);
        Sort sort = Sort.by(Sort.Order.desc("gmtUpdate"), Sort.Order.desc("id"));
        return buildSuggestions(entityWorkspaceAccessService.findAccessibleEntities(requestWorkspaceId, sort),
                suggestionLimit);
    }

    private EntityCatalogSuggestionsInfo buildSuggestions(List<ObserveEntity> entities, int suggestionLimit) {
        LinkedHashSet<String> owners = new LinkedHashSet<>();
        LinkedHashSet<String> namespaces = new LinkedHashSet<>();
        LinkedHashSet<String> environments = new LinkedHashSet<>();
        LinkedHashSet<String> systems = new LinkedHashSet<>();
        LinkedHashSet<String> lifecycles = new LinkedHashSet<>();
        LinkedHashSet<String> tiers = new LinkedHashSet<>();
        LinkedHashSet<String> inheritFromRefs = new LinkedHashSet<>();
        LinkedHashSet<String> entityRefs = new LinkedHashSet<>();
        LinkedHashSet<String> languages = new LinkedHashSet<>();
        LinkedHashSet<String> linkProviders = new LinkedHashSet<>();
        for (ObserveEntity entity : entities) {
            addSuggestion(owners, entity.getOwner(), suggestionLimit);
            addSuggestion(namespaces, entity.getNamespace(), suggestionLimit);
            addSuggestion(environments, entity.getEnvironment(), suggestionLimit);
            addSuggestion(systems, entity.getSystem(), suggestionLimit);
            addSuggestion(lifecycles, entity.getLifecycle(), suggestionLimit);
            addSuggestion(tiers, entity.getTier(), suggestionLimit);
            addSuggestion(inheritFromRefs, entity.getInheritFrom(), suggestionLimit);
            addSuggestion(entityRefs, buildEntityReference(entity), suggestionLimit);
            if (!CollectionUtils.isEmpty(entity.getAdditionalOwners())) {
                entity.getAdditionalOwners().stream()
                        .map(EntityOwnerRef::getName)
                        .forEach(value -> addSuggestion(owners, value, suggestionLimit));
            }
            if (!CollectionUtils.isEmpty(entity.getLanguages())) {
                entity.getLanguages().forEach(value -> addSuggestion(languages, value, suggestionLimit));
            }
            if (!CollectionUtils.isEmpty(entity.getLinks())) {
                entity.getLinks().stream()
                        .map(EntityCatalogLink::getProvider)
                        .forEach(value -> addSuggestion(linkProviders, value, suggestionLimit));
            }
        }
        return new EntityCatalogSuggestionsInfo(
                List.copyOf(owners),
                List.copyOf(namespaces),
                List.copyOf(environments),
                List.copyOf(systems),
                List.copyOf(lifecycles),
                List.copyOf(tiers),
                List.copyOf(inheritFromRefs),
                List.copyOf(entityRefs),
                List.copyOf(languages),
                List.copyOf(linkProviders)
        );
    }

    private String buildEntityReference(ObserveEntity entity) {
        if (entity == null || !StringUtils.hasText(entity.getType()) || !StringUtils.hasText(entity.getName())) {
            return null;
        }
        String namespace = defaultText(entity.getNamespace(), "default");
        return toDefinitionKind(entity.getType()) + ":" + namespace + "/" + entity.getName();
    }

    private String toDefinitionKind(String entityType) {
        if (!StringUtils.hasText(entityType)) {
            return null;
        }
        return switch (entityType.trim().toLowerCase()) {
            case TYPE_DATABASE -> KIND_DATASTORE;
            case TYPE_API -> KIND_API;
            default -> entityType.trim().toLowerCase();
        };
    }

    private void addSuggestion(LinkedHashSet<String> values, String value, int limit) {
        String normalizedValue = trimToNull(value);
        if (!StringUtils.hasText(normalizedValue) || values.size() >= limit) {
            return;
        }
        values.add(normalizedValue);
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
