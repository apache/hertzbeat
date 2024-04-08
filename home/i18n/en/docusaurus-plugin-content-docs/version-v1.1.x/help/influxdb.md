---
id: influxdb  
title: Monitoring: InfluxDB Database Monitoring      
sidebar_label: InfluxDB Database   
keywords: [open source monitoring system, open source database monitoring, InfluxDB database monitoring]
---

### Configuration Parameters

| Parameter Name | Parameter Description                                     |
| -------------- |-----------------------------------------------------------|
| Monitor Host   | The IPv4, IPv6, or domain name of the target being monitored. Note ⚠️: Do not include the protocol prefix (e.g., https://, http://). |
| Task Name      | A unique identifier for this monitor.                      |
| Port           | The port through which the database is accessed. Default is 8086. |
| URL            | The database connection URL, typically constructed using the host. No need to add it explicitly. |
| Collection Interval | The interval at which data is collected during monitoring, in seconds. The minimum interval is 30 seconds. |
| Probe          | Whether to perform a probe check for monitoring availability before adding the monitor. The monitor will be added or modified only if the probe check is successful. |
| Description    | Additional notes and descriptions for this monitor. Users can provide remarks here. |

### Collected Metrics

#### Metric Set: Boltdb

| Metric Name | Metric Unit | Metric Description |
| ----------- | ----------- | ----------------- |
| Total Read Operations of Boltdb | N/A | N/A |
| Total Write Operations of Boltdb | N/A | N/A |

#### Metric Set: Memory_byte_information

| Metric Name | Metric Unit | Metric Description |
| ----------- | ----------- | ----------------- |
| go_memstats_alloc_bytes | N/A | Bytes allocated and still in use |
| go_memstats_alloc_bytes_total | N/A | Total bytes allocated |
| go_memstats_alloc_bytes | N/A | Bytes allocated and still in use |
| go_memstats_frees_total | N/A | Total number of frees |
| go_memstats_gc_sys_bytes | N/A | Bytes of memory used for garbage collection system metadata |

#### Metric Set: Heap_byte_information

| Metric Name | Metric Unit | Metric Description |
| ----------- | ------ | ----------- |
| go_memstats_heap_alloc_bytes | N/A | Bytes allocated and still in use in the heap |
| go_memstats_heap_idle_bytes | N/A | Bytes in the heap that are waiting to be used |
| go_memstats_heap_inuse_bytes | N/A | Bytes in the heap that are actively used |
| go_memstats_heap_objects | N/A | Number of allocated objects in the heap |
| go_memstats_heap_released_bytes | N/A | Bytes of heap released to the operating system |
| go_memstats_heap_sys_bytes | N/A | Bytes of heap obtained from the system |

#### Metric Set: Task_information

| Metric Name | Metric Unit | Metric Description |
| ----------- | ------ | ----------- |
| task_executor_promise_queue_usage | N/A | Current percentage of promise queue usage |
| task_executor_total_runs_active | N/A | Total number of worker threads currently running tasks |
| task_scheduler_current_execution | N/A | Number of tasks currently being executed |
| task_scheduler_total_execute_failure | N/A | Total number of failed task executions |
| task_scheduler_total_release_calls | N/A | Total number of release requests |

The above metrics provide insights into the performance and status of the InfluxDB database, enabling effective monitoring and optimization of the system.