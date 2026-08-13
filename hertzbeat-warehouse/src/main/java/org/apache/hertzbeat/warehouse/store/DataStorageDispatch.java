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

package org.apache.hertzbeat.warehouse.store;

import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.support.exception.CommonDataQueueUnknownException;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.apache.hertzbeat.common.util.BackoffUtils;
import org.apache.hertzbeat.common.util.ExponentialBackoff;
import org.apache.hertzbeat.plugin.PostCollectPlugin;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.apache.hertzbeat.warehouse.store.metadata.MonitorAvailability;
import org.apache.hertzbeat.warehouse.store.metadata.MonitorStatusMetadataWriter;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataWriter;
import org.springframework.stereotype.Component;

/**
 * dispatch storage metrics data
 */
@Slf4j
@Component
public class DataStorageDispatch {

    private final CommonDataQueue commonDataQueue;
    private final WarehouseWorkerPool workerPool;
    private final MonitorStatusMetadataWriter monitorStatusWriter;
    private final RealTimeDataWriter realTimeDataWriter;
    private final List<HistoryDataWriter> historyDataWriters;
    private final PluginRunner pluginRunner;
    private static final int LOG_BATCH_SIZE = 1000;

    public DataStorageDispatch(CommonDataQueue commonDataQueue,
                               WarehouseWorkerPool workerPool,
                               MonitorStatusMetadataWriter monitorStatusWriter,
                               List<HistoryDataWriter> historyDataWriters,
                               RealTimeDataWriter realTimeDataWriter,
                               PluginRunner pluginRunner) {
        this.commonDataQueue = commonDataQueue;
        this.workerPool = workerPool;
        this.monitorStatusWriter = monitorStatusWriter;
        this.realTimeDataWriter = realTimeDataWriter;
        this.historyDataWriters = historyDataWriters == null ? List.of()
                : historyDataWriters.stream().filter(Objects::nonNull).toList();
        this.pluginRunner = pluginRunner;
        startPersistentDataStorage();
        startLogDataStorage();
    }

    protected void startPersistentDataStorage() {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-persistent-data-storage");
            ExponentialBackoff backoff = new ExponentialBackoff(50L, 1000L);
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = commonDataQueue.pollMetricsDataToStorage();
                    if (metricsData == null) {
                        continue;
                    }
                    backoff.reset();
                    persistMetricsData(metricsData);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                } catch (CommonDataQueueUnknownException ue) {
                    if (!BackoffUtils.shouldContinueAfterBackoff(backoff)) {
                        break;
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
        };
        workerPool.executeLongRunning(runnable);
    }

    protected void startLogDataStorage() {
        Runnable runnable = () -> {
            ExponentialBackoff backoff = new ExponentialBackoff(50L, 1000L);
            Thread.currentThread().setName("warehouse-log-data-storage");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    List<LogEntry> logEntries = commonDataQueue.pollLogEntryToStorageBatch(LOG_BATCH_SIZE);
                    if (logEntries == null || logEntries.isEmpty()) {
                        continue;
                    }
                    backoff.reset();
                    persistLogs(logEntries);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                } catch (CommonDataQueueUnknownException ue) {
                    if (!BackoffUtils.shouldContinueAfterBackoff(backoff)) {
                        break;
                    }
                } catch (Exception e) {
                    log.error("Error in log data storage thread: {}", e.getMessage(), e);
                }
            }
        };
        workerPool.executeLongRunning(runnable);
    }

    private HistoryDataWriter resolveMetricsHistoryWriter() {
        return historyDataWriters.stream()
                .filter(HistoryDataWriter::isServerAvailable)
                .findFirst()
                .or(() -> historyDataWriters.stream().findFirst())
                .orElse(null);
    }

    private void persistLogs(List<LogEntry> logEntries) {
        for (HistoryDataWriter historyDataWriter : historyDataWriters) {
            try {
                historyDataWriter.saveLogDataBatch(logEntries);
                return;
            } catch (UnsupportedOperationException ex) {
                // Try the next writer. Not every metrics backend supports log persistence.
            } catch (Exception e) {
                log.error("Failed to save log entries batch: {}", e.getMessage(), e);
            }
        }
    }

    protected void calculateMonitorStatus(CollectRep.MetricsData metricsData) {
        if (metricsData.getPriority() == 0) {
            long id = metricsData.getId();
            CollectRep.Code code = metricsData.getCode();
            try {
                MonitorAvailability availability = code == CollectRep.Code.SUCCESS
                        ? MonitorAvailability.UP : MonitorAvailability.DOWN;
                monitorStatusWriter.updateAvailability(id, availability);
            } catch (MetadataWriteAdmissionException exception) {
                log.debug("Monitor status metadata write skipped during maintenance");
            } catch (Exception e) {
                log.error("Update monitor status failed for monitor id: {}", id, e);
            }
        }
    }

    protected void persistMetricsData(CollectRep.MetricsData metricsData) {
        try {
            calculateMonitorStatus(metricsData);
            HistoryDataWriter historyDataWriter = resolveMetricsHistoryWriter();
            if (historyDataWriter != null) {
                historyDataWriter.saveData(metricsData);
            }
            pluginRunner.pluginExecute(PostCollectPlugin.class,
                    (postCollectPlugin, pluginContext) -> postCollectPlugin.execute(metricsData, pluginContext));
        } finally {
            realTimeDataWriter.saveData(metricsData);
        }
    }
}
