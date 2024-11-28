---
title: How to Participate in Developing Custom Collectors
author: zhangshenghang
author_title: zhangshenghang
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/29418975?s=400&v=4
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---

## Introduction to the Collector Module

[model-desc](/img/blog/model-desc.png)

The overall structure of the Collector module can be divided into four main parts, each responsible for different tasks:

- **Collector Entry Point**: This is the entry point for running the Collector module, from which collection tasks are executed after startup.

- **collector-basic**: This module mainly includes basic Collector implementations, such as monitoring for common protocols like HTTP and JDBC. The Collectors here typically do not require additional proprietary dependencies and can meet most basic monitoring needs.

- **collector-common**: This module stores some general-purpose utility classes and methods, such as shared connection pools and caching mechanisms, which other modules can reuse.

- **collector-xxx**: This is the extension Collector module for different services or protocols. For example, monitoring for specific services like MongoDB or RocketMQ often requires introducing their proprietary dependencies and developing within their respective modules. Below is an example of MongoDB's dependency:

  ```xml
  <dependency>
      <groupId>org.mongodb</groupId>
      <artifactId>mongodb-driver-sync</artifactId>
  </dependency>
  ```

Through this modular design, the Collector can easily be extended to adapt to various monitoring scenarios.

## Adding New Collector Monitoring

Next, we will demonstrate how to develop a new Collector through the practical case of creating a `kafka-collector` module.

### 1. Creating the `kafka-collector` Module

First, we need to create a new module in the project for Kafka monitoring, named `kafka-collector`. Then, modify the `pom.xml` file in this module.
[model-create](/img/blog/model-create.png)

**`pom.xml` Configuration**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.apache.hertzbeat</groupId>
    <artifactId>hertzbeat-collector</artifactId>
    <version>2.0-SNAPSHOT</version>
  </parent>

  <artifactId>hertzbeat-collector-kafka</artifactId>
  <name>${project.artifactId}</name>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.apache.hertzbeat</groupId>
      <artifactId>hertzbeat-collector-common</artifactId>
      <scope>provided</scope>
    </dependency>
    <!-- kafka -->
    <dependency>
      <groupId>org.apache.kafka</groupId>
      <artifactId>kafka-clients</artifactId>
    </dependency>
  </dependencies>
</project>
```

Points to note:

- Set `artifactId` to `hertzbeat-collector-kafka` to maintain naming consistency.
- Manually add the dependencies required for Kafka in `dependencies`.

### 2. Adding the Kafka Protocol Class

To enable the Collector module to handle the Kafka monitoring protocol, we need to create a `KafkaProtocol` class to define the connection parameters for Kafka. This class should be located at `common/src/main/java/org/apache/hertzbeat/common/entity/job/protocol/KafkaProtocol.java`.

```java
package org.apache.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KafkaProtocol {

  /**
   * IP address or domain name
   */
  private String host;

  /**
   * Port number
   */
  private String port;

  /**
   * Timeout
   */
  private String timeout;

  /**
   * Command
   */
  private String command;
}
```

### 3. Adding Kafka Support in Metrics

In the `common/src/main/java/org/apache/hertzbeat/common/entity/job/Metrics.java` class, add support for the Kafka protocol.

```java
private KafkaProtocol kclient;
```

### 4. Adding Constants

Define constants for the Kafka protocol in the `DispatchConstants` class.

```java
String PROTOCOL_KAFKA = "kclient";
```

### 5. Adding the Kafka Connection Class

The `KafkaConnect` class is used to manage the connection logic for the Kafka Admin.

```java
package org.apache.hertzbeat.collector.collect.kafka;

import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.KafkaAdminClient;

import java.util.Properties;

public class KafkaConnect extends AbstractConnection<AdminClient> {

  private static AdminClient adminClient;

  public KafkaConnect(String brokerList) {
    Properties properties = new Properties();
    properties.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, brokerList);
    properties.put(AdminClientConfig.RETRIES_CONFIG, 3);
    adminClient = KafkaAdminClient.create(properties);
  }

  @Override
  public AdminClient getConnection() {
    return adminClient;
  }

  @Override
  public void closeConnection() throws Exception {
    if (this.adminClient != null) {
      this.adminClient.close();
    }
  }

  public static synchronized AdminClient getAdminClient(String brokerList) {
    if (adminClient == null) {
      Properties properties = new Properties();
      properties.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, brokerList);
      adminClient = KafkaAdminClient.create(properties);
    }
    return adminClient;
  }

}
```

### 6. Implementing the Kafka Collection Class

Inherit from the `AbstractCollect` class and implement the specific data collection logic within it. Specific logic details are not covered here.

```java
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
```

### 7. Configuring the SPI Service File

In the `collector/collector/src/main/resources/META-INF/services/org.apache.hertzbeat.collector.collect.AbstractCollect` file, add the `KafkaCollectImpl` class.

```text
...
org.apache.hertzbeat.collector.collect.kafka.KafkaCollectImpl
```

### 8. Adding Kafka Dependencies to the Collector Module

The final step is to add the `kafka-collector` module dependency in `collector/collector/pom.xml`:

```xml
<dependency>
  <groupId>org.apache.hertzbeat</groupId>
  <artifactId>hertzbeat-collector-kafka</artifactId>
  <version>${hertzbeat.version}</version>
