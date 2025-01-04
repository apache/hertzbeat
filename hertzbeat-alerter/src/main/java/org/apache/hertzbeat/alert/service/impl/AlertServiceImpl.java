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

import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.dto.CloudAlertReportAbstract;
import org.apache.hertzbeat.alert.enums.CloudServiceAlarmInformationEnum;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
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
    private GroupAlertDao groupAlertDao;
    
    @Autowired
    private SingleAlertDao singleAlertDao;
    
    @Autowired
    private AlarmCommonReduce alarmCommonReduce;

    @Override
    public Page<SingleAlert> getSingleAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize) {
        Specification<SingleAlert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (status != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicate);
            }
            if (search != null && !search.isEmpty()) {
                Predicate predicateContent = criteriaBuilder.like(root.get("content"), "%" + search + "%");
                andList.add(predicateContent);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        return singleAlertDao.findAll(specification, pageRequest);
    }

    @Override
    public Page<GroupAlert> getGroupAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize) {
        Specification<GroupAlert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (status != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicate);
            }
            if (search != null && !search.isEmpty()) {
                Predicate predicateContent = criteriaBuilder.like(root.get("content"), "%" + search + "%");
                andList.add(predicateContent);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<GroupAlert> groupAlertPage = groupAlertDao.findAll(specification, pageRequest);
        for (GroupAlert groupAlert : groupAlertPage.getContent()) {
            List<String> firingAlerts = groupAlert.getAlertFingerprints();
            List<SingleAlert> singleAlerts = singleAlertDao.findSingleAlertsByFingerprintIn(firingAlerts);
            groupAlert.setAlerts(singleAlerts);
        }
        return groupAlertPage;
    }

    @Override
    public void deleteGroupAlerts(HashSet<Long> ids) {
        groupAlertDao.deleteGroupAlertsByIdIn(ids);
    }

    @Override
    public void deleteSingleAlerts(HashSet<Long> ids) {
        singleAlertDao.deleteSingleAlertsByIdIn(ids);
    }

    @Override
    public void editGroupAlertStatus(String status, List<Long> ids) {
        groupAlertDao.updateGroupAlertsStatus(status, ids);
    }

    @Override
    public void editSingleAlertStatus(String status, List<Long> ids) {
        singleAlertDao.updateSingleAlertsStatus(status, ids);
    }
    

    @Override
    public AlertSummary getAlertsSummary() {
        AlertSummary alertSummary = new AlertSummary();
        // Statistics on the alarm information in the alarm state
        List<SingleAlert> firingAlerts = singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING);
        // severity - emergency critical warning info
        int emergencyNum = 0;
        int criticalNum = 0;
        int warningNum = 0;
        for (SingleAlert alert : firingAlerts) {
            String severity = alert.getLabels().get(CommonConstants.LABEL_ALERT_SEVERITY);
            if (severity != null) {
                switch (severity) {
                    case CommonConstants.ALERT_SEVERITY_EMERGENCY -> emergencyNum++;
                    case CommonConstants.ALERT_SEVERITY_CRITICAL -> criticalNum++;
                    case CommonConstants.ALERT_SEVERITY_WARNING -> warningNum++;
                    default -> {}
                }
            }
            alertSummary.setPriorityCriticalNum(criticalNum);
            alertSummary.setPriorityEmergencyNum(emergencyNum);
            alertSummary.setPriorityWarningNum(warningNum);
        }
        
        long total = singleAlertDao.count();
        alertSummary.setTotal(total);
        long resolved = total - firingAlerts.size();
        alertSummary.setDealNum(resolved);
        try {
            if (total == 0) {
                alertSummary.setRate(100);
            } else {
                float rate = BigDecimal.valueOf(100 * (float) resolved / total)
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
    public void addNewAlertReport(SingleAlert alert) {
        // todo add alarm information to the alarm center
        alarmCommonReduce.reduceAndSendAlarm(alert);
    }

    @Override
    public void addNewAlertReportFromCloud(String cloudServiceName, String alertReport) {
        CloudServiceAlarmInformationEnum cloudService = CloudServiceAlarmInformationEnum
                .getEnumFromCloudServiceName(cloudServiceName);

        SingleAlert alert = null;
        if (cloudService != null) {
            try {
                CloudAlertReportAbstract cloudAlertReport = JsonUtil
                        .fromJson(alertReport, cloudService.getCloudServiceAlarmInformationEntity());
                assert cloudAlertReport != null;
                Map<String, String> labels = cloudAlertReport.getLabels();
                labels.put("source", cloudServiceName);
                labels.put("alertname", cloudAlertReport.getAlertName());
                
                alert = SingleAlert.builder()
                        .content(cloudAlertReport.getContent())
                        .labels(labels)
                        .annotations(cloudAlertReport.getAnnotations())
                        .status("firing")
                        .activeAt(cloudAlertReport.getAlertTime())
                        .build();
            } catch (Exception e) {
                log.error("[alert report] parse cloud service alarm content failed! cloud service: {} conrent: {}",
                        cloudService.name(), alertReport);
            }
        }
        Optional.ofNullable(alert).ifPresent(this::addNewAlertReport);
    }
}
