---
id: modbus
title: Monitoring Modbus
sidebar_label: Modbus Monitor
keywords: [ open source monitoring tool,  Modbus监控 ]
---

> Modbus 服务的响应等相关指标进行监测。

### 配置参数

| 参数名称          | 参数帮助描述                                                    |
|---------------|-----------------------------------------------------------|
| Modbus服务的Host | 被监控的Modbus的IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称          | 标识此监控的名称，名称需要保证唯一性。                                       |
| 端口            | Modbus网络的端口。                                              |
| slaveId       | Modbus网络中从机设备ID。                                          |
| 保持寄存器地址       | 用于对监控资源进行分类管理。                                            |
| 线圈寄存器地址       | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                              |
| 超时            | 允许收集响应时间                                                  |

### 采集指标

#### 指标集合：holding-register

1. 参数数量需要与参数中线圈寄存器地址的总数量一样
2. 参数别名格式: holding-register:m 或 holding-register:m-n

参数示例:

线圈寄存器地址：

```text
1,2[3]
```

参数别名名称：

```yaml
aliasFields:
  - responseTime
  - holding-register:0
  - holding-register:1-0
  - holding-register:1-1
  - holding-register:1-2
```

| 指标名称    | 指标单位 | 指标帮助描述              |
|---------|------|---------------------|
| 响应时间    | 毫秒   | Modbus服务器响应请求所需的时间。 |
| 保持寄存器参数 |      | 模拟量输出设定值            |

#### 指标集合：coil

1. 参数数量需要与参数中线圈寄存器地址的总数量一样
2. 参数别名格式: coil:m 或 coil:m-n

参数示例:

线圈寄存器地址：

```text
1,2[3]
```

参数别名名称：

```yaml
aliasFields:
  - responseTime
  - coil:0
  - coil:1-0
  - coil:1-1
  - coil:1-2
```

| 指标名称 | 指标单位 | 指标帮助描述              |
|------|------|---------------------|
| 响应时间 | 毫秒   | Modbus服务器响应请求所需的时间。 |
| 线圈状态 |      | 线圈状态 （0或1）          |
