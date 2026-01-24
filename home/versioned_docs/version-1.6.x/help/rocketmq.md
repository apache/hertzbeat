---
id: rocketmq
title: Monitoring Apache RocketMQ
sidebar_label: Apache RocketMQ
keywords: [ open source monitoring tool, monitoring Apache RocketMQ metrics ]
---

> Monitor the broker, consumer and other related metrics of RocketMQ.

### Configuration parameters

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Namesrv Host        | IPV4,IPV6 of RocketMQ name server(eg: https://, http://)。                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Port                | Port of RocketMQ name server.                                                                                            |
| accessKey           | accessKey.                                                                                                               |
| secretKey           | secretKey.                                                                                                               |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags           | Used to classify and manage monitoring resources.                                                                        |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Collection Metric

#### Metric set：cluster

|       Metric name       | Metric unit |        Metric help description        |
|-------------------------|-------------|---------------------------------------|
| BrokerId                | none        | Broker id                             |
| Address                 | none        | Broker address                        |
| Version                 | none        | Version                               |
| Producer_Message_TPS    | none        | Produce message TPS                   |
| Consumer_Message_TPS    | none        | Consume message TPS                   |
| Yesterday_Produce_Count | none        | Number of messages produced yesterday |
| Yesterday_Consume_Count | none        | Number of messages consumed yesterday |
| Today_Produce_Count     | none        | Number of messages produced today     |
| Today_Consume_Count     | none        | Number of messages consumed today     |

#### Metric set：Consumer

|   Metric name   | Metric unit | Metric help description |
|-----------------|-------------|-------------------------|
| Consumer_group  | none        | Consumer group          |
| Client_quantity | none        | Number of clients       |
| Message_model   | none        | Message model           |
| Consume_type    | none        | Consume type            |
| Consume_tps     | none        | Consume tps             |
| Delay           | none        | Delay                   |
