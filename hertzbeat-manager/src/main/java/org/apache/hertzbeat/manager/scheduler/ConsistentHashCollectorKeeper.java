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

import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;
import java.util.stream.Collectors;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CollectorStatus;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.manager.pojo.CollectorNode;
import org.apache.hertzbeat.manager.pojo.JobCache;
import org.apache.hertzbeat.manager.scheduler.collector.CollectorKeeper;

/**
 *  Collector and task mapping scheduling implemented by consistent hashing
 */
@Slf4j
public class ConsistentHashCollectorKeeper implements CollectorKeeper {

    /**
     * consistent hash circle
     */
    private final ConcurrentTreeMap<Integer, CollectorNode> hashCircle = new ConcurrentTreeMap<>();

    /**
     * collector node
     */
    private final Map<String, CollectorNode> existNodeMap = new ConcurrentHashMap<>(16);

    /**
     * not dispatched job cache, in order to obtain the cached collection scheduling task
     */
    @Getter
    private final List<DispatchJob> dispatchJobCache = Collections.synchronizedList(new LinkedList<>());

    /**
     * Default number of VM nodes
     */
    private static final byte VIRTUAL_NODE_DEFAULT_SIZE = 10;

    /**
     * add collector node
     * @param newNode node
     */
    @Override
    public void addNode(CollectorNode newNode) {
        // when mode is cluster public, need reBalance dispatch jobs. else not when is cloud-edge private
        if (!CommonConstants.MODE_PRIVATE.equals(newNode.getMode())) {
            byte virtualNodeNum = newNode.getQuality() == null ? VIRTUAL_NODE_DEFAULT_SIZE : newNode.getQuality();
            for (byte i = 0; i < virtualNodeNum; i++) {
                addVirtualNode(newNode, newNode.getIdentity() + i);
            }
        }
        existNodeMap.put(newNode.getIdentity(), newNode);
        dispatchJobInCache();
    }

    @Override
    public CollectorNode addJob(Job job, String collectorId) {
        JobCache.put(job);
        CollectorNode collectorNode;

        if (StringUtils.isBlank(collectorId)) {
            // todo dispatchKey ip+port or id
            String dispatchKey = String.valueOf(job.getMonitorId());
            collectorNode = this.dispatchJob(dispatchKey, job.getId());
            if (collectorNode == null) {
                log.error("there is no collector online to assign job.");
            }
        } else {
            collectorNode = getNode(collectorId);
            if (collectorNode == null) {
                log.error("there is no collector name: {} online to assign job.", collectorId);
                return null;
            }
            collectorNode.getAssignJobs().addPinnedJob(job.getId());
        }

        return collectorNode;
    }

    /**
     * get node
     * @param collectorName collector name
     * @return node
     */
    @Override
    public CollectorNode getNode(String collectorName) {
        return existNodeMap.get(collectorName);
    }

    @Override
    public CollectorNode determineNode(Long jobId) {
        String dispatchKey = String.valueOf(jobId);
        if (dispatchKey == null || StringUtils.isBlank(dispatchKey)) {
            log.error("The dispatch key can not null.");
            return null;
        }
        int dispatchHash = hash(dispatchKey);
        return preDispatchJob(dispatchHash);
    }

    @Override
    public void changeStatus(String collectorId, CollectorStatus collectorStatus) {
        switch (collectorStatus) {
            case ONLINE -> this.getNode(collectorId).setCollectorStatus(collectorStatus);
            case OFFLINE -> this.removeNode(collectorId);
            default -> {}
        }
    }

    @Override
    public void rebalanceJobs(BiConsumer<AssignJobs, String> assignJobCollectorConsumer) {
        existNodeMap.entrySet().parallelStream().forEach(entry -> {
            String collectorName = entry.getKey();
            AssignJobs assignJobs = entry.getValue().getAssignJobs();
            if (StringUtils.isBlank(collectorName) || Objects.isNull(assignJobs)) {
                return;
            }

            assignJobCollectorConsumer.accept(assignJobs, collectorName);
        });
    }

