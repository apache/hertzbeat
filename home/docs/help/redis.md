---
id: redis  
title: Monitorin REDIS database 
sidebar_label: REDIS   
keywords: [ open source monitoring tool, open source Redis monitoring tool, monitoring Redis metrics ]
---

> Collect and monitor the general performance Metrics of Redis database. Support REDIS1.0+.

### Configuration parameter

|  Parameter name  |                        Parameter help description                        |
|--------|------------------------------------------------------|
| Target Host | The IP, IPV6, or domain name of the monitored endpoint. Note ⚠️: Do not include protocol headers (eg: https://, http://). |
| Port     | The HTTP port provided by Redis, default value is 6379, sentinel node`s default value is 26379               |
| Timeout   | Set the timeout time when SQL query does not respond to data, unit: ms, default: 3000ms          |
| Username    | Database connection user name, optional                                          |
| Password     | Database connection password, optional                                          |

### Collection Metric

#### Metric set：server

|           Metric name           | Metric unit | Metric help description                       |
|--------------------------|------|-----------------------------------------------|
| redis_version            | none    | Version of the Redis server                     |
| redis_git_sha1           | none    | Git SHA1                                |
| redis_git_dirty          | none    | Git dirty flag                                |
| redis_build_id           | none    | The build id                               |
| redis_mode               | none    | The server's mode ("standalone", "sentinel" or "cluster")      |
| os                       | none    | Operating system hosting the Redis server                          |
| arch_bits                | none    | Architecture (32 or 64 bits)                                |
| multiplexing_api         | none    | Event loop mechanism used by Redis                               |
| atomicvar_api            | none    | Atomicvar API used by Redis                       |
| gcc_version              | none    | Version of the GCC compiler used to compile the Redis server                       |
| process_id               | none    | PID of the server process                        |
| process_supervised       | none    | Supervised system ("upstart", "systemd", "unknown" or "no")          |
| run_id                   | none    | Random value identifying the Redis server (to be used by Sentinel and Cluster)          |
| tcp_port                 | none    | TCP/IP listen port                    |
| server_time_usec         | none    | Epoch-based system time with microsecond precision                              |
| uptime_in_seconds        | none    | Number of seconds since Redis server start                             |
| uptime_in_days           | none    | Same value expressed in days                            |
| hz                       | none    | The server's current frequency setting |
| configured_hz            | none    | The server's configured frequency setting                                   |
| lru_clock                | none    | Clock incrementing every minute, for LRU management                             |
| executable               | none    | The path to the server's executable                                 |
| config_file              | none    | The path to the config file                                       |
| io_threads_active        | none    | Flag indicating if I/O threads are active                           |
| shutdown_in_milliseconds | none    | The maximum time remaining for replicas to catch up the replication before completing the shutdown sequence. This field is only present during shutdown.         |

#### Metric set：clients

|              Metric name               | Metric unit |                                     Metric help description                                     |
|---------------------------------|------|--------------------------------------------------------------------------------|
| connected_clients               | none    | Number of client connections (excluding connections from replicas)                                                           |
| cluster_connections             | none    | An approximation of the number of sockets used by the cluster's bus                                                         |
| maxclients                      | none    | The value of the maxclients configuration directive. This is the upper limit for the sum of connected_clients, connected_slaves and cluster_connections. |
| client_recent_max_input_buffer  | byte | Biggest input buffer among current client connections                                                               |
| client_recent_max_output_buffer | byte |  Biggest output buffer among current client connections                                           |
| blocked_clients                 | none    | Number of clients pending on a blocking call (BLPOP, BRPOP, BRPOPLPUSH, BLMOVE, BZPOPMIN, BZPOPMAX)                   |
| tracking_clients                | none    | Number of clients being tracked (CLIENT TRACKING)                                             |
| clients_in_timeout_table        | none    | Number of clients in the clients timeout table                                                         |

#### Metric set：memory

|           Metric name            |   Metric unit   |                                            Metric help description                                             |
|---------------------------|----------|-----------------------------------------------------------------------------------------------|
| used_memory               | byte     | Total number of bytes allocated by Redis using its allocator (either standard libc, jemalloc, or an alternative allocator such as tcmalloc)                                  |
| used_memory_human         | GB/MB/KB | Human readable representation of previous value                                                                                   |
| used_memory_rss           | byte     | Number of bytes that Redis allocated as seen by the operating system (a.k.a resident set size). This is the number reported by tools such as top(1) and ps(1)                                  |
| used_memory_rss_human     | GB/MB/KB | Human readable representation of previous value值                                                                                    |
| used_memory_peak          | byte     | Peak memory consumed by Redis (in bytes)                               |
| used_memory_peak_human    | GB/MB/KB | Human readable representation of previous value                                      |
| used_memory_peak_perc     | none        | The percentage of used_memory_peak out of used_memory                                                              |
| used_memory_overhead      | byte     | The sum in bytes of all overheads that the server allocated for managing its internal data structures                                                                   |
| used_memory_startup       | byte     | Initial amount of memory consumed by Redis at startup in bytes                                                                         |
| used_memory_dataset       | byte     | The size in bytes of the dataset (used_memory_overhead subtracted from used_memory)                                                 |
| used_memory_dataset_perc  | none        | The percentage of used_memory_dataset out of the net memory usage (used_memory minus used_memory_startup)                 |
| allocator_allocated       | byte     | Total bytes allocated form the allocator, including internal-fragmentation. Normally the same as used_memory.                                                               |
| allocator_active          | byte     | Total bytes in the allocator active pages, this includes external-fragmentation.                                                                           |
| allocator_resident        | byte     | Total bytes resident (RSS) in the allocator, this includes pages that can be released to the OS (by MEMORY PURGE, or just waiting).                                            |
| total_system_memory       | byte     | The total amount of memory that the Redis host has                                                                                 |
| total_system_memory_human | GB/MB/KB | Human readable representation of previous value                                                                                    |
| used_memory_lua           | byte     | Number of bytes used by the Lua engine for EVAL scripts. Deprecated in Redis 7.0, renamed to used_memory_vm_eval                                                           |
| used_memory_lua_human     | KB       | Human readable representation of previous value. Deprecated in Redis 7.0                                                                                    |
| used_memory_scripts       | byte     | used_memory_scripts_eval + used_memory_functions (part of used_memory). Added in Redis 7.0                                                                               |
| used_memory_scripts_human | GB/MB/KB | Human readable representation of previous value                                                                                |
| number_of_cached_scripts  | none        | The number of EVAL scripts cached by the server. Added in Redis 7.0                                                                                 |
| maxmemory                 | byte     | The value of the maxmemory configuration directive                                                                         |
| maxmemory_human           | GB/MB/KB | Human readable representation of previous value                                                                                  |
| maxmemory_policy          | none        | The value of the maxmemory-policy configuration directive                                                                        |
| allocator_frag_ratio      | none        | Ratio between allocator_active and allocator_allocated. This is the true (external) fragmentation metric (not mem_fragmentation_ratio).            |
| allocator_frag_bytes      | byte     | Delta between allocator_active and allocator_allocated. See note about mem_fragmentation_bytes.                                                 |
| allocator_rss_ratio       |          | Ratio between allocator_resident and allocator_active.                                                                           |
| allocator_rss_bytes       | byte     | Delta between allocator_resident and allocator_active                                           |
| rss_overhead_ratio        | none        | Ratio between used_memory_rss (the process RSS) and allocator_resident. This includes RSS overheads that are not allocator or heap related.                                 |
| rss_overhead_bytes        | byte     | Delta between used_memory_rss (the process RSS) and allocator_resident                                                     |
| mem_fragmentation_ratio   | none        | Ratio between used_memory_rss and used_memory. Note that this doesn't only includes fragmentation, but also other process overheads (see the allocator_* metrics), and also overheads like code, shared libraries, stack, etc. |
| mem_fragmentation_bytes   | byte     | Delta between used_memory_rss and used_memory. Note that when the total fragmentation bytes is low (few megabytes), a high ratio (e.g. 1.5 and above) is not an indication of an issue.                     |
| mem_not_counted_for_evict | byte     | Used memory that's not counted for key eviction. This is basically transient replica and AOF buffers.                                                           |
| mem_replication_backlog   | byte     | Memory used by replication backlog                                                                      |
| mem_clients_slaves        | none        | Memory used by replica clients - Starting Redis 7.0, replica buffers share memory with the replication backlog, so this field can show 0 when replicas don't trigger an increase of memory usage.                            |
| mem_clients_normal        | none        | Memory used by normal clients                                                                              |
| mem_aof_buffer            | none        | Transient memory used for AOF and AOF rewrite buffers                                                                         |
| mem_allocator             | none        | Memory allocator, chosen at compile time.                                                                     |
| active_defrag_running     | none        | When activedefrag is enabled, this indicates whether defragmentation is currently active, and the CPU percentage it intends to utilize.                                             |
| lazyfree_pending_objects  | none        | The number of objects waiting to be freed (as a result of calling UNLINK, or FLUSHDB and FLUSHALL with the ASYNC option)                                                  |
| lazyfreed_objects         | none        | The number of objects that have been lazy freed.                                                                                   |

#### Metric set：persistence

|             Metric name             |  Metric unit  |                                               Metric help description                                                |
|------------------------------|--------|-----------------------------------------------------------------------------------------------------|
| loading                      | none      | Flag indicating if the load of a dump file is on-going                                                                        |
| current_cow_size             | byte   | The size in bytes of copy-on-write memory while a child fork is running                                                                          |
| current_cow_size_age         | second |  The age, in seconds, of the current_cow_size value.                                                                         |
| current_fork_perc            | none      | The percentage of progress of the current fork process. For AOF and RDB forks it is the percentage of current_save_keys_processed out of               |
| current_save_keys_processed  | none      | Number of keys processed by the current save operation                                                                                  |
| current_save_keys_total      | none      | Number of keys at the beginning of the current save operation                                                                                |
| rdb_changes_since_last_save  | none      | Number of changes since the last dump                                                               |
| rdb_bgsave_in_progress       | none      | Flag indicating a RDB save is on-going                                                                          |
| rdb_last_save_time           | second | Epoch-based timestamp of last successful RDB save                                                                                 |
| rdb_last_bgsave_status       | none      | Status of the last RDB save operation                                                                                |
| rdb_last_bgsave_time_sec     | second | Duration of the last RDB save operation in seconds                                                                                   |
| rdb_current_bgsave_time_sec  | none      | Duration of the on-going RDB save operation if any                                                          |
| rdb_last_cow_size            | none      | The size in bytes of copy-on-write memory during the last RDB save operation                                                          |
| aof_enabled                  | none      | Flag indicating AOF logging is activated                                                                              |
| aof_rewrite_in_progress      | none      | Flag indicating a AOF rewrite operation is on-going                                                                |
| aof_rewrite_scheduled        | none      | Flag indicating an AOF rewrite operation will be scheduled once the on-going RDB save is complete. |
| aof_last_rewrite_time_sec    | none      | Duration of the last AOF rewrite operation in seconds                                                                             |
| aof_current_rewrite_time_sec | second | Duration of the on-going AOF rewrite operation if any                                                                     |
| aof_last_bgrewrite_status    | none      | Status of the last AOF rewrite operation                                                                       |
| aof_last_write_status        | none      | Status of the last write operation to the AOF                                                                                       |
| aof_last_cow_size            | none      | The size in bytes of copy-on-write memory during the last AOF rewrite operation                                                          |
| module_fork_in_progress      | none      | Flag indicating a module fork is on-going                                                                                     |
| module_fork_last_cow_size    | none      |  The size in bytes of copy-on-write memory during the last module fork operation                                                                             |

#### Metric set：stats

|              Metric name              | Metric unit |                       Metric help description                       |
|--------------------------------|------|----------------------------------------------------|
| total_connections_received     | none    | Total number of connections accepted by the server                                        |
| total_commands_processed       | none    | Total number of commands processed by the server                                        |
| instantaneous_ops_per_sec      | none    | Number of commands processed per second                                           |
| total_net_input_bytes          | byte | The total number of bytes read from the network                                 |
| total_net_output_bytes         | byte | The total number of bytes written to the network                                         |
| instantaneous_input_kbps       | KB/S | The network's read rate per second in KB/sec                                  |
| instantaneous_output_kbps      | KB/S | The network's write rate per second in KB/sec                                   |
| rejected_connections           | none    | Number of connections rejected because of maxclients limit                              |
| sync_full                      | none    | The number of full resyncs with replicas                                  |
| sync_partial_ok                | none    | The number of accepted partial resync requests                                     |
| sync_partial_err               | none    | The number of denied partial resync requests                                      |
| expired_keys                   | none    | Total number of key expiration events                                           |
| expired_stale_perc             | none    | The percentage of keys probably expired                                       |
| expired_time_cap_reached_count | none    | The count of times that active expiry cycles have stopped early                                     |
| expire_cycle_cpu_milliseconds  | none    | The cumulative amount of time spent on active expiry cycles                                     |
| evicted_keys                   | none    | Number of evicted keys due to maxmemory limit                                  |
| keyspace_hits                  | none    | Number of successful lookup of keys in the main dictionary                               |
| keyspace_misses                | none    | Number of failed lookup of keys in the main dictionary                                |
| pubsub_channels                | none    | Global number of pub/sub channels with client subscriptions                                |
| pubsub_patterns                | none    | Global number of pub/sub pattern with client subscriptions                             |
| latest_fork_usec               | none    | Duration of the latest fork operation in microseconds                            |
| total_forks                    | none    | Total number of fork operations since the server start                               |
| migrate_cached_sockets         | none    | The number of sockets open for MIGRATE purposes                              |
| slave_expires_tracked_keys     | none    | The number of keys tracked for expiry purposes (applicable only to writable replicas)                          |
| active_defrag_hits             | none    | Number of value reallocations performed by active the defragmentation process                                         |
| active_defrag_misses           | none    | Number of aborted value reallocations started by the active defragmentation process                                       |
| active_defrag_key_hits         | none    | Number of keys that were actively defragmented                                     |
| active_defrag_key_misses       | none    | Number of keys that were skipped by the active defragmentation process                                     |
| tracking_total_keys            | none    | Number of keys being tracked by the server                                          |
| tracking_total_items           | none    | Number of items, that is the sum of clients number for each key, that are being tracked                                          |
| tracking_total_prefixes        | none    | Number of tracked prefixes in server's prefix table (only applicable for broadcast mode)                                           |
| unexpected_error_replies       | none    | Number of unexpected error replies, that are types of errors from an AOF load or replication                            |
| total_error_replies            | none    | Total number of issued error replies, that is the sum of rejected commands (errors prior command execution) and failed commands (errors within the command execution) |
| dump_payload_sanitizations     | none    | Total number of dump payload deep integrity validations (see sanitize-dump-payload config).                          |
| total_reads_processed          | none    | Total number of read events processed                                           |
| total_writes_processed         | none    | Total number of write events processed                                           |
| io_threaded_reads_processed    | none    | Number of read events processed by the main and I/O threads                                           |
| io_threaded_writes_processed   | none    | Number of write events processed by the main and I/O threads                                           |

#### Metric set：replication

|              Metric name              | Metric unit |                                       Metric help description                                        |
|--------------------------------|------|-------------------------------------------------------------------------------------|
| role                           | none    | Value is "master" if the instance is replica of no one, or "slave" if the instance is a replica of some master instance. Note that a replica can be master of another replica (chained replication).                                                           |
| connected_slaves               | none    | Number of connected replicas                                                                          |
| master_failover_state          | none    | The state of an ongoing failover, if any.                                                                   |
| master_replid                  | none    | The replication ID of the Redis server.                                                                     |
| master_replid2                 | none    | The secondary replication ID, used for PSYNC after a failover.                                                                 |
| master_repl_offset             | none    | The server's current replication offset                                                                             |
| second_repl_offset             | none    | The offset up to which replication IDs are accepted                                                                       |
| repl_backlog_active            | none    | Flag indicating replication backlog is active                                                                       |
| repl_backlog_size              | byte | Total size in bytes of the replication backlog buffer                                                                   |
| repl_backlog_first_byte_offset | none    | The master offset of the replication backlog buffer                                                                       |
| repl_backlog_histlen           | none    | Size in bytes of the data in the replication backlog buffer |

#### Metric set：cpu

|           Metric name            | Metric unit |         Metric help description         |
|---------------------------|------|------------------------|
| used_cpu_sys              | none    | System CPU consumed by the Redis server, which is the sum of system CPU consumed by all threads of the server process (main thread and background threads) |
| used_cpu_user             | none    | User CPU consumed by the Redis server, which is the sum of user CPU consumed by all threads of the server process (main thread and background threads) |
| used_cpu_sys_children     | none    | System CPU consumed by the background processes |
| used_cpu_user_children    | none    | User CPU consumed by the background processes |
| used_cpu_sys_main_thread  | none    | System CPU consumed by the Redis server main thread    |
| used_cpu_user_main_thread | none    | User CPU consumed by the Redis server main thread    |

#### Metric set：errorstats

|       Metric name        | Metric unit |  Metric help description   |
|-------------------|------|-----------|
| errorstat_ERR     | none    | ERR count |
| errorstat_MISCONF | none    | MISCONF count          |

#### Metric set：cluster

|      Metric name       | Metric unit |       Metric help description       |
|-----------------|------|--------------------|
| cluster_enabled | none    | Indicate Redis cluster is enabled |

#### Metric set：commandstats

|     Metric name      | Metric unit |                                                          Metric help description                                                           |
|---------------|------|---------------------------------------------------------------------------------------------------------------------------|
| cmdstat_set   | none    | set command stat |
| cmdstat_get   | none    | get command stat                                                                                                                |
| cmdstat_setnx | none    | setnx command stat                                                                                                              |
| cmdstat_hset  | none    | hset command stat                                                                                                               |
| cmdstat_hget  | none    | hget command stat                                                                                                               |
| cmdstat_lpush | none    | lpush command stat                                                                                                              |
| cmdstat_rpush | none    | rpush command stat                                                                                                              |
| cmdstat_lpop  | none    | lpop command stat                                                                                                               |
| cmdstat_rpop  | none    | rpop command stat                                                                                                               |
| cmdstat_llen  | none    | llen command stat                                                                                                               |
