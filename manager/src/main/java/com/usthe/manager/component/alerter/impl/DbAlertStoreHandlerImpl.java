package com.usthe.manager.component.alerter.impl;

import com.usthe.alert.service.AlertService;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.util.CommonConstants;
import com.usthe.manager.component.alerter.AlertStoreHandler;
import com.usthe.manager.service.MonitorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 报警持久化 - 落地到数据库
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DbAlertStoreHandlerImpl implements AlertStoreHandler {
    private final MonitorService monitorService;
    private final AlertService alertService;

    @Override
    public void store(Alert alert) {
        // todo Using the cache does not directly manipulate the library    使用缓存不直接操作库
        Monitor monitor = monitorService.getMonitor(alert.getMonitorId());
        if (monitor == null) {
            log.warn("Dispatch alarm the monitorId: {} not existed, ignored.", alert.getMonitorId());
            return;
        }
        alert.setMonitorName(monitor.getName());
        if (monitor.getStatus() == CommonConstants.UN_MANAGE_CODE) {
            // When monitoring is not managed, ignore and silence its alarm messages
            // 当监控未管理时  忽略静默其告警信息
            return;
        }
        if (monitor.getStatus() == CommonConstants.AVAILABLE_CODE) {
            if (CommonConstants.AVAILABLE.equals(alert.getTarget())) {
                // Availability Alarm Need to change the monitoring status to unavailable
                // 可用性告警 需变更监控状态为不可用
                monitorService.updateMonitorStatus(monitor.getId(), CommonConstants.UN_AVAILABLE_CODE);
            } else if (CommonConstants.REACHABLE.equals(alert.getTarget())) {
                // Reachability alarm The monitoring status needs to be changed to unreachable
                // 可达性告警 需变更监控状态为不可达
                monitorService.updateMonitorStatus(monitor.getId(), CommonConstants.UN_REACHABLE_CODE);
            }
        } else {
            // If the alarm is restored, the monitoring state needs to be restored
            // 若是恢复告警 需对监控状态进行恢复
            if (alert.getStatus() == CommonConstants.ALERT_STATUS_CODE_RESTORED) {
                monitorService.updateMonitorStatus(alert.getMonitorId(), CommonConstants.AVAILABLE_CODE);
            }
        }
        // Alarm drop library  告警落库
        alertService.addAlert(alert);
    }
}
