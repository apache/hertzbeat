---
id: airflow  
title: Monitoring Apache Airflow Monitoring  
sidebar_label: Apache Airflow
keywords: [open source monitoring system, open source database monitoring, Apache Airflow monitoring]
---

> Collect and monitor general performance metrics for the Apache Airflow.

### Configuration Parameters

| Parameter Name      | Parameter Description                                                                                                           |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | IP address, IPV4, IPV6, or domain name of the host being monitored. Note ⚠️ without protocol prefix (e.g., https://, http://).  |
| Task Name           | Name identifying this monitoring, ensuring uniqueness.                                                                          |
| Port                | Port number of the database exposed to the outside, default is 8080.                                                            |
| Query Timeout       | Set timeout for unresponsive connections, in milliseconds (ms), default is 3000ms.                                              |
| HTTPS               | Whether to enable HTTPS.                                                                                                        |
| Collection Interval | Interval for periodic data collection during monitoring, in seconds, with a minimum interval of 30 seconds.                     |
| Whether to detect   | Whether to perform a probe check for monitoring availability before adding a new monitor; operations proceed if successful.     |
| Description         | Additional information to identify and describe this monitoring, where users can add remarks.                                   |

### Collection Metrics

#### Metric Set: airflow_health

| Metric Name  | Metric Unit | Metric Description |
|--------------|-------------|--------------------|
| metadatabase | N/A         | Response time      |
| scheduler    | N/A         | scheduler health   |
| triggerer    | N/A         | triggerer health   |

#### Metric Set: airflow_version

| Metric Name | Metric Unit | Metric Description  |
|-------------|-------------|---------------------|
| value       | N/A         | Airflow version     |
| git_version | N/A         | Airflow git version |
