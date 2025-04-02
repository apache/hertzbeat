---
id: kafka  
title: Monitor：Apache Kafka      
sidebar_label: Apache Kafka
keywords: [open source monitoring tool, open source apache kafka monitoring tool, monitoring apache kafka metrics]
---

> Collect and monitor the general performance Metrics of Apache Kafka.

**Protocol Use：JMX**

### Kafka Enable JMX Protocol

1. Install Kafka

2. Modify `kafka-server-start.sh`

Append content in kafka-server-start.sh, Attention Replace Port And IP.

```shell
export JMX_PORT=9999;
export KAFKA_JMX_OPTS="-Djava.rmi.server.hostname=ip地址 -Dcom.sun.management.jmxremote.rmi.port=9999 -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false";

# Already Has 
exec $base_dir/kafka-run-class.sh $EXTRA_ARGS kafka.Kafka "$@"
```

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by JMX                                                                                                                                                      |
| Username            | JMX connection user name, optional                                                                                                                                        |
| Password            | JMX connection password, optional                                                                                                                                         |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：server_info

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| Version     |             | Kafka Version           |
| StartTimeMs | ms          | Start Time              |
| CommitId    |             | Version Commit ID       |

#### Metrics Set：memory_pool

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| name        |             | metrics name            |
| committed   | kb          | total size              |
| init        | kb          | init size               |
| max         | kb          | max size                |
| used        | kb          | used size               |

#### Metrics Set：active_controller_count

| Metric name | Metric unit |    Metric help description     |
|-------------|-------------|--------------------------------|
| Value       |             | server active controller count |

#### Metrics Set：broker_partition_count

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| Value       |             | broker partition count  |

#### Metrics Set：broker_leader_count

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| Value       |             | broker leader count     |

#### Metrics Set：broker_handler_avg_percent

|    Metric name    | Metric unit | Metric help description |
|-------------------|-------------|-------------------------|
| EventType         |             | event type              |
| RateUnit          |             | rate unit               |
| Count             |             | percent count           |
| OneMinuteRate     | %           | One Minute Rate         |
| FiveMinuteRate    | %           | Five Minute Rate        |
| MeanRate          | %           | Mean Rate               |
| FifteenMinuteRate | %           | Fifteen Minute Rate     |
