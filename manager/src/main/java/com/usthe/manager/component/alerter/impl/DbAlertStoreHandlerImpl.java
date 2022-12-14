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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 报警持久化 - 落地到数据库
 * Alarm data persistence - landing in the database
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @author <a href="mailto:1252532896@qq.com">Hua Cheng</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DbAlertStoreHandlerImpl implements AlertStoreHandler {

    private static Integer pageNum = 0;

    private static Integer pageSize = 20;

    private static String ORDER_TYPE = "desc";



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
            // 若是恢复告警 需对监控状态进行恢复，并将其这段时间的未处理告警置为已恢复
            if (alert.getStatus() == CommonConstants.ALERT_STATUS_CODE_RESTORED) {
                monitorService.updateMonitorStatus(monitorId, CommonConstants.AVAILABLE_CODE);
            }
        }
        // Alarm drop library  告警落库
        alertService.addAlert(alert);
    }

    @SuppressWarnings("InterruptedException")
    @Override
    public void updateAlertStatus(Alert alert) {
        Map<String, String> tags = alert.getTags();
        String monitorIdStr = tags.get(CommonConstants.TAG_MONITOR_ID);
        if (monitorIdStr == null) {
            log.error("alert tags monitorId is null.");
            return;
        }
        long monitorId = Long.parseLong(monitorIdStr);
        // If the alarm is recovered, set the unprocessed alarm in this period as recovered
        // 若是恢复告警 将其这段时间的未处理告警置为已恢复
        if (alert.getStatus() == CommonConstants.ALERT_STATUS_CODE_RESTORED) {
            // Find out the alarm information not processed before the current monitoring time
            // 找出改监控当前时间之前未处理的告警信息
            Specification<Alert> specification = (root, query, criteriaBuilder) -> {
                List<Predicate> andList = new ArrayList<>();

                andList.add(criteriaBuilder.equal(root.get("monitorId"), monitorId));
                andList.add(criteriaBuilder.equal(root.get("status"), CommonConstants.ALERT_STATUS_CODE_PENDING));
                andList.add(criteriaBuilder.lessThan(root.get("gmtCreate"),new Date()));
                Predicate[] predicates = new Predicate[andList.size()];
                return criteriaBuilder.and(andList.toArray(predicates));
            };
            Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(ORDER_TYPE), "gmtCreate"));
            PageRequest pageRequest = PageRequest.of(pageNum, pageSize, sortExp);
            while (true) {
                Page<Alert> alertPage = alertService.getAlerts(specification, pageRequest);
                List<Alert> alertList = alertPage.getContent();
                if (CollectionUtils.isEmpty(alertList)) {
                    return;
                }
                List<Long> idList = alertList.stream().map(Alert::getId).collect(Collectors.toList());
                alertService.editAlertStatus(CommonConstants.ALERT_STATUS_CODE_RESTORED,idList);
                try {
                    Thread.sleep(100L);
                } catch (InterruptedException e) {
                    //
                }
            }
        }
    }

}
