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

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Query boundary for monitor-linked alert evidence rows.
 */
@Service
public class EntityAlertEvidenceQueryService {

    private final SingleAlertDao singleAlertDao;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityAlertEvidenceQueryService(SingleAlertDao singleAlertDao,
                                           EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.singleAlertDao = singleAlertDao;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public List<SingleAlert> findActiveAlerts(List<Monitor> monitors, int limit) {
        return findActiveAlerts(monitors, limit, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public List<SingleAlert> findActiveAlerts(List<Monitor> monitors, int limit, String requestWorkspaceId) {
        return findActiveAlertPage(monitors, 0, limit, requestWorkspaceId).getContent();
    }

    /**
     * Returns a bounded current-alert preview while preserving the exact database-backed total count.
     */
    public Page<SingleAlert> findActiveAlertPage(List<Monitor> monitors,
                                                int pageIndex,
                                                int pageSize,
                                                String requestWorkspaceId) {
        int safePageIndex = Math.max(0, pageIndex);
        int safePageSize = pageSize <= 0 ? 20 : Math.min(pageSize, 100);
        PageRequest pageRequest = PageRequest.of(
                safePageIndex, safePageSize, Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        if (CollectionUtils.isEmpty(monitors)) {
            return Page.empty(pageRequest);
        }
        return singleAlertDao.findAll(
                buildAlertSpecification(monitors, CommonConstants.ALERT_STATUS_FIRING, requestWorkspaceId),
                pageRequest);
    }

    public List<SingleAlert> findAlerts(List<Monitor> monitors, String status) {
        return findAlerts(monitors, status, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public List<SingleAlert> findAlerts(List<Monitor> monitors, String status, String requestWorkspaceId) {
        if (CollectionUtils.isEmpty(monitors)) {
            return Collections.emptyList();
        }
        return singleAlertDao.findAll(
                buildAlertSpecification(monitors, status, requestWorkspaceId),
                Sort.by(Sort.Direction.DESC, "gmtUpdate"));
    }

    private Specification<SingleAlert> buildAlertSpecification(List<Monitor> monitors, String status,
                                                               String requestWorkspaceId) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            andList.add(criteriaBuilder.equal(root.get("workspaceId"),
                    AuthTokenScopes.normalizeWorkspaceId(requestWorkspaceId)));
            if (StringUtils.hasText(status)) {
                andList.add(criteriaBuilder.equal(root.get("status"), status));
            }
            List<Predicate> orList = new ArrayList<>();
            for (Monitor monitor : monitors) {
                addJsonLikePredicate(orList, criteriaBuilder, root.get("labels"),
                        CommonConstants.LABEL_INSTANCE, monitor.getInstance());
                addJsonLikePredicate(orList, criteriaBuilder, root.get("labels"),
                        CommonConstants.LABEL_INSTANCE_NAME, monitor.getName());
                addTextLikePredicate(orList, criteriaBuilder, root.get("content"), monitor.getName());
                addTextLikePredicate(orList, criteriaBuilder, root.get("content"), monitor.getInstance());
            }
            if (orList.isEmpty()) {
                return criteriaBuilder.disjunction();
            }
            return criteriaBuilder.and(
                    criteriaBuilder.and(andList.toArray(new Predicate[0])),
                    criteriaBuilder.or(orList.toArray(new Predicate[0]))
            );
        };
    }

    private void addJsonLikePredicate(List<Predicate> predicates, CriteriaBuilder criteriaBuilder,
                                      Expression<String> expression, String key, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        String pattern = String.format("%%\"%s\":\"%s\"%%", key, escapeLike(value));
        predicates.add(criteriaBuilder.like(
                criteriaBuilder.lower(expression), pattern.toLowerCase(Locale.ROOT), '\\'));
    }

    private void addTextLikePredicate(List<Predicate> predicates, CriteriaBuilder criteriaBuilder,
                                      Expression<String> expression, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        predicates.add(criteriaBuilder.like(criteriaBuilder.lower(expression),
                "%" + escapeLike(value).toLowerCase(Locale.ROOT) + "%", '\\'));
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

}
