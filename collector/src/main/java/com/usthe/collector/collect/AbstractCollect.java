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

package com.usthe.collector.collect;


import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.message.CollectRep;

/**
 * Specific indicator group collection implementation abstract class
 * 具体的指标组采集实现抽象类
 *
 * @author tomsun28
 * @date 2021/11/4 9:35
 */
public abstract class AbstractCollect {

    /**
     * Real acquisition implementation interface
     * 真正的采集实现接口
     *
     * @param builder response builder
     * @param appId   App monitoring ID   应用监控ID
     * @param app     Application Type  应用类型
     * @param metrics Metric group configuration    指标组配置
     *                return response builder
     */
    public abstract void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics);

    /**
     * the protocol this collect instance support
     * @return protocol str
     */
    public abstract String supportProtocol();
}
