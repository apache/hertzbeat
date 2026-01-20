---
id: flink_on_yarn  
title: 监控：Flink On Yarn    
sidebar_label: Flink On Yarn 监控
keywords: [开源监控系统, 开源 Flink On Yarn 监控]
---

> 对Yarn运行模式下的Flink流引擎的通用指标进行测量监控。
> 监控指标对应的中文含义在本说明文档描述，页面监控显示的指标均为Flink原生指标没有翻译成中文，怕引发歧义。

### 配置参数

|  参数名称  |                         参数帮助描述                          |
|--------|---------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。    |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                     |
| Yarn端口 | Yarn的端口，对应配置项:`yarn.resourcemanager.webapp.address`中的端口 |
| 查询超时时间 | 设置JVM连接的超时时间，单位ms毫秒，默认3000毫秒。                           |
| 启动SSL  | 是否启用SSL                                                 |
| 用户名    | 连接用户名                                                   |
| 密码     | 连接密码                                                    |
| 监控周期   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                          |
| 绑定标签   | 用于对监控资源进行分类管理。                                          |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                            |

### 采集指标

#### 指标集合：JobManager Metrics

|                         指标名称                          | 指标单位 |  指标帮助描述   |
|-------------------------------------------------------|------|-----------|
| Status.JVM.Memory.NonHeap.Committed                   | 字节   | 非堆内存的提交量  |
| Status.JVM.Memory.Mapped.TotalCapacity                | 字节   | 映射内存的总容量  |
| Status.JVM.Memory.NonHeap.Used                        | 字节   | 非堆内存的使用量  |
| Status.JVM.Memory.Metaspace.Max                       | 字节   | 元空间的最大容量  |
| Status.JVM.GarbageCollector.G1_Old_Generation.Count   | 字节   | 老年代垃圾收集次数 |
| Status.JVM.Memory.Direct.MemoryUsed                   | 字节   | 直接内存的使用量  |
| Status.JVM.Memory.Mapped.MemoryUsed                   | 字节   | 映射内存的使用量  |
| Status.JVM.GarbageCollector.G1_Young_Generation.Count | 字节   | 年轻代垃圾收集次数 |
| Status.JVM.Memory.Direct.TotalCapacity                | 字节   | 直接内存的总容量  |
| Status.JVM.GarbageCollector.G1_Old_Generation.Time    | 字节   | 老年代垃圾收集时间 |
| Status.JVM.Memory.Heap.Committed                      | 字节   | 堆内存的提交量   |
| Status.JVM.Memory.Mapped.Count                        | -    | 映射内存的数量   |
| Status.JVM.Memory.Metaspace.Used                      | 字节   | 元空间的使用量   |
| Status.JVM.Memory.Direct.Count                        | -    | 直接内存的数量   |
| Status.JVM.Memory.Heap.Used                           | 字节   | 堆内存的使用量   |
| Status.JVM.Memory.Heap.Max                            | 字节   | 堆内存的最大容量  |
| Status.JVM.GarbageCollector.G1_Young_Generation.Time  | 字节   | 年轻代垃圾收集时间 |
| Status.JVM.Memory.NonHeap.Max                         | 字节   | 非堆内存的最大容量 |

#### 指标集合：JobManager Config

|                    指标名称                    | 指标单位 |         指标帮助描述         |
|--------------------------------------------|------|------------------------|
| internal.jobgraph-path                     | -    | 内部作业图路径                |
| env.java.home                              | -    | Java 环境路径              |
| classloader.check-leaked-classloader       | -    | 是否检查类加载器               |
| env.java.opts                              | -    | Java 选项                |
| high-availability.cluster-id               | -    | 高可用性集群 ID              |
| jobmanager.rpc.address                     | -    | JobManager 的 RPC 地址    |
| jobmanager.memory.jvm-overhead.min         | 字节   | JobManager 的 JVM 开销最小值 |
| jobmanager.web.port                        | 端口号  | JobManager 的 Web 端口    |
| webclient.port                             | 端口号  | Web 客户端端口              |
| execution.savepoint.ignore-unclaimed-state | -    | 是否忽略未声明的状态             |
| io.tmp.dirs                                | 路径   | 临时文件目录                 |
| parallelism.default                        | -    | 默认并行度                  |
| taskmanager.memory.fraction                | -    | TaskManager 内存占比       |
| taskmanager.numberOfTaskSlots              | -    | TaskManager 的任务槽数量     |
| yarn.application.name                      | -    | Yarn 应用名称              |
| taskmanager.heap.mb                        | MB   | TaskManager 堆内存大小      |
| taskmanager.memory.process.size            | GB   | TaskManager 进程内存大小     |
| web.port                                   | 端口号  | Web 端口                 |
| classloader.resolve-order                  | -    | 类加载器解析顺序               |
| jobmanager.heap.mb                         | MB   | JobManager 堆内存大小       |
| jobmanager.memory.off-heap.size            | 字节   | JobManager 堆外内存大小      |
| state.backend.incremental                  | -    | 状态后端是否增量               |
| execution.target                           | -    | 执行目标                   |
| jobmanager.memory.process.size             | GB   | JobManager 进程内存大小      |
| web.tmpdir                                 | 路径   | Web 临时目录               |
| yarn.ship-files                            | 路径   | Yarn 传输文件              |
| jobmanager.rpc.port                        | 端口号  | JobManager 的 RPC 端口    |
| internal.io.tmpdirs.use-local-default      | -    | 是否使用本地默认临时目录           |
| execution.checkpointing.interval           | 毫秒   | 检查点间隔                  |
| execution.attached                         | -    | 是否附加执行                 |
| internal.cluster.execution-mode            | -    | 内部集群执行模式               |
| execution.shutdown-on-attached-exit        | -    | 是否在附加退出时关闭             |
| pipeline.jars                              | 路径   | 管道 JAR 文件              |
| rest.address                               | -    | REST 地址                |
| state.backend                              | -    | 状态后端类型                 |
| jobmanager.memory.jvm-metaspace.size       | 字节   | JobManager JVM 元空间大小   |
| $internal.deployment.config-dir            | 路径   | 内部部署配置目录               |
| $internal.yarn.log-config-file             | 路径   | 内部 Yarn 日志配置文件路径       |
| jobmanager.memory.heap.size                | 字节   | JobManager 堆内存大小       |
| state.checkpoints.dir                      | 路径   | 状态检查点目录                |
| jobmanager.memory.jvm-overhead.max         | 字节   | JobManager 的 JVM 开销最大值 |

