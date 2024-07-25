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

package org.apache.hertzbeat.manager.component.alerter.impl;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.component.alerter.AlertStoreHandler;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.support.exception.IgnoreException;
import org.springframework.stereotype.Component;

/**
 * Alarm data persistence - landing in the database
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DbAlertStoreHandlerImpl implements AlertStoreHandler {

    private final MonitorService monitorService;

    private final AlertService alertService;

    @Override
    public void store(Alert alert) {
        Map<String, String> tags = alert.getTags();
        String monitorIdStr = tags != null ? tags.get(CommonConstants.TAG_MONITOR_ID) : null;
        if (monitorIdStr != null) {
            long monitorId = Long.parseLong(monitorIdStr);
            Monitor monitor = monitorService.getMonitor(monitorId);
            if (monitor == null) {
                log.warn("Dispatch alarm the monitorId: {} not existed, ignored. target: {}.", monitorId, alert.getTarget());
                return;
            }
            if (!tags.containsKey(CommonConstants.TAG_MONITOR_NAME)) {
                tags.put(CommonConstants.TAG_MONITOR_NAME, monitor.getName());
            }
            if (!tags.containsKey(CommonConstants.TAG_MONITOR_HOST)) {
                tags.put(CommonConstants.TAG_MONITOR_HOST, monitor.getHost());
            }
            if (monitor.getStatus() == CommonConstants.MONITOR_PAUSED_CODE) {
                // When monitoring is not monitored, ignore and silence its alarm messages
                return;
            }
            if (CommonConstants.AVAILABILITY.equals(alert.getTarget())) {
                if (alert.getStatus() == CommonConstants.ALERT_STATUS_CODE_PENDING && monitor.getStatus() == CommonConstants.MONITOR_UP_CODE) {
                    // Availability Alarm Need to change the monitoring status to unavailable
                    monitorService.updateMonitorStatus(monitor.getId(), CommonConstants.MONITOR_DOWN_CODE);
                } else if (alert.getStatus() == CommonConstants.ALERT_STATUS_CODE_RESTORED && monitor.getStatus() == CommonConstants.MONITOR_DOWN_CODE) {
                    // If the alarm is restored, the monitoring state needs to be restored
                    monitorService.updateMonitorStatus(monitorId, CommonConstants.MONITOR_UP_CODE);
                }
            }
        } else {
            log.debug("store extern alert content: {}.", alert);
        }
        if (tags != null && tags.containsKey(CommonConstants.IGNORE)) {
            throw new IgnoreException("Ignore this alarm.");
        }
        // Alarm store db
        alertService.addAlert(alert);
    }
}
