---
id: elasticsearch
title: Monitoring：ElasticSearch
sidebar_label: ElasticSearch
keywords: [ open source monitoring tool, monitoring ElasticSearch metrics ]
---

> Collect and monitor the general performance Metrics of ElasticSearch

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6. Note⚠️Without protocol header (eg: https://, http://).                                             |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Monitoring port     | The HTTP API port opened by Elasticsearch,default is 9200.                                                               |
| SSL                 | Whether SSL is enabled for connecting to Elasticsearch.                                                                  |
| Auth Type           | Authentication type,Optional.                                                                                            |
| Username            | Username,Optional.                                                                                                       |
| Password            | Password,Optional.                                                                                                       |
| Connect Timeout     | Set the timeout for elasticsearch query, default is 6000 milliseconds.                                                   |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags           | Used to classify and manage monitoring resources.                                                                        |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Collection Metrics

#### Metrics Set：health

|      Metric name      | Metric unit |          Metric help description          |
|-----------------------|-------------|-------------------------------------------|
| cluster_name          | none        | Cluster Name                              |
| status                | none        | status                                    |
| nodes                 | none        | Number of nodes in the cluster.           |
| data_nodes            | none        | Number of data nodes in the cluster.      |
| active_primary_shards | none        | Number of active shards on primary nodes. |
| active_shards         | none        | Number of active shards.                  |
| active_percentage     | %           | Active Percentage                         |
| initializing_shards   | none        | Number of initialized shards.             |
| unassigned_shards     | none        | Number of unassigned shards.              |

#### Metrics Set：nodes

| Metric name | Metric unit | Metric help description  |
|-------------|-------------|--------------------------|
| total       | none        | Number of nodes.         |
| successful  | none        | Number of online nodes.  |
| failed      | none        | Number of offline nodes. |

#### Metrics Set：nodes_detail

|    Metric name    | Metric unit | Metric help description |
|-------------------|-------------|-------------------------|
| node_name         | none        | Node Name               |
| ip                | none        | IP Address              |
| cpu_load_average  | none        | Cpu Load Average        |
| cpu_percent       | %           | Cpu Percent             |
| heap_used         | MB          | Heap Used               |
| heap_used_percent | %           | Heap Used Percent       |
| heap_total        | MB          | Heap Total              |
| disk_free         | GB          | Disk Free               |
| disk_total        | GB          | Disk Total              |
| disk_used_percent | %           | Disk Used Percent       |
