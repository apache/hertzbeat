---
id: kafka_client
title: Monitoring： Kafka Monitoring (Client-based)
sidebar_label: Kafka Monitoring (Client-based)
keywords: [open-source monitoring system, open-source message middleware monitoring, Kafka monitoring]
---

> Collect and monitor general metrics for Kafka.

## Configuration Parameters

| Parameter Name   | Help Description                                              |
|------------------|---------------------------------------------------------------|
| Monitoring Host  | The monitored peer's IPv4, IPv6, or domain name. Note: ⚠️ Do not include protocol headers (e.g., https://, http://). |
| Monitoring Port  | The monitored service port.                                    |
| Security Protocol | Kafka security protocol. Select `PLAINTEXT`, `SASL_PLAINTEXT`, or `SASL_SSL`. |
| SASL Mechanism | SCRAM mechanism used with a SASL security protocol. Select `SCRAM-SHA-256` or `SCRAM-SHA-512`. |
| Username | Kafka SCRAM username. Required when a SASL security protocol is selected. |
| Password | Kafka SCRAM password. Required when a SASL security protocol is selected. |
| Task Name        | The identifier for this monitoring task, which must be unique. |
| Collection Interval | The interval for periodic data collection, in seconds. The minimum allowable interval is 30 seconds. |
| Description/Remarks | Additional information to describe and identify this monitoring task. Users can add remarks here. |

### SCRAM Authentication

Keep **Security Protocol** set to `PLAINTEXT` when the Kafka cluster does not require authentication. For a SCRAM-enabled cluster, select `SASL_PLAINTEXT` or `SASL_SSL`, choose the SCRAM mechanism configured by the cluster, and enter the username and password.

`SASL_SSL` uses the JVM's SSL configuration and trust store. Make sure the HertzBeat collector trusts the Kafka broker certificate before testing the monitor.

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
| group_member_num     | None | Number of Consumer Instances       |
| Subscribed Topic Name      | None | Topic Name Subscribed by the Group |
| offset_of_each_partition     | None | Offsets for Each Partition         |
| Lag      | None | Lag of Consumer                    |
