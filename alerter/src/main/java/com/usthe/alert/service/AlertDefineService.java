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

import com.usthe.common.entity.alerter.AlertDefine;
import com.usthe.common.entity.alerter.AlertDefineMonitorBind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 告警定义管理接口
 * @author tom
 * @date 2021/12/9 10:06
 */
public interface AlertDefineService {

    /**
     * Verify the correctness of the request data parameters
     * 校验请求数据参数正确性
     * @param alertDefine alertDefine
     * @param isModify 是否是修改配置
     * @throws IllegalArgumentException A checksum parameter error is thrown ｜ 校验参数错误抛出
     */
    void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException;

    /**
     * New Alarm Definition
     * 新增告警定义
     * @param alertDefine Alarm definition Entity ｜ 告警定义实体
     * @throws RuntimeException Added procedure exception throwing ｜ 新增过程异常抛出
     */
    void addAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * Modifying an Alarm Definition ｜ 修改告警定义
     * @param alertDefine Alarm definition Entity ｜ 告警定义实体
     * @throws RuntimeException Exception thrown during modification ｜ 修改过程中异常抛出
     */
    void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * Deleting an Alarm Definition
     * 删除告警定义
     * @param alertId Alarm Definition ID ｜ 告警定义ID
     * @throws RuntimeException Exception thrown during deletion ｜ 删除过程中异常抛出
     */
    void deleteAlertDefine(long alertId) throws RuntimeException;

    /**
     * Obtain alarm definition information
     * 获取告警定义信息
     * @param alertId Monitor the ID ｜ 监控ID
     * @return AlertDefine
     * @throws RuntimeException An exception was thrown during the query ｜ 查询过程中异常抛出
     */
    AlertDefine getAlertDefine(long alertId) throws RuntimeException;


    /**
     * Delete alarm definitions in batches ｜ 批量删除告警定义
     * @param alertIds Alarm Definition IDs ｜ 告警定义IDs
     * @throws RuntimeException Exception thrown during deletion ｜ 删除过程中异常抛出
     */
    void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException;

    /**
     * Dynamic conditional query ｜ 动态条件查询
     * @param specification Query conditions ｜ 查询条件
     * @param pageRequest Paging parameters ｜ 分页参数
     * @return The query results ｜ 查询结果
     */
    Page<AlertDefine> getMonitorBindAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest);

    /**
     * Association between application alarm schedule and monitoring ｜应用告警定于与监控关联关系
     * @param alertId Alarm Definition ID ｜ 告警定义ID
     * @param alertDefineBinds correlation ｜ 关联关系
     */
    void applyBindAlertDefineMonitors(Long alertId, List<AlertDefineMonitorBind> alertDefineBinds);

    /**
     * Query the alarm definitions that match the specified indicator group associated with the monitoring ID
     * 查询与此监控ID关联的指定指标组匹配的告警定义
     * @param monitorId Monitor the ID ｜ 监控ID
     * @param app Monitoring type ｜ 监控类型
     * @param metrics Index group ｜ 指标组
     * @return field - define[]
     */
    Map<String, List<AlertDefine>> getMonitorBindAlertDefines(long monitorId, String app, String metrics);

    /**
     * Dynamic conditional query
     * 动态条件查询
     * @param specification Query conditions ｜ 查询条件
     * @param pageRequest Paging parameters ｜ 分页参数
     * @return The query results ｜ 查询结果
     */
    Page<AlertDefine> getAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest);

    /**
     * Query the associated monitoring list information based on the alarm definition ID
     * 根据告警定义ID查询其关联的监控列表关联信息
     * @param alertDefineId Alarm Definition ID ｜ 告警定义ID
     * @return Associated information about the monitoring list ｜ 监控列表关联信息
     */
    List<AlertDefineMonitorBind> getBindAlertDefineMonitors(long alertDefineId);
}
