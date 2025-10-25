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

package org.apache.hertzbeat.manager.pojo;

import lombok.Data;
import org.apache.hertzbeat.common.constants.CollectorStatus;
import org.apache.hertzbeat.manager.scheduler.AssignJobs;

import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Collector Node
 */
@Data
public class CollectorNode {
    /**
     * Default number of VM nodes
     */
    private static final byte VIRTUAL_NODE_DEFAULT_SIZE = 10;

    /**
     * collector identity
     */
    private final String identity;

    /**
     * collector mode: public or private
     */
    private String mode;

    /**
     * ip
     */
    private String ip;

    /**
     * collector On-line time stamp
     */
    private long uptime;

    /**
     * collector's own performance service quality score 0 - 127
     * The number of virtual nodes will be calculated based on this service quality score
     *
     */
    private Byte quality;

    private CollectorStatus collectorStatus;

    /**
     * use this collector's collect job ID list
     * jobId,jobVersion
     */
    private AssignJobs assignJobs;

    /**
     * the collection task ID list mapped by each virtual node corresponding to this node
     * Long[] [0]-jobId, [1]-dispatchHash
     */
    private Map<Integer, Set<Long[]>> virtualNodeMap;

    public CollectorNode(String identity, String mode, String ip, long uptime, Byte quality) {
        this.identity = identity;
        this.mode = mode;
        this.ip = ip;
        this.uptime = uptime;
        this.quality = quality;
        assignJobs = new AssignJobs();
        virtualNodeMap = new ConcurrentHashMap<>(VIRTUAL_NODE_DEFAULT_SIZE);
    }

    public synchronized void addJob(Integer virtualNodeKey, Integer dispatchHash, Long jobId, boolean isFlushed) {
        if (virtualNodeMap == null) {
            virtualNodeMap = new ConcurrentHashMap<>(VIRTUAL_NODE_DEFAULT_SIZE);
        }
        if (assignJobs == null) {
            assignJobs = new AssignJobs();
        }
        Set<Long[]> virtualNodeJob = virtualNodeMap.computeIfAbsent(virtualNodeKey, k -> ConcurrentHashMap.newKeySet(16));
        virtualNodeJob.add(new Long[]{jobId, dispatchHash.longValue()});
        if (isFlushed) {
            assignJobs.addAssignJob(jobId);
        } else {
            assignJobs.addAddingJob(jobId);
        }
    }

    /**
     * obtain the collection task routed by the specified virtual node according to virtualNodeKey
     * @param virtualNodeKey virtualNodeKey
     * @return collection task
     */
    public Set<Long[]> clearVirtualNodeJobs(Integer virtualNodeKey) {
        if (virtualNodeMap == null || virtualNodeMap.isEmpty()) {
            return null;
        }
        Set<Long[]> virtualNodeJobs = virtualNodeMap.remove(virtualNodeKey);
        virtualNodeMap.put(virtualNodeKey, ConcurrentHashMap.newKeySet(16));
        return virtualNodeJobs;
    }

    public void addVirtualNodeJobs(Integer virtualHashKey, Set<Long[]> reDispatchJobs) {
        if (reDispatchJobs == null) {
            return;
        }
        if (virtualNodeMap == null) {
            virtualNodeMap = new ConcurrentHashMap<>(16);
        }
        virtualNodeMap.computeIfPresent(virtualHashKey, (k, v) -> {
            reDispatchJobs.addAll(v);
            return v;
        });
        virtualNodeMap.put(virtualHashKey, reDispatchJobs);
    }

    public void removeVirtualNodeJob(Long jobId) {
        if (jobId == null || virtualNodeMap == null) {
            return;
        }
        for (Set<Long[]> jobSet : virtualNodeMap.values()) {
            Optional<Long[]> optional = jobSet.stream().filter(item -> Objects.equals(item[0], jobId)).findFirst();
            if (optional.isPresent()) {
                jobSet.remove(optional.get());
                break;
            }
        }
    }

    public void destroy() {
        if (assignJobs != null) {
            assignJobs.clear();
        }
        if (virtualNodeMap != null) {
            virtualNodeMap.clear();
        }
    }
}
