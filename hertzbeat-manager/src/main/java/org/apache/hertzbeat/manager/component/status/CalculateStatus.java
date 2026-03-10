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

package org.apache.hertzbeat.manager.component.status;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import jakarta.persistence.criteria.Predicate;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.manager.config.StatusProperties;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.StatusPageComponentDao;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.apache.hertzbeat.manager.dao.StatusPageOrgDao;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

/**
 * calculate component status for status page
 */
@Component
@Slf4j
public class CalculateStatus implements DisposableBean {
    
    private static final int DEFAULT_CALCULATE_INTERVAL_TIME = 300;
    
    private final StatusPageOrgDao statusPageOrgDao;
    
    private final StatusPageComponentDao statusPageComponentDao;
    
    private final StatusPageHistoryDao statusPageHistoryDao;
    
    private final MonitorDao monitorDao;
    
    private final int intervals;

    private final ScheduledExecutorService calculateScheduler;

    private final ScheduledExecutorService combineHistoryScheduler;

    private final ExecutorService calculateExecutor;

    private final ExecutorService combineHistoryExecutor;

    private final ScheduledDispatchTask calculateTask;

    private final ScheduledDispatchTask combineHistoryTask;

    public CalculateStatus(StatusPageOrgDao statusPageOrgDao, StatusPageComponentDao statusPageComponentDao,
                           StatusProperties statusProperties, StatusPageHistoryDao statusPageHistoryDao,
                           MonitorDao monitorDao) {
        this(statusPageOrgDao, statusPageComponentDao, statusProperties, statusPageHistoryDao, monitorDao,
                VirtualThreadProperties.defaults(), true);
    }

    @Autowired
    public CalculateStatus(StatusPageOrgDao statusPageOrgDao, StatusPageComponentDao statusPageComponentDao,
                           StatusProperties statusProperties, StatusPageHistoryDao statusPageHistoryDao,
                           MonitorDao monitorDao, VirtualThreadProperties virtualThreadProperties) {
        this(statusPageOrgDao, statusPageComponentDao, statusProperties, statusPageHistoryDao, monitorDao,
                virtualThreadProperties, true);
    }

    CalculateStatus(StatusPageOrgDao statusPageOrgDao, StatusPageComponentDao statusPageComponentDao,
                    StatusProperties statusProperties, StatusPageHistoryDao statusPageHistoryDao,
                    MonitorDao monitorDao, VirtualThreadProperties virtualThreadProperties, boolean autoStart) {
        this.statusPageOrgDao = statusPageOrgDao;
        this.monitorDao = monitorDao;
        this.statusPageComponentDao = statusPageComponentDao;
        this.statusPageHistoryDao = statusPageHistoryDao;
        intervals = statusProperties.getCalculate() == null ? DEFAULT_CALCULATE_INTERVAL_TIME : statusProperties.getCalculate().getInterval();
        this.calculateScheduler = createScheduler("status-page-calculate-%d", "Status calculate has uncaughtException.");
        this.combineHistoryScheduler = createScheduler("status-page-history-%d", "History combine has uncaughtException.");
        this.calculateExecutor = createVirtualExecutor(virtualThreadProperties, "status-page-calculate-vt-",
                "Status calculate worker has uncaughtException.");
        this.combineHistoryExecutor = createVirtualExecutor(virtualThreadProperties, "status-page-history-vt-",
                "History combine worker has uncaughtException.");
        this.calculateTask = new ScheduledDispatchTask(calculateExecutor, this::runCalculate);
        this.combineHistoryTask = new ScheduledDispatchTask(combineHistoryExecutor, this::runCombineHistory);
        if (autoStart) {
            startCalculate();
            startCombineHistory();
        }
    }

    private void startCalculate() {
        calculateScheduler.scheduleAtFixedRate(this::dispatchCalculate, 5, intervals, TimeUnit.SECONDS);
    }

    private void startCombineHistory() {
        // combine history every day at 1:00 AM
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nextRun = now.withHour(1).withMinute(0).withSecond(0);
        if (now.isAfter(nextRun)) {
            nextRun = nextRun.plusDays(1);
        }
        long delay = Duration.between(now, nextRun).toMillis();
        combineHistoryScheduler.scheduleAtFixedRate(this::dispatchCombineHistory, delay,
                TimeUnit.DAYS.toMillis(1), TimeUnit.MILLISECONDS);
    }

    /**
     * get calculate status intervals
     * @return intervals
     */
    public int getCalculateStatusIntervals() {
        return intervals;
    }

    void dispatchCalculate() {
        calculateTask.dispatch();
    }

    void dispatchCombineHistory() {
        combineHistoryTask.dispatch();
    }

    @Override
    public void destroy() {
        calculateScheduler.shutdownNow();
        combineHistoryScheduler.shutdownNow();
        if (calculateExecutor != null) {
            calculateExecutor.shutdownNow();
        }
        if (combineHistoryExecutor != null) {
            combineHistoryExecutor.shutdownNow();
        }
    }

