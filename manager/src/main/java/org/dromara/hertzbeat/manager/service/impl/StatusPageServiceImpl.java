package org.dromara.hertzbeat.manager.service.impl;

import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.StatusPageComponent;
import org.dromara.hertzbeat.common.entity.manager.StatusPageHistory;
import org.dromara.hertzbeat.common.entity.manager.StatusPageOrg;
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
    
    @Autowired
    private StatusPageOrgDao statusPageOrgDao;
    
    @Autowired
    private StatusPageComponentDao statusPageComponentDao;

    @Autowired
    private StatusPageHistoryDao statusPageHistoryDao;
    
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
            statusPageComponent.setCurrentState(statusPageComponent.getConfigState());
        }
        statusPageComponentDao.save(statusPageComponent);
    }

    @Override
    public void updateStatusPageComponent(StatusPageComponent statusPageComponent) {
        if (statusPageComponent.getMethod() == CommonConstants.STATUS_PAGE_CALCULATE_METHOD_MANUAL) {
            statusPageComponent.setCurrentState(statusPageComponent.getConfigState());
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
            // query 30d component status history
            LocalDateTime nowTime = LocalDateTime.now();
            LocalDateTime preTime = nowTime.minusDays(30);
            ZoneOffset zoneOffset = ZoneId.systemDefault().getRules().getOffset(Instant.now());
            long nowTimestamp = nowTime.toInstant(zoneOffset).toEpochMilli();
            long preTimestamp = preTime.toInstant(zoneOffset).toEpochMilli();
            List<StatusPageHistory> history = statusPageHistoryDao
                    .findStatusPageHistoriesByComponentIdAndTimestampBetween(component.getId(), preTimestamp, nowTimestamp);
            componentStatus.setHistory(history);
            componentStatusList.add(componentStatus);
        }
        return componentStatusList;
    }

    @Override
    public ComponentStatus queryComponentStatus(long id) {
        StatusPageComponent component = statusPageComponentDao.findById(id).orElseThrow(() -> new IllegalArgumentException("component not found"));
        ComponentStatus componentStatus = new ComponentStatus();
        componentStatus.setInfo(component);
        // query 30d component status history
        LocalDateTime nowTime = LocalDateTime.now();
        LocalDateTime preTime = nowTime.minusDays(30);
        ZoneOffset zoneOffset = ZoneId.systemDefault().getRules().getOffset(Instant.now());
        long nowTimestamp = nowTime.toInstant(zoneOffset).toEpochMilli();
        long preTimestamp = preTime.toInstant(zoneOffset).toEpochMilli();
        List<StatusPageHistory> history = statusPageHistoryDao
                .findStatusPageHistoriesByComponentIdAndTimestampBetween(id, preTimestamp, nowTimestamp);
        componentStatus.setHistory(history);
        return componentStatus;
    }
}
