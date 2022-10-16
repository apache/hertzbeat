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

package com.usthe.alert.dao;

import com.usthe.alert.dto.AlertPriorityNum;
import com.usthe.common.entity.alerter.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

/**
 * Alert Database Operations Alert数据库表操作
 *
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDao extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    /**
     * Delete alerts based on ID list 根据ID列表删除告警
     *
     * @param alertIds Alert ID List  告警ID列表
     */
    void deleteAlertsByIdIn(Set<Long> alertIds);

    /**
     * Updates the alarm status based on the alarm ID-status value
     * 根据告警ID-状态值 更新告警状态
     *
     * @param status 状态值
     * @param ids    告警ID列表
     */
    @Modifying
    @Query("update Alert set status = :status where id in :ids")
    void updateAlertsStatus(@Param(value = "status") Byte status, @Param(value = "ids") List<Long> ids);

    /**
     * Query the number of unhandled alarms of each alarm severity
     * 查询各个告警级别的未处理告警数量
     *
     * @return Number of alerts 告警数量
     */
    @Query("select new com.usthe.alert.dto.AlertPriorityNum(mo.priority, count(mo.id)) from Alert mo where mo.status = 0 group by mo.priority")
    List<AlertPriorityNum> findAlertPriorityNum();
}
