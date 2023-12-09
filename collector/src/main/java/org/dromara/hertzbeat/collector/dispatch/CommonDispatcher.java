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

package org.dromara.hertzbeat.collector.dispatch;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.collector.dispatch.timer.Timeout;
import org.dromara.hertzbeat.collector.dispatch.timer.TimerDispatch;
import org.dromara.hertzbeat.collector.dispatch.timer.WheelTimerTask;
import org.dromara.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.entity.job.Configmap;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Collection task and response data scheduler
 * @author tomsun28
 */
@Component
@Slf4j
public class CommonDispatcher implements MetricsTaskDispatch, CollectDataDispatch, DisposableBean {

    /**
     * Collection task timeout value
     */
    private static final long DURATION_TIME = 240_000L;
    /**
     * Trigger sub task max num
     */
    private static final int MAX_SUB_TASK_NUM = 50;
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

    private final ThreadPoolExecutor poolExecutor;

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
        poolExecutor = new ThreadPoolExecutor(2, 2, 1,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(), r -> {
            Thread thread = new Thread(r);
            thread.setDaemon(true);
            return thread;
        });
        this.start();
    }

    public void start() {
        try {
            // Pull the collection task from the task queue and put it into the thread pool for execution
            poolExecutor.execute(() -> {
                Thread.currentThread().setName("metrics-task-dispatcher");
                while (!Thread.currentThread().isInterrupted()) {
                    MetricsCollect metricsCollect = null;
                    try {
                        metricsCollect = jobRequestQueue.getJob();
                        if (metricsCollect != null) {
                            workerPool.executeJob(metricsCollect);
                        }
                    } catch (RejectedExecutionException rejected) {
                        log.info("[Dispatcher]-the worker pool is full, reject this metrics task, " +
                                "sleep and put in queue again.");
                        try {
                            Thread.sleep(1000);
                            if (metricsCollect != null) {
                                metricsCollect.setRunPriority((byte) (metricsCollect.getRunPriority() + 1));
                                jobRequestQueue.addJob(metricsCollect);
                            }
                        } catch (InterruptedException ignored) {
                            log.info("[Dispatcher]-metrics-task-dispatcher has been interrupt when sleep to close.");
                            Thread.currentThread().interrupt();
                        }
                    } catch (InterruptedException interruptedException) {
                        log.info("[Dispatcher]-metrics-task-dispatcher has been interrupt to close.");
                        Thread.currentThread().interrupt();
                    } catch (Exception e) {
                        log.error("[Dispatcher]-{}.", e.getMessage(), e);
                    }
                }
            });
            // Monitoring metrics collection task execution time
            poolExecutor.execute(() -> {
                Thread.currentThread().setName("metrics-task-monitor");
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        // Detect whether the collection unit of each metrics has timed out for 4 minutes,
                        // and if it times out, it will be discarded and an exception will be returned.
                        long deadline = System.currentTimeMillis() - DURATION_TIME;
                        for (Map.Entry<String, MetricsTime> entry : metricsTimeoutMonitorMap.entrySet()) {
                            MetricsTime metricsTime = entry.getValue();
                            if (metricsTime.getStartTime() < deadline) {
                                // Metrics collection timeout  
                                WheelTimerTask timerJob = (WheelTimerTask) metricsTime.getTimeout().task();
                                CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                                        .setId(timerJob.getJob().getMonitorId())
                                        .setTenantId(timerJob.getJob().getTenantId())
                                        .setApp(timerJob.getJob().getApp())
                                        .setMetrics(metricsTime.getMetrics().getName())
                                        .setPriority(metricsTime.getMetrics().getPriority())
                                        .setTime(System.currentTimeMillis())
                                        .setCode(CollectRep.Code.TIMEOUT).setMsg("collect timeout").build();
                                log.error("[Collect Timeout]: \n{}", metricsData);
                                if (metricsData.getPriority() == 0) {
                                    dispatchCollectData(metricsTime.timeout, metricsTime.getMetrics(), metricsData);
                                }
                                metricsTimeoutMonitorMap.remove(entry.getKey());
                            }
                        }
                        Thread.sleep(20000);
                    } catch (InterruptedException interruptedException) {
                        log.info("[Dispatcher]-metrics-task-monitor has been interrupt to close.");
                        Thread.currentThread().interrupt();
                    } catch (Exception e) {
                        log.error("[Task Monitor]-{}.", e.getMessage(), e);
                    }
                }
            });
        } catch (Exception e) {
            log.error("Common Dispatcher error: {}.", e.getMessage(), e);
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
    public void dispatchCollectData(Timeout timeout, Metrics metrics, CollectRep.MetricsData metricsData) {
        WheelTimerTask timerJob = (WheelTimerTask) timeout.task();
        Job job = timerJob.getJob();
        if (metrics.isHasSubTask()) {
            metricsTimeoutMonitorMap.remove(job.getId() + "-" + metrics.getName() + "-sub-" + metrics.getSubTaskId());
            boolean isLastTask = metrics.consumeSubTaskResponse(metricsData);
            if (isLastTask) {
                metricsData = metrics.getSubTaskDataRef().get();
            } else {
                return;
            }
        } else {
            metricsTimeoutMonitorMap.remove(job.getId() + "-" + metrics.getName());
        }
        Set<Metrics> metricsSet = job.getNextCollectMetrics(metrics, false);
        if (job.isCyclic()) {
            // If it is an asynchronous periodic cyclic task, directly response the collected data
            commonDataQueue.sendMetricsData(metricsData);
            if (log.isDebugEnabled()) {
                log.debug("Cyclic Job: {} - {} - {}", job.getMonitorId(), job.getApp(), metricsData.getMetrics());
                for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                    for (CollectRep.Field field : metricsData.getFieldsList()) {
                        log.debug("Field-->{},Value-->{}", field.getName(), valueRow.getColumns(metricsData.getFieldsList().indexOf(field)));
                    }
                }
            }
            // If metricsSet is null, it means that the execution is completed or whether the priority of the collection metrics is 0, that is, the availability collection metrics.
            // If the availability collection fails, the next metrics scheduling will be cancelled and the next round of scheduling will be entered directly.
            boolean isAvailableCollectFailed = metricsSet != null && !metricsSet.isEmpty()
                    && metrics.getPriority() == (byte) 0 && metricsData.getCode() != CollectRep.Code.SUCCESS;
            if (metricsSet == null || isAvailableCollectFailed) {
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
                List<Map<String, Configmap>> configmapList = getConfigmapFromPreCollectData(metricsData);
                for (Metrics metricItem : metricsSet) {
                    if (CollectionUtils.isEmpty(configmapList) || CollectUtil.notContainCryPlaceholder(GSON.toJsonTree(metricItem))) {
                        MetricsCollect metricsCollect = new MetricsCollect(metricItem, timeout, this, 
                                collectorIdentity, unitConvertList);
                        jobRequestQueue.addJob(metricsCollect);
                        metricsTimeoutMonitorMap.put(job.getId() + "-" + metricItem.getName(),
                                new MetricsTime(System.currentTimeMillis(), metricItem, timeout));
                        continue;
                    }

                    int subTaskNum = Math.min(configmapList.size(), MAX_SUB_TASK_NUM);
                    AtomicInteger subTaskNumAtomic = new AtomicInteger(subTaskNum);
                    AtomicReference<CollectRep.MetricsData> metricsDataReference = new AtomicReference<>();
                    for (int index = 0; index < subTaskNum; index++) {
                        Map<String, Configmap> configmap = configmapList.get(index);
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
            job.addCollectMetricsData(metricsData);
            if (log.isDebugEnabled()) {
                log.debug("One-time Job: {}", metricsData.getMetrics());
                for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                    for (CollectRep.Field field : metricsData.getFieldsList()) {
                        log.debug("Field-->{},Value-->{}", field.getName(), valueRow.getColumns(metricsData.getFieldsList().indexOf(field)));
                    }
                }
            }
            if (metricsSet == null) {
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

    @Override
    public void dispatchCollectData(Timeout timeout, Metrics metrics, List<CollectRep.MetricsData> metricsDataList) {
        WheelTimerTask timerJob = (WheelTimerTask) timeout.task();
        Job job = timerJob.getJob();
        metricsTimeoutMonitorMap.remove(String.valueOf(job.getId()));
        if (job.isCyclic()) {
            // If it is an asynchronous periodic cyclic task, directly response the collected data
            metricsDataList.forEach(commonDataQueue::sendMetricsData);
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
            timerDispatch.responseSyncJobData(job.getId(), metricsDataList);
        }
        
    }

    private List<Map<String, Configmap>> getConfigmapFromPreCollectData(CollectRep.MetricsData metricsData) {
        if (metricsData.getValuesCount() <= 0 || metricsData.getFieldsCount() <= 0) {
            return null;
        }
        List<Map<String, Configmap>> mapList = new LinkedList<>();
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            if (valueRow.getColumnsCount() != metricsData.getFieldsCount()) {
                continue;
            }
            Map<String, Configmap> configmapMap = new HashMap<>(valueRow.getColumnsCount());
            int index = 0;
            for (CollectRep.Field field : metricsData.getFieldsList()) {
                String value = valueRow.getColumns(index);
                index++;
                Configmap configmap = new Configmap(field.getName(), value, Integer.valueOf(field.getType()).byteValue());
                configmapMap.put(field.getName(), configmap);
            }
            mapList.add(configmapMap);
        }
        return mapList;
    }
    
    @Override
    public void destroy() throws Exception {
        if (poolExecutor != null) {
            poolExecutor.shutdownNow();
        }
    }
    
    @Data
    @AllArgsConstructor
    private static class MetricsTime {
        private long startTime;
        private Metrics metrics;
        private Timeout timeout;
    }
}
