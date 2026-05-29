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
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
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

    private static final Set<String> ALERT_WORKSPACE_LABEL_KEYS = Set.of(
            "hertzbeat.workspace_id",
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
    );

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
        if (CollectionUtils.isEmpty(monitors)) {
            return Collections.emptyList();
        }
        int safeLimit = limit <= 0 ? 20 : limit;
        PageRequest pageRequest = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        return singleAlertDao.findAll(
                        buildAlertSpecification(monitors, CommonConstants.ALERT_STATUS_FIRING, requestWorkspaceId),
                        pageRequest)
                .getContent()
                .stream()
                .filter(alert -> matchesAlertRequestWorkspace(alert, requestWorkspaceId))
                .toList();
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
                        Sort.by(Sort.Direction.DESC, "gmtUpdate"))
                .stream()
                .filter(alert -> matchesAlertRequestWorkspace(alert, requestWorkspaceId))
                .toList();
    }

    private Specification<SingleAlert> buildAlertSpecification(List<Monitor> monitors, String status,
                                                               String requestWorkspaceId) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (StringUtils.hasText(status)) {
                andList.add(criteriaBuilder.equal(root.get("status"), status));
            }
            if (StringUtils.hasText(requestWorkspaceId)) {
                andList.add(buildAlertWorkspacePredicate(criteriaBuilder, root.get("labels"), requestWorkspaceId));
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
                return criteriaBuilder.and(andList.toArray(new Predicate[0]));
            }
            return criteriaBuilder.and(
                    criteriaBuilder.and(andList.toArray(new Predicate[0])),
                    criteriaBuilder.or(orList.toArray(new Predicate[0]))
            );
        };
    }

    private Predicate buildAlertWorkspacePredicate(CriteriaBuilder criteriaBuilder, Expression<String> labelsExpression,
                                                   String requestWorkspaceId) {
        Expression<String> normalizedLabels = criteriaBuilder.lower(labelsExpression);
        List<Predicate> workspaceMatches = new ArrayList<>();
        for (String key : ALERT_WORKSPACE_LABEL_KEYS) {
            workspaceMatches.add(criteriaBuilder.like(normalizedLabels, jsonKeyValueLikePattern(key, requestWorkspaceId)));
        }
        if (!AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(requestWorkspaceId)) {
            return criteriaBuilder.or(workspaceMatches.toArray(new Predicate[0]));
        }
        List<Predicate> workspaceKeyMissing = new ArrayList<>();
        for (String key : ALERT_WORKSPACE_LABEL_KEYS) {
            workspaceKeyMissing.add(criteriaBuilder.notLike(normalizedLabels, jsonKeyLikePattern(key)));
        }
        workspaceMatches.add(criteriaBuilder.isNull(labelsExpression));
        workspaceMatches.add(criteriaBuilder.and(workspaceKeyMissing.toArray(new Predicate[0])));
        return criteriaBuilder.or(workspaceMatches.toArray(new Predicate[0]));
    }

    private boolean matchesAlertRequestWorkspace(SingleAlert alert, String requestWorkspaceId) {
        if (!StringUtils.hasText(requestWorkspaceId)) {
            return true;
        }
        Map<String, String> labels = alert == null ? null : alert.getLabels();
        if (CollectionUtils.isEmpty(labels)) {
            return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(requestWorkspaceId);
        }
        for (String key : ALERT_WORKSPACE_LABEL_KEYS) {
            String workspaceId = trimToNull(labels.get(key));
            if (workspaceId != null) {
                return requestWorkspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(workspaceId));
            }
        }
        return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(requestWorkspaceId);
    }

    private String jsonKeyValueLikePattern(String key, String value) {
        return String.format("%%\"%s\":\"%s\"%%", key, value).toLowerCase(Locale.ROOT);
    }

    private String jsonKeyLikePattern(String key) {
        return String.format("%%\"%s\":%%", key).toLowerCase(Locale.ROOT);
    }

    private void addJsonLikePredicate(List<Predicate> predicates, CriteriaBuilder criteriaBuilder,
                                      Expression<String> expression, String key, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        String pattern = String.format("%%\"%s\":\"%s\"%%", key, value);
        predicates.add(criteriaBuilder.like(criteriaBuilder.lower(expression), pattern.toLowerCase(Locale.ROOT)));
    }

    private void addTextLikePredicate(List<Predicate> predicates, CriteriaBuilder criteriaBuilder,
                                      Expression<String> expression, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        predicates.add(criteriaBuilder.like(criteriaBuilder.lower(expression), "%" + value.toLowerCase(Locale.ROOT) + "%"));
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
