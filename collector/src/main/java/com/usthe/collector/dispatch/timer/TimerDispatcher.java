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

package com.usthe.collector.dispatch.timer;

import com.usthe.collector.dispatch.entrance.internal.CollectResponseEventListener;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.message.CollectRep;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * @author tomsun28
 * @date 2021/10/17 23:06
 */
@Component
public class TimerDispatcher implements TimerDispatch {

    /**
     * time round schedule
     * 时间轮调度
     */
    private Timer wheelTimer;
    /**
     * Existing periodic scheduled tasks
     * 已存在的周期性调度任务
     */
    private Map<Long, Timeout> currentCyclicTaskMap;
    /**
     * Existing temporary scheduled tasks
     * 已存在的临时性调度任务
     */
    private Map<Long, Timeout> currentTempTaskMap;
    /**
     * One-time task response listener holds
     * 一次性任务响应监听器持有
     * jobId - listener
     */
    private Map<Long, CollectResponseEventListener> eventListeners;

    public TimerDispatcher() {
        this.wheelTimer = new HashedWheelTimer(r -> {
            Thread ret = new Thread(r, "wheelTimer");
            ret.setDaemon(true);
            return ret;
        }, 1, TimeUnit.SECONDS, 512);
        this.currentCyclicTaskMap = new ConcurrentHashMap<>(1024);
        this.currentTempTaskMap = new ConcurrentHashMap<>(64);
        eventListeners = new ConcurrentHashMap<>(64);
    }

    @Override
    public void addJob(Job addJob, CollectResponseEventListener eventListener) {
        WheelTimerTask timerJob = new WheelTimerTask(addJob);
        if (addJob.isCyclic()) {
            Timeout timeout = wheelTimer.newTimeout(timerJob, addJob.getInterval(), TimeUnit.SECONDS);
            currentCyclicTaskMap.put(addJob.getId(), timeout);
        } else {
            Timeout timeout = wheelTimer.newTimeout(timerJob, 0, TimeUnit.SECONDS);
            currentTempTaskMap.put(addJob.getId(), timeout);
            eventListeners.put(addJob.getId(), eventListener);
        }
    }

    @Override
    public void cyclicJob(WheelTimerTask timerTask, long interval, TimeUnit timeUnit) {
        Long jobId = timerTask.getJob().getId();
        // 判断此周期性job是否已经被取消
        if (currentCyclicTaskMap.containsKey(jobId)) {
            Timeout timeout = wheelTimer.newTimeout(timerTask, interval, TimeUnit.SECONDS);
            currentCyclicTaskMap.put(timerTask.getJob().getId(), timeout);
        }
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
    public void responseSyncJobData(long jobId, List<CollectRep.MetricsData> metricsDataTemps) {
        currentTempTaskMap.remove(jobId);
        CollectResponseEventListener eventListener = eventListeners.remove(jobId);
        if (eventListener != null) {
            eventListener.response(metricsDataTemps);
        }
    }
}
