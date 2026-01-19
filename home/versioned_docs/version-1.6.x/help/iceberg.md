---
id: iceberg 
Title: Monitoring Apache Iceberg
sidebar_label: Apache Iceberg
keywords: [open source monitoring tool, open source apache hive monitoring tool, monitoring apache iceberg metrics]
---

> Collect and monitor the general performance metrics exposed by the Apache Iceberg.

## Pre-monitoring operations

If you want to monitor information in `Apache Iceberg` with this monitoring type, you need to open your `Hive Server2` in remoting mode.

**1、Enable metastore:**

```shell
hive --service metastore &
```

**2. Enable hive server2:**

```shell
hive --service hiveserver2 &
```

### Configure parameters

|       Parameter name        |                                                    Parameter Help describes the                                                     |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| Monitor Host                | THE MONITORED PEER IPV4, IPV6 OR DOMAIN NAME. Note ⚠️ that there are no protocol headers (eg: https://, http://).                   |
| Monitoring Name             | A name that identifies this monitoring that needs to be unique.                                                                     |
| Port                        | The default port provided by the database is 10002.                                                                                 |
| Enable HTTPS                | Whether to access the website through HTTPS, please note that ⚠️ when HTTPS is enabled, the default port needs to be changed to 443 |
| The acquisition interval is | Monitor the periodic data acquisition interval, in seconds, and the minimum interval that can be set is 30 seconds                  |
| Whether to probe the        | Whether to check the availability of the monitoring before adding a monitoring is successful, and the new modification operation    | will continue only if the probe is successful |
| Description Comment         | For more information identifying and describing the remarks for this monitoring, users can remark the information here              |

### Collect metrics

#### metric Collection: basic

| Metric Name | metric unit |                   Metrics help describe                   |
|-------------|-------------|-----------------------------------------------------------|
| vm_name     | None        | The name of the virtual machine (VM) running HiveServer2. |
| vm_vendor   | None        | The vendor or provider of the virtual machine.            |
| vm_version  | None        | The version of the virtual machine.                       |
| up_time     | None        | The duration for which HiveServer2 has been running.      |

#### metric Collection: enviroment

|     Metric Name      | metric unit |                       Metrics help describe                       |
|----------------------|-------------|-------------------------------------------------------------------|
| https_proxyPort      | None        | The port number used for HTTPS proxy communication.               |
| os_name              | None        | The name of the operating system on which HiveServer2 is running. |
| os_version           | None        | The version of the operating system.                              |
| os_arch              | None        | The architecture of the operating system.                         |
| java_runtime_name    | None        | The name of the Java runtime environment used by HiveServer2.     |
| java_runtime_version | None        | The version of the Java runtime environment.                      |

#### metric Collection: thread

|     Metric Name      | metric unit |                        Metrics help describe                         |
|----------------------|-------------|----------------------------------------------------------------------|
| thread_count         | None        | The current number of threads being used by HiveServer2.             |
| total_started_thread | None        | The total count of threads started by HiveServer2 since its launch.  |
| peak_thread_count    | None        | The highest number of threads used by HiveServer2 at any given time. |
| daemon_thread_count  | None        | The number of daemon threads currently active in HiveServer2.        |

#### metric Collection: code_cache

| Metric Name | metric unit |                          Metrics help describe                          |
|-------------|-------------|-------------------------------------------------------------------------|
| committed   | MB          | The amount of memory currently allocated for the memory pool.           |
| init        | MB          | The initial amount of memory requested for the memory pool.             |
| max         | MB          | The maximum amount of memory that can be allocated for the memory pool. |
| used        | MB          | The amount of memory currently being used by the memory pool.           |
