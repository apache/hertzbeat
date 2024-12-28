---
id: kafka_client  
title: 监控：Kafka监控(基于客户端)    
sidebar_label: Apache Kafka 监控(基于客户端)
keywords: [开源监控系统, 开源消息中间件监控, Kafka监控]
---

> 对Kafka的通用指标进行采集监控

### 配置参数

| 参数名称   | 参数帮助描述                                               |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 监控Port | 被监控的服务端口。                                            |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：topic_list

|    指标名称     | 指标单位 | 指标帮助描述  |
|-------------|------|---------|
| TopicName     | 无    | 主题名称 |

#### 指标集合：topic_detail

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|--------|
| TopicName | 无    | 主题名称     |
| PartitionNum      | 无   | 分区数量  |
| PartitionLeader       | 无   | 分区领导者     |
| BrokerHost      | 无   | Broker主机    |
| BrokerPort      | 无   | Broker端口    |
| ReplicationFactorSize      | 无   | 复制因子大小    |
| ReplicationFactor      | 无   | 复制因子    |

#### 指标集合：topic_offset

| 指标名称  | 指标单位 | 指标帮助描述 |
|-------|---|--------|
| TopicName | 无  | 主题名称   |
| PartitionNum | 无 | 分区号    |
| earliest | 无  | 最早偏移量  |
| latest | 无  | 最新偏移量  |

#### 指标集合：consumer_detail

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|-------|
| GroupId | 无    | 消费者组ID    |
| Group Member Num      | 无   | 消费者实例数量|
| Subscribed Topic Name       | 无   | 订阅主题名称    |
| Offsets of Each Partition      | 无   | 各分区偏移量   |
| Lag      | 无   | 落后偏移量   |
