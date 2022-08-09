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

package com.usthe.manager.service;

import com.usthe.common.entity.job.Job;
import com.usthe.manager.pojo.dto.Hierarchy;
import com.usthe.common.entity.manager.ParamDefine;

import java.util.List;
import java.util.Map;

/**
 * Monitoring Type Management Interface
 * 监控类型管理接口
 *
 * @author tomsun28
 * @date 2021/11/14 17:12
 */
public interface AppService {

    /**
     * Query the defined parameter structure based on the monitoring type
     * 根据监控类型查询定义的参数结构
     *
     * @param app Monitoring type   监控类型
     * @return list of parameter structures     参数结构列表
     */
    List<ParamDefine> getAppParamDefines(String app);

    /**
     * Get monitor structure definition based on monitor type name
     * 根据监控类型名称获取监控结构定义
     *
     * @param app Monitoring type name  监控类型名称
     * @return Monitoring Structure Definition  监控结构定义
     * @throws IllegalArgumentException Thrown when there is no monitoring type with the corresponding name that is not supported
     *                                  当不存在即不支持对应名称的监控类型时抛出
     */
    Job getAppDefine(String app) throws IllegalArgumentException;

    /**
     * 获取app定义的指标
     * @param app
     * @return
     */
    List<String> getAppDefineMetricNames(String app);


    /**
     * Get defined monitoring I 18 N resources
     * 获取定义的监控I18N资源
     *
     * @param lang Language type    语言类型
     * @return I18N Resources     I18N资源
     */
    Map<String, String> getI18nResources(String lang);

    /**
     * Query all types of monitoring - indicator group - indicator level
     * 查询所有监控的类型-指标组-指标层级
     *
     * @param lang language     语言
     * @return level information        层级信息
     */
    List<Hierarchy> getAllAppHierarchy(String lang);

}
