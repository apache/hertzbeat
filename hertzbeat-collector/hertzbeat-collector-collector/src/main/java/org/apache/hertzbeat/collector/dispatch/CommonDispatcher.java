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

package org.apache.hertzbeat.collector.dispatch;

import com.google.common.collect.Maps;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CollectCodeConstants;
import org.apache.hertzbeat.common.entity.arrow.ArrowVector;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.dispatch.timer.Timeout;
import org.apache.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.apache.hertzbeat.collector.dispatch.timer.WheelTimerTask;
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReader;
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReaderImpl;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.arrow.writer.ArrowVectorWriter;
import org.apache.hertzbeat.common.entity.arrow.writer.ArrowVectorWriterImpl;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Collection task and response data scheduler
 */
@Component
@Slf4j
public class CommonDispatcher implements MetricsTaskDispatch, CollectDataDispatch {

    /**
     * Collection task timeout value
     */
    private static final long DURATION_TIME = 240_000L;
    /**
     * Trigger sub task max num
     */
    private static final int MAX_SUB_TASK_NUM = 50;
    /**
     * Collect Response env config length
     */
    private static final int ENV_CONFIG_SIZE = 1;
    private static final Gson GSON = new Gson();
    /**
     * Priority queue of index collection tasks
     */
    private final MetricsCollectorQueue jobRequestQueue;
    /**
     * Time round task scheduler
     */
    private final TimerDispatch timerDispatch;
    /**
     * collection data exporter
     */
    private final CommonDataQueue commonDataQueue;
    /**
     * Metrics task and start time mapping map
     */
    private final Map<String, MetricsTime> metricsTimeoutMonitorMap;

    private final List<UnitConvert> unitConvertList;

    private final WorkerPool workerPool;
    
    private final String collectorIdentity;

    public CommonDispatcher(MetricsCollectorQueue jobRequestQueue,
                            TimerDispatch timerDispatch,
                            CommonDataQueue commonDataQueue,
                            WorkerPool workerPool,
                            CollectJobService collectJobService,
                            List<UnitConvert> unitConvertList) {
        this.commonDataQueue = commonDataQueue;
        this.jobRequestQueue = jobRequestQueue;
        this.timerDispatch = timerDispatch;
        this.unitConvertList = unitConvertList;
        this.workerPool = workerPool;
        this.collectorIdentity = collectJobService.getCollectorIdentity();
        this.metricsTimeoutMonitorMap = new ConcurrentHashMap<>(16);
        this.start();
    }

