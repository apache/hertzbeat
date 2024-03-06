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

package org.dromara.hertzbeat.manager.component.status;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.*;
import org.dromara.hertzbeat.manager.config.StatusProperties;
import org.dromara.hertzbeat.manager.dao.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.ListJoin;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 * calculate component status for status page
 * @author tom
 */
@Component
@Slf4j
public class CalculateStatus {
    
    private static final int DEFAULT_CALCULATE_INTERVAL_TIME = 300;
    
    private final StatusPageOrgDao statusPageOrgDao;
    
    private final StatusPageComponentDao statusPageComponentDao;
    
    private final StatusPageHistoryDao statusPageHistoryDao;
    
    private final MonitorDao monitorDao;
    
    private final int intervals;

    public CalculateStatus(StatusPageOrgDao statusPageOrgDao, StatusPageComponentDao statusPageComponentDao,
                           StatusProperties statusProperties, StatusPageHistoryDao statusPageHistoryDao,
                           MonitorDao monitorDao) {
        this.statusPageOrgDao = statusPageOrgDao;
        this.monitorDao = monitorDao;
        this.statusPageComponentDao = statusPageComponentDao;
        this.statusPageHistoryDao = statusPageHistoryDao;
        intervals = statusProperties.getCalculate() == null ? DEFAULT_CALCULATE_INTERVAL_TIME : statusProperties.getCalculate().getInterval();
        startCalculate();
        startCombineHistory();
    }

