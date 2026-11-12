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

package org.apache.hertzbeat.collector.dispatch.entrance.internal;

import com.google.protobuf.ByteString;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.dispatch.DispatchProperties;
import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.dispatch.entrance.CollectServer;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.ArrowUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Collection job management provides api interface
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

        Optional<DispatchProperties.EntranceProperties.NettyProperties> nettyPropertiesOptional = Optional.ofNullable(properties)
                .map(DispatchProperties::getEntrance)
                .map(DispatchProperties.EntranceProperties::getNetty)
                .filter(DispatchProperties.EntranceProperties.NettyProperties::isEnabled);

        if (nettyPropertiesOptional.isEmpty()) {
            collectorIdentity = CommonConstants.MAIN_COLLECTOR_NODE;
            return;
        }

        DispatchProperties.EntranceProperties.NettyProperties nettyProperties = nettyPropertiesOptional.get();
        mode = nettyProperties.getMode();
        if (StringUtils.hasText(nettyProperties.getIdentity())) {
            collectorIdentity = nettyProperties.getIdentity();
        } else {
            collectorIdentity = IpDomainUtil.getCurrentHostName() + COLLECTOR_STR;
            log.info("user not config this collector identity, use [host name - host ip] default: {}.", collectorIdentity);
        }
    }

    /**
     * Execute a one-time collection task and get the collected data response
     *
     * @param job Collect task details
     * @return Collection results
     */
    public List<CollectRep.MetricsData> collectSyncJobData(Job job) {
        // Local temporary tasks are keyed by Job.id, independently of monitorId (remote routing).
        // A cloned app definition has the same id for every caller; never share its waiter key.
        job.setId(org.apache.hertzbeat.common.util.SnowFlakeIdGenerator.generateId());
        final var response =
                new java.util.concurrent.CompletableFuture<List<CollectRep.MetricsData>>();
        CollectResponseEventListener listener =
                new CollectResponseEventListener() {
                    @Override
                    public void response(List<CollectRep.MetricsData> responseMetrics) {
                        List<CollectRep.MetricsData> value =
                                responseMetrics == null ? List.of() : List.copyOf(responseMetrics);
                        if (!response.complete(value)) value.forEach(CollectRep.MetricsData::close);
                    }
                };
        try {
            timerDispatch.addJob(job, listener);
            return response.get(120, TimeUnit.SECONDS);
        } catch (InterruptedException cancelled) {
            Thread.currentThread().interrupt();
            log.info("One-time collection interrupted before a response");
            return List.of();
        } catch (java.util.concurrent.TimeoutException expired) {
            log.info("One-time collection reached its 120-second response deadline");
            return List.of();
        } catch (java.util.concurrent.ExecutionException failed) {
            throw new IllegalStateException("One-time collection failed", failed.getCause());
        } finally {
            response.cancel(false);
            timerDispatch.deleteJob(job.getId(), false);
        }
    }

    /**
     * Execute a one-time collection task and send the collected data response
     *
     * @param oneTimeJob Collect task details
     */
    public void collectSyncOneTimeJobData(Job oneTimeJob) {
        workerPool.executeJob(() -> {
            List<CollectRep.MetricsData> metricsDataList = this.collectSyncJobData(oneTimeJob);
            byte[] msg = ArrowUtil.serializeMetricsData(metricsDataList);
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setMsg(ByteString.copyFrom(msg))
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setType(ClusterMsg.MessageType.RESPONSE_ONE_TIME_TASK_DATA)
                    .build();
            this.collectServer.sendMsg(message);
        });
    }

    /**
     * Issue periodic asynchronous collection tasks
     *
     * @param job Collect task details
     */
    public void addAsyncCollectJob(Job job) {
        timerDispatch.addJob(job.clone(), null);
    }

    /**
     * Cancel periodic asynchronous collection tasks
     *
     * @param jobId Job ID
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
        byte[] msg = ArrowUtil.serializeMetricsData(List.of(metricsData));
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                .setIdentity(collectorIdentity)
                .setMsg(ByteString.copyFrom(msg))
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_DATA)
                .build();
        this.collectServer.sendMsg(message);
    }

    public void sendAsyncServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        byte[] msg = ArrowUtil.serializeMetricsData(List.of(metricsData));
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                .setIdentity(collectorIdentity)
                .setMsg(ByteString.copyFrom(msg))
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_SD_DATA)
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
