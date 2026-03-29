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
import com.alibaba.nacos.api.naming.pojo.Instance;
import com.google.common.collect.Lists;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Properties;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.registry.constant.DiscoveryClientHealthStatus;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ConnectConfig;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.springframework.util.StringUtils;

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
                .username(registryProtocol.getUsername())
                .password(registryProtocol.getPassword())
                .namespace(registryProtocol.getNamespace())
                .serviceName(registryProtocol.getServiceName())
                .groupName(registryProtocol.getGroupName())
                .build();
    }

    @Override
    public void initClient(ConnectConfig connectConfig) {
        try {

            localConnectConfig = connectConfig;
            Properties properties = new Properties();
            properties.put("serverAddr", connectConfig.getHost() + ":" + connectConfig.getPort());

            if (StringUtils.hasText(connectConfig.getUsername())) {
                properties.put("username", connectConfig.getUsername());
            }
            if (StringUtils.hasText(connectConfig.getPassword())) {
                properties.put("password", connectConfig.getPassword());
            }
            if (StringUtils.hasText(connectConfig.getNamespace())) {
                properties.put("namespace", connectConfig.getNamespace());
            }

            namingService = NamingFactory.createNamingService(properties);

            // Perform a synchronous probe to verify connectivity eagerly,
            // because NamingFactory.createNamingService() establishes the TCP
            // connection in a background thread and getServerStatus() returns
            // "UP" by default before that thread finishes.
            namingService.getServicesOfServer(0, 1);
        } catch (NacosException exception) {
            throw new RuntimeException("Failed to connect to Nacos server: " + exception.getErrMsg());
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
            List<String> services ;
            if(StringUtils.hasText(localConnectConfig.getGroupName())) {
              services = namingService.getServicesOfServer(0, 9999, localConnectConfig.getGroupName()).getData();
            } else {
              services = namingService.getServicesOfServer(0, 9999).getData();
            }

            for (String serviceName : services) {
                if(StringUtils.hasText(localConnectConfig.getServiceName())&&!serviceName.equals(localConnectConfig.getServiceName())){
                    continue;
                }
                List<Instance> instances;
                if(StringUtils.hasText(localConnectConfig.getGroupName())){
                    instances = namingService.getAllInstances(serviceName, localConnectConfig.getGroupName());
                }else{
                    instances = namingService.getAllInstances(serviceName);
                }

                instances.forEach(instance ->
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
