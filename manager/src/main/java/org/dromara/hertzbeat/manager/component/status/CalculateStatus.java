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

import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.ListJoin;
import javax.persistence.criteria.Predicate;
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
        if(now.isAfter(nextRun)) {
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
                statusPageHistoryDao.deleteAllById(statusPageHistoryMap.keySet());
                for (StatusPageHistory history : statusPageHistoryMap.values()) {
                    double uptime = (double) history.getNormal() / (double) (history.getNormal() + history.getAbnormal() + history.getUnknown());
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
