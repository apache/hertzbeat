---
id: superset  
title: 监控：Apache Superset监控      
sidebar_label: Apache Superset  
keywords: [开源监控系统, 开源可观测性, Apache Superset监控]
---

> 对Apache Superset通用性能指标（health、version）进行采集监控。

## 配置参数

|  参数名称  |                       参数帮助描述                        |
|--------|-----------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://) |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性                                  |
| 端口     | Superset对外提供的端口，默认为8088                             |
| 查询超时时间 | 设置连接未响应的超时时间，单位ms毫秒，默认3000毫秒                        |
| HTTPS  | 是否启用HTTPS                                           |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                      |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                    |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                         |

### 采集指标

#### 指标集合：health

|     指标名称     | 指标单位 |    指标帮助描述    |
|--------------|------|--------------|
| responseTime | ms   | /health 响应时间 |
| statusCode   | 无    | HTTP 响应状态码   |

#### 指标集合：version

|      指标名称      | 指标单位 |  指标帮助描述   |
|----------------|------|-----------|
| version_string | 无    | Superset版本 |
| version_sha    | 无    | 构建 git SHA |
| build_number   | 无    | 构建号       |
