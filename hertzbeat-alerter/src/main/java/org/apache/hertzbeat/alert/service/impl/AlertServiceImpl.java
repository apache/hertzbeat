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

package org.apache.hertzbeat.alert.service.impl;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertDao;
import org.apache.hertzbeat.alert.dto.AlertPriorityNum;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.dto.CloudAlertReportAbstract;
import org.apache.hertzbeat.alert.enums.CloudServiceAlarmInformationEnum;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.dto.AlertReport;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Realization of Alarm Information Service
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
    public Page<Alert> getAlerts(List<Long> alarmIds, Long monitorId, Byte priority, Byte status, String content, String sort, String order, int pageIndex, int pageSize) {
        Specification<Alert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();

            if (alarmIds != null && !alarmIds.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : alarmIds) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (monitorId != null) {
                Predicate predicate = criteriaBuilder.like(root.get("tags").as(String.class), "%" + monitorId + "%");
                andList.add(predicate);
            }
            if (priority != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("priority"), priority);
                andList.add(predicate);
            }
            if (status != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicate);
            }
            if (content != null && !content.isEmpty()) {
                Predicate predicateContent = criteriaBuilder.like(root.get("content"), "%" + content + "%");
                andList.add(predicateContent);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
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
                            .ALERT_PRIORITY_CODE_WARNING -> alertSummary.setPriorityWarningNum(priorityNum.getNum());
                    case CommonConstants.ALERT_PRIORITY_CODE_CRITICAL -> alertSummary.setPriorityCriticalNum(priorityNum.getNum());
                    case CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY -> alertSummary.setPriorityEmergencyNum(priorityNum.getNum());
                    default -> {}
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
    public void addNewAlertReportFromCloud(String cloudServiceName, String alertReport) {
        CloudServiceAlarmInformationEnum cloudService = CloudServiceAlarmInformationEnum
                .getEnumFromCloudServiceName(cloudServiceName);

        AlertReport alert = null;
        if (cloudService != null) {
            try {
                CloudAlertReportAbstract cloudAlertReport = JsonUtil
                        .fromJson(alertReport, cloudService.getCloudServiceAlarmInformationEntity());
                assert cloudAlertReport != null;
                alert = AlertReport.builder()
                        .content(cloudAlertReport.getContent())
                        .alertName(cloudAlertReport.getAlertName())
                        .alertTime(cloudAlertReport.getAlertTime())
                        .alertDuration(cloudAlertReport.getAlertDuration())
                        .priority(cloudAlertReport.getPriority())
                        .reportType(cloudAlertReport.getReportType())
                        .labels(cloudAlertReport.getLabels())
                        .annotations(cloudAlertReport.getAnnotations())
                        .build();
            } catch (Exception e) {
                log.error("[alert report] parse cloud service alarm content failed! cloud service: {} conrent: {}",
                        cloudService.name(), alertReport);
            }
        } else {
            alert = AlertReport.builder()
                    .content("error do not has cloud service api")
                    .alertName("/api/alerts/report/" + cloudServiceName)
                    .alertTime(Instant.now().getEpochSecond())
                    .priority(1)
                    .reportType(1)
                    .build();
        }
        Optional.ofNullable(alert).ifPresent(this::addNewAlertReport);
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
            annotations.forEach((k, v) -> finalSb.append(k).append(":").append(v).append("\n"));
        } else {
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
