---
id: hugegraph  
title: 监控：HugeGraph监控    
sidebar_label: Apache HugeGraph
keywords: [开源监控系统, 开源数据库监控, HugeGraph监控]
---

> 对HugeGraph的通用性能指标进行采集监控

**使用协议：HTTP**

## 监控前操作

查看 `rest-server.properties` 文件，获取 `restserver_port` 配置项的值，该值用作监控使用。

## 配置参数

|   参数名称    |                         参数帮助描述                          |
|-----------|---------------------------------------------------------|
| 目标Host    | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。    |
| 端口        | HugeGraph restserver的端口号，默认为8080。即:`restserver_port`参数值 |
| 启动SSL     | 使用使用SSL                                                 |
| Base Path | 基础路径，默认为: /metrics ，通常情况下不需要修改                          |
| 任务名称      | 标识此监控的名称，名称需要保证唯一性。                                     |
| 采集间隔      | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                          |
| 是否探测      | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                        |
| 描述备注      | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                             |

### 采集指标

#### 指标集合：gauges

|              指标名称              | 指标单位 |        指标帮助描述         |
|--------------------------------|------|-----------------------|
| edge-hugegraph-capacity        | 无    | 表示当前图中边的容量上限          |
| edge-hugegraph-expire          | 无    | 表示边数据的过期时间            |
| edge-hugegraph-hits            | 无    | 表示边数据缓存的命中次数          |
| edge-hugegraph-miss            | 无    | 表示边数据缓存的未命中次数         |
| edge-hugegraph-size            | 无    | 表示当前图中边的数量            |
| instances                      | 无    | 表示当前运行的HugeGraph实例数量  |
| schema-id-hugegraph-capacity   | 无    | 表示图中schema ID的容量上限    |
| schema-id-hugegraph-expire     | 无    | 表示schema ID数据的过期时间    |
| schema-id-hugegraph-hits       | 无    | 表示schema ID数据缓存的命中次数  |
| schema-id-hugegraph-miss       | 无    | 表示schema ID数据缓存的未命中次数 |
| schema-id-hugegraph-size       | 无    | 表示当前图中schema ID的数量    |
| schema-name-hugegraph-capacity | 无    | 表示图中schema名称的容量上限     |
| schema-name-hugegraph-expire   | 无    | 表示schema名称数据的过期时间     |
| schema-name-hugegraph-hits     | 无    | 表示schema名称数据缓存的命中次数   |
| schema-name-hugegraph-miss     | 无    | 表示schema名称数据缓存的未命中次数  |
| schema-name-hugegraph-size     | 无    | 表示当前图中schema名称的数量     |
| token-hugegraph-capacity       | 无    | 表示图中token的容量上限        |
| token-hugegraph-expire         | 无    | 表示token数据的过期时间        |
| token-hugegraph-hits           | 无    | 表示token数据缓存的命中次数      |
| token-hugegraph-miss           | 无    | 表示token数据缓存的未命中次数     |
| token-hugegraph-size           | 无    | 表示当前图中token的数量        |
| users-hugegraph-capacity       | 无    | 表示图中用户的容量上限           |
| users-hugegraph-expire         | 无    | 表示用户数据的过期时间           |
| users-hugegraph-hits           | 无    | 表示用户数据缓存的命中次数         |
| users-hugegraph-miss           | 无    | 表示用户数据缓存的未命中次数        |
| users-hugegraph-size           | 无    | 表示当前图中用户的数量           |
| users_pwd-hugegraph-capacity   | 无    | 表示users_pwd的容量上限      |
| users_pwd-hugegraph-expire     | 无    | 表示users_pwd数据的过期时间    |
| users_pwd-hugegraph-hits       | 无    | 表示users_pwd数据缓存的命中次数  |
| users_pwd-hugegraph-miss       | 无    | 表示users_pwd数据缓存的未命中次数 |
| users_pwd-hugegraph-size       | 无    | 表示当前图中users_pwd的数量    |
| vertex-hugegraph-capacity      | 无    | 表示图中顶点的容量上限           |
| vertex-hugegraph-expire        | 无    | 表示顶点数据的过期时间           |
| vertex-hugegraph-hits          | 无    | 表示顶点数据缓存的命中次数         |
| vertex-hugegraph-miss          | 无    | 表示顶点数据缓存的未命中次数        |
| vertex-hugegraph-size          | 无    | 表示当前图中顶点的数量           |
| batch-write-threads            | 无    | 表示批量写入操作时的线程数         |
| max-write-threads              | 无    | 表示最大写入操作的线程数          |
| pending-tasks                  | 无    | 表示待处理的任务数             |
| workers                        | 无    | 表示当前工作线程的数量           |
| average-load-penalty           | 无    | 表示平均加载延迟              |
| estimated-size                 | 无    | 表示估计的数据大小             |
| eviction-count                 | 无    | 表示被驱逐的数据条数            |
| eviction-weight                | 无    | 表示被驱逐数据的权重            |
| hit-count                      | 无    | 表示缓存命中总数              |
| hit-rate                       | 无    | 表示缓存命中率               |
| load-count                     | 无    | 表示数据加载次数              |
| load-failure-count             | 无    | 表示数据加载失败次数            |
| load-failure-rate              | 无    | 表示数据加载失败率             |
| load-success-count             | 无    | 表示数据加载成功次数            |
| long-run-compilation-count     | 无    | 表示长时间运行的编译次数          |
| miss-count                     | 无    | 表示缓存未命中总数             |
| miss-rate                      | 无    | 表示缓存未命中率              |
| request-count                  | 无    | 表示总的请求次数              |
| total-load-time                | 无    | 表示总的数据加载时间            |
| sessions                       | 无    | 表示当前的活动会话数量           |