#### TaskManager

|                 指标名称                  | 指标单位 |              指标帮助描述               |
|---------------------------------------|------|-----------------------------------|
| Container ID                          | -    | 容器 ID，用于唯一标识一个容器                  |
| Path                                  | -    | 容器路径                              |
| Data Port                             | 端口号  | 数据传输端口                            |
| JMX Port                              | 端口号  | JMX（Java Management Extensions）端口 |
| Last Heartbeat                        | 时间戳  | 最后一次心跳时间                          |
| All Slots                             | 数量   | 容器中所有任务槽的数量                       |
| Free Slots                            | 数量   | 容器中空闲任务槽的数量                       |
| totalResourceCpuCores                 | 核心数  | 容器总的CPU核心数                        |
| totalResourceTaskHeapMemory           | MB   | 容器总的任务堆内存大小                       |
| totalResourceManagedMemory            | MB   | 容器总的托管内存大小                        |
| totalResourceNetworkMemory            | MB   | 容器总的网络内存大小                        |
| freeResourceCpuCores                  | 核心数  | 容器中空闲的CPU核心数                      |
| freeResourceTaskHeapMemory            | MB   | 容器中空闲的任务堆内存大小                     |
| freeResourceTaskOffHeapMemory         | MB   | 容器中空闲的任务堆外内存大小                    |
| freeResourceManagedMemory             | MB   | 容器中空闲的托管内存大小                      |
| freeResourceNetworkMemory             | MB   | 容器中空闲的网络内存大小                      |
| CPU Cores                             | 核心数  | CPU核心数                            |
| Physical MEM                          | MB   | 物理内存大小                            |
| JVM Heap Size                         | MB   | JVM堆内存大小                          |
| Flink Managed MEM                     | MB   | Flink管理的内存大小                      |
| Framework Heap                        | MB   | 框架堆内存大小                           |
| Task Heap                             | MB   | 任务堆内存大小                           |
| Framework Off-Heap                    | MB   | 框架堆外内存大小                          |
| memoryConfigurationTaskOffHeap        | Byte | 任务堆外内存配置                          |
| Network                               | MB   | 网络内存配置                            |
| Managed Memory                        | MB   | 托管内存配置                            |
| JVM Metaspace                         | MB   | JVM元空间大小                          |
| JVM Overhead                          | MB   | JVM开销                             |
| memoryConfigurationTotalFlinkMemory   | Byte | Flink总内存配置                        |
| memoryConfigurationTotalProcessMemory | Byte | 进程总内存配置                           |

#### TaskManager Metrics

|               指标名称                | 指标单位 |        指标帮助描述        |
|-----------------------------------|------|----------------------|
| Status.Shuffle.Netty.TotalMemory  | MB   | Netty Shuffle 使用的总内存 |
| Status.Flink.Memory.Managed.Used  | MB   | Flink 管理的已用内存        |
| Status.JVM.Memory.Metaspace.Used  | MB   | JVM 元空间已使用的内存        |
| Status.JVM.Memory.Metaspace.Max   | MB   | JVM 元空间的最大内存         |
| Status.JVM.Memory.Heap.Used       | MB   | JVM 堆内存已使用的内存        |
| Status.JVM.Memory.Heap.Max        | MB   | JVM 堆内存的最大容量         |
| Status.Flink.Memory.Managed.Total | MB   | Flink 管理的内存总量        |
| Status.Shuffle.Netty.UsedMemory   | MB   | Netty Shuffle 使用的内存  |