    private void startCalculate() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Status calculate has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("status-page-calculate-%d")
                .build();
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor(threadFactory);
        scheduledExecutor.scheduleAtFixedRate(() -> {
            log.info("start to calculate status page state");
            try {
                // calculate component state from tag bind monitors status
                List<StatusPageOrg> statusPageOrgList = statusPageOrgDao.findAll();
                for (StatusPageOrg statusPageOrg : statusPageOrgList) {
                    long orgId = statusPageOrg.getId();
                    List<StatusPageComponent> pageComponentList = statusPageComponentDao.findByOrgId(orgId);
                    Set<Byte> stateSet = new HashSet<>(8);
                    for (StatusPageComponent component : pageComponentList) {
                        byte state = CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL;
                        if (component.getMethod() == CommonConstants.STATUS_PAGE_CALCULATE_METHOD_MANUAL) {
                            state = component.getConfigState();
                        } else {
                            TagItem tagItem = component.getTag();
                            if (tagItem != null) {
                                Specification<Monitor> specification = (root, query, criteriaBuilder) -> {
                                    List<Predicate> andList = new ArrayList<>();
                                    ListJoin<Monitor, Tag> tagJoin = root
                                            .join(root.getModel()
                                                    .getList("tags", Tag.class), JoinType.LEFT);
                                    if (StringUtils.hasText(tagItem.getValue())) {
                                        andList.add(criteriaBuilder.equal(tagJoin.get("name"), tagItem.getName()));
                                        andList.add(criteriaBuilder.equal(tagJoin.get("value"), tagItem.getValue()));
                                    } else {
                                        andList.add(criteriaBuilder.equal(tagJoin.get("name"), tagItem.getName()));
                                    }
                                    Predicate[] andPredicates = new Predicate[andList.size()];
                                    Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));
                                    return query.where(andPredicate).getRestriction();
                                };
                                List<Monitor> monitorList = monitorDao.findAll(specification);
                                state = CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN;
                                for (Monitor monitor : monitorList) {
                                    if (monitor.getStatus() == CommonConstants.UN_AVAILABLE_CODE) {
                                        state = CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL;
                                        break;
                                    } else if (monitor.getStatus() == CommonConstants.AVAILABLE_CODE) {
                                        state = CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL;
                                    }
                                }   
                            }
                        }
                        stateSet.add(state);
                        component.setState(state);
                        statusPageComponentDao.save(component);
                        // insert component state history
                        StatusPageHistory statusPageHistory = StatusPageHistory.builder()
                                .componentId(component.getId())
                                .state(state)
                                .timestamp(System.currentTimeMillis())
                                .build();
                        statusPageHistoryDao.save(statusPageHistory);
                    }
                    stateSet.remove(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN);
                    if (stateSet.remove(CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL)) {
                        if (stateSet.contains(CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL)) {
                            statusPageOrg.setState(CommonConstants.STATUS_PAGE_ORG_STATE_SOME_ABNORMAL);
                        } else {
                            statusPageOrg.setState(CommonConstants.STATUS_PAGE_ORG_STATE_ALL_ABNORMAL);
                        }
                    } else {
                        statusPageOrg.setState(CommonConstants.STATUS_PAGE_ORG_STATE_ALL_NORMAL);
                    }
                    statusPageOrg.setGmtUpdate(LocalDateTime.now());
                    statusPageOrgDao.save(statusPageOrg);
                }
            } catch (Exception e) {
                log.error("status page calculate component state error: {}", e.getMessage(), e);
            }
        }, 5, intervals, TimeUnit.SECONDS);
    }

    private void startCombineHistory() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("History combine has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("status-page-calculate-%d")
                .build();
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor(threadFactory);
        // combine history every day at 1:00 AM
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nextRun = now.withHour(1).withMinute(0).withSecond(0);
        if (now.isAfter(nextRun)) {
            nextRun = nextRun.plusDays(1);
        }
        long delay = Duration.between(now, nextRun).toMillis();
        scheduledExecutor.scheduleAtFixedRate(() -> {
            try {
                // combine pre day status history to one record
                LocalDateTime nowTime = LocalDateTime.now();
                ZoneOffset zoneOffset = ZoneId.systemDefault().getRules().getOffset(Instant.now());
                LocalDateTime midnight = nowTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
                LocalDateTime preNight = midnight.minusDays(1);
                long midnightTimestamp = midnight.toInstant(zoneOffset).toEpochMilli();
                long preNightTimestamp = preNight.toInstant(zoneOffset).toEpochMilli();
                List<StatusPageHistory> statusPageHistoryList = statusPageHistoryDao
                        .findStatusPageHistoriesByTimestampBetween(preNightTimestamp, midnightTimestamp);
                Map<Long, StatusPageHistory> statusPageHistoryMap = new HashMap<>(8);
                for (StatusPageHistory statusPageHistory : statusPageHistoryList) {
                    statusPageHistory.setNormal(0);
                    statusPageHistory.setAbnormal(0);
                    statusPageHistory.setUnknown(0);
                    if (statusPageHistoryMap.containsKey(statusPageHistory.getComponentId())) {
                        StatusPageHistory history = statusPageHistoryMap.get(statusPageHistory.getComponentId());
                        if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                            history.setAbnormal(history.getAbnormal() + intervals);
                        } else if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                            history.setUnknown(history.getUnknown() + intervals);
                        } else {
                            history.setNormal(history.getNormal() + intervals);
                        }
                        statusPageHistoryMap.put(statusPageHistory.getComponentId(), history);
                    } else {
                        if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                            statusPageHistory.setAbnormal(intervals);
                        } else if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                            statusPageHistory.setUnknown(intervals);
                        } else {
                            statusPageHistory.setNormal(intervals);
                        }
                        statusPageHistoryMap.put(statusPageHistory.getComponentId(), statusPageHistory);
                    }
                }
                statusPageHistoryDao.deleteAll(statusPageHistoryList);
                for (StatusPageHistory history : statusPageHistoryMap.values()) {
                    double total = history.getNormal() + history.getAbnormal() + history.getUnknown();
                    double uptime = 0;
                    if (total > 0) {
                        uptime = (double) history.getNormal() / total;
                    }
                    history.setUptime(uptime);
                    if (history.getAbnormal() > 0) {
                        history.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL);
                    } else if (history.getNormal() > 0) {
                        history.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL);
                    } else {
                        history.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN);
                    }
                    statusPageHistoryDao.save(history);
                }
            } catch (Exception e) {
                log.error("status page combine history error: {}", e.getMessage(), e);
            }
        }, delay, TimeUnit.DAYS.toMillis(1), TimeUnit.MILLISECONDS);
    }

    /**
     * get calculate status intervals
     * @return intervals
     */
    public int getCalculateStatusIntervals() {
        return intervals;
    }
}