    @Override
    public CollectorNode removeJob(Long jobId) {
        JobCache.remove(jobId);

        for (CollectorNode node : existNodeMap.values()) {
            AssignJobs assignJobs = node.getAssignJobs();
            if (assignJobs.getPinnedJobs().remove(jobId)
                    || assignJobs.getJobs().remove(jobId) || assignJobs.getAddingJobs().remove(jobId)) {
                node.removeVirtualNodeJob(jobId);

                return node;
                // break; if is there jod exist in multi collector?
            }
        }

        return null;
    }

    /**
     * add virtual node
     * @param newNode node
     * @param identity virtual node identity
     */
    private synchronized void addVirtualNode(CollectorNode newNode, String identity){
        int virtualHashKey = hash(identity);
        hashCircle.put(virtualHashKey, newNode);
        newNode.addVirtualNodeJobs(virtualHashKey, ConcurrentHashMap.newKeySet(16));
        Map.Entry<Integer, CollectorNode> higherVirtualNode = hashCircle.higherOrFirstEntry(virtualHashKey);
        // Reassign tasks that are routed to the higherVirtualNode virtual node
        // Tasks are either on the original virtual node or on the new virtual node
        Integer higherVirtualNodeKey = higherVirtualNode.getKey();
        CollectorNode higherNode = higherVirtualNode.getValue();
        Set<Long[]> dispatchJobs = higherNode.clearVirtualNodeJobs(higherVirtualNodeKey);
        if (dispatchJobs != null && !dispatchJobs.isEmpty()) {
            Set<Long[]> reDispatchJobs = ConcurrentHashMap.newKeySet(dispatchJobs.size());
            Iterator<Long[]> iterator = dispatchJobs.iterator();
            while (iterator.hasNext()) {
                Long[] jobHash = iterator.next();
                int dispatchHash = jobHash[1].intValue();
                if (dispatchHash <= virtualHashKey) {
                    reDispatchJobs.add(jobHash);
                    iterator.remove();
                }
            }
            higherNode.getVirtualNodeMap().put(higherVirtualNodeKey, dispatchJobs);
            Set<Long> jobIds = reDispatchJobs.stream().map(item -> item[0]).collect(Collectors.toSet());
            newNode.addVirtualNodeJobs(virtualHashKey, reDispatchJobs);
            if (higherNode != newNode) {
                higherNode.getAssignJobs().removeAssignJobs(jobIds);
                higherNode.getAssignJobs().addRemovingJobs(jobIds);
                newNode.getAssignJobs().addAddingJobs(jobIds);
            }
        }
    }

    /**
     * remove virtual node
     * @param deletedNode node
     * @param virtualNodeHash virtual node hash key
     */
    private synchronized void removeVirtualNode(CollectorNode deletedNode, Integer virtualNodeHash) {
        Set<Long[]> removeJobHashSet = deletedNode.getVirtualNodeMap().get(virtualNodeHash);
        // Migrate the virtualNodeEntry collection task to the nearest virtual node that is larger than it
        hashCircle.remove(virtualNodeHash);
        if (removeJobHashSet == null || removeJobHashSet.isEmpty()) {
            return;
        }
        Map.Entry<Integer, CollectorNode> higherVirtualEntry = hashCircle.higherOrFirstEntry(virtualNodeHash);
        if (higherVirtualEntry == null || higherVirtualEntry.getValue() == deletedNode) {
            higherVirtualEntry = null;
        }
        // jobId
        Set<Long> removeJobIds = removeJobHashSet.stream().map(item -> item[0]).collect(Collectors.toSet());
        deletedNode.getAssignJobs().removeAssignJobs(removeJobIds);
        deletedNode.getAssignJobs().addRemovingJobs(removeJobIds);
        if (higherVirtualEntry == null) {
            // jobId-dispatchHash
            removeJobHashSet.forEach(value -> {
                Long jobId = value[0];
                Integer dispatchHash = value[1].intValue();
                if (removeJobIds.contains(jobId)) {
                    dispatchJobCache.add(new DispatchJob(dispatchHash, jobId));
                } else {
                    log.error("Get job {} from removeJobMap null.", jobId);
                }
            });
        } else {
            CollectorNode higherVirtualNode = higherVirtualEntry.getValue();
            higherVirtualNode.addVirtualNodeJobs(higherVirtualEntry.getKey(), removeJobHashSet);
            higherVirtualNode.getAssignJobs().addAddingJobs(removeJobIds);
        }
    }

