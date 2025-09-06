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

import com.google.gson.Gson;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.impl.DefaultContext;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.handler.ChainBootstrap;
import org.apache.hertzbeat.collector.handler.CollectMetricsDataDataStream;
import org.apache.hertzbeat.collector.listener.CalculateFieldsListener;
import org.apache.hertzbeat.collector.listener.MetricsDataDeliveryListener;
import org.apache.hertzbeat.collector.listener.RemoveTimeoutMonitorListener;
import org.apache.hertzbeat.collector.listener.RerunDataStream;
import org.apache.hertzbeat.collector.listener.ResponseJobDataListener;
import org.apache.hertzbeat.collector.listener.ValidateResponseListener;
import org.apache.hertzbeat.collector.metrics.HertzBeatMetricsCollector;
import org.apache.hertzbeat.collector.handler.impl.BatchExecuteTaskChain;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.collector.CollectorMetaData;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

/**
 * Collection task and response data scheduler
 */
@Component
@Slf4j
public class CommonDispatcher implements MetricsTaskDispatch, CollectDataDispatch {

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

    private final List<UnitConvert> unitConvertList;

    private final WorkerPool workerPool;

    private final CollectorMetaData metaData;

    private final CollectTaskTimeoutMonitor collectTaskTimeoutMonitor;

    @Autowired
    private HertzBeatMetricsCollector metricsCollector;

    public CommonDispatcher(MetricsCollectorQueue jobRequestQueue,
                            TimerDispatch timerDispatch,
                            CommonDataQueue commonDataQueue,
                            WorkerPool workerPool,
                            CollectJobService collectJobService,
                            List<UnitConvert> unitConvertList,
                            CollectTaskTimeoutMonitor collectTaskTimeoutMonitor) {
        this.commonDataQueue = commonDataQueue;
        this.jobRequestQueue = jobRequestQueue;
        this.timerDispatch = timerDispatch;
        this.unitConvertList = unitConvertList;
        this.workerPool = workerPool;
        this.metaData = CollectorMetaData.builder()
                .identity(collectJobService.getCollectorIdentity())
                .mode(collectJobService.getCollectorMode())
                .startTime(new Date())
                .build();
        this.collectTaskTimeoutMonitor = collectTaskTimeoutMonitor;
//        this.start();
        this.collectTaskTimeoutMonitor.start(this);
    }

