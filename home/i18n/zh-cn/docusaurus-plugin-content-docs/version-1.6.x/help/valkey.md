---
id: valkey  
title: 监控：Valkey 数据库监控      
sidebar_label: Valkey 数据库   
keywords: [开源监控系统, 开源数据库监控, Valkey 数据库监控]
---

> 对 Valkey 数据库的通用性能指标进行采集监控。支持 Valkey 7.0+。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | Valkey 对外提供的端口，默认为6379,sentinel节点默认26379               |
| 超时时间   | 设置 Valkey info 查询未响应数据时的超时时间，单位ms毫秒，默认3000毫秒。          |
| 数据库名称  | 数据库实例名称，可选。                                          |
| 用户名    | 数据库连接用户名，可选                                          |
| 密码     | 数据库连接密码，可选                                           |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：server

|           指标名称           | 指标单位 |                    指标帮助描述                     |
|--------------------------|------|-----------------------------------------------|
| valkey_version            | 无    | Valkey 服务器版本                                   |
| valkey_git_sha1           | 无    | Git SHA1                                      |
| valkey_git_dirty          | 无    | Git dirty flag                                |
| valkey_build_id           | 无    | Valkey 构建的id                                   |
| valkey_mode               | 无    | Valkey 模式（包括standalone, sentinel, cluster）      |
| os                       | 无    | Valkey 服务器的宿主操作系统                              |
| arch_bits                | 无    | 架构（32 或 64 位）                                 |
| multiplexing_api         | 无    | Valkey 使用的事件循环机制                                |
| atomicvar_api            | 无    | Valkey 使用的原子 API                                |
| gcc_version              | 无    | 用于编译 Valkey 服务器的GCC编译器版本                         |
| process_id               | 无    | 服务器进程的PID                                     |
| process_supervised       | 无    | 受监管系统（包括：upstart、systemd、unknown、no）          |
| run_id                   | 无    | 标识 Valkey 服务器的随机值（由Sentinel和Cluster使用）           |
| tcp_port                 | 无    | TCP/IP侦听端口                                    |
| server_time_usec         | 无    | 微秒级精度的基于时间的系统时间                               |
| uptime_in_seconds        | 无    | 自 Valkey 服务器启动后的秒数                               |
| uptime_in_days           | 无    | 自 Valkey 服务器启动后的天数                               |
| hz                       | 无    | 服务器的当前频率设置，valkey 相关定时任务的执行频率（如清除过期key，关闭超时客户端） |
| configured_hz            | 无    | 服务器配置的频率设置                                    |
| lru_clock                | 无    | 时钟每分钟递增，用于LRU管理                               |
| executable               | 无    | 服务器可执行文件的路径                                   |
| config_file              | 无    | 配置文件的路径                                       |
| io_threads_active        | 无    | 指示I/O线程是否处于活动状态的标志                            |
| shutdown_in_milliseconds | 无    | 复制副本在完成关闭序列之前赶上复制的最长剩余时间。此字段仅在停机期间出现。         |

#### 指标集合：clients

|              指标名称               | 指标单位 |                                     指标帮助描述                                     |
|---------------------------------|------|--------------------------------------------------------------------------------|
| connected_clients               | 无    | 客户端连接数（不包括来自副本的连接）                                                             |
| cluster_connections             | 无    | 群集总线使用的套接字数量的近似值                                                               |
| maxclients                      | 无    | maxclients配置指令的值。这是connected_clients、connected_slave和cluster_connections之和的上限。 |
| client_recent_max_input_buffer  | byte | 当前客户端连接中最大的输入缓冲区                                                               |
| client_recent_max_output_buffer | byte | 当前客户端连接中最大的输出缓冲区                                                               |
| blocked_clients                 | 无    | 阻塞呼叫挂起的客户端数（BLPOP、BRPOP、BRPOPLPUSH、BLMOVE、BZPOPMIN、BZPOPMAX）                   |
| tracking_clients                | 无    | 正在跟踪的客户端数（CLIENT TRACKING）                                                     |
| clients_in_timeout_table        | 无    | 客户端超时表中的客户端数                                                                   |

