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

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.component.status.CalculateStatus;
import org.apache.hertzbeat.manager.dao.StatusPageComponentDao;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentComponentBindDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentDao;
import org.apache.hertzbeat.manager.dao.StatusPageOrgDao;
import org.apache.hertzbeat.manager.pojo.dto.ComponentStatus;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * status page service implement.
 */
@Service
@RequiredArgsConstructor
public class StatusPageServiceImpl implements StatusPageService {

    private static final int HISTORY_SPAN_DAYS = 29;

    @Autowired
    private StatusPageOrgDao statusPageOrgDao;

    @Autowired
    private StatusPageComponentDao statusPageComponentDao;

    @Autowired
    private StatusPageHistoryDao statusPageHistoryDao;

    @Autowired
    private StatusPageIncidentDao statusPageIncidentDao;

    @Autowired
    private CalculateStatus calculateStatus;

    private final StatusPageIncidentComponentBindDao statusPageIncidentComponentBindDao;


    @Override
    public StatusPageOrg queryStatusPageOrg() {
        return statusPageOrgDao.findAll().stream().findFirst().orElse(null);
    }

    @Override
    public StatusPageOrg saveStatusPageOrg(StatusPageOrg statusPageOrg) {
        return statusPageOrgDao.save(statusPageOrg);
    }

    @Override
    public List<StatusPageComponent> queryStatusPageComponents() {
        return statusPageComponentDao.findAll();
    }

    @Override
    public void newStatusPageComponent(StatusPageComponent statusPageComponent) {
        if (statusPageComponent.getMethod() == CommonConstants.STATUS_PAGE_CALCULATE_METHOD_MANUAL) {
            statusPageComponent.setState(statusPageComponent.getConfigState());
        }
        statusPageComponentDao.save(statusPageComponent);
    }

    @Override
    public void updateStatusPageComponent(StatusPageComponent statusPageComponent) {
        if (statusPageComponent.getMethod() == CommonConstants.STATUS_PAGE_CALCULATE_METHOD_MANUAL) {
            statusPageComponent.setState(statusPageComponent.getConfigState());
        }
        statusPageComponentDao.save(statusPageComponent);
    }

    @Override
    public void deleteStatusPageComponent(long id) {
        long count = statusPageIncidentComponentBindDao.countByComponentId(id);
        if (count != 0) {
            throw new CommonException("The component is associated with an event and cannot be deleted. Please delete the event and try again!");
        }
        statusPageComponentDao.deleteById(id);
    }

    @Override
    public StatusPageComponent queryStatusPageComponent(long id) {
        return statusPageComponentDao.findById(id).orElse(null);
    }

