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

package org.dromara.hertzbeat.alert.service;

import org.dromara.hertzbeat.common.entity.alerter.AlertDefine;
import org.dromara.hertzbeat.common.entity.alerter.AlertDefineMonitorBind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Alarm define manager service
 * @author tom
 */
public interface AlertDefineService {

    /**
     * Verify the correctness of the request data parameters
     * @param alertDefine alertDefine
     * @param isModify whether modify
     * @throws IllegalArgumentException A checksum parameter error is thrown 
     */
    void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException;

    /**
     * New Alarm Definition
     * @param alertDefine Alarm definition Entity 
     * @throws RuntimeException Added procedure exception throwing 
     */
    void addAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * Modifying an Alarm Definition 
     * @param alertDefine Alarm definition Entity 
     * @throws RuntimeException Exception thrown during modification 
     */
    void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * Deleting an Alarm Definition
     * @param alertId Alarm Definition ID 
     * @throws RuntimeException Exception thrown during deletion 
     */
    void deleteAlertDefine(long alertId) throws RuntimeException;

    /**
     * Obtain alarm definition information
     * @param alertId Monitor the ID 
     * @return AlertDefine
     * @throws RuntimeException An exception was thrown during the query 
     */
    AlertDefine getAlertDefine(long alertId) throws RuntimeException;


    /**
     * Delete alarm definitions in batches 
     * @param alertIds Alarm Definition IDs
     * @throws RuntimeException Exception thrown during deletion 
     */
    void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException;

    /**
     * Dynamic conditional query 
     * @param specification Query conditions 
     * @param pageRequest Paging parameters 
     * @return The query results 
     */
    Page<AlertDefine> getMonitorBindAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest);

    /**
     * Association between application alarm schedule and monitoring 
     * @param alertId Alarm Definition ID 
     * @param alertDefineBinds correlation 
     */
    void applyBindAlertDefineMonitors(Long alertId, List<AlertDefineMonitorBind> alertDefineBinds);

    /**
     * Query the alarm definitions that match the specified metrics associated with the monitoring ID
     * 查询与此监控任务ID关联的指定指标匹配的告警定义
     * @param monitorId Monitor the ID 
     * @param app Monitoring type 
     * @param metrics metrics
     * @return field - define[]
     */
    Map<String, List<AlertDefine>> getMonitorBindAlertDefines(long monitorId, String app, String metrics);

    /**
     * Query the alarm definitions that match the specified metrics associated with the monitoring ID
     * 查询与此监控任务ID关联的可用性告警定义
     * @param monitorId Monitor the ID 
     * @param app Monitoring type 
     * @param metrics metrics
     * @return field - define[]
     */
    AlertDefine getMonitorBindAlertAvaDefine(long monitorId, String app, String metrics);

    /**
     * Dynamic conditional query
     * @param specification Query conditions 
     * @param pageRequest Paging parameters
     * @return The query results 
     */
    Page<AlertDefine> getAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest);

    /**
     * Query the associated monitoring list information based on the alarm definition ID
     * 根据告警定义ID查询其关联的监控列表关联信息
     * @param alertDefineId Alarm Definition ID 
     * @return Associated information about the monitoring list 
     */
    List<AlertDefineMonitorBind> getBindAlertDefineMonitors(long alertDefineId);

    /**
     * Export file configuration of specified type based on ID list and export file type
     * 根据ID列表、导出文件类型导出指定类型文件配置
     * @param ids AlertDefine ID
     * @param type File Type
     * @param res Response
     * @throws Exception An exception was thrown during the export
     */
    void export(List<Long> ids, String type, HttpServletResponse res) throws Exception;

    /**
     * Add alarm threshold rules based on the uploaded alarm threshold file
     * 根据上传的告警阀值文件，增加告警阀值规则
     * @param file Upload File
     * @throws Exception An exception was thrown during the importConfig
     */
    void importConfig(MultipartFile file) throws Exception;
}
