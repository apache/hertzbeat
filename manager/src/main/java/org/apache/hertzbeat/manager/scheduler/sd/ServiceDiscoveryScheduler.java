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

package org.apache.hertzbeat.manager.scheduler.sd;

import com.google.common.collect.Maps;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryProtocol;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.ConsistentHash;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.springframework.util.CollectionUtils;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * service discovery scheduler management
 */
@Slf4j
public class ServiceDiscoveryScheduler {
    private final ConsistentHash consistentHash;
    private final ManageServer manageServer;
    private final CollectJobService collectJobService;

    private final ScheduledExecutorService scheduledExecutorService;
    private final Map<Long, ServiceDiscoveryProtocol> sdCommonProtocolMap;

    public ServiceDiscoveryScheduler(ManageServer manageServer, ConsistentHash consistentHash, CollectJobService collectJobService) {
        this.manageServer = manageServer;
        this.consistentHash = consistentHash;
        this.collectJobService = collectJobService;
        scheduledExecutorService = Executors.newSingleThreadScheduledExecutor(new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("SD Scheduler has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("sd-schedule-worker-%d")
                .build());
        sdCommonProtocolMap = Maps.newConcurrentMap();

        execute();
    }

    public void addSdProtocol(ServiceDiscoveryProtocol serviceDiscoveryProtocol) {
        if (Objects.isNull(serviceDiscoveryProtocol.getJobId()) || Objects.isNull(serviceDiscoveryProtocol.getType())
                || StringUtils.isBlank(serviceDiscoveryProtocol.getSdSource())) {
            log.warn("Failed to add sd scheduler due to invalid SdCommonProtocol!");
            return;
        }

        sdCommonProtocolMap.put(serviceDiscoveryProtocol.getJobId(), serviceDiscoveryProtocol);
    }

    public void removeSdProtocol(Long jobId) {
        sdCommonProtocolMap.remove(jobId);
    }

    private void execute() {
        scheduledExecutorService.scheduleAtFixedRate(() -> {
            if (CollectionUtils.isEmpty(sdCommonProtocolMap)) {
                return;
            }

            // notify collector to update sd cache
            sdCommonProtocolMap.forEach((key, serviceDiscoveryProtocol) -> {
                ConsistentHash.Node node = consistentHash.dispatchJob(String.valueOf(serviceDiscoveryProtocol.getMonitorId()), key);

                if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
                    collectJobService.updateServiceProvider(serviceDiscoveryProtocol);
                } else {
                    ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                            .setType(ClusterMsg.MessageType.ISSUE_SD_UPDATE_TASK)
                            .setDirection(ClusterMsg.Direction.REQUEST)
                            .setMsg(JsonUtil.toJson(serviceDiscoveryProtocol))
                            .build();
                    manageServer.sendMsg(node.getIdentity(), message);
                }
            });
        }, 0, 20, TimeUnit.SECONDS);
    }
}
