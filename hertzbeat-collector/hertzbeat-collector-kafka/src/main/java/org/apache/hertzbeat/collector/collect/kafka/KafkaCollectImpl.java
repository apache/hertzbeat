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
import org.apache.kafka.clients.admin.ConsumerGroupDescription;
import org.apache.kafka.clients.admin.ConsumerGroupListing;
import org.apache.kafka.clients.admin.DescribeConsumerGroupsResult;
import org.apache.kafka.clients.admin.DescribeTopicsResult;
import org.apache.kafka.clients.admin.ListConsumerGroupOffsetsResult;
import org.apache.kafka.clients.admin.ListConsumerGroupsResult;
import org.apache.kafka.clients.admin.ListOffsetsResult.ListOffsetsResultInfo;
import org.apache.kafka.clients.admin.ListTopicsOptions;
import org.apache.kafka.clients.admin.ListTopicsResult;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionInfo;
import org.springframework.util.Assert;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

@Slf4j
public class KafkaCollectImpl extends AbstractCollect {

    private static final String LAG_NUM = "lag_num";
    private static final String PARTITION_OFFSET = "Partition_offset";

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
                case CONSUMER_DETAIL:
                    collectTopicConsumerGroups(builder, adminClient);
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

    /**
     * Collect Topic ConsumerGroups Message
     *
     * @param builder     The MetricsData builder
     * @param adminClient The AdminClient
     */
    private static void collectTopicConsumerGroups(CollectRep.MetricsData.Builder builder, AdminClient adminClient) throws InterruptedException, ExecutionException {
        ListTopicsOptions options = new ListTopicsOptions();
        options.listInternal(true);
        // Get all consumer groups
        ListConsumerGroupsResult consumerGroupsResult = adminClient.listConsumerGroups();
        Collection<ConsumerGroupListing> consumerGroups = consumerGroupsResult.all().get();
        // Get the list of consumer groups for each topic
        Map<String, Set<String>> topicConsumerGroupsMap = getTopicConsumerGroupsMap(consumerGroups, adminClient);
        topicConsumerGroupsMap.entrySet().stream()
                .flatMap(entry -> entry.getValue().stream()
                        .map(groupId -> {
                            try {
                                String topic = entry.getKey();
                                DescribeConsumerGroupsResult describeResult = adminClient.describeConsumerGroups(Collections.singletonList(groupId));
                                Map<String, ConsumerGroupDescription> consumerGroupDescriptions = describeResult.all().get();
                                ConsumerGroupDescription description = consumerGroupDescriptions.get(groupId);
                                Map<String, String> offsetAndLagNum = getConsumerGroupMetrics(topic, groupId, adminClient);
                                return CollectRep.ValueRow.newBuilder()
                                        .addColumns(groupId)
                                        .addColumns(String.valueOf(description.members().size()))
                                        .addColumns(topic)
                                        .addColumns(offsetAndLagNum.get(PARTITION_OFFSET))
                                        .addColumns(offsetAndLagNum.get(LAG_NUM))
                                        .build();
                            } catch (InterruptedException | ExecutionException e) {
                                log.warn("group {} get message fail", groupId);
                                return null;
                            }
                        })
                )
                .filter(Objects::nonNull)
                .forEach(builder::addValues);
    }

    private static Map<String, Set<String>> getTopicConsumerGroupsMap(Collection<ConsumerGroupListing> consumerGroups,
            AdminClient adminClient)
            throws ExecutionException, InterruptedException {
        Map<String, Set<String>> topicConsumerGroupsMap = new HashMap<>();
        for (ConsumerGroupListing consumerGroup : consumerGroups) {
            String groupId = consumerGroup.groupId();
            // Get the offset information for the consumer group
            ListConsumerGroupOffsetsResult consumerGroupOffsetsResult = adminClient.listConsumerGroupOffsets(groupId);
            Map<TopicPartition, OffsetAndMetadata> topicOffsets = consumerGroupOffsetsResult.partitionsToOffsetAndMetadata().get();
            // Iterate over all TopicPartitions consumed by the consumer group
            for (Map.Entry<TopicPartition, OffsetAndMetadata> entry : topicOffsets.entrySet()) {
                String topic = entry.getKey().topic();
                topicConsumerGroupsMap.computeIfAbsent(topic, k -> new HashSet<>()).add(groupId);
            }
        }
        return topicConsumerGroupsMap;
    }

    private static Map<String, String> getConsumerGroupMetrics(String topic, String groupId, AdminClient adminClient)
            throws ExecutionException, InterruptedException {
        // Get the offset for each groupId for the specified topic
        ListConsumerGroupOffsetsResult consumerGroupOffsetsResult = adminClient.listConsumerGroupOffsets(groupId);
        Map<TopicPartition, OffsetAndMetadata> topicOffsets = consumerGroupOffsetsResult.partitionsToOffsetAndMetadata().get();
        long totalLag = 0L;
        for (Entry<TopicPartition, OffsetAndMetadata> topicPartitionOffsetAndMetadataEntry : topicOffsets.entrySet()) {
            if (topicPartitionOffsetAndMetadataEntry.getKey().topic().equals(topic)) {
                OffsetAndMetadata offsetMetadata = topicPartitionOffsetAndMetadataEntry.getValue();
                TopicPartition partition = topicPartitionOffsetAndMetadataEntry.getKey();
                // Get the latest offset for each TopicPartition
                ListOffsetsResultInfo resultInfo = adminClient.listOffsets(
                        Collections.singletonMap(partition, OffsetSpec.latest())).all().get().get(partition);
                long latestOffset = resultInfo.offset();
                // Accumulate the lag for each partition
                long l = latestOffset - offsetMetadata.offset();
                totalLag += l;
            }
        }
        // Get all offsets and convert them to a string, joined by "、"
        String partitionOffsets = topicOffsets.entrySet().stream()
                .filter(entry -> entry.getKey().topic().equals(topic))
                .map(entry -> String.valueOf(entry.getValue().offset()))
                .collect(Collectors.collectingAndThen(
                        Collectors.joining(","),
                        result -> "[" + result + "]"
                ));
        Map<String, String> res = new HashMap<>();
        res.put(LAG_NUM, String.valueOf(totalLag));
        res.put(PARTITION_OFFSET, partitionOffsets);
        return res;
    }


    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_KAFKA;
    }
}