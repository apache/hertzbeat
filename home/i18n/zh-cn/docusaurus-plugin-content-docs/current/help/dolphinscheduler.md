---
id: dolphinscheduler
title: 监控：Apache DolphinScheduler
sidebar_label: Apache DolphinScheduler
keywords: [ 开源监控系统, 监控 Apache DolphinScheduler ]
---

> 对 Apache DolphinScheduler 指标进行采集监控。

## 监控前操作

您需在 Apache DolphinScheduler 中创建令牌。

可参考 [API 调用](https://dolphinscheduler.apache.org/zh-cn/docs/3.2.2/guide/api/open-api) 创建一个新令牌，具体步骤如下：

1. 登录 Apache DolphinScheduler 系统，点击 "安全中心"，再点击左侧的 "令牌管理"，点击 "令牌管理" 创建令牌。
2. 选择 "失效时间" (Token 有效期)，选择 "用户" (以指定的用户执行接口操作)，点击 "生成令牌" ，拷贝令牌字符串，然后点击 "提交" 。

## 配置参数

| 参数名称      | 参数帮助描述                                               |
|-----------|------------------------------------------------------|
| 目标Host    | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称      | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口        | DolphinScheduler开放的监控端口，默认值：12345。                   |
| 启用HTTPS   | 是否启用HTTPS。                                           |
| 令牌        | DolphinScheduler 的令牌字符串。                             |
| 查询超时时间    | 设置查询未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。                     |
| 采集间隔      | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签      | 用于对监控资源进行分类管理。                                       |
| 描述备注      | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                         |

## 采集指标

### 指标集合：Master

| 指标名称          | 指标单位   | 指标帮助描述 |
|---------------|--------|--------|
| host          | 无      | 主机地址   |
| port          | 无      | 端口     |
| serverStatus  | 无      | 状态     |
| processId     | 无      | 进程 ID  |
| runningTime   | 天      | 运行时间   |
| cpuUsage      | 百分比(%) | CPU使用率 |
| memoryUsage   | 百分比(%) | 内存使用率  |
| diskAvailable | GB     | 磁盘可用容量 |

### 指标集合：Worker

| 指标名称                   | 指标单位   | 指标帮助描述 |
|------------------------|--------|--------|
| host                   | 无      | 主机地址   |
| port                   | 无      | 端口     |
| serverStatus           | 无      | 状态     |
| processId              | 无      | 进程 ID  |
| runningTime            | 天      | 运行时间   |
| cpuUsage               | 百分比(%) | CPU使用率 |
| memoryUsage            | 百分比(%) | 内存使用率  |
| diskAvailable          | GB     | 磁盘可用容量 |
| workerHostWeight       | 无      | 权重     |
| workerWaitingTaskCount | 无      | 等待任务数  |
| workerExecThreadCount  | 无      | 执行线程数  |


### 指标：数据库

| 指标名称                      | 指标单位   | 指标帮助描述    |
|---------------------------|--------|-----------|
| dbType                    | 无      | 数据库类型     |
| state                     | 无      | 状态        |
| maxConnections            | 无      | 最大连接数     |
| threadsConnections        | 无      | 当前连接数     |
| threadsRunningConnections | 天      | 当前活跃连接数   |
