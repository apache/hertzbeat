---
id: nebulagraph_cluster
title: Monitoring NebulaGraph Cluster
sidebar_label: NebulaGraph Cluster
keywords: [ Open Source Monitoring System, Open Source Database Monitoring, Open Source Graph Database Monitoring, NebulaGraph Cluster Monitoring ]
---

> Monitor basic information, nodes, tasks, etc., of the NebulaGraph cluster.

**Protocol Use：ngql**

### Configuration parameters

|   Parameter Name    |                                             Parameter help description                                             |
|---------------------|--------------------------------------------------------------------------------------------------------------------|
| Target Host         | The IPv4, IPv6, or domain name of the monitored peer. Note ⚠️ without the protocol header (eg: https://, http://). |
| Task Name           | Identifies the name of this monitor, ensuring uniqueness of the name.                                              |
| Graph Port          | The port where the graph service is open, default is 9669.                                                         |
| Connection Timeout  | Timeout for connecting to the graph service, in milliseconds, default is 6000 milliseconds.                        |
| Username            | Database connection username.                                                                                      |
| Password            | Database connection password.                                                                                      |
| Collection Interval | Interval for periodically collecting data, in seconds. The minimum interval that can be set is 30 seconds.         |
| Bind Labels         | Used to categorize and manage monitored resources.                                                                 |
| Description         | Additional information for identifying and describing this monitor. Users can add remarks here.                    |

### Collection Metric

#### Metric Set: Base info

| Metric Name  | Metric Unit | Metric help description |
|--------------|-------------|-------------------------|
| responseTime | None        | Response time           |
| charset      | None        | Character set           |
| collation    | None        | Character set collation |

#### Metric Set: Session

|     Metric Name     | Metric Unit |     Metric help description      |
|---------------------|-------------|----------------------------------|
| session             | None        | Number of sessions               |
| running_query_count | None        | Number of queries being executed |

#### Metric Set: Jobs

| Metric Name  | Metric Unit |          Metric help description          |
|--------------|-------------|-------------------------------------------|
| queue_jobs   | None        | Number of pending background tasks        |
| running_jobs | None        | Number of background tasks being executed |

#### Metric Set: Cluster node info

|     Metric Name      | Metric Unit |     Metric help description     |
|----------------------|-------------|---------------------------------|
| total_storage_node   | None        | Number of storage nodes         |
| offline_storage_node | None        | Number of offline storage nodes |
| total_meta_node      | None        | Number of meta nodes            |
| offline_meta_node    | None        | Number of offline meta nodes    |
| total_graph_node     | None        | Number of graph nodes           |
| offline_graph_node   | None        | Number of offline graph nodes   |

#### Metric Set: Storage Nodes

|      Metric Name      | Metric Unit |                Metric help description                |
|-----------------------|-------------|-------------------------------------------------------|
| host                  | None        | Node address                                          |
| port                  | None        | Port                                                  |
| status                | None        | Status (ONLINE/OFFLINE)                               |
| leaderCount           | None        | Number of leader partitions on the current node       |
| leaderDistribution    | None        | Distribution of leader partitions on the current node |
| partitionDistribution | None        | Distribution of partitions on the current node        |
| version               | None        | Version                                               |

#### Metric Set: Meta Nodes

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| host        | None        | Node address            |
| port        | None        | Port                    |
| status      | None        | Status (ONLINE/OFFLINE) |
| version     | None        | Version                 |

#### Metric Set: Graph Nodes

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| host        | None        | Node address            |
| port        | None        | Port                    |
| status      | None        | Status (ONLINE/OFFLINE) |
| version     | None        | Version                 |

> If you need to customize monitoring templates to collect data from NebulaGraph clusters, please refer to: [NGQL Custom Monitoring](../advanced/extend-ngql.md)
