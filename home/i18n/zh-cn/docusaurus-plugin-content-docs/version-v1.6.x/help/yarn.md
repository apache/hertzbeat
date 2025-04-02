---
id: yarn
title: 监控：Apache Yarn监控
sidebar_label: Apache Yarn
keywords: [大数据监控系统, Apache Yarn监控, 资源管理器监控]
---

> Hertzbeat 对 Apache Yarn 节点监控指标进行监控。

**使用协议：HTTP**

## 监控前操作

获取 Apache Yarn 的 HTTP 监控端口。 取值：`yarn.resourcemanager.webapp.address`

## 配置参数

|  参数名称  |               参数帮助描述                |
|--------|-------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。不带协议头。           |
| 端口     | Apache Yarn 的监控端口号，默认为8088。         |
| 查询超时时间 | 查询 Apache Yarn 的超时时间，单位毫秒，默认6000毫秒。 |
| 指标采集间隔 | 监控数据采集的时间间隔，单位秒，最小间隔为30秒。           |

### 采集指标

#### 指标集合：ClusterMetrics

|         指标名称          | 指标单位 |               指标帮助描述               |
|-----------------------|------|------------------------------------|
| NumActiveNMs          |      | 当前存活的 NodeManager 个数               |
| NumDecommissionedNMs  |      | 当前 Decommissioned 的 NodeManager 个数 |
| NumDecommissioningNMs |      | 集群正在下线的节点数                         |
| NumLostNMs            |      | 集群丢失的节点数                           |
| NumUnhealthyNMs       |      | 集群不健康的节点数                          |

#### 指标集合：JvmMetrics

|         指标名称         | 指标单位 |      指标帮助描述      |
|----------------------|------|------------------|
| MemNonHeapCommittedM | MB   | JVM当前非堆内存大小已提交大小 |
| MemNonHeapMaxM       | MB   | JVM非堆最大可用内存      |
| MemNonHeapUsedM      | MB   | JVM当前已使用的非堆内存大小  |
| MemHeapCommittedM    | MB   | JVM当前已使用堆内存大小    |
| MemHeapMaxM          | MB   | JVM堆内存最大可用内存     |
| MemHeapUsedM         | MB   | JVM当前已使用堆内存大小    |
| GcTimeMillis         |      | JVM GC时间         |
| GcCount              |      | JVM GC次数         |

#### 指标集合：QueueMetrics

|             指标名称             | 指标单位 |        指标帮助描述         |
|------------------------------|------|-----------------------|
| queue                        |      | 队列名称                  |
| AllocatedVCores              |      | 分配的虚拟核数(已分配)          |
| ReservedVCores               |      | 预留核数                  |
| AvailableVCores              |      | 可用核数(尚未分配)            |
| PendingVCores                |      | 阻塞调度核数                |
| AllocatedMB                  | MB   | 已分配(已用)的内存大小          |
| AvailableMB                  | MB   | 可用内存(尚未分配)            |
| PendingMB                    | MB   | 阻塞调度内存                |
| ReservedMB                   | MB   | 预留内存                  |
| AllocatedContainers          |      | 已分配(已用)的container数    |
| PendingContainers            |      | 阻塞调度container个数       |
| ReservedContainers           |      | 预留container数          |
| AggregateContainersAllocated |      | 累积的container分配总数      |
| AggregateContainersReleased  |      | 累积的container释放总数      |
| AppsCompleted                |      | 完成的任务数                |
| AppsKilled                   |      | 被杀掉的任务数               |
| AppsFailed                   |      | 失败的任务数                |
| AppsPending                  |      | 阻塞的任务数                |
| AppsRunning                  |      | 提正在运行的任务数             |
| AppsSubmitted                |      | 提交过的任务数               |
| running_0                    |      | 运行时间小于60分钟的作业个数       |
| running_60                   |      | 运行时间介于60~300分钟的作业个数   |
| running_300                  |      | 运行时间介于300~1440分钟的作业个数 |
| running_1440                 |      | 运行时间大于1440分钟的作业个数     |

#### 指标集合：runtime

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|--------|
| StartTime |      | 启动时间戳  |
