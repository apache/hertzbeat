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
 * Interface for managing collector nodes and their associated jobs.
 * Maintains all collector information and provides operations for managing collectors and job assignments.
 */
public interface CollectorKeeper {

    /**
     * Adds a new collector node to the keeper's management pool.
     * @param newNode The collector node to be added to the management system
     */
    void addNode(CollectorNode newNode);

    /**
     * Assigns a monitoring job to a specific collector node.
     * @param job The monitoring job to be assigned
     * @param collectorId The unique identifier of the target collector node
     * @return The collector node that received the job assignment
     */
    CollectorNode addJob(Job job, String collectorId);

    /**
     * Retrieves a collector node by its unique identifier.
     * @param collectorId The unique identifier of the collector node
     * @return The collector node matching the given ID, or null if not found
     */
    CollectorNode getNode(String collectorId);

    /**
     * Determines the most appropriate collector node for a given job based on scheduling logic.
     * @param jobId The unique identifier of the job to be assigned
     * @return The collector node selected to handle this job
     */
    CollectorNode determineNode(Long jobId);

    /**
     * Updates the operational status of a collector node.
     * @param collectorId The unique identifier of the collector node
     * @param collectorStatus The new status to assign to the collector
     */
    void changeStatus(String collectorId, CollectorStatus collectorStatus);

    /**
     * Rebalances job assignments across collector nodes, typically triggered by status changes.
     * Uses a callback mechanism to handle job reassignments.
     * @param assignJobCollectorConsumer A biconsumer that handles the job reassignment process,
     *                                   taking the job assignment logic and collector ID as parameters
     */
    void rebalanceJobs(BiConsumer<AssignJobs, String> assignJobCollectorConsumer);

    /**
     * Removes a job from whichever collector node it is currently assigned to.
     * @param jobId The unique identifier of the job to be removed
     * @return The collector node from which the job was removed, or null if job wasn't found
     */
    CollectorNode removeJob(Long jobId);
}
