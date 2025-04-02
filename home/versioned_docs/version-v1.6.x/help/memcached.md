---
id: memcached
title: Monitoring Memcached
sidebar_label: Memcached Monitor
keywords: [ open source monitoring tool, open source Memcached monitoring tool, monitoring memcached metrics ]
---

> Collect and monitor the general performance Metrics of Memcached.

**Protocol Use：Memcached**

```text
The default YML configuration for the memcache version is in compliance with 1.4.15. 
You need to use the stats command to view the parameters that your memcache can monitor
```

**1、Obtain usable parameter indicators through commands such as stats、stats setting、stats settings.

```shell
# telnet ip port
[root@server ~]# telnet localhost 11211
Trying ::1...
Connected to localhost.
Escape character is '^]'.
stats
STAT pid 15168
STAT uptime 11691
STAT time 1702569246
STAT version 1.4.15
...
```

**There is help_doc: <https://www.runoob.com/memcached/memcached-stats.html>**

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by Memcached                                                                                                                                                |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：server_info

|   Metric name    | Metric unit |              Metric help description              |
|------------------|-------------|---------------------------------------------------|
| pid              |             | Memcache server process ID                        |
| uptime           | s           | The number of seconds the server has been running |
| version          |             | Memcache version                                  |
| curr_connections |             | Current number of connections                     |
| auth_errors      |             | Number of authentication failures                 |
| threads          |             | Current number of threads                         |
| item_size        | byte        | The size of the item                              |
| item_count       |             | Number of items                                   |
| curr_items       |             | The total number of data currently stored         |
| total_items      |             | The total number of data stored since startup     |
| bytes            | byte        | The current number of bytes occupied by storage   |
| cmd_get          |             | Get command request count                         |
| cmd_set          |             | Set command request count                         |
| cmd_flush        |             | Flush command request count                       |
| get_misses       |             | Get command misses                                |
| delete_misses    |             | Delete command misses                             |
