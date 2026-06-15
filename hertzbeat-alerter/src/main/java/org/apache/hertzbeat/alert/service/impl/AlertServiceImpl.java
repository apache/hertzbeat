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
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));
            List<Predicate> orList = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                Predicate predicateContent = criteriaBuilder.like(root.get("content"), "%" + search + "%");
                orList.add(predicateContent);
                Predicate predicateLabels = criteriaBuilder.like(root.get("labels"), "%" + search + "%");
                orList.add(predicateLabels);
                Predicate predicateAnnotation = criteriaBuilder.like(root.get("annotations"), "%" + search + "%");
                orList.add(predicateAnnotation);
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
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        return singleAlertDao.findAll(specification, pageRequest);
    }

    @Override
    public Page<GroupAlert> getGroupAlerts(String status, String search, String severity, String serviceName,
                                           String serviceNamespace, String environment, String sort, String order,
                                           int pageIndex, int pageSize) {
        Specification<GroupAlert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (status != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicate);
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));
            List<Predicate> orList = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                Predicate predicateContent = criteriaBuilder.like(root.get("groupLabels"), "%" + search + "%");
                orList.add(predicateContent);
                Predicate predicateLabels = criteriaBuilder.like(root.get("commonLabels"), "%" + search + "%");
                orList.add(predicateLabels);
                Predicate predicateAnnotation = criteriaBuilder.like(root.get("commonAnnotations"), "%" + search + "%");
                orList.add(predicateAnnotation);
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
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        String normalizedSeverity = normalizeSeverity(severity);
        String normalizedServiceName = normalizeScopeValue(serviceName);
        String normalizedServiceNamespace = normalizeScopeValue(serviceNamespace);
        String normalizedEnvironment = normalizeScopeValue(environment);
        boolean hasScopeFilter = normalizedServiceName != null || normalizedServiceNamespace != null || normalizedEnvironment != null;
        if (normalizedSeverity != null || hasScopeFilter) {
            List<GroupAlert> groupAlerts = groupAlertDao.findAll(specification, sortExp);
            List<GroupAlert> filteredAlerts = groupAlerts.stream()
                    .filter(groupAlert -> matchesAlertScope(groupAlert, normalizedServiceName, normalizedServiceNamespace, normalizedEnvironment))
                    .peek(groupAlert -> {
                        if (normalizedSeverity != null) {
                            hydrateGroupAlerts(groupAlert);
                        }
                    })
                    .filter(groupAlert -> normalizedSeverity == null
                            || groupAlert.getAlerts().stream().anyMatch(alert -> matchesSeverity(alert, normalizedSeverity)))
                    .toList();
            int start = Math.min((int) pageRequest.getOffset(), filteredAlerts.size());
            int end = Math.min(start + pageRequest.getPageSize(), filteredAlerts.size());
            List<GroupAlert> pageContent = filteredAlerts.subList(start, end);
            if (normalizedSeverity == null) {
                pageContent.forEach(this::hydrateGroupAlerts);
            }
            return new PageImpl<>(pageContent, pageRequest, filteredAlerts.size());
        }
        Page<GroupAlert> groupAlertPage = groupAlertDao.findAll(specification, pageRequest);
        groupAlertPage.getContent().forEach(this::hydrateGroupAlerts);
        return groupAlertPage;
    }

    @Override
    public void deleteGroupAlerts(HashSet<Long> ids) {
        List<GroupAlert> groupAlerts = groupAlertDao.findGroupAlertsByIdIn(ids);
        for (GroupAlert groupAlert : groupAlerts) {
            List<String> firingAlerts = groupAlert.getAlertFingerprints();
            singleAlertDao.deleteSingleAlertsByFingerprintIn(firingAlerts);
        }
        groupAlertDao.deleteGroupAlertsByIdIn(ids);
    }

    @Override
    public void deleteSingleAlerts(HashSet<Long> ids) {
        singleAlertDao.deleteSingleAlertsByIdIn(ids);
    }

    @Override
    public void editGroupAlertStatus(String status, List<Long> ids) {
        if (!StringUtils.hasText(status) || ids == null || ids.isEmpty()) {
            return;
        }
        List<GroupAlert> groupAlerts = groupAlertDao.findAllById(ids);
        if (groupAlerts.isEmpty()) {
            return;
        }
        long now = Instant.now().toEpochMilli();
        List<String> fingerprints = groupAlerts.stream()
                .map(GroupAlert::getAlertFingerprints)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .distinct()
                .toList();
        List<SingleAlert> singleAlerts = fingerprints.isEmpty()
                ? List.of()
                : singleAlertDao.findSingleAlertsByFingerprintIn(fingerprints);
        for (GroupAlert groupAlert : groupAlerts) {
            groupAlert.setStatus(status);
        }
        for (SingleAlert singleAlert : singleAlerts) {
            singleAlert.setStatus(status);
            if (CommonConstants.ALERT_STATUS_RESOLVED.equals(status)) {
                singleAlert.setActiveAt(null);
                singleAlert.setEndAt(now);
            } else {
                singleAlert.setEndAt(null);
                if (singleAlert.getActiveAt() == null) {
                    singleAlert.setActiveAt(now);
                }
            }
        }
        groupAlertDao.saveAll(groupAlerts);
        if (!singleAlerts.isEmpty()) {
            singleAlertDao.saveAll(singleAlerts);
        }
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

    private void hydrateGroupAlerts(GroupAlert groupAlert) {
        List<String> firingAlerts = groupAlert.getAlertFingerprints();
        List<SingleAlert> singleAlerts = new ArrayList<>(singleAlertDao.findSingleAlertsByFingerprintIn(firingAlerts));
        singleAlerts.sort(Comparator.comparing(SingleAlert::getGmtUpdate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(SingleAlert::getId, Comparator.nullsLast(Comparator.reverseOrder())));
        groupAlert.setAlerts(singleAlerts);
    }

    private String normalizeSeverity(String severity) {
        if (!StringUtils.hasText(severity)) {
            return null;
        }
        return severity.trim().toLowerCase();
    }

    private String normalizeScopeValue(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private boolean matchesAlertScope(GroupAlert groupAlert, String serviceName, String serviceNamespace, String environment) {
        return matchesAnyLabelValue(groupAlert, serviceName, "service.name", "service", "serviceName", "job", "instance")
                && matchesAnyLabelValue(groupAlert, serviceNamespace, "service.namespace", "serviceNamespace", "service_namespace")
                && matchesAnyLabelValue(groupAlert, environment, "deployment.environment.name", "environment", "deployment.environment");
    }

    private boolean matchesAnyLabelValue(GroupAlert groupAlert, String expected, String... labelKeys) {
        if (expected == null) {
            return true;
        }
        return matchesAnyLabelValue(groupAlert == null ? null : groupAlert.getCommonLabels(), expected, labelKeys)
                || matchesAnyLabelValue(groupAlert == null ? null : groupAlert.getGroupLabels(), expected, labelKeys);
    }

    private boolean matchesAnyLabelValue(Map<String, String> labels, String expected, String... labelKeys) {
        if (labels == null || labels.isEmpty()) {
            return false;
        }
        for (String labelKey : labelKeys) {
            String value = labels.get(labelKey);
            if (StringUtils.hasText(value) && expected.equals(value.trim())) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesSeverity(SingleAlert alert, String severity) {
        if (alert == null || severity == null) {
            return false;
        }
        String labelSeverity = alert.getLabels() == null ? null : alert.getLabels().get("severity");
        if (StringUtils.hasText(labelSeverity) && severity.equalsIgnoreCase(labelSeverity.trim())) {
            return true;
        }
        String annotationSeverity = alert.getAnnotations() == null ? null : alert.getAnnotations().get("severity");
        return StringUtils.hasText(annotationSeverity) && severity.equalsIgnoreCase(annotationSeverity.trim());
    }
}