    /**
     * deleted collector node
     * @param name collector name
     */
    private void removeNode(String name) {
        CollectorNode deletedNode = existNodeMap.remove(name);
        if (deletedNode == null) {
            return;
        }

        deletedNode.getVirtualNodeMap().keySet()
                .forEach(virtualNodeHash -> removeVirtualNode(deletedNode, virtualNodeHash));
        deletedNode.destroy();
        dispatchJobInCache();
    }

    private synchronized void dispatchJobInCache() {
        if (!dispatchJobCache.isEmpty()) {
            int size = dispatchJobCache.size();
            for (int index = 0; index < size; index++) {
                DispatchJob dispatchJob = dispatchJobCache.remove(0);
                dispatchJob(dispatchJob.dispatchHash, dispatchJob.jobId, false);
            }
        }
    }

    /**
     * obtain the collector node according to the collection task information
     *
     * @param dispatchKey collector task route key: ip+appId
     * @param jobId jobId
     * @return collector node
     */
    private CollectorNode dispatchJob(String dispatchKey, Long jobId) {
        if (dispatchKey == null || StringUtils.isBlank(dispatchKey)) {
            log.error("The dispatch key can not null.");
            return null;
        }
        int dispatchHash = hash(dispatchKey);
        return dispatchJob(dispatchHash, jobId, true);
    }

    /**
     * Obtain the collector node to which the collector is assigned based on the collection task information
     *
     * @param dispatchHash The task route hash is collected
     * @param jobId jobId
     * @param isFlushed if it has flushed this job or wait to dispatch
     * @return collector node
     */
    private CollectorNode dispatchJob(Integer dispatchHash, Long jobId, boolean isFlushed) {
        if (dispatchHash == null || hashCircle == null || hashCircle.isEmpty()) {
            log.warn("There is no available collector registered. Cache the job {}.", jobId);
            dispatchJobCache.add(new DispatchJob(dispatchHash, jobId));
            return null;
        }
        Map.Entry<Integer, CollectorNode> ceilEntry = hashCircle.ceilingOrFirstEntry(dispatchHash);
        int virtualKey = ceilEntry.getKey();
        CollectorNode curNode = ceilEntry.getValue();

        curNode.addJob(virtualKey, dispatchHash, jobId, isFlushed);
        return curNode;
    }

    /**
     * The collector node to which the collector is assigned is obtained in advance based on the collection task information
     *
     * @param dispatchHash The task route hash is collected
     * @return collector node
     */
    private CollectorNode preDispatchJob(Integer dispatchHash) {
        if (dispatchHash == null || hashCircle == null || hashCircle.isEmpty()) {
            log.warn("There is no available collector registered.");
            return null;
        }
        Map.Entry<Integer, CollectorNode> ceilEntry = hashCircle.ceilingOrFirstEntry(dispatchHash);
        return ceilEntry.getValue();
    }

    /**
     * FNV1_32_HASH algorithm
     * @param key the key
     * @return hash
     */
    private int hash(String key) {
        final int p = 16777619;
        int hash = (int) 2166136261L;
        for (int i = 0; i < key.length(); i++) {
            hash = (hash ^ key.charAt(i)) * p;
        }
        hash += hash << 13;
        hash ^= hash >> 7;
        hash += hash << 3;
        hash ^= hash >> 17;
        hash += hash << 5;
        // Negative numbers take their absolute value
        if (hash < 0) {
            hash = Math.abs(hash);
        }
        return hash;
    }


    /**
     * dispatch job summary
     */
    @AllArgsConstructor
    private static class DispatchJob {

        /**
         * dispatch task route key
         */
        private Integer dispatchHash;

        /**
         * job ID
         */
        @Getter
        private Long jobId;
    }
}
