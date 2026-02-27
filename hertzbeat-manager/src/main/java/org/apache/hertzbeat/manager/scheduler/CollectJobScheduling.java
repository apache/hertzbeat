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

package org.apache.hertzbeat.manager.scheduler;

import java.util.List;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * Collection job management provides api interface
 */
public interface CollectJobScheduling {

    /**
     * Execute a one-time collection task and get the collected data response
     * @param job Collect task details
     * @return Collection results
     */
    List<CollectRep.MetricsData> collectSyncJobData(Job job);
    
    /**
     * Execute a one-time collection task and get the collected data response
     * @param job Collect task details
     * @param collector collector identity name
     * @return Collection results
     */
    List<CollectRep.MetricsData> collectSyncJobData(Job job, String collector);

    /**
     * Issue periodic asynchronous collection tasks
     * @param job Collect task details
     * @param collector collector identity name
     * @return long Job ID
     */
    long addAsyncCollectJob(Job job, String collector);

    /**
     * Update the periodic asynchronous collection tasks that have been delivered
     * @param modifyJob Collect task details
     * @return long Job ID
     */
    long updateAsyncCollectJob(Job modifyJob);
    
    /**
     * Update the periodic asynchronous collection tasks that have been delivered
     * @param modifyJob Collect task details
     * @param collector collector identity name
     * @return long Job ID
     */
    long updateAsyncCollectJob(Job modifyJob, String collector);

    /**
     * Cancel periodic asynchronous collection tasks
     * @param jobId Job ID
     */
    void cancelAsyncCollectJob(Long jobId);
    
    /**
     * one-time collect job response data
     * @param metricsDataList collect data
     */
    void collectSyncJobResponse(List<CollectRep.MetricsData> metricsDataList);
}
