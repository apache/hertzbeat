---
id: shenyu  
title: 监控 Apache ShenYu API网关      
sidebar_label: ShenYu网关监控    
keywords: [开源监控系统, 开源消息中间件监控, ShenYu网关监控监控]
---

> 对 ShenYu 网关的运行状态（JVM相关），请求响应等相关指标进行监测。

## 监控前操作

您需要在 ShenYu 网关开启`metrics`插件，暴露对应的 prometheus metrics 接口。

开启插件, 参考 [官方文档](https://shenyu.apache.org/zh/docs/plugin-center/observability/metrics-plugin)

主要如下两步骤:

1. 在网关的 pom.xml 文件中添加 metrics 的依赖。

    ```xml
    <dependency>
        <groupId>org.apache.shenyu</groupId>
        <artifactId>shenyu-spring-boot-starter-plugin-metrics</artifactId>
        <version>${project.version}</version>
    </dependency>
    ```

2. 在网关的配置yaml文件中编辑如下内容：

    ```yaml
    shenyu:
      metrics:
        enabled: true  #设置为 true 表示开启
        name : prometheus 
        host: 127.0.0.1 #暴露的ip
        port: 8090 #暴露的端口
        jmxConfig: #jmx配置
        props:
          jvm_enabled: true #开启jvm的监控指标
    ```

最后重启访问网关指标接口 `http://ip:8090` 响应 prometheus 格式数据即可。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | 网关指标接口对外提供的端口，默认为8090。                               |
| 超时时间   | HTTP请求响应超时时间                                         |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：shenyu_request_total

| 指标名称  | 指标单位 |      指标帮助描述       |
|-------|------|-------------------|
| value | 无    | 收集ShenYu网关的所有请求数量 |

#### 指标集合：shenyu_request_throw_created

| 指标名称  | 指标单位 |      指标帮助描述       |
|-------|------|-------------------|
| value | 无    | 收集ShenYu网关的异常请求数量 |

#### 指标集合：process_cpu_seconds_total

| 指标名称  | 指标单位 |     指标帮助描述      |
|-------|------|-----------------|
| value | 无    | 用户和系统CPU总计所用的秒数 |

#### 指标集合：process_open_fds

| 指标名称  | 指标单位 |   指标帮助描述    |
|-------|------|-------------|
| value | 无    | 打开的文件描述符的数量 |

#### 指标集合：process_max_fds

| 指标名称  | 指标单位 |    指标帮助描述     |
|-------|------|---------------|
| value | 无    | 打开的文件描述符的最大数量 |

#### 指标集合：jvm_info

|  指标名称   | 指标单位 |  指标帮助描述  |
|---------|------|----------|
| runtime | 无    | JVM 版本信息 |
| vendor  | 无    | JVM 版本信息 |
| version | 无    | JVM 版本信息 |

#### 指标集合：jvm_memory_bytes_used

| 指标名称  | 指标单位 |      指标帮助描述      |
|-------|------|------------------|
| area  | 无    | JVM 内存区域         |
| value | MB   | 给定 JVM 内存区域的已用大小 |

#### 指标集合：jvm_memory_pool_bytes_used

| 指标名称  | 指标单位 |     指标帮助描述      |
|-------|------|-----------------|
| pool  | 无    | JVM 内存池         |
| value | MB   | 给定 JVM 内存池的已用大小 |

#### 指标集合：jvm_memory_pool_bytes_committed

| 指标名称  | 指标单位 |      指标帮助描述      |
|-------|------|------------------|
| pool  | 无    | JVM 内存池          |
| value | MB   | 给定 JVM 内存池的已提交大小 |

#### 指标集合：jvm_memory_pool_bytes_max

| 指标名称  | 指标单位 |     指标帮助描述      |
|-------|------|-----------------|
| pool  | 无    | JVM 内存池         |
| value | MB   | 给定 JVM 内存池的最大大小 |

#### 指标集合：jvm_threads_state

| 指标名称  | 指标单位 |   指标帮助描述    |
|-------|------|-------------|
| state | 无    | 线程状态        |
| value | 无    | 对应线程状态的线程数量 |