    private void runCalculate() {
        log.info("start to calculate status page state");
        try {
            // calculate component state from tag bind monitors status
            List<StatusPageOrg> statusPageOrgList = statusPageOrgDao.findAll();
            for (StatusPageOrg statusPageOrg : statusPageOrgList) {
                long orgId = statusPageOrg.getId();
                List<StatusPageComponent> pageComponentList = statusPageComponentDao.findByOrgId(orgId);
                Set<Byte> stateSet = new HashSet<>(8);
                for (StatusPageComponent component : pageComponentList) {
                    byte state;
                    if (component.getMethod() == CommonConstants.STATUS_PAGE_CALCULATE_METHOD_MANUAL) {
                        state = component.getConfigState();
                    } else {
                        Map<String, String> labels = component.getLabels();
                        if (labels == null || labels.isEmpty()) {
                            continue;
                        }
                        Specification<Monitor> specification = (root, query, criteriaBuilder) -> {
                            List<Predicate> predicates = new ArrayList<>();
                            // create every label condition
                            labels.forEach((key, value) -> {
                                String pattern = String.format("%%\"%s\":\"%s\"%%", key, value);
                                predicates.add(criteriaBuilder.like(root.get("labels"), pattern));
                            });

                            // use or connect them
                            return criteriaBuilder.or(predicates.toArray(new Predicate[0]));
                        };
                        List<Monitor> monitorList = monitorDao.findAll(specification);
                        state = CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN;
                        for (Monitor monitor : monitorList) {
                            if (monitor.getStatus() == CommonConstants.MONITOR_DOWN_CODE) {
                                state = CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL;
                                break;
                            } else if (monitor.getStatus() == CommonConstants.MONITOR_UP_CODE) {
                                state = CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL;
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
    }

    private void runCombineHistory() {
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
                statusPageHistory.setUnknowing(0);
                if (statusPageHistoryMap.containsKey(statusPageHistory.getComponentId())) {
                    StatusPageHistory history = statusPageHistoryMap.get(statusPageHistory.getComponentId());
                    if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                        history.setAbnormal(history.getAbnormal() + intervals);
                    } else if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                        history.setUnknowing(history.getUnknowing() + intervals);
                    } else {
                        history.setNormal(history.getNormal() + intervals);
                    }
                    statusPageHistoryMap.put(statusPageHistory.getComponentId(), history);
                } else {
                    if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                        statusPageHistory.setAbnormal(intervals);
                    } else if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                        statusPageHistory.setUnknowing(intervals);
                    } else {
                        statusPageHistory.setNormal(intervals);
                    }
                    statusPageHistoryMap.put(statusPageHistory.getComponentId(), statusPageHistory);
                }
            }
            statusPageHistoryDao.deleteAll(statusPageHistoryList);
            for (StatusPageHistory history : statusPageHistoryMap.values()) {
                double total = history.getNormal() + history.getAbnormal() + history.getUnknowing();
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
    }

    private ScheduledExecutorService createScheduler(String threadNameFormat, String errorMessage) {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error(errorMessage);
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat(threadNameFormat)
                .build();
        return Executors.newSingleThreadScheduledExecutor(threadFactory);
    }

    private ExecutorService createVirtualExecutor(VirtualThreadProperties virtualThreadProperties, String threadPrefix,
                                                  String errorMessage) {
        VirtualThreadProperties properties =
                virtualThreadProperties == null ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        if (!properties.enabled()) {
            return null;
        }
        return Executors.newThreadPerTaskExecutor(Thread.ofVirtual()
                .name(threadPrefix, 0)
                .uncaughtExceptionHandler((thread, throwable) -> {
                    log.error(errorMessage);
                    log.error(throwable.getMessage(), throwable);
                })
                .factory());
    }

    private static final class ScheduledDispatchTask {

        private final ExecutorService executorService;
        private final Runnable task;
        private final Object lock = new Object();
        private boolean running;
        private int pendingRuns;

        private ScheduledDispatchTask(ExecutorService executorService, Runnable task) {
            this.executorService = executorService;
            this.task = task;
        }

        private void dispatch() {
            if (executorService == null) {
                task.run();
                return;
            }
            synchronized (lock) {
                if (running) {
                    pendingRuns++;
                    return;
                }
                running = true;
            }
            submit();
        }

        private void submit() {
            boolean submitted = false;
            try {
                executorService.execute(() -> {
                    try {
                        task.run();
                    } finally {
                        onComplete();
                    }
                });
                submitted = true;
            } finally {
                if (!submitted) {
                    synchronized (lock) {
                        running = false;
                        pendingRuns = 0;
                    }
                }
            }
        }

        private void onComplete() {
            boolean shouldRunAgain;
            synchronized (lock) {
                if (pendingRuns > 0) {
                    pendingRuns--;
                    shouldRunAgain = true;
                } else {
                    running = false;
                    shouldRunAgain = false;
                }
            }
            if (shouldRunAgain) {
                submit();
            }
        }
    }
}
