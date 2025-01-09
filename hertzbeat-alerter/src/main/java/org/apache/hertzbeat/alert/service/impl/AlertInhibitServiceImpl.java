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
import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.reduce.AlarmInhibitReduce;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * management interface service implement for alert inhibit
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertInhibitServiceImpl implements AlertInhibitService {

    @Autowired
    private AlertInhibitDao alertInhibitDao;
    
    @Autowired
    private AlarmInhibitReduce alarmInhibitReduce;

    @Override
    public void validate(AlertInhibit alertInhibit, boolean isModify) throws IllegalArgumentException {
        // todo
    }

    @Override
    public void addAlertInhibit(AlertInhibit alertInhibit) throws RuntimeException {
        alertInhibitDao.save(alertInhibit);
        refreshAlertInhibitsCache();
    }

    @Override
    public void modifyAlertInhibit(AlertInhibit alertInhibit) throws RuntimeException {
        alertInhibitDao.save(alertInhibit);
        refreshAlertInhibitsCache();
    }

    @Override
    public AlertInhibit getAlertInhibit(long inhibitId) throws RuntimeException {
        return alertInhibitDao.findById(inhibitId).orElse(null);
    }

    @Override
    public void deleteAlertInhibits(Set<Long> inhibitIds) throws RuntimeException {
        alertInhibitDao.deleteAlertInhibitsByIdIn(inhibitIds);
        refreshAlertInhibitsCache();
    }

    @Override
    public Page<AlertInhibit> getAlertInhibits(List<Long> inhibitIds, String search, String sort, String order, int pageIndex, int pageSize) {
        Specification<AlertInhibit> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (inhibitIds != null && !inhibitIds.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : inhibitIds) {
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
        return alertInhibitDao.findAll(specification, pageRequest);
    }

    private void refreshAlertInhibitsCache() {
        alarmInhibitReduce.refreshInhibitRules(alertInhibitDao.findAlertInhibitsByEnableIsTrue());
    }
}
