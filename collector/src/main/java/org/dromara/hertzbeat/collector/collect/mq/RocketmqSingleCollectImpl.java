package org.dromara.hertzbeat.collector.collect.mq;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Lists;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.rocketmq.acl.common.AclClientRPCHook;
import org.apache.rocketmq.acl.common.SessionCredentials;
import org.apache.rocketmq.common.MixAll;
import org.apache.rocketmq.common.admin.ConsumeStats;
import org.apache.rocketmq.common.protocol.body.ClusterInfo;
import org.apache.rocketmq.common.protocol.body.ConsumerConnection;
import org.apache.rocketmq.common.protocol.body.KVTable;
import org.apache.rocketmq.common.protocol.body.SubscriptionGroupWrapper;
import org.apache.rocketmq.common.protocol.body.TopicList;
import org.apache.rocketmq.common.protocol.route.BrokerData;
import org.apache.rocketmq.common.utils.ThreadUtils;
import org.apache.rocketmq.remoting.RPCHook;
import org.apache.rocketmq.tools.admin.DefaultMQAdminExt;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.JsonPathParser;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.RocketmqProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.util.Assert;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * rocketmq采集实现类
 *
 * @author ceilzcx
 * @since 5/6/2023
 */
@Slf4j
public class RocketmqSingleCollectImpl extends AbstractCollect implements DisposableBean {

    private static final int WAIT_TIMEOUT = 10;

    private static final Set<String> SYSTEM_GROUP_SET = new HashSet<>();

    private final ExecutorService executorService;

    static {
        // system consumer group
        SYSTEM_GROUP_SET.add(MixAll.TOOLS_CONSUMER_GROUP);
        SYSTEM_GROUP_SET.add(MixAll.FILTERSRV_CONSUMER_GROUP);
        SYSTEM_GROUP_SET.add(MixAll.SELF_TEST_CONSUMER_GROUP);
        SYSTEM_GROUP_SET.add(MixAll.ONS_HTTP_PROXY_GROUP);
        SYSTEM_GROUP_SET.add(MixAll.CID_ONSAPI_PULL_GROUP);
        SYSTEM_GROUP_SET.add(MixAll.CID_ONSAPI_PERMISSION_GROUP);
        SYSTEM_GROUP_SET.add(MixAll.CID_ONSAPI_OWNER_GROUP);
        SYSTEM_GROUP_SET.add(MixAll.CID_SYS_RMQ_TRANS);
    }

    public RocketmqSingleCollectImpl() {
        Runtime runtime = Runtime.getRuntime();
        int corePoolSize = Math.max(8, runtime.availableProcessors());
        int maximumPoolSize = Math.max(16, runtime.availableProcessors());
        ThreadFactory threadFactory = new ThreadFactory() {
            private final AtomicLong threadIndex = new AtomicLong(0);

            @Override
            public Thread newThread(@NotNull Runnable r) {
                return new Thread(r, "RocketMQCollectGroup_" + this.threadIndex.incrementAndGet());
            }
        };
        this.executorService = new ThreadPoolExecutor(corePoolSize, maximumPoolSize, 60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(5000), threadFactory, new ThreadPoolExecutor.DiscardOldestPolicy());
    }

