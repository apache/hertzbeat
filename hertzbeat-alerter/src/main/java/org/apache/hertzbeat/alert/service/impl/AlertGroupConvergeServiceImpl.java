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
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.alert.reduce.AlarmGroupReduce;
import org.apache.hertzbeat.alert.service.AlertGroupConvergeService;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * implement for alert converge service
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertGroupConvergeServiceImpl implements AlertGroupConvergeService {
    
    @Autowired
    private AlertGroupConvergeDao alertGroupConvergeDao;
    
    @Autowired
    private AlarmGroupReduce alarmGroupReduce;
 
    @Override
    public void validate(AlertGroupConverge alertGroupConverge, boolean isModify) throws IllegalArgumentException {
        // todo 
    }
    
    @Override
    public void addAlertGroupConverge(AlertGroupConverge alertGroupConverge) throws RuntimeException {
        alertGroupConvergeDao.save(alertGroupConverge);
        refreshAlertGroupConvergesCache();
    }
    
    @Override
    public void modifyAlertGroupConverge(AlertGroupConverge alertGroupConverge) throws RuntimeException {
        alertGroupConvergeDao.save(alertGroupConverge);
        refreshAlertGroupConvergesCache();
    }
    
    @Override
    public AlertGroupConverge getAlertGroupConverge(long convergeId) throws RuntimeException {
        return alertGroupConvergeDao.findById(convergeId).orElse(null);
    }
    
    @Override
    public void deleteAlertGroupConverges(Set<Long> convergeIds) throws RuntimeException {
        alertGroupConvergeDao.deleteAlertGroupConvergesByIdIn(convergeIds);
        refreshAlertGroupConvergesCache();
    }
    
    @Override
    public Page<AlertGroupConverge> getAlertGroupConverges(List<Long> convergeIds, String search, String sort, String order, int pageIndex, int pageSize) {
        Specification<AlertGroupConverge> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (convergeIds != null && !convergeIds.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : convergeIds) {
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
        return alertGroupConvergeDao.findAll(specification, pageRequest);
    }
    
    private void refreshAlertGroupConvergesCache() {
        List<AlertGroupConverge> alertGroupConverges = alertGroupConvergeDao.findAlertGroupConvergesByEnableIsTrue();
        alarmGroupReduce.refreshGroupDefines(alertGroupConverges);
    }
}
