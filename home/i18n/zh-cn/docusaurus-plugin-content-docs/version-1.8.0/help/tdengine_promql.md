---
id: tdengine_promql
title: 监控：TDengine-PromQL
sidebar_label: TDengine-PromQL
keywords: [ 开源监控系统,开源中间件监控, TDengine监控,TDengine-PromQL监控 ]
---

> 使用 Prometheus PromQL 从 Prometheus 服务器中查询到 TDengine 的通用指标数据来进行监控。此方案适用于 Prometheus 已监控
> TDengine，需要从 Prometheus 服务器抓取 TDengine 的监控数据。

### 前置条件

1. 部署 TDengine；
2. 部署 taosKeeper；注意⚠️安装 TDengine 官方安装包的同时会自动安装 taosKeeper
   详情请参考：[taosKeeper](https://docs.taosdata.com/reference/components/taoskeeper/)；
3. 通过 prometheus 采集 TDengine taosKeeper 暴露的监控指标；

### 配置参数

| 参数名称         | 参数帮助描述                                               |
|--------------|------------------------------------------------------|
| 监控Host       | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称         | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口           | Prometheus api 端口，默认值：9090。                          |
| 相对路径         | Prometheus查询PromQL的URL，默认值：/api/v1/query。            |
| 请求方式         | 设置接口调用的请求方式：GET,POST,PUT,DELETE，默认值：GET。             |
| 启用HTTPS      | 是否通过HTTPS访问网站，注意⚠️开启HTTPS一般默认对应端口需要改为443。            |
| 用户名          | 接口Basic认证或Digest认证时使用的用户名。                           |
| 密码           | 接口Basic认证或Digest认证时使用的密码。                            |
| Content-Type | 设置携带BODY请求体数据请求时的资源类型。                               |
| 请求BODY       | 设置携带BODY请求体数据，PUT POST请求方式时有效。                       |
| 采集间隔         | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒。                      |
| 描述备注         | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                         |

### 采集指标

#### 指标集合：基础信息指标

| 指标名称                            | 指标单位 | 指标帮助描述  |
|---------------------------------|------|---------|
| taos_cluster_info_first_ep      | 无    | 第一个端点   |
| taos_cluster_info_version       | 无    | 版本信息    |
| taos_cluster_info_master_uptime | 天    | 主节点运行时间 |

#### 指标集合：节点数量指标

| 指标名称                            | 指标单位 | 指标帮助描述       |
|---------------------------------|------|--------------|
| taos_cluster_info_dnodes_total  | 无    | dnode 总数     |
| taos_cluster_info_dnodes_alive  | 无    | 存活的 dnode 数量 |
| taos_cluster_info_mnodes_total  | 无    | mnode 总数     |
| taos_cluster_info_mnodes_alive  | 无    | 存活的 mnode 数量 |
| taos_cluster_info_vgroups_total | 无    | 虚拟组总数        |
| taos_cluster_info_vgroups_alive | 无    | 存活的虚拟组数量     |
| taos_cluster_info_vnodes_total  | 无    | 虚拟节点总数       |
| taos_cluster_info_vnodes_alive  | 无    | 存活的虚拟节点数量    |

### 指标集合：数据库和表统计

| 指标名称                                | 指标单位 | 指标帮助描述 |
|-------------------------------------|------|--------|
| taos_cluster_info_dbs_total         | 无    | 数据库总数  |
| taos_cluster_info_tbs_total         | 无    | 表总数    |
| taos_cluster_info_connections_total | 天    | 总连接数   |

### 指标集合：Dnode 信息

| 指标名称                           | 指标单位                                 | 指标帮助描述                     |
|--------------------------------|--------------------------------------|----------------------------|
| taos_d_info_status             | ready 表示正常、offline 表示下线、unknown 表示未知 | dnode 状态                   |
| taos_dnodes_info_uptime        | 秒                                    | 该 dnode 的启动时间              |
| taos_dnodes_info_cpu_engine    | 无                                    | 该 dnode 的进程所使用的 CPU 百分比    |
| taos_dnodes_info_cpu_system    | 无                                    | 该 dnode 所在节点的系统使用的 CPU 百分比 |
| taos_dnodes_info_mem_engine    | KB                                   | 该 dnode 的进程所使用的内存          |
| taos_dnodes_info_mem_system    | KB                                   | 该 dnode 所在节点的系统所使用的内存      |
| taos_dnodes_info_disk_total    | Byte                                 | 该 dnode 所在节点的磁盘总容量         |
| taos_dnodes_info_disk_used     | Byte                                 | 该 dnode 所在节点的磁盘已使用的容量      |
| taos_dnodes_info_io_write_disk | Byte/s                               | 该 dnode 所在节点的磁盘 io 写入速率    |
| taos_dnodes_info_io_read_disk  | Byte/s                               | 该 dnode 所在节点的磁盘 io 读取速率    |

### 指标集合：taosadapter 相关

| 指标名称                          | 指标单位 | 指标帮助描述 |
|-------------------------------|------|--------|
| taos_adapter_requests_total   | 无    | 总请求数   |
| taos_adapter_requests_success | 无    | 成功的请求数 |
| taos_adapter_requests_fail    | 无    | 失败的请求数 |
| taos_adapter_requests_query   | 无    | 查询请求数  |

### HertzBeat支持的其他 TDengine 监控方式

1.通过taosKeeper暴露的监控指标，可以参考 [Prometheus任务](prometheus) 配置Prometheus采集任务监控 TDengine。
