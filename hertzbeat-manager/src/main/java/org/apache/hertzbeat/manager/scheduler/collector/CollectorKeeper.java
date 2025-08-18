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

package org.apache.hertzbeat.manager.scheduler.collector;

import org.apache.hertzbeat.common.constants.CollectorStatus;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.manager.pojo.CollectorNode;
import org.apache.hertzbeat.manager.scheduler.AssignJobs;

import java.util.function.BiConsumer;

/**
 * Holds all collectors info and provides operations to collector
 */
public interface CollectorKeeper {
    void addNode(CollectorNode newNode);

    /**
     * Add job to collector node
     * @param job job
     * @param collectorId collector node id
     * @return collector node
     */
    CollectorNode addJob(Job job, String collectorId);

    /**
     * Get collector node corresponding to collector id
     * @param collectorId collectorId
     * @return collector node
     */
    CollectorNode getNode(String collectorId);

    /**
     * Determine to which collector node should this job be allocated
     * @param jobId job id
     * @return collector node
     */
    CollectorNode determineNode(Long jobId);

    /**
     * Change collector node status
     * @param collectorId collector id
     * @param collectorStatus collector status
     */
    void changeStatus(String collectorId, CollectorStatus collectorStatus);

    /**
     * Reallocate jobs when collector's status has changed
     */
    void rebalanceJobs(BiConsumer<AssignJobs, String> assignJobCollectorConsumer);

    /**
     * Remove job by job id
     * @param jobId job id
     * @return collector node on which removed job was
     */
    CollectorNode removeJob(Long jobId);
}
