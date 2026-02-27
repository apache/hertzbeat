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
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * management interface service implement for alert silence
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertSilenceServiceImpl implements AlertSilenceService {

    @Autowired
    private AlertSilenceDao alertSilenceDao;

    @Override
    public void validate(AlertSilence alertSilence, boolean isModify) throws IllegalArgumentException {
        // todo
        // if the alarm silent selection date set in periodic situations is empty, it will be deemed to be all checked.
        if (alertSilence.getType() == 1 && alertSilence.getDays() == null) {
            alertSilence.setDays(Arrays.asList((byte) 7, (byte) 1, (byte) 2, (byte) 3, (byte) 4, (byte) 5, (byte) 6));
        }
    }

    @Override
    public void addAlertSilence(AlertSilence alertSilence) throws RuntimeException {
        alertSilenceDao.save(alertSilence);
        clearAlertSilencesCache();
    }

    @Override
    public void modifyAlertSilence(AlertSilence alertSilence) throws RuntimeException {
        alertSilenceDao.save(alertSilence);
        clearAlertSilencesCache();
    }

    @Override
    public AlertSilence getAlertSilence(long silenceId) throws RuntimeException {
        return alertSilenceDao.findById(silenceId).orElse(null);
    }

    @Override
    public void deleteAlertSilences(Set<Long> silenceIds) throws RuntimeException {
        alertSilenceDao.deleteAlertSilencesByIdIn(silenceIds);
        clearAlertSilencesCache();
    }

    @Override
    public Page<AlertSilence> getAlertSilences(List<Long> silenceIds, String search, String sort, String order, int pageIndex, int pageSize) {
        Specification<AlertSilence> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (silenceIds != null && !silenceIds.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : silenceIds) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(search)) {
                Predicate predicate = criteriaBuilder.or(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")),
                                "%" + search.toLowerCase() + "%"
                        )
                );
                andList.add(predicate);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        return alertSilenceDao.findAll(specification, pageRequest);
    }

    private void clearAlertSilencesCache() {
        CacheFactory.clearAlertSilenceCache();
    }
}
