---
id: iotdb  
title: 监控 Apache IoTDB 物联网时序数据库      
sidebar_label: IoTDB数据库    
keywords: [开源监控系统, 开源数据库监控, IoTDB数据库监控]
---

> 对 Apache IoTDB 物联网时序数据库的运行状态（JVM相关），内存任务集群等相关指标进行监测。

## 监控前操作

您需要在 IoTDB 开启`metrics`功能，他将提供 prometheus metrics 形式的接口数据。

开启`metrics`功能, 参考 [官方文档](https://iotdb.apache.org/zh/UserGuide/V0.13.x/Maintenance-Tools/Metric-Tool.html)

主要如下步骤:

1. metric 采集默认是关闭的，需要先到 `conf/iotdb-metric.yml` 中修改参数打开后重启 server

    ```text
    # 是否启动监控模块，默认为false
    enableMetric: true
    
    # 是否启用操作延迟统计
    enablePerformanceStat: false
    
    # 数据提供方式，对外部通过jmx和prometheus协议提供metrics的数据, 可选参数：[JMX, PROMETHEUS, IOTDB],IOTDB是默认关闭的。
    metricReporterList:
      - JMX
      - PROMETHEUS
    
    # 底层使用的metric架构，可选参数：[MICROMETER, DROPWIZARD]
    monitorType: MICROMETER
    
    # 初始化metric的级别，可选参数: [CORE, IMPORTANT, NORMAL, ALL]
    metricLevel: IMPORTANT
    
    # 预定义的指标集, 可选参数: [JVM, LOGBACK, FILE, PROCESS, SYSTEM]
    predefinedMetrics:
      - JVM
      - FILE
    ```

2. 重启 IoTDB, 打开浏览器或者用curl 访问 <http://ip:9091/metrics>, 就能看到metric数据了。

3. 在 HertzBeat 添加对应 IoTDB 监控即可。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | IoTDB指标接口对外提供的端口，默认为9091。                            |
| 超时时间   | HTTP请求查询超时时间                                         |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：cluster_node_status

|  指标名称  | 指标单位 |         指标帮助描述          |
|--------|------|-------------------------|
| name   | 无    | 节点名称IP                  |
| status | 无    | 节点状态，1=online 2=offline |

#### 指标集合：jvm_memory_committed_bytes

| 指标名称  | 指标单位 |      指标帮助描述      |
|-------|------|------------------|
| area  | 无    | heap内存或nonheap内存 |
| id    | 无    | 内存区块             |
| value | MB   | 当前向JVM申请的内存大小    |

#### 指标集合：jvm_memory_used_bytes

| 指标名称  | 指标单位 |      指标帮助描述      |
|-------|------|------------------|
| area  | 无    | heap内存或nonheap内存 |
| id    | 无    | 内存区块             |
| value | MB   | JVM已使用内存大小       |

#### 指标集合：jvm_threads_states_threads

| 指标名称  | 指标单位 |   指标帮助描述   |
|-------|------|------------|
| state | 无    | 线程状态       |
| count | 无    | 线程状态对应线程数量 |

#### 指标集合：quantity 业务数据

| 指标名称 | 指标单位 | 指标帮助描述         |
|--|------|----------------|
| name  | 无    | 业务名称 timeSeries/storageGroup/device/deviceUsingTemplate  |
| type  | 无    | 类型 total/normal/template/template  |
| value | 无    | 当前时间timeSeries/storageGroup/device/激活了模板的device的数量  |

#### 指标集合：cache_hit 缓存

| 指标名称  | 指标单位 |                  指标帮助描述                  |
|-------|------|------------------------------------------|
| name  | 无    | 缓存名称 chunk/timeSeriesMeta/bloomFilter    |
| value | %    | chunk/timeSeriesMeta缓存命中率,bloomFilter拦截率 |

#### 指标集合：queue 任务队列

|  指标名称  | 指标单位 |                    指标帮助描述                    |
|--------|------|----------------------------------------------|
| name   | 无    | 队列名称 compaction_inner/compaction_cross/flush |
| status | 无    | 状态 running/waiting                           |
| value  | 无    | 当前时间任务数                                      |

#### 指标集合：thrift_connections

|    指标名称    | 指标单位 |   指标帮助描述    |
|------------|------|-------------|
| name       | 无    | 名称          |
| connection | 无    | thrift当前连接数 |
