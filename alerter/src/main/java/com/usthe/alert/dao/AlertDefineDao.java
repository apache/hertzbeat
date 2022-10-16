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

import com.usthe.common.entity.alerter.AlertDefine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

/**
 * AlertDefine 数据库操作
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDefineDao extends JpaRepository<AlertDefine, Long>, JpaSpecificationExecutor<AlertDefine> {

    /**
     * Delete alarm definitions based on the ID list
     * 根据ID列表删除告警定义
     * @param alertDefineIds 告警定义ID列表
     */
    void deleteAlertDefinesByIdIn(Set<Long> alertDefineIds);

    /**
     * Query the default alarm thresholds based on the monitoring indicator type
     * 根据监控指标类型查询对应默认告警定义阈值
     * @param app 监控类型
     * @param metric 指标集合类型
     * @return The alarm is defined ｜ 告警定义
     */
    List<AlertDefine> queryAlertDefinesByAppAndMetricAndPresetTrueAndEnableTrue(String app, String metric);

    /**
     * Query the alarm definition list associated with the monitoring ID
     * 根据监控ID查询与之关联的告警定义列表
     * @param monitorId 监控ID
     * @param app 监控类型
     * @param metrics 指标组
     * @return Alarm Definition List ｜ 告警定义列表
     */
    @Query("select define from AlertDefine define join AlertDefineMonitorBind bind on bind.alertDefineId = define.id " +
            "where bind.monitorId = :monitorId and define.app = :app and define.metric = :metrics and define.enable = true and define.preset = false")
    List<AlertDefine> queryAlertDefinesByMonitor(@Param(value = "monitorId") Long monitorId,
                                                 @Param(value = "app") String app,
                                                 @Param(value = "metrics") String metrics);
}
