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

package com.usthe.collector.dispatch.timer;


import com.usthe.collector.dispatch.entrance.internal.CollectResponseEventListener;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.message.CollectRep;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 时间轮调度接口
 *
 * @author tomsun28
 * @date 2021/10/17 22:14
 */
public interface TimerDispatch {

    /**
     * Add new job
     * 增加新的job
     *
     * @param addJob        job
     * @param eventListener One-time synchronous task listener, asynchronous task does not need listener一次性同步任务监听器，异步任务不需要listener
     */
    void addJob(Job addJob, CollectResponseEventListener eventListener);

    /**
     * 调度循环周期性job
     *
     * @param timerTask timerTask
     * @param interval  开始调度的间隔时间
     * @param timeUnit  时间单位
     */
    void cyclicJob(WheelTimerTask timerTask, long interval, TimeUnit timeUnit);

    /**
     * Delete existing job
     * 删除存在的job
     *
     * @param jobId    jobId
     * @param isCyclic Whether it is a periodic task, true is, false is a temporary task
     *                 是否是周期性任务,true是, false为临时性任务
     */
    void deleteJob(long jobId, boolean isCyclic);

    /**
     * 一次性同步采集任务采集结果通知监听器
     *
     * @param jobId            jobId
     * @param metricsDataTemps 采集结果数据
     */
    void responseSyncJobData(long jobId, List<CollectRep.MetricsData> metricsDataTemps);
}
