---
id: doris_fe
title: Monitoring DORIS Database FE Monitoring
sidebar_label: DORIS Database FE
keywords: [Open Source Monitoring System, Open Source Database Monitoring, DORIS Database FE Monitoring]
---

> Collect and monitor general performance metrics for DORIS database FE. Supports DORIS 2.0.0.

**Protocol: HTTP**

### Pre-monitoring operations

Check the `fe/conf/fe.conf` file to obtain the value of the `http_port` configuration item, which is used for monitoring.

### Configuration Parameters

|   Parameter Name    |                                                                            Parameter Description                                                                             |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | The monitored target's IPV4, IPV6, or domain name. Note: Without the protocol header (e.g., https://, http://)                                                               |
| Task Name           | A unique name identifying this monitoring task                                                                                                                               |
| Port                | The port provided by the database to the outside, default is 8030 ,get the value of the`http_port` configuration item                                                        |
| Query Timeout       | The timeout for the connection to not respond, in milliseconds, default is 3000 milliseconds                                                                                 |
| Database Name       | Optional database instance name                                                                                                                                              |
| Collection Interval | The interval between periodic data collections for monitoring, in seconds, with a minimum interval of 30 seconds                                                             |
| Probe Required      | Whether to probe and check the availability of monitoring before adding new monitoring, continue with the addition or modification operation only if the probe is successful |
| Description         | Additional notes and descriptions for this monitoring task                                                                                                                   |

### Collection Indicators

#### Metric Set: doris_fe_connection_total

| Metric Name | Metric Unit |              Metric help description               |
|-------------|-------------|----------------------------------------------------|
| value       | None        | The current number of MySQL port connections on FE |

#### Metric Set: doris_fe_edit_log_clean

Should not fail; if it does, manual intervention is required.

| Metric Name | Metric Unit |                    Metric help description                    |
|-------------|-------------|---------------------------------------------------------------|
| success     | None        | The number of successful cleanups of historical metadata logs |
| failed      | None        | The number of failed cleanups of historical metadata logs     |

#### Metric Set: doris_fe_edit_log

|    Metric Name    | Metric Unit |           Metric help description           |
|-------------------|-------------|---------------------------------------------|
| write             | None        | The count of metadata log write operations  |
| read              | None        | The count of metadata log read operations   |
| current           | None        | The current number of metadata logs         |
| accumulated_bytes | Bytes       | The cumulative value of metadata log writes |
| current_bytes     | Bytes       | The current value of metadata logs          |

#### Metric Set: doris_fe_image_clean

Should not fail; if it does, manual intervention is required.

| Metric Name | Metric Unit |                       Metric help description                        |
|-------------|-------------|----------------------------------------------------------------------|
| success     | None        | The number of successful cleanups of historical metadata image files |
| failed      | None        | The number of failed cleanups of historical metadata image files     |

#### Metric Set: doris_fe_image_write

Should not fail; if it does, manual intervention is required.

| Metric Name | Metric Unit |                   Metric help description                    |
|-------------|-------------|--------------------------------------------------------------|
| success     | None        | The number of successful generations of metadata image files |
| failed      | None        | The number of failed generations of metadata image files     |

#### Metric Set: doris_fe_query_err

| Metric Name | Metric Unit |          Metric help description          |
|-------------|-------------|-------------------------------------------|
| value       | None        | The cumulative value of erroneous queries |

#### Metric Set: doris_fe_max_journal_id

| Metric Name | Metric Unit |                                                                                                                                                               Metric help description                                                                                                                                                               |
|-------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| value       | None        | The current maximum metadata log ID on the FE node. If it is a Master FE, it is the maximum ID currently written; if it is a non-Master FE, it represents the maximum metadata log ID currently being replayed. Used to observe if there is a large gap between the IDs of multiple FEs. A large gap indicates issues with metadata synchronization |

#### Metric Set: doris_fe_max_tablet_compaction_score

| Metric Name | Metric Unit |                                                                                            Metric help description                                                                                             |
|-------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| value       | None        | The largest compaction score value among all BE nodes. This value can observe the current cluster's maximum compaction score to judge if it is too high. If too high, there may be delays in queries or writes |

#### Metric Set: doris_fe_qps

| Metric Name | Metric Unit |                             Metric help description                             |
|-------------|-------------|---------------------------------------------------------------------------------|
| value       | None        | The number of queries per second on the current FE (only counts query requests) |

#### Metric Set: doris_fe_query_err_rate

| Metric Name | Metric Unit |          Metric help description           |
|-------------|-------------|--------------------------------------------|
| value       | None        | The number of erroneous queries per second |

#### Metric Set: doris_fe_report_queue_size

| Metric Name | Metric Unit |                                                                                                              Metric help description                                                                                                               |
|-------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| value       | None        | The length of the queue for various regular reporting tasks on the BE side at the FE end. This value reflects the degree of blocking of reporting tasks on the Master FE node. A larger value indicates insufficient processing capacity on the FE |

#### Metric Set: doris_fe_rps

| Metric Name | Metric Unit |                                       Metric help description                                        |
|-------------|-------------|------------------------------------------------------------------------------------------------------|
| value       | None        | The number of requests per second on the current FE (includes queries and other types of statements) |

#### Metric Set: doris_fe_scheduled_tablet_num

| Metric Name | Metric Unit |                                                                                                                                                  Metric help description                                                                                                                                                  |
|-------------|-------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| value       | None        | The number of tablets currently being scheduled by the Master FE node. This includes tablets that are being repaired and tablets that are being balanced. This value can reflect the number of tablets currently migrating in the cluster. If there is a value for a long time, it indicates that the cluster is unstable |

#### Metric Set: doris_fe_txn_status

Can observe the number of import transactions in various states to determine if there is a backlog.

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| unknown     | None        | Unknown state           |
| prepare     | None        | In preparation          |
| committed   | None        | Committed               |
| visible     | None        | Visible                 |
| aborted     | None        | Aborted / Revoked       |
