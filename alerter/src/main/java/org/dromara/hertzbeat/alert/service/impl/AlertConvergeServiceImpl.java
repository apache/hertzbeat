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

package org.dromara.hertzbeat.alert.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.dao.AlertConvergeDao;
import org.dromara.hertzbeat.alert.service.AlertConvergeService;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.CommonCacheService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * implement for alert converge service
 * @author tom
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertConvergeServiceImpl implements AlertConvergeService {
    
    @Autowired
    private AlertConvergeDao alertConvergeDao;    
 
    @Override
    public void validate(AlertConverge alertConverge, boolean isModify) throws IllegalArgumentException {
        // todo 
    }
    
    @Override
    public void addAlertConverge(AlertConverge alertConverge) throws RuntimeException {
        alertConvergeDao.save(alertConverge);
        clearAlertConvergesCache();
    }
    
    @Override
    public void modifyAlertConverge(AlertConverge alertConverge) throws RuntimeException {
        alertConvergeDao.save(alertConverge);
        clearAlertConvergesCache();
    }
    
    @Override
    public AlertConverge getAlertConverge(long convergeId) throws RuntimeException {
        return alertConvergeDao.findById(convergeId).orElse(null);
    }
    
    @Override
    public void deleteAlertConverges(Set<Long> convergeIds) throws RuntimeException {
        alertConvergeDao.deleteAlertConvergesByIdIn(convergeIds);
        clearAlertConvergesCache();
    }
    
    @Override
    public Page<AlertConverge> getAlertConverges(Specification<AlertConverge> specification, PageRequest pageRequest) {
        return alertConvergeDao.findAll(specification, pageRequest);
    }
    
    private void clearAlertConvergesCache() {
        CommonCacheService<String, Object> convergeCache = CacheFactory.getAlertConvergeCache();
        convergeCache.remove(CommonConstants.CACHE_ALERT_CONVERGE);
    }
}
