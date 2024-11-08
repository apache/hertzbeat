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

package org.apache.hertzbeat.collector.collect.kafka;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.KafkaProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.DescribeTopicsResult;
import org.apache.kafka.clients.admin.ListTopicsOptions;
import org.apache.kafka.clients.admin.ListTopicsResult;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionInfo;
import org.springframework.util.Assert;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Slf4j
public class KafkaCollectImpl extends AbstractCollect {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        KafkaProtocol kafkaProtocol = metrics.getKclient();
        // Ensure that metrics and kafkaProtocol are not null
        Assert.isTrue(metrics != null && kafkaProtocol != null, "Kafka collect must have kafkaProtocol params");
        // Ensure that host and port are not empty
        Assert.hasText(kafkaProtocol.getHost(), "Kafka Protocol host is required.");
        Assert.hasText(kafkaProtocol.getPort(), "Kafka Protocol port is required.");
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        try {
            KafkaProtocol kafkaProtocol = metrics.getKclient();
            String command = kafkaProtocol.getCommand();
            boolean isKafkaCommand = SupportedCommand.isKafkaCommand(command);
            if (!isKafkaCommand) {
                log.error("Unsupported command: {}", command);
                return;
            }

            // Create AdminClient with the provided host and port
            AdminClient adminClient = KafkaConnect.getAdminClient(kafkaProtocol.getHost() + ":" + kafkaProtocol.getPort());

            // Execute the appropriate collection method based on the command
            switch (SupportedCommand.fromCommand(command)) {
                case TOPIC_DESCRIBE:
                    collectTopicDescribe(builder, adminClient);
                    break;
                case TOPIC_LIST:
                    collectTopicList(builder, adminClient);
                    break;
                case TOPIC_OFFSET:
                    collectTopicOffset(builder, adminClient);
                    break;
                default:
                    log.error("Unsupported command: {}", command);
                    break;
            }
        } catch (InterruptedException | ExecutionException e) {
            log.error("Kafka collect error", e);
        }
    }

    /**
     * Collect the earliest and latest offsets for each topic
     *
     * @param builder     The MetricsData builder
     * @param adminClient The AdminClient
     * @throws InterruptedException If the thread is interrupted
     * @throws ExecutionException   If an error occurs during execution
     */
    private void collectTopicOffset(CollectRep.MetricsData.Builder builder, AdminClient adminClient) throws InterruptedException, ExecutionException {
        ListTopicsResult listTopicsResult = adminClient.listTopics(new ListTopicsOptions().listInternal(true));
        Set<String> names = listTopicsResult.names().get();
        names.forEach(name -> {
            try {
                Map<String, TopicDescription> map = adminClient.describeTopics(Collections.singleton(name)).all().get(3L, TimeUnit.SECONDS);
                map.forEach((key, value) -> value.partitions().forEach(info -> extractedOffset(builder, adminClient, name, value, info)));
            } catch (TimeoutException | InterruptedException | ExecutionException e) {
                log.warn("Topic {} get offset fail", name);
            }
        });
    }

    private void extractedOffset(CollectRep.MetricsData.Builder builder, AdminClient adminClient, String name, TopicDescription value, TopicPartitionInfo info) {
        try {
            TopicPartition topicPartition = new TopicPartition(value.name(), info.partition());
            long earliestOffset = getEarliestOffset(adminClient, topicPartition);
            long latestOffset = getLatestOffset(adminClient, topicPartition);
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            valueRowBuilder.addColumns(value.name());
            valueRowBuilder.addColumns(String.valueOf(info.partition()));
            valueRowBuilder.addColumns(String.valueOf(earliestOffset));
            valueRowBuilder.addColumns(String.valueOf(latestOffset));
            builder.addValues(valueRowBuilder.build());
        } catch (TimeoutException | InterruptedException | ExecutionException e) {
            log.warn("Topic {} get offset fail", name);
        }
    }

    /**
     * Get the earliest offset for a given topic partition
     *
     * @param adminClient    The AdminClient
     * @param topicPartition The TopicPartition
     * @return The earliest offset
     */
    private long getEarliestOffset(AdminClient adminClient, TopicPartition topicPartition)
            throws InterruptedException, ExecutionException, TimeoutException {
        return adminClient
                .listOffsets(Collections.singletonMap(topicPartition, OffsetSpec.earliest()))
                .all()
                .get(3L, TimeUnit.SECONDS)
                .get(topicPartition)
                .offset();
    }

    /**
     * Get the latest offset for a given topic partition
     *
     * @param adminClient    The AdminClient
     * @param topicPartition The TopicPartition
     * @return The latest offset
     */
    private long getLatestOffset(AdminClient adminClient, TopicPartition topicPartition)
            throws InterruptedException, ExecutionException, TimeoutException {
        return adminClient
                .listOffsets(Collections.singletonMap(topicPartition, OffsetSpec.latest()))
                .all()
                .get(3L, TimeUnit.SECONDS)
                .get(topicPartition)
                .offset();
    }

    /**
     * Collect the list of topics
     *
     * @param builder     The MetricsData builder
     * @param adminClient The AdminClient
     */
    private static void collectTopicList(CollectRep.MetricsData.Builder builder, AdminClient adminClient) throws InterruptedException, ExecutionException {
        ListTopicsOptions options = new ListTopicsOptions().listInternal(true);
        Set<String> names = adminClient.listTopics(options).names().get();
        names.forEach(name -> {
            CollectRep.ValueRow valueRow = CollectRep.ValueRow.newBuilder().addColumns(name).build();
            builder.addValues(valueRow);
        });
    }

    /**
     * Collect the description of each topic
     *
     * @param builder     The MetricsData builder
     * @param adminClient The AdminClient
     */
    private static void collectTopicDescribe(CollectRep.MetricsData.Builder builder, AdminClient adminClient) throws InterruptedException, ExecutionException {
        ListTopicsOptions options = new ListTopicsOptions();
        options.listInternal(true);
        ListTopicsResult listTopicsResult = adminClient.listTopics(options);
        Set<String> names = listTopicsResult.names().get();
        DescribeTopicsResult describeTopicsResult = adminClient.describeTopics(names);
        Map<String, TopicDescription> map = describeTopicsResult.all().get();
        map.forEach((key, value) -> {
            List<TopicPartitionInfo> listp = value.partitions();
            listp.forEach(info -> {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                valueRowBuilder.addColumns(value.name());
                valueRowBuilder.addColumns(String.valueOf(value.partitions().size()));
                valueRowBuilder.addColumns(String.valueOf(info.partition()));
                valueRowBuilder.addColumns(info.leader().host());
                valueRowBuilder.addColumns(String.valueOf(info.leader().port()));
                valueRowBuilder.addColumns(String.valueOf(info.replicas().size()));
                valueRowBuilder.addColumns(String.valueOf(info.replicas()));
                builder.addValues(valueRowBuilder.build());
            });
        });
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_KAFKA;
    }
}