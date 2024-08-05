/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.collector.collect.registry.discovery.impl;

import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.api.naming.NamingFactory;
import com.alibaba.nacos.api.naming.NamingService;
import com.google.common.collect.Lists;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.registry.constant.DiscoveryClientHealthStatus;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ConnectConfig;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;

/**
 * DiscoveryClient impl of Nacos
 */
@Slf4j
public class NacosDiscoveryClient implements DiscoveryClient {
    private NamingService namingService;
    private ConnectConfig localConnectConfig;

    @Override
    public ConnectConfig buildConnectConfig(RegistryProtocol registryProtocol) {
        return ConnectConfig.builder()
                .host(registryProtocol.getHost())
                .port(Integer.parseInt(registryProtocol.getPort()))
                .build();
    }

    @Override
    public void initClient(ConnectConfig connectConfig) {
        try {
            localConnectConfig = connectConfig;
            namingService = NamingFactory.createNamingService(connectConfig.getHost() + ":" + connectConfig.getPort());
        } catch (NacosException exception) {
            throw new RuntimeException("Failed to init namingService");
        }
    }

    @Override
    public ServerInfo getServerInfo() {
        if (Objects.isNull(namingService)) {
            throw new NullPointerException("NamingService is null");
        }
        ServerInfo serverInfo;
        if (healthCheck()) {
            serverInfo = ServerInfo.builder()
                    .address(localConnectConfig.getHost())
                    .port(String.valueOf(localConnectConfig.getPort()))
                    .build();
        } else {
            throw new RuntimeException("NamingService is not healthy");
        }

        return serverInfo;
    }

    @Override
    public List<ServiceInstance> getServices() {
        if (Objects.isNull(namingService)) {
            log.error("NamingService is null");
            return Collections.emptyList();
        }
        if (!healthCheck()) {
            log.error("NamingService is not healthy");
            return Collections.emptyList();
        }
        List<ServiceInstance> serviceInstanceList = Lists.newArrayList();
        try {
            for (String serviceName : namingService.getServicesOfServer(0, 9999).getData()) {
                namingService.getAllInstances(serviceName).forEach(instance ->
                        serviceInstanceList.add(ServiceInstance.builder()
                                .serviceId(instance.getInstanceId())
                                .serviceName(instance.getServiceName())
                                .address(instance.getIp())
                                .weight(instance.getWeight())
                                .metadata(instance.getMetadata())
                                .port(instance.getPort())
                                .healthStatus(instance.isHealthy()
                                        ? DiscoveryClientHealthStatus.UP
                                        : DiscoveryClientHealthStatus.DOWN)
                                .build()));
            }
        } catch (NacosException e) {
            throw new RuntimeException("Failed to fetch instance info");
        }

        return serviceInstanceList;
    }

    @Override
    public boolean healthCheck() {

        return namingService.getServerStatus().equals(DiscoveryClientHealthStatus.UP);
    }

    @Override
    public void close() {
        if (namingService == null) {
            return;
        }

        try {
            namingService.shutDown();
        } catch (NacosException exception) {
            log.error("Nacos client close exception: {}", exception.toString());
        }
    }
}
