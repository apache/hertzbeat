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
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.ipmi2.cache.IpmiConnect;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiClient;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiConnection;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiHandlerManager;
import org.apache.hertzbeat.collector.collect.ipmi2.client.UdpConnection;
import org.apache.hertzbeat.collector.util.CollectUtil;
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

    private final GlobalConnectionCache connectionCommonCache = GlobalConnectionCache.getInstance();

    private final IpmiHandlerManager ipmiHandlerManager;

    public IpmiCollectImpl() {
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
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        IpmiConnect cachedConnection;
        try {
            cachedConnection = getIpmiConnection(metrics.getIpmi());
        } catch (Exception e) {
            log.error("Ipmi session create error: {}", e.getMessage());
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        try {
            cachedConnection.getConnection().getResource(builder, metrics);
        } catch (IOException e) {
            log.error("Get Ipmi {} detail resource error: {}", metrics.getName(), e.getMessage());
            // A failed exchange leaves the UDP session unusable (the request may still be in flight),
            // so report the failure and drop the cached connection to force a fresh one next cycle.
            invalidateConnection(metrics.getIpmi(), cachedConnection);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(e.getMessage());
        }
    }

    private void invalidateConnection(IpmiProtocol ipmiProtocol, IpmiConnect connection) {
        try {
            if (!connectionCommonCache.removeCache(buildCacheIdentifier(ipmiProtocol), connection)) {
                connection.close();
            }
        } catch (Exception e) {
            log.warn("Failed to invalidate Ipmi connection for {}: {}", ipmiProtocol.getHost(), e.getMessage());
        }
    }

    private CacheIdentifier buildCacheIdentifier(IpmiProtocol ipmiProtocol) {
        return CacheIdentifier.builder()
                .ip(ipmiProtocol.getHost())
                .port(ipmiProtocol.getPort())
                .username(ipmiProtocol.getUsername())
                .password(ipmiProtocol.getPassword())
                .customArg("ipmi-timeout:" + CollectUtil.getTimeout(ipmiProtocol.getTimeout(),
                        UdpConnection.DEFAULT_RECEIVE_TIMEOUT_MILLIS))
                .build();
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_IPMI;
    }


    private IpmiConnect getIpmiConnection(IpmiProtocol ipmiProtocol) throws Exception {
        CacheIdentifier identifier = buildCacheIdentifier(ipmiProtocol);
        Optional<AbstractConnection<?>> cacheOption = connectionCommonCache.getCache(identifier, true);
        if (cacheOption.isPresent()) {
            IpmiConnect cached = (IpmiConnect) cacheOption.get();
            IpmiConnection connection = cached.getConnection();
            if (connection != null && connection.isActive()) {
                return cached;
            }
            if (!connectionCommonCache.removeCache(identifier, cached)) {
                cached.close();
            }
        }
        IpmiClient ipmiClient = IpmiClient.create(ipmiProtocol);
        IpmiConnect cached = new IpmiConnect(ipmiClient.connect());
        connectionCommonCache.addCache(identifier, cached);
        return cached;
    }
}
