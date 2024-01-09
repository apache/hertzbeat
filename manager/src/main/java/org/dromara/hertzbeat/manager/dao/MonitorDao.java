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

package org.dromara.hertzbeat.manager.dao;

import org.dromara.hertzbeat.manager.pojo.dto.AppCount;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * AuthResources 数据库操作
 *
 * @author tomsun28
 *
 */
public interface MonitorDao extends JpaRepository<Monitor, Long>, JpaSpecificationExecutor<Monitor> {


    /**
     * Delete monitor based on monitor ID list
     * 根据监控任务ID列表删除监控
     *
     * @param monitorIds Monitoring ID List 监控任务ID列表
     */
    void deleteAllByIdIn(Set<Long> monitorIds);

    /**
     * Query monitoring based on monitoring ID list
     * 根据监控任务ID列表查询监控
     *
     * @param monitorIds Monitoring ID List 监控任务ID列表
     * @return Monitor List     监控列表
     */
    List<Monitor> findMonitorsByIdIn(Set<Long> monitorIds);

    /**
     * Query monitoring by monitoring type
     * 根据监控类型查询监控
     *
     * @param app Monitor Type   监控类型
     * @return Monitor List     监控列表
     */
    List<Monitor> findMonitorsByAppEquals(String app);

    /**
     * Querying Monitoring of Sent Collection Tasks
     * 查询已下发采集任务的监控
     *
     * @param status Monitor Status     任务状态
     * @return Monitor List     监控列表
     */
    List<Monitor> findMonitorsByStatusNotInAndAndJobIdNotNull(List<Byte> status);

    /**
     * Query monitoring by monitoring name 根据任务名称查询监控
     *
     * @param name monitoring name 任务名称
     * @return monitoring list 监控列表
     */
    Optional<Monitor> findMonitorByNameEquals(String name);

    /**
     * Query the monitoring category - the number of monitoring corresponding to the status
     * 查询监控类别-状态对应的监控数量
     *
     * @return Monitoring Category-Status and Monitoring Quantity Mapping 监控类别-状态与监控数量映射
     */
    @Query("select new org.dromara.hertzbeat.manager.pojo.dto.AppCount(mo.app, mo.status, COUNT(mo.id)) from Monitor mo group by mo.app, mo.status")
    List<AppCount> findAppsStatusCount();

    /**
     * Update the status of the specified monitor
     * 更新指定监控的状态
     *
     * @param id     Monitor ID 监控任务ID
     * @param status 任务状态 Monitor Status
     */
    @Modifying(clearAutomatically = true)
    @Query("update Monitor set status = :status where id = :id")
    void updateMonitorStatus(@Param(value = "id") Long id, @Param(value = "status") byte status);
}
