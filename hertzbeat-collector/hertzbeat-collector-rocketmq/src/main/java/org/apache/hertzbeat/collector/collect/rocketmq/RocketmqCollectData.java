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

package org.apache.hertzbeat.collector.collect.rocketmq;

import java.util.List;
import java.util.Map;
import lombok.Data;

/**
 * rocketmq collect data
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

    /**
     * ClusterBrokerData
     */
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

    /**
     * ConsumerInfo
     */
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

    /**
     * TopicQueueInfo
     */
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
