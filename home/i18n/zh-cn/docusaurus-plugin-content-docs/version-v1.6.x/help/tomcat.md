---
id: tomcat  
title: 监控：Tomcat监控      
sidebar_label: Tomcat监控
keywords: [开源监控系统, 开源网站监控, Tomcat监控]
---

> 对Tomcat的通用性能指标进行采集监控

**使用协议：JMX**

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 查询超时时间 | 设置Tomcat连接的超时时间，单位ms毫秒，默认3000毫秒。                     |
| 用户名    | JMX连接用户名                                             |
| 密码     | JMX连接密码                                              |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：memory_pool

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|--------|
| name      | 无    | 指标名称   |
| committed | kb   | 总量     |
| init      | kb   | 初始化大小  |
| max       | kb   | 最大     |
| used      | kb   | 已使用    |

#### 指标集合：code_cache

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|--------|
| committed | kb   | 总量     |
| init      | kb   | 初始化大小  |
| max       | kb   | 最大     |
| used      | kb   | 已使用    |

#### 指标集合：class_loading

|         指标名称          | 指标单位 |  指标帮助描述  |
|-----------------------|------|----------|
| LoadedClassCount      | 个    | 已加载类数量   |
| TotalLoadedClassCount | 个    | 历史已加载类总量 |
| UnloadedClassCount    | 个    | 未加载类数量   |

#### 指标集合：thread

|          指标名称           | 指标单位 |  指标帮助描述   |
|-------------------------|------|-----------|
| TotalStartedThreadCount | 个    | 已经开始的线程数量 |
| ThreadCount             | 个    | 线程数       |
| PeakThreadCount         | 个    | 未加载类数量    |
| DaemonThreadCount       | 个    | 守护进程数     |
| CurrentThreadUserTime   | ms   | 使用时间      |
| CurrentThreadCpuTime    | ms   | 使用CPU时间   |

### Tomcat开启JMX协议步骤

1. 搭建好tomcat后，进入tomcat下的bin目录，修改catalina.sh文件  注意⚠️替换IP地址

2. vim catalina.sh

```aidl
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote -Djava.rmi.server.hostname=10.1.1.52 -Dcom.sun.management.jmxremote.port=1099 -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.authenticate=false"
```

参考: <https://blog.csdn.net/weixin_41924764/article/details/108694239>
