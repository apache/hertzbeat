---
id: jetty  
title: 监控：Jetty应用服务器      
sidebar_label: Jetty应用服务器
keywords: [开源监控系统, 开源中间件监控, Jetty应用服务器监控]
---

> 对Jetty应用服务器的通用性能指标进行采集监控

**使用协议：JMX**

### 监控前操作

> 您需要在 JVM 应用开启 `JMX` 服务，HertzBeat 使用 JMX 协议对 JVM 进行指标采集。

#### Jetty应用服务器开启JMX协议步骤

[参考官方文档](https://www.eclipse.org/jetty/documentation/jetty-10/operations-guide/index.html#og-jmx-remote)

1. 在 Jetty 启动 JMX JMX-REMOTE 模块

    ```shell
    java -jar $JETTY_HOME/start.jar --add-module=jmx  
    java -jar $JETTY_HOME/start.jar --add-module=jmx-remote
    ```

    命令执行成功会创建出 `${JETTY_BASE}/start.d/jmx-remote.ini` 配置文件

2. 编辑 `${JETTY_BASE}/start.d/jmx-remote.ini` 配置文件，修改 JMX 的 IP 端口等参数。

    **`localhost` 需修改为对外暴露 IP**

    ```text
    ## The host/address to bind the RMI server to.
    # jetty.jmxremote.rmiserverhost=localhost
    
    ## The port the RMI server listens to (0 means a random port is chosen).
    # jetty.jmxremote.rmiserverport=1099
    
    ## The host/address to bind the RMI registry to.
    # jetty.jmxremote.rmiregistryhost=localhost
    
    ## The port the RMI registry listens to.
    # jetty.jmxremote.rmiregistryport=1099
    
    ## The host name exported in the RMI stub.
    -Djava.rmi.server.hostname=localhost
    ```

3. 重启 Jetty Server 即可。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 查询超时时间 | 设置JVM连接的超时时间，单位ms毫秒，默认3000毫秒。                        |
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
