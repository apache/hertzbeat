---
id: influxdb  
title: 监控：InfluxDB 数据库监控      
sidebar_label: InfluxDB数据库   
keywords: [开源监控系统, 开源数据库监控, InfluxDB 数据库监控]
---


### 配置参数

| 参数名称      | 参数帮助描述                                               |
| ----------- |------------------------------------------------------|
| 监控Host     | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称     | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口        | 数据库对外提供的端口，默认为8086。                                  |
| URL        | 数据库连接URL,一般是由host拼接，不需要添加                            |
| 采集间隔    | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测    | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注    | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：Boltdb

| 指标名称      | 指标单位 | 指标帮助描述 |
| ----------- | ----------- |--------|
| Boltdb的读取操作总数         | 无 | 无      |
| Boltdb的写入操作总数            | 无 | 无      |

#### 指标集合：Memory_byte_information

| 指标名称      | 指标单位 | 指标帮助描述 |
| ----------- | ----------- | ----------- |
| go_memstats_alloc_bytes         | 无 | 分配并仍在使用的字节数 |
| go_memstats_alloc_bytes_total            | 无 | 分配的总字节数 |
| go_memstats_alloc_bytes         | 无 | 分配并仍在使用的字节数 |
| go_memstats_frees_total | 无 | 释放的总次数 |
| go_memstats_gc_sys_bytes | 无 | 用于垃圾回收系统元数据的字节数 |

#### 指标集合：Heap_byte_information

| 指标名称      | 指标单位 | 指标帮助描述 |
| ----------- |------| ----------- |
| go_memstats_heap_alloc_bytes         | 无    | 分配并仍在使用的堆字节数 |
| go_memstats_heap_idle_bytes            | 无    | 等待使用的堆字节数 |
| go_memstats_heap_inuse_bytes         | 无    | 正在使用的堆字节数 |
| go_memstats_heap_objects | 无    | 分配的对象数量 |   
| go_memstats_heap_released_bytes | 无    | 释放给操作系统的堆字节数 |   
| go_memstats_heap_sys_bytes | 无    | 从系统获取的堆字节数 |   


#### 指标集合：Task_information

| 指标名称      | 指标单位 | 指标帮助描述 |
| ----------- |------| ----------- |
| task_executor_promise_queue_usage         | 无    | 当前 Promise 队列使用的百分比 |
| task_executor_total_runs_active            | 无    | 当前运行任务工作线程总数 |
| task_scheduler_current_execution         | 无    | 正在执行任务数量 |
| task_scheduler_total_execute_failure | 无    | 执行失败任务总数 |   
| task_scheduler_total_release_calls | 无    | 释放请求总数 |



