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
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.dto.AlertReport;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;

/**
 * Alarm information management interface
 */
public interface AlertService {

    /**
     * Add alarm record
     * @param alert Alert entity   
     * @throws RuntimeException Add process exception throw    
     */
    void addAlert(Alert alert) throws RuntimeException;

    /**
     * Dynamic conditional query
     * @param alarmIds      Alarm ID List
     * @param monitorId     Monitor ID
     * @param priority      Alarm level
     * @param status        Alarm Status
     * @param content       Alarm content fuzzy query
     * @param sort          Sort field
     * @param order         Sort Type
     * @param pageIndex     List current page
     * @param pageSize      Number of list pagination
     * @return search result    
     */
    Page<Alert> getAlerts(List<Long> alarmIds, Long monitorId, Byte priority, Byte status, String content, String sort, String order, int pageIndex, int pageSize);

    /**
     * Delete alarms in batches according to the alarm ID list
     * @param ids Alarm ID List 
     */
    void deleteAlerts(HashSet<Long> ids);

    /**
     * Clear all alerts
     */
    void clearAlerts();

    /**
     * Update the alarm status according to the alarm ID-status value
     * @param status Alarm status to be modified  
     * @param ids    Alarm ID List to be modified   
     */
    void editAlertStatus(Byte status, List<Long> ids);

    /**
     * Get alarm statistics information
     * @return Alarm statistics information 
     */
    AlertSummary getAlertsSummary();

    /**
     * A third party reports an alarm 
     * @param alertReport The alarm information 
     */
    void addNewAlertReport(AlertReport alertReport);

    /**
     * Save external alarms of cloud services
     * @param cloudServiceName cloud service name,Such as tencloud
     * @param alertReport alert report json string
     */
    void addNewAlertReportFromCloud(String cloudServiceName, String alertReport);

    /**
     * Dynamic conditional query
     * @param specification Query conditions        
     * @return search result    
     */
    List<Alert> getAlerts(Specification<Alert> specification);
}
