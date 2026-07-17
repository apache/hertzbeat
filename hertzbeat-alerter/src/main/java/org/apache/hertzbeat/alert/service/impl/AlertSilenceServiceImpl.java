/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.dto.AlertSilenceDeleteResponse;
import org.apache.hertzbeat.alert.dto.AlertSilencePageResponse;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.apache.hertzbeat.alert.dto.AlertSilenceResponse;
import org.apache.hertzbeat.alert.service.AlertSilenceContractMapper;
import org.apache.hertzbeat.alert.service.AlertSilenceNotFoundException;
import org.apache.hertzbeat.alert.service.AlertSilenceOperationException;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Persistence implementation of the safe alert-silence CRUD contract. */
@Service
@Transactional(rollbackFor = Exception.class)
public class AlertSilenceServiceImpl implements AlertSilenceService {

    private static final Set<String> SORT_FIELDS = Set.of("id", "name", "enable", "type", "gmtCreate", "gmtUpdate");
    private static final int MAX_PAGE_SIZE = 100;

    private final AlertSilenceDao alertSilenceDao;
    private final AlertSilenceContractMapper mapper;

    public AlertSilenceServiceImpl(AlertSilenceDao alertSilenceDao, AlertSilenceContractMapper mapper) {
        this.alertSilenceDao = alertSilenceDao;
        this.mapper = mapper;
    }

    @Override
    public AlertSilenceResponse create(AlertSilenceRequest request) {
        AlertSilence saved = alertSilenceDao.save(mapper.toNewEntity(request));
        if (saved == null || saved.getId() == null) {
            throw new AlertSilenceOperationException("Alert silence create did not return an identity");
        }
        AlertSilence authoritative = alertSilenceDao.findById(saved.getId())
                .orElseThrow(() -> new AlertSilenceOperationException("Alert silence create did not converge"));
        clearAlertSilencesCache();
        return mapper.toResponse(authoritative);
    }

    @Override
    public AlertSilenceResponse update(AlertSilenceRequest request) {
        Long id = mapper.requirePositiveId(request.getId());
        AlertSilence existing = alertSilenceDao.findById(id).orElseThrow(AlertSilenceNotFoundException::new);
        alertSilenceDao.save(mapper.toExistingEntity(request, existing));
        AlertSilence authoritative = alertSilenceDao.findById(id)
                .orElseThrow(() -> new AlertSilenceOperationException("Alert silence update did not converge"));
        clearAlertSilencesCache();
        return mapper.toResponse(authoritative);
    }

    @Override
    @Transactional(readOnly = true)
    public AlertSilenceResponse get(long silenceId) {
        mapper.requirePositiveId(silenceId);
        return alertSilenceDao.findById(silenceId).map(mapper::toResponse)
                .orElseThrow(AlertSilenceNotFoundException::new);
    }

    @Override
    public AlertSilenceDeleteResponse delete(Set<Long> silenceIds) {
        Set<Long> requested = validateIds(silenceIds);
        Set<Long> existing = ids(alertSilenceDao.findAllById(requested));
        Set<Long> missing = new LinkedHashSet<>(requested);
        missing.removeAll(existing);
        if (!existing.isEmpty()) {
            alertSilenceDao.deleteAlertSilencesByIdIn(existing);
        }
        Set<Long> remaining = ids(alertSilenceDao.findAllById(requested));
        if (!remaining.isEmpty()) {
            throw new AlertSilenceOperationException("Alert silence delete did not converge");
        }
        clearAlertSilencesCache();
        String status = existing.isEmpty() ? "missing" : missing.isEmpty() ? "deleted" : "partial";
        return new AlertSilenceDeleteResponse(status, Set.copyOf(existing), Set.copyOf(missing));
    }

    @Override
    @Transactional(readOnly = true)
    public AlertSilencePageResponse list(List<Long> silenceIds, String search, String sort, String order,
                                         int pageIndex, int pageSize) {
        List<Long> ids = silenceIds == null ? null : List.copyOf(validateIds(new LinkedHashSet<>(silenceIds)));
        String query = StringUtils.trimToNull(search);
        if (query != null && query.length() > 100) {
            throw new IllegalArgumentException("Alert silence search is too long");
        }
        if (!SORT_FIELDS.contains(sort) || !("asc".equalsIgnoreCase(order) || "desc".equalsIgnoreCase(order))) {
            throw new IllegalArgumentException("Alert silence sort is invalid");
        }
        if (pageIndex < 0 || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Alert silence page is invalid");
        }
        Page<AlertSilence> page = alertSilenceDao.findAll(specification(ids, query),
                PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.fromString(order), sort)));
        List<AlertSilenceResponse> content = page.getContent().stream().map(mapper::toResponse).toList();
        return new AlertSilencePageResponse(content, page.getTotalElements(), page.getTotalPages(),
                page.getNumber(), page.getSize());
    }

    private Specification<AlertSilence> specification(List<Long> silenceIds, String search) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (silenceIds != null && !silenceIds.isEmpty()) {
                CriteriaBuilder.In<Long> idPredicate = criteriaBuilder.in(root.get("id"));
                silenceIds.forEach(idPredicate::value);
                predicates.add(idPredicate);
            }
            if (search != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")),
                        "%" + search.toLowerCase(Locale.ROOT) + "%"));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Set<Long> validateIds(Set<Long> silenceIds) {
        if (silenceIds == null || silenceIds.isEmpty()) {
            throw new IllegalArgumentException("Alert silence ids are required");
        }
        LinkedHashSet<Long> result = new LinkedHashSet<>();
        silenceIds.forEach(id -> result.add(mapper.requirePositiveId(id)));
        return result;
    }

    private Set<Long> ids(Iterable<AlertSilence> silences) {
        Set<Long> ids = new LinkedHashSet<>();
        silences.forEach(silence -> ids.add(silence.getId()));
        return ids;
    }

    private void clearAlertSilencesCache() {
        CacheFactory.clearAlertSilenceCache();
    }
}
