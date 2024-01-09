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

package org.dromara.hertzbeat.collector.dispatch.entrance.internal;

import org.dromara.hertzbeat.collector.dispatch.DispatchProperties;
import org.dromara.hertzbeat.collector.dispatch.WorkerPool;
import org.dromara.hertzbeat.collector.dispatch.entrance.CollectServer;
import org.dromara.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.dromara.hertzbeat.common.util.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.util.ProtoJsonUtil;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Collection job management provides api interface
 * 采集job管理提供api接口
 *
 * @author tomsun28
 */
@Service
@Slf4j
public class CollectJobService {

    private static final String COLLECTOR_STR = "-collector";

    private final TimerDispatch timerDispatch;

    private final WorkerPool workerPool;

    private final String collectorIdentity;
    
    private String mode = null;

    private CollectServer collectServer;

    public CollectJobService(TimerDispatch timerDispatch, DispatchProperties properties, WorkerPool workerPool) {
        this.timerDispatch = timerDispatch;
        this.workerPool = workerPool;
        if (properties != null && properties.getEntrance() != null && properties.getEntrance().getNetty() != null
                && properties.getEntrance().getNetty().isEnabled()) {
            mode = properties.getEntrance().getNetty().getMode();
            String collectorName = properties.getEntrance().getNetty().getIdentity();
            if (StringUtils.hasText(collectorName)) {
                collectorIdentity = collectorName;
            } else {
                collectorIdentity = IpDomainUtil.getCurrentHostName() + COLLECTOR_STR;
                log.info("user not config this collector identity, use [host name - host ip] default: {}.", collectorIdentity);
            }
        } else {
            collectorIdentity = CommonConstants.MAIN_COLLECTOR_NODE;
        }
    }

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
            countDownLatch.await(120, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.info("The sync task runs for 120 seconds with no response and returns");
        }
        return metricsData;
    }

    /**
     * Execute a one-time collection task and send the collected data response
     *
     * @param oneTimeJob Collect task details  采集任务详情
     */
    public void collectSyncOneTimeJobData(Job oneTimeJob) {
        workerPool.executeJob(() -> {
            List<CollectRep.MetricsData> metricsDataList = this.collectSyncJobData(oneTimeJob);
            List<String> jsons = new ArrayList<>(metricsDataList.size());
            for (CollectRep.MetricsData metricsData : metricsDataList) {
                String json = ProtoJsonUtil.toJsonStr(metricsData);
                if (json != null) {
                    jsons.add(json);
                }
            }
            String response = JsonUtil.toJson(jsons);
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setMsg(response)
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setType(ClusterMsg.MessageType.RESPONSE_ONE_TIME_TASK_DATA)
                    .build();
            this.collectServer.sendMsg(message);
        });
    }

    /**
     * Issue periodic asynchronous collection tasks
     * 下发周期性异步采集任务
     *
     * @param job Collect task details      采集任务详情
     */
    public void addAsyncCollectJob(Job job) {
        timerDispatch.addJob(job.clone(), null);
    }

    /**
     * Cancel periodic asynchronous collection tasks
     * 取消周期性异步采集任务
     *
     * @param jobId Job ID      采集任务ID
     */
    public void cancelAsyncCollectJob(Long jobId) {
        if (jobId != null) {
            timerDispatch.deleteJob(jobId, true);
        }
    }

    /**
     * send async collect response data
     *
     * @param metricsData collect data
     */
    public void sendAsyncCollectData(CollectRep.MetricsData metricsData) {
        String data = ProtoJsonUtil.toJsonStr(metricsData);
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                .setIdentity(collectorIdentity)
                .setMsg(data)
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_DATA)
                .build();
        this.collectServer.sendMsg(message);
    }

    public String getCollectorIdentity() {
        return collectorIdentity;
    }
    
    public String getCollectorMode() {
        return mode;
    }

    public void setCollectServer(CollectServer collectServer) {
        this.collectServer = collectServer;
    }
}
