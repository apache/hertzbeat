---
id: kafka_client  
title: Monitoring： Kafka Monitoring (Client-based)    
sidebar_label: Kafka Monitoring (Client-based)  
keywords: [open-source monitoring system, open-source message middleware monitoring, Kafka monitoring]
---

> Collect and monitor general metrics for Kafka.

### Configuration Parameters

| Parameter Name   | Help Description                                              |
|------------------|---------------------------------------------------------------|
| Monitoring Host  | The monitored peer's IPv4, IPv6, or domain name. Note: ⚠️ Do not include protocol headers (e.g., https://, http://). |
| Monitoring Port  | The monitored service port.                                    |
| Task Name        | The identifier for this monitoring task, which must be unique. |
| Collection Interval | The interval for periodic data collection, in seconds. The minimum allowable interval is 30 seconds. |
| Description/Remarks | Additional information to describe and identify this monitoring task. Users can add remarks here. |

### Collected Metrics

#### Metric Set: topic_list

| Metric Name  | Unit | Help Description |
|--------------|------|------------------|
| TopicName    | None | Topic Name       |

#### Metric Set: topic_detail

| Metric Name          | Unit | Help Description |
|----------------------|------|------------------|
| TopicName            | None | Topic Name       |
| PartitionNum         | None | Number of Partitions |
| PartitionLeader      | None | Partition Leader |
| BrokerHost           | None | Broker Host      |
| BrokerPort           | None | Broker Port      |
| ReplicationFactorSize| None | Replication Factor Size |
| ReplicationFactor    | None | Replication Factor |

#### Metric Set: topic_offset

| Metric Name   | Unit | Help Description |
|---------------|------|------------------|
| TopicName     | None | Topic Name       |
| PartitionNum  | None | Number of Partitions |
| earliest      | None | Earliest Offset  |
| latest        | None | Latest Offset    |

#### Metric Set：consumer_detail

|   Metric Name   | Unit | Help Description                   |
|-----------|--|------------------------------------|
| GroupId | None | Consumer Group Id                  |
| Group Member Num     | None | Number of Consumer Instances       |
| Subscribed Topic Name      | None | Topic Name Subscribed by the Group |
| Offsets of Each Partition     | None | Offsets for Each Partition         |
| Lag      | None | Lag of Consumer                    |
