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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.registry.constant.DiscoveryClientInstance;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClientManagement;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ConsulSdProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.springframework.util.CollectionUtils;

import java.util.List;

/**
 * consul sd collector
 */
@Slf4j
public class ConsulSdCollectImpl extends AbstractCollect {

    private static final DiscoveryClientManagement discoveryClientManagement = new DiscoveryClientManagement();

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        ConsulSdProtocol consulSd = metrics.getConsul_sd();
        if (consulSd == null || consulSd.isInvalid()) {
            throw new IllegalArgumentException("Consul Service Discovery params is required.");
        }

    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        RegistryProtocol registryProtocol = RegistryProtocol.builder()
                .host(metrics.getConsul_sd().getHost())
                .port(metrics.getConsul_sd().getPort())
                .discoveryClientTypeName(DiscoveryClientInstance.CONSUL.name())
                .build();
        try (DiscoveryClient client = discoveryClientManagement.getClient(registryProtocol)){
            List<ServiceInstance> services = client.getServices();
            if (CollectionUtils.isEmpty(services)) {
                return;
            }
            services.forEach(instance -> {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                valueRowBuilder.addColumn(instance.getAddress());
                valueRowBuilder.addColumn(String.valueOf(instance.getPort()));
                builder.addValueRow(valueRowBuilder.build());
            });
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("Failed to fetch consul sd... {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_CONSUL_SD;
    }
}
