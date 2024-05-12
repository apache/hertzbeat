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

package org.apache.hertzbeat.collector.collect.httpsd;

import com.ecwid.consul.transport.TransportException;
import com.google.common.annotations.VisibleForTesting;
import java.lang.reflect.Field;
import java.util.Objects;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClientManagement;
import org.apache.hertzbeat.collector.collect.httpsd.discovery.ServerInfo;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CollectorConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpsdProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * http_sd protocol collection implementation
 */
@Slf4j
public class HttpsdImpl extends AbstractCollect {
    private static final  String SERVER = "server";

    @Setter
    @VisibleForTesting
    private DiscoveryClientManagement discoveryClientManagement = new DiscoveryClientManagement();

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        HttpsdProtocol httpsdProtocol = metrics.getHttpsd();
        if (Objects.isNull(httpsdProtocol) || httpsdProtocol.isInvalid()){
            throw new IllegalArgumentException("http_sd collect must have a valid http_sd protocol param! ");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        HttpsdProtocol httpsdProtocol = metrics.getHttpsd();

        try (DiscoveryClient discoveryClient = discoveryClientManagement.getClient(httpsdProtocol)) {
            collectMetrics(builder, metrics, discoveryClient);
        } catch (TransportException e1) {
            String errorMsg = "Consul " + CommonUtil.getMessageFromThrowable(e1);
            log.error(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    private void collectMetrics(CollectRep.MetricsData.Builder builder, Metrics metrics, DiscoveryClient discoveryClient) {
        long beginTime = System.currentTimeMillis();
        // Available and Server monitor
        if (StringUtils.equals(metrics.getName(), SERVER)) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            ServerInfo serverInfo = discoveryClient.getServerInfo();
            metrics.getAliasFields().forEach(fieldName -> {
                if (StringUtils.equalsAnyIgnoreCase(CollectorConstants.RESPONSE_TIME, fieldName)) {
                    valueRowBuilder.addColumns(String.valueOf(System.currentTimeMillis() - beginTime));
                } else {
                    addColumnIfMatched(fieldName, serverInfo, valueRowBuilder);
                }
            });

            builder.addValues(valueRowBuilder.build());
        } else {
            // Service instances monitor
            discoveryClient.getServices().forEach(serviceInstance -> {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                metrics.getAliasFields().forEach(fieldName -> addColumnIfMatched(fieldName, serviceInstance, valueRowBuilder));
                builder.addValues(valueRowBuilder.build());
            });
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_HTTP_SD;
    }

    private boolean checkParamsFailed(HttpsdProtocol httpsd) {
        return Objects.isNull(httpsd) || httpsd.isInvalid();
    }

    private void addColumnIfMatched(String fieldName, Object sourceObj, CollectRep.ValueRow.Builder valueRowBuilder) {
        String columnValue = null;
        try {
            Field declaredField = sourceObj.getClass().getDeclaredField(fieldName);
            declaredField.setAccessible(Boolean.TRUE);
            columnValue = (String) declaredField.get(sourceObj);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            log.warn("No such field for {}", fieldName);
        }

        valueRowBuilder.addColumns(StringUtils.isBlank(columnValue)
                ? CommonConstants.NULL_VALUE
                : columnValue);
    }
}