    @Deprecated
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
                        log.warn("[Dispatcher]-the worker pool is full, reject this metrics task，put in queue again.");
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
        } catch (Exception e) {
            log.error("Common Dispatcher error: {}.", e.getMessage(), e);
        }
    }

    @Override
    public void dispatchMetricsTask(Timeout timeout) {
        // Divide the collection task of a single application into corresponding collection tasks of the metrics under it.
        // Put each collect task into the thread pool for scheduling
        WheelTimerTask timerTask = (WheelTimerTask) timeout.task();
        Job job = timerTask.getJob();

        ChainBootstrap bootstrap = constructMetricsCollectTaskChain(job);
        //todo context需要划分作用域
        bootstrap.addContext(ContextKey.META_DATA, metaData)
                .addContext(ContextKey.JOB, job)
                .addContext(ContextKey.TIMEOUT, timeout)
                .addListener(new CalculateFieldsListener(unitConvertList))
                .addListener(new ValidateResponseListener())
                .onEachDataStreamComplete(new RemoveTimeoutMonitorListener(collectTaskTimeoutMonitor));

        if (job.isCyclic()) {
            bootstrap.withWorkerPool(workerPool)
                    .addListener(new MetricsDataDeliveryListener(commonDataQueue))
                    .onComplete(new RerunDataStream(timerDispatch));
        } else {
            bootstrap.addListener(new ResponseJobDataListener(timerDispatch));
        }


        bootstrap.start();
    }

    private ChainBootstrap constructMetricsCollectTaskChain(Job job) {
        long now = System.currentTimeMillis();
        Map<Byte, List<Metrics>> currentCollectMetrics = job.getMetrics().stream()
                .filter(metrics -> (now >= metrics.getCollectTime() + metrics.getInterval() * 1000L))
                .peek(metric -> {
                    metric.setCollectTime(now);
                    // Determine whether to configure aliasFields If not, configure the default
                    if ((metric.getAliasFields() == null || metric.getAliasFields().isEmpty()) && metric.getFields() != null) {
                        metric.setAliasFields(metric.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList()));
                    }
                    // Set the default metrics execution priority, if not filled, the default last priority
                    if (metric.getPriority() == null) {
                        metric.setPriority(Byte.MAX_VALUE);
                    }
                })
                .collect(Collectors.groupingBy(Metrics::getPriority));

        // the current collect metrics can not empty, if empty, add a default availability metrics
        // due the metric collect is trigger by the previous metric collect
        if (currentCollectMetrics.isEmpty()) {
            Optional<Metrics> defaultMetricOption = job.getMetrics().stream()
                    .filter(metric -> metric.getPriority() == CommonConstants.AVAILABLE_METRICS).findFirst();
            if (defaultMetricOption.isPresent()) {
                Metrics defaultMetric = defaultMetricOption.get();
                defaultMetric.setCollectTime(now);
                currentCollectMetrics.put(CommonConstants.AVAILABLE_METRICS, Collections.singletonList(defaultMetric));
            } else {
                log.error("metrics must has one priority 0 metrics at least.");
            }
        }

        ChainBootstrap chainBootstrap = ChainBootstrap.withContext(DefaultContext.newInstance())
                .withChain(new BatchExecuteTaskChain<Metrics>());
        // order by priority
        currentCollectMetrics.keySet().stream()
                .sorted()
                .forEach(priority -> {
                    if (job.isCyclic() || isOneTimeJobAndIsAvailableMetrics(job, priority)) {
                        List<Metrics> metricsList = currentCollectMetrics.get(priority);
                        CollectMetricsDataDataStream collectHandler = CollectMetricsDataDataStream.builder()
                                .collectTaskTimeoutMonitor(collectTaskTimeoutMonitor)
                                .build();
                        collectHandler.setSourceDataList(metricsList);

                        chainBootstrap.addDataStream(collectHandler);
                    }
                });

        return chainBootstrap;
    }

    private boolean isOneTimeJobAndIsAvailableMetrics(Job job, byte priority) {
        return (!job.isCyclic()) && priority == CommonConstants.AVAILABLE_METRICS;
    }

    @Deprecated
    @Override
    public void dispatchCollectData(Timeout timeout, Metrics metrics, CollectRep.MetricsData metricsData) {
        WheelTimerTask timerJob = (WheelTimerTask) timeout.task();
        Job job = timerJob.getJob();
        String monitorKey = job.getId() + "-" + metrics.getName();
        if (metrics.isHasSubTask()) {
            monitorKey = monitorKey + "-sub-" + metrics.getSubTaskId();
        }
        CollectTaskTimeoutMonitor.MetricsTime metricsTime = this.collectTaskTimeoutMonitor.removeMetrics(monitorKey);

        // job completed metrics
        if (metricsTime != null && metricsCollector != null) {
            long duration = System.currentTimeMillis() - metricsTime.getStartTime();
            String status = metricsData.getCode() == CollectRep.Code.SUCCESS ? "success" : "fail";
            metricsCollector.recordCollectMetrics(job, duration, status);
        }
        if (metrics.isHasSubTask()) {
            boolean isLastTask = metrics.consumeSubTaskResponse(metricsData);
            if (isLastTask) {
                metricsData = metrics.getSubTaskDataRef().get().build();
            } else {
                return;
            }
        }


        Set<Metrics> metricsSet = job.getNextCollectMetrics(metrics, false);
        if (job.isCyclic()) {
            cyclicJobDebugLog(job, metricsData);

            // If metricsSet is null, it means that the execution is completed or whether the priority of the collection metrics is 0, that is, the availability collection metrics.
            // If the availability collection fails, the next metrics scheduling will be cancelled and the next round of scheduling will be entered directly.
            boolean isAvailableCollectFailed = metricsSet != null && !metricsSet.isEmpty()
                    && metrics.getPriority() == CommonConstants.AVAILABLE_METRICS && metricsData.getCode() != CollectRep.Code.SUCCESS;
            if (metricsSet == null || isAvailableCollectFailed || job.isSd()) {
                // The collection and execution task of this job are completed.
                // The periodic task pushes the task to the time wheel again.
                // First, determine the execution time of the task and the task collection interval.
                if (!timeout.isCancelled()) {
                    long spendTime = System.currentTimeMillis() - job.getDispatchTime();
                    long interval = job.getInterval() - spendTime / 1000L;
                    interval = interval <= 0 ? 0 : interval;
                    timerDispatch.cyclicJob(timerJob, interval, TimeUnit.SECONDS);
                }
            }
            else if (!metricsSet.isEmpty()) {
                // The execution of the current level metrics is completed, and the execution of the next level metrics starts
                // use pre collect metrics data to replace next metrics config params
                List<Map<String, Configmap>> configmapList = CollectUtil.getConfigmapFromPreCollectData(metricsData);
                if (configmapList.size() == ENV_CONFIG_SIZE) {
                    job.addEnvConfigmaps(configmapList.get(0));
                }
                for (Metrics metricItem : metricsSet) {
                    Set<String> cryPlaceholderFields = CollectUtil.matchCryPlaceholderField(GSON.toJsonTree(metricItem));
                    if (cryPlaceholderFields.isEmpty()) {
                        MetricsCollect metricsCollect = new MetricsCollect(metricItem, timeout, this,
                                metaData.getIdentity(), unitConvertList);
                        jobRequestQueue.addJob(metricsCollect);

                        this.collectTaskTimeoutMonitor.putMetrics(job.getId() + "-" + metricItem.getName(),
                                new CollectTaskTimeoutMonitor.MetricsTime(System.currentTimeMillis(), metricItem, timeout));
                        continue;
                    }


                    boolean isSubTask = configmapList.stream().anyMatch(map -> map.keySet().stream().anyMatch(cryPlaceholderFields::contains));
                    int subTaskNum = isSubTask ? Math.min(configmapList.size(), MAX_SUB_TASK_NUM) : 1;
                    AtomicInteger subTaskNumAtomic = new AtomicInteger(subTaskNum);
                    AtomicReference<CollectRep.MetricsData.Builder> metricsDataReference = new AtomicReference<>();
                    for (int index = 0; index < subTaskNum; index++) {
                        Map<String, Configmap> configmap = new HashMap<>(job.getEnvConfigmaps());
                        if (isSubTask) {
                            Map<String, Configmap> preConfigMap = configmapList.get(index);
                            configmap.putAll(preConfigMap);
                        }
                        Metrics metric = CollectUtil.replaceCryPlaceholderToMetrics(metricItem, configmap);
                        metric.setSubTaskNum(subTaskNumAtomic);
                        metric.setSubTaskId(index);
                        metric.setSubTaskDataRef(metricsDataReference);
                        MetricsCollect metricsCollect = new MetricsCollect(metric, timeout, this,
                                metaData.getIdentity(), unitConvertList);
                        jobRequestQueue.addJob(metricsCollect);

                        this.collectTaskTimeoutMonitor.putMetrics(job.getId() + "-" + metric.getName() + "-sub-" + index,
                                new CollectTaskTimeoutMonitor.MetricsTime(System.currentTimeMillis(), metric, timeout));
                    }

                }
            }
        }
    }

    private void cyclicJobDebugLog(Job job, CollectRep.MetricsData metricsData) {
        if (log.isDebugEnabled()) {
            log.debug("Cyclic Job: {} - {} - {}", job.getMonitorId(), job.getApp(), metricsData.getMetrics());
            metricsDataDebugLog(metricsData);
        }
    }

    private void metricsDataDebugLog(CollectRep.MetricsData metricsData) {
        for (CollectRep.ValueRow valueRow : metricsData.getValues()) {
            for (CollectRep.Field field : metricsData.getFields()) {
                log.debug("Field-->{},Value-->{}", field.getName(), valueRow.getColumns(metricsData.getFields().indexOf(field)));
            }
        }
    }
}