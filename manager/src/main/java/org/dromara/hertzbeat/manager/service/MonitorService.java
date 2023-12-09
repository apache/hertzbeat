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

package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.manager.Param;
import org.dromara.hertzbeat.manager.pojo.dto.AppCount;
import org.dromara.hertzbeat.manager.pojo.dto.MonitorDto;
import org.dromara.hertzbeat.manager.support.exception.MonitorDetectException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 监控管理服务
 *
 * @author tomsun28
 */
public interface MonitorService {


    /**
     * Monitoring Availability Probes
     * 监控可用性探测
     *
     * @param monitor   Monitoring entity information    监控实体信息
     * @param params    Parameter information            参数信息
     * @param collector collector pinned
     * @throws MonitorDetectException Probe failure throws  探测失败抛出
     */
    void detectMonitor(Monitor monitor, List<Param> params, String collector) throws MonitorDetectException;

    /**
     * Add monitoring       新增监控
     *
     * @param monitor   Monitoring Entity     监控实体
     * @param params    Parameter information 参数信息
     * @param collector collector pinned
     * @throws RuntimeException Add process exception throw     新增过程异常抛出
     */
    void addMonitor(Monitor monitor, List<Param> params, String collector) throws RuntimeException;

    /**
     * Verify the correctness of request data parameters
     * 校验请求数据参数正确性
     *
     * @param monitorDto monitorDto
     * @param isModify   Whether it is a modification monitoring    是否是修改监控
     * @throws IllegalArgumentException Validation parameter error thrown   校验参数错误抛出
     */
    void validate(MonitorDto monitorDto, Boolean isModify) throws IllegalArgumentException;

    /**
     * Modify update monitoring
     * 修改更新监控
     *
     * @param monitor   Monitor Entity        监控实体
     * @param params    Parameter information 参数信息
     * @param collector collector pinned
     * @throws RuntimeException Exception thrown during modification    修改过程中异常抛出
     */
    void modifyMonitor(Monitor monitor, List<Param> params, String collector) throws RuntimeException;

    /**
     * Delete Monitor
     * 删除监控
     *
     * @param id Monitor ID         监控任务ID
     * @throws RuntimeException Exception thrown during deletion    删除过程中异常抛出
     */
    void deleteMonitor(long id) throws RuntimeException;

    /**
     * Batch delete monitoring
     * 批量删除监控
     *
     * @param ids Monitoring ID List    监控任务ID列表
     * @throws RuntimeException Exception thrown during deletion    删除过程中异常抛出
     */
    void deleteMonitors(Set<Long> ids) throws RuntimeException;

    /**
     * Get monitoring information
     * 获取监控信息
     *
     * @param id Monitor ID      监控任务ID
     * @return MonitorDto   Monitor Entity  監控实体
     * @throws RuntimeException Exception thrown during query   查询过程中异常抛出
     */
    MonitorDto getMonitorDto(long id) throws RuntimeException;

    /**
     * Dynamic conditional query
     * 动态条件查询
     *
     * @param specification Query conditions        查询条件
     * @param pageRequest   Pagination parameters   分页参数
     * @return Search Result          查询结果
     */
    Page<Monitor> getMonitors(Specification<Monitor> specification, PageRequest pageRequest);

    /**
     * Unmanaged monitoring items in batches according to the monitoring ID list
     * 根据监控任务ID列表批量取消纳管监控项
     *
     * @param ids Monitoring ID List    监控任务ID列表
     */
    void cancelManageMonitors(HashSet<Long> ids);

    /**
     * Start the managed monitoring items in batches according to the monitoring ID list
     * 根据监控任务ID列表批量启动纳管监控项
     *
     * @param ids Monitoring ID List    监控任务ID列表
     */
    void enableManageMonitors(HashSet<Long> ids);

    /**
     * Query the monitoring category and its corresponding monitoring quantity
     * 查询监控类别及其对应的监控数量
     *
     * @return Monitoring Category and Monitoring Quantity Mapping  监控类别与监控数量映射
     */
    List<AppCount> getAllAppMonitorsCount();

    /**
     * Query monitoring
     * 查询监控
     *
     * @param monitorId Monitor ID  监控任务ID
     * @return Monitor information  监控信息
     */
    Monitor getMonitor(Long monitorId);

    /**
     * Update the status of the specified monitor
     * 更新指定监控的状态
     *
     * @param monitorId monitorId    监控任务ID
     * @param status    monitor status  任务状态
     */
    void updateMonitorStatus(Long monitorId, byte status);

    /**
     * Query the list of all monitoring information under the specified monitoring type
     * 查询指定监控类型下的所有监控信息列表
     *
     * @param app Monitor Type      监控类型
     * @return Monitor Entity List  监控列表
     */
    List<Monitor> getAppMonitors(String app);

    /**
     * 新增一个可选指标的监控
     *
     * @param metrics 用户指标
     * @param monitor 监控提示
     * @param params  配置参数
     */
    void addNewMonitorOptionalMetrics(List<String> metrics, Monitor monitor, List<Param> params);

    /**
     * 根据App名称获取可监控指标，不传为获取全部指标
     *
     * @param app app name
     * @return metrics
     */
    List<String> getMonitorMetrics(String app);

    /**
     * Export Monitoring Configuration
     * 导出监控配置
     *
     * @param ids  监控配置ID列表
     * @param type 文件类型
     * @param res  response
     * @throws Exception This exception will be thrown if the export fails
     */
    void export(List<Long> ids, String type, HttpServletResponse res) throws Exception;

    /**
     * Import Monitoring Configuration
     * 导入监控配置
     *
     * @param file 配置文件
     * @throws Exception This exception will be thrown if the export fails
     */
    void importConfig(MultipartFile file) throws Exception;

    /**
     * 根据id，批量复制monitor
     *
     * @param ids monitor id
     */
    void copyMonitors(List<Long> ids);


    /**
     * update app collect job by app
     *
     * @param job job content
     */
    void updateAppCollectJob(Job job);
}
