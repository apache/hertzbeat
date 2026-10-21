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

import com.google.protobuf.ByteString;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectResponseEventListener;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.dto.ServerInfo;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.config.PrometheusProxyConfig;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.helper.MonitorJobScheduleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.stereotype.Component;

/**
 * collector service
 */
@Component
@AutoConfigureAfter(value = {SchedulerProperties.class})
@Slf4j
public class CollectorJobScheduler implements CollectorScheduling, CollectJobScheduling {

    private final Map<Long, Job> jobContentCache = new ConcurrentHashMap<>(16);

    // Cache and assignment mutations are serialized on this scheduler, including rebalance dispatch.
    private final Map<Long, Long> monitorJobIds = new ConcurrentHashMap<>(16);

    private final Map<Long, CollectResponseEventListener> eventListeners = new ConcurrentHashMap<>(16);

    @Autowired
    private CollectorDao collectorDao;

    @Autowired
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Autowired
    private ConsistentHash consistentHash;

    @Autowired
    private CollectJobService collectJobService;

    @Autowired
    private AppService appService;

    @Autowired
    private MonitorDao monitorDao;

    @Autowired
    private ParamDao paramDao;

    @Autowired
    private PrometheusProxyConfig prometheusProxyConfig;

    private ManageServer manageServer;

    @Override
    public void collectorGoOnline(String identity, CollectorInfo collectorInfo) {
        collectorGoOnline(identity, collectorInfo, true);
    }

