---
id: etcd
title: Monitoring：etcd monitoring
sidebar_label: etcd
keywords: [open source monitoring tool, open source middleware monitoring tool, monitoring etcd metrics]
---

> HertzBeat monitors the etcd key-value store by collecting metrics from the Prometheus metrics endpoint that etcd exposes.
>
> etcd 3.4+ is supported (the database size metric `etcd_mvcc_db_total_size_in_bytes` replaced the old `etcd_debugging_*` name in 3.4).

## PreRequisites

### Make sure HertzBeat can reach etcd's metrics endpoint

etcd exposes Prometheus-format metrics on its client port (default `2379`) at the `/metrics` path. Make sure this address is reachable from HertzBeat:

1. If etcd only listens on localhost, or client mutual TLS is enabled on the client port, configure a dedicated metrics listener via [`--listen-metrics-urls`](https://etcd.io/docs/latest/op-guide/configuration/). It serves the metrics and health-check endpoints; if exposed without TLS, restrict it to a trusted network.
2. Access `{metrics-host}:{metrics-port}/metrics` (the client port `2379` by default) from the HertzBeat host to confirm metrics data can be fetched.

More information see [etcd monitoring documentation](https://etcd.io/docs/latest/op-guide/monitoring/).

### Configuration parameter

| Parameter name      | Parameter help description                                                                |
|----------------------|---------------------------------------------------------------------------------------------|
| Target Host          | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://) |
| Port                 | Port of the etcd metrics endpoint, default 2379 when using the client listener             |
| Query Timeout        | HTTP request timeout in milliseconds, default 6000                                          |
| HTTPS                | Whether to use HTTPS to request the metrics endpoint                                        |
| Headers              | Optional extra HTTP request headers                                                         |
| Auth Type            | Optional Basic/Digest auth if the metrics endpoint sits behind an auth proxy                |
| Username / Password  | Credentials used when Auth Type is set                                                      |

### Collection Metric

#### Metric set：etcd_server_has_leader

| Metric name | Metric unit | Metric help description                                     |
|-------------|-------------|---------------------------------------------------------------|
| hasLeader   | none        | Whether this etcd member has a raft leader (1=yes, 0=no)       |

#### Metric set：etcd_mvcc_db_total_size_in_bytes

| Metric name | Metric unit | Metric help description                              |
|-------------|-------------|--------------------------------------------------------|
| dbSize      | MB          | Total size of the underlying database physically allocated |

#### Metric set：etcd_server_leader_changes_seen_total

| Metric name    | Metric unit | Metric help description                |
|-----------------|-------------|-------------------------------------------|
| leaderChanges   | none        | Total number of leader changes observed  |

#### Metric set：process_cpu_seconds_total

| Metric name | Metric unit | Metric help description                        |
|-------------|-------------|---------------------------------------------------|
| cpuSeconds  | second      | Cumulative user and system CPU time consumed      |

#### Metric set：process_resident_memory_bytes

| Metric name | Metric unit | Metric help description        |
|-------------|-------------|-----------------------------------|
| memory      | MB          | Resident memory size of the process |
