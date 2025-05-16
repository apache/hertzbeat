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

package org.apache.hertzbeat.manager.service.impl;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.apache.hertzbeat.manager.dao.LabelDao;
import org.apache.hertzbeat.manager.service.LabelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Label service implementation.
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class LabelServiceImpl implements LabelService {

    @Autowired
    private LabelDao labelDao;

    @Override
    public void addLabel(Label label) {
        // Verify request data
        Optional<Label> optional = labelDao.findLabelByNameAndTagValue(label.getName(), label.getTagValue());
        if (optional.isPresent()) {
            throw new IllegalArgumentException("The label already exists.");
        }
        label.setType((byte) 1);
        label.setId(null);
        labelDao.save(label);
    }

    @Override
    public void modifyLabel(Label label) {
        Optional<Label> optional = labelDao.findById(label.getId());
        if (optional.isPresent()) {
            
            Optional<Label> existOptional = labelDao.findLabelByNameAndTagValue(label.getName(), label.getTagValue());
            if (existOptional.isPresent() && !existOptional.get().getId().equals(label.getId())) {
                throw new IllegalArgumentException("The label with same key and value already exists.");
            }
            label.setTagValue(StringUtils.isEmpty(label.getTagValue()) ? null : label.getTagValue());
            labelDao.save(label);
        } else {
            throw new IllegalArgumentException("The label is not existed");
        }
    }

    @Override
    public Page<Label> getLabels(String search, Byte type, int pageIndex, int pageSize) {
        Specification<Label> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (type != null) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("type"), type);
                andList.add(predicateApp);
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            List<Predicate> orList = new ArrayList<>();
            if (StringUtils.isNotBlank(search)) {
                Predicate predicateName = criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), "%" + search.toLowerCase() + "%");
                orList.add(predicateName);
                Predicate predicateValue = criteriaBuilder.like(criteriaBuilder.lower(root.get("tagValue")), "%" + search.toLowerCase() + "%");
                orList.add(predicateValue);
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
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize);
        return labelDao.findAll(specification, pageRequest);
    }

    @Override
    public void deleteLabels(HashSet<Long> ids) {
        if (CollectionUtils.isEmpty(ids)){
            return;
        }
        labelDao.deleteLabelsByIdIn(ids);
    }

    public List<Label> determineNewLabels(Set<Map.Entry<String, String>> originLabels){

        if (originLabels == null || originLabels.isEmpty()) return List.of();

        // Get all labels from the database
        Set<Map.Entry<String, String>> allLabels = labelDao.findAll().stream()
                .map(label -> Map.entry(label.getName(), label.getTagValue()))
                .collect(Collectors.toSet());

        // If the bound label (key:value) does not exist, then add it
        Set<Map.Entry<String, String>> addLabelsKv = originLabels.stream()
                .filter(label -> !allLabels.contains(label))
                .collect(Collectors.toCollection(HashSet::new));

        return addLabelsKv.stream().map(kv -> {
            Label label = new Label();
            label.setId(null);
            label.setName(kv.getKey());
            label.setTagValue(kv.getValue());
            label.setType((byte) 0);
            return label;
        }).toList();
    }
}
