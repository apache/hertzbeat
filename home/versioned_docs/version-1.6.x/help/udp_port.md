---
id: udp_port  
title: Monitoring UDP port availability      
sidebar_label: UDP Port availability    
keywords: [open source monitoring tool, open source port monitoring tool, monitoring UDP port metrics]
---

> UDP is a connectionless transport layer protocol. We determine the availability status of its ports by sending request packets at the application layer and receiving responses. The configuration information requires filling in the hexadecimal content of the application layer packets that prompt responses from the peer. We recommend using Wireshark for packet capture to obtain the transmitted packet content.  
> You can click on `Create UDP Port Availability` to configure or select `More Actions` to import existing configurations.

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️ Without protocol header (eg: https://, http://).                             |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Port                | Ports provided by website.                                                                                               |
| Connection timeout  | The waiting timeout for port connections, in milliseconds. Default is 6000 milliseconds.                                 |
| Sent Packet Content | The hexadecimal content of the application layer packet that prompts a response from the peer.                           |
| Collector           | Specifies which collector to use for scheduling collection for this monitoring.                                          |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags           | Classification management tags for monitoring resources.                                                                 |
| Description         | For more information about identifying and describing this monitoring, users can note information here.                  |

### Collection Metric

#### Metric set：summary

|  Metric name  |    Metric unit    | Metric help description |
|---------------|-------------------|-------------------------|
| Response Time | Milliseconds (ms) | Website response time   |
