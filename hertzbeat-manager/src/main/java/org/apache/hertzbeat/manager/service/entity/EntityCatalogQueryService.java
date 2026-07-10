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

import com.google.common.primitives.Longs;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Catalog query boundary for entity list pages and old API compatibility filters.
 */
@Service
public class EntityCatalogQueryService {

    private static final String TYPE_API = "api";
    private static final String TYPE_ENDPOINT = "endpoint";

    private final EntityWorkspaceQueryService entityWorkspaceQueryService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityCatalogQueryService(EntityWorkspaceQueryService entityWorkspaceQueryService,
                                     EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityWorkspaceQueryService = entityWorkspaceQueryService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public Page<ObserveEntity> findEntityPage(List<Long> entityIds, String type, String status, String search,
                                              String owner, String source, String environment, String lifecycle,
                                              String tier, String system, String sort, String order,
                                              int pageIndex, int pageSize) {
        return findEntityPage(entityIds, type, status, search, owner, source, environment, lifecycle, tier, system,
                sort, order, pageIndex, pageSize, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public Page<ObserveEntity> findEntityPage(List<Long> entityIds, String type, String status, String search,
                                              String owner, String source, String environment, String lifecycle,
                                              String tier, String system, String sort, String order,
                                              int pageIndex, int pageSize, String requestWorkspaceId) {
        PageRequest pageRequest = buildPageRequest(sort, order, pageIndex, pageSize);
        Page<ObserveEntity> entityPage = entityWorkspaceQueryService.findEntityPage(
                buildEntitySpecification(entityIds, type, status, search, owner, source, environment,
                        lifecycle, tier, system, requestWorkspaceId),
                pageRequest
        );
        return filterPageByRequestWorkspace(entityPage, requestWorkspaceId);
    }

    private PageRequest buildPageRequest(String sort, String order, int pageIndex, int pageSize) {
        return PageRequest.of(
                pageIndex,
                pageSize,
                Sort.by(new Sort.Order(
                        Sort.Direction.fromString(StringUtils.hasText(order) ? order : "desc"),
                        StringUtils.hasText(sort) ? sort : "gmtUpdate"))
        );
    }

    private Page<ObserveEntity> filterPageByRequestWorkspace(Page<ObserveEntity> entityPage,
                                                             String requestWorkspaceId) {
        if (!StringUtils.hasText(requestWorkspaceId)) {
            return entityPage;
        }
        List<ObserveEntity> scopedEntities = entityWorkspaceAccessService.filterEntitiesByRequestWorkspace(
                entityPage.getContent(), requestWorkspaceId);
        if (scopedEntities.size() == entityPage.getContent().size()) {
            return entityPage;
        }
        return new PageImpl<>(scopedEntities, entityPage.getPageable(), scopedEntities.size());
    }

    private Specification<ObserveEntity> buildEntitySpecification(List<Long> entityIds, String type, String status,
                                                                  String search, String owner, String source,
                                                                  String environment, String lifecycle,
                                                                  String tier, String system,
                                                                  String requestWorkspaceId) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (StringUtils.hasText(requestWorkspaceId)) {
                andList.add(criteriaBuilder.equal(root.get("workspaceId"), requestWorkspaceId));
            }
            if (!CollectionUtils.isEmpty(entityIds)) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (Long entityId : entityIds) {
                    inPredicate.value(entityId);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(type)) {
                if (TYPE_API.equals(type)) {
                    Predicate apiType = criteriaBuilder.equal(root.get("type"), TYPE_API);
                    Predicate legacyApiEndpoint = criteriaBuilder.and(
                            criteriaBuilder.equal(root.get("type"), TYPE_ENDPOINT),
                            criteriaBuilder.or(
                                    criteriaBuilder.isNotNull(root.get("implementedBy")),
                                    criteriaBuilder.isNotNull(root.get("apiInterface")),
                                    criteriaBuilder.like(criteriaBuilder.lower(root.get("subtype")), "%api%")
                            )
                    );
                    andList.add(criteriaBuilder.or(apiType, legacyApiEndpoint));
                } else {
                    andList.add(criteriaBuilder.equal(root.get("type"), type));
                }
            }
            if (StringUtils.hasText(status)) {
                andList.add(criteriaBuilder.equal(root.get("status"), status));
            }
            if (StringUtils.hasText(owner)) {
                andList.add(criteriaBuilder.equal(root.get("owner"), owner));
            }
            if (StringUtils.hasText(source)) {
                andList.add(criteriaBuilder.equal(root.get("source"), source));
            }
            if (StringUtils.hasText(environment)) {
                andList.add(criteriaBuilder.equal(root.get("environment"), environment));
            }
            if (StringUtils.hasText(lifecycle)) {
                andList.add(criteriaBuilder.equal(root.get("lifecycle"), lifecycle));
            }
            if (StringUtils.hasText(tier)) {
                andList.add(criteriaBuilder.equal(root.get("tier"), tier));
            }
            if (StringUtils.hasText(system)) {
                andList.add(criteriaBuilder.equal(root.get("system"), system));
            }
            List<Predicate> orList = buildSearchPredicates(search, root, criteriaBuilder);
            Predicate andPredicate = andList.isEmpty() ? null : criteriaBuilder.and(andList.toArray(new Predicate[0]));
            Predicate orPredicate = orList.isEmpty() ? null : criteriaBuilder.or(orList.toArray(new Predicate[0]));
            if (andPredicate == null && orPredicate == null) {
                return query.where().getRestriction();
            }
            if (andPredicate == null) {
                return orPredicate;
            }
            if (orPredicate == null) {
                return andPredicate;
            }
            return query.where(andPredicate, orPredicate).getRestriction();
        };
    }

    private List<Predicate> buildSearchPredicates(String search,
                                                  jakarta.persistence.criteria.Root<ObserveEntity> root,
                                                  CriteriaBuilder criteriaBuilder) {
        List<Predicate> orList = new ArrayList<>();
        if (!StringUtils.hasText(search)) {
            return orList;
        }
        for (String normalizedSearch : normalizeSearchTextVariants(search)) {
            String lower = "%" + normalizedSearch + "%";
            orList.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("name")), normalizedSearch));
            orList.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("displayName")), normalizedSearch));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("displayName")), lower));
            List<Predicate> nameTokenPredicates = new ArrayList<>();
            List<Predicate> displayNameTokenPredicates = new ArrayList<>();
            for (String token : normalizedSearch.split("[^a-z0-9]+")) {
                if (token.length() < 2 || token.equals(normalizedSearch)) {
                    continue;
                }
                String tokenLike = "%" + token + "%";
                nameTokenPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), tokenLike));
                displayNameTokenPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("displayName")), tokenLike));
            }
            if (!nameTokenPredicates.isEmpty()) {
                orList.add(criteriaBuilder.or(
                        criteriaBuilder.and(nameTokenPredicates.toArray(new Predicate[0])),
                        criteriaBuilder.and(displayNameTokenPredicates.toArray(new Predicate[0]))));
            }
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("subtype")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("namespace")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("environment")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("owner")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("lifecycle")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("tier")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("system")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("runbook")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("inheritFrom")), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("labels").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("tags").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("additionalOwners").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("componentOf").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("components").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("implementedBy").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("apiInterface").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("languages").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("links").as(String.class)), lower));
            orList.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("contacts").as(String.class)), lower));
        }
        Long id = Longs.tryParse(search);
        if (id != null) {
            orList.add(criteriaBuilder.equal(root.get("id"), id));
        }
        return orList;
    }

    private List<String> normalizeSearchTextVariants(String search) {
        String trimmedSearch = search.trim();
        String normalizedSearch;
        try {
            normalizedSearch = URLDecoder.decode(trimmedSearch, StandardCharsets.UTF_8).toLowerCase();
        } catch (IllegalArgumentException ignored) {
            normalizedSearch = trimmedSearch.toLowerCase();
        }
        Set<String> variants = new LinkedHashSet<>();
        variants.add(normalizedSearch);
        if (normalizedSearch.contains("localhost")) {
            variants.add(normalizedSearch.replace("localhost", "127.0.0.1"));
        }
        if (normalizedSearch.contains("127.0.0.1")) {
            variants.add(normalizedSearch.replace("127.0.0.1", "localhost"));
        }
        return new ArrayList<>(variants);
    }
}
