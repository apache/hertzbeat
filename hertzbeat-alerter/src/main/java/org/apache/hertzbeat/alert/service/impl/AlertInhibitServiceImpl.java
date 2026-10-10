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

package org.apache.hertzbeat.alert.service.impl;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.dto.AlertInhibitDeleteResponse;
import org.apache.hertzbeat.alert.dto.AlertInhibitPageResponse;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.apache.hertzbeat.alert.dto.AlertInhibitResponse;
import org.apache.hertzbeat.alert.reduce.AlarmInhibitReduce;
import org.apache.hertzbeat.alert.service.AlertInhibitContractMapper;
import org.apache.hertzbeat.alert.service.AlertInhibitNotFoundException;
import org.apache.hertzbeat.alert.service.AlertInhibitOperationException;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * management interface service implement for alert inhibit
 */
@Service
@Transactional(rollbackFor = Exception.class)
public class AlertInhibitServiceImpl implements AlertInhibitService {

    private static final Set<String> SORT_FIELDS = Set.of("id", "name", "enable", "gmtCreate", "gmtUpdate");
    private static final int MAX_PAGE_SIZE = 100;

    private final AlertInhibitDao alertInhibitDao;
    private final AlarmInhibitReduce alarmInhibitReduce;
    private final AlertInhibitContractMapper mapper;

    public AlertInhibitServiceImpl(AlertInhibitDao alertInhibitDao, AlarmInhibitReduce alarmInhibitReduce,
                                   AlertInhibitContractMapper mapper) {
        this.alertInhibitDao = alertInhibitDao;
        this.alarmInhibitReduce = alarmInhibitReduce;
        this.mapper = mapper;
    }

    @Override
    public AlertInhibitResponse create(AlertInhibitRequest request) {
        AlertInhibit saved = alertInhibitDao.save(mapper.toNewEntity(request));
        if (saved == null || saved.getId() == null) {
            throw new AlertInhibitOperationException("Alert inhibit create did not return an identity");
        }
        AlertInhibit authoritative = alertInhibitDao.findById(saved.getId())
                .orElseThrow(() -> new AlertInhibitOperationException("Alert inhibit create did not converge"));
        refreshAlertInhibitsCache();
        return mapper.toResponse(authoritative);
    }

    @Override
    public AlertInhibitResponse update(AlertInhibitRequest request) {
        Long id = mapper.requirePositiveId(request == null ? null : request.getId());
        AlertInhibit existing = alertInhibitDao.findById(id).orElseThrow(AlertInhibitNotFoundException::new);
        alertInhibitDao.save(mapper.toExistingEntity(request, existing));
        AlertInhibit authoritative = alertInhibitDao.findById(id)
                .orElseThrow(() -> new AlertInhibitOperationException("Alert inhibit update did not converge"));
        refreshAlertInhibitsCache();
        return mapper.toResponse(authoritative);
    }

    @Override
    @Transactional(readOnly = true)
    public AlertInhibitResponse get(long inhibitId) {
        mapper.requirePositiveId(inhibitId);
        return alertInhibitDao.findById(inhibitId).map(mapper::toResponse)
                .orElseThrow(AlertInhibitNotFoundException::new);
    }

    @Override
    public AlertInhibitDeleteResponse delete(Set<Long> inhibitIds) {
        Set<Long> requested = validateIds(inhibitIds);
        Set<Long> existing = ids(alertInhibitDao.findAllById(requested));
        Set<Long> missing = new LinkedHashSet<>(requested);
        missing.removeAll(existing);
        if (!existing.isEmpty()) {
            alertInhibitDao.deleteAlertInhibitsByIdIn(existing);
        }
        Set<Long> remaining = ids(alertInhibitDao.findAllById(requested));
        if (!remaining.isEmpty()) {
            throw new AlertInhibitOperationException("Alert inhibit delete did not converge");
        }
        refreshAlertInhibitsCache();
        String status = existing.isEmpty() ? "missing" : missing.isEmpty() ? "deleted" : "partial";
        return new AlertInhibitDeleteResponse(status, Set.copyOf(existing), Set.copyOf(missing));
    }

    @Override
    @Transactional(readOnly = true)
    public AlertInhibitPageResponse list(List<Long> inhibitIds, String search, String sort, String order,
                                         int pageIndex, int pageSize) {
        List<Long> ids = inhibitIds == null ? null : List.copyOf(validateIds(new LinkedHashSet<>(inhibitIds)));
        String query = StringUtils.trimToNull(search);
        if (query != null && query.length() > 100) {
            throw new IllegalArgumentException("Alert inhibit search is too long");
        }
        if (!SORT_FIELDS.contains(sort) || !("asc".equalsIgnoreCase(order) || "desc".equalsIgnoreCase(order))) {
            throw new IllegalArgumentException("Alert inhibit sort is invalid");
        }
        if (pageIndex < 0 || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Alert inhibit page is invalid");
        }
        Page<AlertInhibit> page = alertInhibitDao.findAll(specification(ids, query),
                PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.fromString(order), sort)));
        List<AlertInhibitResponse> content = page.getContent().stream().map(mapper::toResponse).toList();
        return new AlertInhibitPageResponse(content, page.getTotalElements(), page.getTotalPages(),
                page.getNumber(), page.getSize());
    }

    private Specification<AlertInhibit> specification(List<Long> inhibitIds, String search) {
        Specification<AlertInhibit> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (inhibitIds != null && !inhibitIds.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : inhibitIds) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (search != null) {
                Predicate predicate = criteriaBuilder.or(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")),
                                "%" + search.toLowerCase(Locale.ROOT) + "%"
                        )
                );
                andList.add(predicate);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        return specification;
    }

    private Set<Long> validateIds(Set<Long> inhibitIds) {
        if (inhibitIds == null || inhibitIds.isEmpty()) {
            throw new IllegalArgumentException("Alert inhibit ids are required");
        }
        LinkedHashSet<Long> result = new LinkedHashSet<>();
        inhibitIds.forEach(id -> result.add(mapper.requirePositiveId(id)));
        return result;
    }

    private Set<Long> ids(Iterable<AlertInhibit> inhibits) {
        Set<Long> ids = new LinkedHashSet<>();
        inhibits.forEach(inhibit -> ids.add(inhibit.getId()));
        return ids;
    }

    private void refreshAlertInhibitsCache() {
        alarmInhibitReduce.refreshInhibitRules(alertInhibitDao.findAlertInhibitsByEnableIsTrue());
    }
}
