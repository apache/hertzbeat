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

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.manager.dao.TagDao;
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

    @Override
    public void addTags(List<Tag> tags) {
        tagDao.saveAll(tags);
    }

    @Override
    public void modifyTag(Tag tag) {
        Optional<Tag> tagOptional = tagDao.findById(tag.getId());
        if (tagOptional.isPresent()) {
            tag.setTagValue(StringUtils.isEmpty(tag.getTagValue()) ? null : tag.getTagValue());
            tagDao.save(tag);
        } else {
            throw new IllegalArgumentException("The tag is not existed");
        }
    }

    @Override
    public Page<Tag> getTags(Specification<Tag> specification, PageRequest pageRequest) {
        return tagDao.findAll(specification, pageRequest);
    }

    @Override
    public void deleteTags(HashSet<Long> ids) {
        tagDao.deleteTagsByIdIn(ids);
    }

    @Override
    public List<Tag> listTag(Set<Long> ids) {
        return tagDao.findByIdIn(ids);
    }

    @Override
    public void deleteMonitorSystemTags(Monitor monitor) {
        if (CollectionUtils.isNotEmpty(monitor.getTags())) {
            List<Tag> tags = monitor.getTags().stream().filter(tag -> tag.getType() == (byte) 0).collect(Collectors.toList());
            tagDao.deleteAll(tags);
        }
    }

}
