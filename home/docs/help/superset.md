---
id: superset  
title: Monitoring Apache Superset  
sidebar_label: Apache Superset
keywords: [open source monitoring system, open source observability, Apache Superset monitoring]
---

> Collect and monitor general performance metrics for Apache Superset.

## Configuration Parameters

| Parameter Name      | Parameter Description                                                                                                           |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | IP address, IPV4, IPV6, or domain name of the host being monitored. Note ⚠️ without protocol prefix (e.g., https://, http://).  |
| Task Name           | Name identifying this monitoring, ensuring uniqueness.                                                                          |
| Port                | Port that Superset is exposed on, default is 8088.                                                                             |
| Query Timeout       | Set timeout for unresponsive connections, in milliseconds (ms), default is 3000ms.                                              |
| HTTPS               | Whether to enable HTTPS.                                                                                                        |
| Collection Interval | Interval for periodic data collection during monitoring, in seconds, with a minimum interval of 30 seconds.                     |
| Whether to detect   | Whether to perform a probe check for monitoring availability before adding a new monitor; operations proceed if successful.     |
| Description         | Additional information to identify and describe this monitoring, where users can add remarks.                                   |

### Collection Metrics

#### Metric Set: health

| Metric Name  | Metric Unit | Metric Description        |
|--------------|-------------|---------------------------|
| responseTime | ms          | Response time of /health  |
| statusCode   | N/A         | HTTP response status code |

#### Metric Set: version

| Metric Name    | Metric Unit | Metric Description   |
|----------------|-------------|----------------------|
| version_string | N/A         | Superset version     |
| version_sha    | N/A         | Build git SHA        |
| build_number   | N/A         | Build number         |
