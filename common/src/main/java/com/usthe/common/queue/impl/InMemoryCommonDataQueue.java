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

package com.usthe.common.queue.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.queue.CommonDataQueue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * 内存采集数据队列实现
 * @author tom
 * @date 2021/11/24 17:58
 */
@Configuration
@ConditionalOnProperty(prefix = "common.queue", name = "type", havingValue = "Memory",
        matchIfMissing = true)
@Slf4j
public class InMemoryCommonDataQueue implements CommonDataQueue, DisposableBean {

    private final LinkedBlockingQueue<Alert> alertDataQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToAlertQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToPersistentStorageQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToMemoryStorageQueue;

    public InMemoryCommonDataQueue() {
        alertDataQueue = new LinkedBlockingQueue<>();
        metricsDataToAlertQueue = new LinkedBlockingQueue<>();
        metricsDataToPersistentStorageQueue = new LinkedBlockingQueue<>();
        metricsDataToMemoryStorageQueue = new LinkedBlockingQueue<>();
    }

    @Override
    public void addAlertData(Alert alert) {
        alertDataQueue.offer(alert);
    }

    @Override
    public Alert pollAlertData() throws InterruptedException {
        return alertDataQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public CollectRep.MetricsData pollAlertMetricsData() throws InterruptedException {
        return metricsDataToAlertQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public CollectRep.MetricsData pollPersistentStorageMetricsData() throws InterruptedException {
        return metricsDataToPersistentStorageQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public CollectRep.MetricsData pollRealTimeStorageMetricsData() throws InterruptedException {
        return metricsDataToMemoryStorageQueue.poll(2, TimeUnit.SECONDS);
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        metricsDataToAlertQueue.offer(metricsData);
        metricsDataToPersistentStorageQueue.offer(metricsData);
        metricsDataToMemoryStorageQueue.offer(metricsData);
    }

    @Override
    public void destroy() {
        alertDataQueue.clear();
        metricsDataToAlertQueue.clear();
        metricsDataToPersistentStorageQueue.clear();
        metricsDataToMemoryStorageQueue.clear();
    }
}
