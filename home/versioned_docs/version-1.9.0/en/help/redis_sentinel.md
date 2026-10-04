---
id: redis_sentinel
title: Monitoring Redis Sentinel
sidebar_label: Redis Sentinel
keywords: [open-source monitoring system, open-source database monitoring, Redis Sentinel monitoring]
---

> Collect and monitor Redis Sentinel instances for key performance metrics.

## Pre-monitoring Requirements

> Before adding the Redis Sentinel monitor, please ensure the following:

1. The Redis Sentinel service is running and the sentinel port (default **26379**) is accessible from the HertzBeat server.
2. If authentication is configured on the Sentinel instance, prepare the username and password.
3. No firewall rules are blocking the sentinel port between HertzBeat and the target host.

## Configuration Parameters

| Parameter | Parameter Help Description |
| --------- | -------------------------- |
| Target Host | The IPv4, IPv6 address or domain name of the host being monitored. Note: do not include protocol headers, e.g. `192.168.0.1`. |
| Port | The listening port of the Redis Sentinel instance. Default: **26379**. |
| Timeout | Timeout value for the connection, in milliseconds. Default: `3000`. |
| Username | The username used to authenticate with the Redis Sentinel instance. Optional. |
| Password | The password used to authenticate with the Redis Sentinel instance. Optional. |
| Collection Interval | How often HertzBeat polls this monitor, in seconds. Minimum value: 30s. |
| Description/Remarks | Additional notes and descriptions for this monitor. |

## Collection Metrics

### Metric Set: sentinel

> Sentinel overview metrics collected via `INFO sentinel`.

| Metric Name | Metric Unit | Metric Help Description |
| ----------- | ----------- | ----------------------- |
| sentinel_masters | None | Total number of Redis master nodes monitored by this Sentinel instance. |
| sentinel_tilt | None | Whether the Sentinel is currently in TILT mode (time-skew safety mode). `1` means TILT is active, `0` means normal. |
| sentinel_running_scripts | None | Number of Lua scripts currently being executed by the Sentinel. |
| sentinel_timedout_scripts | None | Number of scripts that have timed out. |
| sentinel_scripts_queue_length | None | Number of scripts currently waiting in the execution queue. |
| sentinel_simulate_failure_flags | None | Bitmask flags used for failure simulation testing (via `SENTINEL SIMULATE-FAILURE`). |

### Metric Set: master_status

> Status information for each monitored Redis master node.

| Metric Name | Metric Unit | Metric Help Description |
| ----------- | ----------- | ----------------------- |
| master0 | None | Status string for the first monitored master, e.g. `name=mymaster,status=ok,address=127.0.0.1:6379,slaves=1,sentinels=3`. |
| master1 | None | Status string for the second monitored master (if present). |
| master2 | None | Status string for the third monitored master (if present). |

### Metric Set: server

> Server-level information for the Sentinel process, collected via `INFO server`.

| Metric Name | Metric Unit | Metric Help Description |
| ----------- | ----------- | ----------------------- |
| redis_version | None | Version string of the Redis (Sentinel) binary. |
| os | None | Operating system on which the Sentinel is running. |
| arch_bits | None | CPU architecture (32 or 64 bits). |
| process_id | None | PID of the Sentinel server process. |
| tcp_port | None | The TCP port on which the Sentinel is listening. |
| uptime_in_seconds | s | Number of seconds since the Sentinel process started. |
| uptime_in_days | d | Number of days since the Sentinel process started. |
| hz | None | Frequency of the server's background event loop (calls per second). |
| executable | None | Absolute path to the server executable. |
| config_file | None | Absolute path to the sentinel configuration file. |

### Metric Set: clients

> Client connection statistics, collected via `INFO clients`.

| Metric Name | Metric Unit | Metric Help Description |
| ----------- | ----------- | ----------------------- |
| connected_clients | None | Number of client connections currently open (excluding connections from replicas). |
| blocked_clients | None | Number of clients blocked waiting on a blocking command (e.g. BLPOP, WAIT). |
| maxclients | None | The configured maximum number of client connections allowed. |
| client_recent_max_input_buffer | None | Largest input buffer size (in bytes) seen across all current client connections. |
| client_recent_max_output_buffer | None | Largest output buffer size (in bytes) seen across all current client connections. |

### Metric Set: stats

> General statistics, collected via `INFO stats`.

| Metric Name | Metric Unit | Metric Help Description |
| ----------- | ----------- | ----------------------- |
| total_connections_received | None | Total number of connections accepted by the server since startup. |
| total_commands_processed | None | Total number of commands processed by the server since startup. |
| instantaneous_ops_per_sec | None | Number of commands processed per second (real-time snapshot). |
| rejected_connections | None | Number of connections rejected because the `maxclients` limit was reached. |
| total_net_input_bytes | None | Total bytes of data received from clients since startup. |
| total_net_output_bytes | None | Total bytes of data sent to clients since startup. |

### Metric Set: cpu

> CPU consumption statistics, collected via `INFO cpu`.

| Metric Name | Metric Unit | Metric Help Description |
| ----------- | ----------- | ----------------------- |
| used_cpu_sys | None | System CPU time consumed by the Sentinel server process (kernel mode). |
| used_cpu_user | None | User CPU time consumed by the Sentinel server process (user mode). |
| used_cpu_sys_children | None | System CPU time consumed by the background child processes (kernel mode). |
| used_cpu_user_children | None | User CPU time consumed by the background child processes (user mode). |
