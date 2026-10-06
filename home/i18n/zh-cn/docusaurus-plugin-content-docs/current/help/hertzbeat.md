---
id: hertzbeat
title: 监控：HertzBeat
sidebar_label: HertzBeat
keywords: [开源监控系统, HertzBeat监控, HertzBeat自监控]
---

> 通过 HertzBeat 的 HTTP API 和 Actuator 指标接口，监控 HertzBeat 服务的状态、内部队列、JVM 线程和 JVM 内存。

## 监控前提

- 为监控任务分配的采集器必须能够访问目标 HertzBeat 服务。
- 准备一个能够访问 HertzBeat 概要、内部指标及 Actuator 指标接口的账号。
- 如果目标服务启用了 HTTPS，请在监控配置中开启 HTTPS，并填写对应的 HTTPS 端口。

该监控通过 `/api/summary`、`/api/metrics` 以及 `/actuator/metrics` 下的 JVM 指标接口采集数据。

## 配置参数

| 参数名称 | 参数帮助描述 |
|----------|--------------|
| 目标Host | HertzBeat 服务的 IPv4、IPv6 地址或域名。请勿包含 `http://` 或 `https://`。 |
| 任务名称 | 标识此监控的唯一名称。 |
| 端口 | HertzBeat 服务端口，默认端口为 `1157`。 |
| 启用HTTPS | 是否通过 HTTPS 访问目标服务。 |
| 超时时间 | 等待 HTTP 响应的最长时间，单位为毫秒，默认值为 `6000`。 |
| 认证方式 | HTTP 认证方式，模板支持 Basic Auth 和 Digest Auth。 |
| 用户名 | 访问受保护的 HertzBeat API 和 Actuator 指标接口所使用的用户名。 |
| 密码 | 访问受保护的 HertzBeat API 和 Actuator 指标接口所使用的密码。 |
| 采集器 | 调度此监控任务进行数据采集的采集器。 |
| 采集间隔 | 周期性采集数据的时间间隔，单位为秒，最小间隔为 30 秒。 |
| 绑定标签 | 用于分类和管理监控资源的标签。 |
| 描述备注 | 此监控的补充说明。 |

## 采集指标

### 指标集合：概要信息

展示目标 HertzBeat 服务所管理的各类监控概况。

| 指标名称 | 指标单位 | 指标帮助描述 |
|----------|----------|--------------|
| app | 无 | 监控应用类型。 |
| category | 无 | 监控类别。 |
| status | 无 | 监控应用类型的状态。 |
| Size | 无 | 此类型的监控总数。 |
| availableSize | 无 | 此类型中可用的监控数量。 |

### 指标集合：内部队列

展示 HertzBeat 内部数据队列当前的长度。

| 指标名称 | 指标单位 | 指标帮助描述 |
|----------|----------|--------------|
| responseTime | ms | 内部指标接口的响应时间。 |
| alertDataQueue | 无 | 告警数据队列中的数据数量。 |
| metricsDataToAlertQueue | 无 | 等待告警模块处理的指标数量。 |
| metricsDataToPersistentStorageQueue | 无 | 等待写入持久化存储的指标数量。 |
| metricsDataToMemoryStorageQueue | 无 | 等待写入内存存储的指标数量。 |

### 指标集合：线程

展示各 JVM 线程状态对应的线程数量。

| 指标名称 | 指标单位 | 指标帮助描述 |
|----------|----------|--------------|
| state | 无 | JVM 线程状态。 |
| number | 无 | 处于此状态的线程数量。 |

### 指标集合：内存使用

按 JVM 内存空间展示已使用的内存大小。

| 指标名称 | 指标单位 | 指标帮助描述 |
|----------|----------|--------------|
| space | 无 | JVM 内存空间名称。 |
| mem_used | MB | 此内存空间已使用的内存大小。 |

## 常见问题

- 如果采集返回 `401` 或 `403`，请检查认证方式、用户名、密码及账号权限。
- 如果无法采集 JVM 线程或内存指标，请确认目标服务已暴露所需的 Actuator 指标接口。
- 使用远程采集器时，除非 HertzBeat 与该采集器运行在同一主机，否则不要使用 `localhost` 作为目标 Host。
