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
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.KafkaProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.KafkaAdminClient;
import org.apache.kafka.clients.admin.NewTopic;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.output.Slf4jLogConsumer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.DockerLoggerFactory;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Stream;

/**
 * KafkaCollectE2E
 */
@Slf4j
public class KafkaCollectE2eTest {

    private static final String ZOOKEEPER_IMAGE_NAME = "zookeeper:3.8.4";
    private static final String ZOOKEEPER_NAME = "zookeeper";
    private static final Integer ZOOKEEPER_PORT = 2181;
    private static final String KAFKA_IMAGE_NAME = "confluentinc/cp-kafka:7.4.7";
    private static final String KAFKA_NAME = "kafka";
    private static GenericContainer<?> zookeeperContainer;
    private static KafkaContainer kafkaContainer;
    private Metrics metrics;
    private KafkaCollectImpl kafkaCollect;
    private CollectRep.MetricsData.Builder builder;

    @AfterAll
    public static void tearDown() {
        kafkaContainer.stop();
        zookeeperContainer.stop();
    }

    @BeforeEach
    public void setUp() {
        kafkaCollect = new KafkaCollectImpl();
        metrics = new Metrics();
        Network.NetworkImpl network = Network.builder().build();
        zookeeperContainer = new GenericContainer<>(DockerImageName.parse(ZOOKEEPER_IMAGE_NAME))
                .withExposedPorts(ZOOKEEPER_PORT)
                .withNetwork(network)
                .withNetworkAliases(ZOOKEEPER_NAME)
                .waitingFor(Wait.forListeningPort())
                .withStartupTimeout(Duration.ofSeconds(30));
        zookeeperContainer.setPortBindings(Collections.singletonList(ZOOKEEPER_PORT + ":" + ZOOKEEPER_PORT));

        Startables.deepStart(Stream.of(zookeeperContainer)).join();

        kafkaContainer = new KafkaContainer(DockerImageName.parse(KAFKA_IMAGE_NAME))
                .withExternalZookeeper(ZOOKEEPER_NAME + ":2181")
                .withNetwork(network)
                .withNetworkAliases(KAFKA_NAME)
                .withLogConsumer(
                        new Slf4jLogConsumer(
                                DockerLoggerFactory.getLogger(KAFKA_IMAGE_NAME)));
        Startables.deepStart(Stream.of(kafkaContainer)).join();
    }

    @Test
    public void testKafkaCollect() throws ExecutionException, InterruptedException, TimeoutException {

        Assertions.assertTrue(zookeeperContainer.isRunning(), "Zookeeper container should be running");
        Assertions.assertTrue(kafkaContainer.isRunning(), "Kafka container should be running");

        String topicName = "test-topic";

        String bootstrapServers = kafkaContainer.getBootstrapServers().replace("PLAINTEXT://", "");
        KafkaProtocol kafkaProtocol = new KafkaProtocol();
        kafkaProtocol.setHost(bootstrapServers.split(":")[0]);
        kafkaProtocol.setPort(bootstrapServers.split(":")[1]);
        kafkaProtocol.setCommand("topic-list");
        metrics.setKclient(kafkaProtocol);
        log.info("bootstrapServers: {}", bootstrapServers);

        // Create Topic
        Properties properties = new Properties();
        properties.put("bootstrap.servers", bootstrapServers);
        AdminClient adminClient = KafkaAdminClient.create(properties);
        int numPartitions = 1;
        short replicationFactor = 1;
        NewTopic newTopic = new NewTopic(topicName, numPartitions, replicationFactor);
        adminClient.createTopics(Collections.singletonList(newTopic)).all().get(60, TimeUnit.SECONDS);

        // Verify the information of topic list monitoring
        builder = CollectRep.MetricsData.newBuilder();
        kafkaCollect.collect(builder, metrics);
        Assertions.assertTrue(builder.getValuesList().stream()
                .anyMatch(valueRow -> valueRow.getColumns(0).equals(topicName)));

        // Verify the information monitored by topic description
        builder = CollectRep.MetricsData.newBuilder();
        kafkaProtocol.setCommand("topic-describe");
        kafkaCollect.collect(builder, metrics);
        List<CollectRep.ValueRow> topicDescribeList = builder.getValuesList();
        CollectRep.ValueRow firstRow = topicDescribeList.get(0);
        Assertions.assertAll(
                () -> Assertions.assertEquals(topicName, firstRow.getColumns(0)),
                () -> Assertions.assertEquals(String.valueOf(numPartitions), firstRow.getColumns(1)),
                () -> Assertions.assertEquals("0", firstRow.getColumns(2)),
                () -> Assertions.assertEquals(kafkaProtocol.getHost(), firstRow.getColumns(3)),
                () -> Assertions.assertEquals(kafkaProtocol.getPort(), firstRow.getColumns(4)),
                () -> Assertions.assertEquals(String.valueOf(replicationFactor), firstRow.getColumns(5))
        );
    }
}
