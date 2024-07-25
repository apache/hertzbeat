---
id: websocket
title: 监控：Websocket
sidebar_label: Websocket
keywords: [ 开源监控系统,  Websocket监控 ]
---

> WebSocket 服务的首次握手的响应等相关指标进行监测。

### 配置参数

| 参数名称             | 参数帮助描述                                                       |
|------------------|--------------------------------------------------------------|
| WebSocket服务的Host | 被监控的Websocket的IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称             | 标识此监控的名称，名称需要保证唯一性。                                          |
| 端口               | Websocket服务的端口。                                              |
| WebSocket服务的路径   | Websocket端点的路径。                                              |
| 采集间隔             | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒。                              |
| 绑定标签             | 用于对监控资源进行分类管理。                                               |
| 描述备注             | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                                 |

### 采集指标

#### 指标集合：概要

| 指标名称          | 指标单位 | 指标帮助描述  |
|---------------|------|---------|
| responseTime  | ms   | 响应时间    |
| httpVersion   | 无    | HTTP 版本 |
| responseCode  | 无    | 响应状态码   |
| statusMessage | 无    | 状态消息    |
| connection    | 无    | 表示连接方式  |
| upgrade       | 无    | 升级后的协议  |
