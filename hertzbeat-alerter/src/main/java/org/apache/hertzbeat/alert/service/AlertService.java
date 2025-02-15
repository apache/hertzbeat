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

package org.apache.hertzbeat.alert.service;

import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.data.domain.Page;

/**
 * Alarm information management interface
 */
public interface AlertService {

    /**
     * get and query single alerts
     * @param status status
     * @param search search
     * @param sort sort
     * @param order order
     * @param pageIndex pageIndex
     * @param pageSize pageSize
     * @return single alerts
     */
    Page<SingleAlert> getSingleAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize);
    
    /**
     * Dynamic conditional query
     * @param status        Alarm Status
     * @param sort          Sort field
     * @param order         Sort Type
     * @param pageIndex     List current page
     * @param pageSize      Number of list pagination
     * @return search result    
     */
    Page<GroupAlert> getGroupAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize);

    /**
     * delete the group alarm according to the alarm ID
     * @param ids Alarm ID List
     */
    void deleteGroupAlerts(HashSet<Long> ids);

    /**
     * delete the single alarm according to the alarm ID
     * @param ids Alarm ID List
     */
    void deleteSingleAlerts(HashSet<Long> ids);

    /**
     * Update the alarm status according to the alarm ID-status value
     * @param status Alarm status to be modified
     * @param ids   Alarm ID List to be modified
     */
    void editGroupAlertStatus(String status, List<Long> ids);

    /**
     * Update the alarm status according to the alarm ID-status value
     * @param status Alarm status to be modified
     * @param ids  Alarm ID List to be modified
     */
    void editSingleAlertStatus(String status, List<Long> ids);
    
    /**
     * Get alarm statistics information
     * @return Alarm statistics information 
     */
    AlertSummary getAlertsSummary();
}
