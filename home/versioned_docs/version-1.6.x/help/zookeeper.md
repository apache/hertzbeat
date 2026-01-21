---
id: zookeeper  
title: Monitoring Zookeeper       
sidebar_label: Zookeeper Monitor   
keywords: [open source monitoring tool, open source zookeeper monitoring tool, monitoring zookeeper metrics]
---

> Collect and monitor the general performance Metrics of Zookeeper.

### PreRequisites

#### Zookeeper four word command

> The current implementation scheme uses the four word command provided by zookeeper to collect Metrics.
> Users need to add the four word command of zookeeper to the white list by themselves.

Steps

> 1.Find our zookeeper configuration file, which is usually zoo.cfg.
>
> 2.Add the following commands to the configuration file

```shell
# Add the required command to the white list
4lw.commands.whitelist=stat, ruok, conf, isro

# Add all commands to the white list
4lw.commands.whitelist=*
```

> 3.Restart service

```shell
zkServer.sh restart
```

#### netcat protocol

The current implementation scheme requires us to deploy the Linux server of zookeeper
Command environment for installing netcat

> netcat installation steps
>
> ```shell
> yum install -y nc
> ```

If the terminal displays the following information, the installation is successful

```shell
Complete!
```

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by Zookeeper. The default is 2181                                                                                                                           |
| Query timeout       | Set the timeout of Zookeeper connection, unit: ms, default: 3000ms                                                                                                        |
| Username            | User name of the Linux connection where Zookeeper is located                                                                                                              |
| Password            | Password of the Linux connection where Zookeeper is located                                                                                                               |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：conf

|    Metric name    | Metric unit |                                              Metric help description                                               |
|-------------------|-------------|--------------------------------------------------------------------------------------------------------------------|
| clientPort        | none        | Port                                                                                                               |
| dataDir           | none        | Data snapshot file directory. By default, 100000 operations generate a snapshot                                    |
| dataDirSize       | kb          | Data snapshot file size                                                                                            |
| dataLogDir        | none        | Transaction log file directory, production environment on a separate disk                                          |
| dataLogSize       | kb          | Transaction log file size                                                                                          |
| tickTime          | ms          | Time interval between servers or between clients and servers to maintain heartbeat                                 |
| minSessionTimeout | ms          | Minimum session timeout. Heartbeat timex2. The specified time is less than this time, which is used by default     |
| maxSessionTimeout | ms          | Maximum session timeout. Heartbeat timex20. The specified time is greater than this time, which is used by default |
| serverId          | none        | Server id                                                                                                          |

#### Metric set：stats

|          Metric name          | Metric unit |      Metric help description       |
|-------------------------------|-------------|------------------------------------|
| zk_version                    | none        | Server version                     |
| zk_server_state               | none        | Server role                        |
| zk_num_alive_connections      | number      | Number of connections              |
| zk_avg_latency                | ms          | Average latency                    |
| zk_outstanding_requests       | number      | Number of outstanding requests     |
| zk_znode_count                | number      | Number of znode                    |
| zk_packets_sent               | number      | Number of packets sent             |
| zk_packets_received           | number      | Number of packets received         |
| zk_watch_count                | number      | Number of watch                    |
| zk_max_file_descriptor_count  | number      | Maximum number of file descriptors |
| zk_approximate_data_size      | kb          | data size                          |
| zk_open_file_descriptor_count | number      | Number of open file descriptors    |
| zk_max_latency                | ms          | Max latency                        |
| zk_ephemerals_count           | number      | Number of ephemeral nodes          |
| zk_min_latency                | ms          | Min latency                        |

#### Metric set：envi

|    Metric Name    | Metric Unit |    Metric help description    |
|-------------------|-------------|-------------------------------|
| zk_version        | none        | ZooKeeper version             |
| hostname          | none        | Hostname                      |
| java_version      | none        | Java version                  |
| java_vendor       | none        | Java vendor                   |
| java_home         | none        | Java home directory           |
| java_class_path   | none        | Java class path               |
| java_library_path | none        | Java library path             |
| java_io_tmpdir    | none        | Java temporary directory      |
| java_compiler     | none        | Java compiler                 |
| os_name           | none        | Operating system name         |
| os_arch           | none        | Operating system architecture |
| os_version        | none        | Operating system version      |
| user_name         | none        | Username                      |
| user_home         | none        | User home directory           |
| user_dir          | none        | User current directory        |
