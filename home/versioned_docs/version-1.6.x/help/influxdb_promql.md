---
id: influxdb_promql
title: Monitoring InfluxDB-PromQL
sidebar_label: InfluxDB-PromQL
keywords: [ Open Source Monitoring System, InfluxDB Monitoring, InfluxDB-PromQL Monitoring ]
---

> Monitor InfluxDB by querying generic metrics data from Prometheus server using Prometheus PromQL. This approach is suitable when Prometheus is already monitoring InfluxDB and you need to fetch InfluxDB's monitoring data from Prometheus server.

### Configuration Parameters

|   Parameter Name    |                                                 Parameter help description                                                 |
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

### Metrics Collection

#### Metric Set: basic_influxdb_memstats_alloc

| Metric Name | Metric Unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| instance    | None        | Instance to which the metric belongs |
| timestamp   | None        | Timestamp of metric collection       |
| value       | None        | Metric value                         |

#### Metric Set: influxdb_database_numMeasurements

| Metric Name | Metric Unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| job         | None        | Metric name                          |
| instance    | None        | Instance to which the metric belongs |
| database    | None        | Name of the database                 |
| timestamp   | None        | Timestamp of metric collection       |
| value       | None        | Metric value                         |

#### Metric Set: influxdb_query_rate_seconds

| Metric Name | Metric Unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| instance    | None        | Instance to which the metric belongs |
| timestamp   | None        | Timestamp of metric collection       |
| value       | None        | Metric value                         |

#### Metric Set: influxdb_queryExecutor_queriesFinished_10s

| Metric Name | Metric Unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| instance    | None        | Instance to which the metric belongs |
| timestamp   | None        | Timestamp of metric collection       |
| value       | None        | Metric value                         |
