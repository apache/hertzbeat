---
id: rocketmq
title: 监控 Apache RocketMQ 消息中间件
sidebar_label: RocketMQ消息中间件
keywords: [ 开源监控系统, 开源中间件监控, RocketMQ消息中间件监控 ]
---

> 对 RocketMQ 消息中间件的broker，消费者等相关指标进行监测。

### 配置参数

|   参数名称    |                     参数帮助描述                     |
|-----------|------------------------------------------------|
| 注册中心Host  | RocketMQ注册中心的IPV4,IPV6(eg: https://, http://)。 |
| 任务名称      | 标识此监控的名称，名称需要保证唯一性。                            |
| 端口        | 注册中心端口。                                        |
| accessKey | accessKey。                                     |
| secretKey | secretKey。                                     |
| 采集间隔      | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒。                |
| 绑定标签      | 用于对监控资源进行分类管理。                                 |
| 描述备注      | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                   |

### 采集指标

#### 指标集合：集群

|          指标名称           | 指标单位 |   指标帮助描述   |
|-------------------------|------|------------|
| BrokerId                | 无    | Broker唯一ID |
| Address                 | 无    | Broker地址   |
| Version                 | 无    | 版本         |
| Producer_Message_TPS    | 无    | 生产消息TPS    |
| Consumer_Message_TPS    | 无    | 消费消息TPS    |
| Yesterday_Produce_Count | 无    | 昨天生产消息数    |
| Yesterday_Consume_Count | 无    | 昨天消费消息数    |
| Today_Produce_Count     | 无    | 今天生产消息数    |
| Today_Consume_Count     | 无    | 今天消费消息数    |

#### 指标集合：消费者

|      指标名称       | 指标单位 | 指标帮助描述 |
|-----------------|------|--------|
| Consumer_group  | 无    | 消费者组   |
| Client_quantity | 无    | 客户端数量  |
| Message_model   | 无    | 消息模式   |
| Consume_type    | 无    | 消费类型   |
| Consume_tps     | 无    | 消费TPS  |
| Delay           | 无    | 延迟     |
