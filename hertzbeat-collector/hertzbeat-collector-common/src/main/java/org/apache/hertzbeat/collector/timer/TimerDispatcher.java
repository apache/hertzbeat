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

package org.apache.hertzbeat.collector.timer;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import com.ctc.wstx.util.StringUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.constants.ScheduleTypeEnum;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectResponseEventListener;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.HashedWheelTimer;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.timer.Timer;
import org.apache.hertzbeat.common.util.StrUtil;
import org.quartz.CronExpression;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;

/**
 * job timer dispatcher
 */
@Component
@Slf4j
public class TimerDispatcher implements TimerDispatch, DisposableBean {

    /**
     * time round schedule
     */
    private final Timer wheelTimer;
    /**
     * Existing periodic scheduled tasks
     */
    private final Map<Long, Timeout> currentCyclicTaskMap;
    /**
     * Existing temporary scheduled tasks
     */
    private final Map<Long, Timeout> currentTempTaskMap;
    /**
     * One-time task response listener holds
     * jobId - listener
     */
    private final Map<Long, CollectResponseEventListener> eventListeners;

    /**
     * is dispatcher online running
     */
    private final AtomicBoolean started;

    public TimerDispatcher() {
        this.wheelTimer = new HashedWheelTimer(r -> {
            Thread ret = new Thread(r, "wheelTimer");
            ret.setDaemon(true);
            return ret;
        }, 1, TimeUnit.SECONDS, 512);
        this.currentCyclicTaskMap = new ConcurrentHashMap<>(8);
        this.currentTempTaskMap = new ConcurrentHashMap<>(8);
        this.eventListeners = new ConcurrentHashMap<>(8);
        this.started = new AtomicBoolean(true);
    }


    @Override
    public void addJob(Job addJob, CollectResponseEventListener eventListener) {
        if (!this.started.get()) {
            log.warn("Collector is offline, can not dispatch collect jobs.");
            return;
        }
        WheelTimerTask timerJob = new WheelTimerTask(addJob);
        if (addJob.isCyclic()) {
            Long nextExecutionTime = getNextExecutionInterval(addJob);
            Timeout timeout = wheelTimer.newTimeout(timerJob, nextExecutionTime, TimeUnit.SECONDS);
            currentCyclicTaskMap.put(addJob.getId(), timeout);
        } else {
            for (Metrics metric : addJob.getMetrics()) {
                metric.setInterval(0L);
            }
            addJob.setIntervals(new ConcurrentLinkedDeque<>(List.of(0L)));
            Timeout timeout = wheelTimer.newTimeout(timerJob, addJob.getInterval(), TimeUnit.SECONDS);
            currentTempTaskMap.put(addJob.getId(), timeout);
            eventListeners.put(addJob.getId(), eventListener);
        }
    }

    @Override
    public void cyclicJob(WheelTimerTask timerTask, long interval, TimeUnit timeUnit) {
        if (!this.started.get()) {
            log.warn("Collector is offline, can not dispatch collect jobs.");
            return;
        }
        Long jobId = timerTask.getJob().getId();
        // whether is the job has been canceled
        if (currentCyclicTaskMap.containsKey(jobId)) {
            Timeout timeout = wheelTimer.newTimeout(timerTask, interval, TimeUnit.SECONDS);
            currentCyclicTaskMap.put(timerTask.getJob().getId(), timeout);
        }
    }

    @Override
    public void cyclicJob(WheelTimerTask timerTask) {
        Job job = timerTask.getJob();
        Long nextExecutionTime = getNextExecutionInterval(job);
        cyclicJob(timerTask, nextExecutionTime, TimeUnit.SECONDS);
    }

    @Override
    public void deleteJob(long jobId, boolean isCyclic) {
        if (isCyclic) {
            Timeout timeout = currentCyclicTaskMap.remove(jobId);
            if (timeout != null) {
                timeout.cancel();
            }
        } else {
            Timeout timeout = currentTempTaskMap.remove(jobId);
            if (timeout != null) {
                timeout.cancel();
            }
        }
    }

    @Override
    public void goOnline() {
        currentCyclicTaskMap.forEach((key, value) -> value.cancel());
        currentCyclicTaskMap.clear();
        currentTempTaskMap.forEach((key, value) -> value.cancel());
        currentTempTaskMap.clear();
        started.set(true);
    }

    @Override
    public void goOffline() {
        started.set(false);
        currentCyclicTaskMap.forEach((key, value) -> value.cancel());
        currentCyclicTaskMap.clear();
        currentTempTaskMap.forEach((key, value) -> value.cancel());
        currentTempTaskMap.clear();
    }


    @Override
    public void responseSyncJobData(long jobId, List<CollectRep.MetricsData> metricsDataTemps) {
        currentTempTaskMap.remove(jobId);
        CollectResponseEventListener eventListener = eventListeners.remove(jobId);
        if (eventListener != null) {
            eventListener.response(metricsDataTemps);
        }
    }

    @Override
    public void destroy() throws Exception {
        this.wheelTimer.stop();
    }

    private Long getNextExecutionInterval(Job job) {
        if (ScheduleTypeEnum.CRON.getType().equals(job.getScheduleType()) && job.getCronExpression() != null && !job.getCronExpression().isEmpty()) {
            try {
                CronExpression cronExpression = new CronExpression(job.getCronExpression());
                Date nextExecutionTime = cronExpression.getNextValidTimeAfter(new Date());
                long delay = nextExecutionTime.getTime() - System.currentTimeMillis();
                // Convert to seconds and ensure non-negative
                return Math.max(0, delay / 1000);
            } catch (Exception e) {
                log.error("Invalid cron expression: {}", job.getCronExpression(), e);
                // Fall back to interval scheduling if cron is invalid
                return job.getInterval();
            }
        } else {
            if (job.getDispatchTime() > 0) {
                long spendTime = System.currentTimeMillis() - job.getDispatchTime();
                // Calculate remaining interval in seconds, preserving millisecond precision
                long intervalMs = job.getInterval() * 1000 - spendTime;
                // Ensure non-negative
                return Math.max(0, intervalMs / 1000);
            }
            return job.getInterval();
        }
    }


}