#### 指标集合：memory

|           指标名称            |   指标单位   |                                            指标帮助描述                                             |
|---------------------------|----------|-----------------------------------------------------------------------------------------------|
| used_memory               | byte     | valkey 使用其分配器（标准libc、jemalloc或tcmalloc等替代分配器）分配的总字节数                                            |
| used_memory_human         | GB/MB/KB | 上一个值的人类可读表示                                                                                   |
| used_memory_rss           | byte     | 操作系统看到的 valkey 分配的字节数（也称为驻留集大小）。这是top（1）和ps（1）等工具报告的数字                                           |
| used_memory_rss_human     | GB/MB/KB | 上一个值的人类可读值                                                                                    |
| used_memory_peak          | byte     | valkey 消耗的峰值内存（字节）                                                                              |
| used_memory_peak_human    | GB/MB/KB | 上一个值的人类可读值                                                                                    |
| used_memory_peak_perc     | 无        | used_memory_peak 与used_memory百分比                                                              |
| used_memory_overhead      | byte     | 服务器分配用于管理其内部数据结构的所有开销的字节总和                                                                    |
| used_memory_startup       | byte     | valkey 在启动时消耗的初始内存量（字节）                                                                         |
| used_memory_dataset       | byte     | 数据集的字节大小（used_memory - used_memory_overhead）                                                  |
| used_memory_dataset_perc  | 无        | 已用内存数据集占净内存使用量的百分比（used_memory_dataset / (used_memory - used_memory_startup)）                 |
| allocator_allocated       | byte     | 从分配器分配的总字节数，包括内部碎片。通常与使用的内存相同                                                                 |
| allocator_active          | byte     | 分配器活动页中的总字节数，包括外部碎片                                                                           |
| allocator_resident        | byte     | 分配器中驻留的总字节数（RSS），包括可释放到操作系统的页面（通过MEMORY PURGE或仅等待）                                            |
| total_system_memory       | byte     | valkey 主机的内存总量                                                                                  |
| total_system_memory_human | GB/MB/KB | 上一个值的人类可读值                                                                                    |
| used_memory_lua           | byte     | Lua引擎使用的字节数                                                                                   |
| used_memory_lua_human     | KB       | 上一个值的人类可读值                                                                                    |
| used_memory_scripts       | byte     | 缓存Lua脚本使用的字节数                                                                                 |
| used_memory_scripts_human | GB/MB/KB | 上一值的人类可读值                                                                                     |
| number_of_cached_scripts  | 无        | 缓存的lua脚本数量                                                                                    |
| maxmemory                 | byte     | maxmemory配置指令的值                                                                               |
| maxmemory_human           | GB/MB/KB | 上一个值的人类可读值                                                                                    |
| maxmemory_policy          | 无        | 当达到maxmemory时的淘汰策略                                                                            |
| allocator_frag_ratio      | 无        | allocator_active 和 allocator_allocated之间的比率这是真实（外部）碎片度量（不是mem_fragmentation_ratio）            |
| allocator_frag_bytes      | byte     | allocator_active 和 allocator_allocated 之间的差值。                                                 |
| allocator_rss_ratio       |          | 从操作系统角度看, 内存分配器碎片比例                                                                           |
| allocator_rss_bytes       | byte     | allocator_resident 和 allocator_active之间的差值                                                    |
| rss_overhead_ratio        | 无        | used_memory_rss和allocator_resident之间的比率，这包括与分配器或堆无关的RSS开销                                     |
| rss_overhead_bytes        | byte     | used_memory_rss和allocator_resident之间的增量                                                       |
| mem_fragmentation_ratio   | 无        | used_memory_rss和used_memory之间的比率，注意，这不仅包括碎片，还包括其他进程开销（请参阅allocator_* metrics），以及代码、共享库、堆栈等开销。 |
| mem_fragmentation_bytes   | byte     | used_memory_rss和used_memory之间的增量。注意，当总碎片字节较低（几兆字节）时，高比率（例如1.5及以上）不是问题的表现                      |
| mem_not_counted_for_evict | byte     | 不应驱逐的内存大小,以字节为单位。这基本上是瞬时复制和AOF缓冲区。                                                            |
| mem_replication_backlog   | byte     | 复制backlog的内存大小, 以字节为单位                                                                        |
| mem_clients_slaves        | 无        | 副本客户端使用的内存-从 valkey 7.0开始，副本缓冲区与复制积压工作共享内存，因此当副本不触发内存使用增加时，此字段可以显示0。                            |
| mem_clients_normal        | 无        | 普通客户端使用的内存                                                                                    |
| mem_aof_buffer            | 无        | 用于AOF和AOF重写缓冲区的临时大小                                                                           |
| mem_allocator             | 无        | 内存分配器，在编译时选择。                                                                                 |
| active_defrag_running     | 无        | 启用activedefrag时，这表示碎片整理当前是否处于活动状态，以及它打算使用的CPU百分比。                                             |
| lazyfree_pending_objects  | 无        | 等待释放的对象数（使用ASYNC选项调用UNLINK或FLUSHDB和FLUSHOLL）                                                  |
| lazyfreed_objects         | 无        | 已延迟释放的对象数。                                                                                    |

