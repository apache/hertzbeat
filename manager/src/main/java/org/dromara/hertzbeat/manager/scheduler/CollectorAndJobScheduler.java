package org.dromara.hertzbeat.manager.scheduler;

import io.netty.channel.Channel;
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
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.dromara.hertzbeat.manager.dao.MonitorDao;
import org.dromara.hertzbeat.manager.dao.ParamDao;
import org.dromara.hertzbeat.manager.service.AppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * collector service 
 * @author tom
 */
@Component
@AutoConfigureAfter(value = {SchedulerProperties.class})
@Slf4j
public class CollectorAndJobScheduler implements CollectorScheduling, CollectJobScheduling, CommandLineRunner {
    
    private final Map<String, Channel> collectorChannelMap = new ConcurrentHashMap<>(16);
    
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

    @Override
    public void collectorGoOnline(String identity) {
        Optional<Collector> collectorOptional = collectorDao.findCollectorByName(identity);
        if (collectorOptional.isPresent()) {
            Collector collector = collectorOptional.get();
            CollectorInfo collectorInfo = new CollectorInfo();
            collectorInfo.setIp(collector.getIp());
            collectorInfo.setName(collector.getName());
            this.collectorGoOnline(identity, collectorInfo);
        }
    }

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
            collector.setIp(collectorInfo.getIp());
        } else {
            collector = Collector.builder().name(identity).ip(collectorInfo.getIp())
                                .status(CommonConstants.COLLECTOR_STATUS_ONLINE).build();
        }
        collectorDao.save(collector);
        ConsistentHash.Node node = new ConsistentHash.Node(identity, collectorInfo.getIp(), System.currentTimeMillis(), null);
        consistentHash.addNode(node);
        reBalanceCollectorAssignJobs();
        // 读取数据库此collector下的固定采集任务并下发
        List<CollectorMonitorBind> binds = collectorMonitorBindDao.findCollectorMonitorBindsByCollector(identity);
        for (CollectorMonitorBind bind : binds) {
            Optional<Monitor> monitorOptional = monitorDao.findById(bind.getMonitorId());
            if (monitorOptional.isPresent()) {
                Monitor monitor = monitorOptional.get();
                try {
                    // 构造采集任务Job实体
                    Job appDefine = appService.getAppDefine(monitor.getApp());
                    // todo 这里暂时是深拷贝处理
                    appDefine = appDefine.clone();
                    appDefine.setId(monitor.getJobId());
                    appDefine.setMonitorId(monitor.getId());
                    appDefine.setInterval(monitor.getIntervals());
                    appDefine.setCyclic(true);
                    appDefine.setTimestamp(System.currentTimeMillis());
                    List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                    List<Configmap> configmaps = params.stream()
                                                         .map(param -> new Configmap(param.getField(), param.getValue(),
                                                                 param.getType())).collect(Collectors.toList());
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
                    Channel channel = collectorChannelMap.get(collectorName);
                    if (channel == null || !channel.isActive()) {
                        collectorChannelMap.remove(collectorName);
                        log.error("channel: {} offline now, can not assign jobs.", collectorName);
                    } else {
                        if (!assignJobs.getAddingJobs().isEmpty()) {
                            Set<Long> addedJobIds = new HashSet<>(8);
                            for (Long addingJobId : assignJobs.getAddingJobs()) {
                                Job job = jobContentCache.get(addingJobId);
                                if (job == null) {
                                    log.error("assigning job {} content is null.", addingJobId);
                                    continue;
                                }
                                ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                                     .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                                                                     .setMsg(JsonUtil.toJson(job))
                                                                     .build();
                                channel.writeAndFlush(message);
                            }
                            assignJobs.addAssignJobs(addedJobIds);
                            assignJobs.removeAddingJobs(addedJobIds);
                        }
                        if (!assignJobs.getRemovingJobs().isEmpty()) {
                            ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                                 .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                                                                 .setMsg(JsonUtil.toJson(assignJobs.getRemovingJobs()))
                                                                 .build();
                            channel.writeAndFlush(message);
                            assignJobs.clearRemovingJobs();
                        }
                    }   
                }
            }
        });
    }
    
    @Override
    public void holdCollectorChannel(String identity, Channel channel) {
        this.collectorChannelMap.put(identity, channel);
    }

    @Override
    public boolean isCollectorChannelExist(String identity) {
        return this.collectorChannelMap.get(identity) != null;
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
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getName())) {
            return collectJobService.collectSyncJobData(job);
        } else {
            List<CollectRep.MetricsData> metricsData = new LinkedList<>();
            Channel channel = collectorChannelMap.get(node.getName());
            if (channel == null || !channel.isActive()) {
                collectorChannelMap.remove(node.getName());
                log.error("channel: {} offline now, can not assign job {}.", node.getName(), job.getId());
                return metricsData;
            } else {
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
                ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                     .setType(ClusterMsg.MessageType.ISSUE_ONE_TIME_TASK)
                                                     .setMsg(JsonUtil.toJson(job))
                                                     .build();
                channel.writeAndFlush(message);
                eventListeners.put(job.getMonitorId(), listener);
                try {
                    countDownLatch.await(120, TimeUnit.SECONDS);
                } catch (Exception e) {
                    log.info("The sync task runs for 120 seconds with no response and returns");
                }
                return metricsData;
            }
        }
    }
    
    @Override
    public List<CollectRep.MetricsData> collectSyncJobData(Job job, String collector) {
        ConsistentHash.Node node = consistentHash.getNode(collector);
        if (node == null) {
            log.error("there is no collector online to assign job.");
            CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                                                         .setCode(CollectRep.Code.FAIL)
                                                         .setMsg("no collector online to assign job")
                                                         .build();
            return Collections.singletonList(metricsData);
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getName())) {
            return collectJobService.collectSyncJobData(job);
        } else {
            List<CollectRep.MetricsData> metricsData = new LinkedList<>();
            Channel channel = collectorChannelMap.get(node.getName());
            if (channel == null || !channel.isActive()) {
                collectorChannelMap.remove(node.getName());
                log.error("channel: {} offline now, can not assign job {}.", node.getName(), job.getId());
                return metricsData;
            } else {
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
                ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                     .setType(ClusterMsg.MessageType.ISSUE_ONE_TIME_TASK)
                                                     .setMsg(JsonUtil.toJson(job))
                                                     .build();
                channel.writeAndFlush(message);
                eventListeners.put(job.getMonitorId(), listener);
                try {
                    countDownLatch.await(120, TimeUnit.SECONDS);
                } catch (Exception e) {
                    log.info("The sync task runs for 120 seconds with no response and returns");
                }
                return metricsData;
            }
        }
    }
    
    @Override
    public long addAsyncCollectJob(Job job) {
        long jobId = SnowFlakeIdGenerator.generateId();
        job.setId(jobId);
        jobContentCache.put(jobId, job);
        // todo dispatchKey ip+port or id
        String dispatchKey = String.valueOf(job.getMonitorId());
        ConsistentHash.Node node = consistentHash.dispatchJob(dispatchKey, jobId);
        if (node == null) {
            log.error("there is no collector online to assign job.");
            return jobId;
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getName())) {
            collectJobService.addAsyncCollectJob(job);
        } else {
            Channel channel = collectorChannelMap.get(node.getName());
            if (channel == null || !channel.isActive()) {
                collectorChannelMap.remove(node.getName());
                log.error("channel: {} offline now, can not assign job monitor {}.", node.getName(), jobId);
            } else {
                ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                     .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                                                     .setMsg(JsonUtil.toJson(job))
                                                     .build();
                channel.writeAndFlush(message);
            }    
        }
        return jobId;
    }
    
    @Override
    public long addAsyncCollectJob(Job job, String collector) {
        long jobId = SnowFlakeIdGenerator.generateId();
        job.setId(jobId);
        jobContentCache.put(jobId, job);
        ConsistentHash.Node node = consistentHash.getNode(collector);
        if (node == null) {
            log.error("there is no collector name: {} online to assign job.", collector);
            return jobId;
        }
        node.getAssignJobs().addPinnedJob(jobId);
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getName())) {
            collectJobService.addAsyncCollectJob(job);
        } else {
            Channel channel = collectorChannelMap.get(node.getName());
            if (channel == null || !channel.isActive()) {
                collectorChannelMap.remove(node.getName());
                log.error("channel: {} offline now, can not assign job {}.", node.getName(), jobId);
            } else {
                ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                     .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                                                     .setMsg(JsonUtil.toJson(job))
                                                     .build();
                channel.writeAndFlush(message);
            }   
        }
        return jobId;
    }
    
    @Override
    public long updateAsyncCollectJob(Job modifyJob) {
        // delete and add
        long preJobId = modifyJob.getId();
        long newJobId = SnowFlakeIdGenerator.generateId();
        modifyJob.setId(newJobId);
        jobContentCache.remove(preJobId);
        jobContentCache.put(newJobId, modifyJob);
        // todo dispatchKey ip+port or id
        String dispatchKey = String.valueOf(modifyJob.getMonitorId());
        ConsistentHash.Node node = consistentHash.dispatchJob(dispatchKey, newJobId);
        if (node == null) {
            log.error("there is no collector online to assign job.");
            return newJobId;
        }
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getName())) {
            collectJobService.addAsyncCollectJob(modifyJob);
            collectJobService.cancelAsyncCollectJob(preJobId);
        } else {
            Channel channel = collectorChannelMap.get(node.getName());
            if (channel == null || !channel.isActive()) {
                collectorChannelMap.remove(node.getName());
                log.error("channel: {} offline now, can not assign job {}.", node.getName(), newJobId);
            } else {
                ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                     .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                                                     .setMsg(JsonUtil.toJson(modifyJob))
                                                     .build();
                channel.writeAndFlush(message);
                ClusterMsg.Message deleteMessage = ClusterMsg.Message.newBuilder()
                                                           .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                                                           .setMsg(JsonUtil.toJson(List.of(preJobId)))
                                                           .build();
                channel.writeAndFlush(deleteMessage);
            }   
        }
        return newJobId;
    }
    
    @Override
    public long updateAsyncCollectJob(Job modifyJob, String collector) {
        // delete and add
        long preJobId = modifyJob.getId();
        long newJobId = SnowFlakeIdGenerator.generateId();
        modifyJob.setId(newJobId);
        jobContentCache.remove(preJobId);
        jobContentCache.put(newJobId, modifyJob);
        ConsistentHash.Node node = consistentHash.getNode(collector);
        if (node == null) {
            log.error("there is no collector name: {} online to assign job.", collector);
            return newJobId;
        }
        node.getAssignJobs().removePinnedJob(preJobId);
        node.getAssignJobs().addPinnedJob(newJobId);
        
        if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getName())) {
            collectJobService.addAsyncCollectJob(modifyJob);
            collectJobService.cancelAsyncCollectJob(preJobId);
        } else {
            Channel channel = collectorChannelMap.get(node.getName());
            if (channel == null || !channel.isActive()) {
                collectorChannelMap.remove(node.getName());
                log.error("channel: {} offline now, can not assign job {}.", node.getName(), newJobId);
            } else {
                ClusterMsg.Message message = ClusterMsg.Message.newBuilder()
                                                     .setType(ClusterMsg.MessageType.ISSUE_CYCLIC_TASK)
                                                     .setMsg(JsonUtil.toJson(modifyJob))
                                                     .build();
                channel.writeAndFlush(message);
                ClusterMsg.Message deleteMessage = ClusterMsg.Message.newBuilder()
                                                           .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                                                           .setMsg(JsonUtil.toJson(List.of(preJobId)))
                                                           .build();
                channel.writeAndFlush(deleteMessage);
            }   
        }
        return newJobId;
    }
    
    @Override
    public void cancelAsyncCollectJob(Long jobId) {
        consistentHash.getAllNodes().entrySet().stream().filter( entry -> {
            ConsistentHash.Node node = entry.getValue();
            AssignJobs assignJobs = node.getAssignJobs();
            return assignJobs.getPinnedJobs().contains(jobId)
                                        || assignJobs.getJobs().contains(jobId) || assignJobs.getAddingJobs().contains(jobId);
        }).findFirst().ifPresent(entry -> {
            ConsistentHash.Node node = entry.getValue();
            if (CommonConstants.MAIN_COLLECTOR_NODE.equals(node.getName())) {
                collectJobService.cancelAsyncCollectJob(jobId);
            } else {
                Channel channel = collectorChannelMap.get(node.getName());
                if (channel == null || !channel.isActive()) {
                    collectorChannelMap.remove(node.getName());
                    log.error("channel: {} offline now, can not cancel job {}.", node.getName(), jobId);
                } else {
                    ClusterMsg.Message deleteMessage = ClusterMsg.Message.newBuilder()
                                                               .setType(ClusterMsg.MessageType.DELETE_CYCLIC_TASK)
                                                               .setMsg(JsonUtil.toJson(List.of(jobId)))
                                                               .build();
                    channel.writeAndFlush(deleteMessage);
                }   
            }
        });
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
    
    @Override
    public void run(String... args) throws Exception {
        // start detect not active channel client
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor();
        scheduledExecutor.scheduleAtFixedRate(() -> {
            collectorChannelMap.forEach((collector, channel) -> {
                if (!channel.isActive()) {
                    channel.closeFuture();
                    collectorChannelMap.remove(collector);
                    collectorGoOffline(collector);
                }
            });
            }, 10, 3, TimeUnit.SECONDS);
    }
}
