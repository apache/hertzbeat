package org.dromara.hertzbeat.manager.service.impl;

import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.StatusPageComponent;
import org.dromara.hertzbeat.common.entity.manager.StatusPageHistory;
import org.dromara.hertzbeat.common.entity.manager.StatusPageOrg;
import org.dromara.hertzbeat.manager.component.status.CalculateStatus;
import org.dromara.hertzbeat.manager.dao.StatusPageComponentDao;
import org.dromara.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.dromara.hertzbeat.manager.dao.StatusPageOrgDao;
import org.dromara.hertzbeat.manager.pojo.dto.ComponentStatus;
import org.dromara.hertzbeat.manager.service.StatusPageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedList;
import java.util.List;

/**
 * status page service implement.
 * @author tom
 */
@Service
public class StatusPageServiceImpl implements StatusPageService {
    
    private static final int HISTORY_SPAN_DAYS = 29;
    
    @Autowired
    private StatusPageOrgDao statusPageOrgDao;
    
    @Autowired
    private StatusPageComponentDao statusPageComponentDao;

    @Autowired
    private StatusPageHistoryDao statusPageHistoryDao;
    
    @Autowired
    private CalculateStatus calculateStatus;
    
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
            StatusPageHistory todayStatus = StatusPageHistory.builder().timestamp(nowTimestamp)
                    .normal(0).abnormal(0).unknown(0)
                    .componentId(component.getId()).state(component.getState()).build();
            for (StatusPageHistory statusPageHistory : todayStatusPageHistoryList) {
                if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                    todayStatus.setAbnormal(todayStatus.getAbnormal() + calculateStatus.getCalculateStatusIntervals());
                } else if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                    todayStatus.setUnknown(todayStatus.getUnknown() + calculateStatus.getCalculateStatusIntervals());
                } else {
                    todayStatus.setNormal(todayStatus.getNormal() + calculateStatus.getCalculateStatusIntervals());
                }
            }
            double uptime = (double) todayStatus.getNormal() / (double) (todayStatus.getNormal() + todayStatus.getAbnormal() + todayStatus.getUnknown());
            todayStatus.setUptime(uptime);
            if (todayStatus.getAbnormal() > 0) {
                todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL);
            } else if (todayStatus.getNormal() > 0) {
                todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL);
            } else {
                todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN);
            }
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
                if (!historyList.isEmpty() && historyList.peekFirst().getTimestamp() >= startTimestamp
                        && historyList.peekFirst().getTimestamp() <= endTimestamp) {
                    StatusPageHistory statusPageHistory = historyList.pop();
                    histories.add(statusPageHistory);
                } else {
                    StatusPageHistory statusPageHistory = StatusPageHistory.builder().timestamp(endTimestamp)
                            .componentId(component.getId()).state(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN).build();
                    histories.add(statusPageHistory);
                }
                startTime = startTime.minusDays(1);
                endTime = endTime.minusDays(1);
            }
            componentStatus.setHistory(histories);
            componentStatusList.add(componentStatus);
        }
        return componentStatusList;
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
        StatusPageHistory todayStatus = StatusPageHistory.builder().timestamp(nowTimestamp)
                .normal(0).abnormal(0).unknown(0)
                .componentId(component.getId()).state(component.getState()).build();
        for (StatusPageHistory statusPageHistory : todayStatusPageHistoryList) {
            if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                todayStatus.setAbnormal(todayStatus.getAbnormal() + calculateStatus.getCalculateStatusIntervals());
            } else if (statusPageHistory.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                todayStatus.setUnknown(todayStatus.getUnknown() + calculateStatus.getCalculateStatusIntervals());
            } else {
                todayStatus.setNormal(todayStatus.getNormal() + calculateStatus.getCalculateStatusIntervals());
            }
        }
        double uptime = (double) todayStatus.getNormal() / (double) (todayStatus.getNormal() + todayStatus.getAbnormal() + todayStatus.getUnknown());
        todayStatus.setUptime(uptime);
        if (todayStatus.getAbnormal() > 0) {
            todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL);
        } else if (todayStatus.getNormal() > 0) {
            todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL);
        } else {
            todayStatus.setState(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN);
        }
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
            if (!historyList.isEmpty() && historyList.peekFirst().getTimestamp() >= startTimestamp
                    && historyList.peekFirst().getTimestamp() <= endTimestamp) {
                StatusPageHistory statusPageHistory = historyList.pop();
                histories.add(statusPageHistory);
            } else {
                StatusPageHistory statusPageHistory = StatusPageHistory.builder().timestamp(endTimestamp)
                        .componentId(component.getId()).state(CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN).build();
                histories.add(statusPageHistory);
            }
            startTime = startTime.minusDays(1);
            endTime = endTime.minusDays(1);
        }
        componentStatus.setHistory(histories);
        return componentStatus;
    }
}