    @Override
    public List<ComponentStatus> queryComponentsStatus() {
        List<StatusPageComponent> components = statusPageComponentDao.findAll();
        List<ComponentStatus> componentStatusList = new LinkedList<>();
        for (StatusPageComponent component : components) {
            ComponentStatus componentStatus = new ComponentStatus();
            componentStatus.setInfo(component);
            List<StatusPageHistory> histories = new LinkedList<>();
            // query today status
            LocalDateTime nowTime = LocalDateTime.now();
            LocalDateTime todayStartTime = nowTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
            ZoneOffset zoneOffset = ZoneId.systemDefault().getRules().getOffset(Instant.now());
            long nowTimestamp = nowTime.toInstant(zoneOffset).toEpochMilli();
            long todayStartTimestamp = todayStartTime.toInstant(zoneOffset).toEpochMilli();
            List<StatusPageHistory> todayStatusPageHistoryList = statusPageHistoryDao
                    .findStatusPageHistoriesByComponentIdAndTimestampBetween(component.getId(), todayStartTimestamp, nowTimestamp);
            StatusPageHistory todayStatus = combineOneDayStatusPageHistory(todayStatusPageHistoryList, component, nowTimestamp);
            histories.add(todayStatus);
            // query 30d component status history
            LocalDateTime preTime = todayStartTime.minusDays(HISTORY_SPAN_DAYS);
            long preTimestamp = preTime.toInstant(zoneOffset).toEpochMilli();
            List<StatusPageHistory> history = statusPageHistoryDao
                    .findStatusPageHistoriesByComponentIdAndTimestampBetween(component.getId(), preTimestamp, todayStartTimestamp);
            LinkedList<StatusPageHistory> historyList = new LinkedList<>(history);
            historyList.sort((o1, o2) -> (int) (o1.getTimestamp() - o2.getTimestamp()));
            LocalDateTime endTime = todayStartTime.minusSeconds(1);
            LocalDateTime startTime = endTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
            for (int index = 0; index < HISTORY_SPAN_DAYS; index++) {
                long startTimestamp = startTime.toInstant(zoneOffset).toEpochMilli();
                long endTimestamp = endTime.toInstant(zoneOffset).toEpochMilli();
                List<StatusPageHistory> thisDayHistory = historyList.stream().filter(item ->
                                item.getTimestamp() >= startTimestamp && item.getTimestamp() <= endTimestamp)
                        .collect(Collectors.toList());
                if (thisDayHistory.isEmpty()) {
                    StatusPageHistory statusPageHistory = StatusPageHistory.builder().timestamp(endTimestamp)
                            .componentId(component.getId()).state(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN).build();
                    histories.add(statusPageHistory);
                } else if (thisDayHistory.size() == 1) {
                    histories.add(thisDayHistory.get(0));
                } else {
                    StatusPageHistory statusPageHistory = combineOneDayStatusPageHistory(thisDayHistory, component, endTimestamp);
                    histories.add(statusPageHistory);
                    statusPageHistoryDao.deleteAll(thisDayHistory);
                    statusPageHistoryDao.save(statusPageHistory);
                }
                startTime = startTime.minusDays(1);
                endTime = endTime.minusDays(1);
            }
            componentStatus.setHistory(histories);
            componentStatusList.add(componentStatus);
        }
        return componentStatusList;
    }

