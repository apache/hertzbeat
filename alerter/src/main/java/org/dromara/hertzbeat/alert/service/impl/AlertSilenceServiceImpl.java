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
import org.dromara.hertzbeat.alert.dao.AlertSilenceDao;
import org.dromara.hertzbeat.alert.service.AlertSilenceService;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.CommonCacheService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Set;

/**
 * management interface service implement for alert silence
 *
 * @author tom
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
        // 兜底策略, 如果周期性情况下设置的告警静默选择日期为空, 视为全部勾选
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
    public Page<AlertSilence> getAlertSilences(Specification<AlertSilence> specification, PageRequest pageRequest) {
        return alertSilenceDao.findAll(specification, pageRequest);
    }

    private void clearAlertSilencesCache() {
        CommonCacheService<String, Object> silenceCache = CacheFactory.getAlertSilenceCache();
        silenceCache.remove(CommonConstants.CACHE_ALERT_SILENCE);
    }
}
