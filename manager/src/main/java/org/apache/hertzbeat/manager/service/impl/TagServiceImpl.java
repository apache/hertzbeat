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
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.dao.TagDao;
import org.apache.hertzbeat.manager.dao.TagMonitorBindDao;
import org.apache.hertzbeat.manager.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tag service implementation.
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class TagServiceImpl implements TagService {

    @Autowired
    private TagDao tagDao;

    @Autowired
    private TagMonitorBindDao tagMonitorBindDao;

    @Override
    public void addTags(List<Tag> tags) {
        // Verify request data
        tags = tags.stream().peek(tag -> {
            Optional<Tag> tagOptional = tagDao.findTagByNameAndTagValue(tag.getName(), tag.getTagValue());
            if (tagOptional.isPresent()) {
                throw new IllegalArgumentException("The tag already exists.");
            }
            tag.setType((byte) 1);
            tag.setId(null);
        }).distinct().collect(Collectors.toList());
        tagDao.saveAll(tags);
    }

    @Override
    public void modifyTag(Tag tag) {
        Optional<Tag> tagOptional = tagDao.findById(tag.getId());
        if (tagOptional.isPresent()) {
            
            Optional<Tag> tagExistOptional = tagDao.findTagByNameAndTagValue(tag.getName(), tag.getTagValue());
            if (tagExistOptional.isPresent() && !tagExistOptional.get().getId().equals(tag.getId())) {
                throw new IllegalArgumentException("The tag with same key and value already exists.");
            }
            tag.setTagValue(StringUtils.isEmpty(tag.getTagValue()) ? null : tag.getTagValue());
            tagDao.save(tag);
        } else {
            throw new IllegalArgumentException("The tag is not existed");
        }
    }

    @Override
    public Page<Tag> getTags(String search, Byte type, int pageIndex, int pageSize) {
        // Get tag information
        Specification<Tag> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (type != null) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("type"), type);
                andList.add(predicateApp);
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            List<Predicate> orList = new ArrayList<>();
            if (StringUtils.isNotBlank(search)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + search + "%");
                orList.add(predicateName);
                Predicate predicateValue = criteriaBuilder.like(root.get("tagValue"), "%" + search + "%");
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
        return tagDao.findAll(specification, pageRequest);
    }

    @Override
    public void deleteTags(HashSet<Long> ids) {
        if (CollectionUtils.isEmpty(ids)){
            return;
        }
        if (tagMonitorBindDao.countByTagIdIn(ids) != 0) {
            throw new CommonException("The tag is in use and cannot be deleted.");
        }
        tagDao.deleteTagsByIdIn(ids);
    }

    @Override
    public List<Tag> listTag(Set<Long> ids) {
        return tagDao.findByIdIn(ids);
    }

    @Override
    public void deleteMonitorSystemTags(Monitor monitor) {
        if (CollectionUtils.isNotEmpty(monitor.getTags())) {
            List<Tag> tags = monitor.getTags().stream().filter(tag ->  Objects.nonNull(tag.getType()) && tag.getType() == (byte) 0).collect(Collectors.toList());
            tagDao.deleteAll(tags);
        }
    }

}
