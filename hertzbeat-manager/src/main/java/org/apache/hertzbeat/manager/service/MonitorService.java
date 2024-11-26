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

package org.apache.hertzbeat.manager.service;

import jakarta.servlet.http.HttpServletResponse;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.support.exception.MonitorDetectException;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

/**
 * Monitoring and management services
 */
public interface MonitorService {

    /**
     * Monitoring Availability Probes
     * @param monitor   Monitoring entity information
     * @param params    Parameter information
     * @param collector collector pinned
     * @throws MonitorDetectException Probe failure throws
     */
    void detectMonitor(Monitor monitor, List<Param> params, String collector) throws MonitorDetectException;

    /**
     * Add monitoring
     *
     * @param monitor          Monitoring Entity
     * @param params           Parameter information
     * @param collector        collector pinned
     * @param dashboard       grafana dashboard
     * @throws RuntimeException Add process exception throw
     */
    void addMonitor(Monitor monitor, List<Param> params, String collector, GrafanaDashboard dashboard) throws RuntimeException;

    /**
     * Verify the correctness of request data parameters
     * @param monitorDto monitorDto
     * @param isModify   Whether it is a modification monitoring
     * @throws IllegalArgumentException Validation parameter error thrown
     */
    void validate(MonitorDto monitorDto, Boolean isModify) throws IllegalArgumentException;

    /**
     * Modify update monitoring
     *
     * @param monitor          Monitor Entity
     * @param params           Parameter information
     * @param collector        collector pinned
     * @param dashboard        grafana dashboard
     * @throws RuntimeException Exception thrown during modification
     */
    void modifyMonitor(Monitor monitor, List<Param> params, String collector, GrafanaDashboard dashboard) throws RuntimeException;

    /**
     * Delete Monitor
     * @param id Monitor ID
     * @throws RuntimeException Exception thrown during deletion
     */
    void deleteMonitor(long id) throws RuntimeException;

    /**
     * Batch delete monitoring
     * @param ids Monitoring ID List
     * @throws RuntimeException Exception thrown during deletion
     */
    void deleteMonitors(Set<Long> ids) throws RuntimeException;

    /**
     * Get monitoring information
     * @param id Monitor ID
     * @return MonitorDto   Monitor Entity
     * @throws RuntimeException Exception thrown during query
     */
    MonitorDto getMonitorDto(long id) throws RuntimeException;

    /**
     * Dynamic conditional query
     * @param monitorIds Monitor ID List
     * @param app       Monitor Type
     * @param name      Monitor Name support fuzzy query
     * @param host      Monitor Host support fuzzy query
     * @param status    Monitor Status 0:no monitor,1:usable,2:disabled,9:all status
     * @param sort      Sort Field
     * @param order     Sort mode eg:asc desc
     * @param pageIndex List current page
     * @param pageSize  Number of list pagination
     * @param tag       Monitor tag
     * @return Search Result
     */
    Page<Monitor> getMonitors(List<Long> monitorIds, String app, String name, String host, Byte status, String sort, String order, int pageIndex, int pageSize, String tag);

    /**
     * Unmanaged monitoring items in batches according to the monitoring ID list
     * @param ids Monitoring ID List
     */
    void cancelManageMonitors(HashSet<Long> ids);

    /**
     * Start the managed monitoring items in batches according to the monitoring ID list
     * @param ids Monitoring ID List
     */
    void enableManageMonitors(HashSet<Long> ids);

    /**
     * Query the monitoring category and its corresponding monitoring quantity
     * @return Monitoring Category and Monitoring Quantity Mapping
     */
    List<AppCount> getAllAppMonitorsCount();

    /**
     * Query monitoring
     * @param monitorId Monitor ID
     * @return Monitor information
     */
    Monitor getMonitor(Long monitorId);

    /**
     * Update the status of the specified monitor
     * @param monitorId monitorId
     * @param status    monitor status
     */
    void updateMonitorStatus(Long monitorId, byte status);

    /**
     * Query the list of all monitoring information under the specified monitoring type
     * @param app Monitor Type
     * @return Monitor Entity List
     */
    List<Monitor> getAppMonitors(String app);

    /**
     * add a new monitor with optional metrics
     * @param metrics user metrics
     * @param monitor Monitoring prompt
     * @param params  configuration parameters
     */
    void addNewMonitorOptionalMetrics(List<String> metrics, Monitor monitor, List<Param> params);

    /**
     * Get monitor able metrics based on App name, not passed to get all metrics
     * @param app app name
     * @return metrics
     */
    List<String> getMonitorMetrics(String app);

    /**
     * Export Monitoring Configuration
     * @param ids  monitor id list
     * @param type file type
     * @param res  response
     * @throws Exception This exception will be thrown if the export fails
     */
    void export(List<Long> ids, String type, HttpServletResponse res) throws Exception;

    /**
     * Import Monitoring Configuration
     * @param file configuration file
     * @throws Exception This exception will be thrown if the export fails
     */
    void importConfig(MultipartFile file) throws Exception;

    /**
     * Copy monitor in batches based on the id
     *
     * @param ids monitor id
     */
    void copyMonitors(List<Long> ids);

    /**
     * update app collect job by app
     * @param job job content
     */
    void updateAppCollectJob(Job job);
}
