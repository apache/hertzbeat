---
id: hbase_regionserver  
title: 监控 Hbase RegionServer监控    
sidebar_label: Apache Hbase RegionServer
keywords: [开源监控系统, 开源数据库监控, RegionServer监控]
---

> 对Hbase RegionServer的通用性能指标进行采集监控

**使用协议：HTTP**

## 监控前操作

查看 `hbase-site.xml` 文件，获取 `hbase.regionserver.info.port` 配置项的值，该值用作监控使用。

## 配置参数

|  参数名称  |                               参数帮助描述                                |
|--------|---------------------------------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。                |
| 端口     | hbase regionserver的端口号，默认为16030。即:`hbase.regionserver.info.port`参数值 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                                 |
| 查询超时时间 | 设置连接的超时时间，单位ms毫秒，默认3000毫秒。                                          |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                                      |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                                    |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                                         |

### 采集指标

> 所有指标名称均直接引用官方的字段，所以存在命名不规范。

#### 指标集合：server

|               指标名称                | 指标单位  |                 指标帮助描述                  |
|-----------------------------------|-------|-----------------------------------------|
| regionCount                       | 无     | Region数量                                |
| readRequestCount                  | 无     | 重启集群后的读请求数量                             |
| writeRequestCount                 | 无     | 重启集群后的写请求数量                             |
| averageRegionSize                 | MB    | 平均Region大小                              |
| totalRequestCount                 | 无     | 全部请求数量                                  |
| ScanTime_num_ops                  | 无     | Scan 请求总量                               |
| Append_num_ops                    | 无     | Append 请求量                              |
| Increment_num_ops                 | 无     | Increment请求量                            |
| Get_num_ops                       | 无     | Get 请求量                                 |
| Delete_num_ops                    | 无     | Delete 请求量                              |
| Put_num_ops                       | 无     | Put 请求量                                 |
| ScanTime_mean                     | 无     | 平均 Scan 请求时间                            |
| ScanTime_min                      | 无     | 最小 Scan 请求时间                            |
| ScanTime_max                      | 无     | 最大 Scan 请求时间                            |
| ScanSize_mean                     | bytes | 平均 Scan 请求大小                            |
| ScanSize_min                      | 无     | 最小 Scan 请求大小                            |
| ScanSize_max                      | 无     | 最大 Scan 请求大小                            |
| slowPutCount                      | 无     | 慢操作次数/Put                               |
| slowGetCount                      | 无     | 慢操作次数/Get                               |
| slowAppendCount                   | 无     | 慢操作次数/Append                            |
| slowIncrementCount                | 无     | 慢操作次数/Increment                         |
| slowDeleteCount                   | 无     | 慢操作次数/Delete                            |
| blockCacheSize                    | 无     | 缓存块内存占用大小                               |
| blockCacheCount                   | 无     | 缓存块数量_Block Cache 中的 Block 数量           |
| blockCacheExpressHitPercent       | 无     | 读缓存命中率                                  |
| memStoreSize                      | 无     | Memstore 大小                             |
| FlushTime_num_ops                 | 无     | RS写磁盘次数/Memstore flush 写磁盘次数            |
| flushQueueLength                  | 无     | Region Flush 队列长度                       |
| flushedCellsSize                  | 无     | flush到磁盘大小                              |
| storeFileCount                    | 无     | Storefile 个数                            |
| storeCount                        | 无     | Store 个数                                |
| storeFileSize                     | 无     | Storefile 大小                            |
| compactionQueueLength             | 无     | Compaction 队列长度                         |
| percentFilesLocal                 | 无     | Region 的 HFile 位于本地 HDFS Data Node的比例   |
| percentFilesLocalSecondaryRegions | 无     | Region 副本的 HFile 位于本地 HDFS Data Node的比例 |
| hlogFileCount                     | 无     | WAL 文件数量                                |
| hlogFileSize                      | 无     | WAL 文件大小                                |

#### 指标集合：IPC

|           指标名称            | 指标单位 |    指标帮助描述    |
|---------------------------|------|--------------|
| numActiveHandler          | 无    | 当前的 RIT 数量   |
| NotServingRegionException | 无    | 超过阈值的 RIT 数量 |
| RegionMovedException      | ms   | 最老的RIT的持续时间  |
| RegionTooBusyException    | ms   | 最老的RIT的持续时间  |

#### 指标集合：JVM

|         指标名称         | 指标单位 |       指标帮助描述       |
|----------------------|------|--------------------|
| MemNonHeapUsedM      | 无    | 当前活跃RegionServer列表 |
| MemNonHeapCommittedM | 无    | 当前离线RegionServer列表 |
| MemHeapUsedM         | 无    | Zookeeper列表        |
| MemHeapCommittedM    | 无    | Master节点           |
| MemHeapMaxM          | 无    | 集群负载均衡次数           |
| MemMaxM              | 无    | RPC句柄数             |
| GcCount              | MB   | 集群接收数据量            |
