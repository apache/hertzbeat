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

import org.dromara.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.dromara.hertzbeat.alert.dao.AlertDao;
import org.dromara.hertzbeat.alert.dto.AlertPriorityNum;
import org.dromara.hertzbeat.alert.dto.AlertSummary;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.alert.service.AlertService;
import org.dromara.hertzbeat.common.entity.dto.AlertReport;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/**
 * Realization of Alarm Information Service
 * @author tom
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertServiceImpl implements AlertService {

    @Autowired
    private AlertDao alertDao;
    
    @Autowired
    private AlarmCommonReduce alarmCommonReduce;

    @Override
    public void addAlert(Alert alert) throws RuntimeException {
        alertDao.save(alert);
    }

    @Override
    public Page<Alert> getAlerts(Specification<Alert> specification, PageRequest pageRequest) {
        return alertDao.findAll(specification, pageRequest);
    }

    @Override
    public void deleteAlerts(HashSet<Long> ids) {
        alertDao.deleteAlertsByIdIn(ids);
    }

    @Override
    public void clearAlerts() {
        alertDao.deleteAll();
    }

    @Override
    public void editAlertStatus(Byte status, List<Long> ids) {
        alertDao.updateAlertsStatus(status, ids);
    }

    @Override
    public AlertSummary getAlertsSummary() {
        AlertSummary alertSummary = new AlertSummary();
        // Statistics on the alarm information in the alarm state
        List<AlertPriorityNum> priorityNums = alertDao.findAlertPriorityNum();
        if (priorityNums != null) {
            for (AlertPriorityNum priorityNum : priorityNums) {
                switch (priorityNum.getPriority()) {
                    case CommonConstants
                            .ALERT_PRIORITY_CODE_WARNING:
                        alertSummary.setPriorityWarningNum(priorityNum.getNum());
                        break;
                    case CommonConstants.ALERT_PRIORITY_CODE_CRITICAL:
                        alertSummary.setPriorityCriticalNum(priorityNum.getNum());
                        break;
                    case CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY:
                        alertSummary.setPriorityEmergencyNum(priorityNum.getNum());
                        break;
                    default:
                        break;
                }
            }
        }
        long total = alertDao.count();
        alertSummary.setTotal(total);
        long dealNum = total - alertSummary.getPriorityCriticalNum()
                - alertSummary.getPriorityEmergencyNum() - alertSummary.getPriorityWarningNum();
        alertSummary.setDealNum(dealNum);
        try {
            if (total == 0) {
                alertSummary.setRate(100);
            } else {
                float rate = BigDecimal.valueOf(100 * (float) dealNum / total)
                        .setScale(2, RoundingMode.HALF_UP)
                        .floatValue();
                alertSummary.setRate(rate);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return alertSummary;
    }

    @Override
    public void addNewAlertReport(AlertReport alertReport) {
        alarmCommonReduce.reduceAndSendAlarm(buildAlertData(alertReport));
    }

    @Override
    public List<Alert> getAlerts(Specification<Alert> specification) {

        return alertDao.findAll(specification);
    }

    /**
     * The external alarm information is converted to Alert  
     * @param alertReport alarm body
     * @return Alert entity
     */
    private Alert buildAlertData(AlertReport alertReport){
        Map<String, String> annotations = alertReport.getAnnotations();
        StringBuilder sb = new StringBuilder();
        if (alertReport.getContent() == null || alertReport.getContent().length() <= 0){
            StringBuilder finalSb = sb;
            annotations.forEach((k, v) -> {
                finalSb.append(k).append(":").append(v).append("\n");
            });
        }else {
            sb = new StringBuilder(alertReport.getContent());
        }
        LocalDateTime dateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(alertReport.getAlertTime()), 
                ZoneId.systemDefault());
        return Alert.builder()
                .content("Alert Center\n" + sb)
                .priority(alertReport.getPriority().byteValue())
                .status(CommonConstants.ALERT_STATUS_CODE_PENDING)
                .tags(alertReport.getLabels())
                .target(alertReport.getAlertName())
                .triggerTimes(1)
                .firstAlarmTime(alertReport.getAlertTime())
                .lastAlarmTime(alertReport.getAlertTime())
                .gmtCreate(dateTime)
                .gmtUpdate(dateTime)
                .build();
    }



}
