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

package org.apache.hertzbeat.collector.collect.sd;

import java.util.List;

import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.registry.constant.DiscoveryClientInstance;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClientManagement;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.springframework.util.CollectionUtils;

import lombok.extern.slf4j.Slf4j;

/**
 * Nacos Service Discovery Collector
 * This collector integrates with Nacos to discover registered services
 */
@Slf4j
public class NacosSdCollectImpl extends AbstractCollect {
    
    /**
     * Client management to interact with discovery services
     */
    private final DiscoveryClientManagement discoveryClientManagement = new DiscoveryClientManagement();
    
    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        // Validate the required configuration is present
        if (metrics == null || metrics.getNacos_sd() == null) {
            throw new IllegalArgumentException("Nacos service discovery monitoring, the config is null");
        }
        if (metrics.getNacos_sd().isInvalid()) {
            throw new IllegalArgumentException("Nacos service discovery monitoring, the config is invalid");
        }
    }
    
    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        // Create Registry protocol from NacosSd protocol
        RegistryProtocol registryProtocol = RegistryProtocol.builder()
                .host(metrics.getNacos_sd().getHost())
                .port(metrics.getNacos_sd().getPort())
                .discoveryClientTypeName(DiscoveryClientInstance.NACOS.name())
                .build();

        DiscoveryClient discoveryClient = null;
        try {
            // Use the existing NacosDiscoveryClient through DiscoveryClientManagement
            discoveryClient = discoveryClientManagement.getClient(registryProtocol);
            if (discoveryClient == null) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("Failed to get Nacos discovery client");
                return;
            }
            
            // Get all services registered in Nacos
            List<ServiceInstance> services = discoveryClient.getServices();
            if (CollectionUtils.isEmpty(services)) {
                return;
            }
            
            // Populate the response data with service information
            services.forEach(service -> {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                valueRowBuilder.addColumn(service.getAddress());
                valueRowBuilder.addColumn(String.valueOf(service.getPort()));
                valueRowBuilder.addColumn(service.getServiceName());
                valueRowBuilder.addColumn(service.getHealthStatus());
                builder.addValueRow(valueRowBuilder.build());
            });
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("Failed to fetch services from Nacos: {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            // Close the discovery client to release resources
            if (discoveryClient != null) {
                try {
                    discoveryClient.close();
                } catch (Exception e) {
                    log.warn("Failed to close Nacos discovery client: {}", CommonUtil.getMessageFromThrowable(e));
                }
            }
        }
    }
    
    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_NACOS_SD;
    }
}
