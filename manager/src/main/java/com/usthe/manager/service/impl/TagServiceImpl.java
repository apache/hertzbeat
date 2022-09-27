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

package com.usthe.manager.service.impl;

import com.usthe.common.entity.manager.MonitorTag;
import com.usthe.manager.dao.TagDao;
import com.usthe.manager.service.TagService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

/**
 * @author tom
 * @date 2022/5/1 13:53
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class TagServiceImpl implements TagService {

    @Autowired
    private TagDao tagDao;

    @Override
    public void addTags(List<MonitorTag> monitorTags) {
        tagDao.saveAll(monitorTags);
    }

    @Override
    public void modifyTag(MonitorTag monitorTag) {
        Optional<MonitorTag> tagOptional = tagDao.findById(monitorTag.getId());
        if (tagOptional.isPresent()) {
            tagDao.save(monitorTag);
        } else {
            throw new IllegalArgumentException("The monitorTag is not existed");
        }
    }

    @Override
    public Page<MonitorTag> getTags(Specification<MonitorTag> specification, PageRequest pageRequest) {
        return tagDao.findAll(specification, pageRequest);
    }

    @Override
    public void deleteTags(HashSet<Long> ids) {
        tagDao.deleteTagsByIdIn(ids);
    }
}
