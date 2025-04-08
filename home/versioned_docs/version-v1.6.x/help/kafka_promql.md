---
id: kafka_promql
title: Monitoring Kafka-PromQL
sidebar_label: Kafka-PromQL
keywords: [ Open Source Monitoring System, Open Source Middleware Monitoring, Kafka Monitoring, Kafka-PromQL Monitoring ]
---

> Monitor Kafka by querying generic metrics data from Prometheus server using Prometheus PromQL. This approach is suitable when Prometheus is already monitoring Kafka and you need to fetch Kafka's
> monitoring data from Prometheus server.

### Prerequisites

1. Deploy Kafka.
2. Deploy kafka_exporter.
3. Collect monitoring metrics exposed by kafka_exporter through Prometheus.

### Configuration Parameters

|   Parameter Name    |                                                   Parameter Description                                                    |
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

#### Metric Set: kafka_brokers

| Metric Name | Metric Unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| \_\_name__  | None        | Metric name                          |
| instance    | None        | Instance to which the metric belongs |
| timestamp   | None        | Timestamp of metric collection       |
| value       | None        | Metric value                         |

#### Metric Set: kafka_topic_partitions

| Metric Name | Metric Unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| \_\_name__  | None        | Metric name                          |
| instance    | None        | Instance to which the metric belongs |
| timestamp   | None        | Timestamp of metric collection       |
| value       | None        | Metric value                         |

#### Metric Set: kafka_server_brokertopicmetrics_bytesinpersec

| Metric Name | Metric Unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| \_\_name__  | None        | Metric name                          |
| instance    | None        | Instance to which the metric belongs |
| timestamp   | None        | Timestamp of metric collection       |
| value       | None        | Metric value                         |

### Other Kafka Monitoring Methods Supported by HertzBeat

1. If Kafka is enabled with JMX monitoring, you can use [Kafka](kafka) Monitoring.
2. If Kafka cluster deploys kafka_exporter to expose monitoring metrics, you can refer to [Prometheus task](prometheus) to configure the Prometheus collection task to monitor kafka.
