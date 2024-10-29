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

package org.apache.hertzbeat.collector.collect.ipmi2;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.ConnectionCommonCache;
import org.apache.hertzbeat.collector.collect.ipmi2.cache.IpmiConnect;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiClient;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiConnection;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiHandlerManager;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.IpmiProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.springframework.util.Assert;

import java.io.IOException;
import java.util.Optional;

/**
 *  Ipmi collect implementation
 */
@Slf4j
public class IpmiCollectImpl extends AbstractCollect {

    private final ConnectionCommonCache<CacheIdentifier, IpmiConnect> connectionCommonCache;

    private final IpmiHandlerManager ipmiHandlerManager;

    public IpmiCollectImpl() {
        connectionCommonCache = new ConnectionCommonCache<>();
        ipmiHandlerManager = new IpmiHandlerManager();
    }


    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getIpmi() == null) {
            throw new IllegalArgumentException("Ipmi collect must has ipmi params");
        }
        IpmiProtocol ipmiProtocol = metrics.getIpmi();
        Assert.hasText(ipmiProtocol.getHost(), "Ipmi Protocol host is required.");
        Assert.hasText(ipmiProtocol.getPort(), "Ipmi Protocol port is required.");
        Assert.hasText(ipmiProtocol.getUsername(), "Ipmi Protocol username is required.");
        Assert.hasText(ipmiProtocol.getPassword(), "Ipmi Protocol password is required.");
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        IpmiConnection connection = null;
        try {
            connection = getIpmiConnection(metrics.getIpmi());
        } catch (Exception e) {
            log.error("Ipmi session create error: {}", e.getMessage());
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        try {
            connection.getResource(builder, metrics);
        } catch (IOException e) {
            log.error("Get Ipmi {} detail resource error: {}", metrics.getName(), e.getMessage());
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_IPMI;
    }


    private IpmiConnection getIpmiConnection(IpmiProtocol ipmiProtocol) throws Exception {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(ipmiProtocol.getHost())
                .port(ipmiProtocol.getPort())
                .username(ipmiProtocol.getUsername())
                .password(ipmiProtocol.getPassword())
                .build();
        IpmiConnection connection = null;
        Optional<IpmiConnect> cacheOption = connectionCommonCache.getCache(identifier, true);
        if (cacheOption.isPresent()) {
            IpmiConnect ipmiConnect = cacheOption.get();
            connection = ipmiConnect.getConnection();
            if (connection == null || !connection.isActive()) {
                connection = null;
                connectionCommonCache.removeCache(identifier);
            }
        }
        if (connection != null) {
            return connection;
        }
        IpmiClient ipmiClient = IpmiClient.create(ipmiProtocol);
        connection = ipmiClient.connect();
        connectionCommonCache.addCache(identifier, new IpmiConnect(connection));
        return connection;
    }
}
