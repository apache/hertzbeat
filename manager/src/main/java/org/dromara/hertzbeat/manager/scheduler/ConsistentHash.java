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

package org.dromara.hertzbeat.manager.scheduler;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 一致性hash实现的采集器与任务映射调度
 * @author tom
 */
@Slf4j
public class ConsistentHash {

    /**
     * 一致性hash环
     */
    private final ConcurrentTreeMap<Integer, Node> hashCircle;

    /**
     * 采集器节点 采集器ID-node
     */
    private final Map<String, Node> existNodeMap;

    /**
     * 未被调度的任务缓存
     */
    private final List<DispatchJob> dispatchJobCache;

    /**
     * 虚拟机节点默认数量
     */
    private static final byte VIRTUAL_NODE_DEFAULT_SIZE = 10;

    public ConsistentHash() {
        hashCircle  = new ConcurrentTreeMap<>();
        existNodeMap = new ConcurrentHashMap<>(16);
        dispatchJobCache = Collections.synchronizedList(new LinkedList<>());
    }

    /**
     * 添加采集器节点
     * @param newNode 节点
     */
    public void addNode(Node newNode) {
        // when mode is cluster public, need reBalance dispatch jobs. else not when is cloud-edge private
        if (!CommonConstants.MODE_PRIVATE.equals(newNode.mode)) {
            byte virtualNodeNum = newNode.quality == null ? VIRTUAL_NODE_DEFAULT_SIZE : newNode.quality;
            for (byte i = 0; i < virtualNodeNum; i++) {
                int virtualHashKey = hash(newNode.identity + i);
                hashCircle.put(virtualHashKey, newNode);
                newNode.addVirtualNodeJobs(virtualHashKey, ConcurrentHashMap.newKeySet(16));
                Map.Entry<Integer, Node> higherVirtualNode = hashCircle.higherEntry(virtualHashKey);
                if (higherVirtualNode == null) {
                    higherVirtualNode = hashCircle.firstEntry();
                }
                // 将路由到 higherVirtualNode 虚拟节点的任务重新分配
                // 任务不是在原虚拟节点 就是在新虚拟节点
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
        }
        existNodeMap.put(newNode.identity, newNode);
        if (!dispatchJobCache.isEmpty()) {
            int size = dispatchJobCache.size();
            for (int index = 0; index < size; index++) {
                DispatchJob dispatchJob = dispatchJobCache.remove(0);
                dispatchJob(dispatchJob.dispatchHash, dispatchJob.jobId, false);
            }
        }
    }

    /**
     * 删除采集器节点
     * @param name 采集器 name
     */
    public Node removeNode(String name) {
        Node deletedNode = existNodeMap.remove(name);
        if (deletedNode == null) {
            return null;
        }
        for (Map.Entry<Integer, Set<Long[]>> virtualNodeEntry : deletedNode.virtualNodeMap.entrySet()) {
            Integer virtualNodeHash = virtualNodeEntry.getKey();
            Set<Long[]> removeJobHashSet = virtualNodeEntry.getValue();
            // 将 virtualNodeEntry 的采集任务迁移到比他大的最近的虚拟节点
            hashCircle.remove(virtualNodeHash);
            if (removeJobHashSet == null || removeJobHashSet.isEmpty()) {
                continue;
            }
            Map.Entry<Integer, Node> higherVirtualEntry = hashCircle.higherEntry(virtualNodeHash);
            if (higherVirtualEntry == null) {
                higherVirtualEntry = hashCircle.firstEntry();
            }
            if (higherVirtualEntry == null || higherVirtualEntry.getValue() == deletedNode) {
                higherVirtualEntry = null;
            }
            // jobId
            Set<Long> removeJobIds = removeJobHashSet.stream().map(item -> item[0]).collect(Collectors.toSet());
            deletedNode.assignJobs.removeAssignJobs(removeJobIds);
            deletedNode.assignJobs.addRemovingJobs(removeJobIds);
            if (higherVirtualEntry == null) {
                // jobId-dispatchHash
                virtualNodeEntry.getValue().forEach(value -> {
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
        deletedNode.destroy();
        if (!dispatchJobCache.isEmpty()) {
            int size = dispatchJobCache.size();
            for (int index = 0; index < size; index++) {
                DispatchJob dispatchJob = dispatchJobCache.remove(0);
                dispatchJob(dispatchJob.dispatchHash, dispatchJob.jobId, false);
            }
        }
        return deletedNode;
    }

    /**
     * 获取所有采集器节点
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
     * 获取暂被缓存的采集调度任务
     * @return 缓存任务
     */
    public List<DispatchJob> getDispatchJobCache() {
        return dispatchJobCache;
    }

    /**
     * 根据采集任务信息获取其分配到的采集器节点
     *
     * @param dispatchKey 采集任务路由key: ip+appId
     * @param jobId jobId
     * @return 采集器节点
     */
    public Node dispatchJob(String dispatchKey, Long jobId) {
        if (dispatchKey == null || "".equals(dispatchKey)) {
            log.error("The dispatch key can not null.");
            return null;
        }
        int dispatchHash = hash(dispatchKey);
        return dispatchJob(dispatchHash, jobId, true);
    }
    
    /**
     * 预先根据采集任务信息获取其分配到的采集器节点
     *
     * @param dispatchKey 采集任务路由key: ip+appId
     * @return 采集器节点
     */
    public Node preDispatchJob(String dispatchKey) {
        if (dispatchKey == null || "".equals(dispatchKey)) {
            log.error("The dispatch key can not null.");
            return null;
        }
        int dispatchHash = hash(dispatchKey);
        return preDispatchJob(dispatchHash);
    }

    /**
     * 根据采集任务信息获取其分配到的采集器节点
     *
     * @param dispatchHash 采集任务路由hash
     * @param jobId jobId
     * @param isFlushed is has flush this job or wait to dispatch 此任务是否已被下发调度还是等待后续下发
     * @return 采集器节点
     */
    public Node dispatchJob(Integer dispatchHash, Long jobId, boolean isFlushed) {
        if (dispatchHash == null || hashCircle == null || hashCircle.isEmpty()) {
            log.warn("There is no available collector registered. Cache the job {}.", jobId);
            dispatchJobCache.add(new DispatchJob(dispatchHash, jobId));
            return null;
        }
        Map.Entry<Integer, Node> ceilEntry = hashCircle.ceilingEntry(dispatchHash);
        if (ceilEntry == null) {
            ceilEntry = hashCircle.firstEntry();
        }
        int virtualKey = ceilEntry.getKey();
        Node curNode = ceilEntry.getValue();

        curNode.addJob(virtualKey, dispatchHash, jobId, isFlushed);
        return curNode;
    }
    
    /**
     * 预先根据采集任务信息获取其分配到的采集器节点
     *
     * @param dispatchHash 采集任务路由hash
     * @return 采集器节点
     */
    public Node preDispatchJob(Integer dispatchHash) {
        if (dispatchHash == null || hashCircle == null || hashCircle.isEmpty()) {
            log.warn("There is no available collector registered.");
            return null;
        }
        Map.Entry<Integer, Node> ceilEntry = hashCircle.ceilingEntry(dispatchHash);
        if (ceilEntry == null) {
            ceilEntry = hashCircle.firstEntry();
        }
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
     * FNV1_32_HASH算法
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
        // 负数则取其绝对值
        if (hash < 0) {
            hash = Math.abs(hash);
        }
        return hash;
    }


    /**
     * 分发任务摘要
     */
    @AllArgsConstructor
    public static class DispatchJob {
        /**
         * 分发任务路由key
         */
        private Integer dispatchHash;
        /**
         * job ID
         */
        @Getter
        private Long jobId;
    }

    /**
     * 采集器节点的机器地址
     */
    public static class Node {
        /**
         * 采集器唯一标识
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
         * 采集器上线时间戳
         */
        private final long uptime;
        /**
         * 采集器自身的性能服务质量分数 0 - 127
         * 虚拟节点数量会根据此服务质量分数计算
         */
        private final Byte quality;
        /**
         * 使用此采集器的采集采集任务ID列表
         * jobId,jobVersion
         */
        private AssignJobs assignJobs;
        /**
         * 此节点所对应的每个虚拟节点所映射的采集采集任务ID列表
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
         * 根据virtualNodeKey清除指定虚拟节点所路由的采集任务
         * @param virtualNodeKey 虚拟节点key
         * @return 采集任务
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
            Set<Long[]> virtualNodeJobs = virtualNodeMap.get(virtualHashKey);
            if (virtualNodeJobs != null) {
                reDispatchJobs.addAll(virtualNodeJobs);
            }
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
