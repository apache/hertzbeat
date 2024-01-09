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

import com.googlecode.aviator.AviatorEvaluator;
import org.dromara.hertzbeat.alert.dao.AlertDefineBindDao;
import org.dromara.hertzbeat.alert.dao.AlertDefineDao;
import org.dromara.hertzbeat.common.entity.alerter.AlertDefine;
import org.dromara.hertzbeat.common.entity.alerter.AlertDefineMonitorBind;
import org.dromara.hertzbeat.alert.service.AlertDefineService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Alarm definition management interface implementation
 * @author tom
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertDefineServiceImpl implements AlertDefineService {

    @Autowired
    private AlertDefineDao alertDefineDao;

    @Autowired
    private AlertDefineBindDao alertDefineBindDao;

    @Override
    public void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException {
        // todo
        if (StringUtils.hasText(alertDefine.getExpr())) {
            try {
                AviatorEvaluator.compile(alertDefine.getExpr(), false);
            } catch (Exception e) {
                throw new IllegalArgumentException("alert expr error: " + e.getMessage());
            }
        }
    }

    @Override
    public void addAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefineDao.save(alertDefine);
    }

    @Override
    public void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefineDao.save(alertDefine);
    }

    @Override
    public void deleteAlertDefine(long alertId) throws RuntimeException {
        alertDefineDao.deleteById(alertId);
    }

    @Override
    public AlertDefine getAlertDefine(long alertId) throws RuntimeException {
        Optional<AlertDefine> optional = alertDefineDao.findById(alertId);
        return optional.orElse(null);
    }

    @Override
    public void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException {
        alertDefineDao.deleteAlertDefinesByIdIn(alertIds);
    }

    @Override
    public Page<AlertDefine> getMonitorBindAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest) {
        return alertDefineDao.findAll(specification, pageRequest);
    }

    @Override
    public void applyBindAlertDefineMonitors(Long alertId, List<AlertDefineMonitorBind> alertDefineBinds) {
        // todo checks whether the alarm definition and monitoring exist
        // todo 校验此告警定义和监控是否存在

        // Delete all associations of this alarm
        alertDefineBindDao.deleteAlertDefineBindsByAlertDefineIdEquals(alertId);
        // Save the associated
        alertDefineBindDao.saveAll(alertDefineBinds);
    }

    @Override
    public Map<String, List<AlertDefine>> getMonitorBindAlertDefines(long monitorId, String app, String metrics) {
        List<AlertDefine> defines = alertDefineDao.queryAlertDefinesByMonitor(monitorId, app, metrics);
        List<AlertDefine> defaultDefines = alertDefineDao.queryAlertDefinesByAppAndMetricAndPresetTrueAndEnableTrue(app, metrics);
        defines.addAll(defaultDefines);
        Set<AlertDefine> defineSet = defines.stream().filter(item -> item.getField() != null).collect(Collectors.toSet());
        // The alarm thresholds are defined in ascending order of the alarm severity from 0 to 3. The lower the number, the higher the alarm is. That is, the alarm is calculated from the highest alarm threshold
        // 将告警阈值定义从告警级别0-3数字升序排序，数字越小告警基本越高，即从最高的告警阈值开始匹配计算
        return defineSet.stream().sorted(Comparator.comparing(AlertDefine::getPriority))
                .collect(Collectors.groupingBy(AlertDefine::getField));
    }

    @Override
    public AlertDefine getMonitorBindAlertAvaDefine(long monitorId, String app, String metrics) {
        List<AlertDefine> defines = alertDefineDao.queryAlertDefinesByMonitor(monitorId, app, metrics);
        List<AlertDefine> defaultDefines = alertDefineDao.queryAlertDefinesByAppAndMetricAndPresetTrueAndEnableTrue(app, metrics);
        defines.addAll(defaultDefines);
        return defines.stream().findFirst().orElse(null);
    }

    @Override
    public Page<AlertDefine> getAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest) {
        return alertDefineDao.findAll(specification, pageRequest);
    }

    @Override
    public List<AlertDefineMonitorBind> getBindAlertDefineMonitors(long alertDefineId) {
        return alertDefineBindDao.getAlertDefineBindsByAlertDefineIdEquals(alertDefineId);
    }
}
