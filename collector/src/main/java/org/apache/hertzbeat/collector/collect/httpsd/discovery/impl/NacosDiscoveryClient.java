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

package org.apache.hertzbeat.collector.collect.httpsd.discovery.impl;

import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.api.naming.NamingFactory;
import com.alibaba.nacos.api.naming.NamingService;
import com.google.common.collect.Lists;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.ConnectConfig;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.ServerInfo;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.protocol.HttpsdProtocol;

/**
 * DiscoveryClient impl of Nacos
 *
 */
public class NacosDiscoveryClient implements DiscoveryClient {
    private NamingService namingService;
    private ConnectConfig localConnectConfig;

    @Override
    public ConnectConfig buildConnectConfig(HttpsdProtocol httpsdProtocol) {
        return ConnectConfig.builder()
                .host(httpsdProtocol.getHost())
                .port(Integer.parseInt(httpsdProtocol.getPort()))
                .build();
    }

    @Override
    public void initClient(ConnectConfig connectConfig) {
        try {
            localConnectConfig = connectConfig;
            namingService = NamingFactory.createNamingService(connectConfig.getHost() + ":" + connectConfig.getPort());
        }catch (NacosException exception) {
            throw new RuntimeException("Failed to init namingService");
        }
    }

    @Override
    public ServerInfo getServerInfo() {
        if (Objects.isNull(namingService)) {
            throw new NullPointerException("NamingService is null");
        }
        String serverStatus = namingService.getServerStatus();
        return switch (serverStatus) {
            case "UP" -> ServerInfo.builder()
                    .address(localConnectConfig.getHost())
                    .port(String.valueOf(localConnectConfig.getPort()))
                    .build();
            case "DOWN" -> throw new RuntimeException("Nacos connection failed");
            default -> throw new RuntimeException("ServerStatus must be UP or DOWN");
        };
    }

    @Override
    public List<ServiceInstance> getServices() {
        if (Objects.isNull(namingService)) {
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
                                .port(String.valueOf(instance.getPort()))
                                .healthStatus(instance.isHealthy() ? "UP" : "DOWN")
                                .build()));
            }
        } catch (NacosException e) {
            throw new RuntimeException("Failed to fetch instance info");
        }

        return serviceInstanceList;
    }

    @Override
    public void close() {
        if (namingService == null) {
            return;
        }

        try {
            namingService.shutDown();
        }catch (NacosException ignore) {
        }
    }
}
