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

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.sd.ConfigWrapper;
import org.apache.hertzbeat.common.entity.sd.ConnectionConfig;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryProtocol;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.scheduler.CollectorAndJobScheduler;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * service discovery management
 */
@Slf4j
@Component
public class ServiceDiscoveryManager {
    private final CollectorAndJobScheduler collectorAndJobScheduler;
    private final ScheduledExecutorService scheduledExecutorService;
    private final Map<Long, ServiceDiscoveryProtocol> sdCommonProtocolMap;
    private final Map<Long, ConfigWrapper> configWrapperMap;

    public ServiceDiscoveryManager(CollectorAndJobScheduler jobScheduler) {
        scheduledExecutorService = Executors.newSingleThreadScheduledExecutor(new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("SD Scheduler has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setNameFormat("sd-schedule-worker-%d")
                .build());
        sdCommonProtocolMap = Maps.newConcurrentMap();
        configWrapperMap = Maps.newConcurrentMap();
        collectorAndJobScheduler = jobScheduler;

        executeSchedule();
    }

    public Long addSdProtocol(ServiceDiscoveryProtocol serviceDiscoveryProtocol) {
        if (Objects.isNull(serviceDiscoveryProtocol.getType()) || StringUtils.isBlank(serviceDiscoveryProtocol.getSdSource())) {
            log.warn("Failed to add sd scheduler due to invalid SdCommonProtocol!");
            return null;
        }

        serviceDiscoveryProtocol.setId(SnowFlakeIdGenerator.generateId());
        serviceDiscoveryProtocol.setJobIdList(Lists.newArrayList());
        sdCommonProtocolMap.put(serviceDiscoveryProtocol.getId(), serviceDiscoveryProtocol);

        return serviceDiscoveryProtocol.getId();
    }

    public List<Long> removeSdProtocol(Long sdProtocolId) {
        final List<Long> jobIdList = sdCommonProtocolMap.get(sdProtocolId).getJobIdList();
        sdCommonProtocolMap.remove(sdProtocolId);
        return jobIdList;
    }

    public ConfigWrapper getConfigWrapper(Long sdProtocolId) {
        return configWrapperMap.get(sdProtocolId);
    }

    @NotNull
    public ConfigWrapper getConfigWrapper(ServiceDiscoveryProtocol protocol) {
        return getConfigWrapper(collectorAndJobScheduler.collectSdData(protocol), ServiceDiscoveryCache.getConfig(protocol.getId()));
    }

    private void executeSchedule() {
        scheduledExecutorService.scheduleAtFixedRate(() -> {
            if (CollectionUtils.isEmpty(sdCommonProtocolMap)) {
                return;
            }

            sdCommonProtocolMap.forEach((key, value) -> {
                final ConfigWrapper configWrapper = getConfigWrapper(value);

                ServiceDiscoveryCache.updateConfig(key, configWrapper.addedConfigList());
                configWrapperMap.put(key, configWrapper);
            });
        }, 0, 30, TimeUnit.SECONDS);
    }

    private ConfigWrapper getConfigWrapper(List<ConnectionConfig> fetchedConfigList, List<ConnectionConfig> existConfigList) {
        return new ConfigWrapper(findAddedConfigs(fetchedConfigList, existConfigList), findRemovedConfigs(fetchedConfigList, existConfigList));
    }

    private List<ConnectionConfig> findAddedConfigs(List<ConnectionConfig> fetchedConfigList, List<ConnectionConfig> existConfigList) {
        List<ConnectionConfig> addedConfigs = Lists.newArrayList(fetchedConfigList);
        addedConfigs.removeAll(existConfigList);
        return addedConfigs;
    }

    private List<ConnectionConfig> findRemovedConfigs(List<ConnectionConfig> fetchedConfigList, List<ConnectionConfig> existConfigList) {
        List<ConnectionConfig> removedConfigs = Lists.newArrayList(existConfigList);
        removedConfigs.removeAll(fetchedConfigList);
        return removedConfigs;
    }
}
