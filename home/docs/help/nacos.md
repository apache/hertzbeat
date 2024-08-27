---
id: nacos
title: Monitoring：Nacos Server monitoring       
sidebar_label: Nacos Server  
keywords: [open source monitoring tool, open source middleware monitoring tool, monitoring Nacos Server metrics]
---

> Hertzbeat monitors metrics of the Nacos Server by calling the Nacos Metrics Api.

### PreRequisites

#### Deploy Nacos cluster to expose metrics data

1. Deploy the Nacos cluster according to [deployment document](https://nacos.io/en-us/docs/deployment.html).
2. Configure the application. properties file to expose metrics data.

    ```properties
    management.endpoints.web.exposure.include=*
    ```

3. Access ```{ip}:8848/nacos/actuator/prometheus``` to see if metrics data can be accessed.

More information see [Nacos monitor guide](https://nacos.io/en-us/docs/monitor-guide.html).

### Configuration parameter

|   Parameter name    |                                               Parameter help description                                                |
|---------------------|-------------------------------------------------------------------------------------------------------------------------|
| Target Host         | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                              |
| Target name         | Identify the name of this monitoring. The name needs to be unique                                                       |
| Nacos Port          | Port provided by the Nacos Server. The default is 8848                                                                  |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                  |

### Collection Metric

#### Metric set：jvm

|        Metric name         | Metric unit | Metric help description |
|----------------------------|-------------|-------------------------|
| system_cpu_usage           | none        | cpu usage               |
| system_load_average_1m     | none        | load                    |
| jvm_memory_used_bytes      | byte        | jvm memory used         |
| jvm_memory_max_bytes       | byte        | jvm max memory          |
| jvm_gc_pause_seconds_count | none        | gc count                |
| jvm_gc_pause_seconds_sum   | second      | gc time                 |
| jvm_threads_daemon         | none        | jvm threads count       |

#### Metric set：Nacos

|              Metric name               | Metric unit |         Metric help description         |
|----------------------------------------|-------------|-----------------------------------------|
| http_server_requests_seconds_count     | second      | http requests count                     |
| http_server_requests_seconds_sum       | second      | http requests time                      |
| nacos_timer_seconds_sum                | second      | Nacos config notify time                |
| nacos_timer_seconds_count              | none        | Nacos config notify count               |
| nacos_monitor{name='longPolling'}      | none        | Nacos config connection count           |
| nacos_monitor{name='configCount'}      | none        | Nacos configuration file count          |
| nacos_monitor{name='dumpTask'}         | none        | Nacos config dump task count            |
| nacos_monitor{name='notifyTask'}       | none        | Nacos config notify task count          |
| nacos_monitor{name='getConfig'}        | none        | Nacos config read configuration count   |
| nacos_monitor{name='publish'}          | none        | Nacos config update configuration count |
| nacos_monitor{name='ipCount'}          | none        | Nacos naming ip count                   |
| nacos_monitor{name='domCount'}         | none        | Nacos naming domain count(1.x version)  |
| nacos_monitor{name='serviceCount'}     | none        | Nacos naming domain count(2.x version)  |
| nacos_monitor{name='failedPush'}       | none        | Nacos naming push fail count            |
| nacos_monitor{name='avgPushCost'}      | second      | Nacos naming push cost time(average)    |
| nacos_monitor{name='leaderStatus'}     | none        | Nacos naming if node is leader          |
| nacos_monitor{name='maxPushCost'}      | second      | Nacos naming push cost time(max)        |
| nacos_monitor{name='mysqlhealthCheck'} | none        | Nacos naming mysql health check count   |
| nacos_monitor{name='httpHealthCheck'}  | none        | Nacos naming http health check count    |
| nacos_monitor{name='tcpHealthCheck'}   | none        | Nacos naming tcp health check count     |

#### Metric set：Nacos exception

|                    Metric name                     | Metric unit |            Metric help description             |
|----------------------------------------------------|-------------|------------------------------------------------|
| nacos_exception_total{name='db'}                   | none        | database exception                             |
| nacos_exception_total{name='configNotify'}         | none        | Nacos config notify exception                  |
| nacos_exception_total{name='unhealth'}             | none        | Nacos config server health check exception     |
| nacos_exception_total{name='disk'}                 | none        | Nacos naming write disk exception              |
| nacos_exception_total{name='leaderSendBeatFailed'} | none        | Nacos naming leader send heart beat fail count |
| nacos_exception_total{name='illegalArgument'}      | none        | request argument illegal count                 |
| nacos_exception_total{name='nacos'}                | none        | Nacos inner exception                          |

#### Metric set：client

|              Metric name               | Metric unit |      Metric help description      |
|----------------------------------------|-------------|-----------------------------------|
| nacos_monitor{name='subServiceCount'}  | none        | subscribed services count         |
| nacos_monitor{name='pubServiceCount'}  | none        | published services count          |
| nacos_monitor{name='configListenSize'} | none        | listened configuration file count |
| nacos_client_request_seconds_count     | none        | request count                     |
| nacos_client_request_seconds_sum       | second      | request time                      |
