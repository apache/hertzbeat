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

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

/**
 * List of assigned collection tasks
 */
@Slf4j
@Data
public class AssignJobs {

    /**
     * current assign jobIds
     */
    private Set<Long> jobs;
    
    /**
     * jobs to be adding
     */
    private Set<Long> addingJobs;
    
    /**
     * jobs to be removed
     */
    private Set<Long> removingJobs;
    
    /**
     * jobs has pinned in this collector
     */
    private Set<Long> pinnedJobs;

    public AssignJobs() {
        jobs = ConcurrentHashMap.newKeySet(16);
        addingJobs = ConcurrentHashMap.newKeySet(16);
        removingJobs = ConcurrentHashMap.newKeySet(16);
        pinnedJobs = ConcurrentHashMap.newKeySet(16);
    }

    public void addAssignJob(Long jobId) {
        jobs.add(jobId);
    }
    
    public void addAddingJob(Long jobId) {
        addingJobs.add(jobId);
    }
    
    public void addRemovingJob(Long jobId) {
        removingJobs.add(jobId);
    }
    
    public void addPinnedJob(Long jobId) {
        pinnedJobs.add(jobId);
    }

    public void addAssignJobs(Set<Long> jobSet) {
        if (jobSet != null && !jobSet.isEmpty()) {
            jobs.addAll(jobSet);
        }
    }
    
    public void addAddingJobs(Set<Long> jobSet) {
        if (jobSet != null && !jobSet.isEmpty()) {
            addingJobs.addAll(jobSet);
        }
    }
    
    public void addRemovingJobs(Set<Long> jobSet) {
        if (jobSet != null && !jobSet.isEmpty()) {
            removingJobs.addAll(jobSet);
        }
    }
    
    public void addPinnedJobs(Set<Long> jobSet) {
        if (jobSet != null && !jobSet.isEmpty()) {
            pinnedJobs.addAll(jobSet);
        }
    }

    public void removeAssignJobs(Set<Long> jobIds) {
        if (jobs == null || jobIds == null || jobIds.isEmpty()) {
            return;
        }
        jobs.removeAll(jobIds);
    }
    
    public void removeAddingJobs(Set<Long> jobIds) {
        if (addingJobs == null || jobIds == null || jobIds.isEmpty()) {
            return;
        }
        addingJobs.removeAll(jobIds);
    }
    
    public void clearRemovingJobs() {
        if (removingJobs == null) {
            return;
        }
        removingJobs.clear();
    }

    /**
     * 判断是否存在对应的jobId
     * @param jobId jobId
     * @return 若存在返回true,并把jobId从assignJobs remove掉
     */
    public boolean containAndRemoveJob(Long jobId) {
        if (jobs.isEmpty()) {
            return false;
        }
        return jobs.remove(jobId);
    }
    
    public void removeAddingJob(Long jobId) {
        if (addingJobs == null || jobId == null) {
            return;
        }
        addingJobs.remove(jobId);
    }
    
    public void removeRemovingJob(Long jobId) {
        if (removingJobs == null || jobId == null) {
            return;
        }
        removingJobs.remove(jobId);
    }
    
    public void removePinnedJob(Long jobId) {
        if (pinnedJobs == null || jobId == null) {
            return;
        }
        pinnedJobs.remove(jobId);
    }

    /**
     * 清理数据
     */
    public void clear() {
        if (!jobs.isEmpty()) {
            log.warn("assign jobs is not empty, maybe there are jobs not assigned");
            jobs.clear();
        }
    }
}
