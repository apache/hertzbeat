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

package org.apache.hertzbeat.manager.dao;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * AuthResources database operation
 */
public interface MonitorDao extends JpaRepository<Monitor, Long>, JpaSpecificationExecutor<Monitor> {

    /**
     * Delete monitor based on monitor ID list
     * @param monitorIds Monitoring ID List
     */
    void deleteAllByIdIn(Set<Long> monitorIds);

    /**
     * Query monitoring based on monitoring ID list
     * @param monitorIds Monitoring ID List
     * @return Monitor List
     */
    List<Monitor> findMonitorsByIdIn(Set<Long> monitorIds);

    /**
     * Query monitoring by monitoring type
     * @param app Monitor Type
     * @return Monitor List
     */
    List<Monitor> findMonitorsByAppEquals(String app);

    /**
     * Querying Monitoring of Sent Collection Tasks
     * @param status Monitor Status
     * @return Monitor List
     */
    List<Monitor> findMonitorsByStatusNotInAndAndJobIdNotNull(List<Byte> status);

    /**
     * Query monitoring by monitoring name
     * @param name monitoring name
     * @return monitoring list
     */
    Optional<Monitor> findMonitorByNameEquals(String name);

    /**
     * Query the monitoring category - the number of monitoring corresponding to the status
     * @return Monitoring Category-Status and Monitoring Quantity Mapping
     */
    @Query("select new org.apache.hertzbeat.manager.pojo.dto.AppCount(mo.app, mo.status, COUNT(mo.id)) from Monitor mo group by mo.app, mo.status")
    List<AppCount> findAppsStatusCount();

    /**
     * Update the status of the specified monitor
     * @param id     Monitor ID
     * @param status  Monitor Status
     */
    @Modifying(clearAutomatically = true)
    @Query("update Monitor set status = :status where id = :id")
    void updateMonitorStatus(@Param(value = "id") Long id, @Param(value = "status") byte status);
}
