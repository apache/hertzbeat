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
import java.util.Optional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.support.exception.CommonDataQueueUnknownException;
import org.apache.hertzbeat.common.util.BackoffUtils;
import org.apache.hertzbeat.common.util.ExponentialBackoff;
import org.apache.hertzbeat.plugin.PostCollectPlugin;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataWriter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * dispatch storage metrics data
 */
@Slf4j
@Component
public class DataStorageDispatch {

    private final CommonDataQueue commonDataQueue;
    private final WarehouseWorkerPool workerPool;
    private final JdbcTemplate jdbcTemplate;
    private final RealTimeDataWriter realTimeDataWriter;
    private final Optional<HistoryDataWriter> historyDataWriter;
    private final PluginRunner pluginRunner;
    private static final int LOG_BATCH_SIZE = 1000;
    @PersistenceContext
    private EntityManager entityManager;

    public DataStorageDispatch(CommonDataQueue commonDataQueue,
                               WarehouseWorkerPool workerPool,
                               JdbcTemplate jdbcTemplate,
                               Optional<HistoryDataWriter> historyDataWriter,
                               RealTimeDataWriter realTimeDataWriter,
                               PluginRunner pluginRunner) {
        this.commonDataQueue = commonDataQueue;
        this.workerPool = workerPool;
        this.jdbcTemplate = jdbcTemplate;
        this.realTimeDataWriter = realTimeDataWriter;
        this.historyDataWriter = historyDataWriter;
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
                    try {
                        calculateMonitorStatus(metricsData);
                        historyDataWriter.ifPresent(dataWriter -> dataWriter.saveData(metricsData));
                        pluginRunner.pluginExecute(PostCollectPlugin.class, ((postCollectPlugin, pluginContext) -> postCollectPlugin.execute(metricsData, pluginContext)));
                    } finally {
                        realTimeDataWriter.saveData(metricsData);
                    }
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
        workerPool.executeJob(runnable);
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
                    historyDataWriter.ifPresent(dataWriter -> {
                        try {
                            dataWriter.saveLogDataBatch(logEntries);
                        } catch (Exception e) {
                            log.error("Failed to save log entries batch: {}", e.getMessage(), e);
                        }
                    });
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
        workerPool.executeJob(runnable);
    }
    
    protected void calculateMonitorStatus(CollectRep.MetricsData metricsData) {
        if (metricsData.getPriority() == 0) {
            long id = metricsData.getId();
            CollectRep.Code code = metricsData.getCode();
            try {
                String sql = "UPDATE hzb_monitor SET status = ? WHERE id = ? AND status = ?";
                int status = code == CollectRep.Code.SUCCESS ? CommonConstants.MONITOR_UP_CODE : CommonConstants.MONITOR_DOWN_CODE;
                int preStatus = code == CollectRep.Code.SUCCESS ? CommonConstants.MONITOR_DOWN_CODE : CommonConstants.MONITOR_UP_CODE;
                int matchedRows = jdbcTemplate.update(sql, status, id, preStatus);
                if (matchedRows > 0) {
                    entityManager.getEntityManagerFactory().getCache().evict(Monitor.class, id);
                }
            } catch (Exception e) {
                log.error("Update monitor status failed for monitor id: {}", id, e);
            }
        }
    }
}
