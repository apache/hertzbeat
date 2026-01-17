---
id: tdengine_promql
title: Monitoring TDengine-PromQL
sidebar_label: TDengine-PromQL
keywords: [ Open Source Monitoring System, Open Source Middleware Monitoring, TDengine Monitoring, TDengine-PromQL Monitoring ]
---

> Use Prometheus PromQL to query general metric data from the Prometheus server to monitor TDengine. This solution is
> suitable for situations where Prometheus is already monitoring TDengine and you need to retrieve TDengine monitoring
> data from the Prometheus server.

### Prerequisites

1. Deploy TDengine;
2. Deploy taosKeeper; note that installing the official TDengine installation package will automatically install
   taosKeeper. For details, please refer to: [taosKeeper](https://docs.taosdata.com/reference/components/taoskeeper/);
3. Collect monitoring metrics exposed by TDengine taosKeeper through prometheus;

### Configuration parameters

| Parameter Name      | Parameter Description                                                                                                      |
|---------------------|----------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | IP, IPv6, or domain name of the target being monitored. Note ⚠️: Do not include protocol header (e.g., https://, http://). |
| Monitoring name     | Name to identify this monitoring, ensuring uniqueness of names.                                                            |
| Port                | Prometheus API port, default: 9090.                                                                                        |
| Relative path       | Relative path of Prometheus to query PromQL, default: /api/v1/query                                                        |
| Request mode        | Set the request method for API calls: GET, POST, PUT, DELETE, default: GET                                                 |
| Enable HTTPS        | Whether to access the website via HTTPS, note ⚠️: enabling HTTPS generally requires changing the corresponding port to 443 |
| Username            | Username for Basic or Digest authentication when accessing the API.                                                        |
| Password            | Password for Basic or Digest authentication when accessing the API.                                                        |
| Content-Type        | Resource type when carrying BODY request data.                                                                             |
| Request BODY        | Set the BODY request data, effective for PUT and POST request methods.                                                     |
| Collection interval | Interval for periodic data collection in seconds, the minimum interval that can be set is 30 seconds                       |
| Description remarks | Additional remarks and descriptions for this monitoring. Users can add notes here.                                         |

### Collection indicators

#### Indicator set: Basic information indicators

| Indicator name                  | indicator unit | Indicators help describe |
|---------------------------------|----------------|--------------------------|
| taos_cluster_info_first_ep      | none           | first endpoint           |
| taos_cluster_info_version       | none           | Version Information      |
| taos_cluster_info_master_uptime | day            | Master node runtime      |

#### Indicator set: Number of nodes indicator

| Indicator name                  | indicator unit | Indicators help describe           |
|---------------------------------|----------------|------------------------------------|
| taos_cluster_info_dnodes_total  | none           | Total number of dnodes             |
| taos_cluster_info_dnodes_alive  | none           | Number of surviving dnodes         |
| taos_cluster_info_mnodes_total  | none           | Total number of mnodes             |
| taos_cluster_info_mnodes_alive  | none           | Number of surviving mnodes         |
| taos_cluster_info_vgroups_total | none           | Total number of virtual groups     |
| taos_cluster_info_vgroups_alive | none           | Number of surviving virtual groups |
| taos_cluster_info_vnodes_total  | none           | Total number of virtual nodes      |
| taos_cluster_info_vnodes_alive  | none           | Number of surviving virtual nodes  |

### Indicator set: Database and table statistics

| Indicator name                      | indicator unit | Indicators help describe    |
|-------------------------------------|----------------|-----------------------------|
| taos_cluster_info_dbs_total         | none           | Total number of databases   |
| taos_cluster_info_tbs_total         | none           | Total number of tables      |
| taos_cluster_info_connections_total | day            | total number of connections |

### Indicator set: Dnode information

| Indicator name | indicator unit | Indicators help describe |
| --- | --- | --- |
| taos_d_info_status | Ready indicates normal, offline indicates offline, and unknown indicates unknown. | dnode status |
| taos_dnodes_info_uptime | s | The startup time of this dnode |
| taos_dnodes_info_cpu_engine | none | The percentage of CPU used by the process of this dnode. |
| taos_dnodes_info_cpu_system | none | The percentage of CPU used by the system of the node where the dnode is located. |
| taos_dnodes_info_mem_engine | KB | Memory used by the process of this dnode |
| taos_dnodes_info_mem_system | KB | The memory used by the system of the node where the dnode is located. |
| taos_dnodes_info_disk_total | Byte | The total disk capacity of the node where the dnode is located. |
| taos_dnodes_info_disk_used | Byte | The amount of disk space used on the node where the dnode is located. |
| taos_dnodes_info_io_write_disk | Bytes per second | The disk IO write rate of the node where the dnode is located. |
| taos_dnodes_info_io_read_disk | Bytes per second | The disk IO read rate of the node where the dnode is located. |

### Indicator set: taosadapter related

| Indicator name                       | indicator unit | Indicators help describe      |
|--------------------------------------|----------------|-------------------------------|
| total_requests_for_adapter_transfers | none           | Total number of requests      |
| taos_adapter_requests_success        | none           | Number of successful requests |
| taos_adapter_requests_fail           | none           | Number of failed requests     |
| taos_adapter_requests_query          | none           | Number of query requests      |

### Other TDengine monitoring methods supported by HertzBeat

1. Through the monitoring metrics exposed by taosKeeper, you can refer to [Prometheus Task](prometheus) to configure
   Prometheus collection tasks for monitoring TDengine.