#### 指标集合：counters

|                        指标名称                         | 指标单位 |            指标帮助描述            |
|-----------------------------------------------------|------|------------------------------|
| GET-SUCCESS_COUNTER                                 | 无    | 记录GET请求成功的次数                 |
| GET-TOTAL_COUNTER                                   | 无    | 记录GET请求的总次数                  |
| favicon-ico-GET-FAILED_COUNTER                      | 无    | 记录获取favicon.ico失败的GET请求次数    |
| favicon-ico-GET-TOTAL_COUNTER                       | 无    | 记录获取favicon.ico的GET请求总次数     |
| graphs-HEAD-FAILED_COUNTER                          | 无    | 记录graphs资源的HEAD请求失败的次数       |
| graphs-HEAD-SUCCESS_COUNTER                         | 无    | 记录graphs资源的HEAD请求成功的次数       |
| graphs-HEAD-TOTAL_COUNTER                           | 无    | 记录graphs资源的HEAD请求的总次数        |
| graphs-hugegraph-graph-vertices-GET-SUCCESS_COUNTER | 无    | 记录获取HugeGraph图中顶点的GET请求成功的次数 |
| graphs-hugegraph-graph-vertices-GET-TOTAL_COUNTER   | 无    | 记录获取HugeGraph图中顶点的GET请求的总次数  |
| metircs-GET-FAILED_COUNTER                          | 无    | 记录获取metrics失败的GET请求次数        |
| metircs-GET-TOTAL_COUNTER                           | 无    | 记录获取metrics的GET请求总次数         |
| metrics-GET-SUCCESS_COUNTER                         | 无    | 记录获取metrics成功的GET请求次数        |
| metrics-GET-TOTAL_COUNTER                           | 无    | 记录获取metrics的GET请求总次数         |
| metrics-gauges-GET-SUCCESS_COUNTER                  | 无    | 记录获取metrics gauges成功的GET请求次数 |
| metrics-gauges-GET-TOTAL_COUNTER                    | 无    | 记录获取metrics gauges的GET请求总次数  |

#### 指标集合：system

|                    指标名称                     | 指标单位 |             指标帮助描述             |
|---------------------------------------------|------|--------------------------------|
| mem                                         | 无    | 表示系统的总内存量                      |
| mem_total                                   | 无    | 表示系统的总内存量（与mem相同）              |
| mem_used                                    | 无    | 表示系统当前使用的内存量                   |
| mem_free                                    | 无    | 表示系统空闲的内存量                     |
| mem_unit                                    | 无    | 表示内存量的单位（如字节、千字节、兆字节等）         |
| processors                                  | 无    | 表示系统的处理器数量                     |
| uptime                                      | 无    | 表示系统运行时间，即从启动到现在的时间            |
| systemload_average                          | 无    | 表示系统的平均负载，反映了系统的繁忙程度           |
| heap_committed                              | 无    | 表示JVM堆内存的承诺大小，即保证可供JVM使用的堆内存大小 |
| heap_init                                   | 无    | 表示JVM堆内存的初始大小                  |
| heap_used                                   | 无    | 表示JVM当前使用的堆内存大小                |
| heap_max                                    | 无    | 表示JVM堆内存的最大可使用大小               |
| nonheap_committed                           | 无    | 表示JVM非堆内存的承诺大小                 |
| nonheap_init                                | 无    | 表示JVM非堆内存的初始大小                 |
| nonheap_used                                | 无    | 表示JVM当前使用的非堆内存大小               |
| nonheap_max                                 | 无    | 表示JVM非堆内存的最大可使用大小              |
| thread_peak                                 | 无    | 表示自JVM启动以来峰值线程数                |
| thread_daemon                               | 无    | 表示当前活跃的守护线程数                   |
| thread_total_started                        | 无    | 表示自JVM启动以来总共启动过的线程数            |
| thread_count                                | 无    | 表示当前活跃的线程数                     |
| garbage_collector_g1_young_generation_count | 无    | 表示G1垃圾收集器年轻代垃圾收集的次数            |
| garbage_collector_g1_young_generation_time  | 无    | 表示G1垃圾收集器年轻代垃圾收集的总时间           |
| garbage_collector_g1_old_generation_count   | 无    | 表示G1垃圾收集器老年代垃圾收集的次数            |
| garbage_collector_g1_old_generation_time    | 无    | 表示G1垃圾收集器老年代垃圾收集的总时间           |
| garbage_collector_time_unit                 | 无    | 表示垃圾收集时间的单位（如毫秒、秒等）            |