    @Override
    public void collectorGoOnline(String identity, CollectorInfo collectorInfo, boolean restorePinnedJobs) {
        if (StringUtils.isBlank(identity)) {
            log.error("identity can not be null if collector not existed");
            return;
        }
        Collector collector = collectorDao.findCollectorByName(identity).orElse(null);
        if (Objects.nonNull(collector)) {
            if (collector.getStatus() == CommonConstants.COLLECTOR_STATUS_ONLINE) {
                return;
            }
            collector.setStatus(CommonConstants.COLLECTOR_STATUS_ONLINE);
            if (collectorInfo != null) {
                collector.setIp(collectorInfo.getIp());
                collector.setMode(collectorInfo.getMode());
                collector.setVersion(collectorInfo.getVersion());
            }
        } else {
            if (collectorInfo == null) {
                log.error("collectorInfo can not null when collector not existed");
                return;
            }
            collector = Collector.builder()
                    .name(identity)
                    .ip(collectorInfo.getIp())
                    .mode(collectorInfo.getMode())
                    .version(collectorInfo.getVersion())
                    .status(CommonConstants.COLLECTOR_STATUS_ONLINE)
                    .build();
        }
        collectorDao.save(collector);
        ConsistentHash.Node node = new ConsistentHash.Node(identity, collector.getMode(),
                collector.getIp(), System.currentTimeMillis(), null);
        synchronized (this) {
            // An equivalent initialization may have already registered this node.
            if (consistentHash.getNode(identity) == null) {
                consistentHash.addNode(node);
            }
            reBalanceCollectorAssignJobs();
        }
        if (!restorePinnedJobs) {
            return;
        }
        // Read database The fixed collection tasks at this collector are delivered
        List<CollectorMonitorBind> binds = collectorMonitorBindDao.findCollectorMonitorBindsByCollector(identity);
        if (CollectionUtils.isEmpty(binds)){
            return;
        }
        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(binds.stream().map(CollectorMonitorBind::getMonitorId).collect(Collectors.toSet()));
        for (Monitor monitor : monitors) {
            if (Objects.isNull(monitor) || monitor.getStatus() == CommonConstants.MONITOR_PAUSED_CODE) {
                continue;
            }
            try {
                // build collect job entity
                boolean isStatic = CommonConstants.SCRAPE_STATIC.equals(monitor.getScrape())
                        || StringUtils.isBlank(monitor.getScrape());
                Job appDefine = appService.getAppDefine(isStatic ? monitor.getApp() : monitor.getScrape());
                appDefine.setSd(!isStatic);
                appDefine.setPrometheusProxyMode(prometheusProxyConfig.isPrometheusProxy());
                if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                    appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
                }
                appDefine.setMonitorId(monitor.getId());
                MonitorJobScheduleMapper.apply(monitor, appDefine);
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                Map<String, String> metadata = Map.of(CommonConstants.LABEL_INSTANCE_NAME, monitor.getName(),
                        CommonConstants.LABEL_INSTANCE, monitor.getInstance());
                appDefine.setMetadata(metadata);
                appDefine.setLabels(monitor.getLabels());
                appDefine.setAnnotations(monitor.getAnnotations());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream()
                        .map(param -> Configmap.builder()
                                        .key(param.getField())
                                        .value(param.getParamValue())
                                        .type(param.getType()).build()).collect(Collectors.toList());
                List<RuntimeParamDefine> paramDefaultValue = appDefine.getParams().stream()
                        .filter(item -> StringUtils.isNotBlank(item.getDefaultValue()))
                        .toList();
                paramDefaultValue.forEach(defaultVar -> {
                    if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                        configmaps.add(Configmap.builder()
                                .key(defaultVar.getField())
                                .value(defaultVar.getDefaultValue())
                                .type((byte) 1)
                                .build());
                    }
                });
                appDefine.setConfigmap(configmaps);
                long jobId = addAsyncCollectJob(appDefine, identity);
                monitor.setJobId(jobId);
                monitorDao.save(monitor);
            } catch (Exception e) {
                log.error("insert pinned monitor job: {} in collector: {} error,continue next monitor", monitor, identity, e);
            }
        }
    }

    @Override
    public void collectorGoOffline(String identity) {
        Collector collector = collectorDao.findCollectorByName(identity).orElse(null);
        if (Objects.isNull(collector)) {
            log.info("the collector : {} not found.", identity);
            return;
        }
        collector.setStatus(CommonConstants.COLLECTOR_STATUS_OFFLINE);
        collectorDao.save(collector);
        synchronized (this) {
            consistentHash.removeNode(identity);
            reBalanceCollectorAssignJobs();
        }
        log.info("the collector: {} go offline success.", identity);
    }

    @Override
    public synchronized void reBalanceCollectorAssignJobs() {
        consistentHash.getAllNodes().entrySet().forEach(entry -> {
            String collectorName = entry.getKey();
            AssignJobs assignJobs = entry.getValue().getAssignJobs();
            if (StringUtils.isBlank(collectorName) || Objects.isNull(assignJobs)) {
                return;
            }
            if (CollectionUtils.isNotEmpty(assignJobs.getAddingJobs())) {
                Set<Long> addedJobIds = new HashSet<>(8);
                for (Long addingJobId : assignJobs.getAddingJobs()) {
                    Job job = jobContentCache.get(addingJobId);
                    if (Objects.isNull(job)) {
                        log.error("assigning job {} content is null.", addingJobId);
                        continue;
                    }
                    addedJobIds.add(addingJobId);
                    if (CommonConstants.MAIN_COLLECTOR_NODE.equals(collectorName)) {
                        collectJobService.addAsyncCollectJob(job);
                    } else {
                        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                .setDirection(ClusterMsg.Direction.REQUEST)
                                .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(job)))
                                .build();
                        this.manageServer.sendMsg(collectorName, message);
                    }
                }
                assignJobs.addAssignJobs(addedJobIds);
                assignJobs.removeAddingJobs(addedJobIds);
            }
            if (CollectionUtils.isNotEmpty(assignJobs.getRemovingJobs())) {
                if (CommonConstants.MAIN_COLLECTOR_NODE.equals(collectorName)) {
                    assignJobs.getRemovingJobs().forEach(jobId -> collectJobService.cancelAsyncCollectJob(jobId));
                } else {
                    ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                            .setDirection(ClusterMsg.Direction.REQUEST)
                            .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                            .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(assignJobs.getRemovingJobs())))
                            .build();
                    this.manageServer.sendMsg(collectorName, message);
                }
                assignJobs.clearRemovingJobs();
            }
        });
    }

    @Override
    public boolean offlineCollector(String identity) {
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                .setType(ClusterMsg.MessageType.GO_OFFLINE)
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setIdentity(identity)
                .build();
        ClusterMsg.Message response = this.manageServer.sendMsgSync(identity, message);
        if (response == null || !String.valueOf(CommonConstants.SUCCESS_CODE).equals(response.getMsg().toStringUtf8())) {
            return false;
        }
        log.info("send offline collector message to {} success", identity);
        this.collectorGoOffline(identity);
        return true;
    }

    @Override
    public boolean onlineCollector(String identity) {
        Collector collector = collectorDao.findCollectorByName(identity).orElse(null);
        if (Objects.isNull(collector)) {
            return false;
        }
        ServerInfo serverInfo = ServerInfo.builder().aesSecret(AesUtil.getDefaultSecretKey()).build();
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                .setType(ClusterMsg.MessageType.GO_ONLINE)
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(serverInfo)))
                .setIdentity(identity)
                .build();
        ClusterMsg.Message response = this.manageServer.sendMsgSync(identity, message);
        if (response == null || !String.valueOf(CommonConstants.SUCCESS_CODE).equals(response.getMsg().toStringUtf8())) {
            return false;
        }
        log.info("send online collector message to {} success", identity);
        CollectorInfo collectorInfo = CollectorInfo.builder()
                .name(collector.getName())
                .ip(collector.getIp())
                .version(collector.getVersion())
                .mode(collector.getMode())
                .build();
        this.collectorGoOnline(identity, collectorInfo);
        return true;
    }

    @Override
    public List<CollectRep.MetricsData> collectSyncJobData(Job job) {
        // todo dispatchKey ip+port or id
        String dispatchKey = String.valueOf(job.getMonitorId());
        ConsistentHash.Node node = consistentHash.preDispatchJob(dispatchKey);
        if (Objects.isNull(node)) {
            log.error("there is no collector online to assign job.");
            CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                    .setCode(CollectRep.Code.FAIL)
                    .setMsg("no collector online to assign job")
                    .build();
            return Collections.singletonList(metricsData);
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
            return collectJobService.collectSyncJobData(job);
        } else {
            List<CollectRep.MetricsData> metricsData = new LinkedList<>();
            CountDownLatch countDownLatch = new CountDownLatch(1);

            // Register listener BEFORE sending to avoid race where response arrives before registration
            CollectResponseEventListener listener = new CollectResponseEventListener() {
                @Override
                public void response(List<CollectRep.MetricsData> responseMetrics) {
                    if (responseMetrics != null) {
                        metricsData.addAll(responseMetrics);
                    }
                    countDownLatch.countDown();
                }
            };
            eventListeners.put(job.getMonitorId(), listener);

            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setType(ClusterMsg.MessageType.ISSUE_ONE_TIME_TASK)
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(job)))
                    .build();
            boolean result = this.manageServer.sendMsg(node.getIdentity(), message);

            try {
                if (result) {
                    try {
                        countDownLatch.await(120, TimeUnit.SECONDS);
                    } catch (Exception e) {
                        log.info("The sync task runs for 120 seconds with no response and returns");
                    }
                }
            } finally {
                // Always remove listener to prevent memory leak
                eventListeners.remove(job.getMonitorId());
            }
            return metricsData;
        }
    }

    @Override
    public List<CollectRep.MetricsData> collectSyncJobData(Job job, String collector) {
        ConsistentHash.Node node = consistentHash.getNode(collector);
        if (Objects.isNull(node)) {
            log.error("there is no collector online to assign job.");
            CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                    .setCode(CollectRep.Code.FAIL)
                    .setMsg("the collector is offline and cannot assign job")
                    .build();
            return Collections.singletonList(metricsData);
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
            return collectJobService.collectSyncJobData(job);
        }
        List<CollectRep.MetricsData> metricsData = new LinkedList<>();
        CountDownLatch countDownLatch = new CountDownLatch(1);
        // Register listener BEFORE sending to avoid race where response arrives before registration
        CollectResponseEventListener listener = new CollectResponseEventListener() {
            @Override
            public void response(List<CollectRep.MetricsData> responseMetrics) {
                if (responseMetrics != null) {
                    metricsData.addAll(responseMetrics);
                }
                countDownLatch.countDown();
            }
        };
        eventListeners.put(job.getMonitorId(), listener);
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                .setType(ClusterMsg.MessageType.ISSUE_ONE_TIME_TASK)
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(job)))
                .build();
        boolean result = this.manageServer.sendMsg(node.getIdentity(), message);
        try {
            if (result) {
                try {
                    countDownLatch.await(120, TimeUnit.SECONDS);
                } catch (Exception e) {
                    log.info("The sync task runs for 120 seconds with no response and returns");
                }
            }
        } finally {
            // Always remove listener to prevent memory leak
            eventListeners.remove(job.getMonitorId());
        }
        return metricsData;
    }

    @Override
    public synchronized long addAsyncCollectJob(Job job, String collector) {
        Long previousJobId = monitorJobIds.get(job.getMonitorId());
        long jobId = SnowFlakeIdGenerator.generateId();
        job.setId(jobId);
        jobContentCache.put(jobId, job.clone());
        monitorJobIds.put(job.getMonitorId(), jobId);
        try {
            dispatchAsyncCollectJob(job, collector);
        } catch (RuntimeException e) {
            // A rejected replacement must not stop the previously working task.
            try {
                cancelAsyncCollectJob(jobId);
            } catch (RuntimeException cleanupException) {
                if (cleanupException != e) {
                    e.addSuppressed(cleanupException);
                }
            } finally {
                if (previousJobId != null) {
                    monitorJobIds.put(job.getMonitorId(), previousJobId);
                }
            }
            throw e;
        }
        if (previousJobId != null) {
            cancelAsyncCollectJob(previousJobId);
        }
        return jobId;
    }

    private void dispatchAsyncCollectJob(Job job, String collector) {
        long jobId = job.getId();
        ConsistentHash.Node node;
        if (StringUtils.isBlank(collector)) {
            // todo dispatchKey ip+port or id
            String dispatchKey = String.valueOf(job.getMonitorId());
            node = consistentHash.dispatchJob(dispatchKey, jobId);
            if (node == null) {
                log.error("there is no collector online to assign job.");
                return;
            }
        } else {
            node = consistentHash.getNode(collector);
            if (node == null) {
                log.error("there is no collector name: {} online to assign job.", collector);
                return;
            }
            node.getAssignJobs().addPinnedJob(jobId);
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
            collectJobService.addAsyncCollectJob(job);
        } else {
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(job)))
                    .build();
            if (!this.manageServer.sendMsg(node.getIdentity(), message)) {
                throw new IllegalStateException("Failed to dispatch job " + jobId + " to collector " + node.getIdentity());
            }
        }
    }

    @Override
    public synchronized long updateAsyncCollectJob(Job modifyJob) {
        // delete and add
        long preJobId = modifyJob.getId();
        long newJobId = addAsyncCollectJob(modifyJob, null);
        cancelAsyncCollectJob(preJobId);
        return newJobId;
    }

    @Override
    public synchronized long updateAsyncCollectJob(Job modifyJob, String collector) {
        // delete and add
        long preJobId = modifyJob.getId();
        long newJobId = addAsyncCollectJob(modifyJob, collector);
        cancelAsyncCollectJob(preJobId);
        return newJobId;
    }

    @Override
    public synchronized void cancelAsyncCollectJob(Long jobId) {
        if (jobId == null) {
            return;
        }
        Job removed = jobContentCache.remove(jobId);
        if (removed != null) {
            monitorJobIds.remove(removed.getMonitorId(), jobId);
        }
        consistentHash.getDispatchJobCache().removeIf(job -> Objects.equals(job.getJobId(), jobId));
        for (ConsistentHash.Node node : consistentHash.getAllNodes().values()) {
            AssignJobs assignJobs = node.getAssignJobs();
            // Do not short-circuit: a rebalance may leave the ID in more than one set.
            boolean assigned = assignJobs.getPinnedJobs().remove(jobId);
            assigned |= assignJobs.getJobs().remove(jobId);
            assigned |= assignJobs.getAddingJobs().remove(jobId);
            assigned |= assignJobs.getRemovingJobs().remove(jobId);
            if (assigned) {
                node.removeVirtualNodeJob(jobId);
                if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
                    collectJobService.cancelAsyncCollectJob(jobId);
                } else {
                    ClusterMsg.Message deleteMessage = ClusterMsg.Message.newBuilder()
                            .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                            .setDirection(ClusterMsg.Direction.REQUEST)
                            .setMsg(ByteString.copyFromUtf8(JsonUtil.toJson(List.of(jobId))))
                            .build();
                    this.manageServer.sendMsg(node.getIdentity(), deleteMessage);
                }
                // break; if is there jod exist in multi collector?
            }
        }
    }

    @Override
    public void collectSyncJobResponse(List<CollectRep.MetricsData> metricsDataList) {
        if (CollectionUtils.isEmpty(metricsDataList)) {
            return;
        }
        CollectRep.MetricsData metricsData = metricsDataList.get(0);
        long monitorId = metricsData.getId();
        CollectResponseEventListener eventListener = eventListeners.remove(monitorId);
        if (Objects.nonNull(eventListener)) {
            eventListener.response(metricsDataList);
        }
    }

    public void setManageServer(ManageServer manageServer) {
        this.manageServer = manageServer;
    }
}
