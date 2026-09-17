---
id: hbase_master
title: Monitoring Hbase Master
sidebar_label: HbaseMaster Monitoring
keywords: [Open Source Monitoring System, Open Source Database Monitoring, HbaseMaster Monitoring]
---

> Collect monitoring data for general performance metrics of Hbase Master.

**Protocol: HTTP**

## Pre-monitoring steps

Check the `hbase-site.xml` file to obtain the value of the `hbase.master.info.port` configuration item, which is used for monitoring.

## Configuration Parameters

|   Parameter Name    |                                                                              Parameter Description                                                                               |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Target Host         | The IPv4, IPv6, or domain name of the monitored peer. Note: without protocol header (e.g., https://, http://).                                                                   |
| Port                | The port number of the Hbase master, default is 16010. That is, the value of the`hbase.master.info.port` parameter.                                                              |
| Task Name           | The name identifying this monitoring, which needs to be unique.                                                                                                                  |
| Query Timeout       | Set the connection timeout in ms, the default is 3000 milliseconds.                                                                                                              |
| Collection Interval | The periodic collection interval for monitoring data, in seconds, with the minimum allowable interval being 30 seconds.                                                          |
| Probe               | Whether to probe and check the availability of monitoring before adding new monitoring, and proceed with the addition or modification operation only if the probe is successful. |
| Description         | Additional notes and descriptions for this monitoring, users can add notes here.                                                                                                 |

### Collected Metrics

#### Metric Set: server

|     Metric Name      | Unit |           Metric Description            |
|----------------------|------|-----------------------------------------|
| numRegionServers     | none | Number of currently alive RegionServers |
| numDeadRegionServers | none | Number of currently dead RegionServers  |
| averageLoad          | none | Cluster average load                    |
| clusterRequests      | none | Total number of cluster requests        |

#### Metric Set: Rit

|     Metric Name      | Unit |        Metric Description        |
|----------------------|------|----------------------------------|
| ritnone              | none | Current number of RIT            |
| ritnoneOverThreshold | none | Number of RIT over the threshold |
| ritOldestAge         | ms   | Duration of the oldest RIT       |

#### Metric Set: basic

|       Metric Name       | Unit |             Metric Description              |
|-------------------------|------|---------------------------------------------|
| liveRegionServers       | none | List of currently active RegionServers      |
| deadRegionServers       | none | List of currently offline RegionServers     |
| zookeeperQuorum         | none | Zookeeper list                              |
| masterHostName          | none | Master node                                 |
| BalancerCluster_num_ops | none | Number of cluster load balancing operations |
| numActiveHandler        | none | Number of RPC handlers                      |
| receivedBytes           | MB   | Cluster received data volume                |
| sentBytes               | MB   | Cluster sent data volume (MB)               |
| clusterRequests         | none | Total number of cluster requests            |
