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

package com.usthe.manager.dao;

import com.usthe.common.entity.manager.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;

/**
 * ParamDao 数据库操作
 *
 * @author tomsun28
 * @date 2021/11/14 11:26
 */
public interface ParamDao extends JpaRepository<Param, Long> {

    /**
     * Query the list of parameters associated with the monitoring ID'
     * 根据监控ID查询与之关联的参数列表
     *
     * @param monitorId Monitor ID          监控ID
     * @return list of parameter values     参数值列表
     */
    List<Param> findParamsByMonitorId(long monitorId);

    /**
     * Remove the parameter list associated with the monitoring ID based on it
     * 根据监控ID删除与之关联的参数列表
     *
     * @param monitorId Monitor Id       监控ID
     */
    void deleteParamsByMonitorId(long monitorId);

    /**
     * Remove the parameter list associated with the monitoring ID list based on it
     * 根据监控ID列表删除与之关联的参数列表
     *
     * @param monitorIds Monitoring ID List     监控ID列表
     */
    void deleteParamsByMonitorIdIn(Set<Long> monitorIds);
}