    @Override
    public void destroy() {
        ThreadUtils.shutdownGracefully(this.executorService, 10L, TimeUnit.SECONDS);
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        try {
            preCheck(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        DefaultMQAdminExt mqAdminExt = null;
        try {
            mqAdminExt = this.createMqAdminExt(metrics);
            mqAdminExt.start();

            RocketmqCollectData rocketmqCollectData = new RocketmqCollectData();
            this.collectData(mqAdminExt, rocketmqCollectData);

            this.fillBuilder(rocketmqCollectData, builder, metrics.getAliasFields(), metrics.getRocketmq().getParseScript());

        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            String message = CommonUtil.getMessageFromThrowable(e);
            builder.setMsg(message);
        } finally {
            if (mqAdminExt != null) {
                mqAdminExt.shutdown();
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_ROCKETMQ;
    }

    /**
     * 采集前置条件, 入参判断
     * @param metrics 数据指标
     */
    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getRocketmq() == null) {
            throw new IllegalArgumentException("Mongodb collect must has rocketmq params");
        }
        RocketmqProtocol rocketmq = metrics.getRocketmq();
        Assert.hasText(rocketmq.getNamesrvHost(), "Rocketmq Protocol namesrvHost is required.");
        Assert.hasText(rocketmq.getNamesrvPort(), "Rocketmq Protocol namesrvPort is required.");
    }

    /**
     * 创建DefaultMQAdminExt实体类; 这里有个小问题, 是否需要每次都重新创建
     * @param metrics 数据指标
     * @return DefaultMQAdminExt
     */
    private DefaultMQAdminExt createMqAdminExt(Metrics metrics) {
        RocketmqProtocol rocketmqProtocol = metrics.getRocketmq();
        assert rocketmqProtocol != null;
        RPCHook rpcHook = null;
        if (StringUtils.isNotBlank(rocketmqProtocol.getAccessKey()) && StringUtils.isNotBlank(rocketmqProtocol.getSecretKey())) {
            rpcHook = new AclClientRPCHook(new SessionCredentials(rocketmqProtocol.getAccessKey(), rocketmqProtocol.getSecretKey()));
        }
        DefaultMQAdminExt mqAdminExt = new DefaultMQAdminExt(rpcHook, 5000L);
        mqAdminExt.setNamesrvAddr(rocketmqProtocol.getNamesrvHost() + ":" + rocketmqProtocol.getNamesrvPort());
        mqAdminExt.setInstanceName("admin-" + System.currentTimeMillis());
        return mqAdminExt;
    }

    /**
     * 采集rocketmq数据
     * @param mqAdminExt rocketmq提供的远程调用类
     * @param rocketmqCollectData rocketmq数据采集类
     * @throws Exception 远程调用异常
     */
    private void collectData(DefaultMQAdminExt mqAdminExt, RocketmqCollectData rocketmqCollectData) throws Exception {
        this.collectClusterData(mqAdminExt, rocketmqCollectData);
        this.collectConsumerData(mqAdminExt, rocketmqCollectData);
        this.collectTopicData(mqAdminExt, rocketmqCollectData);
    }

    /**
     * 采集rocketmq的集群数据
     * @param mqAdminExt rocketmq提供的远程调用类
     * @param rocketmqCollectData rocketmq数据采集类
     * @throws Exception 远程调用异常
     */
    private void collectClusterData(DefaultMQAdminExt mqAdminExt, RocketmqCollectData rocketmqCollectData) throws Exception {
        try {
            List<RocketmqCollectData.ClusterBrokerData> clusterBrokerDataList = new ArrayList<>();
            rocketmqCollectData.setClusterBrokerDataList(clusterBrokerDataList);

            ClusterInfo clusterInfo = mqAdminExt.examineBrokerClusterInfo();
            for (BrokerData brokerData : clusterInfo.getBrokerAddrTable().values()) {

                for (Map.Entry<Long, String> entry : brokerData.getBrokerAddrs().entrySet()) {
                    RocketmqCollectData.ClusterBrokerData clusterBrokerData = new RocketmqCollectData.ClusterBrokerData();
                    clusterBrokerDataList.add(clusterBrokerData);

                    clusterBrokerData.setBrokerId(entry.getKey());
                    clusterBrokerData.setAddress(entry.getValue());

                    KVTable kvTable = mqAdminExt.fetchBrokerRuntimeStats(entry.getValue());
                    clusterBrokerData.setVersion(kvTable.getTable().get("brokerVersionDesc"));

                    String putTps = kvTable.getTable().get("putTps");
                    if (StringUtils.isNotEmpty(putTps)) {
                        String[] putTpsArr = putTps.split(" ");
                        clusterBrokerData.setProducerMessageTps(Double.parseDouble(putTpsArr[0]));
                    }

                    String getTransferredTps = kvTable.getTable().get("getTransferedTps");
                    if (StringUtils.isNotEmpty(getTransferredTps)) {
                        String[] getTransferredTpsArr = getTransferredTps.split(" ");
                        clusterBrokerData.setConsumerMessageTps(Double.parseDouble(getTransferredTpsArr[0]));
                    }

                    String msgPutTotalTodayMorning = kvTable.getTable().get("msgPutTotalTodayMorning");
                    String msgPutTotalYesterdayMorning = kvTable.getTable().get("msgPutTotalYesterdayMorning");
                    if (StringUtils.isNotEmpty(msgPutTotalTodayMorning) && StringUtils.isNotEmpty(msgPutTotalYesterdayMorning)) {
                        long yesterdayProduceCount = Long.parseLong(msgPutTotalTodayMorning) - Long.parseLong(msgPutTotalYesterdayMorning);
                        clusterBrokerData.setYesterdayProduceCount(yesterdayProduceCount);
                    }

                    String msgGetTotalTodayMorning = kvTable.getTable().get("msgGetTotalTodayMorning");
                    String msgGetTotalYesterdayMorning = kvTable.getTable().get("msgGetTotalYesterdayMorning");
                    if (StringUtils.isNotEmpty(msgGetTotalTodayMorning) && StringUtils.isNotEmpty(msgGetTotalYesterdayMorning)) {
                        long yesterdayConsumerCount = Long.parseLong(msgGetTotalTodayMorning) - Long.parseLong(msgGetTotalYesterdayMorning);
                        clusterBrokerData.setYesterdayConsumeCount(yesterdayConsumerCount);
                    }

                    String msgPutTotalTodayNow = kvTable.getTable().get("msgPutTotalTodayNow");
                    if (StringUtils.isNotEmpty(msgPutTotalTodayNow) && StringUtils.isNotEmpty(msgPutTotalTodayMorning)) {
                        long todayProduceCount = Long.parseLong(msgPutTotalTodayNow) - Long.parseLong(msgPutTotalTodayMorning);
                        clusterBrokerData.setTodayProduceCount(todayProduceCount);
                    }

                    String msgGetTotalTodayNow = kvTable.getTable().get("msgGetTotalTodayNow");
                    if (StringUtils.isNotEmpty(msgGetTotalTodayNow) && StringUtils.isNotEmpty(msgGetTotalTodayMorning)) {
                        long todayConsumerCount = Long.parseLong(msgGetTotalTodayNow) - Long.parseLong(msgGetTotalTodayMorning);
                        clusterBrokerData.setTodayConsumeCount(todayConsumerCount);
                    }
                }

            }
        } catch (Exception e) {
            log.warn("collect rocketmq cluster data error", e);
            throw e;
        }
    }

    /**
     * 采集rocketmq的消费者数据
     * @param mqAdminExt rocketmq提供的远程调用类
     * @param rocketmqCollectData rocketmq数据采集类
     * @throws Exception 远程调用异常
     */
    private void collectConsumerData(DefaultMQAdminExt mqAdminExt, RocketmqCollectData rocketmqCollectData) throws Exception {
        Set<String> consumerGroupSet = new HashSet<>();
        try {
            // 获取consumerGroup集合
            ClusterInfo clusterInfo = mqAdminExt.examineBrokerClusterInfo();
            for (BrokerData brokerData : clusterInfo.getBrokerAddrTable().values()) {
                SubscriptionGroupWrapper subscriptionGroupWrapper = mqAdminExt.getAllSubscriptionGroup(brokerData.selectBrokerAddr(), 3000L);
                consumerGroupSet.addAll(subscriptionGroupWrapper.getSubscriptionGroupTable().keySet());
            }

            List<RocketmqCollectData.ConsumerInfo> consumerInfoList = Collections.synchronizedList(Lists.newArrayList());
            rocketmqCollectData.setConsumerInfoList(consumerInfoList);
            CountDownLatch countDownLatch = new CountDownLatch(consumerGroupSet.size());
            for (String consumerGroup : consumerGroupSet) {
                if (SYSTEM_GROUP_SET.contains(consumerGroup)) {
                    continue;
                }
                executorService.submit(() -> {
                    RocketmqCollectData.ConsumerInfo consumerInfo = new RocketmqCollectData.ConsumerInfo();
                    consumerInfoList.add(consumerInfo);
                    consumerInfo.setConsumerGroup(consumerGroup);
                    try {
                        ConsumeStats consumeStats = null;
                        try {
                            consumeStats = mqAdminExt.examineConsumeStats(consumerGroup);
                        }
                        catch (Exception e) {
                            log.warn("examineConsumeStats exception to consumerGroup {}, response [{}]", consumerGroup, e.getMessage());
                        }
                        if (consumeStats != null) {
                            consumerInfo.setConsumeTps(consumeStats.getConsumeTps());
                            consumerInfo.setDiffTotal(consumeStats.computeTotalDiff());
                        }

                        ConsumerConnection consumerConnection = null;
                        try {
                            consumerConnection = mqAdminExt.examineConsumerConnectionInfo(consumerGroup);
                        }
                        catch (Exception e) {
                            log.warn("examineConsumeStats exception to consumerGroup {}, response [{}]", consumerGroup, e.getMessage());
                        }
                        if (consumerConnection != null) {
                            consumerInfo.setClientQuantity(consumerConnection.getConnectionSet().size());
                            consumerInfo.setMessageModel(consumerConnection.getMessageModel().getModeCN());
                            consumerInfo.setConsumeType(consumerConnection.getConsumeType().getTypeCN());
                        }
                    } catch (Exception e) {
                        log.warn("examineConsumeStats or examineConsumerConnectionInfo error, {}", consumerGroup, e);
                    } finally {
                        countDownLatch.countDown();
                    }
                });
            }

            if (!countDownLatch.await(WAIT_TIMEOUT, TimeUnit.SECONDS)) {
                log.warn("examineConsumeStats or examineConsumerConnectionInfo timeout");
            }
        } catch (Exception e) {
            log.warn("collect rocketmq consume data error", e);
            throw e;
        }
    }

    /**
     *
     * @param mqAdminExt rocketmq提供的远程调用类
     * @param rocketmqCollectData rocketmq数据采集类
     * @throws Exception 远程调用异常
     */
    private void collectTopicData(DefaultMQAdminExt mqAdminExt, RocketmqCollectData rocketmqCollectData) throws Exception {
        try {
            TopicList topicList = mqAdminExt.fetchAllTopicList();
            Set<String> topics = topicList.getTopicList()
                    .stream()
                    .filter(topic -> !(topic.startsWith(MixAll.RETRY_GROUP_TOPIC_PREFIX) || topic.startsWith(MixAll.DLQ_GROUP_TOPIC_PREFIX)))
                    .collect(Collectors.toSet());
            List<Map<String /* topic */, List<RocketmqCollectData.TopicQueueInfo>>> topicInfoList = new ArrayList<>();
            for (String topic : topics) {
                Map<String, List<RocketmqCollectData.TopicQueueInfo>> topicQueueInfoTable = new HashMap<>(32);
                List<RocketmqCollectData.TopicQueueInfo> topicQueueInfoList = new ArrayList<>();

                // todo 查询topic的queue信息需要for循环调用 mqAdminExt.examineTopicStats(), topic数量很大的情况, 调用次数也会很多

                topicQueueInfoTable.put(topic, topicQueueInfoList);
                topicInfoList.add(topicQueueInfoTable);
                rocketmqCollectData.setTopicInfoList(topicInfoList);
            }
        } catch (Exception e) {
            log.warn("collect rocketmq topic data error", e);
            throw e;
        }
    }

    /**
     * 采集数据填充到builder
     * @param rocketmqCollectData rocketmq数据采集类
     * @param builder metrics data builder
     * @param aliasFields 字段别名
     * @param parseScript JSON的base path
     */
    private void fillBuilder(RocketmqCollectData rocketmqCollectData, CollectRep.MetricsData.Builder builder, List<String> aliasFields, String parseScript) {
        String dataJson = JSONObject.toJSONString(rocketmqCollectData);
        List<Object> results = JsonPathParser.parseContentWithJsonPath(dataJson, parseScript);
        for (int i = 0; i < results.size(); i++) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String aliasField : aliasFields) {
                List<Object> valueList = JsonPathParser.parseContentWithJsonPath(dataJson, parseScript + aliasField);
                if (CollectionUtils.isNotEmpty(valueList) && valueList.size() > i) {
                    Object value = valueList.get(i);
                    valueRowBuilder.addColumns(value == null ? CommonConstants.NULL_VALUE : String.valueOf(value));
                } else {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                }
            }
            builder.addValues(valueRowBuilder.build());
        }
    }
}
