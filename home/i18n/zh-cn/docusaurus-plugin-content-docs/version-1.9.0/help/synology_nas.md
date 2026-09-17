---
id: synology_nas
title: 监控：群晖 NAS
sidebar_label: 群晖 NAS
keywords: [ 开源监控系统, 服务器监控, 群晖 NAS 监控 ]
---

> 对 群晖 NAS 的通用指标进行采集监控。

**使用协议：SNMP**

## 监控前操作

请参考 [SNMP](https://kb.synology.cn/zh-cn/DSM/help/DSM/AdminCenter/system_snmp) 设置 SNMP 服务。目前支持的协议为 SNMPv1、SNMPv2c 以及 SNMPv3。

## 配置参数

|        参数名称         |                                                            参数帮助描述                                                             |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------|
| 目标Host              | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。                                                                          |
| 任务名称                | 标识此监控的名称，名称需要保证唯一性。                                                                                                           |
| 端口                  | SNMP端口号，默认为161                                                                                                                |
| SNMP 版本             | 所使用的SNMP版本                                                                                                                    |
| SNMP 团体字            | 用于SNMP v1 和 SNMP v2c，用于在SNMP Agent完成认证，字符串形式。团体名包括“read”和“write”两种，执行SNMP查询操作时，采用“read”团体名进行认证；执行SNMP设置操作时，则采用“write”团体名进行认证。 |
| SNMP username       | 用于SNMP v3，MSG 用户名                                                                                                             |
| SNMP contextName    | 用于SNMP v3，用于确定Context EngineID对被管理设备的MIB视图。                                                                                   |
| SNMP authPassword   | 用于SNMP v3，SNMP 认证密码                                                                                                           |
| authPassword 加密方式   | 用于SNMP v3，SNMP 认证算法                                                                                                           |
| SNMP privPassphrase | 用于SNMP v3，SNMP 加密密码                                                                                                           |
| privPassword 加密方式   | 用于SNMP v3，SNMP 加密算法                                                                                                           |
| 查询超时时间              | 设置查询未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。                                                                                              |
| 采集间隔                | 监控周期性采集数据的时间间隔，单位为秒，最小间隔为 30 秒。                                                                                               |
| 描述备注                | 用于添加关于监控的额外标识和描述信息。                                                                                                           |

## 采集指标

由于可查询的指标过多，详细的指标可在官网的 [SNMP MIB指南](https://kb.synology.cn/zh-cn/DG/Synology_DiskStation_MIB_Guide) 进行查询。

此文档仅介绍监控模板中查询的监控指标。

### 指标集合：系统

| 指标名称             | 指标单位 | 指标帮助描述    |
|------------------|------|-----------|
| modelName        | 无    | NAS 的型号名称 |
| serialNumber     | 无    | 型号序列号     |
| version          | 无    | DSM 的版本   |
| controllerNumber | 无    | 控制器编号     |

### 指标集合：状态

| 指标名称            | 指标单位 | 指标帮助描述                      |
|-----------------|------|-----------------------------|
| powerStatus     | 无    | 电源状态，如果电源出现故障则返回错误          |
| systemFanStatus | 无    | 系统风扇状态，如果系统风扇发生故障则返回错误      |
| cpuFanStatus    | 无    | CPU 风扇状态，如果 CPU 风扇发生故障则返回错误 |
| systemStatus    | 无    | 系统分区状态                      |
| thermalStatus   | 无    | 散热状态，如果散热状态异常               |
| temperature     | 无    | NAS 的温度                     |
| cpuUtilization  | 百分比  | 利用率 (%) 是用户和系统 CPU 使用率的总和   |
| memUtilization  | 百分比  | 利用率 (%) 是内存使用率的总和           |

### 指标集合：硬盘

| 指标名称             | 指标单位 | 指标帮助描述               |
|------------------|------|----------------------|
| diskID           | 无    | DSM 中的硬盘名称           |
| diskModel        | 无    | 硬盘型号                 |
| diskType         | 无    | 硬盘类型如 SATA、SSD       |
| diskStatus       | 无    | 当前硬盘状态               |
| diskTemperature  | 无    | 硬盘温度                 |
| diskRole         | 无    | 硬盘在系统中的作用            |
| diskRetry        | 无    | 每个硬盘连接重试次数           |
| diskBadSector    | 无    | 每个硬盘 I/O 坏扇区的计数      |
| diskIdentifyFail | 无    | 每个硬盘名称的计数失败          |
| diskRemainLife   | 无    | 每个硬盘的预计剩余寿命          |
| diskName         | 无    | 不同 DSM 版本中保留相同值的硬盘名称 |
| diskHealthStatus | 无    | 当前硬盘运行状况             |

### 指标集合：RAID状态

| 指标名称            | 指标单位 | 指标帮助描述                             |
|-----------------|------|------------------------------------|
| raidName        | 无    | RAID 的名称                           |
| raidStatus      | 无    | RAID 状态                            |
| raidFreeSize    | 无    | 卷/硬盘组的可用容量                         |
| raidTotalSize   | 无    | 卷/硬盘组的总大小                          |
| raidHotspareCnt | 无    | 可保护 RAID 的 hotspare 硬盘总数，小于 0 表示错误 |

### 指标集合：S.M.A.R.T

| 指标名称                   | 指标单位 | 指标帮助描述        |
|------------------------|------|---------------|
| diskSMARTInfoDevName   | 无    | SMART 信息所属的硬盘 |
| diskSMARTAttrName      | 无    | SMART 信息属性的名称 |
| diskSMARTAttrId        | 无    | SMART 属性 ID 号 |
| diskSMARTAttrCurrent   | 无    | SMART 属性当前值   |
| diskSMARTAttrWorst     | 无    | SMART 属性最差值   |
| diskSMARTAttrThreshold | 无    | SMART 属性阈值    |
| diskSMARTAttrRaw       | 无    | SMART 属性原始值   |
| diskSMARTAttrStatus    | 无    | SMART 信息的状态   |

### 指标集合：存储空间 I/O

| 指标名称          | 指标单位 | 指标帮助描述               |
|---------------|------|----------------------|
| spaceIODevice | 无    | 装载此存储空间的设备名称         |
| spaceIOReads  | 无    | 自启动以来从此存储空间进行的读取访问次数 |
| spaceIOWrites | 无    | 自启动以来对此存储空间的写入访问次数   |
| spaceIOLA     | 百分比  | 卷中硬盘的负载率             |
| spaceIOLA1    | 百分比  | 卷中硬盘的1分钟平均负载率        |
| spaceIOLA5    | 百分比  | 卷中硬盘的5分钟平均负载率        |
| spaceIOLA15   | 百分比  | 卷中硬盘的15分钟平均负载率       |
| spaceUUID     | 无    | 卷的 UUID              |

### 指标集合：硬盘 I/O

| 指标名称                  | 指标单位 | 指标帮助描述             |
|-----------------------|------|--------------------|
| storageIODevice       | 无    | 设备的名称              |
| storageIOReads        | 无    | 自启动以来从此设备进行的读取访问次数 |
| storageIOWrites       | 无    | 自启动以来对此设备进行的写入访问次数 |
| storageIOLA           | 百分比  | 硬盘负载率              |
| storageIOLA1          | 百分比  | 硬盘的1分钟平均负载率        |
| storageIOLA5          | 百分比  | 硬盘的5分钟平均负载率        |
| storageIOLA15         | 百分比  | 硬盘的15分钟平均负载率       |
| storageIODeviceSerial | 无    | 序列号                |
