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

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectResponseEventListener;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.job.Configmap;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.manager.Param;
import org.dromara.hertzbeat.common.entity.manager.ParamDefine;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.dromara.hertzbeat.manager.dao.MonitorDao;
import org.dromara.hertzbeat.manager.dao.ParamDao;
import org.dromara.hertzbeat.manager.scheduler.netty.ManageServer;
import org.dromara.hertzbeat.manager.service.AppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * collector service
 *
 * @author tom
 */
@Component
@AutoConfigureAfter(value = {SchedulerProperties.class})
@Slf4j
public class CollectorAndJobScheduler implements CollectorScheduling, CollectJobScheduling {

    private final Map<Long, Job> jobContentCache = new ConcurrentHashMap<>(16);

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

    private ManageServer manageServer;

    @Override
    public void collectorGoOnline(String identity, CollectorInfo collectorInfo) {
        Optional<Collector> collectorOptional = collectorDao.findCollectorByName(identity);
        Collector collector;
        if (collectorOptional.isPresent()) {
            collector = collectorOptional.get();
            if (collector.getStatus() == CommonConstants.COLLECTOR_STATUS_ONLINE) {
                return;
            }
            collector.setStatus(CommonConstants.COLLECTOR_STATUS_ONLINE);
            if (collectorInfo != null) {
                collector.setIp(collectorInfo.getIp());
                collector.setMode(collectorInfo.getMode());   
            }
        } else {
            if (collectorInfo == null) {
                log.error("collectorInfo can not null when collector not existed");
                return;
            }
            collector = Collector.builder().name(identity).ip(collectorInfo.getIp())
                    .mode(collectorInfo.getMode())
                    .status(CommonConstants.COLLECTOR_STATUS_ONLINE).build();
        }
        collectorDao.save(collector);
        ConsistentHash.Node node = new ConsistentHash.Node(identity, collector.getMode(),
                collector.getIp(), System.currentTimeMillis(), null);
        consistentHash.addNode(node);
        reBalanceCollectorAssignJobs();
        // 读取数据库此collector下的固定采集任务并下发
        List<CollectorMonitorBind> binds = collectorMonitorBindDao.findCollectorMonitorBindsByCollector(identity);
        for (CollectorMonitorBind bind : binds) {
            Optional<Monitor> monitorOptional = monitorDao.findById(bind.getMonitorId());
            if (monitorOptional.isPresent()) {
                Monitor monitor = monitorOptional.get();
                if (monitor.getStatus() == CommonConstants.UN_MANAGE_CODE) {
                    continue;
                }
                try {
                    // 构造采集任务Job实体
                    Job appDefine = appService.getAppDefine(monitor.getApp());
                    if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                        appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
                    }
                    appDefine.setMonitorId(monitor.getId());
                    appDefine.setInterval(monitor.getIntervals());
                    appDefine.setCyclic(true);
                    appDefine.setTimestamp(System.currentTimeMillis());
                    List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                    List<Configmap> configmaps = params.stream()
                            .map(param -> new Configmap(param.getField(), param.getValue(),
                                    param.getType())).collect(Collectors.toList());
                    List<ParamDefine> paramDefaultValue = appDefine.getParams().stream()
                            .filter(item -> StringUtils.hasText(item.getDefaultValue()))
                            .collect(Collectors.toList());
                    paramDefaultValue.forEach(defaultVar -> {
                        if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                            // todo type
                            Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), (byte) 1);
                            configmaps.add(configmap);
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
    }

    @Override
    public void collectorGoOffline(String identity) {
        Optional<Collector> collectorOptional = collectorDao.findCollectorByName(identity);
        if (collectorOptional.isPresent()) {
            log.info("the collector: {} is going offline now.", identity);
            Collector collector = collectorOptional.get();
            collector.setStatus(CommonConstants.COLLECTOR_STATUS_OFFLINE);
            collectorDao.save(collector);
            consistentHash.removeNode(identity);
            reBalanceCollectorAssignJobs();
        }
    }

    @Override
    public void reBalanceCollectorAssignJobs() {
        consistentHash.getAllNodes().entrySet().parallelStream().forEach(entry -> {
            String collectorName = entry.getKey();
            AssignJobs assignJobs = entry.getValue().getAssignJobs();
            if (assignJobs != null) {
                if (CommonConstants.MAIN_COLLECTOR_NODE.equals(collectorName)) {
                    if (!assignJobs.getAddingJobs().isEmpty()) {
                        Set<Long> addedJobIds = new HashSet<>(8);
                        for (Long addingJobId : assignJobs.getAddingJobs()) {
                            Job job = jobContentCache.get(addingJobId);
                            if (job == null) {
                                log.error("assigning job {} content is null.", addingJobId);
                                continue;
                            }
                            addedJobIds.add(addingJobId);
                            collectJobService.addAsyncCollectJob(job);
                        }
                        assignJobs.addAssignJobs(addedJobIds);
                        assignJobs.removeAddingJobs(addedJobIds);
                    }
                    if (!assignJobs.getRemovingJobs().isEmpty()) {
                        assignJobs.getRemovingJobs().forEach(jobId -> collectJobService.cancelAsyncCollectJob(jobId));
                        assignJobs.clearRemovingJobs();
                    }
                } else {
                    if (!assignJobs.getAddingJobs().isEmpty()) {
                        Set<Long> addedJobIds = new HashSet<>(8);
                        for (Long addingJobId : assignJobs.getAddingJobs()) {
                            Job job = jobContentCache.get(addingJobId);
                            if (job == null) {
                                log.error("assigning job {} content is null.", addingJobId);
                                continue;
                            }
                            addedJobIds.add(addingJobId);
                            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                    .setDirection(ClusterMsg.Direction.REQUEST)
                                    .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                                    .setMsg(JsonUtil.toJson(job))
                                    .build();
                            this.manageServer.sendMsg(collectorName, message);
                        }
                        assignJobs.addAssignJobs(addedJobIds);
                        assignJobs.removeAddingJobs(addedJobIds);
                    }
                    if (!assignJobs.getRemovingJobs().isEmpty()) {
                        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                .setDirection(ClusterMsg.Direction.REQUEST)
                                .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                                .setMsg(JsonUtil.toJson(assignJobs.getRemovingJobs()))
                                .build();
                        this.manageServer.sendMsg(collectorName, message);
                        assignJobs.clearRemovingJobs();
                    }
                }
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
        if (response == null || !String.valueOf(CommonConstants.SUCCESS_CODE).equals(response.getMsg())) {
            return false;
        }
        log.info("send offline collector message to {} success", identity);
        this.collectorGoOffline(identity);
        return true;
    }

    @Override
    public boolean onlineCollector(String identity) {
        Optional<Collector> collectorOptional = collectorDao.findCollectorByName(identity);
        if (collectorOptional.isEmpty()) {
            return false;
        }
        Collector collector = collectorOptional.get();
        ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                .setType(ClusterMsg.MessageType.GO_ONLINE)
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setIdentity(identity)
                .build();
        ClusterMsg.Message response = this.manageServer.sendMsgSync(identity, message);
        if (response == null || !String.valueOf(CommonConstants.SUCCESS_CODE).equals(response.getMsg())) {
            return false;
        }
        log.info("send online collector message to {} success", identity);
        CollectorInfo collectorInfo = CollectorInfo.builder()
                .name(collector.getName())
                .ip(collector.getIp())
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
        if (node == null) {
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

            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setType(ClusterMsg.MessageType.ISSUE_ONE_TIME_TASK)
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setMsg(JsonUtil.toJson(job))
                    .build();
            boolean result = this.manageServer.sendMsg(node.getIdentity(), message);

            if (result) {
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
            }
            try {
                countDownLatch.await(120, TimeUnit.SECONDS);
            } catch (Exception e) {
                log.info("The sync task runs for 120 seconds with no response and returns");
            }
            return metricsData;
        }
    }

    @Override
    public List<CollectRep.MetricsData> collectSyncJobData(Job job, String collector) {
        ConsistentHash.Node node = consistentHash.getNode(collector);
        if (node == null) {
            log.error("there is no collector online to assign job.");
            CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                    .setCode(CollectRep.Code.FAIL)
                    .setMsg("the collector is offline and cannot assign job")
                    .build();
            return Collections.singletonList(metricsData);
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
            return collectJobService.collectSyncJobData(job);
        } else {
            List<CollectRep.MetricsData> metricsData = new LinkedList<>();
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setType(ClusterMsg.MessageType.ISSUE_ONE_TIME_TASK)
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setMsg(JsonUtil.toJson(job))
                    .build();
            boolean result = this.manageServer.sendMsg(node.getIdentity(), message);
            if (result) {
                CountDownLatch countDownLatch = new CountDownLatch(1);
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
                try {
                    countDownLatch.await(120, TimeUnit.SECONDS);
                } catch (Exception e) {
                    log.info("The sync task runs for 120 seconds with no response and returns");
                }
            }
            return metricsData;
        }
    }

    @Override
    public long addAsyncCollectJob(Job job, String collector) {
        long jobId = SnowFlakeIdGenerator.generateId();
        job.setId(jobId);
        jobContentCache.put(jobId, job);
        ConsistentHash.Node node;
        if (collector == null) {
            // todo dispatchKey ip+port or id
            String dispatchKey = String.valueOf(job.getMonitorId());
            node = consistentHash.dispatchJob(dispatchKey, jobId);
            if (node == null) {
                log.error("there is no collector online to assign job.");
                return jobId;
            }
        } else {
            node = consistentHash.getNode(collector);
            if (node == null) {
                log.error("there is no collector name: {} online to assign job.", collector);
                return jobId;
            }
            node.getAssignJobs().addPinnedJob(jobId);
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
            collectJobService.addAsyncCollectJob(job);
        } else {
            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                    .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setMsg(JsonUtil.toJson(job))
                    .build();
            this.manageServer.sendMsg(node.getIdentity(), message);
        }
        return jobId;
    }

    @Override
    public long updateAsyncCollectJob(Job modifyJob) {
        // delete and add
        long preJobId = modifyJob.getId();
        long newJobId = addAsyncCollectJob(modifyJob, null);
        jobContentCache.remove(preJobId);
        cancelAsyncCollectJob(preJobId);
        return newJobId;
    }

    @Override
    public long updateAsyncCollectJob(Job modifyJob, String collector) {
        // delete and add
        long preJobId = modifyJob.getId();
        long newJobId = addAsyncCollectJob(modifyJob, collector);
        jobContentCache.remove(preJobId);
        cancelAsyncCollectJob(preJobId);
        return newJobId;
    }

    @Override
    public void cancelAsyncCollectJob(Long jobId) {
        for (ConsistentHash.Node node : consistentHash.getAllNodes().values()) {
            AssignJobs assignJobs = node.getAssignJobs();
            if (assignJobs.getPinnedJobs().remove(jobId)
                    || assignJobs.getJobs().remove(jobId) || assignJobs.getAddingJobs().remove(jobId)) {
                node.removeVirtualNodeJob(jobId);
                if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getIdentity())) {
                    collectJobService.cancelAsyncCollectJob(jobId);
                } else {
                    ClusterMsg.Message deleteMessage = ClusterMsg.Message.newBuilder()
                            .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                            .setDirection(ClusterMsg.Direction.REQUEST)
                            .setMsg(JsonUtil.toJson(List.of(jobId)))
                            .build();
                    this.manageServer.sendMsg(node.getIdentity(), deleteMessage);
                }
                break;
            }
        }
    }

    @Override
    public void collectSyncJobResponse(List<CollectRep.MetricsData> metricsDataList) {
        if (metricsDataList.isEmpty()) {
            return;
        }
        CollectRep.MetricsData metricsData = metricsDataList.get(0);
        long monitorId = metricsData.getId();
        CollectResponseEventListener eventListener = eventListeners.remove(monitorId);
        if (eventListener != null) {
            eventListener.response(metricsDataList);
        }
    }

    public void setManageServer(ManageServer manageServer) {
        this.manageServer = manageServer;
    }

}