#### 指标集合：persistence

|             指标名称             |  指标单位  |                                               指标帮助描述                                                |
|------------------------------|--------|-----------------------------------------------------------------------------------------------------|
| loading                      | 无      | 服务器是否正在进行持久化 0 - 否 1 -是                                                                             |
| current_cow_size             | byte   | 运行子fork时写入时复制内存的大小（以字节为单位）                                                                          |
| current_cow_size_age         | second | current_cow_size值的年龄（以秒为单位）                                                                         |
| current_fork_perc            | 无      | 当前fork进程的百分比，对于AOF和RDB的fork，它是current_save_keys_processed占current_save_keys_total的百分比               |
| current_save_keys_processed  | 无      | 当前保存操作处理的key的数量                                                                                     |
| current_save_keys_total      | 无      | 当前保存操作开始时的key的数量                                                                                    |
| rdb_changes_since_last_save  | 无      | 离最近一次成功生成rdb文件，写入命令的个数，即有多少个写入命令没有持久化                                                               |
| rdb_bgsave_in_progress       | 无      | 服务器是否正在创建rdb文件 0 - 否 1 - 是                                                                          |
| rdb_last_save_time           | second | 最近一次创建rdb文件的时间戳,单位秒                                                                                 |
| rdb_last_bgsave_status       | 无      | 最近一次rdb持久化是否成功 ok 成功                                                                                |
| rdb_last_bgsave_time_sec     | second | 最近一次成功生成rdb文件耗时秒数                                                                                   |
| rdb_current_bgsave_time_sec  | 无      | 如果服务器正在创建rdb文件，那么这个字段记录的就是当前的创建操作已经耗费的秒数                                                            |
| rdb_last_cow_size            | 无      | RDB过程中父进程与子进程相比执行了多少修改(包括读缓冲区，写缓冲区，数据修改等)                                                           |
| aof_enabled                  | 无      | 是否开启了AOF 0 - 否 1 - 是                                                                                |
| aof_rewrite_in_progress      | 无      | 标识aof的rewrite操作是否在进行中 0 - 否 1- 是                                                                    |
| aof_rewrite_scheduled        | 无      | rewrite任务计划，当客户端发送bgrewriteaof指令，如果当前rewrite子进程正在执行，那么将客户端请求的bgrewriteaof变为计划任务，待aof子进程结束后执行rewrite |
| aof_last_rewrite_time_sec    | 无      | 最近一次aof rewrite耗费的时长                                                                                |
| aof_current_rewrite_time_sec | second | 如果rewrite操作正在进行，则记录所使用的时间，单位秒                                                                       |
| aof_last_bgrewrite_status    | 无      | 上次 bgrewrite aof 操作的状态 ok 成功                                                                        |
| aof_last_write_status        | 无      | 上次aof写入状态                                                                                           |
| aof_last_cow_size            | 无      | AOF过程中父进程与子进程相比执行了多少修改(包括读缓冲区，写缓冲区，数据修改等)                                                           |
| module_fork_in_progress      | 无      | 指示fork模块正在进行的标志                                                                                     |
| module_fork_last_cow_size    | 无      | 上一次fork操作期间写入时复制内存的字节大小                                                                             |

