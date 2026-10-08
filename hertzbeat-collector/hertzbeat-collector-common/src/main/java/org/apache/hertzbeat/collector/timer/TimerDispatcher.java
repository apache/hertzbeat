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

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.constants.ScheduleTypeEnum;
import org.apache.hertzbeat.collector.dispatch.MetricsTaskDispatch;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectResponseEventListener;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.HashedWheelTimer;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.timer.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.scheduling.support.CronExpression;
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

    private final Supplier<MetricsTaskDispatch> metricsTaskDispatchSupplier;

    public TimerDispatcher() {
        this(() -> timeout -> {
        });
    }

    @Autowired
    public TimerDispatcher(ObjectProvider<MetricsTaskDispatch> metricsTaskDispatchProvider) {
        this(resolveMetricsTaskDispatchSupplier(metricsTaskDispatchProvider));
    }

    /**
     * Tick duration for the shared wheel timer.
     * Kept at 100ms so cyclic delays computed in milliseconds are not truncated to whole seconds.
     */
    private static final long WHEEL_TICK_DURATION_MS = 100L;

    private TimerDispatcher(Supplier<MetricsTaskDispatch> metricsTaskDispatchSupplier) {
        this.wheelTimer = new HashedWheelTimer(r -> {
            Thread ret = new Thread(r, "wheelTimer");
            ret.setDaemon(true);
            return ret;
        }, WHEEL_TICK_DURATION_MS, TimeUnit.MILLISECONDS, 512);
        this.currentCyclicTaskMap = new ConcurrentHashMap<>(8);
        this.currentTempTaskMap = new ConcurrentHashMap<>(8);
        this.eventListeners = new ConcurrentHashMap<>(8);
        this.started = new AtomicBoolean(true);
        this.metricsTaskDispatchSupplier = metricsTaskDispatchSupplier;
    }

    private static Supplier<MetricsTaskDispatch> resolveMetricsTaskDispatchSupplier(
            ObjectProvider<MetricsTaskDispatch> metricsTaskDispatchProvider) {
        if (metricsTaskDispatchProvider == null) {
            return () -> timeout -> {
            };
        }
        return metricsTaskDispatchProvider::getObject;
    }

    @Override
    public void addJob(Job addJob, CollectResponseEventListener eventListener) {
        if (!this.started.get()) {
            log.warn("Collector is offline, can not dispatch collect jobs.");
            return;
        }
        // Delay dispatcher lookup to avoid a startup cycle with CommonDispatcher.
        WheelTimerTask timerJob = new WheelTimerTask(addJob, metricsTaskDispatchSupplier);
        if (addJob.isCyclic()) {
            long nextExecutionTimeMs = initialCyclicDelay(addJob);
            Timeout timeout = wheelTimer.newTimeout(timerJob, nextExecutionTimeMs, TimeUnit.MILLISECONDS);
            cancelPreviousTimeout(currentCyclicTaskMap.put(addJob.getId(), timeout));
        } else {
            for (Metrics metric : addJob.getMetrics()) {
                metric.setInterval(0L);
            }
            addJob.setIntervals(new ConcurrentLinkedDeque<>(List.of(0L)));
            Timeout timeout = wheelTimer.newTimeout(timerJob, addJob.getInterval(), TimeUnit.SECONDS);
            cancelPreviousTimeout(currentTempTaskMap.put(addJob.getId(), timeout));
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
            Timeout timeout = wheelTimer.newTimeout(timerTask, interval, timeUnit);
            cancelPreviousTimeout(currentCyclicTaskMap.put(timerTask.getJob().getId(), timeout));
        }
    }

    @Override
    public void cyclicJob(WheelTimerTask timerTask) {
        Job job = timerTask.getJob();
        Long nextExecutionTimeMs = getNextExecutionInterval(job);
        cyclicJob(timerTask, nextExecutionTimeMs, TimeUnit.MILLISECONDS);
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

    private void cancelPreviousTimeout(Timeout previousTimeout) {
        if (previousTimeout != null) {
            previousTimeout.cancel();
        }
    }

    /**
     * Interval jobs get a random first-run phase: a restart re-adds every job at once,
     * and a shared phase makes them all collect at the same instant forever. Cron jobs
     * keep their meaningful phase; already-executed or re-added jobs keep theirs.
     *
     * @return delay until the first run, in milliseconds
     */
    long initialCyclicDelay(Job addJob) {
        long nextExecutionTimeMs = getNextExecutionInterval(addJob);
        boolean fixedPhase = ScheduleTypeEnum.CRON.getType().equals(addJob.getScheduleType());
        // Only jitter when the configured interval is greater than one second.
        if (!fixedPhase && addJob.getDispatchTime() <= 0
                && !currentCyclicTaskMap.containsKey(addJob.getId()) && nextExecutionTimeMs > 1000L) {
            nextExecutionTimeMs = ThreadLocalRandom.current().nextLong(nextExecutionTimeMs) + 1;
        }
        return nextExecutionTimeMs;
    }

    /**
     * Remaining delay until the next cyclic execution.
     *
     * @return delay in milliseconds; callers must schedule with {@link TimeUnit#MILLISECONDS}
     */
    public Long getNextExecutionInterval(Job job) {
        if (ScheduleTypeEnum.CRON.getType().equals(job.getScheduleType()) && job.getCronExpression() != null && !job.getCronExpression().isEmpty()) {
            try {
                CronExpression cronExpression = CronExpression.parse(job.getCronExpression());
                ZonedDateTime nextExecutionTime = cronExpression.next(ZonedDateTime.now());
                long delayMs = Duration.between(ZonedDateTime.now(), nextExecutionTime).toMillis();
                return Math.max(0, delayMs);
            } catch (Exception e) {
                log.error("Invalid cron expression: {}", job.getCronExpression(), e);
                // Fall back to interval scheduling if cron is invalid
                return toMillis(job.getInterval());
            }
        } else {
            if (job.getDispatchTime() > 0) {
                long spendTime = System.currentTimeMillis() - job.getDispatchTime();
                // Keep millisecond remainder so a 30s interval with a 300ms collection
                // reschedules after ~29.7s instead of truncating to 29s and drifting early.
                long intervalMs = toMillis(job.getInterval()) - spendTime;
                return Math.max(0, intervalMs);
            }
            return toMillis(job.getInterval());
        }
    }

    private static long toMillis(long intervalSeconds) {
        return Math.max(0, intervalSeconds) * 1000L;
    }

}
