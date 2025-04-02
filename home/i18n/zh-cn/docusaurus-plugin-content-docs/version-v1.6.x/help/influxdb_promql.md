---
id: influxdb_promql
title: 监控：InfluxDB-PromQL
sidebar_label: InfluxDB-PromQL
keywords: [ 开源监控系统, InfluxDB监控,InfluxDB-PromQL监控 ]
---

> 使用 Prometheus PromQL 从 Prometheus 服务器中查询到 InfluxDB 的通用指标数据来进行监控。此方案适用于 Prometheus 已监控 InfluxDB，需要从 Prometheus 服务器抓取 InfluxDB 的监控数据。

### 配置参数

|     参数名称     |                        参数帮助描述                        |
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

#### 指标集合：basic_influxdb_memstats_alloc

|   指标名称    | 指标单位 | 指标帮助描述  |
|-----------|------|---------|
| instance  | 无    | 指标所属实例  |
| timestamp | 无    | 采集指标时间戳 |
| value     | 无    | 指标值     |

#### 指标集合： influxdb_database_numMeasurements

|   指标名称    | 指标单位 | 指标帮助描述  |
|-----------|------|---------|
| job       | 无    | 指标名称    |
| instance  | 无    | 指标所属实例  |
| database  | 无    | 数据库名称   |
| timestamp | 无    | 采集指标时间戳 |
| value     | 无    | 指标值     |

#### 指标集合： influxdb_query_rate_seconds

|   指标名称    | 指标单位 | 指标帮助描述  |
|-----------|------|---------|
| instance  | 无    | 指标所属实例  |
| timestamp | 无    | 采集指标时间戳 |
| value     | 无    | 指标值     |

#### 指标集合： influxdb_queryExecutor_queriesFinished_10s

|   指标名称    | 指标单位 | 指标帮助描述  |
|-----------|------|---------|
| instance  | 无    | 指标所属实例  |
| timestamp | 无    | 采集指标时间戳 |
| value     | 无    | 指标值     |
