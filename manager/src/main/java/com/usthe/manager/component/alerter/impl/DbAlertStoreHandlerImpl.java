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

import java.util.Map;

/**
 * 报警持久化 - 落地到数据库
 * Alarm data persistence - landing in the database
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
        // todo Using the cache does not directly manipulate the library
        Map<String, String> tags = alert.getTags();
        String monitorIdStr = tags.get(CommonConstants.TAG_MONITOR_ID);
        if (monitorIdStr == null) {
            log.error("alert tags monitorId is null.");
            return;
        }
        long monitorId = Long.parseLong(monitorIdStr);
        Monitor monitor = monitorService.getMonitor(monitorId);
        if (monitor == null) {
            log.warn("Dispatch alarm the monitorId: {} not existed, ignored.", monitorId);
            return;
        }
        if (monitor.getTags() != null) {
            monitor.getTags().forEach(item -> {
                tags.put(item.getName(), item.getValue());
            });
        }
        if (!tags.containsKey(CommonConstants.TAG_MONITOR_NAME)) {
            tags.put(CommonConstants.TAG_MONITOR_NAME, monitor.getName());
        }
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
                monitorService.updateMonitorStatus(monitorId, CommonConstants.AVAILABLE_CODE);
            }
        }
        // Alarm drop library  告警落库
        alertService.addAlert(alert);
    }
}
