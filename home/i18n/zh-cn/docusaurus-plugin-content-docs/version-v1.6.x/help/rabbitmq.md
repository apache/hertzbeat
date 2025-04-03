---
id: rabbitmq  
title: 监控 RabbitMQ 消息中间件      
sidebar_label: RabbitMQ消息中间件    
keywords: [开源监控系统, 开源消息中间件监控, RabbitMQ消息中间件监控]
---

> 对 RabbitMQ 消息中间件的运行状态，节点，队列等相关指标进行监测。

### 监控前操作

> HertzBeat 使用 RabbitMQ Management 的 Rest Api 对 RabbitMQ 进行指标数据采集。  
> 故需要您的 RabbitMQ 环境开启 Management 插件

1. 开启 Management 插件，或使用自开启版本

    ```shell
    rabbitmq-plugins enable rabbitmq_management 
    ```

2. 浏览器访问 <http://ip:15672/> ，默认账户密码 `guest/guest`. 成功登录即开启成功。

3. 在 HertzBeat 添加对应 RabbitMQ 监控即可，参数使用 Management 的 IP 端口，默认账户密码。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | RabbitMQ Management 对外提供的HTTP端口，默认为15672。            |
| 用户名    | 接口Basic认证时使用的用户名                                     |
| 密码     | 接口Basic认证时使用的密码                                      |
| 超时时间   | HTTP请求查询超时时间                                         |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：overview

|        指标名称        | 指标单位 |          指标帮助描述          |
|--------------------|------|--------------------------|
| product_version    | 无    | 产品版本                     |
| product_name       | 无    | 产品名称                     |
| rabbitmq_version   | 无    | rabbitmq 版本              |
| management_version | 无    | rabbitmq management 插件版本 |
| erlang_version     | 无    | erlang 版本                |
| cluster_name       | 无    | 集群名称                     |
| rates_mode         | 无    | rates模式                  |

#### 指标集合：object_totals

|    指标名称     | 指标单位 |     指标帮助描述      |
|-------------|------|-----------------|
| channels    | 无    | channels的总数量    |
| connections | 无    | connections的总数量 |
| consumers   | 无    | consumers的总数量   |
| exchanges   | 无    | exchanges的总数量   |
| queues      | 无    | queues的总数量      |

#### 指标集合：nodes

|        指标名称        | 指标单位 |            指标帮助描述             |
|--------------------|------|-------------------------------|
| name               | 无    | The node name                 |
| type               | 无    | The node type                 |
| running            | 无    | Running state                 |
| os_pid             | 无    | Pid in OS                     |
| mem_limit          | MB   | Memory usage high watermark   |
| mem_used           | MB   | Total amount of memory used   |
| fd_total           | 无    | File descriptors available    |
| fd_used            | 无    | File descriptors used         |
| sockets_total      | 无    | Sockets available             |
| sockets_used       | 无    | Sockets used                  |
| proc_total         | 无    | Erlang process limit          |
| proc_used          | 无    | Erlang processes used         |
| disk_free_limit    | GB   | Free disk space low watermark |
| disk_free          | GB   | Free disk space               |
| gc_num             | 无    | GC runs                       |
| gc_bytes_reclaimed | MB   | Bytes reclaimed by GC         |
| context_switches   | 无    | Context_switches num          |
| io_read_count      | 无    | 总共读操作的数量                      |
| io_read_bytes      | KB   | 总共读入磁盘数据大小                    |
| io_read_avg_time   | ms   | 读操作平均时间，毫秒为单位                 |
| io_write_count     | 无    | 磁盘写操作总量                       |
| io_write_bytes     | KB   | 写入磁盘数据总量                      |
| io_write_avg_time  | ms   | 每个磁盘写操作的平均时间，毫秒为单位            |
| io_seek_count      | 无    | seek操作总量                      |
| io_seek_avg_time   | ms   | seek操作的平均时间，毫秒单位              |
| io_sync_count      | 无    | fsync操作的总量                    |
| io_sync_avg_time   | ms   | fsync操作的平均时间，毫秒为单位            |
| connection_created | 无    | connection created num        |
| connection_closed  | 无    | connection closed num         |
| channel_created    | 无    | channel created num           |
| channel_closed     | 无    | channel closed num            |
| queue_declared     | 无    | queue declared num            |
| queue_created      | 无    | queue created num             |
| queue_deleted      | 无    | queue deleted num             |
| connection_closed  | 无    | connection closed num         |

#### 指标集合：queues

|             指标名称             | 指标单位 |                                                                指标帮助描述                                                                |
|------------------------------|------|--------------------------------------------------------------------------------------------------------------------------------------|
| name                         | 无    | The name of the queue with non-ASCII characters escaped as in C.                                                                     |
| node                         | 无    | The queue on the node name                                                                                                           |
| state                        | 无    | The state of the queue. Normally "running", but may be "{syncing, message_count}" if the queue is synchronising.                     |
| type                         | 无    | Queue type, one of: quorum, stream, classic.                                                                                         |
| vhost                        | 无    | vhost path                                                                                                                           |
| auto_delete                  | 无    | Whether the queue will be deleted automatically when no longer used                                                                  |
| policy                       | 无    | Effective policy name for the queue.                                                                                                 |
| consumers                    | 无    | Number of consumers.                                                                                                                 |
| memory                       | B    | Bytes of memory allocated by the runtime for the queue, including stack, heap and internal structures.                               |
| messages_ready               | 无    | Number of messages ready to be delivered to clients                                                                                  |
| messages_unacknowledged      | 无    | Number of messages delivered to clients but not yet acknowledged                                                                     |
| messages                     | 无    | Sum of ready and unacknowledged messages (queue depth)                                                                               |
| messages_ready_ram           | 无    | Number of messages from messages_ready which are resident in ram                                                                     |
| messages_persistent          | 无    | Total number of persistent messages in the queue (will always be 0 for transient queues)                                             |
| message_bytes                | B    | Sum of the size of all message bodies in the queue. This does not include the message properties (including headers) or any overhead |
| message_bytes_ready          | B    | Like message_bytes but counting only those messages ready to be delivered to clients                                                 |
| message_bytes_unacknowledged | B    | Like message_bytes but counting only those messages delivered to clients but not yet acknowledged                                    |
| message_bytes_ram            | B    | Like message_bytes but counting only those messages which are currently held in RAM                                                  |
| message_bytes_persistent     | B    | Like message_bytes but counting only those messages which are persistent                                                             |