    public void start() {
        try {
            // Pull the collection task from the task queue and put it into the thread pool for execution
            workerPool.executeJob(() -> {
                Thread.currentThread().setName("metrics-task-dispatcher");
                while (!Thread.currentThread().isInterrupted()) {
                    MetricsCollect metricsCollect = null;
                    try {
                        metricsCollect = jobRequestQueue.getJob();
                        if (metricsCollect != null) {
                            workerPool.executeJob(metricsCollect);
                        }
                    } catch (RejectedExecutionException rejected) {
                        log.info("[Dispatcher]-the worker pool is full, reject this metrics task，put in queue again.");
                        if (metricsCollect != null) {
                            metricsCollect.setRunPriority((byte) (metricsCollect.getRunPriority() + 1));
                            jobRequestQueue.addJob(metricsCollect);
                        }
                    } catch (InterruptedException interruptedException) {
                        log.info("[Dispatcher]-metrics-task-dispatcher has been interrupt to close.");
                        Thread.currentThread().interrupt();
                    } catch (Exception e) {
                        log.error("[Dispatcher]-{}.", e.getMessage(), e);
                    }
                }
                log.info("Thread Interrupted, Shutdown the [metrics-task-dispatcher]");
            });
            // monitoring metrics collection task execution timeout
            ThreadFactory threadFactory = new ThreadFactoryBuilder()
                    .setNameFormat("metrics-task-timeout-monitor-%d")
                    .setDaemon(true)
                    .build();
            ScheduledThreadPoolExecutor scheduledExecutor = new ScheduledThreadPoolExecutor(1, threadFactory);
            scheduledExecutor.scheduleWithFixedDelay(this::monitorCollectTaskTimeout, 2, 20, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Common Dispatcher error: {}.", e.getMessage(), e);
        }
    }
    
    private void monitorCollectTaskTimeout() {
        try {
            // Detect whether the collection unit of each metrics has timed out for 4 minutes,
            // and if it times out, it will be discarded and an exception will be returned.
            long deadline = System.currentTimeMillis() - DURATION_TIME;
            for (Map.Entry<String, MetricsTime> entry : metricsTimeoutMonitorMap.entrySet()) {
                MetricsTime metricsTime = entry.getValue();
                if (metricsTime.getStartTime() < deadline) {
                    // Metrics collection timeout  
                    WheelTimerTask timerJob = (WheelTimerTask) metricsTime.getTimeout().task();
                    try (ArrowVectorWriter arrowVectorWriter = new ArrowVectorWriterImpl(ArrowVector.empty())) {
                        MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(arrowVectorWriter);
                        metricsDataBuilder.setMonitorId(timerJob.getJob().getMonitorId());
                        metricsDataBuilder.setTenantId(timerJob.getJob().getTenantId());
                        metricsDataBuilder.setApp(timerJob.getJob().getApp());
                        metricsDataBuilder.setMetrics(metricsTime.getMetrics().getName());
                        metricsDataBuilder.setPriority(metricsTime.getMetrics().getPriority());
                        metricsDataBuilder.setTime(System.currentTimeMillis());
                        metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.TIMEOUT, "collect timeout");

                        log.error("[Collect Timeout]: \n{}", metricsDataBuilder);
                        if (metricsDataBuilder.getPriority() == 0) {
                            dispatchCollectData(metricsTime.timeout, metricsTime.getMetrics(), metricsDataBuilder.build(), true);
                        }
                        metricsTimeoutMonitorMap.remove(entry.getKey());
                    }

                }
            }
        } catch (Exception e) {
            log.error("[Task Timeout Monitor]-{}.", e.getMessage(), e);
        }
    }

    @Override
    public void dispatchMetricsTask(Timeout timeout) {
        // Divide the collection task of a single application into corresponding collection tasks of the metrics according to the metrics under it.
        // Put each collect task into the thread pool for scheduling
        WheelTimerTask timerTask = (WheelTimerTask) timeout.task();
        Job job = timerTask.getJob();
        job.constructPriorMetrics();
        Set<Metrics> metricsSet = job.getNextCollectMetrics(null, true);
        metricsSet.forEach(metrics -> {
            MetricsCollect metricsCollect = new MetricsCollect(metrics, timeout, this,
                    collectorIdentity, unitConvertList);
            jobRequestQueue.addJob(metricsCollect);
            if (metrics.getPrometheus() != null) {
                metricsTimeoutMonitorMap.put(String.valueOf(job.getId()),
                        new MetricsTime(System.currentTimeMillis(), metrics, timeout));
            } else {
                metricsTimeoutMonitorMap.put(job.getId() + "-" + metrics.getName(),
                        new MetricsTime(System.currentTimeMillis(), metrics, timeout));   
            }
        });
    }