</dependency>
```

By following the above steps, we have completed the development of a Kafka Collector, from protocol definition to the final SPI configuration and dependency management, fully extending a Kafka monitoring module.

## Adding Configuration Parsing Files

```yaml
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# The monitoring type category: service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: mid
# The monitoring type e.g.: linux windows tomcat mysql aws...
app: kafka_client
# The monitoring i18n name
name:
  zh-CN: Kafka消息系统（客户端）
  en-US: Kafka Message (Client)
  zh-TW: Kafka消息系統（客戶端）
# The description and help of this monitoring type
help:
  zh-CN: HertzBeat 使用 <a href="https://hertzbeat.apache.org/docs/advanced/extend-jmx">Kafka Admin Client</a> 对 Kafka 的通用指标进行采集监控。</span>
  en-US: HertzBeat uses <a href='https://hertzbeat.apache.org/docs/advanced/extend-jmx'>Kafka Admin Client</a> to monitor Kafka general metrics. </span>
  zh-TW: HertzBeat 使用 <a href="https://hertzbeat.apache.org/docs/advanced/extend-jmx">Kafka Admin Client</a> 對 Kafka 的通用指標進行采集監控。</span>
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/help/kafka_client
  en-US: https://hertzbeat.apache.org/docs/help/kafka_client
# Input params define for monitoring (render web UI by the definition)
params:
  # field-param field key
  - field: host
    # name-param field display i18n name
    name:
      zh-CN: 目标Host
      en-US: Target Host
    # type-param field type (most mapping the HTML input type)
    type: host
    # required-true or false
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    # when type is number, range is required
    range: '[0,65535]'
    required: true
    defaultValue: 9092

# collect metrics config list
metrics:
  # metrics - server_info
  - name: topic_list
    i18n:
      zh-CN: 主题列表
      en-US: Topic List
    # metrics scheduling priority (0->127) -> (high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics are availability metrics, they will be scheduled first, only if availability metrics collect successfully will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type (0-number, 1-string), unit-metric unit ('%', 'ms', 'MB'), label-whether it is a metrics label field
      - field: TopicName
        type: 1
        i18n:
          zh-CN: 主题名称
          en-US: Topic Name
    # the protocol used for monitoring, e.g., sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: kclient
    # the config content when protocol is jmx
    kclient:
      host: ^_^host^_^
      port: ^_^port^_^
      command: topic-list
  - name: topic_detail
    i18n:
      zh-CN: 主题详细信息
      en-US: Topic Detail Info
    # metrics scheduling priority (0->127) -> (high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics are availability metrics, they will be scheduled first, only if availability metrics collect successfully will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type (0-number, 1-string), unit-metric unit ('%', 'ms', 'MB'), label-whether it is a metrics label field
      - field: TopicName
        type: 1
        i18n:
          zh-CN: 主题名称
          en-US: Topic Name
      - field: PartitionNum
        type: 1
        i18n:
          zh-CN: 分区数量
          en-US: Partition Num
      - field: PartitionLeader
        type: 1
        i18n:
          zh-CN: 分区领导者
          en-US: Partition Leader
      - field: BrokerHost
        type: 1
        i18n:
          zh-CN: Broker主机
          en-US: Broker Host
      - field: BrokerPort
        type: 1
        i18n:
          zh-CN: Broker端口
          en-US: Broker Port
      - field: ReplicationFactorSize
        type: 1
        i18n:
          zh-CN: 复制因子大小
          en-US: Replication Factor Size
      - field: ReplicationFactor
        type: 1
        i18n:
          zh-CN: 复制因子
          en-US: Replication Factor
    # the protocol used for monitoring, e.g., sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: kclient
    # the config content when protocol is jmx
    kclient:
      host: ^_^host^_^
      port: ^_^port^_^
      command: topic-describe
  - name: topic_offset
    i18n:
      zh-CN: 主题偏移量
      en-US: Topic Offset
    # metrics scheduling priority (0->127) -> (high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics are availability metrics, they will be scheduled first, only if availability metrics collect successfully will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type (0-number, 1-string), unit-metric unit ('%', 'ms', 'MB'), label-whether it is a metrics label field
      - field: TopicName
        type: 1
        i18n:
          zh-CN: 主题名称
          en-US: Topic Name
      - field: PartitionNum
        type: 1
        i18n:
          zh-CN: 分区数量
          en-US: Partition Num
      - field: earliest
        type: 0
        i18n:
          zh-CN: 最早偏移量
          en-US: Earliest Offset
      - field: latest
        type: 0
        i18n:
          zh-CN: 最新偏移量
          en-US: Latest Offset
    # the protocol used for monitoring, e.g., sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: kclient
    # the config content when protocol is jmx
    kclient:
      host: ^_^host^_^
      port: ^_^port^_^
      command: topic-offset
```

With these steps, the custom development of the `collector` is complete. You can start the service and begin monitoring metrics according to the normal logic.

## Development and Debugging

When starting the `manager` module locally, if the added monitoring cannot find the class, add the dependency to the `manager` module.

**Note: When packaging and submitting code, do not submit the dependencies under the `manager` module.**

```xml
<!-- collector-kafka -->
<dependency>
  <groupId>org.apache.hertzbeat</groupId>
  <artifactId>hertzbeat-collector-kafka</artifactId>
  <version>${hertzbeat.version}</version>
</dependency>
```
