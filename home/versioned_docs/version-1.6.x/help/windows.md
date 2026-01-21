---
id: windows  
title: Monitoring：Windows operating system monitoring      
sidebar_label: Windows operating system       
keywords: [open source monitoring tool, open source windows monitoring tool, monitoring windows metrics]
---

> Collect and monitor the general performance Metrics of Windows operating system through SNMP protocol.
> Note⚠️ You need to start SNMP service for Windows server.

References:
[What is SNMP protocol 1](https://www.cnblogs.com/xdp-gacl/p/3978825.html)
[What is SNMP protocol 2](https://www.auvik.com/franklyit/blog/network-basics-what-is-snmp/)
[Win configure SNMP in English](https://docs.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-snmp-service)
[Win configure SNMP in Chinese](https://docs.microsoft.com/zh-cn/troubleshoot/windows-server/networking/configure-snmp-service)

### Configuration parameter

|   Parameter name    |                                                                                          Parameter help description                                                                                          |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                                                   |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                                                            |
| Port                | Port provided by Windows SNMP service. The default is 161                                                                                                                                                    |
| SNMP version        | SNMP protocol version V1 V2c V3                                                                                                                                                                              |
| SNMP community Word | SNMP agreement community name(Community Name). It is used to realize the authentication of SNMP network administrator when accessing SNMP management agent. Similar to password, the default value is public |
| Timeout             | Protocol connection timeout                                                                                                                                                                                  |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                                                      |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful                                    |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                                                       |

### Collection Metric

#### Metric set：system

| Metric name  | Metric unit | Metric help description      |
|--------------|-------------|------------------------------|
| name         | none        | Host name                    |
| descr        | none        | Operating system description |
| uptime       | none        | System running time          |
| numUsers     | number      | Current number of users      |
| services     | number      | Current number of services   |
| processes    | number      | Current number of processes  |
| responseTime | ms          | Collection response time     |
| location     | none        | Location                     |
| memory       | GB          | System memory                |

#### Metric set: process

| Field name        | Metric unit | Metric help description |
|-------------------|-------------|-------------------------|
| hrSWRunIndex      | none        | Index                   |
| hrSWRunName       | none        | Process name            |
| hrSWRunID         | none        | Process ID              |
| hrSWRunPath       | none        | Process path            |
| hrSWRunParameters | none        | Process parameters      |
| hrSWRunType       | none        | Process type            |
| hrSWRunStatus     | none        | Process status          |
| hrSWRunPerfCPU    | s           | Process CPU usage       |
| hrSWRunPerfMem    | KB          | Process memory usage    |

#### Metric set: service

| Field name            | Metric unit | Metric help description |
|-----------------------|-------------|-------------------------|
| svSvcName             | none        | Service name            |
| svSvcInstalledState   | none        | Service installed state |
| svSvcOperatingState   | none        | Service operating state |
| svSvcCanBeUninstalled | none        | Can be uninstalled      |
| svSvcCanBePaused      | none        | Can be paused           |

#### Metric set: installation

| Field name         | Metric unit | Metric help description |
|--------------------|-------------|-------------------------|
| hrSWInstalledIndex | none        | Index                   |
| hrSWInstalledName  | none        | Installed name          |
| hrSWInstalledID    | none        | Installed ID            |
| hrSWInstalledType  | none        | Installed type          |

#### Metric set: storage

| Field name | Metric unit | Metric help description |
|------------|-------------|-------------------------|
| index      | none        | Index                   |
| descr      | none        | Storage description     |
| size       | Mb          | Storage size            |
| free       | Mb          | Free space              |
| used       | Mb          | Used space              |
| usage      | %           | Usage percentage        |

#### Metric set: interface details

| Field name   | Metric unit | Metric help description    |
|--------------|-------------|----------------------------|
| index        | none        | Index                      |
| descr        | none        | Interface name             |
| speed        | Mbps        | Interface speed            |
| in_octets    | Kbps        | Inbound traffic            |
| out_octets   | Kbps        | Outbound traffic           |
| admin_status | none        | Administrative status      |
| oper_status  | none        | Operational status         |
| mtu          | B           | MTU                        |
| in_discards  | number      | Inbound discarded packets  |
| in_errors    | number      | Inbound error packets      |
| out_discards | number      | Outbound discarded packets |
| out_errors   | number      | Outbound error packets     |

#### Metric set: device

| Field name | Metric unit | Metric help description |
|------------|-------------|-------------------------|
| index      | none        | Index                   |
| descr      | none        | Description             |
| status     | none        | Status                  |
