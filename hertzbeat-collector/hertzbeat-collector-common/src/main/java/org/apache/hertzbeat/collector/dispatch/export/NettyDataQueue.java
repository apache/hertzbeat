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

package org.apache.hertzbeat.collector.dispatch.export;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * for collector instance
 * send collect response data by netty
 */
@Slf4j
@Configuration
@ConditionalOnProperty(
        prefix = NettyDataQueue.NETTY_DATA_QUEUE_PREFIX,
        name = NettyDataQueue.NAME,
        havingValue = NettyDataQueue.NETTY
)
public class NettyDataQueue implements CommonDataQueue {

    /**
     * netty data queue prefix.
     */
    protected static final String NETTY_DATA_QUEUE_PREFIX = "common.queue";

    /**
     * name constants
     */
    protected static final String NAME = "type";

    /**
     * havingValue constants
     */
    protected static final String NETTY = "netty";

    private final CollectJobService collectJobService;
    
    public NettyDataQueue(CollectJobService collectJobService) {
        this.collectJobService = collectJobService;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() {
        return null;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToStorage() {
        return null;
    }

    @Override
    public CollectRep.MetricsData pollServiceDiscoveryData() {
        return null;
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        collectJobService.sendAsyncCollectData(metricsData);
    }

    @Override
    public void sendMetricsDataToStorage(CollectRep.MetricsData metricsData) {
        
    }

    @Override
    public void sendServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        collectJobService.sendAsyncServiceDiscoveryData(metricsData);
    }
}
