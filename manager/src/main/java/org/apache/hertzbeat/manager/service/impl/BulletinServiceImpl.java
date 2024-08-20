/*
 *
 *  * Licensed to the Apache Software Foundation (ASF) under one or more
 *  * contributor license agreements.  See the NOTICE file distributed with
 *  * this work for additional information regarding copyright ownership.
 *  * The ASF licenses this file to You under the Apache License, Version 2.0
 *  * (the "License"); you may not use this file except in compliance with
 *  * the License.  You may obtain a copy of the License at
 *  *
 *  *     http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software
 *  * distributed under the License is distributed on an "AS IS" BASIS,
 *  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the License for the specific language governing permissions and
 *  * limitations under the License.
 *
 *
 */

package org.apache.hertzbeat.manager.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinDto;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinVo;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.dao.BulletinDao;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bulletin Service Implementation
 */

@Service
@Slf4j
public class BulletinServiceImpl implements BulletinService {

    @Autowired
    private BulletinDao bulletinDao;


    /**
     * validate Bulletin
     *
     * @param bulletinDto
     */
    @Override
    public void validate(BulletinDto bulletinDto) throws IllegalArgumentException {
        if (bulletinDto == null) {
            throw new IllegalArgumentException("Bulletin cannot be null");
        }
        if (bulletinDto.getApp() == null || bulletinDto.getApp().isEmpty()) {
            throw new IllegalArgumentException("Bulletin app cannot be null or empty");
        }
        if (bulletinDto.getMetrics() == null || bulletinDto.getMetrics().isEmpty()) {
            throw new IllegalArgumentException("Bulletin metrics cannot be null or empty");
        }
        if (bulletinDto.getFields() == null || bulletinDto.getFields().isEmpty()) {
            throw new IllegalArgumentException("Bulletin fields cannot be null or empty");
        }
        if (bulletinDto.getMonitorIds() == null || bulletinDto.getMonitorIds().isEmpty()) {
            throw new IllegalArgumentException("Bulletin monitorIds cannot be null or empty");
        }
    }


    /**
     * Pageable query Bulletin
     */
    @Override
    public Bulletin getBulletinByName(String name) {
        return bulletinDao.findByName(name);
    }

    /**
     * Get all names
     */
    @Override
    public List<String> getAllNames() {
        return bulletinDao.findAll().stream().map(Bulletin::getName).distinct().toList();
    }

    /**
     * Get metrics by name
     *
     * @param name
     */
    @Override
    public List<String> getMetricsByName(String name) {
        return bulletinDao.findByName(name).getMetrics();
    }

    /**
     * Save Bulletin
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveBulletin(Bulletin bulletin) {
        bulletinDao.save(bulletin);
    }

    /**
     * Add Bulletin
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addBulletin(BulletinDto bulletinDto) {
        try {
            Bulletin bulletin = new Bulletin();
            bulletin.setName(bulletinDto.getName());
            bulletin.setId(SnowFlakeIdGenerator.generateId());
            Map<String, List<String>> map = bulletinDto.getFields();
            Map<String, List<String>> sortedMap = new TreeMap<>(map);
            String fields = JsonUtil.toJson(sortedMap);
            bulletin.setFields(fields);
            bulletin.setMetrics(bulletinDto.getMetrics());
            bulletin.setMonitorIds(bulletinDto.getMonitorIds());
            bulletin.setApp(bulletinDto.getApp());
            bulletinDao.save(bulletin);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Dynamic conditional query
     *
     * @param specification Query conditions
     * @param pageRequest   Paging parameters
     * @return The query results
     */
    @Override
    public Page<BulletinVo> getBulletins(Specification<Bulletin> specification, PageRequest pageRequest) {
        List<BulletinVo> voList = new ArrayList<>();
        Page<Bulletin> bulletinPage = Page.empty(pageRequest);
        try {
            bulletinPage = bulletinDao.findAll(specification, pageRequest);
            voList = bulletinPage.stream().map(bulletin -> {
                BulletinVo vo = new BulletinVo();
                vo.setId(bulletin.getId());
                vo.setName(bulletin.getName());
                vo.setTags(bulletin.getTags());
                vo.setMetrics(bulletin.getMetrics());
                vo.setMonitorId(bulletin.getMonitorIds());
                vo.setApp(bulletin.getApp());
                return vo;
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to query bulletin: {}", e.getLocalizedMessage(), e);
        }
        long total = bulletinPage.getTotalElements();
        return new PageImpl<>(voList, pageRequest, total);
    }

    /**
     * Get Bulletin by id
     *
     */
    @Override
    public Optional<Bulletin> getBulletinById(Long id) {
        return bulletinDao.findById(id);
    }

    /**
     * delete Bulletin by names
     *
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteBulletinByName(List<String> names) {
        try {
            bulletinDao.deleteByNameIn(names);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
