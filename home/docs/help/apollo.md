---
id: apollo
title: Apollo Configuration Center
sidebar_label: Apollo Configuration Center
keywords: [ Open Source Monitoring System, Open Source Middleware Monitoring, Apollo configuration center monitoring ]
---

> Monitoring of general metrics for the Apollo Configuration Center service is performed by calling the Prometheus
> interface of the Apollo Configuration Center.

### Prerequisites

1. Set up the Apollo configuration center according to
   the [deployment documentation](https://www.apolloconfig.com/#/en/deployment/quick-start).
2. Visit ```http://${someIp:somePort}/prometheus``` to verify if you can access the metrics data.
   For more details, please refer
   to: [Apollo Monitoring Documentation](https://www.apolloconfig.com/#/en/design/apollo-design?id=v-monitoring-related)
3. Note⚠️: Starting from version 1.5.0, the Apollo server supports exposing Prometheus-formatted metrics
   via `/prometheus`.

### Configuration parameters

| Parameter Name    | Parameter Help Description                                                                                            |
|-------------------|-----------------------------------------------------------------------------------------------------------------------|
| Target Host       | The monitored peer's IPv4, IPv6, or domain name. Note⚠️: Do not include protocol headers (e.g., https://, http://).   |
| Port              | Pulsar's webServicePort value, defaulting to 8080.                                                                    |
| Task Name         | The name identifying this monitoring task. The name must be unique.                                                   |
| Query Timeout     | Set the connection timeout in milliseconds (ms). Default is 3000 ms.                                                  |
| Monitoring Cycle  | The interval time for periodic data collection, measured in seconds. The minimum configurable interval is 30 seconds. |
| Binding Tags      | Used for classifying and managing monitored resources                                                                 |
| Description Notes | Additional identifiers and descriptive notes for this monitoring task. Users can add notes here.                      |

### Collection Metrics

#### Metric Set: Basic Information Metrics

| Metric Name                    | Unit    | Metric Help Description                                                  |
|--------------------------------|---------|--------------------------------------------------------------------------|
| application_ready_time_seconds | Seconds | Time taken for the application to transition from startup to ready state |
| process_uptime_seconds         | seconds | Total time the process has been running                                  |
| process_cpu_usage              | %       | Current process CPU usage                                                |

#### Metric Set: : JVM

| Metric Name                       | Unit | Metric Help Description                                       |
|-----------------------------------|------|---------------------------------------------------------------|
| system_cpu_usage                  | %    | System CPU Usage                                              |
| system_load_average_1m            | None | System load average over the past minute                      |
| jvm_memory_committed_bytes        | MB   | Size of memory requested by the JVM from the operating system |
| jvm_memory_used_bytes             | MB   | JVM's current actual memory usage                             |
| jvm_memory_max_bytes              | MB   | Maximum memory limit available to the JVM                     |
| jvm_gc_pause_seconds_count        | None | Total number of JVM GC pause events                           |
| jvm_gc_pause_seconds_sum          | None | Total time spent in JVM GC pauses                             |
| jvm_memory_usage_after_gc_percent | None | JVM memory usage after garbage collection                     |

#### Metric Set: System Resources

| Metric Name              | Unit | Metric Help Description                                            |
|--------------------------|------|--------------------------------------------------------------------|
| process_files_max_files  | None | Limit on the maximum number of file descriptors a process may open |
| process_files_open_files | None | Number of file descriptors currently opened by the process         |
