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

package org.apache.hertzbeat.common.queue.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.DataQueueConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * common data queue implement memory
 */
@Configuration
@ConditionalOnProperty(
        prefix = DataQueueConstants.PREFIX,
        name = DataQueueConstants.NAME,
        havingValue = DataQueueConstants.IN_MEMORY,
        matchIfMissing = true
)
@Slf4j
@Primary
public class InMemoryCommonDataQueue implements CommonDataQueue, DisposableBean {
    
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToAlertQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToStorageQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> serviceDiscoveryDataQueue;

    public InMemoryCommonDataQueue() {
        metricsDataToAlertQueue = new LinkedBlockingQueue<>();
        metricsDataToStorageQueue = new LinkedBlockingQueue<>();
        serviceDiscoveryDataQueue = new LinkedBlockingQueue<>();
    }

    public Map<String, Integer> getQueueSizeMetricsInfo() {
        Map<String, Integer> metrics = new HashMap<>(8);
        metrics.put("metricsDataToAlertQueue", metricsDataToAlertQueue.size());
        metrics.put("metricsDataToStorageQueue", metricsDataToStorageQueue.size());
        return metrics;
    }

    @Override
    public CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException {
        return serviceDiscoveryDataQueue.take();
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException {
        return metricsDataToAlertQueue.take();
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToStorage() throws InterruptedException {
        return metricsDataToStorageQueue.take();
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        metricsDataToAlertQueue.offer(metricsData);
    }

    @Override
    public void sendMetricsDataToStorage(CollectRep.MetricsData metricsData) {
        metricsDataToStorageQueue.offer(metricsData);
    }

    @Override
    public void sendServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        serviceDiscoveryDataQueue.offer(metricsData);
    }

    @Override
    public void destroy() {
        metricsDataToAlertQueue.clear();
        metricsDataToStorageQueue.clear();
        serviceDiscoveryDataQueue.clear();
    }
}
