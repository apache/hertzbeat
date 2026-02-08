---
id: influxdb
title: Monitoring InfluxDB Database
sidebar_label: InfluxDB Database
keywords: [open source monitoring system, open source database monitoring, InfluxDB database monitoring]
---

### Configuration Parameters

|   Parameter Name    |                                                        Parameter Description                                                        |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | The IPv4, IPv6, or domain name of the target being monitored. Note⚠️: Do not include the protocol header (e.g., https://, http://). |
| Task Name           | A unique identifier for this monitoring task.                                                                                       |
| Port                | The port on which the database is exposed. Default is 8086.                                                                         |
| URL                 | The database connection URL, usually constructed from the host. No need to add it separately.                                       |
| Collection Interval | The interval at which data is collected during monitoring, in seconds. The minimum interval that can be set is 30 seconds.          |
| Probe Enabled       | Whether to perform a probe check for monitoring availability before adding or modifying the monitoring task.                        |
| Description         | Additional notes and remarks about this monitoring task. Users can provide information and descriptions here.                       |

### Collected Metrics

#### Metric Set: influxdb_info

| Metric Name | Metric Unit | Metric Description |
|-------------|-------------|--------------------|
| build_date  | N/A         | Creation date      |
| os          | N/A         | Operating system   |
| cpus        | N/A         | CPUs               |
| version     | N/A         | Version number     |

#### Metric Set: http_api_request_duration_seconds

|  Metric Name  | Metric Unit | Metric Description |
|---------------|-------------|--------------------|
| handler       | N/A         | Handler            |
| path          | N/A         | Path               |
| response_code | N/A         | Response code      |
| method        | N/A         | Request method     |
| user_agent    | N/A         | User agent         |
| status        | N/A         | Status             |

#### Metric Set: storage_compactions_queued

| Metric Name | Metric Unit | Metric Description |
|-------------|-------------|--------------------|
| bucket      | N/A         | Storage bucket     |
| engine      | N/A         | Engine type        |
| id          | N/A         | Identifier         |
| level       | N/A         | Level              |
| path        | N/A         | Data file path     |

#### Metric Set: http_write_request_bytes

| Metric Name | Metric Unit |   Metric Description    |
|-------------|-------------|-------------------------|
| endpoint    | N/A         | Endpoint                |
| org_id      | N/A         | Organization identifier |
| status      | N/A         | Status                  |

#### Metric Set: qc_requests_total

| Metric Name | Metric Unit |   Metric Description    |
|-------------|-------------|-------------------------|
| result      | N/A         | Result                  |
| org         | N/A         | Organization identifier |