    private StatusPageHistory combineOneDayStatusPageHistory(List<StatusPageHistory> statusPageHistories, StatusPageComponent component, long nowTimestamp) {
        if (statusPageHistories.isEmpty()) {
            return StatusPageHistory.builder().timestamp(nowTimestamp)
                    .normal(0).abnormal(0).unknowing(0).componentId(component.getId()).state(component.getState()).build();
        }
        if (statusPageHistories.size() == 1) {
            return statusPageHistories.get(0);
        }
        StatusPageHistory oldOne = statusPageHistories.get(0);
        StatusPageHistory todayStatus = StatusPageHistory.builder().timestamp(nowTimestamp)
                .normal(0).abnormal(0).unknowing(0).gmtCreate(oldOne.getGmtCreate()).gmtUpdate(oldOne.getGmtUpdate())
                .componentId(component.getId()).state(component.getState()).build();
        for (StatusPageHistory statusPageHistory : statusPageHistories) {
            if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                todayStatus.setAbnormal(todayStatus.getAbnormal() + calculateStatus.getCalculateStatusIntervals());
            } else if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                todayStatus.setUnknowing(todayStatus.getUnknowing() + calculateStatus.getCalculateStatusIntervals());
            } else {
                todayStatus.setNormal(todayStatus.getNormal() + calculateStatus.getCalculateStatusIntervals());
            }
        }
        double total = todayStatus.getNormal() + todayStatus.getAbnormal() + todayStatus.getUnknowing();
        double uptime = 0;
        if (total > 0) {
            uptime = (double) todayStatus.getNormal() / total;
        }
        todayStatus.setUptime(uptime);
        if (todayStatus.getAbnormal() > 0) {
            todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL);
        } else if (todayStatus.getNormal() > 0) {
            todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL);
        } else {
            todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN);
        }
        return todayStatus;
    }

    @Override
    public ComponentStatus queryComponentStatus(long id) {
        StatusPageComponent component = statusPageComponentDao.findById(id).orElseThrow(() -> new IllegalArgumentException("component not found"));
        ComponentStatus componentStatus = new ComponentStatus();
        componentStatus.setInfo(component);
        List<StatusPageHistory> histories = new LinkedList<>();
        // query today status
        LocalDateTime nowTime = LocalDateTime.now();
        LocalDateTime todayStartTime = nowTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
        ZoneOffset zoneOffset = ZoneId.systemDefault().getRules().getOffset(Instant.now());
        long nowTimestamp = nowTime.toInstant(zoneOffset).toEpochMilli();
        long todayStartTimestamp = todayStartTime.toInstant(zoneOffset).toEpochMilli();
        List<StatusPageHistory> todayStatusPageHistoryList = statusPageHistoryDao
                .findStatusPageHistoriesByComponentIdAndTimestampBetween(component.getId(), todayStartTimestamp, nowTimestamp);
        StatusPageHistory todayStatus = combineOneDayStatusPageHistory(todayStatusPageHistoryList, component, nowTimestamp);
        histories.add(todayStatus);
        // query 30d component status history
        LocalDateTime preTime = todayStartTime.minusDays(HISTORY_SPAN_DAYS);
        long preTimestamp = preTime.toInstant(zoneOffset).toEpochMilli();
        List<StatusPageHistory> history = statusPageHistoryDao
                .findStatusPageHistoriesByComponentIdAndTimestampBetween(component.getId(), preTimestamp, todayStartTimestamp);
        LinkedList<StatusPageHistory> historyList = new LinkedList<>(history);
        historyList.sort((o1, o2) -> (int) (o1.getTimestamp() - o2.getTimestamp()));
        LocalDateTime endTime = todayStartTime.minusSeconds(1);
        LocalDateTime startTime = endTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
        for (int index = 0; index < HISTORY_SPAN_DAYS; index++) {
            long startTimestamp = startTime.toInstant(zoneOffset).toEpochMilli();
            long endTimestamp = endTime.toInstant(zoneOffset).toEpochMilli();
            List<StatusPageHistory> thisDayHistory = historyList.stream().filter(item ->
                            item.getTimestamp() >= startTimestamp && item.getTimestamp() <= endTimestamp)
                    .collect(Collectors.toList());
            if (thisDayHistory.isEmpty()) {
                StatusPageHistory statusPageHistory = StatusPageHistory.builder().timestamp(endTimestamp)
                        .componentId(component.getId()).state(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN).build();
                histories.add(statusPageHistory);
            } else if (thisDayHistory.size() == 1) {
                histories.add(thisDayHistory.get(0));
            } else {
                StatusPageHistory statusPageHistory = combineOneDayStatusPageHistory(thisDayHistory, component, endTimestamp);
                histories.add(statusPageHistory);
                statusPageHistoryDao.deleteAll(thisDayHistory);
                statusPageHistoryDao.save(statusPageHistory);
            }
            startTime = startTime.minusDays(1);
            endTime = endTime.minusDays(1);
        }
        componentStatus.setHistory(histories);
        return componentStatus;
    }

    @Override
    public List<StatusPageIncident> queryStatusPageIncidents() {
        Sort sort = Sort.by(Sort.Direction.DESC, "startTime");
        return statusPageIncidentDao.findAll(sort);
    }

    @Override
    public StatusPageIncident queryStatusPageIncident(long id) {
        return statusPageIncidentDao.findById(id).orElse(null);
    }

    @Override
    public void newStatusPageIncident(StatusPageIncident statusPageIncident) {
        statusPageIncident.setStartTime(System.currentTimeMillis());
        if (statusPageIncident.getState() == CommonConstants.STATUS_PAGE_INCIDENT_STATE_RESOLVED) {
            statusPageIncident.setEndTime(System.currentTimeMillis());
        }
        statusPageIncidentDao.save(statusPageIncident);
    }

    @Override
    public void updateStatusPageIncident(StatusPageIncident statusPageIncident) {
        if (statusPageIncident.getState() == CommonConstants.STATUS_PAGE_INCIDENT_STATE_RESOLVED) {
            statusPageIncident.setEndTime(System.currentTimeMillis());
        }
        statusPageIncidentDao.save(statusPageIncident);
    }

    @Override
    public void deleteStatusPageIncident(long id) {
        statusPageIncidentDao.deleteById(id);
    }
}
