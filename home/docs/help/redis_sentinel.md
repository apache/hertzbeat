---
id: redis_sentinel
title: Monitoring Redis Sentinel
sidebar_label: Redis Sentinel
keywords: [ open source monitoring tool, open source Redis Sentinel monitoring tool, monitoring Redis Sentinel metrics ]
---

> Collect and monitor the general performance metrics of Redis Sentinel. Support Redis 2.8+.

## Configuration parameter

| Parameter name | Parameter help description |
|---|---|
| Target Host | The IP, IPV6, or domain name of the monitored endpoint. Note ⚠️: Do not include protocol headers (eg: https://, http://). |
| Port | The port provided by Redis Sentinel, default value is 26379. |
| Query Timeout(ms) | Set the timeout time when Sentinel query does not respond to data, unit: ms, default: 3000ms. |
| Username | Connection user name, optional. |
| Password | Connection password, optional. |
| Pattern | Regular expression pattern for filtering Redis Sentinel info output, optional. |
| Enable SSH Tunnel | Whether to enable SSH tunneling to access Sentinel behind a firewall, default: false. |
| SSH Host | SSH Tunnel host IP or domain name. |
| SSH Port | SSH Tunnel port, default: 22. |
| SSH Timeout(ms) | SSH connection timeout in milliseconds, default: 60000ms. |
| SSH Username | SSH Tunnel login username. |
| SSH Password | SSH Tunnel login password. |
| Share SSH Connection | Whether to share SSH connection across requests. |
| SSH PrivateKey | SSH private key content (RSA/DSA/ED25519) if using key authentication. |
| SSH PrivateKey PassPhrase | Passphrase for encrypted SSH private key. |

### Collection Metric

#### Metric set：server

| Metric name | Metric unit | Metric help description |
|---|---|---|
| identity | none | identity |
| redis_version | none | redis_version |
| redis_git_sha1 | none | redis_git_sha1 |
| redis_git_dirty | none | redis_git_dirty |
| redis_build_id | none | redis_build_id |
| redis_mode | none | redis_mode |
| os | none | os |
| arch_bits | none | arch_bits |
| multiplexing_api | none | multiplexing_api |
| atomicvar_api | none | atomicvar_api |
| gcc_version | none | gcc_version |
| process_id | none | process_id |
| process_supervised | none | process_supervised |
| run_id | none | run_id |
| tcp_port | none | tcp_port |
| server_time_usec | none | server_time_usec |
| uptime_in_seconds | none | uptime_in_seconds |
| uptime_in_days | none | uptime_in_days |
| hz | none | hz |
| configured_hz | none | configured_hz |
| lru_clock | none | lru_clock |
| executable | none | executable |
| config_file | none | config_file |
| io_threads_active | none | io_threads_active |

#### Metric set：clients

| Metric name | Metric unit | Metric help description |
|---|---|---|
| connected_clients | none | connected_clients |
| cluster_connections | none | cluster_connections |
| maxclients | none | maxclients |
| client_recent_max_input_buffer | none | client_recent_max_input_buffer |
| client_recent_max_output_buffer | none | client_recent_max_output_buffer |
| blocked_clients | none | blocked_clients |
| tracking_clients | none | tracking_clients |
| clients_in_timeout_table | none | clients_in_timeout_table |

#### Metric set：stats

| Metric name | Metric unit | Metric help description |
|---|---|---|
| total_connections_received | none | total_connections_received |
| total_commands_processed | none | total_commands_processed |
| instantaneous_ops_per_sec | none | instantaneous_ops_per_sec |
| total_net_input_bytes | none | total_net_input_bytes |
| total_net_output_bytes | none | total_net_output_bytes |
| instantaneous_input_kbps | none | instantaneous_input_kbps |
| instantaneous_output_kbps | none | instantaneous_output_kbps |
| rejected_connections | none | rejected_connections |
| sync_full | none | sync_full |
| sync_partial_ok | none | sync_partial_ok |
| sync_partial_err | none | sync_partial_err |
| expired_keys | none | expired_keys |
| expired_stale_perc | none | expired_stale_perc |
| expired_time_cap_reached_count | none | expired_time_cap_reached_count |
| expire_cycle_cpu_milliseconds | none | expire_cycle_cpu_milliseconds |
| evicted_keys | none | evicted_keys |
| keyspace_hits | none | keyspace_hits |
| keyspace_misses | none | keyspace_misses |
| pubsub_channels | none | pubsub_channels |
| pubsub_patterns | none | pubsub_patterns |
| latest_fork_usec | none | latest_fork_usec |
| total_forks | none | total_forks |
| migrate_cached_sockets | none | migrate_cached_sockets |
| slave_expires_tracked_keys | none | slave_expires_tracked_keys |
| active_defrag_hits | none | active_defrag_hits |
| active_defrag_misses | none | active_defrag_misses |
| active_defrag_key_hits | none | active_defrag_key_hits |
| active_defrag_key_misses | none | active_defrag_key_misses |
| tracking_total_keys | none | tracking_total_keys |
| tracking_total_items | none | tracking_total_items |
| tracking_total_prefixes | none | tracking_total_prefixes |
| unexpected_error_replies | none | unexpected_error_replies |
| total_error_replies | none | total_error_replies |
| dump_payload_sanitizations | none | dump_payload_sanitizations |
| total_reads_processed | none | total_reads_processed |
| total_writes_processed | none | total_writes_processed |
| io_threaded_reads_processed | none | io_threaded_reads_processed |
| io_threaded_writes_processed | none | io_threaded_writes_processed |

#### Metric set：cpu

| Metric name | Metric unit | Metric help description |
|---|---|---|
| used_cpu_sys | none | used_cpu_sys |
| used_cpu_user | none | used_cpu_user |
| used_cpu_sys_children | none | used_cpu_sys_children |
| used_cpu_user_children | none | used_cpu_user_children |
| used_cpu_sys_main_thread | none | used_cpu_sys_main_thread |
| used_cpu_user_main_thread | none | used_cpu_user_main_thread |

#### Metric set：sentinel

| Metric name | Metric unit | Metric help description |
|---|---|---|
| sentinel_masters | none | sentinel_masters |
| sentinel_tilt | none | sentinel_tilt |
| sentinel_running_scripts | none | sentinel_running_scripts |
| sentinel_timedout_scripts | none | sentinel_timedout_scripts |
| sentinel_scripts_queue_length | none | sentinel_scripts_queue_length |
| sentinel_simulate_failure_flags | none | sentinel_simulate_failure_flags |
