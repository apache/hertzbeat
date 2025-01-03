---
id: doris_be
title: Monitoring DORIS Database BE Monitoring
sidebar_label: DORIS Database BE
keywords: [Open Source Monitoring System, Open Source Database Monitoring, DORIS Database BE Monitoring]
---

> Collect and monitor general performance metrics for DORIS database BE. Supports DORIS 2.0.0.

### Pre-monitoring operations

|  Parameter Name  |                        Parameter Description                       |
|--------|-----------------------------------------------------|
| Monitor Host | The monitored target's IPV4, IPV6, or domain name. Note: Without the protocol header (e.g., https://, http://) |
| Task Name           | A unique name identifying this monitoring task                                  |
| Port                | The port provided by the database to the outside, default is 8040 ,get the value of the`http_port` configuration item                               |
| Query Timeout       | The timeout for the connection to not respond, in milliseconds, default is 3000 milliseconds                            |
| Database Name       | Optional database instance name                                        |
| Collection Interval | The interval between periodic data collections for monitoring, in seconds, with a minimum interval of 30 seconds                               |
| Probe Required      | Whether to probe and check the availability of monitoring before adding new monitoring, continue with the addition or modification operation only if the probe is successful      |
| Description         | Additional notes and descriptions for this monitoring task                      |

### Collection Indicators

#### Metric Set:doris_be_load_channel_count

| Metric Name      | Metric Unit |        Metric help description          |
|-------|------|-----------------------|
| value | None     | The current number of load channels |

#### Metric Set:doris_be_memtable_flush_total

| Metric Name  | Metric Unit |       Metric help description       |
|-------|------|--------------------|
| value | None    | Cumulative number of memtable writes to disk |

#### Metric Set:doris_be_plan_fragment_count

| Metric Name  | Metric Unit |            Metric help description            |
|-------|------|------------------------------|
| value | None    | Number of fragment instances currently received |

#### Metric Set:doris_be_process_thread_num

| Metric Name  | Metric Unit |             Metric help description              |
|-------|------|---------------------------------|
| value | None    | Number of BE process threads, collected through /proc/pid/task |

#### Metric Set:doris_be_query_scan_rows

| Metric Name  | Metric Unit |                                    Metric help description                                    |
|-------|------|------------------------------------------------------------------------------|
| value | None    | Cumulative number of rows read. This only counts the data volume read from OLAP tables, and it represents RawRowsRead (some data rows may be skipped by the index and not actually read, but they are still recorded in this value). |

#### Metric Set:doris_be_result_buffer_block_count

| Metric Name  | Metric Unit |       Metric help description        |
|-------|------|---------------------|
| value | None    | Number of queries in the current query result cache |

#### Metric Set:doris_be_send_batch_thread_pool_queue_size

| Metric Name  | Metric Unit |       Metric help description        |
|-------|------|---------------------|
| value | None    | Number of tasks in the queue of the thread pool used for sending data packets during import |

#### Metric Set:doris_be_tablet_base_max_compaction_score

| Metric Name  | Metric Unit |           Metric help description            |
|-------|------|-----------------------------|
| value | None    | Current maximum Base Compaction Score |

#### Metric Set:doris_be_timeout_canceled_fragment_count

| Metric Name  | Metric Unit |              Metric help description              |
|-------|------|----------------------------------|
| value | None    | Cumulative number of fragment instances cancelled due to timeout |

#### Metric Set:doris_be_load_rows

| Metric Name  | Metric Unit |         Metric help description         |
|-------|------|------------------------|
| value | None    | Cumulative number of rows sent through tablet sink |

#### Metric Set:doris_be_all_rowsets_num

| Metric Name  | Metric Unit |     Metric help description      |
|-------|------|-----------------|
| value | None    | Current number of rowsets |

#### Metric Set:doris_be_all_segments_num

| Metric Name  | Metric Unit |      Metric help description      |
|-------|------|------------------|
| value | None    | Current number of segments |

#### Metric Set:doris_be_heavy_work_max_threads

| Metric Name  | Metric Unit |      Metric help description       |
|-------|------|-------------------|
| value | None    | Number of threads in the brpc heavy thread pool |

#### Metric Set:doris_be_light_work_max_threads

| Metric Name  | Metric Unit |      Metric help description       |
|-------|------|-------------------|
| value | None    | Number of threads in the brpc light thread pool|

#### Metric Set:doris_be_heavy_work_pool_queue_size

| Metric Name  | Metric Unit |             Metric help description              |
|-------|------|---------------------------------|
| value | None    | Maximum queue length of the brpc heavy thread pool; if exceeded, work submissions will be blocked |

#### Metric Set:doris_be_light_work_pool_queue_size

| Metric Name  | Metric Unit |             Metric help description              |
|-------|------|---------------------------------|
| value | None    | Maximum queue length of the brpc light thread pool; if exceeded, work submissions will be blocked |

#### Metric Set:doris_be_heavy_work_active_threads

| Metric Name  | Metric Unit |       Metric help description       |
|-------|------|--------------------|
| value | None    | Number of active threads in the brpc heavy thread pool |

#### Metric Set:doris_be_light_work_active_threads

| Metric Name  | Metric Unit |       Metric help description       |
|-------|------|--------------------|
| value | None    | Number of active threads in the brpc light thread pool |

#### Metric Set:doris_be_compaction_bytes_total

|    Metric Name    | Metric Unit |            Metric help description            |
|------------|------|------------------------------|
| base       | Bytes   | Cumulative data volume of Base Compaction       |
| cumulative | Bytes   | Cumulative data volume of Cumulative Compaction |

#### Metric Set:doris_be_disks_avail_capacity

| Metric Name  | Metric Unit |                   Metric help description                   |
|-------|------|--------------------------------------------|
| path  | None    | Specify data directory                                    |
| value | Bytes   | {path="/path1/"} represents the remaining disk space of the /path1 directory's disk. |

#### Metric Set:doris_be_disks_total_capacity

| Metric Name  | Metric Unit |                   Metric help description                   |
|-------|------|--------------------------------------------|
| path  | None    | Specify data directory                                    |
| value | Bytes   | {path="/path1/"} represents the total disk space of the disk where the /path1 directory is located. |

#### Metric Set:doris_be_local_bytes_read_total

| Metric Name  | Metric Unit |           Metric help description           |
|-------|------|----------------------------|
| value | Bytes   | Number of bytes read by LocalFileReader |

#### Metric Set:doris_be_local_bytes_written_total

| Metric Name  | Metric Unit |           Metric help description           |
|-------|------|----------------------------|
| value | Bytes   | Number of bytes written by LocalFileWriter |

#### Metric Set:doris_be_memory_allocated_bytes

| Metric Name  | Metric Unit |                  Metric help description                  |
|-------|------|------------------------------------------|
| value | Bytes   | Physical memory size of the BE process, retrieved from /proc/self/status/VmRSS |
