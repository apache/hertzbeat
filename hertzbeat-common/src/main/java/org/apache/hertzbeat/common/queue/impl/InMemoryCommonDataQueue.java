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

import com.google.common.collect.Maps;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.DataQueueConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.arrow.ArrowVector;
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

    private final LinkedBlockingQueue<Alert> alertDataQueue;
    private final LinkedBlockingQueue<byte[]> metricsDataToAlertQueue;
    private final LinkedBlockingQueue<byte[]> metricsDataToPersistentStorageQueue;
    private final LinkedBlockingQueue<byte[]> metricsDataToRealTimeStorageQueue;
    private final LinkedBlockingQueue<byte[]> serviceDiscoveryDataQueue;

    public InMemoryCommonDataQueue() {
        alertDataQueue = new LinkedBlockingQueue<>();
        metricsDataToAlertQueue = new LinkedBlockingQueue<>();
        metricsDataToPersistentStorageQueue = new LinkedBlockingQueue<>();
        metricsDataToRealTimeStorageQueue = new LinkedBlockingQueue<>();
        serviceDiscoveryDataQueue = new LinkedBlockingQueue<>();
    }

    public Map<String, Integer> getQueueSizeMetricsInfo() {
        Map<String, Integer> metrics = Maps.newHashMapWithExpectedSize(8);
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
    public ArrowVector pollServiceDiscoveryData() throws InterruptedException {
        return ArrowVector.fromByteArr(serviceDiscoveryDataQueue.take());
    }

    @Override
    public Alert pollAlertsData() throws InterruptedException {
        return alertDataQueue.take();
    }

    @Override
    public ArrowVector pollMetricsDataToAlerter() throws InterruptedException {
        return ArrowVector.fromByteArr(metricsDataToAlertQueue.take());
    }

    @Override
    public ArrowVector pollMetricsDataToPersistentStorage() throws InterruptedException {
        return ArrowVector.fromByteArr(metricsDataToPersistentStorageQueue.take());
    }

    @Override
    public ArrowVector pollMetricsDataToRealTimeStorage() throws InterruptedException {
        return ArrowVector.fromByteArr(metricsDataToRealTimeStorageQueue.take());
    }

    @Override
    public void sendMetricsData(ArrowVector arrowVector) {
        byte[] byteArray = arrowVector.toByteArray();
        metricsDataToAlertQueue.offer(byteArray);
        metricsDataToPersistentStorageQueue.offer(byteArray);
        metricsDataToRealTimeStorageQueue.offer(byteArray);
    }

    @Override
    public void sendServiceDiscoveryData(ArrowVector arrowVector) {
        serviceDiscoveryDataQueue.offer(arrowVector.toByteArray());
    }

    @Override
    public void destroy() {
        alertDataQueue.clear();
        metricsDataToAlertQueue.clear();
        metricsDataToPersistentStorageQueue.clear();
        metricsDataToRealTimeStorageQueue.clear();
        serviceDiscoveryDataQueue.clear();
    }
}
