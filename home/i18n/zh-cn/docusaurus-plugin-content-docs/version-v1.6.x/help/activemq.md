---
id: activemq  
title: 监控 Apache ActiveMQ 消息中间件      
sidebar_label: ActiveMQ消息中间件    
keywords: [开源监控系统, 开源中间件监控, ActiveMQ消息中间件监控]
---

> 对 Apache ActiveMQ 消息中间件的运行状态，节点，Topic等相关指标进行监测。

**使用协议：JMX**

### 监控前操作

> 您需要在 ActiveMQ 开启 `JMX` 服务，HertzBeat 使用 JMX 协议对 ActiveMQ 进行指标采集。

1. 修改安装目录下的 `conf/activemq.xml` 文件，开启JMX

    > 在 `broker` 标签中添加 `userJmx="true"` 属性

    ```xml
    <broker xmlns="http://activemq.apache.org/schema/core" brokerName="localhost" dataDirectory="${activemq.data}" useJmx="true">
        <!-- others -->
    </broker>
    ```

2. 修改安装目录下的 `bin/env` 文件，配置JMX 端口 IP等

    将如下原配置信息

    ```text
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.port=11099"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.password.file=${ACTIVEMQ_CONF}/jmx.password"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.access.file=${ACTIVEMQ_CONF}/jmx.access"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.ssl=false"
     
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote"
    ```

    更新为如下配置，⚠️注意修改`本机对外IP`

    ```text
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.password.file=${ACTIVEMQ_CONF}/jmx.password"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.access.file=${ACTIVEMQ_CONF}/jmx.access"
    
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.port=11099"
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.ssl=false"
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.authenticate=false" 
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Djava.rmi.server.hostname=本机对外IP"
    
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote"
    ```

3. 重启 ACTIVEMQ 服务，在 HertzBeat 添加对应 ActiveMQ 监控即可，参数使用 JMX 配置的 IP 端口。

### 配置参数

|  参数名称   |                        参数帮助描述                        |
|---------|------------------------------------------------------|
| 监控Host  | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称    | 标识此监控的名称，名称需要保证唯一性。                                  |
| JMX端口   | JMX 对外提供的HTTP端口，默认为 11099。                           |
| JMX URL | 可选，自定义 JMX URL 连接                                    |
| 用户名     | 认证时使用的用户名                                            |
| 密码      | 认证时使用的密码                                             |
| 采集间隔    | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测    | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注    | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：broker

|          指标名称           | 指标单位 |                                指标帮助描述                                 |
|-------------------------|------|-----------------------------------------------------------------------|
| BrokerName              | 无    | The name of the broker.                                               |
| BrokerVersion           | 无    | The version of the broker.                                            |
| Uptime                  | 无    | Uptime of the broker.                                                 |
| UptimeMillis            | ms   | Uptime of the broker in milliseconds.                                 |
| Persistent              | 无    | Messages are synchronized to disk.                                    |
| MemoryPercentUsage      | %    | Percent of memory limit used.                                         |
| StorePercentUsage       | %    | Percent of store limit used.                                          |
| TempPercentUsage        | %    | Percent of temp limit used.                                           |
| CurrentConnectionsCount | 无    | Attribute exposed for management                                      |
| TotalConnectionsCount   | 无    | Attribute exposed for management                                      |
| TotalEnqueueCount       | 无    | Number of messages that have been sent to the broker.                 |
| TotalDequeueCount       | 无    | Number of messages that have been acknowledged on the broker.         |
| TotalConsumerCount      | 无    | Number of message consumers subscribed to destinations on the broker. |
| TotalProducerCount      | 无    | Number of message producers active on destinations on the broker.     |
| TotalMessageCount       | 无    | Number of unacknowledged messages on the broker.                      |
| AverageMessageSize      | 无    | Average message size on this broker                                   |
| MaxMessageSize          | 无    | Max message size on this broker                                       |
| MinMessageSize          | 无    | Min message size on this broker                                       |

#### 指标集合：topic

|        指标名称        | 指标单位 |                                          指标帮助描述                                           |
|--------------------|------|-------------------------------------------------------------------------------------------|
| Name               | 无    | Name of this destination.                                                                 |
| MemoryLimit        | MB   | Memory limit, in bytes, used by undelivered messages before paging to temporary storage.  |
| MemoryPercentUsage | 无    | The percentage of the memory limit used                                                   |
| ProducerCount      | 无    | Number of producers attached to this destination                                          |
| ConsumerCount      | 无    | Number of consumers subscribed to this destination.                                       |
| EnqueueCount       | 无    | Number of messages that have been sent to the destination.                                |
| DequeueCount       | 无    | Number of messages that has been acknowledged (and removed) from the destination.         |
| ForwardCount       | 无    | Number of messages that have been forwarded (to a networked broker) from the destination. |
| InFlightCount      | 无    | Number of messages that have been dispatched to, but not acknowledged by, consumers.      |
| DispatchCount      | 无    | Number of messages that has been delivered to consumers, including those not acknowledged |
| ExpiredCount       | 无    | Number of messages that have been expired.                                                |
| StoreMessageSize   | B    | The memory size of all messages in this destination's store.                              |
| AverageEnqueueTime | ms   | Average time a message was held on this destination.                                      |
| MaxEnqueueTime     | ms   | The longest time a message was held on this destination                                   |
| MinEnqueueTime     | ms   | The shortest time a message was held on this destination                                  |
| TotalBlockedTime   | ms   | Total time (ms) messages have been blocked by flow control                                |
| AverageMessageSize | B    | Average message size on this destination                                                  |
| MaxMessageSize     | B    | Max message size on this destination                                                      |
| MinMessageSize     | B    | Min message size on this destination                                                      |

#### 指标集合：memory_pool

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|--------|
| name      | 无    | 指标名称   |
| committed | kb   | 总量     |
| init      | kb   | 初始化大小  |
| max       | kb   | 最大     |
| used      | kb   | 已使用    |

#### 指标集合：class_loading

|         指标名称          | 指标单位 |  指标帮助描述  |
|-----------------------|------|----------|
| LoadedClassCount      | 个    | 已加载类数量   |
| TotalLoadedClassCount | 个    | 历史已加载类总量 |
| UnloadedClassCount    | 个    | 未加载类数量   |

#### 指标集合：thread

|          指标名称           | 指标单位 |  指标帮助描述   |
|-------------------------|------|-----------|
| TotalStartedThreadCount | 个    | 已经开始的线程数量 |
| ThreadCount             | 个    | 线程数       |
| PeakThreadCount         | 个    | 未加载类数量    |
| DaemonThreadCount       | 个    | 守护进程数     |
| CurrentThreadUserTime   | ms   | 使用时间      |
| CurrentThreadCpuTime    | ms   | 使用CPU时间   |
