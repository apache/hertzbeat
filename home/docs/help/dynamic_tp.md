---
id: dynamic_tp
title: Monitoring DynamicTp ThreadPool      
sidebar_label: DynamicTp Monitor
keywords: [open source monitoring tool, open source dynamicTp monitoring tool, monitoring DynamicTp metrics]
---

> Collect and monitor the thread pool performance Metrics exposed by DynamicTp actuator.

### PreRequisites

1. Integration Using `DynamicTp`

    `DynamicTp` is a lightweight dynamic thread pool based on the configuration center of the Jvm language. It has built-in monitoring and alarm functions, which can be realized through SPI custom extensions.

    For integrated use, please refer to the document [Quick Start](https://dynamictp.cn/guide/use/quick-start.html)

2. Open SpringBoot Actuator Endpoint to expose `DynamicTp` Metric interface

    ```yaml
    management:
       endpoints:
         web:
           exposure:
             include: '*'
    ```

    Test whether the access Metric interface `ip:port/actuator/dynamic-tp` has response json data as follows:

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
         "maxMemory": "4GB",
         "totalMemory": "444MB",
         "freeMemory": "250.34 MB",
         "usableMemory": "3.81GB"
       }
    ]
    ```

3. Add DynamicTp monitoring under HertzBeat middleware monitoring

### Configuration parameters

| Parameter name | Parameter help description |
| ------------ |------------------------------------ ------------------|
| Monitoring Host | The peer IPV4, IPV6 or domain name to be monitored. Note ⚠️Without protocol header (eg: https://, http://). |
| Monitoring name | The name that identifies this monitoring, and the name needs to be unique. |
| Port | The port provided by the application service, the default is 8080. |
| Enable HTTPS | Whether to access the website through HTTPS, note ⚠️Enable HTTPS, the default corresponding port needs to be changed to 443 |
| Base Path | Exposed interface path prefix, default /actuator |
| Acquisition Interval | Interval time for monitoring periodic data collection, in seconds, the minimum interval that can be set is 30 seconds |
| Whether to detect | Whether to detect and check the availability of monitoring before adding monitoring, and the operation of adding and modifying will continue after the detection is successful |
| Description Remarks | More remark information to identify and describe this monitoring, users can remark information here |

### Collect metrics

#### Metric collection: thread_pool

|       Metric Name        | Metric Unit |           Metric Help Description           |
|--------------------------|-------------|---------------------------------------------|
| pool_name                | None        | Thread pool name                            |
| core_pool_size           | None        | Number of core threads                      |
| maximum_pool_size        | None        | Maximum number of threads                   |
| queue_type               | None        | Task queue type                             |
| queue_capacity           | MB          | task queue capacity                         |
| queue_size               | None        | The current occupied size of the task queue |
| fair                     | None        | Queue mode, SynchronousQueue will be used   |
| queue_remaining_capacity | MB          | task queue remaining size                   |
| active_count             | None        | Number of active threads                    |
| task_count               | None        | Total number of tasks                       |
| completed_task_count     | None        | Number of completed tasks                   |
| largest_pool_size        | None        | The largest number of threads in history    |
| pool_size                | none        | current number of threads                   |
| wait_task_count          | None        | Number of tasks waiting to be executed      |
| reject_count             | None        | Number of rejected tasks                    |
| reject_handler_name      | None        | Reject policy type                          |
| dynamic                  | None        | Dynamic thread pool or not                  |
| run_timeout_count        | None        | Number of running timeout tasks             |
| queue_timeout_count      | None        | Number of tasks waiting for timeout         |
