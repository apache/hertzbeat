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

package org.apache.hertzbeat.collector.collect.registry;

import com.ecwid.consul.transport.TransportException;
import com.google.common.annotations.VisibleForTesting;
import java.lang.reflect.Field;
import java.util.Objects;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClientManagement;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * registry protocol collection implementation
 */
@Setter
@Slf4j
public class RegistryImpl extends AbstractCollect {
    private static final String SERVER = "server";

    @VisibleForTesting
    private DiscoveryClientManagement discoveryClientManagement = new DiscoveryClientManagement();

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        RegistryProtocol registryProtocol = metrics.getRegistry();
        if (Objects.isNull(registryProtocol) || registryProtocol.isInvalid()){
            throw new IllegalArgumentException("registry collect must have a valid registry protocol param! ");
        }
    }

    @Override
    public void collect(MetricsDataBuilder metricsDataBuilder, Metrics metrics) {
        RegistryProtocol registryProtocol = metrics.getRegistry();

        try (DiscoveryClient discoveryClient = discoveryClientManagement.getClient(registryProtocol)) {
            collectMetrics(metricsDataBuilder, metrics, discoveryClient);
        } catch (TransportException e1) {
            String errorMsg = "Consul " + CommonUtil.getMessageFromThrowable(e1);
            log.error(errorMsg);
            metricsDataBuilder.setFailedMsg(errorMsg);

        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            metricsDataBuilder.setFailedMsg(errorMsg);
        }
    }

    private void collectMetrics(MetricsDataBuilder metricsDataBuilder, Metrics metrics, DiscoveryClient discoveryClient) {
        long beginTime = System.currentTimeMillis();
        // Available and Server monitor
        if (StringUtils.equals(metrics.getName(), SERVER)) {
            ServerInfo serverInfo = discoveryClient.getServerInfo();
            metrics.getAliasFields().forEach(fieldName -> {
                if (StringUtils.equalsAnyIgnoreCase(CollectorConstants.RESPONSE_TIME, fieldName)) {
                    metricsDataBuilder.getArrowVectorWriter().setValue(fieldName, String.valueOf(System.currentTimeMillis() - beginTime));
                } else {
                    addColumnIfMatched(fieldName, serverInfo, metricsDataBuilder);
                }
            });

        } else {
            // Service instances monitor
            discoveryClient.getServices().forEach(serviceInstance ->
                    metrics.getAliasFields().forEach(fieldName -> addColumnIfMatched(fieldName, serviceInstance, metricsDataBuilder)));
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_REGISTRY;
    }

    private void addColumnIfMatched(String fieldName, Object sourceObj, MetricsDataBuilder metricsDataBuilder) {
        String columnValue = null;
        try {
            Field declaredField = sourceObj.getClass().getDeclaredField(fieldName);
            declaredField.setAccessible(Boolean.TRUE);
            columnValue = String.valueOf(declaredField.get(sourceObj));
        } catch (NoSuchFieldException | IllegalAccessException e) {
            log.warn("No such field for {}", fieldName);
        }

        metricsDataBuilder.getArrowVectorWriter().setValue(fieldName, columnValue);
    }
}
