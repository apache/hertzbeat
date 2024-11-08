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
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;

/**
 *  Collector and task mapping scheduling implemented by consistent hashing
 */
@Slf4j
public class ConsistentHash {

    /**
     * consistent hash circle
     */
    private final ConcurrentTreeMap<Integer, Node> hashCircle;

    /**
     * collector node
     */
    private final Map<String, Node> existNodeMap;

    /**
     * not dispatched job cache
     */
    private final List<DispatchJob> dispatchJobCache;

    /**
     * Default number of VM nodes
     */
    private static final byte VIRTUAL_NODE_DEFAULT_SIZE = 10;

    public ConsistentHash() {
        hashCircle  = new ConcurrentTreeMap<>();
        existNodeMap = new ConcurrentHashMap<>(16);
        dispatchJobCache = Collections.synchronizedList(new LinkedList<>());
    }

    /**
     * add virtual node
     * @param newNode node
     * @param identity virtual node identity
     */
    public synchronized void addVirtualNode(Node newNode, String identity){
        int virtualHashKey = hash(identity);
        hashCircle.put(virtualHashKey, newNode);
        newNode.addVirtualNodeJobs(virtualHashKey, ConcurrentHashMap.newKeySet(16));
        Map.Entry<Integer, Node> higherVirtualNode = hashCircle.higherOrFirstEntry(virtualHashKey);
        // Reassign tasks that are routed to the higherVirtualNode virtual node
        // Tasks are either on the original virtual node or on the new virtual node
        Integer higherVirtualNodeKey = higherVirtualNode.getKey();
        Node higherNode = higherVirtualNode.getValue();
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
            higherNode.virtualNodeMap.put(higherVirtualNodeKey, dispatchJobs);
            Set<Long> jobIds = reDispatchJobs.stream().map(item -> item[0]).collect(Collectors.toSet());
            newNode.addVirtualNodeJobs(virtualHashKey, reDispatchJobs);
            if (higherNode != newNode) {
                higherNode.assignJobs.removeAssignJobs(jobIds);
                higherNode.assignJobs.addRemovingJobs(jobIds);
                newNode.assignJobs.addAddingJobs(jobIds);
            }
        }
    }

    /**
     * add collector node
     * @param newNode node
     */
    public void addNode(Node newNode) {
        // when mode is cluster public, need reBalance dispatch jobs. else not when is cloud-edge private
        if (!CommonConstants.MODE_PRIVATE.equals(newNode.mode)) {
            byte virtualNodeNum = newNode.quality == null ? VIRTUAL_NODE_DEFAULT_SIZE : newNode.quality;
            for (byte i = 0; i < virtualNodeNum; i++) {
                addVirtualNode(newNode, newNode.identity + i);
            }
        }
        existNodeMap.put(newNode.identity, newNode);
        dispatchJobInCache();
    }

    /**
     * remove virtual node
     * @param deletedNode node
     * @param virtualNodeHash virtual node hash key
     */
    public synchronized void removeVirtualNode(Node deletedNode, Integer virtualNodeHash) {
        Set<Long[]> removeJobHashSet = deletedNode.virtualNodeMap.get(virtualNodeHash);
        // Migrate the virtualNodeEntry collection task to the nearest virtual node that is larger than it
        hashCircle.remove(virtualNodeHash);
        if (removeJobHashSet == null || removeJobHashSet.isEmpty()) {
            return;
        }
        Map.Entry<Integer, Node> higherVirtualEntry = hashCircle.higherOrFirstEntry(virtualNodeHash);
        if (higherVirtualEntry == null || higherVirtualEntry.getValue() == deletedNode) {
            higherVirtualEntry = null;
        }
        // jobId
        Set<Long> removeJobIds = removeJobHashSet.stream().map(item -> item[0]).collect(Collectors.toSet());
        deletedNode.assignJobs.removeAssignJobs(removeJobIds);
        deletedNode.assignJobs.addRemovingJobs(removeJobIds);
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
            Node higherVirtualNode = higherVirtualEntry.getValue();
            higherVirtualNode.addVirtualNodeJobs(higherVirtualEntry.getKey(), removeJobHashSet);
            higherVirtualNode.assignJobs.addAddingJobs(removeJobIds);
        }
    }

    /**
     * deleted collector node
     * @param name collector name
     */
    public Node removeNode(String name) {
        Node deletedNode = existNodeMap.remove(name);
        if (deletedNode == null) {
            return null;
        }
        for (Integer virtualNodeHash : deletedNode.virtualNodeMap.keySet()) {
            removeVirtualNode(deletedNode, virtualNodeHash);
        }
        deletedNode.destroy();
        dispatchJobInCache();
        return deletedNode;
    }

    public synchronized void dispatchJobInCache() {
        if (!dispatchJobCache.isEmpty()) {
            int size = dispatchJobCache.size();
            for (int index = 0; index < size; index++) {
                DispatchJob dispatchJob = dispatchJobCache.remove(0);
                dispatchJob(dispatchJob.dispatchHash, dispatchJob.jobId, false);
            }
        }
    }

    /**
     * get all collector nodes
     * @return nodes
     */
    public Map<String, Node> getAllNodes() {
        return existNodeMap;
    }

    /**
     * get node
     * @param collectorName collector name
     * @return node
     */
    public Node getNode(String collectorName) {
        return existNodeMap.get(collectorName);
    }

    /**
     * Obtain the cached collection scheduling task
     * @return cache task
     */
    public List<DispatchJob> getDispatchJobCache() {
        return dispatchJobCache;
    }

    /**
     * obtain the collector node according to the collection task information
     *
     * @param dispatchKey collector task route key: ip+appId
     * @param jobId jobId
     * @return collector node
     */
    public Node dispatchJob(String dispatchKey, Long jobId) {
        if (dispatchKey == null || StringUtils.isBlank(dispatchKey)) {
            log.error("The dispatch key can not null.");
            return null;
        }
        int dispatchHash = hash(dispatchKey);
        return dispatchJob(dispatchHash, jobId, true);
    }

    /**
     * The collector node to which the collector is assigned is obtained in advance based on the collection task information
     *
     * @param dispatchKey collector task route key: ip+appId
     * @return collector node
     */
    public Node preDispatchJob(String dispatchKey) {
        if (dispatchKey == null || StringUtils.isBlank(dispatchKey)) {
            log.error("The dispatch key can not null.");
            return null;
        }
        int dispatchHash = hash(dispatchKey);
        return preDispatchJob(dispatchHash);
    }

    /**
     * Obtain the collector node to which the collector is assigned based on the collection task information
     *
     * @param dispatchHash The task route hash is collected
     * @param jobId jobId
     * @param isFlushed is has flush this job or wait to dispatch
     * @return collector node
     */
    public Node dispatchJob(Integer dispatchHash, Long jobId, boolean isFlushed) {
        if (dispatchHash == null || hashCircle == null || hashCircle.isEmpty()) {
            log.warn("There is no available collector registered. Cache the job {}.", jobId);
            dispatchJobCache.add(new DispatchJob(dispatchHash, jobId));
            return null;
        }
        Map.Entry<Integer, Node> ceilEntry = hashCircle.ceilingOrFirstEntry(dispatchHash);
        int virtualKey = ceilEntry.getKey();
        Node curNode = ceilEntry.getValue();

        curNode.addJob(virtualKey, dispatchHash, jobId, isFlushed);
        return curNode;
    }

    /**
     * The collector node to which the collector is assigned is obtained in advance based on the collection task information
     *
     * @param dispatchHash The task route hash is collected
     * @return collector node
     */
    public Node preDispatchJob(Integer dispatchHash) {
        if (dispatchHash == null || hashCircle == null || hashCircle.isEmpty()) {
            log.warn("There is no available collector registered.");
            return null;
        }
        Map.Entry<Integer, Node> ceilEntry = hashCircle.ceilingOrFirstEntry(dispatchHash);
        return ceilEntry.getValue();
    }

    /**
     * hash long
     * @param key long value
     * @return hash value
     */
    private int hash(long key) {
        String keyStr = String.valueOf(key);
        return hash(keyStr);
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
    public static class DispatchJob {

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

    /**
     * collector node machine address
     */
    public static class Node {

        /**
         * collector identity
         */
        @Getter
        private final String identity;

        /**
         * collector mode: public or private
         */
        private final String mode;

        /**
         * ip
         */
        private final String ip;

        /**
         * collector On-line time stamp
         */
        private final long uptime;

        /**
         * collector's own performance service quality score 0 - 127
         * The number of virtual nodes will be calculated based on this service quality score
         *
         */
        private final Byte quality;

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

        public Node(String identity, String mode, String ip, long uptime, Byte quality) {
            this.identity = identity;
            this.mode = mode;
            this.ip = ip;
            this.uptime = uptime;
            this.quality = quality;
            assignJobs = new AssignJobs();
            virtualNodeMap = new ConcurrentHashMap<>(VIRTUAL_NODE_DEFAULT_SIZE);
        }

        private synchronized void addJob(Integer virtualNodeKey, Integer dispatchHash, Long jobId, boolean isFlushed) {
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
        private Set<Long[]> clearVirtualNodeJobs(Integer virtualNodeKey) {
            if (virtualNodeMap == null || virtualNodeMap.isEmpty()) {
                return null;
            }
            Set<Long[]> virtualNodeJobs = virtualNodeMap.remove(virtualNodeKey);
            virtualNodeMap.put(virtualNodeKey, ConcurrentHashMap.newKeySet(16));
            return virtualNodeJobs;
        }

        private void addVirtualNodeJobs(Integer virtualHashKey, Set<Long[]> reDispatchJobs) {
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

        public AssignJobs getAssignJobs() {
            return assignJobs;
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
}
