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

import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectResponseEventListener;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.message.CollectRep;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * timer dispatch service
 */
public interface TimerDispatch {

    /**
     * Add new job
     *
     * @param addJob        job
     * @param eventListener One-time synchronous task listener, asynchronous task does not need listener
     */
    void addJob(Job addJob, CollectResponseEventListener eventListener);

    /**
     * Cyclic job
     * @param timerTask timerTask
     * @param interval  collect interval
     * @param timeUnit  time unit
     */
    void cyclicJob(WheelTimerTask timerTask, long interval, TimeUnit timeUnit);

    /**
     * Delete existing job
     * @param jobId    jobId
     * @param isCyclic Whether it is a periodic task, true is, false is a temporary task
     */
    void deleteJob(long jobId, boolean isCyclic);
    
    /**
     * job dispatcher go online
     */
    void goOnline();
    
    /**
     * job dispatcher go offline
     */
    void goOffline();

    /**
     * response sync collect task data
     * @param jobId            jobId
     * @param metricsDataTemps collect data
     */
    void responseSyncJobData(long jobId, List<CollectRep.MetricsData> metricsDataTemps);
}
