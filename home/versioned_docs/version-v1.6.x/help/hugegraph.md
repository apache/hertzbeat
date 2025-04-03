---
id: hugegraph  
title: Monitoring HugeGraph Monitoring    
sidebar_label: Apache HugeGraph
keywords: [Open Source Monitoring System, Open Source Database Monitoring, HugeGraph Monitoring]
---

> Collect and monitor the general performance metrics of HugeGraph

**Protocol used: HTTP**

## Pre-monitoring Operations

Check the `rest-server.properties` file to obtain the value of the `restserver_port` configuration item, which is used for monitoring.

## Configuration Parameters

|   Parameter Name    |                                                   Parameter Description                                                    |
|---------------------|----------------------------------------------------------------------------------------------------------------------------|
| Target Host         | The IPv4, IPv6, or domain name of the monitored endpoint. Note ⚠️ Do not include protocol headers (eg: https://, http://). |
| Port                | Port number of the HugeGraph restserver, default is 8080. i.e., the value of the `restserver_port` parameter               |
| Enable SSL          | Enable SSL usage                                                                                                           |
| Base Path           | Base path, default is: /metrics, usually does not need to be modified                                                      |
| Task Name           | Identifies the name of this monitoring, ensuring uniqueness.                                                               |
| Collection Interval | Interval for periodically collecting data for monitoring, in seconds, with a minimum interval of 30 seconds                |
| Probe Enabled       | Whether to probe before adding new monitoring, only continue with add/modify operations if the probe is successful         |
| Description         | Additional identification and description of this monitoring, users can add information here                               |

### Metrics Collection

#### Metric Set: gauges

|          Metric Name           | Metric Unit |                       Metric Description                       |
|--------------------------------|-------------|----------------------------------------------------------------|
| edge-hugegraph-capacity        | NONE        | Indicates the capacity limit of edges in the current graph     |
| edge-hugegraph-expire          | NONE        | Indicates the expiration time of edge data                     |
| edge-hugegraph-hits            | NONE        | Indicates the number of hits in the edge data cache            |
| edge-hugegraph-miss            | NONE        | Indicates the number of misses in the edge data cache          |
| edge-hugegraph-size            | NONE        | Indicates the number of edges in the current graph             |
| instances                      | NONE        | Indicates the number of currently running HugeGraph instances  |
| schema-id-hugegraph-capacity   | NONE        | Indicates the capacity limit of schema IDs in the graph        |
| schema-id-hugegraph-expire     | NONE        | Indicates the expiration time of schema ID data                |
| schema-id-hugegraph-hits       | NONE        | Indicates the number of hits in the schema ID data cache       |
| schema-id-hugegraph-miss       | NONE        | Indicates the number of misses in the schema ID data cache     |
| schema-id-hugegraph-size       | NONE        | Indicates the number of schema IDs in the current graph        |
| schema-name-hugegraph-capacity | NONE        | Indicates the capacity limit of schema names in the graph      |
| schema-name-hugegraph-expire   | NONE        | Indicates the expiration time of schema name data              |
| schema-name-hugegraph-hits     | NONE        | Indicates the number of hits in the schema name data cache     |
| schema-name-hugegraph-miss     | NONE        | Indicates the number of misses in the schema name data cache   |
| schema-name-hugegraph-size     | NONE        | Indicates the number of schema names in the current graph      |
| token-hugegraph-capacity       | NONE        | Indicates the capacity limit of tokens in the graph            |
| token-hugegraph-expire         | NONE        | Indicates the expiration time of token data                    |
| token-hugegraph-hits           | NONE        | Indicates the number of hits in the token data cache           |
| token-hugegraph-miss           | NONE        | Indicates the number of misses in the token data cache         |
| token-hugegraph-size           | NONE        | Indicates the number of tokens in the current graph            |
| users-hugegraph-capacity       | NONE        | Indicates the capacity limit of users in the graph             |
| users-hugegraph-expire         | NONE        | Indicates the expiration time of user data                     |
| users-hugegraph-hits           | NONE        | Indicates the number of hits in the user data cache            |
| users-hugegraph-miss           | NONE        | Indicates the number of misses in the user data cache          |
| users-hugegraph-size           | NONE        | Indicates the number of users in the current graph             |
| users_pwd-hugegraph-capacity   | NONE        | Indicates the capacity limit of user passwords                 |
| users_pwd-hugegraph-expire     | NONE        | Indicates the expiration time of user password data            |
| users_pwd-hugegraph-hits       | NONE        | Indicates the number of hits in the user password data cache   |
| users_pwd-hugegraph-miss       | NONE        | Indicates the number of misses in the user password data cache |
| users_pwd-hugegraph-size       | NONE        | Indicates the number of user passwords in the current graph    |
| vertex-hugegraph-capacity      | NONE        | Indicates the capacity limit of vertices in the graph          |
| vertex-hugegraph-expire        | NONE        | Indicates the expiration time of vertex data                   |
| vertex-hugegraph-hits          | NONE        | Indicates the number of hits in the vertex data cache          |
| vertex-hugegraph-miss          | NONE        | Indicates the number of misses in the vertex data cache        |
| vertex-hugegraph-size          | NONE        | Indicates the number of vertices in the current graph          |
| batch-write-threads            | NONE        | Indicates the number of threads for batch write operations     |
| max-write-threads              | NONE        | Indicates the maximum number of threads for write operations   |
| pending-tasks                  | NONE        | Indicates the number of pending tasks                          |
| workers                        | NONE        | Indicates the current number of worker threads                 |
| average-load-penalty           | NONE        | Indicates the average load penalty                             |
| estimated-size                 | NONE        | Indicates the estimated data size                              |
| eviction-count                 | NONE        | Indicates the number of evicted data entries                   |
| eviction-weight                | NONE        | Indicates the weight of evicted data                           |
| hit-count                      | NONE        | Indicates the total cache hits                                 |
| hit-rate                       | NONE        | Indicates the cache hit rate                                   |
| load-count                     | NONE        | Indicates the number of data loads                             |
| load-failure-count             | NONE        | Indicates the number of data load failures                     |
| load-failure-rate              | NONE        | Indicates the data load failure rate                           |
| load-success-count             | NONE        | Indicates the number of successful data loads                  |
| long-run-compilation-count     | NONE        | Indicates the number of long-running compilations              |
| miss-count                     | NONE        | Indicates the total cache misses                               |
| miss-rate                      | NONE        | Indicates the cache miss rate                                  |
| request-count                  | NONE        | Indicates the total request count                              |
| total-load-time                | NONE        | Indicates the total data load time                             |
| sessions                       | NONE        | Indicates the current number of active sessions                |

#### Metric Set: counters

|                     Metric Name                     | Metric Unit |                               Metric Description                               |
|-----------------------------------------------------|-------------|--------------------------------------------------------------------------------|
| GET-SUCCESS_COUNTER                                 | NONE        | Records the number of successful GET requests                                  |
| GET-TOTAL_COUNTER                                   | NONE        | Records the total number of GET requests                                       |
| favicon-ico-GET-FAILED_COUNTER                      | NONE        | Records the number of failed GET requests to retrieve favicon.ico              |
| favicon-ico-GET-TOTAL_COUNTER                       | NONE        | Records the total number of GET requests to retrieve favicon.ico               |
| graphs-HEAD-FAILED_COUNTER                          | NONE        | Records the number of failed HEAD requests for graphs resources                |
| graphs-HEAD-SUCCESS_COUNTER                         | NONE        | Records the number of successful HEAD requests for graphs resources            |
| graphs-HEAD-TOTAL_COUNTER                           | NONE        | Records the total number of HEAD requests for graphs resources                 |
| graphs-hugegraph-graph-vertices-GET-SUCCESS_COUNTER | NONE        | Records the number of successful GET requests for vertices in HugeGraph graphs |
| graphs-hugegraph-graph-vertices-GET-TOTAL_COUNTER   | NONE        | Records the total number of GET requests for vertices in HugeGraph graphs      |
| metrics-GET-FAILED_COUNTER                          | NONE        | Records the number of failed GET requests to retrieve metrics                  |
| metrics-GET-TOTAL_COUNTER                           | NONE        | Records the total number of GET requests to retrieve metrics                   |
| metrics-GET-SUCCESS_COUNTER                         | NONE        | Records the number of successful GET requests to retrieve metrics              |
| metrics-GET-TOTAL_COUNTER                           | NONE        | Records the total number of GET requests to retrieve metrics                   |
| metrics-gauges-GET-SUCCESS_COUNTER                  | NONE        | Records the number of successful GET requests to retrieve metrics gauges       |
| metrics-gauges-GET-TOTAL_COUNTER                    | NONE        | Records the total number of GET requests to retrieve metrics gauges            |

#### Metric Set: system

|                 Metric Name                 | Metric Unit |                                           Metric Description                                            |
|---------------------------------------------|-------------|---------------------------------------------------------------------------------------------------------|
| mem                                         | NONE        | Indicates the total memory of the system                                                                |
| mem_total                                   | NONE        | Indicates the total memory of the system (same as mem)                                                  |
| mem_used                                    | NONE        | Indicates the currently used memory of the system                                                       |
| mem_free                                    | NONE        | Indicates the free memory of the system                                                                 |
| mem_unit                                    | NONE        | Indicates the unit of memory (such as bytes, kilobytes, megabytes, etc.)                                |
| processors                                  | NONE        | Indicates the number of processors in the system                                                        |
| uptime                                      | NONE        | Indicates the system uptime, i.e., the time since booting                                               |
| systemload_average                          | NONE        | Indicates the average system load, reflecting the system's busyness                                     |
| heap_committed                              | NONE        | Indicates the committed size of JVM heap memory, i.e., the guaranteed heap memory size available to JVM |
| heap_init                                   | NONE        | Indicates the initial size of JVM heap memory                                                           |
| heap_used                                   | NONE        | Indicates the currently used JVM heap memory size                                                       |
| heap_max                                    | NONE        | Indicates the maximum available size of JVM heap memory                                                 |
| nonheap_committed                           | NONE        | Indicates the committed size of JVM non-heap memory                                                     |
| nonheap_init                                | NONE        | Indicates the initial size of JVM non-heap memory                                                       |
| nonheap_used                                | NONE        | Indicates the currently used JVM non-heap memory size                                                   |
| nonheap_max                                 | NONE        | Indicates the maximum available size of JVM non-heap memory                                             |
| thread_peak                                 | NONE        | Indicates the peak number of threads since JVM startup                                                  |
| thread_daemon                               | NONE        | Indicates the current number of active daemon threads                                                   |
| thread_total_started                        | NONE        | Indicates the total number of threads started since JVM startup                                         |
| thread_count                                | NONE        | Indicates the current number of active threads                                                          |
| garbage_collector_g1_young_generation_count | NONE        | Indicates the number of young generation garbage collections by G1 garbage collector                    |
| garbage_collector_g1_young_generation_time  | NONE        | Indicates the total time spent in young generation garbage collections by G1 garbage collector          |
| garbage_collector_g1_old_generation_count   | NONE        | Indicates the number of old generation garbage collections by G1 garbage collector                      |
| garbage_collector_g1_old_generation_time    | NONE        | Indicates the total time spent in old generation garbage collections by G1 garbage collector            |
| garbage_collector_time_unit                 | NONE        | Indicates the unit of garbage collection time (such as milliseconds, seconds, etc.)                     |
