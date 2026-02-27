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

package org.apache.hertzbeat.common.queue;

import java.util.List;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * common data queue
 */
public interface CommonDataQueue {

    /**
     * poll collect metrics data for alerter
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException;

    /**
     * poll collect metrics data for Persistent Storage
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollMetricsDataToStorage() throws InterruptedException;

    /**
     * poll service discovery data
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException;

    /**
     * send collect metrics data
     * @param metricsData metrics data
     */
    void sendMetricsData(CollectRep.MetricsData metricsData);

    /**
     * send metrics data to storage from alerter
     * @param metricsData metrics data
     */
    void sendMetricsDataToStorage(CollectRep.MetricsData metricsData);

    /**
     * send service discovery data
     * @param metricsData service discovery data
     */
    void sendServiceDiscoveryData(CollectRep.MetricsData metricsData);
    
    /**
     * send log entry to queue
     * @param logEntry log entry data based on OpenTelemetry log data model
     * @throws InterruptedException when sending is interrupted
     */
    void sendLogEntry(LogEntry logEntry);

    /**
     * poll log entry from queue
     * @return log entry data
     * @throws InterruptedException when poll timeout
     */
    LogEntry pollLogEntry() throws InterruptedException;
    
    /**
     * send log entry to storage queue
     * @param logEntry log entry data based on OpenTelemetry log data model
     * @throws InterruptedException when sending is interrupted
     */
    void sendLogEntryToStorage(LogEntry logEntry);

    /**
     * poll log entry from storage queue
     * @return log entry data
     * @throws InterruptedException when poll timeout
     */
    LogEntry pollLogEntryToStorage() throws InterruptedException;
    
    /**
     * send batch log entries to alert queue
     * @param logEntries list of log entry data
     */
    void sendLogEntryToAlertBatch(List<LogEntry> logEntries);

    /**
     * poll batch log entries from alert queue
     * @param maxBatchSize maximum number of entries to poll
     * @return list of log entry data
     * @throws InterruptedException when poll timeout
     */
    List<LogEntry> pollLogEntryToAlertBatch(int maxBatchSize) throws InterruptedException;
    
    /**
     * send batch log entries to storage queue
     * @param logEntries list of log entry data
     */
    void sendLogEntryToStorageBatch(List<LogEntry> logEntries);

    /**
     * poll batch log entries from storage queue
     * @param maxBatchSize maximum number of entries to poll
     * @return list of log entry data
     * @throws InterruptedException when poll timeout
     */
    List<LogEntry> pollLogEntryToStorageBatch(int maxBatchSize) throws InterruptedException;
}
