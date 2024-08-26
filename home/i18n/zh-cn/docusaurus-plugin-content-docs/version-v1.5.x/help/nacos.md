---
id: nacos
title: 监控：Nacos分布式监控      
sidebar_label: Nacos分布式
keywords: [开源监控系统, 中间件监控, Nacos分布式监控]
---

> 通过调用 Nacos Metrics 接口对 Nacos 注册配置中心服务的通用指标进行采集监控。

### 监控前操作

#### 搭建Nacos集群暴露metrics数据

1. 按照[部署文档](https://nacos.io/zh-cn/docs/deployment.html)搭建好Nacos集群。
2. 配置application.properties文件，暴露metrics数据。

    ```properties
    management.endpoints.web.exposure.include=*
    ```

3. 访问```{ip}:8848/nacos/actuator/prometheus```，查看是否能访问到metrics数据。

更多信息请参考[Nacos 监控手册](https://nacos.io/zh-cn/docs/monitor-guide.html)。

### 配置参数

|   参数名称    |                        参数帮助描述                        |
|-----------|------------------------------------------------------|
| 服务器Host   | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称      | 标识此监控的名称，名称需要保证唯一性。                                  |
| Nacos服务端口 | Nacos服务对外提供的端口，默认为8848。                              |
| 采集间隔      | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 描述备注      | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：jvm

|            指标名称            | 指标单位 |     指标帮助描述     |
|----------------------------|------|----------------|
| system_cpu_usage           | 无    | CPU使用率         |
| system_load_average_1m     | 无    | load           |
| jvm_memory_used_bytes      | 字节   | 内存使用字节，包含各种内存区 |
| jvm_memory_max_bytes       | 字节   | 内存最大字节，包含各种内存区 |
| jvm_gc_pause_seconds_count | 无    | gc次数，包含各种gc    |
| jvm_gc_pause_seconds_sum   | 秒    | gc耗时，包含各种gc    |
| jvm_threads_daemon         | 无    | 线程数            |

#### 指标集合：Nacos

|                  指标名称                  | 指标单位 |           指标帮助描述            |
|----------------------------------------|------|-----------------------------|
| http_server_requests_seconds_count     | 秒    | http请求次数，包括多种(url,方法,code)  |
| http_server_requests_seconds_sum       | 秒    | http请求总耗时，包括多种(url,方法,code) |
| nacos_timer_seconds_sum                | 秒    | Nacos config水平通知耗时          |
| nacos_timer_seconds_count              | 无    | Nacos config水平通知次数          |
| nacos_monitor{name='longPolling'}      | 无    | Nacos config长连接数            |
| nacos_monitor{name='configCount'}      | 无    | Nacos config配置个数            |
| nacos_monitor{name='dumpTask'}         | 无    | Nacos config配置落盘任务堆积数       |
| nacos_monitor{name='notifyTask'}       | 无    | Nacos config配置水平通知任务堆积数     |
| nacos_monitor{name='getConfig'}        | 无    | Nacos config读配置统计数          |
| nacos_monitor{name='publish'}          | 无    | Nacos config写配置统计数          |
| nacos_monitor{name='ipCount'}          | 无    | Nacos naming ip个数           |
| nacos_monitor{name='domCount'}         | 无    | Nacos naming域名个数(1.x 版本)    |
| nacos_monitor{name='serviceCount'}     | 无    | Nacos naming域名个数(2.x 版本)    |
| nacos_monitor{name='failedPush'}       | 无    | Nacos naming推送失败数           |
| nacos_monitor{name='avgPushCost'}      | 秒    | Nacos naming平均推送耗时          |
| nacos_monitor{name='leaderStatus'}     | 无    | Nacos naming角色状态            |
| nacos_monitor{name='maxPushCost'}      | 秒    | Nacos naming最大推送耗时          |
| nacos_monitor{name='mysqlhealthCheck'} | 无    | Nacos naming mysql健康检查次数    |
| nacos_monitor{name='httpHealthCheck'}  | 无    | Nacos naming http健康检查次数     |
| nacos_monitor{name='tcpHealthCheck'}   | 无    | Nacos naming tcp健康检查次数      |

#### 指标集合：Nacos 异常

|                        指标名称                        | 指标单位 |             指标帮助描述             |
|----------------------------------------------------|------|--------------------------------|
| nacos_exception_total{name='db'}                   | 无    | 数据库异常                          |
| nacos_exception_total{name='configNotify'}         | 无    | Nacos config水平通知失败             |
| nacos_exception_total{name='unhealth'}             | 无    | Nacos config server之间健康检查异常    |
| nacos_exception_total{name='disk'}                 | 无    | Nacos naming写磁盘异常              |
| nacos_exception_total{name='leaderSendBeatFailed'} | 无    | Nacos naming leader发送心跳异常      |
| nacos_exception_total{name='illegalArgument'}      | 无    | 请求参数不合法                        |
| nacos_exception_total{name='nacos'}                | 无    | Nacos请求响应内部错误异常（读写失败，没权限，参数错误） |

#### 指标集合：client

|                  指标名称                  | 指标单位 |          指标帮助描述          |
|----------------------------------------|------|--------------------------|
| nacos_monitor{name='subServiceCount'}  | 无    | 订阅的服务数                   |
| nacos_monitor{name='pubServiceCount'}  | 无    | 发布的服务数                   |
| nacos_monitor{name='configListenSize'} | 无    | 监听的配置数                   |
| nacos_client_request_seconds_count     | 无    | 请求的次数，包括多种(url,方法,code)  |
| nacos_client_request_seconds_sum       | 秒    | 请求的总耗时，包括多种(url,方法,code) |
