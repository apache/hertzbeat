---
id: apollo
title: 监控：Apollo配置中心
sidebar_label: Apollo配置中心
keywords: [ 开源监控系统, 开源中间件监控, Apollo配置中心监控 ]
---

> 通过调用 Apollo配置中心 Prometheus 接口对 Apollo配置中心服务的通用指标进行采集监控。

### 前置条件

1. 按照[部署文档](https://www.apolloconfig.com/#/en/deployment/quick-start)搭建好Apollo配置中心。
2. 访问```http://${someIp:somePort}/prometheus```，查看是否能访问到metrics数据。
   详情请参考：[Apollo 监控相关](https://www.apolloconfig.com/#/en/design/apollo-design?id=v-monitoring-related)
3. 注意⚠️：从1.5.0版本开始，Apollo服务端支持通过/prometheus暴露prometheus格式的metrics

## 配置参数

| 参数名称   | 参数帮助描述                                               |
|--------|------------------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 端口     | Pulsar的webServiceProt值，默认为8080。                      |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 查询超时时间 | 设置连接的超时时间，单位ms毫秒，默认3000毫秒。                           |
| 监控周期   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签   | 用于对监控资源进行分类管理                                        |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：基础信息指标

| 指标名称                           | 指标单位 | 指标帮助描述        |
|--------------------------------|------|---------------|
| application_ready_time_seconds | 秒    | 应用从启动到就绪状态的耗时 |
| process_uptime_seconds         | 秒    | 进程已运行的总时间     |
| process_cpu_usage              | %    | 当前进程的CPU使用率   |

#### 指标集合：jvm

| 指标名称                              | 指标单位 | 指标帮助描述           |
|-----------------------------------|------|------------------|
| system_cpu_usage                  | %    | 系统CPU使用率         |
| system_load_average_1m            | 无    | 系统最近一分钟平均负载      |
| jvm_memory_committed_bytes        | MB   | JVM已向操作系统申请的内存大小 |
| jvm_memory_used_bytes             | MB   | JVM当前实际使用的内存大小   |
| jvm_memory_max_bytes              | MB   | JVM可使用的最大内存限制    |
| jvm_gc_pause_seconds_count        | 无    | JVM GC暂停事件的总次数   |
| jvm_gc_pause_seconds_sum          | 无    | JVM GC暂停的总耗时     |
| jvm_memory_usage_after_gc_percent | 无    | JVM GC后的内存使用率    |

#### 指标集合：系统资源

| 指标名称                     | 指标单位 | 指标帮助描述             |
|--------------------------|------|--------------------|
| process_files_max_files  | 无    | 允许进程打开的最大文件描述符数量限制 |
| process_files_open_files | 无    | 进程当前已打开的文件描述符数量    |
