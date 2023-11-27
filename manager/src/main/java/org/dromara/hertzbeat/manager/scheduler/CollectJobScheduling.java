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

package org.dromara.hertzbeat.manager.scheduler;

import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

/**
 * Collection job management provides api interface
 * 调度采集job管理api接口
 * @author tom
 */
public interface CollectJobScheduling {

    /**
     * Execute a one-time collection task and get the collected data response
     * 执行一次性采集任务,获取采集数据响应
     *
     * @param job Collect task details  采集任务详情
     * @return Collection results       采集结果
     */
    List<CollectRep.MetricsData> collectSyncJobData(Job job);
    
    /**
     * Execute a one-time collection task and get the collected data response
     * 执行一次性采集任务,获取采集数据响应
     *
     * @param job Collect task details  采集任务详情
     * @param collector collector identity name
     * @return Collection results       采集结果
     */
    List<CollectRep.MetricsData> collectSyncJobData(Job job, String collector);

    /**
     * Issue periodic asynchronous collection tasks
     * 下发周期性异步采集任务
     *
     * @param job Collect task details      采集任务详情
     * @param collector collector identity name
     * @return long Job ID      采集任务ID
     */
    long addAsyncCollectJob(Job job, String collector);

    /**
     * Update the periodic asynchronous collection tasks that have been delivered
     * 更新已经下发的周期性异步采集任务
     *
     * @param modifyJob Collect task details        采集任务详情
     * @return long Job ID      新采集任务ID
     */
    long updateAsyncCollectJob(Job modifyJob);
    
    /**
     * Update the periodic asynchronous collection tasks that have been delivered
     * 更新已经下发的周期性异步采集任务
     *
     * @param modifyJob Collect task details        采集任务详情
     * @param collector collector identity name
     * @return long Job ID      新采集任务ID
     */
    long updateAsyncCollectJob(Job modifyJob, String collector);

    /**
     * Cancel periodic asynchronous collection tasks
     * 取消周期性异步采集任务
     *
     * @param jobId Job ID      采集任务ID
     */
    void cancelAsyncCollectJob(Long jobId);
    
    /**
     * one-time collect job response data
     * @param metricsDataList collect data
     */
    void collectSyncJobResponse(List<CollectRep.MetricsData> metricsDataList);
}