#### 指标集合：stats

|              指标名称              | 指标单位 |                       指标帮助描述                       |
|--------------------------------|------|----------------------------------------------------|
| total_connections_received     | 无    | 服务器接受的连接总数                                         |
| total_commands_processed       | 无    | 服务器处理的命令总数                                         |
| instantaneous_ops_per_sec      | 无    | 每秒处理的命令数                                           |
| total_net_input_bytes          | byte | 从网络读取的字节总数                                         |
| total_net_output_bytes         | byte | 写入网络的总字节数                                          |
| instantaneous_input_kbps       | KB/S | 网络每秒的读取速率（KB/秒）                                    |
| instantaneous_output_kbps      | KB/S | 网络每秒的写入速率（KB/秒）                                    |
| rejected_connections           | 无    | 由于maxclients限制而拒绝的连接数                              |
| sync_full                      | 无    | 具有副本的完整重新同步数                                       |
| sync_partial_ok                | 无    | 接受的部分重新同步请求数                                       |
| sync_partial_err               | 无    | 被拒绝的部分重新同步请求数                                      |
| expired_keys                   | 无    | 过期的key总数                                           |
| expired_stale_perc             | 无    | 可能过期key的百分比                                        |
| expired_time_cap_reached_count | 无    | 活动过期周期提前停止的次数                                      |
| expire_cycle_cpu_milliseconds  | 无    | 活动到期周期所花费的累计时间                                     |
| evicted_keys                   | 无    | 由于最大内存限制而收回key的数量                                  |
| keyspace_hits                  | 无    | 在主dict 中成功查找key的次数                                 |
| keyspace_misses                | 无    | 在主dict 中未查到key的次数                                  |
| pubsub_channels                | 无    | 客户端使用 pub/sub 频道的总和                                |
| pubsub_patterns                | 无    | 客户端使用 pub/sub 模式的全局数量                              |
| latest_fork_usec               | 无    | 最后一次fork操作的持续时间（以微秒为单位）                            |
| total_forks                    | 无    | 自服务器启动以来的fork操作总数                                  |
| migrate_cached_sockets         | 无    | 为MIGRATE目的打开的socket数量                              |
| slave_expires_tracked_keys     | 无    | trace key 到期的数量（仅适用于可写副本）                          |
| active_defrag_hits             | 无    | 主动碎片整理命中次数                                         |
| active_defrag_misses           | 无    | 主动碎片整理未命中次数                                        |
| active_defrag_key_hits         | 无    | 主动碎片整理key命中次数                                      |
| active_defrag_key_misses       | 无    | 主动碎片整理key未命中次数                                     |
| tracking_total_keys            | 无    | key 查询的总数                                          |
| tracking_total_items           | 无    | item查询的总数                                          |
| tracking_total_prefixes        | 无    | 前缀查询的总数                                            |
| unexpected_error_replies       | 无    | 意外错误回复数，即AOF加载或复制中的错误类型                            |
| total_error_replies            | 无    | 发出的错误回复总数，即被拒绝的命令（命令执行之前的错误）和失败的命令（在命令执行过程中的错误）的总和 |
| dump_payload_sanitizations     | 无    | 参考sanitize-dump-payload配置                          |
| total_reads_processed          | 无    | 正在读取的请求数                                           |
| total_writes_processed         | 无    | 正在写入的请求数                                           |
| io_threaded_reads_processed    | 无    | 正在读取的线程数                                           |
| io_threaded_writes_processed   | 无    | 正在写入的线程数                                           |

