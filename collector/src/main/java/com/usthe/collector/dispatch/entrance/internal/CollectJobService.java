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

package com.usthe.collector.dispatch.entrance.internal;

import com.usthe.collector.dispatch.timer.TimerDispatch;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.SnowFlakeIdGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Collection job management provides api interface
 * 采集job管理提供api接口
 * @author tomsun28
 * @date 2021/11/6 13:58
 */
@Service
@Slf4j
public class CollectJobService {

    @Autowired
    private TimerDispatch timerDispatch;

    /**
     * Execute a one-time collection task and get the collected data response
     * 执行一次性采集任务,获取采集数据响应
     *
     * @param job Collect task details  采集任务详情
     * @return Collection results       采集结果
     */
    public List<CollectRep.MetricsData> collectSyncJobData(Job job) {
        final List<CollectRep.MetricsData> metricsData = new LinkedList<>();
        final CountDownLatch countDownLatch = new CountDownLatch(1);
        CollectResponseEventListener listener = new CollectResponseEventListener() {
            @Override
            public void response(List<CollectRep.MetricsData> responseMetrics) {
                if (responseMetrics != null) {
                    metricsData.addAll(responseMetrics);
                }
                countDownLatch.countDown();
            }
        };
        timerDispatch.addJob(job, listener);
        try {
            countDownLatch.await(100, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.info("The sync task runs for 100 seconds with no response and returns");
        }
        return metricsData;
    }

    /**
     * Issue periodic asynchronous collection tasks
     * 下发周期性异步采集任务
     *
     * @param job Collect task details      采集任务详情
     * @return long Job ID      任务ID
     */
    public long addAsyncCollectJob(Job job) {
        if (job.getId() == 0L) {
            long jobId = SnowFlakeIdGenerator.generateId();
            job.setId(jobId);
        }
        timerDispatch.addJob(job, null);
        return job.getId();
    }

    /**
     * Update the periodic asynchronous collection tasks that have been delivered
     * 更新已经下发的周期性异步采集任务
     *
     * @param modifyJob Collect task details        采集任务详情
     */
    public void updateAsyncCollectJob(Job modifyJob) {
        timerDispatch.deleteJob(modifyJob.getId(), true);
        timerDispatch.addJob(modifyJob, null);
    }

    /**
     * Cancel periodic asynchronous collection tasks
     * 取消周期性异步采集任务
     *
     * @param jobId Job ID      任务ID
     */
    public void cancelAsyncCollectJob(Long jobId) {
        timerDispatch.deleteJob(jobId, true);
    }

}
