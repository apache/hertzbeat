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

package org.apache.hertzbeat.alert.dao;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.alert.dto.AlertPriorityNum;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Alert Database Operations
 */
public interface AlertDao extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    /**
     * Delete alerts based on ID list
     * @param alertIds Alert ID List 
     */
    void deleteAlertsByIdIn(Set<Long> alertIds);

    /**
     * Updates the alarm status based on the alarm ID-status value
     * @param status status value
     * @param ids    alarm ids
     */
    @Modifying
    @Query("update Alert set status = :status where id in :ids")
    void updateAlertsStatus(@Param(value = "status") Byte status, @Param(value = "ids") List<Long> ids);

    /**
     * Query the number of unhandled alarms of each alarm severity
     * @return List of alerts num 
     */
    @Query("select new org.apache.hertzbeat.alert.dto.AlertPriorityNum(mo.priority, count(mo.id)) from Alert mo where mo.status = 0 group by mo.priority")
    List<AlertPriorityNum> findAlertPriorityNum();
}