    @Override
    public void dispatchCollectData(Timeout timeout, Metrics metrics, ArrowVector arrowVector, boolean isCollectFailed) {
        WheelTimerTask timerJob = (WheelTimerTask) timeout.task();
        Job job = timerJob.getJob();
        if (metrics.isHasSubTask()) {
            metricsTimeoutMonitorMap.remove(job.getId() + "-" + metrics.getName() + "-sub-" + metrics.getSubTaskId());
            boolean isLastTask = metrics.consumeSubTaskResponse(arrowVector);
            if (isLastTask) {
                arrowVector = metrics.getSubTaskDataRef().get();
            } else {
                return;
            }
        } else {
            metricsTimeoutMonitorMap.remove(job.getId() + "-" + metrics.getName());
        }
        Set<Metrics> metricsSet = job.getNextCollectMetrics(metrics, false);
        if (job.isCyclic()) {
            if (job.isSd()) {
                commonDataQueue.sendServiceDiscoveryData(arrowVector);
            }

            // If it is an asynchronous periodic cyclic task, directly response the collected data
            commonDataQueue.sendMetricsData(arrowVector);
            if (log.isDebugEnabled()) {
                log.debug("Cyclic Job: {} - {} - {}", job.getMonitorId(), job.getApp(), arrowVector.getMetadataAsString(MetricDataConstants.METRICS));
                debugLogFieldAndValue(arrowVector);
            }

            // If metricsSet is null, it means that the execution is completed or whether the priority of the collection metrics is 0, that is, the availability collection metrics.
            // If the availability collection fails, the next metrics scheduling will be cancelled and the next round of scheduling will be entered directly.
            boolean isAvailableCollectFailed = metricsSet != null && !metricsSet.isEmpty()
                    && metrics.getPriority() == (byte) 0 && isCollectFailed;
            if (metricsSet == null || isAvailableCollectFailed || job.isSd()) {
                // The collection and execution task of this job are completed.
                // The periodic task pushes the task to the time wheel again.
                // First, determine the execution time of the task and the task collection interval.
                if (timeout.isCancelled()) {
                    return;
                }
                long spendTime = System.currentTimeMillis() - job.getDispatchTime();
                long interval = job.getInterval() - spendTime / 1000;
                interval = interval <= 0 ? 0 : interval;
                // Reset Construction Execution Metrics Task View 
                job.constructPriorMetrics();
                timerDispatch.cyclicJob(timerJob, interval, TimeUnit.SECONDS);
            } else if (!metricsSet.isEmpty()) {
                // The execution of the current level metrics is completed, and the execution of the next level metrics starts
                // use pre collect metrics data to replace next metrics config params
                List<Map<String, Configmap>> configmapList = getConfigmapFromPreCollectData(arrowVector);
                if (configmapList.size() == ENV_CONFIG_SIZE) {
                    job.addEnvConfigmaps(configmapList.get(0));
                }
                for (Metrics metricItem : metricsSet) {
                    Set<String> cryPlaceholderFields = CollectUtil.matchCryPlaceholderField(GSON.toJsonTree(metricItem));
                    if (cryPlaceholderFields.isEmpty()) {
                        MetricsCollect metricsCollect = new MetricsCollect(metricItem, timeout, this,
                                collectorIdentity, unitConvertList);
                        jobRequestQueue.addJob(metricsCollect);
                        metricsTimeoutMonitorMap.put(job.getId() + "-" + metricItem.getName(),
                                new MetricsTime(System.currentTimeMillis(), metricItem, timeout));
                        continue;
                    }
                    boolean isSubTask = configmapList.stream().anyMatch(map -> map.keySet().stream().anyMatch(cryPlaceholderFields::contains));
                    int subTaskNum = isSubTask ? Math.min(configmapList.size(), MAX_SUB_TASK_NUM) : 1;
                    AtomicInteger subTaskNumAtomic = new AtomicInteger(subTaskNum);
                    AtomicReference<ArrowVector> metricsDataReference = new AtomicReference<>();
                    for (int index = 0; index < subTaskNum; index++) {
                        Map<String, Configmap> configmap = new HashMap<>(job.getEnvConfigmaps());
                        if (isSubTask) {
                            Map<String, Configmap> preConfigMap = configmapList.get(index);
                            configmap.putAll(preConfigMap);
                        }
                        JsonElement metricJson = GSON.toJsonTree(metricItem);
                        CollectUtil.replaceCryPlaceholder(metricJson, configmap);
                        Metrics metric = GSON.fromJson(metricJson, Metrics.class);
                        metric.setSubTaskNum(subTaskNumAtomic);
                        metric.setSubTaskId(index);
                        metric.setSubTaskDataRef(metricsDataReference);
                        MetricsCollect metricsCollect = new MetricsCollect(metric, timeout, this,
                                collectorIdentity, unitConvertList);
                        jobRequestQueue.addJob(metricsCollect);
                        metricsTimeoutMonitorMap.put(job.getId() + "-" + metric.getName() + "-sub-" + index,
                                new MetricsTime(System.currentTimeMillis(), metric, timeout));
                    }

                }
            } else {
                // The list of metrics at the current execution level has not been fully executed.
                // It needs to wait for the execution of other metrics task of the same level to complete the execution and enter the next level for execution.
            }
        } else {
            // If it is a temporary one-time task, you need to wait for the collected data of all metrics task to be packaged and returned.
            // Insert the current metrics data into the job for unified assembly
            job.addCollectMetricsData(arrowVector);
            if (log.isDebugEnabled()) {
                log.debug("One-time Job: {}", arrowVector.getMetadataAsString(MetricDataConstants.METRICS));
                debugLogFieldAndValue(arrowVector);
            }

            if (job.isSd() || metricsSet == null) {
                // The collection and execution of all metrics of this job are completed
                // and the result listener is notified of the combination of all metrics data
                timerDispatch.responseSyncJobData(job.getId(), job.getResponseDataTemp());
            } else if (!metricsSet.isEmpty()) {
                // The execution of the current level metrics is completed, and the execution of the next level metrics starts
                metricsSet.forEach(metricItem -> {
                    MetricsCollect metricsCollect = new MetricsCollect(metricItem, timeout, this,
                            collectorIdentity, unitConvertList);
                    jobRequestQueue.addJob(metricsCollect);
                    metricsTimeoutMonitorMap.put(job.getId() + "-" + metricItem.getName(),
                            new MetricsTime(System.currentTimeMillis(), metricItem, timeout));
                });
            } else {
                // The list of metrics task at the current execution level has not been fully executed.
                // It needs to wait for the execution of other metrics task of the same level to complete the execution and enter the next level for execution.
            }
        }
    }

