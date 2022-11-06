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

package com.usthe.alert.service;

import com.usthe.alert.dto.AlertSummary;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.dto.AlertReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.HashSet;
import java.util.List;

/**
 * Alarm information management interface
 * 告警信息管理接口
 *
 * @author tom
 * @date 2021/12/9 10:06
 */
public interface AlertService {

    /**
     * Add alarm record
     * 新增告警记录
     *
     * @param alert Alert entity    告警实体
     * @throws RuntimeException Add process exception throw     新增过程异常抛出
     */
    void addAlert(Alert alert) throws RuntimeException;

    /**
     * Dynamic conditional query
     * 动态条件查询
     *
     * @param specification Query conditions        查询条件
     * @param pageRequest   pagination parameters     分页参数
     * @return search result    查询结果
     */
    Page<Alert> getAlerts(Specification<Alert> specification, PageRequest pageRequest);

    /**
     * Delete alarms in batches according to the alarm ID list
     * 根据告警ID列表批量删除告警
     *
     * @param ids Alarm ID List  告警IDS
     */
    void deleteAlerts(HashSet<Long> ids);

    /**
     * Clear all alerts
     * 清空所有告警记录
     */
    void clearAlerts();

    /**
     * Update the alarm status according to the alarm ID-status value
     * 根据告警ID-状态值 更新告警状态
     *
     * @param status Alarm status to be modified    待修改为的告警状态
     * @param ids    Alarm ID  List to be modified          待修改的告警ID集合
     */
    void editAlertStatus(Byte status, List<Long> ids);

    /**
     * Get alarm statistics information 获取告警统计信息
     *
     * @return Alarm statistics information 告警统计
     */
    AlertSummary getAlertsSummary();

    /**
     * A third party reports an alarm  第三方 上报告警信息
     * @param alertReport The alarm information 告警信息
     */
    void addNewAlertReport(AlertReport alertReport);

}
