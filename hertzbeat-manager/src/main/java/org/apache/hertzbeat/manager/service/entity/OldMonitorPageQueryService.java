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
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Query boundary for old monitor page filtering and sorting.
 */
@Service
public class OldMonitorPageQueryService {

    private static final byte ALL_MONITOR_STATUS = 9;

    private final MonitorDao monitorDao;

    public OldMonitorPageQueryService(MonitorDao monitorDao) {
        this.monitorDao = monitorDao;
    }

    public Page<Monitor> findMonitorPage(List<Long> monitorIds, String app, String search, Byte status, String sort,
            String order, int pageIndex, int pageSize, String labels) {
        Specification<Monitor> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (!CollectionUtils.isEmpty(monitorIds)) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : monitorIds) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(app)) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("app"), app);
                andList.add(predicateApp);
            }
            if (status != null && status >= 0 && status < ALL_MONITOR_STATUS) {
                Predicate predicateStatus = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicateStatus);
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            List<Predicate> orList = new ArrayList<>();
            if (StringUtils.hasText(search)) {
                Predicate predicateHost = criteriaBuilder.like(root.get("instance"), "%" + search + "%");
                Predicate predicateName = criteriaBuilder.like(criteriaBuilder.lower(root.get("name")),
                        "%" + search.toLowerCase() + "%");
                Long id = Longs.tryParse(search);
                if (id != null) {
                    orList.add(criteriaBuilder.equal(root.get("id"), id));
                }
                orList.add(predicateHost);
                orList.add(predicateName);
            }
            if (StringUtils.hasText(labels)) {
                String[] labelAres = labels.split(",");
                for (String label : labelAres) {
                    String[] labelArr = label.trim().split("[:=]", 2);
                    String labelName = labelArr[0].trim();
                    if (!StringUtils.hasText(labelName)) {
                        continue;
                    }
                    String labelValue = labelArr.length == 2 && StringUtils.hasText(labelArr[1])
                            ? labelArr[1].trim()
                            : null;
                    if (labelValue == null) {
                        orList.add(criteriaBuilder.like(root.get("labels"), "%" + labelName + "%"));
                    } else {
                        String pattern = String.format("%%\"%s\":\"%s\"%%", labelName, labelValue);
                        orList.add(criteriaBuilder.like(root.get("labels"), pattern));
                    }
                }
            }
            Predicate[] orPredicates = new Predicate[orList.size()];
            Predicate orPredicate = criteriaBuilder.or(orList.toArray(orPredicates));

            if (andPredicates.length == 0 && orPredicates.length == 0) {
                return query.where().getRestriction();
            } else if (andPredicates.length == 0) {
                return orPredicate;
            } else if (orPredicates.length == 0) {
                return andPredicate;
            } else {
                return query.where(andPredicate, orPredicate).getRestriction();
            }
        };
        String effectiveSort = (sort == null || sort.isEmpty()) ? "id" : sort;
        String effectiveOrder = (order == null || order.isEmpty()) ? "desc" : order;
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(effectiveOrder), effectiveSort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        return monitorDao.findAll(specification, pageRequest);
    }
}
