---
id: nvidia  
title: 监控：NVIDIA 监控      
sidebar_label: NVIDIA 监控      
keywords: [开源监控系统, NVIDIA监控]
---

> 对 NVIDIA 操作系统的通用性能指标进行采集监控。
> NVIDIA 监控需要用到 nvidia-smi 命令，nvidia-smi 是与 NVIDIA GPU 驱动程序一起安装的。所以在监控 NVIDIA 时，我们需要安装 NVIDIA GPU 驱动程序。

### 配置参数

|  参数名称  | 参数帮助描述                                                  |
|--------|---------------------------------------------------------|
| 监控Host | 被监控的对端 IPV4，IPV6 或 域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                     |
| 端口     | Linux SSH 对外提供的端口，默认为22。                                |
| 用户名    | SSH 连接用户名，可选                                            |
| 密码     | SSH 连接密码，可选                                             |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                          |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                        |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                             |

### 采集指标

#### 指标集合：basic

| 指标名称               | 指标单位 | 指标帮助描述 |
|--------------------|------|--------|
| index              | 无    | 显卡索引   |
| name     | 无    | 显卡名称 |
| utilization.gpu[%]    | 无    | GPU利用率 |
| utilization.memory[%] | 无    | 显存利用率 |
| memory.total[MiB]       | 无    | 总显存 |
| memory.used[MiB]        | 无    | 已用显存 |
| memory.free[MiB]        | 无    | 空闲显存 |
| temperature.gpu    | 无    | 显卡温度 |
