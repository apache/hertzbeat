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

import io.netty.channel.Channel;
import org.dromara.hertzbeat.collector.dispatch.DispatchProperties;
import org.dromara.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.dromara.hertzbeat.common.util.JsonUtil;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.util.ProtoJsonUtil;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Collection job management provides api interface
 * 采集job管理提供api接口
 * @author tomsun28
 *
 */
@Service
@Slf4j
public class CollectJobService {

    private static final String COLLECTOR_STR = "-collector";
    
    private final TimerDispatch timerDispatch;
    
    private String collectorIdentity = null;
    
    private volatile Channel collectorChannel = null;
    
    public CollectJobService(TimerDispatch timerDispatch, DispatchProperties properties) {
        this.timerDispatch = timerDispatch;
        if (properties != null && properties.getEntrance() != null 
                    && properties.getEntrance().getNetty() != null && properties.getEntrance().getNetty().isEnabled()) {
            String collectorName = properties.getEntrance().getNetty().getIdentity();
            if (StringUtils.hasText(collectorName)) {
                collectorIdentity = collectorName;
            } else {
                String identity = IpDomainUtil.getCurrentHostName() + COLLECTOR_STR;
                log.info("user not config this collector identity, use [host name - host ip] default: {}.", identity);
                collectorIdentity = IpDomainUtil.getCurrentHostName() + COLLECTOR_STR;
            }
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
     * @param jobId Job ID      任务ID
     */
    public void cancelAsyncCollectJob(Long jobId) {
        if (jobId != null) {
            timerDispatch.deleteJob(jobId, true);
        }
    }
    
    /**
     * collector online 
     * @param channel message channel
     */
    public void collectorGoOnline(Channel channel) {
        collectorChannel = channel;
        CollectorInfo collectorInfo = CollectorInfo.builder()
                                              .name(collectorIdentity)
                                              .ip(IpDomainUtil.getLocalhostIp())
                                              // todo more info
                                              .build();
        String msg = JsonUtil.toJson(collectorInfo);
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                             .setIdentity(collectorIdentity)
                                             .setType(ClusterMsg.MessageType.GO_ONLINE)
                                             .setMsg(msg)
                                             .build();
        channel.writeAndFlush(message);
        // start a thread to send heartbeat to cluster server periodically
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor();
        scheduledExecutor.scheduleAtFixedRate(() -> {
            ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                                                   .setIdentity(collectorIdentity)
                                                   .setType(ClusterMsg.MessageType.HEARTBEAT)
                                                   .build();
            collectorChannel.writeAndFlush(heartbeat);
            log.info("collector send cluster server heartbeat, time: {}.", System.currentTimeMillis());
        }, 10, 3, TimeUnit.SECONDS);
    }
    
    /**
     * send async collect response data
     * @param metricsData collect data
     */
    public void sendAsyncCollectData(CollectRep.MetricsData metricsData) {
        String data = ProtoJsonUtil.toJsonStr(metricsData);
        ClusterMsg.Message heartbeat = ClusterMsg.Message.newBuilder()
                                               .setIdentity(collectorIdentity)
                                               .setMsg(data)
                                               .setType(ClusterMsg.MessageType.HEARTBEAT)
                                               .build();
        collectorChannel.writeAndFlush(heartbeat);
    }
}