    private void debugLogFieldAndValue(ArrowVector arrowVector) {
        try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(arrowVector)) {
            RowWrapper rowWrapper = arrowVectorReader.readRow();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();

                rowWrapper.cellStream().forEach(cell -> log.debug("Field-->{},Value-->{}", cell.getField().getName(), cell.getValue()));
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void dispatchCollectData(Timeout timeout, Metrics metrics, List<ArrowVector> arrowVectorList) {
        WheelTimerTask timerJob = (WheelTimerTask) timeout.task();
        Job job = timerJob.getJob();
        metricsTimeoutMonitorMap.remove(String.valueOf(job.getId()));
        if (job.isCyclic()) {
            // If it is an asynchronous periodic cyclic task, directly response the collected data
            arrowVectorList.forEach(commonDataQueue::sendMetricsData);
            // The collection and execution of all task of this job are completed.
            // The periodic task pushes the task to the time wheel again.
            // First, determine the execution time of the task and the task collection interval.
            if (timeout.isCancelled()) {
                return;
            }
            long spendTime = System.currentTimeMillis() - job.getDispatchTime();
            long interval = job.getInterval() - spendTime / 1000;
            interval = interval <= 0 ? 0 : interval;
            // Reset Construction Execution Metrics Task View 
            job.constructPriorMetrics();
            timerDispatch.cyclicJob(timerJob, interval, TimeUnit.SECONDS);
        } else {
            // The collection and execution of all metrics of this job are completed
            // and the result listener is notified of the combination of all metrics data
            timerDispatch.responseSyncJobData(job.getId(), arrowVectorList);
        }
        
    }

    private List<Map<String, Configmap>> getConfigmapFromPreCollectData(ArrowVector arrowVector) {
        try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(arrowVector)) {
            if (arrowVectorReader.getRowCount() <= 0 || arrowVectorReader.getAllFields().isEmpty()) {
                return new ArrayList<>();
            }

            List<Map<String, Configmap>> mapList = new ArrayList<>();
            RowWrapper rowWrapper = arrowVectorReader.readRow();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();

                if (rowWrapper.getFieldList().size() != arrowVectorReader.getAllFields().size()) {
                    continue;
                }

                Map<String, Configmap> configmapMap = Maps.newHashMapWithExpectedSize(rowWrapper.getFieldList().size());
                rowWrapper.cellStream().forEach(cell -> {
                    String value = cell.getValue();
                    Configmap configmap = new Configmap(cell.getField().getName(), value, cell.getMetadataAsInteger(MetricDataConstants.TYPE).byteValue());
                    configmapMap.put(cell.getField().getName(), configmap);
                });
                mapList.add(configmapMap);
            }

            return mapList;
        } catch (Exception ignored) {
        }

        return new ArrayList<>();
    }

    /**
     * Metrics times.
     */
    @Data
    @AllArgsConstructor
    protected static class MetricsTime {
        private long startTime;
        private Metrics metrics;
        private Timeout timeout;
    }
}
