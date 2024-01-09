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

package org.dromara.hertzbeat.common.queue.impl;

import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * common data queue implement memory
 * @author tom
 */
@Configuration
@ConditionalOnProperty(prefix = "common.queue", name = "type", havingValue = "memory", matchIfMissing = true)
@Slf4j
@Primary
public class InMemoryCommonDataQueue implements CommonDataQueue, DisposableBean {

    private final LinkedBlockingQueue<Alert> alertDataQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToAlertQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToPersistentStorageQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToRealTimeStorageQueue;

    public InMemoryCommonDataQueue() {
        alertDataQueue = new LinkedBlockingQueue<>();
        metricsDataToAlertQueue = new LinkedBlockingQueue<>();
        metricsDataToPersistentStorageQueue = new LinkedBlockingQueue<>();
        metricsDataToRealTimeStorageQueue = new LinkedBlockingQueue<>();
    }

    public Map<String, Integer> getQueueSizeMetricsInfo() {
        Map<String, Integer> metrics = new HashMap<>(8);
        metrics.put("alertDataQueue", alertDataQueue.size());
        metrics.put("metricsDataToAlertQueue", metricsDataToAlertQueue.size());
        metrics.put("metricsDataToPersistentStorageQueue", metricsDataToPersistentStorageQueue.size());
        metrics.put("metricsDataToMemoryStorageQueue", metricsDataToRealTimeStorageQueue.size());
        return metrics;
    }

    @Override
    public void sendAlertsData(Alert alert) {
        alertDataQueue.offer(alert);
    }

    @Override
    public Alert pollAlertsData() throws InterruptedException {
        return alertDataQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException {
        return metricsDataToAlertQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToPersistentStorage() throws InterruptedException {
        return metricsDataToPersistentStorageQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToRealTimeStorage() throws InterruptedException {
        return metricsDataToRealTimeStorageQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        metricsDataToAlertQueue.offer(metricsData);
        metricsDataToPersistentStorageQueue.offer(metricsData);
        metricsDataToRealTimeStorageQueue.offer(metricsData);
    }

    @Override
    public void destroy() {
        alertDataQueue.clear();
        metricsDataToAlertQueue.clear();
        metricsDataToPersistentStorageQueue.clear();
        metricsDataToRealTimeStorageQueue.clear();
    }
}
