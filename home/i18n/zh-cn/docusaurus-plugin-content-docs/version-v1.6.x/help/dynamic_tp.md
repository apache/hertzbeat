---
id: dynamic_tp
title: 监控：DynamicTp 线程池监控      
sidebar_label: DynamicTp线程池监控
keywords: [开源监控系统, 开源中间件监控, DynamicTp线程池监控]
---

> 对DynamicTp actuator 暴露的线程池性能指标进行采集监控。

### 前提

1. 集成使用 `DynamicTp`

    `DynamicTp` 是Jvm语言的基于配置中心的轻量级动态线程池，内置监控告警功能，可通过SPI自定义扩展实现。

    集成使用，请参考文档 [快速接入](https://dynamictp.cn/guide/use/quick-start.html)

2. 开启SpringBoot Actuator Endpoint 暴露出`DynamicTp`指标接口

    ```yaml
    management:
      endpoints:
        web:
          exposure:
            include: '*'
    ```

    测试访问指标接口 `ip:port/actuator/dynamic-tp` 是否有响应json数据如下:

    ```json
    [
      {
        "poolName": "commonExecutor",
        "corePoolSize": 1,
        "maximumPoolSize": 1,
        "queueType": "LinkedBlockingQueue",
        "queueCapacity": 2147483647,
        "queueSize": 0,
        "fair": false,
        "queueRemainingCapacity": 2147483647,
        "activeCount": 0,
        "taskCount": 0,
        "completedTaskCount": 0,
        "largestPoolSize": 0,
        "poolSize": 0,
        "waitTaskCount": 0,
        "rejectCount": 0,
        "rejectHandlerName": null,
        "dynamic": false,
        "runTimeoutCount": 0,
        "queueTimeoutCount": 0
      },
      {
        "maxMemory": "4 GB",
        "totalMemory": "444 MB",
        "freeMemory": "250.34 MB",
        "usableMemory": "3.81 GB"
      }
    ]
    ```

3. 在HertzBeat中间件监控下添加DynamicTp监控即可

### 配置参数

|   参数名称    |                        参数帮助描述                        |
|-----------|------------------------------------------------------|
| 监控Host    | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称      | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口        | 应用服务对外提供的端口，默认为8080。                                 |
| 启用HTTPS   | 是否通过HTTPS访问网站，注意⚠️开启HTTPS一般默认对应端口需要改为443             |
| Base Path | 暴露接口路径前缀，默认 /actuator                                |
| 采集间隔      | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测      | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注      | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：thread_pool

|           指标名称           | 指标单位 |          指标帮助描述          |
|--------------------------|------|--------------------------|
| pool_name                | 无    | 线程池名称                    |
| core_pool_size           | 无    | 核心线程数                    |
| maximum_pool_size        | 无    | 最大线程数                    |
| queue_type               | 无    | 任务队列类型                   |
| queue_capacity           | MB   | 任务队列容量                   |
| queue_size               | 无    | 任务队列当前占用大小               |
| fair                     | 无    | 队列模式，SynchronousQueue会用到 |
| queue_remaining_capacity | MB   | 任务队列剩余大小                 |
| active_count             | 无    | 活跃线程数                    |
| task_count               | 无    | 任务总数                     |
| completed_task_count     | 无    | 已完成任务数                   |
| largest_pool_size        | 无    | 历史最大线程数                  |
| pool_size                | 无    | 当前线程数                    |
| wait_task_count          | 无    | 等待执行任务数                  |
| reject_count             | 无    | 拒绝任务数                    |
| reject_handler_name      | 无    | 拒绝策略类型                   |
| dynamic                  | 无    | 是否动态线程池                  |
| run_timeout_count        | 无    | 运行超时任务数                  |
| queue_timeout_count      | 无    | 等待超时任务数                  |
