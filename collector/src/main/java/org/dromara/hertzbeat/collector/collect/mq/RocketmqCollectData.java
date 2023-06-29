package org.dromara.hertzbeat.collector.collect.mq;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * rocketmq采集数据实体类
 *
 * @author ceilzcx
 * @since 5/6/2023
 */
@Data
public class RocketmqCollectData {

    /**
     * cluster broker info
     */
    private List<ClusterBrokerData> clusterBrokerDataList;

    /**
     * consumer info
     */
    private List<ConsumerInfo> consumerInfoList;

    /**
     * topic info
     * Map[key: TopicName, value: Topic Queue info List]
     */
    private List<Map<String, List<TopicQueueInfo>>> topicInfoList;

    @Data
    public static class ClusterBrokerData {

        /**
         * broker id
         */
        private Long brokerId;

        /**
         * broker address
         */
        private String address;

        /**
         * mq version
         */
        private String version;

        /**
         * producer send message tps
         */
        private double producerMessageTps;

        /**
         * consumer receive message tps
         */
        private double consumerMessageTps;

        /**
         * yesterday producer send message count
         */
        private long yesterdayProduceCount;

        /**
         * today producer send message count
         */
        private long todayProduceCount;

        /**
         * yesterday consumer receive message count
         */
        private long yesterdayConsumeCount;

        /**
         * today consumer receive message count
         */
        private long todayConsumeCount;
    }

    @Data
    public static class ConsumerInfo {

        /**
         * consumer group
         */
        private String consumerGroup;

        /**
         * client num
         */
        private int clientQuantity;

        /**
         * message model
         */
        private String messageModel;

        /**
         * consume type
         */
        private String consumeType;

        /**
         * consume tps
         */
        private double consumeTps;

        /**
         * message delay
         */
        private long diffTotal;
    }

    @Data
    public static class TopicQueueInfo {

        /**
         * broker name
         */
        private String brokerName;

        /**
         * queue id
         */
        private int queueId;

        /**
         * message queue min offset
         */
        private long minOffset;

        /**
         * message queue max offset
         */
        private long maxOffset;

        /**
         * last update time(ms)
         */
        private long lastUpdateTimestamp;
    }
}
