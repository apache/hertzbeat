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

import com.ecwid.consul.v1.ConsulClient;
import com.ecwid.consul.v1.agent.model.Check;
import com.ecwid.consul.v1.agent.model.Self;
import com.ecwid.consul.v1.agent.model.Service;
import com.google.common.collect.Lists;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.ConnectConfig;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.ServerInfo;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.protocol.HttpsdProtocol;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * DiscoveryClient impl of Consul
 *
 */
public class ConsulDiscoveryClient implements DiscoveryClient {
    private ConsulClient consulClient;

    @Override
    public ConnectConfig buildConnectConfig(HttpsdProtocol httpsdProtocol) {
        return ConnectConfig.builder()
                .host(httpsdProtocol.getHost())
                .port(Integer.parseInt(httpsdProtocol.getPort()))
                .build();
    }

    @Override
    public void initClient(ConnectConfig connectConfig) {
        consulClient = new ConsulClient(connectConfig.getHost(), connectConfig.getPort());
    }

    @Override
    public ServerInfo getServerInfo() {
        Self self = consulClient.getAgentSelf().getValue();
        return ServerInfo.builder()
                .address(self.getMember().getAddress())
                .port(String.valueOf(self.getMember().getPort()))
                .build();
    }

    @Override
    public List<ServiceInstance> getServices() {
        Map<String, Service> serviceMap = consulClient.getAgentServices().getValue();
        List<ServiceInstance> serviceInstanceList = Lists.newArrayListWithExpectedSize(serviceMap.size());
        Collection<Check> healthCheckList = consulClient.getAgentChecks().getValue().values();

        serviceMap.forEach((serviceId, instance) -> serviceInstanceList.add(ServiceInstance.builder()
                .serviceId(serviceId)
                .serviceName(instance.getService())
                .address(instance.getAddress())
                .port(String.valueOf(instance.getPort()))
                .healthStatus(getHealthStatus(serviceId, healthCheckList))
                .build()));

        return serviceInstanceList;
    }

    @Override
    public void close() {
    }

    private String getHealthStatus(String serviceId, Collection<Check> healthCheckList) {
        return healthCheckList.stream()
                .filter(healthCheck -> StringUtils.equals(healthCheck.getServiceId(), serviceId))
                .findFirst()
                .map(check -> check.getStatus().name())
                .orElse("");
    }
}
