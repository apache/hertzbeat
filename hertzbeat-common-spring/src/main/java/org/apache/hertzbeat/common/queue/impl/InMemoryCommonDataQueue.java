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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.DataQueueConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
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
    private final LinkedBlockingQueue<LogEntry> logEntryQueue;
    private final LinkedBlockingQueue<LogEntry> logEntryToStorageQueue;

    public InMemoryCommonDataQueue() {
        metricsDataToAlertQueue = new LinkedBlockingQueue<>();
        metricsDataToStorageQueue = new LinkedBlockingQueue<>();
        serviceDiscoveryDataQueue = new LinkedBlockingQueue<>();
        logEntryQueue = new LinkedBlockingQueue<>();
        logEntryToStorageQueue = new LinkedBlockingQueue<>();
    }

    public Map<String, Integer> getQueueSizeMetricsInfo() {
        Map<String, Integer> metrics = new HashMap<>(8);
        metrics.put("metricsDataToAlertQueue", metricsDataToAlertQueue.size());
        metrics.put("metricsDataToStorageQueue", metricsDataToStorageQueue.size());
        metrics.put("logEntryQueue", logEntryQueue.size());
        metrics.put("logEntryToStorageQueue", logEntryToStorageQueue.size());
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
    public void sendLogEntry(LogEntry logEntry) {
        logEntryQueue.offer(logEntry);
    }

    @Override
    public LogEntry pollLogEntry() throws InterruptedException {
        return logEntryQueue.take();
    }

    @Override
    public void sendLogEntryToStorage(LogEntry logEntry) {
        logEntryToStorageQueue.offer(logEntry);
    }

    @Override
    public LogEntry pollLogEntryToStorage() throws InterruptedException {
        return logEntryToStorageQueue.take();
    }

    @Override
    public void sendLogEntryToAlertBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        for (LogEntry logEntry : logEntries) {
            logEntryQueue.offer(logEntry);
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToAlertBatch(int maxBatchSize) throws InterruptedException {
        List<LogEntry> batch = new ArrayList<>(maxBatchSize);
        LogEntry first = logEntryQueue.poll(1, TimeUnit.SECONDS);
        if (first != null) {
            batch.add(first);
            logEntryQueue.drainTo(batch, maxBatchSize - 1);
        }
        return batch;
    }

    @Override
    public void sendLogEntryToStorageBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        for (LogEntry logEntry : logEntries) {
            logEntryToStorageQueue.offer(logEntry);
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToStorageBatch(int maxBatchSize) throws InterruptedException {
        List<LogEntry> batch = new ArrayList<>(maxBatchSize);
        LogEntry first = logEntryToStorageQueue.poll(1, TimeUnit.SECONDS);
        if (first != null) {
            batch.add(first);
            logEntryToStorageQueue.drainTo(batch, maxBatchSize - 1);
        }
        return batch;
    }

    @Override
    public void destroy() {
        metricsDataToAlertQueue.clear();
        metricsDataToStorageQueue.clear();
        serviceDiscoveryDataQueue.clear();
        logEntryQueue.clear();
        logEntryToStorageQueue.clear();
    }
}