#### 指标集合：replication

|              指标名称              | 指标单位 |                                       指标帮助描述                                        |
|--------------------------------|------|-------------------------------------------------------------------------------------|
| role                           | 无    | 节点角色 master 主节点 slave 从节点                                                           |
| connected_slaves               | 无    | 连接的从节点数                                                                             |
| master_failover_state          | 无    | 正在进行的故障切换的状态（如果有）                                                                   |
| master_replid                  | 无    | 实例启动的随机字符串                                                                          |
| master_replid2                 | 无    | 故障切换后用于PSYNC的辅助复制ID                                                                 |
| master_repl_offset             | 无    | 主从同步偏移量                                                                             |
| second_repl_offset             | 无    | 接受从服务ID的最大偏移量                                                                       |
| repl_backlog_active            | 无    | 表示从服务挤压处于活动状态                                                                       |
| repl_backlog_size              | byte | 从服务积压缓冲区的总大小（字节）                                                                    |
| repl_backlog_first_byte_offset | 无    | 复制缓冲区里偏移量的大小                                                                        |
| repl_backlog_histlen           | 无    | 此值等于 master_repl_offset - repl_backlog_first_byte_offset,该值不会超过repl_backlog_size的大小 |

#### 指标集合：cpu

|           指标名称            | 指标单位 |         指标帮助描述         |
|---------------------------|------|------------------------|
| used_cpu_sys              | 无    | valkey主进程在内核态所占用CPU时钟总和 |
| used_cpu_user             | 无    | valkey主进程在用户态所占用CPU时钟总和 |
| used_cpu_sys_children     | 无    | valkey子进程在内核态所占用CPU时钟总和 |
| used_cpu_user_children    | 无    | valkey子进程在用户态所占用CPU时钟总和 |
| used_cpu_sys_main_thread  | 无    | valkey服务器主线程消耗的内核CPU    |
| used_cpu_user_main_thread | 无    | valkey服务器主线程消耗的用户CPU    |

#### 指标集合：errorstats

|       指标名称        | 指标单位 |  指标帮助描述   |
|-------------------|------|-----------|
| errorstat_ERR     | 无    | 错误累计出现的次数 |
| errorstat_MISCONF | 无    |           |

#### 指标集合：cluster

|      指标名称       | 指标单位 |       指标帮助描述       |
|-----------------|------|--------------------|
| cluster_enabled | 无    | 集群是否开启 0 - 否 1 - 是 |

#### 指标集合：commandstats

|     指标名称      | 指标单位 |                                                          指标帮助描述                                                           |
|---------------|------|---------------------------------------------------------------------------------------------------------------------------|
| cmdstat_set   | 无    | set命令的统计信息，calls: 累计调用该命令的次数；usec: 调用该命令的累计耗时,单位微秒；usec_per_call: 调用该命令的平均耗时；rejected_call: 拒绝执行的次数；failed_calls: 调用失败的次数 |
| cmdstat_get   | 无    | get命令的统计信息                                                                                                                |
| cmdstat_setnx | 无    | setnx命令的统计信息                                                                                                              |
| cmdstat_hset  | 无    | hset命令的统计信息                                                                                                               |
| cmdstat_hget  | 无    | hget命令的统计信息                                                                                                               |
| cmdstat_lpush | 无    | lpush命令的统计信息                                                                                                              |
| cmdstat_rpush | 无    | rpush命令的统计信息                                                                                                              |
| cmdstat_lpop  | 无    | lpop命令的统计信息                                                                                                               |
| cmdstat_rpop  | 无    | rpop命令的统计信息                                                                                                               |
| cmdstat_llen  | 无    | llen命令的统计信息                                                                                                               |
